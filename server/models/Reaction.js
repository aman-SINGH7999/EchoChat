module.exports = (sequelize, DataTypes) => {
  const Reaction = sequelize.define(
    'Reaction',
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
      emoji: {
        type: DataTypes.STRING(10),
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
      tableName: 'reactions'
    }
  );

  Reaction.associate = (models) => {
    Reaction.belongsTo(models.ChatMessage, { foreignKey: 'message_id', as: 'message' });
    Reaction.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return Reaction;
};
