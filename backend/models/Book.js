const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    author: {
      type: String,
      trim: true,
      maxlength: [100, 'Author name cannot exceed 100 characters'],
      default: 'Unknown Author',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    // ✅ NEW: Cloudinary URL
    fileUrl: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    pageCount: {
      type: Number,
      default: 0,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },

    processingError: {
      type: String,
      default: null,
    },

    chunkCount: {
      type: Number,
      default: 0,
    },

    vectorNamespace: {
      type: String,
      default: null,
    },

    coverColor: {
      type: String,
      default: '#1e3a5f',
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Indexes
bookSchema.index({ uploadedBy: 1, createdAt: -1 });
bookSchema.index({ processingStatus: 1 });

const Book = mongoose.model('Book', bookSchema);
module.exports = Book;