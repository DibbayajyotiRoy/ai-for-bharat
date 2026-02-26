"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown } from 'lucide-react';
import type { UserProfile } from '@/lib/auth';

interface UserMenuProps {
  user: UserProfile;
  onLogout: () => void;
  onSwitchProfile: () => void;
}

export function UserMenu({ user, onLogout, onSwitchProfile }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur border border-border/50 rounded-full text-foreground hover:bg-muted/50 transition-all shadow-sm"
      >
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium hidden md:inline">{user.name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-xl overflow-hidden z-40"
            >
              <div className="p-3 border-b border-border bg-muted/20">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">Active Profile</p>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    onSwitchProfile();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  <User className="w-4 h-4" />
                  Switch Profile
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
