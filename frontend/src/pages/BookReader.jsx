import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

import { booksAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function BookReader() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [bookError, setBookError] = useState('');

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [pdfLoading, setPdfLoading] = useState(true);

  // Fetch book 
  useEffect(() => {
    booksAPI
      .getById(id)
      .then((res) => setBook(res.data.book))
      .catch((err) => setBookError(err.message || 'Book not found.'))
      .finally(() => setBookLoading(false));
  }, [id]);

  //  Memoized PDF URL
  const pdfUrl = useMemo(() => {
  return book?.fileUrl || null;
  }, [book?.fileUrl]);

  //  PDF Handlers 
  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    console.error('❌ FULL PDF ERROR:', err);
    alert('Failed to load PDF. Check console.');
    setPdfLoading(false);
  }, []);

  const goToPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNext = () =>
    setPageNumber((p) => Math.min(numPages || p, p + 1));

  const zoomIn = () =>
    setScale((s) => Math.min(2.5, +(s + 0.2).toFixed(1)));
  const zoomOut = () =>
    setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(1)));
  const resetZoom = () => setScale(1.2);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [numPages]);

  if (bookLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (bookError || !book) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-center">
        <div>
          <p className="text-red-400 mb-4">
            {bookError || 'Book not found.'}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-ghost"
          >
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">

      {/* TOP BAR */}
      <div className="bg-ink-900 border-b px-4 py-2 flex items-center gap-3">
        <Link to="/dashboard" className="btn-ghost text-xs">
          <ArrowLeft size={14} /> Back
        </Link>

        <div className="flex-1 truncate">
          <p className="text-sm font-semibold">{book.title}</p>
          <p className="text-xs opacity-50">{book.author}</p>
        </div>

        <button onClick={zoomOut}><ZoomOut size={14} /></button>
        <button onClick={resetZoom}>
          {Math.round(scale * 100)}%
        </button>
        <button onClick={zoomIn}><ZoomIn size={14} /></button>

        {book.processingStatus === 'completed' && (
          <Link to={`/books/${id}/chat`} className="btn-primary text-xs">
            <MessageSquare size={14} /> Ask AI
          </Link>
        )}
      </div>

      {/* PDF VIEW */}
      <div className="flex-1 overflow-auto flex flex-col items-center py-6">

        {pdfLoading && (
          <div className="flex items-center gap-2 mt-10">
            <LoadingSpinner />
            <span>Loading PDF...</span>
          </div>
        )}

        {pdfUrl && (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="bg-ink-900 border-t py-2 flex justify-center gap-4">
        <button onClick={goToPrev} disabled={pageNumber <= 1}>
          <ChevronLeft size={16} />
        </button>

        <span>
          {pageNumber} / {numPages || '-'}
        </span>

        <button
          onClick={goToNext}
          disabled={!numPages || pageNumber >= numPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}