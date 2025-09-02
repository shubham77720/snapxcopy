    const express = require('express');
    const jwt = require('jsonwebtoken');
    const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
    const router = express.Router();


router.post('/register', async (req, res) => {
  try {
    const { username, phone, password } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    let existingUser = await User.findOne({ phone });
    if (existingUser) return res.status(400).json({ error: "Phone number already exists" });

    let user = new User({
      username,
      phone,
      password,
      bio: "Hey there! I am using ChatApp.",
      dob: null,
      profileImage: "https://via.placeholder.com/150"
    });

    await user.save();
    res.json({ message: "User Registered" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


    router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: "User not found" });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
    });

    module.exports = router;
