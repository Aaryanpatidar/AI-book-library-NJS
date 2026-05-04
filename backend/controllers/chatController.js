
const { validationResult } = require('express-validator');
const Book = require('../models/Book');
const ChatHistory = require('../models/ChatHistory');
const { askQuestion } = require('../rag/retriever');

const askBookQuestion = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { bookId, question } = req.body;

  try {
    const book = await Book.findOne({
      _id: bookId,
      uploadedBy: req.user._id,
    });

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    if (book.processingStatus !== 'completed') {
      const messages = {
        pending: 'This book is queued for processing. Please try again in a moment.',
        processing: 'This book is still being processed. Please wait a moment.',
        failed: `Book processing failed: ${book.processingError || 'unknown error'}. Please re-upload the book.`,
      };
      return res.status(202).json({
        success: false,
        message: messages[book.processingStatus] || 'Book is not ready yet.',
        processingStatus: book.processingStatus,
      });
    }

    let chat = await ChatHistory.findOne({
      user: req.user._id,
      book: bookId,
    });

    if (!chat) {
      chat = await ChatHistory.create({
        user: req.user._id,
        book: bookId,
        messages: [],
      });
    }

    const userMessage = {
      role: 'user',
      content: question.trim(),
    };
    chat.messages.push(userMessage);

    const { answer, sourcesUsed, chunksRetrieved } = await askQuestion(
      question.trim(),
      book._id.toString()
    );

    const assistantMessage = {
      role: 'assistant',
      content: answer,
      sourcesUsed,
    };
    chat.messages.push(assistantMessage);

    if (chat.messages.length > 100) {
      chat.messages = chat.messages.slice(-100);
    }

    await chat.save();

    res.json({
      success: true,
      answer,
      sourcesUsed,
      chunksRetrieved,
      messageId: chat.messages[chat.messages.length - 1]._id,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to process your question. Please try again.',
    });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const book = await Book.findOne({
      _id: req.params.bookId,
      uploadedBy: req.user._id,
    }).select('title');

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    const chat = await ChatHistory.findOne({
      user: req.user._id,
      book: req.params.bookId,
    });

    res.json({
      success: true,
      bookTitle: book.title,
      messages: chat?.messages || [],
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch chat history.' });
  }
};

const clearChatHistory = async (req, res) => {
  try {
    await ChatHistory.findOneAndDelete({
      user: req.user._id,
      book: req.params.bookId,
    });
    res.json({ success: true, message: 'Chat history cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not clear chat history.' });
  }
};

module.exports = { askBookQuestion, getChatHistory, clearChatHistory };
