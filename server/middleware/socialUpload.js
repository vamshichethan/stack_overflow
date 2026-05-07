import fs from "fs";
import multer from "multer";
import path from "path";

const uploadDir = path.join(process.cwd(), "uploads", "social");
const maxFileSizeMb = Number(process.env.SOCIAL_UPLOAD_MAX_FILE_SIZE_MB || 25);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 40);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    cb(null, `${safeBaseName || "media"}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(
      new Error("Only JPG, PNG, WEBP, GIF, MP4, WEBM, and MOV files are allowed.")
    );
  }

  cb(null, true);
};

export const socialMediaUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
    files: 4,
  },
});

export const handleUploadErrors = (err, _req, res, next) => {
  if (!err) {
    return next();
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: `Each file must be ${maxFileSizeMb}MB or smaller.`,
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "You can upload up to 4 media files per post.",
      });
    }
  }

  return res.status(400).json({ message: err.message || "Upload failed." });
};
