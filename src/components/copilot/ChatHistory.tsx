"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Trash2, ChevronRight } from 'lucide-react';

interface HistoryItem {
  timestamp: number;
  query: string;
  response: string;
  level: string;
  mode: string;
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSelectChat: (item: HistoryItem) => void;
}

export function ChatHistory({ isOpen, onClose, userId, onSelectChat }: ChatHistoryProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchHistory();
    }
  }, [isOpen, userId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('[ChatHistory] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-card border-r border-border shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Chat History
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-20 bg-muted/30 rounded-lg skeleton-shimmer" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Clock className="w-12 h-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">No chat history yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Start a conversation to see it here
                  </p>
                </div>
              ) : (
                history.map((item, index) => (
                  <motion.button
                    key={item.timestamp}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      onSelectChat(item);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/50 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium text-foreground line-clamp-2 flex-1">
                        {truncate(item.query, 60)}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {item.level}
                      </span>
                      <span className="px-2 py-0.5 bg-muted rounded">
                        {item.mode === 'agent' ? '🔍 Research' : '📝 Normal'}
                      </span>
                      <span className="ml-auto">{formatDate(item.timestamp)}</span>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                {history.length} conversation{history.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
