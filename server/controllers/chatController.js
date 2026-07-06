const { ChatRoom, ChatMessage, ChatMember, ChatNotification, User, Reaction, MessageStatus } = require('../models');
const { Op } = require('sequelize');
const { getOnlineUsers, joinUserToRoom } = require('../socket/socketHandler');

const sendMessageUnified = async (req, res) => {
  const userId = req.user.id;
  const { chatId, otherUserId, message_text, message_type = 'text', file_id = null, reply_to = null } = req.body;

  if (!message_text && !file_id) {
    return res.status(400).json({ message: 'Message content or file is required' });
  }

  if (!chatId && !otherUserId) {
    return res.status(400).json({ message: 'chatId or otherUserId is required' });
  }

  // YAHI HAI MAIN FIX — pura chat-create + message-create ek transaction me
  const t = await ChatRoom.sequelize.transaction();

  try {
    let chat;
    let isNewChat = false;

    if (chatId) {
      // existing chat me message bhejna hai
      chat = await ChatRoom.findByPk(chatId, { transaction: t });
      if (!chat) {
        await t.rollback();
        return res.status(404).json({ message: 'Chat not found' });
      }
    } else {
      // naya private chat, agar zarurat pade to
      if (userId === parseInt(otherUserId)) {
        await t.rollback();
        return res.status(400).json({ message: 'Cannot create chat with yourself' });
      }

      const existing = await ChatRoom.findOne({
        where: { chat_type: 'private' },
        include: [{ model: ChatMember, as: 'members', where: { user_id: [userId, parseInt(otherUserId)] } }],
        transaction: t,
        lock: t.LOCK.UPDATE // race-condition-safe: dono taraf se same time pe bheja gaya first msg duplicate chat na banaye
      });

      if (existing && existing.members.length >= 2) {
        chat = existing;
      } else {
        chat = await ChatRoom.create({ chat_type: 'private', created_by: userId }, { transaction: t });
        await ChatMember.create({ chat_id: chat.id, user_id: userId, role: 'admin' }, { transaction: t });
        await ChatMember.create({ chat_id: chat.id, user_id: parseInt(otherUserId), role: 'admin' }, { transaction: t });
        isNewChat = true;
      }
    }

    const existingMsgCount = await ChatMessage.count({
      where: { chat_id: chat.id, deleted_at: null },
      transaction: t
    });
    const isFirstMessage = existingMsgCount === 0;

    const message = await ChatMessage.create({
      chat_id: chat.id,
      sender_id: userId,
      message_text,
      message_type,
      file_id,
      reply_to
    }, { transaction: t });

    await ChatRoom.update(
      { last_message_id: message.id },
      { where: { id: chat.id }, transaction: t }
    );

    const chatMembers = await ChatMember.findAll({
      where: { chat_id: chat.id, user_id: { [Op.ne]: userId } },
      transaction: t
    });

    for (const member of chatMembers) {
      await ChatNotification.create({
        user_id: member.user_id,
        message_id: message.id,
        chat_id: chat.id,
        notification_type: 'new_message'
      }, { transaction: t });

      await MessageStatus.create({
        message_id: message.id,
        user_id: member.user_id,
        status: 'sent'
      },{ transaction: t });
    }

    // sab kuch theek hai — ab commit karo. Agar upar kahin bhi error aaya, ye line kabhi nahi chalegi
    // aur DB me kuch bhi save nahi hoga (poora chat + message rollback)
    await t.commit();

    // COMMIT ke BAAD hi socket/notification kaam karo (transaction ke bahar)
    const messageWithDetails = await ChatMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'userprofile'] }]
    });

    const io = req.app.get('io');
    const onlineUsers = getOnlineUsers();

    if (isNewChat || isFirstMessage) {
      const fullChat = await ChatRoom.findByPk(chat.id, {
        include: [
          { model: ChatMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userprofile', 'isOnline'] }] },
          {
            model: ChatMessage,
            as: 'messages',
            limit: 1,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'userprofile'] }]
          }
        ]
      });

      chatMembers.forEach(member => {
        joinUserToRoom(io, member.user_id, chat.id);
        const socketId = onlineUsers[member.user_id];
        if (socketId) {
          io.to(socketId).emit('new_chat', fullChat);
        }
      });

      return res.status(201).json({
        message: 'Message sent successfully',
        data: messageWithDetails,
        chat: fullChat,
        isNewChat
      });
    }

    chatMembers.forEach(member => {
      joinUserToRoom(io, member.user_id, chat.id);
    });

    res.status(201).json({
      message: 'Message sent successfully',
      data: messageWithDetails,
      chat,
      isNewChat: false
    });
  } catch (error) {
    await t.rollback(); // koi bhi step fail hua to poora undo — na chat banega, na message
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createPrivateChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { otherUserId } = req.body;

    if (userId === parseInt(otherUserId)) {
      return res.status(400).json({ message: 'Cannot create chat with yourself' });
    }

    let chat = await ChatRoom.findOne({
      where: { chat_type: 'private' },
      include: [{ model: ChatMember, as: 'members', where: { user_id: [userId, parseInt(otherUserId)] } }]
    });

    const isNewChat = !chat || chat.members.length < 2;

    if (isNewChat) {
      chat = await ChatRoom.create({ chat_type: 'private', created_by: userId });
      await ChatMember.create({ chat_id: chat.id, user_id: userId, role: 'admin' });
      await ChatMember.create({ chat_id: chat.id, user_id: parseInt(otherUserId), role: 'admin' });
    }

    const fullChat = await ChatRoom.findByPk(chat.id, {
      include: [
        { model: ChatMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userprofile', 'isOnline'] }] },
        { model: ChatMessage, as: 'messages', limit: 1, order: [['createdAt', 'DESC']] }
      ]
    });

    res.status(201).json({ message: 'Chat ready', chat: fullChat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createGroupChat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chat_name, chat_description, members } = req.body;

    if (!chat_name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const chat = await ChatRoom.create({ chat_name, chat_description, chat_type: 'group', created_by: userId });
    await ChatMember.create({ chat_id: chat.id, user_id: userId, role: 'admin' });

    const memberIds = [];
    if (members && Array.isArray(members)) {
      for (const memberId of members) {
        if (memberId !== userId) {
          await ChatMember.create({ chat_id: chat.id, user_id: parseInt(memberId), role: 'member' });
          memberIds.push(parseInt(memberId));
        }
      }
    }

    const fullChat = await ChatRoom.findByPk(chat.id, {
      include: [
        { model: ChatMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userprofile', 'isOnline'] }] },
        { model: ChatMessage, as: 'messages', limit: 1, order: [['createdAt', 'DESC']] }
      ]
    });

    res.status(201).json({ message: 'Group chat created successfully', chat: fullChat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // pehle un chat_ids ko nikaalo jisme user member hai
    const memberships = await ChatMember.findAll({ where: { user_id: userId }, attributes: ['chat_id'] });
    const chatIds = memberships.map(m => m.chat_id);

    const chats = await ChatRoom.findAll({
      where: { id: chatIds },
      include: [
        {
          model: ChatMember,
          as: 'members',
          include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userprofile', 'isOnline'] }]
        },
        {
          model: ChatMessage,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'userprofile'] }]
        },
        { model: User, as: 'creator', attributes: ['id', 'username', 'userprofile'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await ChatRoom.findByPk(chatId, {
      include: [
        {
          model: ChatMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'userprofile', 'isOnline']
            }
          ]
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'userprofile']
        }
      ]
    });

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    res.json({ chat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (page - 1) * limit;

    const messages = await ChatMessage.findAll({
      where: { chat_id: chatId, deleted_at: null },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'userprofile'] },
        { model: Reaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'username'] }] },
        { model: MessageStatus, as: 'statuses' }   // <-- NAYA
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ messages, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { message_text, message_type = 'text', file_id = null, reply_to = null } = req.body;

    if (!message_text && !file_id) {
      return res.status(400).json({ message: 'Message content or file is required' });
    }

    // pehle check karo — ye is chat ka pehla message hoga ya nahi
    const existingCount = await ChatMessage.count({ where: { chat_id: chatId, deleted_at: null } });
    const isFirstMessage = existingCount === 0;

    const message = await ChatMessage.create({
      chat_id: chatId,
      sender_id: userId,
      message_text,
      message_type,
      file_id,
      reply_to
    });

    await ChatRoom.update({ last_message_id: message.id }, { where: { id: chatId } });

    const chatMembers = await ChatMember.findAll({
      where: { chat_id: chatId, user_id: { [Op.ne]: userId } }
    });

    for (const member of chatMembers) {
      await ChatNotification.create({
        user_id: member.user_id,
        message_id: message.id,
        chat_id: chatId,
        notification_type: 'new_message'
      });

      await MessageStatus.create({
        message_id: message.id,
        user_id: member.user_id,
        status: 'sent'
      });
    }

    const messageWithDetails = await ChatMessage.findByPk(message.id, {
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'userprofile'] }]
    });

    const io = req.app.get('io');
    const onlineUsers = getOnlineUsers();

    if (isFirstMessage) {
      // PEHLA MESSAGE — ab jaake doosre members ke sidebar mein chat dikhao
      const fullChat = await ChatRoom.findByPk(chatId, {
        include: [
          { model: ChatMember, as: 'members', include: [{ model: User, as: 'user', attributes: ['id', 'username', 'userprofile', 'isOnline'] }] },
          {
            model: ChatMessage,
            as: 'messages',
            limit: 1,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'userprofile'] }]
          }
        ]
      });

      chatMembers.forEach(member => {
        joinUserToRoom(io, member.user_id, chatId);   // race-free server-side join
        const socketId = onlineUsers[member.user_id];
        if (socketId) {
          io.to(socketId).emit('new_chat', fullChat);   // ab sidebar mein add hoga
        }
      });
    } else {
      // chat pehle se unke sidebar mein hai, bas room join confirm kar do
      chatMembers.forEach(member => {
        joinUserToRoom(io, member.user_id, chatId);
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: messageWithDetails
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender_id !== userId) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    await message.update({ deleted_at: new Date() });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji is required' });
    }

    const reaction = await Reaction.create({
      message_id: messageId,
      user_id: userId,
      emoji
    });

    res.status(201).json({
      message: 'Reaction added successfully',
      reaction
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const markMessagesRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const unreadMessages = await ChatMessage.findAll({
      where: { chat_id: chatId, sender_id: { [Op.ne]: userId }, deleted_at: null }
    });

    const messageIds = unreadMessages.map(m => m.id);
    if (messageIds.length === 0) {
      return res.json({ message: 'No messages to mark', messageIds: [] });
    }

    for (const msgId of messageIds) {
      const [status] = await MessageStatus.findOrCreate({
        where: { message_id: msgId, user_id: userId },
        defaults: { status: 'read', read_at: new Date() }
      });
      if (status.status !== 'read') {
        await status.update({ status: 'read', read_at: new Date() });
      }
    }
    
    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit('messages_read', {
      chatId: parseInt(chatId),
      readerId: userId,
      messageIds
    });

    res.json({ message: 'Messages marked as read', messageIds });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



module.exports = {
  sendMessageUnified,
  createPrivateChat,
  createGroupChat,
  getChats,
  getChat,
  getMessages,
  sendMessage,
  deleteMessage,
  addReaction,
  markMessagesRead
}