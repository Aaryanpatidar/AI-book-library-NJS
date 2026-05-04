/**
 * routes/books.js — Book CRUD routes (all protected)
 */

const express = require('express');
const { body } = require('express-validator');
const {
  uploadBook,
  getBooks,
  getBookById,
  deleteBook,
} = require('../controllers/bookController');
const { protect } = require('../middleware/authMiddleware');
const { handleUpload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All routes require auth
router.use(protect);

// ─── Validation for book metadata ─────────────────────────────────────────
const bookMetaValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('author')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Author cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
];

// ─── Routes ───────────────────────────────────────────────────────────────
router.get('/', getBooks);
router.get('/:id', getBookById);

// handleUpload runs multer first, then validation, then controller
router.post(
  '/upload',
  handleUpload('pdf'),       // Multer middleware (field name 'pdf')
  bookMetaValidation,        // express-validator on body fields
  uploadBook
);

router.delete('/:id', deleteBook);

module.exports = router;
