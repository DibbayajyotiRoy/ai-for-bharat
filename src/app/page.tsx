"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, X, Clipboard, Brain, Globe, History, ImagePlus, Route, BookOpen, Code, Rocket, Hammer, FileText, Search } from 'lucide-react';
import { ResultDisplay } from '@/components/copilot/ResultDisplay';
import { QuizDisplay } from '@/components/copilot/QuizDisplay';
import { ChatHistory } from '@/components/copilot/ChatHistory';
import { AuthModal } from '@/components/copilot/AuthModal';
import { UserMenu } from '@/components/copilot/UserMenu';
import { ProfilePrompt } from '@/components/copilot/ProfilePrompt';
import { CreateProfileButton } from '@/components/copilot/CreateProfileButton';
import { ImageViewer } from '@/components/copilot/ImageViewer';
import { ImprovedSkeleton } from '@/components/copilot/ImprovedSkeleton';
import type { QuizData } from '@/lib/ai/quiz';
import { LANGUAGE_NAMES, LANGUAGE_SHORT, type SupportedLanguage } from '@/lib/ai/translation';
import { shouldUseAnimation } from '@/lib/ai/animation';
import type { AnimationData } from '@/lib/ai/animation';
import type { LearningPath } from '@/lib/ai/learning-path';
import { getActiveUser, getAllProfiles, createProfile, deleteProfile, setActiveUser, logout, type UserProfile } from '@/lib/auth';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'bn', 'mr'];

const SAMPLE_QUERIES = [
  { label: 'React Hooks', query: 'React hooks', icon: '⚛️' },
  { label: 'Binary Search', query: 'Binary search algorithm', icon: '🔍' },
  { label: 'REST vs GraphQL', query: 'REST API vs GraphQL', icon: '🌐' },
  { label: 'Python Decorators', query: 'Python decorators', icon: '🐍' },
];

const STEP_TYPE_ICONS: Record<string, typeof BookOpen> = {
  prerequisite: BookOpen,
  core: Sparkles,
  practice: Code,
  advanced: Rocket,
  project: Hammer,
};

