
import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, User, Sparkles } from 'lucide-react';

function formatTime(dateString) {
  try {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);
  const hasSources = message.sourcesUsed?.length > 0;

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <User size={14} className="text-ink-950" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-jade-500 to-jade-600 flex items-center justify-center shadow-lg shadow-jade-500/20">
            <Sparkles size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
            ${isUser
              ? 'bg-amber-500/15 border border-amber-500/20 text-parchment-100 rounded-tr-sm'
              : 'bg-ink-700 border border-ink-600 text-parchment-200 rounded-tl-sm'
            }`}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        {message.createdAt && (
          <span className="text-[10px] text-parchment-200/25 px-1">
            {formatTime(message.createdAt)}
          </span>
        )}

        {/* Sources accordion (assistant only) */}
        {!isUser && hasSources && (
          <div className="w-full">
            <button
              onClick={() => setShowSources((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-parchment-200/40 hover:text-parchment-200/70 transition-colors px-1 py-0.5"
            >
              <BookOpen size={11} />
              <span>{message.sourcesUsed.length} source{message.sourcesUsed.length > 1 ? 's' : ''}</span>
              {showSources ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>

            {showSources && (
              <div className="mt-1.5 space-y-2 animate-fade-in">
                {message.sourcesUsed.map((src, i) => (
                  <div
                    key={i}
                    className="bg-ink-800/80 border border-ink-600 rounded-lg px-3 py-2"
                  >
                    <p className="text-[10px] font-mono text-amber-400/60 mb-1">
                      Page ~{src.pageNumber} · Chunk {src.chunkIndex}
                    </p>
                    <p className="text-xs text-parchment-200/50 leading-relaxed line-clamp-2">
                      "{src.excerpt}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
