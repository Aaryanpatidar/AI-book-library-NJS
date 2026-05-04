const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); 

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();

    return {
      folder: 'books',
      resource_type: 'raw',

      // 🔥 IMPORTANT FIX
      access_mode: 'public',   // ✅ ADD THIS

      public_id: `${Date.now()}-${file.originalname.replace(ext, '')}`,
    };
  },
});

// ─── FILE FILTER (KEEP YOUR LOGIC) ──────────────────────
const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['application/pdf'];
  const allowedExtensions = ['.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedTypes.includes(file.mimetype) &&
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        'Only PDF files are allowed.'
      ),
      false
    );
  }
};

// ─── SIZE LIMIT ─────────────────────────────────────────
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 10; 

// ─── MULTER INSTANCE ────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 1,
  },
});

// ─── ERROR HANDLER (KEEP SAME) ──────────────────────────
const handleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum allowed size is ${MAX_SIZE_MB}MB.`,
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }

    return res.status(400).json({
      success: false,
      message: err?.message || 'File upload failed.',
    });
  });
};

module.exports = { handleUpload };