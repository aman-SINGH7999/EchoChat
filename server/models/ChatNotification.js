module.exports = (sequelize, DataTypes) => {
  const ChatNotification = sequelize.define(
    'ChatNotification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      message_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'chat_messages',
          key: 'id'
        }
      },
      chat_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'chat_rooms',
          key: 'id'
        }
      },
      notification_type: {
        type: DataTypes.ENUM('new_message', 'mention', 'user_added', 'user_removed'),
        defaultValue: 'new_message'
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
      tableName: 'chat_notifications'
    }
  );

  ChatNotification.associate = (models) => {
    ChatNotification.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    ChatNotification.belongsTo(models.ChatMessage, { foreignKey: 'message_id', as: 'message' });
    ChatNotification.belongsTo(models.ChatRoom, { foreignKey: 'chat_id', as: 'chat' });
  };

  return ChatNotification;
};
