const Book = require('../models/Book');
const ChatHistory = require('../models/ChatHistory');
const { validationResult } = require('express-validator');
const { processPDF } = require('../rag/pdfProcessor');
const { embedAndStore, deleteBookVectors } = require('../rag/embeddingService');

const COVER_COLORS = [
  '#1e3a5f', '#2d5016', '#5c1a1a', '#2c3e6b',
  '#3d2b5c', '#1a4a4a', '#5c3d1a', '#2a4a2a',
];
let colorIndex = 0;

const uploadBook = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No PDF file provided.' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { title, author, description } = req.body;

  const fileUrl = req.file.path;

  let book;
  try {
    book = await Book.create({
      title: title?.trim() || req.file.originalname.replace('.pdf', ''),
      author: author?.trim() || 'Unknown Author',
      description: description?.trim() || '',
      originalName: req.file.originalname,
      fileUrl, 
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      processingStatus: 'processing',
      coverColor: COVER_COLORS[colorIndex++ % COVER_COLORS.length],
      vectorNamespace: null,
    });

    res.status(201).json({
      success: true,
      message: 'Book uploaded. Processing in background…',
      book: {
        _id: book._id,
        title: book.title,
        author: book.author,
        description: book.description,
        fileSize: book.fileSize,
        processingStatus: book.processingStatus,
        createdAt: book.createdAt,
        fileUrl: book.fileUrl,
        coverColor: book.coverColor,
      },
    });

    processBookInBackground(book, fileUrl);

  } catch (err) {
    console.error('Upload error:', err);

    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Upload failed. Please try again.' });
    }
  }
};

async function processBookInBackground(book, fileUrl) {
  try {
    console.log(`[Background Worker] Starting processing for Book: ${book._id}`);

    // 1. Call the upgraded processor (It handles extraction, chunking, and Pinecone syncing all at once!)
    const { pageCount, totalVectorsStored } = await processPDF(fileUrl, book._id.toString());

    // 2. Update MongoDB to tell the React frontend it was a total success
    await Book.findByIdAndUpdate(book._id, {
      processingStatus: 'completed',
      pageCount: pageCount,
      chunkCount: totalVectorsStored,
      vectorNamespace: book._id.toString(),
    });

    console.log(`[Database] Book ${book._id} successfully marked as COMPLETED.`);

  } catch (err) {
    console.error('[Background Processing Error]:', err.message);
    
    // If it actually fails, update MongoDB so the frontend knows
    await Book.findByIdAndUpdate(book._id, {
      processingStatus: 'failed',
      processingError: err.message,
    });
  }
}

const getBooks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 12);
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      Book.find({ uploadedBy: req.user._id })
        .select('-processingError')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Book.countDocuments({ uploadedBy: req.user._id }),
    ]);

    res.json({
      success: true,
      books,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch books.' });
  }
};

const getBookById = async (req, res) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
    }).lean();

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    res.json({ success: true, book });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not fetch book details.' });
  }
};

const deleteBook = async (req, res) => {
  try {
    const book = await Book.findOne({
      _id: req.params.id,
      uploadedBy: req.user._id,
    });

    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    if (book.vectorNamespace) {
      await deleteBookVectors(book.vectorNamespace).catch((e) =>
        console.warn('Pinecone cleanup warning:', e.message)
      );
    }

    await ChatHistory.deleteMany({ book: book._id });

    await book.deleteOne();

    res.json({ success: true, message: 'Book deleted successfully.' });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Could not delete book.' });
  }
};

module.exports = { uploadBook, getBooks, getBookById, deleteBook };