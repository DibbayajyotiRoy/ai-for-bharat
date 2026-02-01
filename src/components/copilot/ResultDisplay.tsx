"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';

interface ResultDisplayProps {
    content: string;
}

export function ResultDisplay({ content }: ResultDisplayProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-3xl mx-auto mt-12 space-y-6"
        >
            <div className="glass p-8 md:p-10 rounded-2xl text-slate-200 shadow-2xl ring-1 ring-white/5">
                <ReactMarkdown
                    components={{
                        h3: ({ node, ...props }) => (
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mt-8 mb-4 flex items-center" {...props}>
                                {/* Visual separator line specific to h3 */}
                                {props.children}
                            </h3>
                        ),
                        p: ({ node, ...props }) => (
                            <p className="leading-relaxed text-slate-300 mb-6 font-light text-lg" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                            <ul className="space-y-3 mb-6" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                            <li className="flex items-start text-slate-300 pl-2" {...props}>
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5 mr-3 shrink-0" />
                                <span>{props.children}</span>
                            </li>
                        ),
                        // We override rendering for lists to remove default bullets since we custom render them
                        // This is a common pattern to get custom bullet styling in react-markdown
                        code: ({ node, className, children, ...props }: any) => {
                            const match = /language-(\w+)/.exec(className || '')
                            const isInline = !match && !String(children).includes('\n');
                            return isInline ? (
                                <code className="bg-slate-800/80 px-1.5 py-0.5 rounded text-sm font-mono text-indigo-200 border border-slate-700/50" {...props}>
                                    {children}
                                </code>
                            ) : (
                                <div className="relative my-6 rounded-lg overflow-hidden bg-[#0F172A] border border-slate-700/50 shadow-inner group">
                                    <div className="absolute top-0 right-0 px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-800/50 rounded-bl-lg border-b border-l border-slate-700/30">
                                        {match ? match[1] : 'code'}
                                    </div>
                                    <pre className="p-5 overflow-x-auto text-sm font-mono text-slate-300 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    </pre>
                                </div>
                            )
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </motion.div>
    );
}
