
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Search, BookOpen, RefreshCw } from 'lucide-react';
import { booksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="h-44 shimmer-bg" />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded shimmer-bg w-4/5" />
        <div className="h-3 rounded shimmer-bg w-2/5" />
        <div className="h-3 rounded shimmer-bg w-1/3" />
        <div className="flex gap-2 mt-4">
          <div className="h-9 flex-1 rounded-lg shimmer-bg" />
          <div className="h-9 flex-1 rounded-lg shimmer-bg" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchBooks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await booksAPI.getAll(1, 50);
      setBooks(res.data.books || []);
    } catch (err) {
      setError(err.message || 'Failed to load books.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // Auto-refresh every 8 s if any book is still processing
  useEffect(() => {
    const hasProcessing = books.some(
      (b) => b.processingStatus === 'processing' || b.processingStatus === 'pending'
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => fetchBooks(true), 8000);
    return () => clearInterval(interval);
  }, [books, fetchBooks]);

  const handleDelete = async (id) => {
    try {
      await booksAPI.delete(id);
      setBooks((bs) => bs.filter((b) => b._id !== id));
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  };

  // Client-side search filter
  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.author.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-10">
        <div className="flex-1">
          <p className="label mb-1">Your Library</p>
          <h1 className="font-serif text-3xl font-bold text-parchment-50">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-parchment-200/50 text-sm">
            {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchBooks(true)}
            disabled={refreshing}
            className="btn-ghost py-2.5"
            title="Refresh"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <Link to="/upload" className="btn-primary">
            <Upload size={15} />
            Upload Book
          </Link>
        </div>
      </div>

      {/* Search */}
      {books.length > 0 && (
        <div className="relative mb-8 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-200/30 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            className="input-base pl-9 py-2.5 text-sm"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-crimson-400 mb-4">{error}</p>
          <button onClick={() => fetchBooks()} className="btn-ghost">
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : books.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-ink-800 border border-ink-600 flex items-center justify-center">
            <BookOpen size={32} className="text-parchment-200/20" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-parchment-200/70 mb-2">
            Your library is empty
          </h2>
          <p className="text-parchment-200/40 text-sm mb-8 max-w-xs mx-auto">
            Upload a PDF to start reading and asking AI-powered questions about your books.
          </p>
          <Link to="/upload" className="btn-primary">
            <Upload size={15} />
            Upload your first book
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <p className="text-parchment-200/40">No books match &ldquo;{query}&rdquo;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((book, i) => (
            <div key={book._id} style={{ animationDelay: `${i * 40}ms` }}>
              <BookCard book={book} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
