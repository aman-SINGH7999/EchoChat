const { User } = require('../models');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, userphone, gender, country, state, city, pincode, userprofile } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (userphone) updateData.userphone = userphone;
    if (gender) updateData.gender = gender;
    if (country) updateData.country = country;
    if (state) updateData.state = state;
    if (city) updateData.city = city;
    if (pincode) updateData.pincode = pincode;
    if (userprofile) updateData.userprofile = userprofile;

    await user.update(updateData);

    res.json({
      message: 'Profile updated successfully',
      user: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id;
    const filePath = req.file.path;

    // Upload to cloudinary
    const { uploadToCloudinary } = require('../config/cloudinary');
    const result = await uploadToCloudinary(filePath, 'chat-app/profiles');

    const user = await User.findByPk(userId);
    await user.update({ userprofile: result.url });

    res.json({
      message: 'Profile picture updated successfully',
      user: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }

    const { Op } = require('sequelize');
    
    const users = await User.findAll({
      where: {
        id: { [Op.ne]: userId }, // Exclude the logged-in user
        [Op.or]: [
          { username: { [Op.like]: `%${query}%` } },
          { email: { [Op.like]: `%${query}%` } }
        ]
      },
      attributes: { exclude: ['password'] },
      limit: 10
    });

    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
