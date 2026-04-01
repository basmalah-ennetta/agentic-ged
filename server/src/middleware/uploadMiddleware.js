const multer = require('multer');

const path = require('path');

// ── STORAGE CONFIGURATION ──────────────────────────────────────────────────
// This tells multer WHERE to save uploaded files and WHAT to name them

const storage = multer.diskStorage({
  // Which folder to save the file in
  destination: function (req, file, callback) {
    // Save all uploaded files to the server/uploads/ folder
    callback(null, 'uploads/');
  },

  // What to name the saved file
  filename: function (req, file, callback) {
    // We create a unique filename by combining:
    // - the original name (without extension): e.g., "contract"
    // - a timestamp: e.g., "1712000000000"
    // - the original extension: e.g., ".pdf"
    // Result: "contract-1712000000000.pdf"
    // This prevents overwriting files that have the same name

    const nameWithoutExtension = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    const uniqueName = `${nameWithoutExtension}-${Date.now()}${extension}`;

    callback(null, uniqueName);
  },
});

// ── FILE FILTER ────────────────────────────────────────────────────────────
// ACCEPT or REJECT a file
// We only want PDFs and images

const fileFilter = function (req, file, callback) {
  // Get the file extension
  const extension = path.extname(file.originalname).toLowerCase();

  // Allowed file extensions
  const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff'];

  if (allowedExtensions.includes(extension)) {
    // Accept the file
    callback(null, true);
  } else {
    // Reject the file
    callback(new Error('Only PDF and image files are allowed'), false);
  }
};

// ── CREATE THE MULTER INSTANCE ─────────────────────────────────────────────
const upload = multer({
  storage: storage,   // use custom storage config
  fileFilter: fileFilter, // use custom file filter
  limits: {
    fileSize: 10 * 1024 * 1024, // max file size: 10MB
  },
});

module.exports = upload;