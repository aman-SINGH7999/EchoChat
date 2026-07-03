module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define(
    'ChatMessage',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      chat_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'chat_rooms',
          key: 'id'
        }
      },
      sender_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      message_text: DataTypes.TEXT,
      message_type: {
        type: DataTypes.ENUM('text', 'image', 'file', 'audio', 'video'),
        defaultValue: 'text'
      },
      file_id: DataTypes.INTEGER,
      reply_to: DataTypes.INTEGER,
      forward_from: DataTypes.INTEGER,
      is_pinned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      timestamps: true,
      tableName: 'chat_messages'
    }
  );

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.ChatRoom, { foreignKey: 'chat_id', as: 'chat' });
    ChatMessage.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
    ChatMessage.hasMany(models.Reaction, { foreignKey: 'message_id', as: 'reactions' });
    ChatMessage.hasMany(models.MessageStatus, { foreignKey: 'message_id', as: 'statuses' });
  };

  return ChatMessage;
};
