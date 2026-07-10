const { File } = require('../models');
const { uploadToCloudinary } = require('../config/cloudinary');
const fs = require('fs');

// find message_type 
const getMessageType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'file';
};

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const result = await uploadToCloudinary(req.file.path, 'chat-app/messages');

    const fileRecord = await File.create({
      file_name: req.file.originalname,
      file_url: result.url,
      file_type: req.file.mimetype,
      file_size: result.size || req.file.size,
      uploaded_by: userId,
      cloudinary_id: result.publicId
    });

    // local temp file cleanup — on Cloudinary already upload
    fs.unlink(req.file.path, () => {});

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord.id,
        file_name: fileRecord.file_name,
        file_url: fileRecord.file_url,
        file_type: fileRecord.file_type,
        file_size: fileRecord.file_size
      },
      message_type: getMessageType(req.file.mimetype)   // frontend - image/video/audio/file
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { uploadFile };