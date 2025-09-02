const unzipper = require("unzipper");
const fs = require("fs");

app.post("/stickers/import", upload.single("file"), async (req, res) => {
  const packPath = req.file.path;

  // unzip pack
  fs.createReadStream(packPath)
    .pipe(unzipper.Extract({ path: "uploads/stickers/tmp" }))
    .on("close", async () => {
      const files = fs.readdirSync("uploads/stickers/tmp");
      
      const stickers = files.map(file => ({
        url: "/uploads/stickers/tmp/" + file,
        animated: file.endsWith(".json") ? true : false
      }));

      const pack = await StickerPack.create({
        name: "Imported Pack",
        author: req.user.username,
        stickers,
        owner: req.user._id
      });

      res.json(pack);
    });
});
