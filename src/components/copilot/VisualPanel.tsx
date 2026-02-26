"use client";

import { ImageGallery } from './ImageGallery';
import { motion } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';

interface VisualPanelProps {
    imageKeywords?: string[];
}

export function VisualPanel({ imageKeywords }: VisualPanelProps) {
    const hasImages = imageKeywords && imageKeywords.length > 0;

    if (!hasImages) {
        return null; // Don't show panel if no images
    }

    return (
        <div className="flex-1 glass-card rounded-xl p-3 sm:p-4 flex flex-col relative overflow-hidden min-h-[250px] sm:min-h-[400px] lg:h-auto">
            {/* Header Label */}
            <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 flex items-center gap-2">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="backdrop-blur flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full shadow-sm border bg-blue-500/10 border-blue-500/20"
                >
                    <ImageIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-blue-500">
                        Visual Context
                    </span>
                </motion.div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center bg-muted/10 rounded-lg border border-border/10 overflow-hidden relative">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full h-full"
                >
                    <ImageGallery keywords={imageKeywords} />
                </motion.div>
            </div>
        </div>
    );
}
