"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, X, Clipboard, Brain, Globe, History } from 'lucide-react';
import { ResultDisplay } from '@/components/copilot/ResultDisplay';
import { QuizDisplay } from '@/components/copilot/QuizDisplay';
import { ChatHistory } from '@/components/copilot/ChatHistory';
import type { QuizData } from '@/lib/ai/quiz';
import { LANGUAGE_NAMES, LANGUAGE_SHORT, type SupportedLanguage } from '@/lib/ai/translation';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'bn', 'mr'];

export default function Home() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [mode, setMode] = useState<'normal' | 'agent'>('normal');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  // Multilingual state
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [viewMode, setViewMode] = useState<'source' | 'translated'>('source');
  const [translatedSections, setTranslatedSections] = useState<{ mentalModel: string; takeaways: string } | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Quiz state
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);

  // Chat history state
  const [showHistory, setShowHistory] = useState(false);
  const [userId] = useState('demo-user'); // In production, use real auth

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // ── Code language detection ───────────────────────────────────────────────
  useEffect(() => {
    if (!input) { setDetectedLang(null); return; }
    const codePatterns: Record<string, string[]> = {
      'Python': ['def ', 'import ', 'print('],
      'JavaScript': ['const ', 'function ', '=>', 'console.log'],
      'Rust': ['fn ', 'let mut ', 'impl '],
      'HTML': ['<div', '<html>', '<body>'],
    };
    for (const [lang, patterns] of Object.entries(codePatterns)) {
      if (patterns.some(p => input.includes(p))) { setDetectedLang(lang); return; }
    }
    setDetectedLang('Text');
  }, [input]);

  // ── System theme preference ───────────────────────────────────────────────
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  // ── Translation ───────────────────────────────────────────────────────────
  const handleTranslate = useCallback(async (content: string, lang: SupportedLanguage) => {
    if (lang === 'en' || !content) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, targetLanguage: lang }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTranslatedSections(data.translated);
      setViewMode('translated');
    } catch (err) {
      console.error('[Translate] Failed:', err);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Auto-translate when language changes after result is ready
  useEffect(() => {
    if (language === 'en') {
      setTranslatedSections(null);
      setViewMode('source');
      return;
    }
    if (!result || isLoading) return;
    handleTranslate(result, language);
  // handleTranslate is stable (useCallback); intentionally excluding result/isLoading
  // to avoid re-translating on every streamed chunk — we translate once on language change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const handleGenerateQuiz = async () => {
    if (!result) return;
    setIsLoadingQuiz(true);
    setShowQuiz(false);
    setQuizData(null);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: result, level }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setQuizData(data.quiz);
      setShowQuiz(true);
    } catch (err) {
      console.error('[Quiz] Failed:', err);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // ── Explain ───────────────────────────────────────────────────────────────
  const handleExplain = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setResult('');
    // Reset derivative state for each new query
    setTranslatedSections(null);
    setViewMode('source');
    setShowQuiz(false);
    setQuizData(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input, level, mode, userId }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResult = '';
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        fullResult += chunk;
        setResult(fullResult);
      }

      // If a non-English language is already selected, translate after streaming ends
      if (language !== 'en' && fullResult) {
        handleTranslate(fullResult, language);
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

  const handleSelectChat = (item: any) => {
    setInput(item.query);
    setResult(item.response);
    setLevel(item.level);
    setMode(item.mode);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden bg-background text-foreground transition-colors duration-500 font-sans">

      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-40 dark:opacity-20">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-secondary/30 rounded-full blur-[100px]" />
      </div>

      <div className={`z-10 w-full flex flex-col items-center transition-all duration-500 ${result ? 'max-w-[95vw] h-[95vh] justify-start pt-8' : 'max-w-4xl justify-center'}`}>

        {/* Header — collapses when result is active */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: result ? 0 : 1,
            y: result ? -50 : 0,
            height: result ? 0 : 'auto',
            marginBottom: result ? 0 : 48
          }}
          className="text-center overflow-hidden"
        >
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 bg-muted/50 border border-border/50 rounded-full backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary mr-2" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Learning Copilot</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight leading-tight mb-4 font-serif">
            Explain concepts.<br />Not yourself.
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto font-light">
            Paste code, text, or a concept. Get a structured explanation instantly.
          </p>
        </motion.div>

        {/* Input Area */}
        <motion.div layout className="w-full max-w-2xl relative group">
          {/* Advanced Mode Glow */}
          <div className={`absolute -inset-[1px] rounded-xl transition-opacity duration-500 ${level === 'Advanced' ? 'bg-gradient-to-r from-primary/30 to-accent/30 opacity-100' : 'opacity-0'} blur-sm`} />

          <div className="relative glass-card rounded-xl p-1 shadow-2xl ring-1 ring-border/50">
            <div className="relative">
              <textarea
                className="w-full h-40 bg-card/50 text-foreground placeholder-muted-foreground/60 p-5 resize-none focus:outline-none text-lg leading-relaxed font-sans glass-input rounded-lg selection:bg-primary/20"
                placeholder="Paste 'Race Condition' or a code snippet here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleExplain(); }}
              />

              {/* Quick Actions */}
              <div className="absolute top-3 right-3 flex space-x-1">
                {input && (
                  <button onClick={() => setInput('')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors" title="Clear">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button onClick={handlePaste} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors" title="Paste from Clipboard">
                  <Clipboard className="w-4 h-4" />
                </button>
              </div>

              {/* Detected code language tag */}
              {detectedLang && (
                <div className="absolute bottom-3 right-3 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  {detectedLang}
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between px-2 pb-2 pt-3 border-t border-border/20 mt-1 gap-2">
              <div className="flex flex-wrap gap-2">

                {/* Skill Level */}
                <div className="flex space-x-1 bg-muted/40 p-1 rounded-lg border border-border/20">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${level === lvl ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Mode Toggle */}
                <div className="flex space-x-1 bg-muted/40 p-1 rounded-lg border border-border/20">
                  {(['normal', 'agent'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                      {m === 'normal' ? '📝 Normal' : '🔍 Research'}
                    </button>
                  ))}
                </div>

                {/* Language Selector */}
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/20">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground ml-1 flex-shrink-0" />
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      title={LANGUAGE_NAMES[lang]}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${language === lang ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                      {LANGUAGE_SHORT[lang]}
                    </button>
                  ))}
                </div>

              </div>

              {/* Explain Button */}
              <button
                onClick={handleExplain}
                disabled={isLoading || !input.trim()}
                className={`flex items-center px-6 py-2 rounded-lg font-semibold text-sm transition-all shadow-md ${isLoading || !input.trim() ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border' : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg active:scale-95'}`}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Thinking</>
                ) : (
                  <>Explain <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Keyboard hints */}
        <AnimatePresence>
          {!input && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-muted-foreground text-sm flex items-center"
            >
              <kbd className="px-2 py-1 bg-muted border border-border rounded text-muted-foreground text-xs mr-2">⌘ V</kbd>
              to paste
              <span className="mx-2 text-border">|</span>
              <kbd className="px-2 py-1 bg-muted border border-border rounded text-muted-foreground text-xs mr-2">⌘ Enter</kbd>
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
              className="w-full h-full flex flex-col gap-4 mt-12 max-w-[95vw]"
            >
              {/* Skeleton */}
              <div className="w-full bg-muted/20 border border-border/40 p-5 rounded-xl flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted skeleton-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 rounded bg-muted skeleton-shimmer" />
                  <div className="h-6 w-3/4 rounded bg-muted skeleton-shimmer" />
                </div>
              </div>
              <div className="flex-1 flex gap-4 min-h-[400px]">
                <div className="flex-1 rounded-xl bg-card/50 border border-border/40 p-4 space-y-4">
                  <div className="h-8 w-full rounded bg-muted/50 skeleton-shimmer" />
                  <div className="space-y-3 pt-4">
                    <div className="h-4 w-full rounded bg-muted skeleton-shimmer" />
                    <div className="h-4 w-5/6 rounded bg-muted skeleton-shimmer" />
                    <div className="h-4 w-4/6 rounded bg-muted skeleton-shimmer" />
                  </div>
                </div>
                <div className="flex-1 rounded-xl bg-card/50 border border-border/40 p-4 flex items-center justify-center">
                  <div className="h-32 w-32 rounded-full bg-muted/50 skeleton-shimmer" />
                </div>
              </div>
            </motion.div>
          ) : result ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full flex flex-col gap-3 mt-4 overflow-y-auto pb-8"
            >
              {/* Language / View Toggle Bar — shown when a non-English language is selected */}
              {language !== 'en' && (
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    View in:
                  </span>
                  <div className="flex space-x-1 bg-muted/40 p-1 rounded-lg border border-border/20">
                    <button
                      onClick={() => setViewMode('source')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === 'source' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Source (English)
                    </button>
                    <button
                      onClick={() => {
                        if (translatedSections) {
                          setViewMode('translated');
                        } else {
                          handleTranslate(result, language);
                        }
                      }}
                      disabled={isTranslating}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${viewMode === 'translated' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} disabled:opacity-50`}
                    >
                      {isTranslating
                        ? <><Loader2 className="w-3 h-3 animate-spin" />Translating...</>
                        : <>Translated ({LANGUAGE_NAMES[language]})</>
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Main Explanation */}
              <ResultDisplay
                content={result}
                theme={theme}
                translatedSections={translatedSections ?? undefined}
                viewMode={viewMode}
              />

              {/* Active Learning — Quiz Section */}
              {!showQuiz ? (
                <div className="flex justify-center pt-2 pb-4">
                  <button
                    onClick={handleGenerateQuiz}
                    disabled={isLoadingQuiz}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all shadow-sm ${isLoadingQuiz ? 'bg-muted text-muted-foreground border-border cursor-not-allowed' : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-95'}`}
                  >
                    {isLoadingQuiz
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Quiz...</>
                      : <><Brain className="w-4 h-4 text-primary" />Test My Knowledge</>
                    }
                  </button>
                </div>
              ) : quizData ? (
                <QuizDisplay quiz={quizData} onClose={() => setShowQuiz(false)} />
              ) : null}

            </motion.div>
          ) : null}
        </AnimatePresence>

      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* History Button */}
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur border border-border/50 rounded-full text-foreground hover:bg-muted/50 transition-all shadow-sm"
          title="Chat History"
        >
          <History className="w-4 h-4" />
          <span className="text-xs font-medium hidden md:inline">History</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur border border-border/50 rounded-full text-foreground hover:bg-muted/50 transition-all shadow-sm"
        >
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          )}
          <span className="text-xs font-medium hidden md:inline">{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Chat History Sidebar */}
      <ChatHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        userId={userId}
        onSelectChat={handleSelectChat}
      />
    </main>
  );
}
