module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    'File',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      file_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      file_url: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      file_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      file_size: DataTypes.INTEGER,
      uploaded_by: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      cloudinary_id: DataTypes.STRING,
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
      tableName: 'files'
    }
  );

  File.associate = (models) => {
    File.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
  };

  return File;
};
