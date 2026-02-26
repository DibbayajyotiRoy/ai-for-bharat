"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, X, Clipboard, Brain, Globe, History } from 'lucide-react';
import { ResultDisplay } from '@/components/copilot/ResultDisplay';
import { QuizDisplay } from '@/components/copilot/QuizDisplay';
import { ChatHistory } from '@/components/copilot/ChatHistory';
import { AuthModal } from '@/components/copilot/AuthModal';
import { UserMenu } from '@/components/copilot/UserMenu';
import { ProfilePrompt } from '@/components/copilot/ProfilePrompt';
import { CreateProfileButton } from '@/components/copilot/CreateProfileButton';
import type { QuizData } from '@/lib/ai/quiz';
import { LANGUAGE_NAMES, LANGUAGE_SHORT, type SupportedLanguage } from '@/lib/ai/translation';
import { shouldUseAnimation } from '@/lib/ai/animation';
import type { AnimationData } from '@/lib/ai/animation';
import { getActiveUser, getAllProfiles, createProfile, deleteProfile, setActiveUser, logout, type UserProfile } from '@/lib/auth';

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
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  // Animation state
  const [animationData, setAnimationData] = useState<AnimationData | null>(null);
  const [isLoadingAnimation, setIsLoadingAnimation] = useState(false);

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

  // ── Auth initialization ───────────────────────────────────────────────────
  useEffect(() => {
    const user = getActiveUser();
    const allProfiles = getAllProfiles();
    
    setProfiles(allProfiles);
    
    if (user) {
      setCurrentUser(user);
    }
    // Don't show auth modal on first load - let user explore
  }, []);

  // ── Track questions asked for prompting profile creation ──────────────────
  useEffect(() => {
    if (!currentUser && result && !isLoading) {
      const count = questionsAsked + 1;
      setQuestionsAsked(count);
      
      // Show prompt only after 5 questions (less annoying)
      if (count === 5) {
        setShowProfilePrompt(true);
      }
    }
  }, [result, isLoading]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  // ── Auth handlers ─────────────────────────────────────────────────────────
  const handleCreateProfile = (name: string) => {
    const newProfile = createProfile(name);
    setActiveUser(newProfile.id);
    setCurrentUser(newProfile);
    setProfiles(getAllProfiles());
    setQuestionsAsked(0);
    setShowProfilePrompt(false);
  };

  const handleSelectProfile = (userId: string) => {
    setActiveUser(userId);
    const user = getActiveUser();
    setCurrentUser(user);
    setQuestionsAsked(0);
    setShowProfilePrompt(false);
  };

  const handleDeleteProfile = (userId: string) => {
    deleteProfile(userId);
    setProfiles(getAllProfiles());
    
    // If deleted current user, logout
    if (currentUser?.id === userId) {
      setCurrentUser(null);
      setShowAuthModal(false);
      setQuestionsAsked(0);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setShowAuthModal(false);
    setResult('');
    setInput('');
    setQuestionsAsked(0);
    setShowProfilePrompt(false);
  };

  const handleSwitchProfile = () => {
    setShowAuthModal(true);
  };

  const dismissProfilePrompt = () => {
    setShowProfilePrompt(false);
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
    setAnimationData(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input, level, mode, userId: currentUser?.id || 'anonymous' }),
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

      // Check if we should generate animation
      if (shouldUseAnimation(input)) {
        generateAnimationForQuery(input);
      }

    } catch (error) {
      console.error('Error fetching explanation:', error);
      setResult('**Error:** Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnimationForQuery = async (query: string) => {
    setIsLoadingAnimation(true);
    try {
      // Extract concept and operation from query
      const concept = extractConcept(query);
      const operation = extractOperation(query);

      const res = await fetch('/api/animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, operation, level }),
      });

      if (!res.ok) throw new Error('Animation generation failed');
      
      const data = await res.json();
      setAnimationData(data.animation);
      console.log('[Animation] Generated successfully');
    } catch (error) {
      console.error('[Animation] Failed:', error);
      // Silently fail - animation is optional
    } finally {
      setIsLoadingAnimation(false);
    }
  };

  const extractConcept = (query: string): string => {
    const concepts = [
      'binary tree', 'linked list', 'array', 'stack', 'queue', 'tree', 'graph', 
      'hash table', 'binary search tree', 'heap', 'trie', 'avl tree'
    ];
    const queryLower = query.toLowerCase();
    return concepts.find(c => queryLower.includes(c)) || 'data structure';
  };

  const extractOperation = (query: string): string => {
    const operations = ['insert', 'delete', 'search', 'traverse', 'sort', 'push', 'pop', 'enqueue', 'dequeue'];
    const queryLower = query.toLowerCase();
    const foundOp = operations.find(op => queryLower.includes(op));
    
    // If no operation found, use "structure" for structural queries
    return foundOp || 'structure visualization';
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
    <main className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 md:p-8 relative overflow-hidden bg-background text-foreground transition-colors duration-500 font-sans">

      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-40 dark:opacity-20">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-secondary/30 rounded-full blur-[100px]" />
      </div>

      <div className={`z-10 w-full flex flex-col items-center transition-all duration-500 ${result ? 'max-w-full sm:max-w-[95vw] min-h-screen sm:h-[95vh] justify-start pt-4 sm:pt-8 pb-20 sm:pb-8' : 'max-w-4xl justify-center'}`}>

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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-foreground tracking-tight leading-tight mb-3 sm:mb-4 font-serif px-4">
            Explain concepts.<br />Not yourself.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto font-light px-4">
            Paste code, text, or a concept. Get a structured explanation instantly.
          </p>
          
          {/* GitHub Star CTA */}
          <motion.a
            href="https://github.com/DibbayajyotiRoy/ai-for-bharat"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 mt-4 sm:mt-6 px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 text-white rounded-full text-xs sm:text-sm font-medium hover:from-gray-700 hover:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 group"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="hidden xs:inline">Star on GitHub</span>
            <span className="xs:hidden">Star</span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </motion.a>
        </motion.div>

        {/* Input Area */}
        <motion.div layout className="w-full max-w-2xl relative group">
          {/* Advanced Mode Glow */}
          <div className={`absolute -inset-[1px] rounded-xl transition-opacity duration-500 ${level === 'Advanced' ? 'bg-gradient-to-r from-primary/30 to-accent/30 opacity-100' : 'opacity-0'} blur-sm`} />

          <div className="relative glass-card rounded-xl p-1 shadow-2xl ring-1 ring-border/50">
            <div className="relative">
              <textarea
                className="w-full h-32 sm:h-40 bg-card/50 text-foreground placeholder-muted-foreground/60 p-3 sm:p-5 resize-none focus:outline-none text-base sm:text-lg leading-relaxed font-sans glass-input rounded-lg selection:bg-primary/20"
                placeholder="Paste 'Race Condition' or code..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleExplain(); }}
              />

              {/* Quick Actions */}
              <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex space-x-1">
                {input && (
                  <button onClick={() => setInput('')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors" title="Clear">
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
                <button onClick={handlePaste} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-md transition-colors" title="Paste from Clipboard">
                  <Clipboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Detected code language tag */}
              {detectedLang && (
                <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  {detectedLang}
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-2 pb-2 pt-3 border-t border-border/20 mt-1 gap-2">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">

                {/* Skill Level */}
                <div className="flex space-x-1 bg-muted/40 p-0.5 sm:p-1 rounded-lg border border-border/20">
                  {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setLevel(lvl)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${level === lvl ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                      {lvl === 'Beginner' ? 'Begin' : lvl === 'Intermediate' ? 'Inter' : 'Adv'}
                    </button>
                  ))}
                </div>

                {/* Mode Toggle */}
                <div className="flex space-x-1 bg-muted/40 p-0.5 sm:p-1 rounded-lg border border-border/20">
                  {(['normal', 'agent'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                    >
                      {m === 'normal' ? '📝' : '🔍'}
                      <span className="hidden sm:inline ml-1">{m === 'normal' ? 'Normal' : 'Research'}</span>
                    </button>
                  ))}
                </div>

                {/* Language Selector */}
                <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/40 p-0.5 sm:p-1 rounded-lg border border-border/20">
                  <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground ml-0.5 sm:ml-1 flex-shrink-0" />
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      title={LANGUAGE_NAMES[lang]}
                      className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all ${language === lang ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
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
                className={`w-full sm:w-auto flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg font-semibold text-sm transition-all shadow-md ${isLoading || !input.trim() ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border' : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg active:scale-95'}`}
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
                animationData={animationData ?? undefined}
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
      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2">
        {/* User Menu or Create Profile Button */}
        {currentUser ? (
          <UserMenu
            user={currentUser}
            onLogout={handleLogout}
            onSwitchProfile={handleSwitchProfile}
          />
        ) : (
          <CreateProfileButton onClick={() => setShowAuthModal(true)} />
        )}

        {/* History Button - only show if logged in */}
        {currentUser && (
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-card/50 backdrop-blur border border-border/50 rounded-full text-foreground hover:bg-muted/50 transition-all shadow-sm text-xs sm:text-sm"
            title="Chat History"
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline text-xs font-medium">History</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-card/50 backdrop-blur border border-border/50 rounded-full text-foreground hover:bg-muted/50 transition-all shadow-sm"
        >
          {theme === 'light' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" className="sm:w-4 sm:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
          )}
          <span className="text-xs font-medium hidden md:inline">{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {/* Profile Creation Prompt - shows after 2 questions */}
      <ProfilePrompt
        isOpen={showProfilePrompt}
        onClose={dismissProfilePrompt}
        onCreateProfile={handleCreateProfile}
        questionsAsked={questionsAsked}
      />

      {/* Auth Modal - for profile selection/creation */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* Chat History Sidebar */}
      {currentUser && (
        <ChatHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          userId={currentUser.id}
          onSelectChat={handleSelectChat}
        />
      )}
    </main>
  );
}
