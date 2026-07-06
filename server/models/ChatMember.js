module.exports = (sequelize, DataTypes) => {
  const ChatMember = sequelize.define(
    'ChatMember',
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
      user_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member'
      },
      joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      is_active: {                          
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    },
    {
      timestamps: true,
      tableName: 'chat_members'
    }
  );

  ChatMember.associate = (models) => {
    ChatMember.belongsTo(models.ChatRoom, { foreignKey: 'chat_id', as: 'chat' });
    ChatMember.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return ChatMember;
};
