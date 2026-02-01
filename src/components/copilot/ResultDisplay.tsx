"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { MermaidDiagram } from './MermaidDiagram';
import { Check, ChevronDown, ChevronUp, Copy, BookOpen } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ResultDisplayProps {
    content: string;
    theme: 'light' | 'dark';
}

export function ResultDisplay({ content, theme }: ResultDisplayProps) {
    // Parse content into sections
    const sections = parseSections(content);
    const [activeTab, setActiveTab] = useState<'explanation' | 'example'>('explanation');
    const [isTakeawaysExpanded, setIsTakeawaysExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex flex-col gap-4 mt-6 max-h-[80vh]"
        >
            {/* 1. MENTAL MODEL (Sticky Top) */}
            <div className="w-full bg-primary/5 border border-primary/10 p-5 rounded-xl flex items-center gap-4 shadow-sm backdrop-blur-md">
                <div className="bg-background p-2 rounded-lg shadow-sm border border-border/50">
                    <span className="text-xl">🧠</span>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-1 font-sans">Mental Model</h3>
                    <p className="text-foreground font-serif text-2xl leading-snug">
                        {sections.mentalModel || "Thinking..."}
                    </p>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">

                {/* 2. LEFT PANE: Explanation & Content (Scrollable) */}
                <div className="flex-1 flex flex-col glass-card rounded-xl overflow-hidden">
                    <div className="flex border-b border-border/50">
                        <button
                            onClick={() => setActiveTab('explanation')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'explanation' ? 'bg-muted/50 text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                        >
                            Explanation
                        </button>
                        <button
                            onClick={() => setActiveTab('example')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'example' ? 'bg-muted/50 text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
                        >
                            Example
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                        <AnimatePresence mode="wait">
                            {activeTab === 'explanation' ? (
                                <motion.div
                                    key="explanation"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="prose prose-lg md:prose-xl prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-a:text-primary font-sans"
                                >
                                    <ReactMarkdown>
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
                                                return match ? (
                                                    <div className="relative group my-6 rounded-lg overflow-hidden border border-border/50 shadow-sm not-prose">
                                                        <div className="flex items-center justify-between px-4 py-2 bg-muted/80 backdrop-blur border-b border-border/50">
                                                            <span className="text-sm font-mono text-muted-foreground font-semibold">{match[1]}</span>
                                                            <button
                                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-medium"
                                                                onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                                                            >
                                                                <Copy className="w-3.5 h-3.5" /> Copy
                                                            </button>
                                                        </div>
                                                        <SyntaxHighlighter
                                                            {...rest}
                                                            style={theme === 'dark' ? oneDark : oneLight}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            customStyle={{
                                                                margin: 0,
                                                                borderRadius: 0,
                                                                background: theme === 'dark' ? '#09090b' : '#fafafa',
                                                                fontSize: '1rem',
                                                                lineHeight: '1.6',
                                                                padding: '1.5rem'
                                                            }}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    </div>
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

                {/* 3. RIGHT PANE: Visual Diagram (Fixed/Fit) */}
                <div className="flex-1 glass-card rounded-xl p-4 flex flex-col relative overflow-hidden">
                    <div className="absolute top-4 left-4 z-10">
                        <span className="bg-background/80 backdrop-blur text-foreground/60 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-border/50 uppercase tracking-widest">Visual Flow</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center min-h-[300px] bg-muted/20 rounded-lg border border-border/10">
                        {sections.diagram ? (
                            <MermaidDiagram chart={sections.diagram} />
                        ) : (
                            <div className="flex flex-col items-center text-muted-foreground/50 animate-pulse">
                                <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs uppercase tracking-widest">Generating Visual...</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* 4. BOTTOM: Key Takeaways (Collapsible) */}
            <div className="w-full bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                <button
                    onClick={() => setIsTakeawaysExpanded(!isTakeawaysExpanded)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-1.5 rounded-full">
                            <Check className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">Key Takeaways</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-full border border-border/50">
                            {isTakeawaysExpanded ? 'Hide' : 'Show'}
                        </span>
                    </div>
                    {isTakeawaysExpanded ? <ChevronUp className="text-muted-foreground" /> : <ChevronDown className="text-muted-foreground" />}
                </button>

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
                                        {sections.takeaways}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </motion.div>
    );
}

// Robust parsing logic for streaming content
function parseSections(markdown: string) {
    const sections = {
        mentalModel: '',
        explanation: '',
        diagram: '',
        example: '',
        takeaways: ''
    };

    if (!markdown) return sections;

    // Simple splitting by headers - this matches the prompt structure
    const parts = markdown.split(/### \d+\. /);

    // parts[0] is usually empty or intro text
    // parts[1] = Mental Model
    // parts[2] = Explanation
    // parts[3] = Visual Diagram
    // parts[4] = Concrete Example
    // parts[5] = Key Takeaways

    if (parts.length > 1) sections.mentalModel = parts[1]?.replace('The Mental Model', '').trim();
    if (parts.length > 2) sections.explanation = parts[2]?.replace('The Explanation', '').trim();

    // Extract mermaid code block for diagram
    if (parts.length > 3) {
        const rawDiagram = parts[3]?.replace('Visual Diagram', '').trim();
        const match = rawDiagram.match(/```mermaid([\s\S]*?)```/);
        if (match) {
            sections.diagram = match[1].trim();
        }
    }

    if (parts.length > 4) sections.example = parts[4]?.replace('Concrete Example', '').trim();
    if (parts.length > 5) sections.takeaways = parts[5]?.replace('Key Takeaways', '').trim();

    return sections;
}
