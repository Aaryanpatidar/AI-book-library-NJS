
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Send, BookOpen, ArrowLeft, Trash2, Sparkles, AlertCircle, Info
} from 'lucide-react';
import { booksAPI, chatAPI } from '../services/api';
import ChatMessage from '../components/ChatMessage';
import LoadingSpinner from '../components/LoadingSpinner';

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-jade-500 to-jade-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-jade-500/20">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="bg-ink-700 border border-ink-600 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

const STARTERS = [
  'What is the main theme of this book?',
  'Summarize the key ideas in this book.',
  'Who are the main characters or figures?',
  'What is the conclusion or final argument?',
];

export default function Chat() {
  const { id } = useParams();

  const [book, setBook] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [clearingHistory, setClearingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, sending]);

  // Load book + chat history
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);
      try {
        const [bookRes, chatRes] = await Promise.all([
          booksAPI.getById(id),
          chatAPI.getHistory(id),
        ]);
        if (!cancelled) {
          setBook(bookRes.data.book);
          setMessages(chatRes.data.messages || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load chat.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [id]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // Submit question
  const handleSend = useCallback(async (question) => {
    const q = (question || input).trim();
    if (!q || sending) return;

    setInput('');
    setSending(true);
    setError('');

    // Optimistic user message
    const userMsg = { role: 'user', content: q, createdAt: new Date().toISOString() };
    setMessages((ms) => [...ms, userMsg]);

    try {
      const res = await chatAPI.ask(id, q);
      const assistantMsg = {
        role: 'assistant',
        content: res.data.answer,
        sourcesUsed: res.data.sourcesUsed || [],
        createdAt: new Date().toISOString(),
      };
      setMessages((ms) => [...ms, assistantMsg]);
    } catch (err) {
      setError(err.message || 'Failed to get an answer. Please try again.');
      // Remove optimistic message on error
      setMessages((ms) => ms.slice(0, -1));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [id, input, sending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear all chat history for this book?')) return;
    setClearingHistory(true);
    try {
      await chatAPI.clearHistory(id);
      setMessages([]);
    } catch (err) {
      setError(err.message || 'Failed to clear history.');
    } finally {
      setClearingHistory(false);
    }
  };

  // ─── Loading / Error states ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !book) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle size={32} className="text-crimson-400 mx-auto mb-4" />
          <p className="text-crimson-400 mb-4">{error}</p>
          <Link to="/dashboard" className="btn-ghost">
            <ArrowLeft size={14} /> Back to Library
          </Link>
        </div>
      </div>
    );
  }

  const isReady = book?.processingStatus === 'completed';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex-shrink-0 bg-ink-900/90 backdrop-blur-md border-b border-ink-600 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link to="/dashboard" className="btn-ghost py-1.5 text-xs flex-shrink-0">
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Library</span>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <BookOpen size={13} className="text-amber-400 flex-shrink-0" />
              <p className="font-serif text-sm font-semibold text-parchment-100 truncate">
                {book?.title}
              </p>
            </div>
            <p className="text-[11px] text-parchment-200/40 ml-5">
              {book?.author} · {book?.pageCount ? `${book.pageCount} pages` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to={`/books/${id}/read`} className="btn-ghost py-1.5 text-xs">
              <BookOpen size={13} />
              <span className="hidden sm:inline">Read</span>
            </Link>
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={clearingHistory}
                className="btn-ghost py-1.5 text-xs text-crimson-400/60 hover:text-crimson-400 hover:border-crimson-500/30"
                title="Clear history"
              >
                {clearingHistory ? <LoadingSpinner size="sm" /> : <Trash2 size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Not ready banner */}
      {!isReady && (
        <div className="flex-shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-amber-400 text-sm">
            <Info size={14} />
            <span>
              {book?.processingStatus === 'processing'
                ? 'Book is being indexed. Chat will be available shortly.'
                : book?.processingStatus === 'failed'
                  ? `Processing failed: ${book?.processingError || 'unknown error'}`
                  : 'Book is queued for indexing.'}
            </span>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Welcome / empty state */}
          {messages.length === 0 && (
            <div className="text-center py-10 animate-fade-in">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-jade-500/20 to-jade-500/5 border border-jade-500/20 flex items-center justify-center">
                <Sparkles size={22} className="text-jade-400" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-parchment-100 mb-1">
                Ask anything about this book
              </h2>
              <p className="text-sm text-parchment-200/40 mb-8 max-w-sm mx-auto">
                I can only answer from what&apos;s in the document. If the answer isn&apos;t there,
                I&apos;ll tell you.
              </p>

              {/* Starter suggestions */}
              {isReady && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="text-left text-xs px-4 py-3 rounded-xl bg-ink-800 border border-ink-600 hover:border-amber-500/30 hover:bg-ink-700 text-parchment-200/60 hover:text-parchment-100 transition-all duration-200"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Render messages */}
          {messages.map((msg, i) => (
            <ChatMessage key={msg._id || i} message={msg} />
          ))}

          {/* Typing indicator */}
          {sending && <TypingIndicator />}

          {/* Error inline */}
          {error && (
            <div className="flex items-start gap-2 bg-crimson-500/10 border border-crimson-500/20 rounded-xl px-4 py-3 animate-fade-in">
              <AlertCircle size={14} className="text-crimson-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-crimson-400">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-ink-900/90 backdrop-blur-md border-t border-ink-600 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-ink-800 border border-ink-600 rounded-2xl px-4 py-3 focus-within:border-amber-500/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isReady || sending}
              placeholder={
                !isReady
                  ? 'Waiting for book to finish processing…'
                  : 'Ask a question about this book… (Enter to send, Shift+Enter for newline)'
              }
              rows={1}
              className="flex-1 bg-transparent text-sm text-parchment-100 placeholder-parchment-200/25 resize-none outline-none leading-relaxed disabled:opacity-40"
              style={{ minHeight: '24px', maxHeight: '160px' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending || !isReady}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-ink-700 disabled:text-parchment-200/20 text-ink-950 flex items-center justify-center transition-all duration-200 active:scale-90"
            >
              {sending
                ? <LoadingSpinner size="sm" className="border-ink-950/20 border-t-ink-950" />
                : <Send size={14} />
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-parchment-200/20 mt-2">
            Answers are strictly based on the uploaded document content.
          </p>
        </div>
      </div>
    </div>
  );
}
