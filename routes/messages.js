const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/message");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              // ✅ Self chat case
              { $and: [{ $eq: ["$sender", userId] }, { $eq: ["$receiver", userId] }] },
              userId,
              {
                $cond: [
                  { $eq: ["$sender", userId] },
                  "$receiver",
                  "$sender"
                ]
              }
            ]
          },
          latestMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiver", userId] }, { $eq: ["$read", false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          user: {
            _id: "$user._id",
            name: "$user.username",
            photo: "$user.profileImage"
          },
          latestMessage: {
            message: "$latestMessage.message",
            messageType: "$latestMessage.messageType", // ✅ handles text, image, etc.
            timestamp: "$latestMessage.timestamp",
            read: "$latestMessage.read" // ✅ for blue tick
          },
          unreadCount: 1
        }
      },
      { $sort: { "latestMessage.timestamp": -1 } }
    ]);

    res.json(messages);
  } catch (err) {
    console.error("Error fetching recent chats:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
