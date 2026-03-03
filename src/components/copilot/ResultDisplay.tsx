"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualPanel } from './VisualPanel';
import { AnimationPlayer } from './AnimationPlayer';
import type { AnimationData } from '@/lib/ai/animation';
import { Check, ChevronDown, ChevronUp, Copy, BookOpen, ExternalLink, Shield, AlertCircle, Image as ImageIcon, Volume2, Loader2, Play, Code } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CodePlayground } from './CodePlayground';

interface ResultDisplayProps {
    content: string;
    theme: 'light' | 'dark';
    animationData?: AnimationData;
    isLoadingAnimation?: boolean;
    language?: string;
}

interface Source {
    title: string;
    url: string;
    summary: string;
    credibility: 'high' | 'medium' | 'low';
}

const CREDIBILITY_CONFIG = {
    high: { icon: Shield, color: 'text-green-500', label: 'Verified' },
    medium: { icon: AlertCircle, color: 'text-yellow-500', label: 'Community' },
    low: { icon: AlertCircle, color: 'text-orange-400', label: 'Unverified' },
};

function renderCitations(text: string, sources: Source[]): React.ReactNode[] {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
            const idx = parseInt(match[1]) - 1;
            const source = sources[idx];
            if (source) {
                return (
                    <a
                        key={i}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-5 h-5 ml-0.5 mr-0.5 text-[10px] font-bold bg-primary/15 text-primary rounded-full hover:bg-primary/25 transition-colors cursor-pointer no-underline align-super"
                        title={`${source.title}: ${source.summary}`}
                    >
                        {match[1]}
                    </a>
                );
            }
        }
        return <span key={i}>{part}</span>;
    });
}

function TTSButton({ text, language = 'en' }: { text: string; language?: string }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Only show TTS for English — Polly Indian language voices are unreliable
    if (language !== 'en') return null;

    const handleSpeak = async () => {
        if (isPlaying || !text) return;
        setIsPlaying(true);
        setHasError(false);
        try {
            const res = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.substring(0, 500), language }),
            });
            if (!res.ok) throw new Error('TTS failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
            audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
            await audio.play();
        } catch {
            setIsPlaying(false);
            setHasError(true);
            setTimeout(() => setHasError(false), 2000);
        }
    };
    return (
        <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); handleSpeak(); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSpeak(); }}
            className={`p-1 cursor-pointer transition-colors ${hasError ? 'text-red-500' : 'text-muted-foreground hover:text-primary'}`}
            title={hasError ? 'TTS failed' : 'Listen'}
        >
            {isPlaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
        </span>
    );
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <span
            role="button"
            tabIndex={0}
            onClick={handleCopy}
            className="p-1 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
            title="Copy"
        >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </span>
    );
}

