"use client";

import { motion } from 'framer-motion';

export function ImprovedSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 px-2 sm:px-0">
      {/* Mental Model Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6 shadow-lg"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        <div className="relative flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 skeleton-shimmer" />
          <div className="flex-1 space-y-2.5">
            <div className="h-2.5 w-28 bg-muted/50 rounded-full skeleton-shimmer" />
            <div className="h-5 w-full bg-muted/50 rounded-lg skeleton-shimmer" />
            <div className="h-5 w-4/5 bg-muted/50 rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </motion.div>

      {/* Main Content Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm"
      >
        <div className="p-5 sm:p-6 space-y-4">
          {/* Explanation lines */}
          <div className="space-y-2.5">
            <div className="h-3.5 w-full bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3.5 w-full bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3.5 w-5/6 bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3.5 w-full bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3.5 w-4/5 bg-muted/50 rounded skeleton-shimmer" />
          </div>

          {/* Bullet points */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted/50 skeleton-shimmer mt-2" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full bg-muted/50 rounded skeleton-shimmer" />
                  <div className="h-3 w-3/4 bg-muted/50 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>

          {/* More content */}
          <div className="space-y-2.5">
            <div className="h-3.5 w-full bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3.5 w-5/6 bg-muted/50 rounded skeleton-shimmer" />
          </div>
        </div>

        {/* Example Section */}
        <div className="border-t border-border/50 bg-muted/20 p-5 sm:p-6">
          <div className="h-4 w-32 bg-muted/50 rounded-lg skeleton-shimmer mb-4" />
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <div className="h-3 w-3/4 bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3 w-full bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3 w-5/6 bg-muted/50 rounded skeleton-shimmer" />
            <div className="h-3 w-2/3 bg-muted/50 rounded skeleton-shimmer" />
          </div>
        </div>
      </motion.div>

      {/* Animation/Visual Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/20 aspect-[16/9]"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/50 skeleton-shimmer" />
            <div className="w-20 h-1.5 bg-muted/50 rounded-full skeleton-shimmer" />
            <div className="w-10 h-10 rounded-full bg-muted/50 skeleton-shimmer" />
            <div className="w-20 h-1.5 bg-muted/50 rounded-full skeleton-shimmer" />
            <div className="w-10 h-10 rounded-full bg-muted/50 skeleton-shimmer" />
          </div>
        </div>
      </motion.div>

      {/* Key Takeaways Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 skeleton-shimmer" />
          <div className="h-4 w-36 bg-muted/50 rounded-lg skeleton-shimmer" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted/50 skeleton-shimmer mt-2" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-full bg-muted/50 rounded skeleton-shimmer" />
                <div className="h-3 w-4/5 bg-muted/50 rounded skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Pulsing indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-center justify-center gap-2 py-4"
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground font-medium">Generating explanation...</span>
      </motion.div>
    </div>
  );
}
