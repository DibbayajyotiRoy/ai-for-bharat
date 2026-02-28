"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { VisualPanel } from './VisualPanel';
import { AnimationPlayer } from './AnimationPlayer';
import type { AnimationData } from '@/lib/ai/animation';
import { Check, ChevronDown, ChevronUp, Copy, BookOpen, ExternalLink, Shield, AlertCircle, Image as ImageIcon, Volume2, Loader2, Play } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CodePlayground } from './CodePlayground';

interface ResultDisplayProps {
    content: string;
    theme: 'light' | 'dark';
    // When provided and viewMode === 'translated', these override the parsed sections.
    translatedSections?: { mentalModel: string; takeaways: string };
    viewMode?: 'source' | 'translated';
    animationData?: AnimationData;
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
    const handleSpeak = async () => {
        if (isPlaying || !text) return;
        setIsPlaying(true);
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
        }
    };
    return (
        <button onClick={handleSpeak} disabled={isPlaying} className="p-1 text-muted-foreground hover:text-primary transition-colors" title="Listen">
            {isPlaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
    );
}

function InteractiveCodeBlock({ language, code, theme, isRunnable, restProps }: {
    language: string; code: string; theme: 'light' | 'dark'; isRunnable: boolean; restProps: any;
}) {
    const [interactive, setInteractive] = useState(false);
    return (
        <div className="relative group my-6 rounded-lg overflow-hidden border border-border/50 shadow-sm not-prose">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/80 backdrop-blur border-b border-border/50">
                <span className="text-sm font-mono text-muted-foreground font-semibold">{language}</span>
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
                    customStyle={{
                        margin: 0, borderRadius: 0,
                        background: theme === 'dark' ? '#09090b' : '#fafafa',
                        fontSize: '1rem', lineHeight: '1.6', padding: '1.5rem'
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            )}
        </div>
    );
}

