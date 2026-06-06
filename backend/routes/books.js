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

router.use(protect);

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

router.get('/', getBooks);
router.get('/:id', getBookById);

router.post(
  '/upload',
  handleUpload('pdf'),       
  bookMetaValidation,       
  uploadBook
);

router.delete('/:id', deleteBook);

module.exports = router;
