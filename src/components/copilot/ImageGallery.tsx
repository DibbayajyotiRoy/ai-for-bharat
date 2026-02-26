"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, ExternalLink, Loader2, Camera } from 'lucide-react';

interface TopicImage {
    url: string;
    alt: string;
    photographer: string;
    photographerUrl: string;
    source: string;
}

interface ImageGalleryProps {
    keywords: string[];
}

export function ImageGallery({ keywords }: ImageGalleryProps) {
    const [images, setImages] = useState<TopicImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchImages() {
            if (!keywords || keywords.length === 0) return;

            setIsLoading(true);
            setError(null);

            try {
                const res = await fetch('/api/images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ keywords }),
                });

                if (!res.ok) throw new Error('Failed to fetch images');

                const data = await res.json();
                setImages(data.images || []);
            } catch (err: any) {
                console.error('[ImageGallery] Fetch error:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchImages();
    }, [keywords]);

    if (isLoading) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-muted/10 rounded-lg p-8">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div className="space-y-2 text-center">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest animate-pulse">Curating Visual Context...</span>
                    <div className="flex gap-1 justify-center">
                        {keywords.slice(0, 3).map((k, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{k}</span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || images.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20 rounded-lg p-8 text-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <div className="text-sm font-medium text-muted-foreground">No visuals found for this topic</div>
                <div className="text-xs text-muted-foreground/60">Try a more specific search term</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 p-2 overflow-y-auto scrollbar-none">
            <AnimatePresence>
                {images.map((img, i) => (
                    <motion.div
                        key={img.url}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                        className="relative group rounded-xl overflow-hidden shadow-sm aspect-[4/3] bg-muted"
                    >
                        <img
                            src={img.url}
                            alt={img.alt}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                            <p className="text-white text-xs font-medium line-clamp-2 mb-2">{img.alt}</p>
                            <div className="flex items-center justify-between">
                                <a
                                    href={img.photographerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[10px] text-white/80 hover:text-white transition-colors"
                                >
                                    <Camera className="w-3 h-3" />
                                    {img.photographer}
                                </a>
                                <span className="text-[9px] text-white/40 uppercase tracking-tighter">via Unsplash</span>
                            </div>
                        </div>

                        {/* Animated border pulse on mount */}
                        <motion.div
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 1.5 }}
                            className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
