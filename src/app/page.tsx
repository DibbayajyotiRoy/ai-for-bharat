"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Copy, X, Clipboard, History } from 'lucide-react';
import { ResultDisplay } from '@/components/copilot/ResultDisplay';

export default function Home() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  // Simple language detection simulation
  useEffect(() => {
    if (!input) {
      setDetectedLang(null);
      return;
    }
    const codePatterns = {
      'Python': ['def ', 'import ', 'print('],
      'JavaScript': ['const ', 'function ', '=>', 'console.log'],
      'Rust': ['fn ', 'let mut ', 'impl '],
      'HTML': ['<div', '<html>', '<body>'],
    };

    for (const [lang, patterns] of Object.entries(codePatterns)) {
      if (patterns.some(p => input.includes(p))) {
        setDetectedLang(lang);
        return;
      }
    }
    setDetectedLang('Text');
  }, [input]);

  const handleExplain = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input, level })
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        setResult((prev) => prev + chunkValue);
      }

    } catch (error) {
      console.error('Error fetching explanation:', error);
      setResult('**Error:** Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">

      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-slate-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 bg-slate-800/50 border border-slate-700/50 rounded-full backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 mr-2" />
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Learning Copilot</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-slate-100 tracking-tight leading-tight mb-4">
            Explain concepts.<br />Not yourself.
          </h1>
          <p className="text-slate-400 text-lg max-w-lg mx-auto font-light">
            Paste code, text, or a concept. Get a structured explanation instantly.
          </p>
        </motion.div>

        {/* Input Area */}
        <motion.div
          layout
          className="w-full max-w-2xl relative group"
        >
          {/* Advanced Mode Glow Effect */}
          <div className={`absolute -inset-[1px] rounded-xl transition-opacity duration-500 ${level === 'Advanced' ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 opacity-100' : 'opacity-0'
            } blur-sm`}></div>

          <div className="relative glass rounded-xl p-1 shadow-2xl ring-1 ring-white/5">
            <div className="relative">
              <textarea
                className="w-full h-40 bg-transparent text-slate-200 placeholder-slate-500 p-5 resize-none focus:outline-none text-lg leading-relaxed font-sans glass-input rounded-lg selection:bg-indigo-500/30"
                placeholder="Paste 'Race Condition' or a code snippet here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleExplain();
                  }
                }}
              />

              {/* Quick Actions (Top Right) */}
              <div className="absolute top-3 right-3 flex space-x-1">
                {input && (
                  <button
                    onClick={() => setInput('')}
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-md transition-colors"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handlePaste}
                  className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50 rounded-md transition-colors"
                  title="Paste from Clipboard"
                >
                  <Clipboard className="w-4 h-4" />
                </button>
              </div>

              {/* Language Tag (Bottom Right) */}
              {detectedLang && (
                <div className="absolute bottom-3 right-3 text-xs font-medium text-indigo-400/80 bg-indigo-500/10 px-2 py-1 rounded">
                  {detectedLang}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-2 pb-2 pt-3 border-t border-slate-700/30 mt-1">
              <div className="flex space-x-1 bg-slate-900/40 p-1 rounded-lg border border-slate-700/30">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${level === lvl
                        ? 'bg-slate-700 text-slate-100 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                      }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <button
                onClick={handleExplain}
                disabled={isLoading || !input.trim()}
                className={`flex items-center px-6 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg ${isLoading || !input.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400 hover:shadow-indigo-500/25 active:scale-95'
                  }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Thinking
                  </>
                ) : (
                  <>
                    Explain <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Action Hint */}
        <AnimatePresence>
          {!input && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-slate-500 text-sm flex items-center"
            >
              <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-400 text-xs mr-2">⌘ V</kbd>
              to paste
              <span className="mx-2 text-slate-700">|</span>
              <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-400 text-xs mr-2">⌘ Enter</kbd>
              to explain
            </motion.p>
          )}
        </AnimatePresence>


        {/* Result Area */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-3xl mt-12 space-y-4"
            >
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass p-6 rounded-xl border border-slate-700/50">
                  <div className="h-5 w-32 bg-slate-700/50 rounded mb-4 skeleton-shimmer" />
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-slate-700/30 rounded skeleton-shimmer" />
                    <div className="h-4 w-5/6 bg-slate-700/30 rounded skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            result && <ResultDisplay content={result} />
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