export function ResultDisplay({ content, theme, translatedSections, viewMode = 'source', animationData, language }: ResultDisplayProps) {
    const { sections, sources } = parseSections(content);
    const [activeTab, setActiveTab] = useState<'explanation' | 'example'>('explanation');
    const [isTakeawaysExpanded, setIsTakeawaysExpanded] = useState(false);
    const [areSourcesExpanded, setAreSourcesExpanded] = useState(false);

    // Choose source or translated content for overrideable sections
    const showTranslated = viewMode === 'translated' && !!translatedSections;
    const displayedMentalModel = showTranslated
        ? (translatedSections?.mentalModel || sections.mentalModel)
        : sections.mentalModel;
    const displayedTakeaways = showTranslated
        ? (translatedSections?.takeaways || sections.takeaways)
        : sections.takeaways;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex flex-col gap-3 sm:gap-4 mt-4 sm:mt-6 max-h-[85vh] sm:max-h-[80vh]"
        >
            {/* 1. MENTAL MODEL (Sticky Top) */}
            <div className="w-full bg-primary/5 border border-primary/10 p-3 sm:p-5 rounded-xl flex items-center gap-3 sm:gap-4 shadow-sm backdrop-blur-md">
                <div className="bg-background p-1.5 sm:p-2 rounded-lg shadow-sm border border-border/50">
                    <span className="text-lg sm:text-xl">🧠</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[10px] sm:text-xs font-bold text-primary/60 uppercase tracking-widest font-sans">Mental Model</h3>
                        <TTSButton text={displayedMentalModel} language={language || 'en'} />
                        {showTranslated && (
                            <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                                Translated
                            </span>
                        )}
                    </div>
                    <p className="text-foreground font-serif text-lg sm:text-2xl leading-snug">
                        {displayedMentalModel || "Thinking..."}
                    </p>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 min-h-0 overflow-hidden">

                {/* 2. LEFT PANE: Explanation & Content (Scrollable) */}
                <div className="flex-1 flex flex-col glass-card rounded-xl overflow-hidden min-h-[300px] lg:min-h-0">
                    <div className="flex border-b border-border/50">
                        <button
                            onClick={() => setActiveTab('explanation')}
                            className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${activeTab === 'explanation' ? 'bg-muted/50 text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                        >
                            Explanation
                        </button>
                        <button
                            onClick={() => setActiveTab('example')}
                            className={`flex-1 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors ${activeTab === 'example' ? 'bg-muted/50 text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                        >
                            Example
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        <AnimatePresence mode="wait">
                            {activeTab === 'explanation' ? (
                                <motion.div
                                    key="explanation"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="prose prose-lg md:prose-xl prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-primary font-sans"
                                >
                                    <ReactMarkdown
                                        components={sources.length > 0 ? {
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
                                        } : undefined}
                                    >
                                        {sections.explanation}
                                    </ReactMarkdown>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="example"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="prose prose-lg md:prose-xl prose-slate dark:prose-invert max-w-none"
                                >
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
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 3. RIGHT PANE: Visual Context (Animation or Images) */}
                {animationData ? (
                    <div className="flex-1 min-w-0 min-h-[300px] lg:min-h-0">
                        <AnimationPlayer data={animationData} />
                    </div>
                ) : (
                    <VisualPanel imageKeywords={sections.imageKeywords} />
                )}

            </div>

            {/* 4. BOTTOM: Key Takeaways (Collapsible) */}
            <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                <div
                    onClick={() => setIsTakeawaysExpanded(!isTakeawaysExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    role="button"
                    tabIndex={0}
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-1.5 rounded-full">
                            <Check className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">Key Takeaways</span>
                        <TTSButton text={displayedTakeaways} language={language || 'en'} />
                        {showTranslated && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                                Translated
                            </span>
                        )}
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full border border-border/50">
                            {isTakeawaysExpanded ? 'Hide' : 'Show'}
                        </span>
                    </div>
                    {isTakeawaysExpanded ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                </div>

                <AnimatePresence>
                    {isTakeawaysExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border/50 bg-muted/20"
                        >
                            <div className="p-4 pt-2">
                                <div className="prose prose-sm md:prose-base prose-slate dark:prose-invert max-w-none prose-li:text-foreground/80 prose-li:marker:text-primary">
                                    <ReactMarkdown>
                                        {displayedTakeaways}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 5. SOURCES (Research mode only — collapsible) */}
            {sources.length > 0 && (
                <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div
                        onClick={() => setAreSourcesExpanded(!areSourcesExpanded)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        role="button"
                        tabIndex={0}
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-500/10 p-1.5 rounded-full">
                                <BookOpen className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="font-semibold text-foreground">Sources</span>
                            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full border border-border/50">
                                {sources.length}
                            </span>
                        </div>
                        {areSourcesExpanded ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                    </div>

                    <AnimatePresence>
                        {areSourcesExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-border/50"
                            >
                                <div className="p-4 space-y-3">
                                    {sources.map((source, i) => {
                                        const cfg = CREDIBILITY_CONFIG[source.credibility];
                                        const Icon = cfg.icon;
                                        return (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                                                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <a
                                                            href={source.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-medium text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1"
                                                        >
                                                            {source.title}
                                                            <ExternalLink className="w-3 h-3 opacity-50" />
                                                        </a>
                                                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    {source.summary && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
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
                </div>
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

        if (lowerPart.includes('mental model')) {
            let content = part.replace(/mental model/i, '').trim().replace(/^\n+/, '');
            const paragraphMatch = content.match(/^([^\n]+(?:\n(?!\n)[^\n]+)*)/);
            if (paragraphMatch) {
                sections.mentalModel = paragraphMatch[1].trim();
            } else {
                sections.mentalModel = content.split('\n')[0] || "Understanding the concept";
            }
            console.log('[Parser] Mental model:', sections.mentalModel);
        } else if (lowerPart.includes('explanation')) {
            sections.explanation = part.replace(/the explanation/i, '').replace(/explanation/i, '').trim();
        } else if (lowerPart.includes('visual context') || lowerPart.includes('visual diagram') || lowerPart.includes('diagram')) {
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
        } else if (lowerPart.includes('example')) {
            sections.example = part.replace(/concrete example/i, '').replace(/example/i, '').trim();
        } else if (lowerPart.includes('takeaway') || lowerPart.includes('key points')) {
            sections.takeaways = part.replace(/key takeaways/i, '').replace(/key points/i, '').trim();
        } else if (lowerPart.includes('summary') && !sections.explanation) {
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
