module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
          isEmail: {
            args: true,
            msg: 'Please enter a valid email'
          }
        }
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
      },
      userprofile: {
        type: DataTypes.STRING,
        defaultValue: null
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'banned'),
        defaultValue: 'active'
      },
      userphone: {
        type: DataTypes.STRING
      },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other')
      },
      country: DataTypes.STRING,
      state: DataTypes.STRING,
      city: DataTypes.STRING,
      pincode: DataTypes.STRING,
      isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      lastSeen: {
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
      }
    },
    {
      timestamps: true,
      tableName: 'users'
    }
  );

  User.associate = (models) => {
    User.hasMany(models.ChatRoom, { foreignKey: 'created_by', as: 'createdChats' });
    User.hasMany(models.ChatMessage, { foreignKey: 'sender_id', as: 'sentMessages' });
    User.hasMany(models.ChatMember, { foreignKey: 'user_id', as: 'chatMemberships' });
    User.hasMany(models.ChatNotification, { foreignKey: 'user_id', as: 'notifications' });
  };

  return User;
};
