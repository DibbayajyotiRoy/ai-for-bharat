"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { D2Diagram } from './D2Diagram';
import { Check, ChevronDown, ChevronUp, Copy, BookOpen, ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ResultDisplayProps {
    content: string;
    theme: 'light' | 'dark';
}

interface Source {
    title: string;
    url: string;
    summary: string;
    credibility: 'high' | 'medium' | 'low';
}

export function ResultDisplay({ content, theme }: ResultDisplayProps) {
    // Parse content into sections
    const { sections, sources } = parseSections(content);
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
                <div className="flex-1">
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
                <div className="flex-1 glass-card rounded-xl p-4 flex flex-col relative overflow-hidden h-[400px] md:h-auto">
                    <div className="absolute top-4 left-4 z-10">
                        <span className="bg-background/80 backdrop-blur text-foreground/60 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-border/50 uppercase tracking-widest">System Flowchart</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg border border-border/10 overflow-hidden">
                        {sections.diagram ? (
                            <D2Diagram chart={sections.diagram} />
                        ) : (
                            <div className="flex flex-col items-center text-muted-foreground/50 animate-pulse">
                                <BookOpen className="w-8 h-8 mb-2 opacity-30" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Synthesizing Visual Flow...</span>
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
function parseSections(markdown: string): { sections: any; sources: Source[] } {
    const sections = {
        mentalModel: '',
        explanation: '',
        diagram: '',
        example: '',
        takeaways: ''
    };
    
    const sources: Source[] = [];

    if (!markdown) return { sections, sources };

    console.log('[Parser] Raw markdown:', markdown.substring(0, 500));

    // Extract sources first (Perplexity-style)
    const sourcesMatch = markdown.match(/###\s*📚\s*Sources\s*([\s\S]*?)$/i);
    if (sourcesMatch) {
        const sourcesText = sourcesMatch[1];
        // Parse source links: - [Title](url) (credibility)
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

    // Normal mode: parse structured sections
    let parts = markdown.split(/###\s*\d+\.\s*/);
    
    // If that didn't work, try without numbers
    if (parts.length <= 1) {
        parts = markdown.split(/###\s+/);
    }

    console.log('[Parser] Split into', parts.length, 'parts');

    // If still no sections, treat entire content as explanation
    if (parts.length <= 1) {
        sections.explanation = markdown;
        sections.mentalModel = "Understanding the concept";
        return { sections, sources };
    }

    // Parse sections by looking for keywords
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const lowerPart = part.toLowerCase();

        if (lowerPart.includes('mental model')) {
            // Extract everything after "mental model" until next section or double newline
            let content = part.replace(/mental model/i, '').trim();
            
            // Remove leading newlines
            content = content.replace(/^\n+/, '');
            
            // Get first paragraph (until double newline or next section)
            const paragraphMatch = content.match(/^([^\n]+(?:\n(?!\n)[^\n]+)*)/);
            if (paragraphMatch) {
                sections.mentalModel = paragraphMatch[1].trim();
            } else {
                // Fallback: get first line
                const firstLine = content.split('\n')[0];
                sections.mentalModel = firstLine || "Understanding the concept";
            }
            
            console.log('[Parser] Mental model:', sections.mentalModel);
        } else if (lowerPart.includes('explanation')) {
            sections.explanation = part.replace(/the explanation/i, '').replace(/explanation/i, '').trim();
        } else if (lowerPart.includes('visual diagram') || lowerPart.includes('diagram')) {
            const rawDiagram = part.replace(/visual diagram/i, '').trim();
            // More flexible D2 extraction
            const match = rawDiagram.match(/```d2\s*([\s\S]*?)```/) || 
                         rawDiagram.match(/```\s*([\s\S]*?)```/);
            if (match) {
                sections.diagram = match[1].trim();
            }
        } else if (lowerPart.includes('example')) {
            sections.example = part.replace(/concrete example/i, '').replace(/example/i, '').trim();
        } else if (lowerPart.includes('takeaway') || lowerPart.includes('key points')) {
            sections.takeaways = part.replace(/key takeaways/i, '').replace(/key points/i, '').trim();
        } else if (lowerPart.includes('summary') && !sections.explanation) {
            // Use summary as explanation if no explanation found
            sections.explanation = part.replace(/summary/i, '').trim();
        }
    }

    // Fallback: if no mental model found, extract first meaningful sentence
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
        hasTakeaways: !!sections.takeaways
    });

    return { sections, sources };
}
