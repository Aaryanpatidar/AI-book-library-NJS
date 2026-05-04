/**
 * pages/Upload.jsx
 * Drag-and-drop PDF uploader with metadata form and upload progress.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload as UploadIcon, FileText, X, CheckCircle, AlertCircle, BookOpen
} from 'lucide-react';
import { booksAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MAX_MB = 50;

function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', description: '' });
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // ─── File selection ─────────────────────────────────────────────────────
  const validateAndSetFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB}MB.`);
      return;
    }
    setError('');
    setFile(f);
    // Auto-fill title from filename
    if (!form.title) {
      const cleaned = f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      setForm((fm) => ({ ...fm, title: cleaned }));
    }
  };

  const onFileInput = (e) => {
    validateAndSetFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    validateAndSetFile(f);
  }, [form.title]);

  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a PDF file.'); return; }
    if (!form.title.trim()) { setError('Book title is required.'); return; }

    setUploading(true);
    setProgress(0);
    setError('');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', form.title.trim());
    formData.append('author', form.author.trim());
    formData.append('description', form.description.trim());

    try {
      await booksAPI.upload(formData, (pct) => setProgress(pct));
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2200);
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
    }
  };

  // ─── Success state ───────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-jade-500/15 border border-jade-500/30 flex items-center justify-center">
            <CheckCircle size={28} className="text-jade-400" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-parchment-50 mb-2">Book uploaded!</h2>
          <p className="text-parchment-200/50 text-sm mb-1">
            AI processing has started in the background.
          </p>
          <p className="text-parchment-200/35 text-xs">Redirecting to your library…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="label mb-1">Upload</p>
        <h1 className="font-serif text-3xl font-bold text-parchment-50">Add a new book</h1>
        <p className="mt-1 text-parchment-200/50 text-sm">
          PDF only · Max {MAX_MB}MB · Text-based PDFs work best
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !file && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
            ${dragOver
              ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
              : file
                ? 'border-jade-500/40 bg-jade-500/5 cursor-default'
                : 'border-ink-600 hover:border-amber-500/40 hover:bg-ink-800/50'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={onFileInput}
            className="hidden"
          />

          {file ? (
            /* File selected preview */
            <div className="flex items-center gap-4 justify-center">
              <div className="w-12 h-12 rounded-xl bg-jade-500/15 border border-jade-500/30 flex items-center justify-center flex-shrink-0">
                <FileText size={20} className="text-jade-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-parchment-100 truncate max-w-xs">
                  {file.name}
                </p>
                <p className="text-xs text-parchment-200/40 mt-0.5">{formatSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); setForm((f) => ({ ...f, title: '' })); }}
                className="ml-auto text-parchment-200/30 hover:text-crimson-400 transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            /* Default state */
            <div>
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-ink-700 border border-ink-600 flex items-center justify-center">
                <UploadIcon size={22} className="text-parchment-200/30" />
              </div>
              <p className="text-sm font-medium text-parchment-200/70 mb-1">
                Drag & drop your PDF here
              </p>
              <p className="text-xs text-parchment-200/35">or click to browse files</p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={15} className="text-amber-400" />
            <h2 className="font-serif text-base font-semibold text-parchment-100">Book details</h2>
          </div>

          {/* Title */}
          <div>
            <label className="label mb-1.5 block">Title <span className="text-crimson-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. The Art of War"
              className="input-base"
              maxLength={200}
            />
          </div>

          {/* Author */}
          <div>
            <label className="label mb-1.5 block">Author</label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              placeholder="e.g. Sun Tzu"
              className="input-base"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="label mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief summary or notes about this book…"
              rows={3}
              className="input-base resize-none"
              maxLength={1000}
            />
            <p className="text-right text-xs text-parchment-200/25 mt-1">
              {form.description.length}/1000
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-crimson-500/10 border border-crimson-500/30 rounded-lg px-4 py-3 animate-fade-in">
            <AlertCircle size={16} className="text-crimson-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-crimson-400">{error}</p>
          </div>
        )}

        {/* Progress */}
        {uploading && (
          <div className="animate-fade-in">
            <div className="flex justify-between text-xs text-parchment-200/40 mb-2">
              <span>Uploading…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress === 100 && (
              <p className="text-xs text-jade-400/70 mt-2 text-center animate-fade-in">
                Upload complete · Starting AI processing…
              </p>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading || !file}
          className="btn-primary w-full py-3 text-base"
        >
          {uploading ? (
            <>
              <LoadingSpinner size="sm" />
              Uploading…
            </>
          ) : (
            <>
              <UploadIcon size={16} />
              Upload &amp; Process Book
            </>
          )}
        </button>
      </form>
    </div>
  );
}
