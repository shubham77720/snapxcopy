const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Status = require("../models/status");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const { default: mongoose } = require("mongoose");

// Create upload folder if it doesn't exist
const uploadFolder = path.join(__dirname, "../uploads/status");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Serve static uploads
router.use("/files", express.static(path.join(__dirname, "../uploads/status")));

// 1️⃣ Upload file only
router.post("/file", authMiddleware, upload.single("file"), (req, res) => {
  console.log("File upload triggered");
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/status/files/${req.file.filename}`;
  res.json({ fileUrl, filename: req.file.filename });
});

// 2️⃣ Create a status entry in DB
router.post("/upload", authMiddleware, async (req, res) => {

  console.log("Upload status triggered",req.body);
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    const status = await Status.create({
      user: req.userId,
      items
    });

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3️⃣ Get all statuses (except my own)
// GET My Status & Friends' Statuses
// 📌 Get all statuses (My own + friends) grouped by user
// router.get("/watch", authMiddleware, async (req, res) => {
//   try {
//     const myId = req.userId;

//     // 1️⃣ Get my statuses
// const myStatuses = await Status.aggregate([
//   { $match: { user: new mongoose.Types.ObjectId(myId) } },
//   // Unwind items to process each item separately
//   { $unwind: "$items" },
//   // Lookup viewers' user info for each item
//   {
//     $lookup: {
//       from: "users",
//       localField: "items.viewers",
//       foreignField: "_id",
//       as: "items.viewerUsers"
//     }
//   },
//   // Add viewer info to each item
//   {
//     $addFields: {
//       "items.viewers": {
//         $map: {
//           input: "$items.viewerUsers",
//           as: "viewer",
//           in: {
//             _id: "$$viewer._id",
//             username: "$$viewer.username",
//             profileImage: "$$viewer.profileImage"
//           }
//         }
//       }
//     }
//   },
//   // Group back items into array per status
//   {
//     $group: {
//       _id: "$_id",
//       user: { $first: "$user" },
//       items: { $push: "$items" },
//       createdAt: { $first: "$createdAt" }
//     }
//   },
//   // Lookup user info for the status owner
//   {
//     $lookup: {
//       from: "users",
//       localField: "user",
//       foreignField: "_id",
//       as: "userInfo"
//     }
//   },
//   { $unwind: "$userInfo" },
//   // Final project with only required fields
//   {
//     $project: {
//       _id: 1,
//       user: {
//         _id: "$userInfo._id",
//         username: "$userInfo.username",
//         profileImage: "$userInfo.profileImage"
//       },
//       items: 1,
//       createdAt: 1
//     }
//   }
// ]);



//     // 2️⃣ Get my friends' statuses
//     const me = await User.findById(myId).select("friends");
//     const friendIds = me.friends || [];

// // const friendStatuses = await Status.aggregate([
// //   { $match: { user: { $in: friendIds } } },
// //   { $sort: { createdAt: -1 } },
// //   {
// //     $group: {
// //       _id: "$user",
// //       latestCreatedAt: { $first: "$createdAt" },
// //       items: { $push: "$items" }
// //     }
// //   },
// //   {
// //     $lookup: {
// //       from: "users",
// //       localField: "_id",
// //       foreignField: "_id",
// //       as: "user"
// //     }
// //   },
// //   { $unwind: "$user" },
// //   {
// //     $project: {
// //       _id: 0,
// //       user: {
// //         _id: "$user._id",
// //         username: "$user.username",
// //         profileImage: "$user.profileImage"
// //       },
// //       items: {
// //         $map: {
// //           input: {
// //             $reduce: {
// //               input: "$items",
// //               initialValue: [],
// //               in: { $concatArrays: ["$$value", "$$this"] }
// //             }
// //           },
// //           as: "item",
// //           in: {
// //             type: "$$item.type",
// //             url: "$$item.url",
// //             caption: "$$item.caption",
// //             timestamp: "$$item.timestamp",
// //             _id: "$$item._id"
// //           }
// //         }
// //       },
// //       createdAt: "$latestCreatedAt"
// //     }
// //   },
// //   { $sort: { createdAt: -1 } }
// // ]);

// const friendStatuses = await Status.aggregate([
//   { $match: { user: { $in: friendIds } } },
//   { $sort: { createdAt: -1 } },
//   {
//     $group: {
//       _id: "$user",
//       latestCreatedAt: { $first: "$createdAt" },
//       items: { $push: "$items" }
//     }
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "_id",
//       foreignField: "_id",
//       as: "user"
//     }
//   },
//   { $unwind: "$user" },
//   {
//     $project: {
//       _id: 0,
//       user: {
//         _id: "$user._id",
//         username: "$user.username",
//         profileImage: "$user.profileImage"
//       },
//       items: {
//         $reduce: {
//           input: "$items",
//           initialValue: [],
//           in: { $concatArrays: ["$$value", "$$this"] }
//         }
//       },
//       createdAt: "$latestCreatedAt"
//     }
//   },
//   {
//     $addFields: {
//       allStatusViewers: {
//         $reduce: {
//           input: "$items",
//           initialValue: { $ifNull: [ { $arrayElemAt: [ "$items.viewers", 0 ] }, [] ] },
//           in: { $setIntersection: ["$$value", "$$this.viewers"] }
//         }
//       }
//     }
//   },
//   { $sort: { createdAt: -1 } }
// ]);


// const canwatch =""
// if(friendStatuses) {
//   canwatch = false
// }
// if(mys)

//   console.log("Friend statuses:", friendStatuses[0]);
//     res.json({
//       myStatuses, 
//       friendStatuses,
//       canwatch: false
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });
router.get("/watch", authMiddleware, async (req, res) => {
  try {
    const myId = req.userId;

    // 1️⃣ My statuses
   const myStatuses = await Status.aggregate([
  { $match: { user: new mongoose.Types.ObjectId(myId) } },
  {
    $unwind: "$items"
  },
  {
    $lookup: {
      from: "users",
      localField: "items.viewers",
      foreignField: "_id",
      as: "items.viewerUsers"
    }
  },
  {
    $addFields: {
      "items.viewers": {
        $map: {
          input: "$items.viewerUsers",
          as: "viewer",
          in: {
            _id: "$$viewer._id",
            username: "$$viewer.username",
            profileImage: "$$viewer.profileImage"
          }
        }
      }
    }
  },
  {
    $group: {
      _id: "$user", // user-based grouping
      items: { $push: "$items" },
      createdAt: { $max: "$createdAt" } // latest createdAt
    }
  },
  {
    $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "userInfo"
    }
  },
  { $unwind: "$userInfo" },
  {
    $project: {
      _id: 0,
      user: {
        _id: "$userInfo._id",
        username: "$userInfo.username",
        profileImage: "$userInfo.profileImage"
      },
      items: 1,
      createdAt: 1
    }
  }
]);


    // 2️⃣ Friends' statuses
    const me = await User.findById(myId).select("friends");
    const friendIds = me.friends || [];

    const friendStatuses = await Status.aggregate([
      { $match: { user: { $in: friendIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          latestCreatedAt: { $first: "$createdAt" },
          items: { $push: "$items" }
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
          _id: 0,
          user: {
            _id: "$user._id",
            username: "$user.username",
            profileImage: "$user.profileImage"
          },
          items: {
            $reduce: {
              input: "$items",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] }
            }
          },
          createdAt: "$latestCreatedAt"
        }
      },
      {
        $addFields: {
          allStatusViewers: {
            $reduce: {
              input: "$items",
              initialValue: { $ifNull: [ { $arrayElemAt: [ "$items.viewers", 0 ] }, [] ] },
              in: { $setIntersection: ["$$value", "$$this.viewers"] }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    // 🟢 canwatch logic
    let canwatch = true; // default: my status
    if (friendStatuses.length > 0) {
      canwatch = false; // friend ka status → viewers nahi dikhana
    }
console.log(canwatch, "canwatch value");
console.log("My statuses:", myStatuses);
    res.json({
      myStatuses,
      friendStatuses,
      canwatch
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/view/:statusItemId", authMiddleware, async (req, res) => {
  try {
    const { statusItemId } = req.params; 
    const userId = req.userId; // direct le lo

    // if (!mongoose.Types.ObjectId.isValid(statusItemId) || !mongoose.Types.ObjectId.isValid(userId)) {
    //   return res.status(400).json({ message: "Invalid ID" });
    // }

    // viewer add करना
    const status = await Status.findOneAndUpdate(
      { "items._id": statusItemId },
      { $addToSet: { "items.$.viewers": userId } },
      { new: true }
    );

    if (!status) {
      return res.status(404).json({ message: "Status item not found" });
    }
    
    res.json({ message: "View added successfully", status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// 4️⃣ Mark status as viewed
// router.post("/view/:id", authMiddleware, async (req, res) => {
//   // try {
//   console.log("Marking status as viewed:", req.params.id, "by user:", req.userId);
//     const status = await Status.findByIdAndUpdate(
//       req.params.id,
//       { $addToSet: { viewers: req.userId } }, // ensure ObjectId
//       { new: true }
//     ).populate("viewers", "username profileImage"); // viewer details

//     if (!status) {
//       return res.status(404).json({ error: "Status not found" });
//     }
// console.log("Status viewed:", status);
//     res.json({
//       status,
//       viewerCount: status.viewers.length
//     });
//   // } catch (err) {
//   //   console.error("Error viewing status:", err);
//   //   res.status(500).json({ error: "Internal Server Error" });
//   // }
// });


module.exports = router;
