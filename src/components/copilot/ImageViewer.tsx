import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface ImageViewerProps {
    isOpen: boolean;
    imageUrl: string | null;
    onClose: () => void;
}

export function ImageViewer({ isOpen, imageUrl, onClose }: ImageViewerProps) {
    const [scale, setScale] = useState(1);

    if (!isOpen || !imageUrl) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative max-w-5xl w-full h-[80vh] bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-border/50 bg-muted/20">
                        <h3 className="font-semibold text-foreground">Image Viewer</h3>
                        <div className="flex flex-row items-center gap-2">
                            <button
                                onClick={() => setScale(s => Math.min(s + 0.25, 3))}
                                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setScale(1)}
                                className="px-2 py-1 text-xs hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors font-medium"
                                title="Reset Zoom"
                            >
                                100%
                            </button>
                            <button
                                onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
                                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <div className="w-[1px] h-4 bg-border/50 mx-1" />
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md text-muted-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto flexItems-center justify-center bg-muted/10 p-4">
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img
                                src={imageUrl}
                                alt="Full size view"
                                style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease-out' }}
                                className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing origin-center"
                                draggable={false}
                            />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