export default function Home() {
  const [input, setInput] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [mode, setMode] = useState<'normal' | 'agent'>('normal');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  // Multilingual state
  const [language, setLanguage] = useState<SupportedLanguage>('en');

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

  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Follow-up questions state
  const [followUpQuestions, setFollowUpQuestions] = useState<Array<{ question: string; category: string }>>([]);

  // Learning path state
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [showLearningPath, setShowLearningPath] = useState(false);

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

  // ── System theme preference + PWA service worker ───────────────────────
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { });
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

  // ── Image Upload ─────────────────────────────────────────────────────────
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setUploadedImage({
        base64,
        mimeType: file.type,
        preview: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

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
    if (!input.trim() && !uploadedImage) return;
    const submittedQuery = input.trim();
    setLastQuery(submittedQuery);
    setInput('');
    setIsLoading(true);
    setResult('');
    // Reset derivative state for each new query
    setShowQuiz(false);
    setQuizData(null);
    setAnimationData(null);
    setFollowUpQuestions([]);
    setLearningPath(null);
    setShowLearningPath(false);
    // Scroll results area to top
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      // Image mode: use multimodal endpoint
      if (uploadedImage) {
        const response = await fetch('/api/explain-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: uploadedImage.base64,
            mimeType: uploadedImage.mimeType,
            query: submittedQuery || undefined,
            level,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const fullResult = data.explanation;
        setResult(fullResult);

        // Fetch follow-up questions in background
        fetchFollowUpQuestions(submittedQuery || 'this image', fullResult);

        setUploadedImage(null);
      } else {
        // Text mode: stream explanation with language support
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: submittedQuery,
            level,
            mode,
            userId: currentUser?.id || 'anonymous',
            language // Pass language to API for direct translation
          }),
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

        // Fetch follow-up questions in background
        fetchFollowUpQuestions(submittedQuery, fullResult);

        // Check if we should generate animation
        if (shouldUseAnimation(submittedQuery)) {
          generateAnimationForQuery(submittedQuery);
        }
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

  // ── Follow-up questions (fire-and-forget after explanation) ─────────────
  const fetchFollowUpQuestions = (query: string, explanation: string) => {
    fetch('/api/follow-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, explanation: explanation.substring(0, 500), level }),
    })
      .then(r => r.json())
      .then(d => setFollowUpQuestions(d.questions || []))
      .catch(() => { });
  };

  // ── Learning Path ─────────────────────────────────────────────────────
  const handleGenerateLearningPath = async () => {
    const topic = lastQuery || input.trim();
    if (!topic) return;
    setIsLoadingPath(true);
    setShowLearningPath(false);
    setLearningPath(null);
    try {
      const res = await fetch('/api/learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLearningPath(data.path);
      setShowLearningPath(true);
    } catch (err) {
      console.error('[LearningPath] Failed:', err);
    } finally {
      setIsLoadingPath(false);
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
    <main className="h-screen flex flex-col bg-background text-foreground transition-colors duration-500 font-sans">

      {/* Compact App Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-foreground">Learning Copilot</span>
            </div>
          </div>

          {/* Coming Soon Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 justify-center overflow-x-auto scrollbar-hide">
            <a
              href="https://github.com/DibbayajyotiRoy/ai-for-bharat/tree/main/vscode-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-md transition-colors cursor-not-allowed flex-shrink-0"
            >
              <Code className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground hidden sm:inline">VS Code</span>
              <span className="text-[9px] px-1 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded font-semibold">SOON</span>
            </a>

            <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-md cursor-not-allowed flex-shrink-0">
              <svg className="w-3 h-3 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.98 1.26-5.46 3.6-.51.35-.97.52-1.38.51-.45-.01-1.31-.26-1.94-.47-.78-.26-1.4-.4-1.35-.85.03-.24.36-.48 1-.74 3.93-1.7 6.55-2.82 7.84-3.35 3.74-1.53 4.51-1.8 5.01-1.8.11 0 .35.03.48.14.11.09.14.22.15.34.01.1-.01.24-.03.4z" /></svg>
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground hidden sm:inline">Telegram</span>
              <span className="text-[9px] px-1 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded font-semibold">SOON</span>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 bg-muted/30 rounded-md cursor-not-allowed flex-shrink-0">
              <svg className="w-3 h-3 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793 0-.853.448-1.273.607-1.446.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.098.824zM20.056 3.93C17.91 1.782 15.056.6 12.037.6 5.866.6.845 5.626.845 11.8c0 2.072.569 4.095 1.636 5.832l-2.071 7.425 7.643-1.956c1.696.953 3.655 1.458 5.989 1.458 6.173 0 11.206-5.029 11.209-11.209.001-3.003-1.168-5.83-3.195-7.42z" /></svg>
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground hidden sm:inline">WhatsApp</span>
              <span className="text-[9px] px-1 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded font-semibold">SOON</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* GitHub Star Button */}
            <a
              href="https://github.com/DibbayajyotiRoy/ai-for-bharat"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 text-white rounded-md text-xs font-medium hover:from-gray-700 hover:to-gray-800 transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>Star</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </a>

            {currentUser && (
              <button
                onClick={() => setShowHistory(true)}
                className="p-1.5 sm:p-2 hover:bg-muted/50 rounded-lg transition-colors"
                title="Chat History"
              >
                <History className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 hover:bg-muted/50 rounded-lg transition-colors"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground hover:text-foreground"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground hover:text-foreground"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
              )}
            </button>

            {currentUser ? (
              <UserMenu
                user={currentUser}
                onLogout={handleLogout}
                onSwitchProfile={handleSwitchProfile}
              />
            ) : (
              <CreateProfileButton onClick={() => setShowAuthModal(true)} />
            )}
          </div>
        </div>
      </nav>

      {/* Main Layout: Results + Bottom Input */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Results Area - Scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2">

            {/* Welcome Header - Only show when no result */}
            {!result && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center min-h-[60vh]"
              >
                <div className="text-center max-w-3xl">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight mb-3 font-serif">
                    Explain concepts.<br className="sm:hidden" /> Not yourself.
                  </h1>
                  <p className="text-muted-foreground text-base sm:text-lg mb-8">
                    Ask anything. Get structured explanations instantly.
                  </p>

                  {/* Centered Input Box (when no results) */}
                  <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative bg-card border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                      <textarea
                        ref={(el) => { if (el && !result) el.focus(); }}
                        className="w-full bg-transparent text-foreground placeholder-muted-foreground/60 p-4 pr-32 resize-none focus:outline-none text-base leading-relaxed font-sans rounded-2xl"
                        placeholder="Ask anything..."
                        value={input}
                        rows={1}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleExplain();
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files[0];
                          if (file?.type.startsWith('image/')) handleImageUpload(file);
                        }}
                        style={{ minHeight: '52px', maxHeight: '120px' }}
                      />

                      {/* Right Side Controls */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {input && (
                          <button onClick={() => setInput('')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors" title="Clear">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={handlePaste} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors" title="Paste">
                          <Clipboard className="w-4 h-4" />
                        </button>
                        <label className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors cursor-pointer" title="Upload Image">
                          <ImagePlus className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                          />
                        </label>
                        <button
                          onClick={handleExplain}
                          disabled={isLoading || (!input.trim() && !uploadedImage)}
                          className={`ml-1 p-2 rounded-xl font-semibold transition-all ${isLoading || (!input.trim() && !uploadedImage) ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-95'}`}
                          title="Send (Enter)"
                        >
                          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Image Preview */}
                      {uploadedImage && (
                        <div className="absolute bottom-full left-2 mb-2 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 cursor-pointer hover:bg-primary/20 transition-colors"
                          onClick={() => setShowImageViewer(true)}
                        >
                          <img src={uploadedImage.preview} alt="Upload" className="w-6 h-6 rounded object-cover" />
                          <span className="text-xs text-primary font-medium">Image</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setUploadedImage(null); setShowImageViewer(false); }}
                            className="p-0.5 text-primary/60 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Compact Controls Row */}
                    <div className="flex items-center justify-center gap-3 mt-3">
                      {/* Level */}
                      <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                        {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            onClick={() => setLevel(lvl)}
                            className={`relative group px-2 py-1 rounded text-[10px] font-medium transition-all ${level === lvl ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {lvl[0]}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] font-medium bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{lvl}</span>
                          </button>
                        ))}
                      </div>

                      {/* Mode */}
                      <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                        {(['normal', 'agent'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`relative group p-1 rounded transition-all ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {m === 'normal' ? <FileText className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] font-medium bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{m === 'normal' ? 'Normal Mode' : 'Research Mode'}</span>
                          </button>
                        ))}
                      </div>

                      {/* Language */}
                      <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                        <Globe className="w-3 h-3 text-muted-foreground ml-1" />
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setLanguage(lang)}
                            className={`relative group px-1.5 py-1 rounded text-[10px] font-medium transition-all ${language === lang ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                          >
                            {LANGUAGE_SHORT[lang]}
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] font-medium bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{LANGUAGE_NAMES[lang]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sample Queries */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {SAMPLE_QUERIES.map((sq) => (
                      <button
                        key={sq.query}
                        onClick={() => setInput(sq.query)}
                        className="px-4 py-2 text-sm bg-card border border-border/50 rounded-full text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                      >
                        {sq.icon} {sq.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Loading State */}
            <AnimatePresence mode="wait">
              {isLoading && <ImprovedSkeleton />}
            </AnimatePresence>

            {/* Results */}
            <AnimatePresence mode="wait">
              {!isLoading && result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pb-2"
                >
                  {/* Main Explanation */}
                  <ResultDisplay
                    content={result}
                    theme={theme}
                    animationData={animationData ?? undefined}
                    isLoadingAnimation={isLoadingAnimation}
                    language={language}
                  />

                  {/* Follow-up Questions */}
                  {followUpQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center py-2 mt-2">
                      {followUpQuestions.map((fq, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(fq.question); setFollowUpQuestions([]); }}
                          className="px-4 py-2 text-sm bg-card border border-border rounded-full hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground/80 hover:text-foreground"
                        >
                          {fq.category === 'deeper' ? '🔬' : fq.category === 'practical' ? '🛠️' : '🔗'} {fq.question}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active Learning Buttons */}
                  {!showQuiz && (
                    <div className="flex flex-wrap justify-center gap-2 py-2">
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
                      <button
                        onClick={handleGenerateLearningPath}
                        disabled={isLoadingPath}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border transition-all shadow-sm ${isLoadingPath ? 'bg-muted text-muted-foreground border-border cursor-not-allowed' : 'bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-md active:scale-95'}`}
                      >
                        {isLoadingPath
                          ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Path...</>
                          : <><Route className="w-4 h-4 text-primary" />Learning Path</>
                        }
                      </button>
                    </div>
                  )}

                  {/* Quiz Display */}
                  {showQuiz && quizData && (
                    <QuizDisplay quiz={quizData} onClose={() => setShowQuiz(false)} userId={currentUser?.id} />
                  )}

                  {/* Learning Path */}
                  {showLearningPath && learningPath && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full max-w-2xl mx-auto bg-card border border-border rounded-xl p-6 shadow-sm mt-4"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Route className="w-5 h-5 text-primary" />
                          Learning Path: {learningPath.topic}
                        </h3>
                        <button onClick={() => setShowLearningPath(false)} className="p-1 text-muted-foreground hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-0">
                        {learningPath.steps.map((step, i) => {
                          const StepIcon = STEP_TYPE_ICONS[step.type] || BookOpen;
                          return (
                            <div key={i} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                                  <StepIcon className="w-4 h-4 text-primary" />
                                </div>
                                {i < learningPath.steps.length - 1 && (
                                  <div className="w-0.5 h-full bg-border/50 my-1" />
                                )}
                              </div>
                              <div className="pb-6 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-primary uppercase">{step.type}</span>
                                  <span className="text-xs text-muted-foreground">{step.estimatedTime}</span>
                                </div>
                                <h4 className="font-semibold text-foreground text-sm">{step.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                                {step.resources.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {step.resources.map((r, j) => (
                                      <span key={j} className="text-[10px] px-2 py-0.5 bg-muted/50 border border-border/30 rounded-full text-muted-foreground">{r}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Input Area - Sticky Bottom (only show when results exist) */}
        {(result || isLoading) && (
          <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="max-w-5xl mx-auto px-2 sm:px-4 py-3">
              <div className="relative">
                {/* Compact Input */}
                <div className="relative bg-card border border-border/50 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                  <textarea
                    className="w-full bg-transparent text-foreground placeholder-muted-foreground/60 p-3 sm:p-4 pr-32 resize-none focus:outline-none text-sm sm:text-base leading-relaxed font-sans rounded-2xl"
                    placeholder="Ask anything..."
                    value={input}
                    rows={1}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleExplain();
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file?.type.startsWith('image/')) handleImageUpload(file);
                    }}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />

                  {/* Right Side Controls */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {input && (
                      <button onClick={() => setInput('')} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors" title="Clear">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={handlePaste} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors" title="Paste">
                      <Clipboard className="w-4 h-4" />
                    </button>
                    <label className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors cursor-pointer" title="Upload Image">
                      <ImagePlus className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                      />
                    </label>
                    <button
                      onClick={handleExplain}
                      disabled={isLoading || (!input.trim() && !uploadedImage)}
                      className={`ml-1 p-2 rounded-xl font-semibold transition-all ${isLoading || (!input.trim() && !uploadedImage) ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-95'}`}
                      title="Send (Enter)"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Image Preview */}
                  {uploadedImage && (
                    <div className="absolute bottom-full left-2 mb-2 flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-2 py-1 cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => setShowImageViewer(true)}
                    >
                      <img src={uploadedImage.preview} alt="Upload" className="w-6 h-6 rounded object-cover" />
                      <span className="text-xs text-primary font-medium">Image</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadedImage(null); setShowImageViewer(false); }}
                        className="p-0.5 text-primary/60 hover:text-primary rounded-full hover:bg-primary/10 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Compact Controls Row */}
                <div className="flex items-center justify-between mt-2 px-1">
                  <div className="flex items-center gap-2">
                    {/* Level */}
                    <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                      {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setLevel(lvl)}
                          className={`relative group px-2 py-1 rounded text-[10px] font-medium transition-all ${level === lvl ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {lvl[0]}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] font-medium bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{lvl}</span>
                        </button>
                      ))}
                    </div>

                    {/* Mode */}
                    <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                      {(['normal', 'agent'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`relative group p-1 rounded transition-all ${mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {m === 'normal' ? <FileText className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] font-medium bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{m === 'normal' ? 'Normal Mode' : 'Research Mode'}</span>
                        </button>
                      ))}
                    </div>

                    {/* Language */}
                    <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                      <Globe className="w-3 h-3 text-muted-foreground ml-1" />
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`relative group px-1.5 py-1 rounded text-[10px] font-medium transition-all ${language === lang ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {LANGUAGE_SHORT[lang]}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 text-[10px] font-medium bg-foreground text-background rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">{LANGUAGE_NAMES[lang]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keyboard Hint */}
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                    <kbd className="px-2 py-0.5 bg-muted border border-border rounded text-[10px]">Enter</kbd>
                    <span>to send</span>
                    <span className="text-border">•</span>
                    <kbd className="px-2 py-0.5 bg-muted border border-border rounded text-[10px]">Shift+Enter</kbd>
                    <span>new line</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Image Viewer Modal */}
      <ImageViewer
        isOpen={showImageViewer}
        imageUrl={uploadedImage?.preview || null}
        onClose={() => setShowImageViewer(false)}
      />
    </main>
  );
}
