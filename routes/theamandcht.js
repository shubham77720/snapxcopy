const express = require("express");
const router = express.Router();
const ChatSettings = require("../models/ChatSettings");


// ✅ Helper: find setting regardless of userId/peerId order
const findSetting = async (userId, peerId) => {
  return await ChatSettings.findOne({
    $or: [
      { userId, peerId },
      { userId: peerId, peerId: userId }
    ]
  });
};


// ✅ Set Theme
// POST /chat-settings/theme
router.post("/theme", async (req, res) => {
  const { userId, peerId, theme } = req.body;

  try {
    let settings = await findSetting(userId, peerId);

    if (settings) {
      settings.theme = theme;
      await settings.save();
    } else {
      settings = new ChatSettings({ userId, peerId, theme });
      await settings.save();
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Get Theme
// GET /chat-settings/theme/:userId/:peerId
router.get("/theme/:userId/:peerId", async (req, res) => {
  const { userId, peerId } = req.params;

  try {
    const settings = await findSetting(userId, peerId);
    res.json({ theme: settings?.theme || "default" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Set Disappearing
// POST /chat-settings/disappearing
router.post("/disappearing", async (req, res) => {
  const { userId, peerId, enabled, duration } = req.body;

  try {
    let settings = await findSetting(userId, peerId);

    if (settings) {
      settings.disappearing = { enabled, duration };
      await settings.save();
    } else {
      settings = new ChatSettings({
        userId,
        peerId,
        disappearing: { enabled, duration }
      });
      await settings.save();
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ✅ Get Disappearing
// GET /chat-settings/disappearing/:userId/:peerId
router.get("/disappearing/:userId/:peerId", async (req, res) => {
  const { userId, peerId } = req.params;

  try {
    const settings = await findSetting(userId, peerId);
    res.json(settings?.disappearing || { enabled: false, duration: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
