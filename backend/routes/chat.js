/**
 * routes/chat.js — Chat / RAG Q&A routes (all protected)
 */

const express = require('express');
const { body, param } = require('express-validator');
const {
  askBookQuestion,
  getChatHistory,
  clearChatHistory,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require auth
router.use(protect);

// ─── Validation ───────────────────────────────────────────────────────────
const askValidation = [
  body('bookId')
    .notEmpty().withMessage('bookId is required')
    .isMongoId().withMessage('Invalid bookId format'),
  body('question')
    .trim()
    .notEmpty().withMessage('Question cannot be empty')
    .isLength({ min: 3, max: 1000 }).withMessage('Question must be 3–1000 characters'),
];

const bookIdParam = [
  param('bookId').isMongoId().withMessage('Invalid bookId format'),
];

// ─── Routes ───────────────────────────────────────────────────────────────
router.post('/ask', askValidation, askBookQuestion);
router.get('/:bookId', bookIdParam, getChatHistory);
router.delete('/:bookId', bookIdParam, clearChatHistory);

module.exports = router;
