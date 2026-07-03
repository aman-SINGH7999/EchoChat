module.exports = (sequelize, DataTypes) => {
  const ChatRoom = sequelize.define(
    'ChatRoom',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      chat_name: {
        type: DataTypes.STRING
      },
      chat_description: DataTypes.TEXT,
      chat_type: {
        type: DataTypes.ENUM('private', 'group'),
        defaultValue: 'private'
      },
      room_image: {
        type: DataTypes.STRING,
        defaultValue: null
      },
      created_by: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      last_message_id: DataTypes.INTEGER,
      is_archived: {
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
      tableName: 'chat_rooms'
    }
  );

  ChatRoom.associate = (models) => {
    ChatRoom.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    ChatRoom.hasMany(models.ChatMessage, { foreignKey: 'chat_id', as: 'messages' });
    ChatRoom.hasMany(models.ChatMember, { foreignKey: 'chat_id', as: 'members' });
  };

  return ChatRoom;
};
