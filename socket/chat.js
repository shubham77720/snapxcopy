const mongoose = require("mongoose");
const Message = require("../models/message");
const Status = require("../models/status");

const onlineUsers = new Map(); // userId -> socketId

module.exports = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      onlineUsers.set(userId, socket.id);
      io.emit("userStatus", { userId, status: "online" });
      // console.log(`User connected: ${userId}`);
    }

    socket.on("join", (uid) => {
      socket.join(uid);
    });

    // --- VOICE CALL EVENTS START ---
    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
      const targetSocketId = onlineUsers.get(userToCall);
      if (targetSocketId) {
        io.to(targetSocketId).emit("incomingCall", { from, signal: signalData, name });
      }
    });

    socket.on("answerCall", ({ signal, to }) => {
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("callAccepted", signal);
      }
    });

    socket.on("callRejected", ({ to }) => {
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("callRejected");
      }
    });

    socket.on("endCall", ({ to }) => {
      const targetSocketId = onlineUsers.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("endCall");
      }
    });
    // --- VOICE CALL EVENTS END ---

    // --- MESSAGE RELATED EVENTS ---
    socket.on("sendMessage", async (data) => {
      const newMessage = await Message.create({
        sender: data.senderId,
        receiver: data.receiverId,
        message: data.message || "",
        fileUrl: data.fileUrl || "",
        type: data.type,
        location: data.location || null,
        replyTo: data.replyTo || null
      });

      const populatedMsg = await Message.findById(newMessage._id)
        .populate("sender", "username profileImage")
        .populate("receiver", "username profileImage")
        .populate("replyTo");

      io.to(data.receiverId).emit("receiveMessage", populatedMsg);
      io.to(data.senderId).emit("receiveMessage", populatedMsg);
    });

    socket.on("markAsRead", async ({ userId, chatId }) => {
      try {
        await Message.updateMany(
          { sender: chatId, receiver: userId, read: false },
          { $set: { read: true } }
        );
        io.to(chatId.toString()).emit("messagesRead", { userId });
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    });

    // socket.on("deleteForMe", async ({ messageId, userId }) => {
    //   await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: userId } });
    //   io.to(userId).emit("messageDeletedForMe", messageId);
    // });

    // socket.on("deleteForEveryone", async ({ messageId }) => {
    //   await Message.findByIdAndDelete(messageId);
    //   io.emit("messageDeletedForEveryone", messageId);
    // });


socket.on("deleteForMe", async ({ messageId, userId }) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) return;

    if (message.sender?.toString() === userId) {
      message.deletedForSender = true;
    } else if (message.receiver?.toString() === userId) {
      message.deletedForReceiver = true;
    }

    await message.save();
    io.to(userId).emit("messageDeletedForMe", messageId);
  } catch (error) {
    console.error("Error in deleteForMe:", error);
  }
});

socket.on("deleteForEveryone", async ({ messageId }) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) return;

    message.deletedForSender = true;
    message.deletedForReceiver = true;

    await message.save();
    io.emit("messageDeletedForEveryone", messageId);
  } catch (error) {
    console.error("Error in deleteForEveryone:", error);
  }
});


socket.on("reactMessage", async ({ messageId, emoji, userId }) => {
  console.log("Reacting to message:", messageId, "with emoji:", emoji, "by user:", userId);

  let message = await Message.findById(messageId)
    .populate("sender", "username profileImage")
    .populate("receiver", "username profileImage")
    .populate("replyTo", "message type fileUrl");

  if (!message) return;

  // Find if this user already reacted
  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.userId.toString() === userId.toString()
  );

  if (emoji === "remove") {
    // 👉 Explicit remove request
    if (existingReactionIndex !== -1) {
      message.reactions.splice(existingReactionIndex, 1);
      console.log("Reaction removed by user:", userId);
    }
  } else {
    if (existingReactionIndex !== -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        console.log("Same emoji, no change");
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
        console.log("Replaced reaction");
      }
    } else {
      message.reactions.push({ emoji, userId });
      console.log("Added new reaction");
    }
  }

  await message.save();

  // 🔥 Populate again to ensure updated message has all references
  const updatedMsg = await Message.findById(messageId)
    .populate("sender", "username profileImage")
    .populate("receiver", "username profileImage")
    .populate("replyTo", "message type fileUrl");

  io.emit("messageReaction", updatedMsg , emoji); // send updated message to all clients
});

 socket.on("musicEvent", ({ roomId, action, data }) => {
    socket.to(roomId).emit("musicEvent", { action, data });
  });

    socket.on("typing", ({ senderId, receiverId, typing }) => {
      io.to(receiverId.toString()).emit("typingStatus", { typing, senderId });
    });

    // socket.on("fetchChatHistory", async (userA, userB) => {
    //   const history = await Message.find({
    //     $or: [
    //       { sender: userA, receiver: userB },
    //       { sender: userB, receiver: userA }
    //     ]
    //   })
    //     .sort({ timestamp: 1 })
    //     .populate("sender", "username profileImage")
    //     .populate("receiver", "username profileImage")
    //     .populate("replyTo", "message type fileUrl");

    //   socket.emit("chatHistory", history);
    // });







socket.on("fetchChatHistory", async (userA, userB) => {
  try {
    const history = await Message.find({
      $or: [
        { sender: userA, receiver: userB },
        { sender: userB, receiver: userA }
      ]
    })
      .sort({ timestamp: 1 })
      .populate("sender", "username profileImage")
      .populate("receiver", "username profileImage")
      .populate("replyTo", "message type fileUrl");

    // ✅ Filter messages according to deletion flags
    const filteredHistory = history.filter((msg) => {
      if (msg.deletedForSender && msg.sender._id.toString() === userA) return false;
      if (msg.deletedForReceiver && msg.receiver._id.toString() === userA) return false;
      return true;
    });

    socket.emit("chatHistory", filteredHistory);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    socket.emit("chatHistory", []);
  }
});


    // --- STATUS EVENTS ---
  socket.on("postStatus", async ({ userId, items }) => {
    try {
      const status = await Status.create({ user: userId, items });
      const populated = await Status.findById(status._id).populate(
        "user",
        "username profileImage"
      );
      io.emit("newStatus", populated);
    } catch (err) {
      console.error("Error posting status:", err);
    }
  });

  // Mark as viewed
 socket.on("viewStatus", async ({ userId, statusId }) => {
  try {
    const updatedStatus = await Status.findByIdAndUpdate(
      statusId,
      { $addToSet: { viewers: userId } },
      { new: true }
    );

    if (updatedStatus) {
      io.emit("statusViewed", {
        statusId,
        userId,
        viewerCount: updatedStatus.viewers.length
      });
    }
  } catch (err) {
    console.error("Error marking status as viewed:", err);
  }
});

// when user creates post (after backend POST success)
// socket.emit('postCreated', { userId: currentUser._id, postId: createdPost._id });

// // when user likes post
// socket.emit('likePost', { fromId: currentUser._id, postId, postOwnerId });

// // when user comments
// socket.emit('commentPost', {
//   fromId: currentUser._id,
//   postId,
//   postOwnerId,
//   commentId: newComment._id,
//   text: commentText,
//   mentions: [/* array of userIds mentioned inside comment text */]
// });

// // marking read
// socket.emit('markNotificationRead', { notifId, userId: currentUser._id });
     // --- DISCONNECT EVENT ---



   
     
    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit("userStatus", { userId, status: "offline" });
        // console.log(`User disconnected: ${userId}`);
      }
    });
  });
};
