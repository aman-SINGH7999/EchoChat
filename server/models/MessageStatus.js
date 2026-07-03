module.exports = (sequelize, DataTypes) => {
  const MessageStatus = sequelize.define(
    'MessageStatus',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      message_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'chat_messages',
          key: 'id'
        }
      },
      user_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.ENUM('sent', 'delivered', 'read'),
        defaultValue: 'sent'
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true
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
      tableName: 'message_statuses'
    }
  );

  MessageStatus.associate = (models) => {
    MessageStatus.belongsTo(models.ChatMessage, { foreignKey: 'message_id', as: 'message' });
    MessageStatus.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return MessageStatus;
};
