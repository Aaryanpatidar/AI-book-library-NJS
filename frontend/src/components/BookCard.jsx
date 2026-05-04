
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, MessageSquare, Trash2, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

const STATUS_CONFIG = {
  pending:    { icon: Clock,         color: 'text-parchment-200/40', label: 'Queued'     },
  processing: { icon: Loader,        color: 'text-amber-400',        label: 'Processing' },
  completed:  { icon: CheckCircle,   color: 'text-jade-400',         label: 'Ready'      },
  failed:     { icon: XCircle,       color: 'text-crimson-400',      label: 'Failed'     },
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function BookCard({ book, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = STATUS_CONFIG[book.processingStatus] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const isReady = book.processingStatus === 'completed';

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(book._id);
    setDeleting(false);
    setConfirmDelete(false);
  };

  return (
    <article className="card group hover:border-amber-500/30 transition-all duration-300 flex flex-col animate-fade-in">
      {/* Cover */}
      <div
        className="relative h-44 flex items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${book.coverColor || '#1e3a5f'}, ${book.coverColor || '#1e3a5f'}cc)` }}
      >
        {/* Decorative lines */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px bg-white/60"
              style={{ top: `${15 + i * 14}%` }}
            />
          ))}
        </div>

        <BookOpen
          size={48}
          className="text-white/20 group-hover:text-white/30 transition-colors"
        />

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-ink-950/60 backdrop-blur-sm ${status.color}`}>
            <StatusIcon size={11} className={book.processingStatus === 'processing' ? 'animate-spin' : ''} />
            {status.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        <h3 className="font-serif font-semibold text-base text-parchment-100 leading-snug mb-1 line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs text-parchment-200/50 mb-3 truncate">{book.author}</p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-parchment-200/35 mb-4">
          {book.pageCount > 0 && <span>{book.pageCount} pages</span>}
          <span>{formatSize(book.fileSize)}</span>
          {book.chunkCount > 0 && <span>{book.chunkCount} chunks</span>}
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <Link
            to={`/books/${book._id}/read`}
            className="flex-1 btn-ghost text-xs py-2 justify-center"
          >
            <BookOpen size={13} />
            Read
          </Link>

          {isReady ? (
            <Link
              to={`/books/${book._id}/chat`}
              className="flex-1 btn-primary text-xs py-2 justify-center"
            >
              <MessageSquare size={13} />
              Chat
            </Link>
          ) : (
            <button
              disabled
              className="flex-1 btn-ghost text-xs py-2 justify-center opacity-40 cursor-not-allowed"
            >
              <MessageSquare size={13} />
              Chat
            </button>
          )}

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg text-parchment-200/30 hover:text-crimson-400 hover:bg-crimson-500/10 transition-colors"
              title="Delete book"
            >
              <Trash2 size={13} />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-1.5 rounded-lg bg-crimson-500/20 text-crimson-400 text-xs font-medium hover:bg-crimson-500/30 transition-colors disabled:opacity-50"
              >
                {deleting ? '…' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1.5 rounded-lg bg-ink-700 text-parchment-200/50 text-xs hover:bg-ink-600 transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
