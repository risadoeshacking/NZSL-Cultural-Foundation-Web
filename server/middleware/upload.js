const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const uploadDir = process.env.UPLOAD_DIR || "./uploads";

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(uploadDir);
ensureDir(path.join(uploadDir, "events"));
ensureDir(path.join(uploadDir, "news"));
ensureDir(path.join(uploadDir, "gallery"));
ensureDir(path.join(uploadDir, "stories"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = req.uploadFolder || "gallery";
    const dest = path.join(uploadDir, subfolder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = uuidv4() + ext;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, png, gif, webp, svg)"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
  },
});

module.exports = upload;
