const { ChatMessage, MessageEditHistory, ChatMember, User, Reaction, MessageStatus } = require('../models');

// Helper — sirf apna message edit/delete kar sakta hai, wo bhi jo already deleted na ho
const getOwnedMessage = async (messageId, userId) => {
  const message = await ChatMessage.findByPk(messageId);
  if (!message) return { error: 'Message not found', status: 404 };
  if (message.sender_id !== userId) return { error: 'You can only modify your own messages', status: 403 };
  if (message.deleted_at) return { error: 'Cannot modify a deleted message', status: 400 };
  return { message };
};

// 1. EDIT MESSAGE — purana text history table me safe rehta hai, kabhi lapata nahi hota
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { message_text } = req.body;

    if (!message_text || !message_text.trim()) {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const { error, status, message } = await getOwnedMessage(messageId, userId);
    if (error) return res.status(status).json({ message: error });

    if (message.message_type !== 'text') {
      return res.status(400).json({ message: 'Only text messages can be edited' });
    }

    if (message.message_text === message_text.trim()) {
      return res.status(400).json({ message: 'No changes made' });
    }

    // YAHI MAIN LOGIC — save purana version, phir naya text set karo
    await MessageEditHistory.create({
      message_id: message.id,
      previous_text: message.message_text
    });

    await message.update({
      message_text: message_text.trim(),
      is_edited: true,
      edited_at: new Date()
    });

    const updatedMessage = await ChatMessage.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'userprofile'] },
        { model: Reaction, as: 'reactions', include: [{ model: User, as: 'user', attributes: ['id', 'username'] }] },
        { model: MessageStatus, as: 'statuses' },
        {
          model: ChatMessage, as: 'repliedMessage',
          attributes: ['id', 'message_text', 'sender_id', 'deleted_at'],
          include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }]
        }
      ]
    });

    // Realtime — dusre members ko turant naya text dikhao
    const io = req.app.get('io');
    io.to(`chat_${message.chat_id}`).emit('message_edited', updatedMessage);

    res.json({ message: 'Message edited successfully', data: updatedMessage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 2. DELETE MESSAGE — soft delete, DB me text hamesha safe rehta hai
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const { error, status, message } = await getOwnedMessage(messageId, userId);
    if (error) return res.status(status).json({ message: error });

    // sirf deleted_at set hota hai — row/text kabhi delete nahi hota
    await message.update({ deleted_at: new Date() });

    // Realtime — dusre members ko batao ki message delete ho gaya (pehle ye missing tha!)
    const io = req.app.get('io');
    io.to(`chat_${message.chat_id}`).emit('message_deleted', {
      messageId: message.id,
      chatId: message.chat_id
    });

    res.json({ message: 'Message deleted successfully', messageId: message.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// 3. EDIT HISTORY — sare purane versions dikhao (koi bhi chat member dekh sakta hai)
const getMessageHistory = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findByPk(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const membership = await ChatMember.findOne({
      where: { chat_id: message.chat_id, user_id: userId }
    });
    if (!membership) {
      return res.status(403).json({ message: 'Not authorized to view this message' });
    }

    const history = await MessageEditHistory.findAll({
      where: { message_id: messageId },
      order: [['createdAt', 'ASC']]
    });

    res.json({ history, current_text: message.message_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// 4. TOGGLE REACTION — same emoji dobara click = remove, alag emoji = replace
const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

    const message = await ChatMessage.findByPk(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const membership = await ChatMember.findOne({ where: { chat_id: message.chat_id, user_id: userId } });
    if (!membership) return res.status(403).json({ message: 'Not authorized' });

    const existing = await Reaction.findOne({ where: { message_id: messageId, user_id: userId } });

    if (existing && existing.emoji === emoji) {
      await existing.destroy();          // toggle off
    } else if (existing) {
      await existing.update({ emoji });  // emoji switch
    } else {
      await Reaction.create({ message_id: messageId, user_id: userId, emoji }); // naya
    }

    const updatedReactions = await Reaction.findAll({
      where: { message_id: messageId },
      include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
    });

    const io = req.app.get('io');
    io.to(`chat_${message.chat_id}`).emit('reaction_updated', {
      messageId: message.id,
      chatId: message.chat_id,
      reactions: updatedReactions
    });

    res.json({ message: 'Reaction updated', reactions: updatedReactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { editMessage, deleteMessage, getMessageHistory, toggleReaction }; 
