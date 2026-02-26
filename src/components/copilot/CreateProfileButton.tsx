"use client";

import { UserPlus } from 'lucide-react';

interface CreateProfileButtonProps {
  onClick: () => void;
}

export function CreateProfileButton({ onClick }: CreateProfileButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur border border-border/50 rounded-full text-sm font-medium hover:bg-muted/50 transition-all shadow-sm text-muted-foreground hover:text-foreground"
    >
      <UserPlus className="w-4 h-4" />
      <span className="hidden md:inline text-xs">Sign In</span>
    </button>
  );
}
