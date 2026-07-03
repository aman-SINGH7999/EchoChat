module.exports = (sequelize, DataTypes) => {
  const OTP = sequelize.define(
    'OTP',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false
      },
      otp: {
        type: DataTypes.STRING(6),
        allowNull: false
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      expires_at: {
        type: DataTypes.DATE,
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
      tableName: 'otps'
    }
  );

  return OTP;
};