function InteractiveCodeBlock({ language, code, theme, isRunnable, restProps }: {
    language: string; code: string; theme: 'light' | 'dark'; isRunnable: boolean; restProps: any;
}) {
    const [interactive, setInteractive] = useState(false);
    return (
        <div className="relative group my-3 rounded-lg overflow-hidden border border-border/50 border-l-[3px] border-l-primary/40 shadow-sm not-prose">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/80 backdrop-blur border-b border-border/50">
                <span className="text-xs font-mono text-muted-foreground font-semibold">{language}</span>
                <div className="flex items-center gap-2">
                    {isRunnable && (
                        <button
                            className={`text-xs transition-colors flex items-center gap-1.5 font-medium ${interactive ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                            onClick={() => setInteractive(!interactive)}
                        >
                            <Play className="w-3.5 h-3.5" /> {interactive ? 'Static' : 'Run'}
                        </button>
                    )}
                    <button
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-medium"
                        onClick={() => navigator.clipboard.writeText(code)}
                    >
                        <Copy className="w-3.5 h-3.5" /> Copy
                    </button>
                </div>
            </div>
            {interactive ? (
                <CodePlayground code={code} language={language} theme={theme} />
            ) : (
                <SyntaxHighlighter
                    {...restProps}
                    style={theme === 'dark' ? oneDark : oneLight}
                    language={language}
                    PreTag="div"
                    showLineNumbers
                    lineNumberStyle={{ color: theme === 'dark' ? '#3f3f46' : '#d4d4d8', fontSize: '0.7rem', minWidth: '2em', paddingRight: '0.75em' }}
                    customStyle={{
                        margin: 0, borderRadius: 0,
                        background: theme === 'dark' ? '#09090b' : '#fafafa',
                        fontSize: '0.8125rem', lineHeight: '1.5', padding: '1rem'
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            )}
        </div>
    );
}

export function ResultDisplay({ content, theme, animationData, isLoadingAnimation, language }: ResultDisplayProps) {
    const { sections, sources } = parseSections(content);
    const [activeTab, setActiveTab] = useState<'explanation' | 'example'>('explanation');
    const [isTakeawaysExpanded, setIsTakeawaysExpanded] = useState(true);
    const [areSourcesExpanded, setAreSourcesExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mx-auto space-y-2 px-2 sm:px-0"
        >
            {/* 1. MENTAL MODEL - Compact Hero Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 shadow-lg"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="text-lg">🧠</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                            <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider">Mental Model</h3>
                            <TTSButton text={sections.mentalModel} language={language || 'en'} />
                            <CopyButton text={sections.mentalModel} />
                        </div>
                        <p className="text-foreground text-sm font-medium leading-relaxed">
                            {sections.mentalModel || "Understanding the concept..."}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* 2. MAIN CONTENT - Two Column on Desktop */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-2"
            >
                {/* Left: Explanation with Tabs */}
                <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                    {/* Tab Bar */}
                    {sections.example && (
                        <div className="flex border-b border-border/50">
                            <button
                                onClick={() => setActiveTab('explanation')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'explanation' ? 'text-foreground border-b-2 border-primary bg-muted/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                <BookOpen className="w-3.5 h-3.5" /> Explanation
                            </button>
                            <button
                                onClick={() => setActiveTab('example')}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'example' ? 'text-foreground border-b-2 border-primary bg-muted/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'}`}
                            >
                                <Code className="w-3.5 h-3.5" /> Example
                            </button>
                        </div>
                    )}

                    {/* Tab Content */}
                    {(activeTab === 'explanation' || !sections.example) && (
                        <div className="p-3">
                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                                <ReactMarkdown
                                    components={{
                                        p({ children }) {
                                            const text = typeof children === 'string' ? children : '';
                                            if (text && /\[\d+\]/.test(text)) {
                                                return <p>{renderCitations(text, sources)}</p>;
                                            }
                                            return <p>{children}</p>;
                                        },
                                        li({ children }) {
                                            const text = typeof children === 'string' ? children : '';
                                            if (text && /\[\d+\]/.test(text)) {
                                                return <li>{renderCitations(text, sources)}</li>;
                                            }
                                            return <li>{children}</li>;
                                        },
                                        code({ node, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            const { ref, ...rest } = props;
                                            const codeString = String(children).replace(/\n$/, '');
                                            const isRunnable = match && ['javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx'].includes(match[1].toLowerCase());
                                            return match ? (
                                                <InteractiveCodeBlock
                                                    language={match[1]}
                                                    code={codeString}
                                                    theme={theme}
                                                    isRunnable={!!isRunnable}
                                                    restProps={rest}
                                                />
                                            ) : (
                                                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm text-foreground" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {sections.explanation}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {activeTab === 'example' && sections.example && (
                        <div className="p-3">
                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    components={{
                                        code({ node, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '')
                                            const { ref, ...rest } = props;
                                            const codeString = String(children).replace(/\n$/, '');
                                            const isRunnable = match && ['javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx'].includes(match[1].toLowerCase());
                                            return match ? (
                                                <InteractiveCodeBlock
                                                    language={match[1]}
                                                    code={codeString}
                                                    theme={theme}
                                                    isRunnable={!!isRunnable}
                                                    restProps={rest}
                                                />
                                            ) : (
                                                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm text-foreground" {...props}>
                                                    {children}
                                                </code>
                                            )
                                        }
                                    }}
                                >
                                    {sections.example}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Visual + Takeaways */}
                <div className="space-y-2">
                    {/* Visual Context */}
                    {animationData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <AnimationPlayer data={animationData} />
                        </motion.div>
                    )}
                    {!animationData && isLoadingAnimation && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden"
                        >
                            {/* Header skeleton - matches AnimationPlayer header */}
                            <div className="p-4 border-b border-border bg-muted/20">
                                <div className="h-4 bg-muted/60 rounded animate-pulse w-2/3 mb-2" />
                                <div className="h-3 bg-muted/40 rounded animate-pulse w-full" />
                            </div>
                            {/* Canvas skeleton - matches SVG viewBox 800x400 (2:1 ratio) */}
                            <div className="relative bg-background/50 flex items-center justify-center" style={{ aspectRatio: '2 / 1' }}>
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                                    <span className="text-xs text-muted-foreground">Generating animation...</span>
                                </div>
                            </div>
                            {/* Controls skeleton - matches AnimationPlayer controls */}
                            <div className="p-4 border-t border-border bg-muted/20">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-muted/50 rounded-lg animate-pulse" />
                                        <div className="w-8 h-8 bg-primary/20 rounded-lg animate-pulse" />
                                        <div className="w-8 h-8 bg-muted/50 rounded-lg animate-pulse" />
                                        <div className="w-8 h-8 bg-muted/50 rounded-lg animate-pulse" />
                                    </div>
                                    <div className="flex-1 h-2 bg-muted rounded-full" />
                                    <div className="w-12 h-6 bg-muted/50 rounded animate-pulse" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {!animationData && !isLoadingAnimation && sections.imageKeywords.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <VisualPanel imageKeywords={sections.imageKeywords} />
                        </motion.div>
                    )}

                    {/* Key Takeaways - Compact */}
                    {sections.takeaways && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm"
                        >
                            <div className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                                onClick={() => setIsTakeawaysExpanded(!isTakeawaysExpanded)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                                    </div>
                                    <span className="font-semibold text-foreground text-sm">Key Takeaways</span>
                                    <TTSButton text={sections.takeaways} language={language || 'en'} />
                                    <CopyButton text={sections.takeaways} />
                                </div>
                                {isTakeawaysExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </div>

                            <AnimatePresence>
                                {isTakeawaysExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-border/50"
                                    >
                                        <div className="p-3 bg-muted/10">
                                            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-li:text-foreground prose-li:marker:text-primary">
                                                <ReactMarkdown>
                                                    {sections.takeaways}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* 3. SOURCES - Research mode */}
            {sources.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm"
                >
                    <button
                        onClick={() => setAreSourcesExpanded(!areSourcesExpanded)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-semibold text-foreground text-sm">Sources</span>
                            <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground font-medium">
                                {sources.length}
                            </span>
                        </div>
                        {areSourcesExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    <AnimatePresence>
                        {areSourcesExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-border/50"
                            >
                                <div className="p-3 space-y-2 bg-muted/10">
                                    {sources.map((source, i) => {
                                        const cfg = CREDIBILITY_CONFIG[source.credibility];
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-background border border-border/50 hover:border-primary/30 transition-colors">
                                                <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                        <a
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1"
                                                        >
                                                            {source.title}
                                                            <ExternalLink className="w-3 h-3 opacity-50" />
                                                        </a>
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.color}`}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    {source.summary && (
                                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                            {source.summary}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

        </motion.div>
    );
}

// Robust parsing logic for streaming content
function parseSections(markdown: string): { sections: any; sources: Source[] } {
    const sections = {
        mentalModel: '',
        explanation: '',
        diagram: '',
        example: '',
        takeaways: '',
        visualType: 'diagram' as 'diagram' | 'image',
        imageKeywords: [] as string[]
    };

    const sources: Source[] = [];

    if (!markdown) return { sections, sources };

    console.log('[Parser] Raw markdown:', markdown.substring(0, 500));

    // Extract sources first (Perplexity-style)
    const sourcesMatch = markdown.match(/###\s*📚\s*Sources\s*([\s\S]*?)$/i);
    if (sourcesMatch) {
        const sourcesText = sourcesMatch[1];
        const sourceRegex = /-\s*\[([^\]]+)\]\(([^)]+)\)\s*\((\w+)\s+credibility\)/gi;
        let match;
        while ((match = sourceRegex.exec(sourcesText)) !== null) {
            const afterMatch = sourcesText.substring(match.index + match[0].length);
            const summaryMatch = afterMatch.match(/^\s*(.+?)(?=\n-|\n###|$)/);
            sources.push({
                title: match[1].trim(),
                url: match[2].trim(),
                credibility: match[3].toLowerCase() as 'high' | 'medium' | 'low',
                summary: summaryMatch ? summaryMatch[1].trim() : ''
            });
        }

        // Remove sources section from main content
        markdown = markdown.replace(/---\s*###\s*📚\s*Sources[\s\S]*$/, '');
    }

    // Parse structured sections
    let parts = markdown.split(/###\s*\d+\.\s*/);

    if (parts.length <= 1) {
        parts = markdown.split(/###\s+/);
    }

    console.log('[Parser] Split into', parts.length, 'parts');

    if (parts.length <= 1) {
        sections.explanation = markdown;
        sections.mentalModel = "Understanding the concept";
        return { sections, sources };
    }

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const lowerPart = part.toLowerCase();

        // Mental Model - support multiple languages
        if (lowerPart.includes('mental model') || lowerPart.includes('মানসিক মডেল') || lowerPart.includes('मानसिक मॉडल')) {
            let content = part
                .replace(/the\s+mental\s+model/i, '')
                .replace(/mental\s+model/i, '')
                .replace(/মানসিক মডেল/i, '')
                .replace(/मानसिक मॉडल/i, '')
                .trim()
                .replace(/^\n+/, '');

            // Extract first meaningful paragraph
            const paragraphMatch = content.match(/^([^\n]+(?:\n(?!\n)[^\n]+)*)/);
            if (paragraphMatch) {
                sections.mentalModel = paragraphMatch[1].trim();
            } else {
                const firstLine = content.split('\n')[0];
                sections.mentalModel = firstLine || "Understanding the concept";
            }
            console.log('[Parser] Mental model:', sections.mentalModel);
        }
        // Explanation - support multiple languages
        else if (lowerPart.includes('explanation') || lowerPart.includes('ব্যাখ্যা') || lowerPart.includes('व्याख्या')) {
            sections.explanation = part
                .replace(/the explanation/i, '')
                .replace(/explanation/i, '')
                .replace(/ব্যাখ্যা/i, '')
                .replace(/व्याख्या/i, '')
                .trim();
        }
        // Visual/Diagram
        else if (lowerPart.includes('visual context') || lowerPart.includes('visual diagram') || lowerPart.includes('diagram')) {
            const rawVisual = part.replace(/visual context/i, '').replace(/visual diagram/i, '').trim();

            // Extract visual type marker
            const typeMatch = rawVisual.match(/\[VISUAL_TYPE:\s*(diagram|image)\]/i);
            if (typeMatch) {
                sections.visualType = typeMatch[1].toLowerCase() as 'diagram' | 'image';
            }

            // Extract image keywords marker
            const keywordsMatch = rawVisual.match(/\[IMAGE_KEYWORDS:\s*([^\]]+)\]/i);
            if (keywordsMatch) {
                sections.imageKeywords = keywordsMatch[1].split(',').map(k => k.trim());
            }

            // Extract diagram code block
            const match = rawVisual.match(/```d2\s*([\s\S]*?)```/) ||
                rawVisual.match(/```\s*([\s\S]*?)```/);
            if (match) {
                sections.diagram = match[1].trim();
            }
        }
        // Example - support multiple languages
        else if (lowerPart.includes('example') || lowerPart.includes('উদাহরণ') || lowerPart.includes('उदाहरण')) {
            sections.example = part
                .replace(/concrete example/i, '')
                .replace(/example/i, '')
                .replace(/উদাহরণ/i, '')
                .replace(/उदाहरण/i, '')
                .trim();
        }
        // Takeaways - support multiple languages
        else if (lowerPart.includes('takeaway') || lowerPart.includes('key points') || lowerPart.includes('মূল বিষয়') || lowerPart.includes('मुख्य बातें')) {
            sections.takeaways = part
                .replace(/key takeaways/i, '')
                .replace(/key points/i, '')
                .replace(/takeaways/i, '')
                .replace(/মূল বিষয়/i, '')
                .replace(/मुख्य बातें/i, '')
                .trim();
        }
        else if (lowerPart.includes('summary') && !sections.explanation) {
            sections.explanation = part.replace(/summary/i, '').trim();
        }
    }

    if (!sections.mentalModel && sections.explanation) {
        const firstSentence = sections.explanation.match(/^[^.!?]+[.!?]/);
        if (firstSentence && firstSentence[0].length < 200) {
            sections.mentalModel = firstSentence[0].trim();
        } else {
            sections.mentalModel = "Understanding the concept";
        }
    }

    console.log('[Parser] Final sections:', {
        mentalModel: sections.mentalModel.substring(0, 100),
        hasExplanation: !!sections.explanation,
        hasDiagram: !!sections.diagram,
        hasExample: !!sections.example,
        hasTakeaways: !!sections.takeaways,
        sourcesCount: sources.length,
    });

    return { sections, sources };
}
