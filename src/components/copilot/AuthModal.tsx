"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Plus, LogIn, Trash2 } from 'lucide-react';
import type { UserProfile } from '@/lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  onSelectProfile: (userId: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (userId: string) => void;
}

export function AuthModal({
  isOpen,
  onClose,
  profiles,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
}: AuthModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateProfile(newName.trim());
      setNewName('');
      setIsCreating(false);
      onClose();
    }
  };

  const handleSelect = (userId: string) => {
    onSelectProfile(userId);
    onClose();
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {isCreating ? 'Create Profile' : 'Select Profile'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {isCreating ? 'Enter your name to get started' : 'Choose or create a profile'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {isCreating ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                      placeholder="Enter your name"
                      autoFocus
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={!newName.trim()}
                      className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Create Profile
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setNewName('');
                      }}
                      className="px-4 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {profiles.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No profiles yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Create your first profile to get started
                      </p>
                    </div>
                  ) : (
                    profiles.map((profile) => (
                      <motion.div
                        key={profile.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 p-4 bg-muted/30 hover:bg-muted/50 border border-border/50 rounded-lg transition-all group"
                      >
                        <div
                          onClick={() => handleSelect(profile.id)}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {profile.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{profile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Last active: {formatDate(profile.lastActive)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete profile "${profile.name}"? This will remove all chat history.`)) {
                              onDeleteProfile(profile.id);
                            }
                          }}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete profile"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  )}

                  {/* Create New Profile Button */}
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg text-muted-foreground hover:text-primary transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">Create New Profile</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
