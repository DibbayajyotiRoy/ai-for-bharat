"use client";

import { D2Diagram } from './D2Diagram';
import { ImageGallery } from './ImageGallery';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Image as ImageIcon, Maximize2 } from 'lucide-react';

interface VisualPanelProps {
    visualType: 'diagram' | 'image';
    diagram?: string;
    imageKeywords?: string[];
}

export function VisualPanel({ visualType, diagram, imageKeywords }: VisualPanelProps) {
    const isImageMode = visualType === 'image' && imageKeywords && imageKeywords.length > 0;

    return (
        <div className="flex-1 glass-card rounded-xl p-4 flex flex-col relative overflow-hidden h-[450px] md:h-auto min-h-[400px]">
            {/* Dynamic Header Label */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <motion.div
                    initial={false}
                    animate={{
                        backgroundColor: isImageMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        borderColor: isImageMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                    }}
                    className="backdrop-blur flex items-center gap-2 px-3 py-1 rounded-full shadow-sm border"
                >
                    {isImageMode ? (
                        <ImageIcon className="w-3 h-3 text-blue-500" />
                    ) : (
                        <Activity className="w-3 h-3 text-emerald-500" />
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isImageMode ? 'text-blue-500' : 'text-emerald-500'}`}>
                        {isImageMode ? 'Visual Context' : 'System Architecture'}
                    </span>
                </motion.div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 rounded-lg border border-border/10 overflow-hidden relative group">
                <AnimatePresence mode="wait">
                    {isImageMode ? (
                        <motion.div
                            key="images"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full h-full"
                        >
                            <ImageGallery keywords={imageKeywords} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="diagram"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="w-full h-full"
                        >
                            {diagram ? (
                                <D2Diagram chart={diagram} />
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground/30 animate-pulse">
                                    <Activity className="w-10 h-10 mb-2 opacity-20" />
                                    <span className="text-[10px] uppercase tracking-[0.3em] font-medium">Synthesizing Visual Logic...</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Subtle Decorative Grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            </div>

            {/* Help tooltip */}
            <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-background/80 backdrop-blur rounded text-[9px] text-muted-foreground font-medium border border-border/50">
                    <Maximize2 className="w-2.5 h-2.5" />
                    {isImageMode ? 'Scroll to explore' : 'D2 Vector Output'}
                </div>
            </div>
        </div>
    );
}
