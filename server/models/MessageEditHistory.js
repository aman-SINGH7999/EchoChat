module.exports = (sequelize, DataTypes) => {
  const MessageEditHistory = sequelize.define(
    'MessageEditHistory',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      message_id: {
        type: DataTypes.INTEGER,
        references: { model: 'chat_messages', key: 'id' }
      },
      previous_text: {
        type: DataTypes.TEXT,
        allowNull: false
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
      tableName: 'message_edit_histories'
    }
  );

  MessageEditHistory.associate = (models) => {
    MessageEditHistory.belongsTo(models.ChatMessage, { foreignKey: 'message_id', as: 'message' });
  };

  return MessageEditHistory;
};