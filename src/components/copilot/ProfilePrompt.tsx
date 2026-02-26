"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

interface ProfilePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProfile: (name: string) => void;
  questionsAsked: number;
}

export function ProfilePrompt({ isOpen, onClose, onCreateProfile, questionsAsked }: ProfilePromptProps) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreateProfile(name.trim());
      setName('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-16 sm:top-20 right-2 sm:right-4 w-[calc(100vw-1rem)] sm:w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl overflow-hidden z-40"
        >
          <div className="relative p-4">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-1 hover:bg-muted/50 rounded-md transition-colors opacity-60 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {/* Content */}
            <div className="pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary/70" />
                <h3 className="font-medium text-foreground text-sm">Save your progress?</h3>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                You've explored {questionsAsked} topics. Create a profile to keep your conversations.
              </p>

              {/* Inline input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                    if (e.key === 'Escape') onClose();
                  }}
                  placeholder="Your name"
                  className="flex-1 px-3 py-1.5 bg-background/60 border border-border/50 rounded-lg text-sm text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
                />
                <button
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  className="px-3 py-1.5 bg-primary/90 text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Save
                </button>
              </div>

              {/* Subtle benefit text */}
              <p className="text-[10px] text-muted-foreground/60 mt-2">
                Optional • Access history anytime • No password needed
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
