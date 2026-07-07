const { ChatRoom, ChatMember, User } = require('../models');
const { Op } = require('sequelize');
const { getOnlineUsers, joinUserToRoom } = require('../socket/socketHandler');
const { uploadToCloudinary } = require('../config/cloudinary');

const memberUserAttrs = ['id', 'username', 'userprofile', 'isOnline', 'email', 'userphone', 'lastSeen'];

// Helper — check karo ki user is group ka ACTIVE ADMIN hai ya nahi
const requireAdmin = async (chatId, userId) => {
  const chat = await ChatRoom.findByPk(chatId);
  if (!chat || chat.chat_type !== 'group') {
    return { error: 'Group not found', status: 404 };
  }

  const membership = await ChatMember.findOne({
    where: { chat_id: chatId, user_id: userId, is_active: true }
  });

  if (!membership || membership.role !== 'admin') {
    return { error: 'Only group admins can perform this action', status: 403 };
  }

  return { chat };
};

const getFullGroup = async (chatId) => {
  return ChatRoom.findByPk(chatId, {
    include: [
      { model: ChatMember, as: 'members', include: [{ model: User, as: 'user', attributes: memberUserAttrs }] },
      { model: User, as: 'creator', attributes: ['id', 'username', 'userprofile'] }
    ]
  });
};

// 1. Group photo update — sirf admin
const updateGroupImage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const { error, status } = await requireAdmin(chatId, userId);
    if (error) return res.status(status).json({ message: error });

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const result = await uploadToCloudinary(req.file.path, 'chat-app/groups');
    await ChatRoom.update({ room_image: result.url }, { where: { id: chatId } });

    const fullChat = await getFullGroup(chatId);

    // baaki members ko realtime batao ki group photo badal gayi
    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit('group_updated', fullChat);

    res.json({ message: 'Group photo updated', chat: fullChat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. Naye members add karo — sirf admin
const addMembers = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { memberIds } = req.body; // array of user ids

    const { error, status } = await requireAdmin(chatId, userId);
    if (error) return res.status(status).json({ message: error });

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'memberIds array is required' });
    }

    const io = req.app.get('io');
    const onlineUsers = getOnlineUsers();

    for (const memberId of memberIds) {
      const existing = await ChatMember.findOne({ where: { chat_id: chatId, user_id: memberId } });

      if (existing) {
        // pehle se member tha (shayad inactive kiya gaya tha) — reactivate karo
        if (!existing.is_active) {
          await existing.update({ is_active: true, role: 'member' });
        }
      } else {
        await ChatMember.create({ chat_id: chatId, user_id: memberId, role: 'member', is_active: true });
      }

      // naye member ka socket room me force-join karo agar wo online hai
      joinUserToRoom(io, memberId, chatId);
      const socketId = onlineUsers[memberId];
      if (socketId) {
        const fullChat = await getFullGroup(chatId);
        io.to(socketId).emit('new_chat', fullChat); // uske sidebar me group dikhao
      }
    }

    const fullChat = await getFullGroup(chatId);
    io.to(`chat_${chatId}`).emit('group_updated', fullChat);

    res.json({ message: 'Members added successfully', chat: fullChat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. Kisi member ko admin banao — sirf existing admin
const promoteToAdmin = async (req, res) => {
  try {
    const { chatId, memberId } = req.params;
    const userId = req.user.id;

    const { error, status } = await requireAdmin(chatId, userId);
    if (error) return res.status(status).json({ message: error });

    const target = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: memberId, is_active: true }
    });

    if (!target) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    await target.update({ role: 'admin' });

    const fullChat = await getFullGroup(chatId);
    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit('group_updated', fullChat);

    res.json({ message: 'Member promoted to admin', chat: fullChat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 4. Normal (non-admin) member ko inactive karo — sirf admin, kabhi delete nahi
const deactivateMember = async (req, res) => {
  try {
    const { chatId, memberId } = req.params;
    const userId = req.user.id;

    const { error, status } = await requireAdmin(chatId, userId);
    if (error) return res.status(status).json({ message: error });

    if (parseInt(memberId) === userId) {
      return res.status(400).json({ message: 'You cannot deactivate yourself' });
    }

    const target = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: memberId, is_active: true }
    });

    if (!target) {
      return res.status(404).json({ message: 'Member not found in this group' });
    }

    if (target.role === 'admin') {
      return res.status(400).json({ message: 'Cannot deactivate another admin. Demote them first.' });
    }

    // SOFT DELETE — is_active false, row abhi bhi DB me hai, messages safe hain
    await target.update({ is_active: false });

    const fullChat = await getFullGroup(chatId);
    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit('group_updated', fullChat);

    // deactivate hue member ko bhi batao (room se nikaal do uska socket)
    const onlineUsers = getOnlineUsers();
    const targetSocketId = onlineUsers[memberId];
    if (targetSocketId) {
      const io2 = req.app.get('io');
      const targetSocket = io2.sockets.sockets.get(targetSocketId);
      if (targetSocket) targetSocket.leave(`chat_${chatId}`);
    }

    res.json({ message: 'Member deactivated', chat: fullChat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// 5. Inactive member ko wapas active karo — sirf admin
const reactivateMember = async (req, res) => {
  try {
    const { chatId, memberId } = req.params;
    const userId = req.user.id;

    const { error, status } = await requireAdmin(chatId, userId);
    if (error) return res.status(status).json({ message: error });

    const target = await ChatMember.findOne({
      where: { chat_id: chatId, user_id: memberId, is_active: false }
    });

    if (!target) {
      return res.status(404).json({ message: 'Inactive member not found in this group' });
    }

    await target.update({ is_active: true });

    const fullChat = await getFullGroup(chatId);
    const io = req.app.get('io');
    io.to(`chat_${chatId}`).emit('group_updated', fullChat);

    // member ko room me wapas force-join karo agar wo online hai
    const onlineUsers = getOnlineUsers();
    joinUserToRoom(io, memberId, chatId);
    const socketId = onlineUsers[memberId];
    if (socketId) {
      io.to(socketId).emit('new_chat', fullChat); // sidebar me wapas dikhao
    }

    res.json({ message: 'Member reactivated', chat: fullChat });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  updateGroupImage,
  addMembers,
  promoteToAdmin,
  deactivateMember,
  reactivateMember
};