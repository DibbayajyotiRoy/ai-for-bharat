// Simple session-based authentication using localStorage
// In production, use proper auth like AWS Cognito, Auth0, etc.

export interface UserProfile {
  id: string;
  name: string;
  createdAt: number;
  lastActive: number;
}

const STORAGE_KEY = 'learning-copilot-profiles';
const ACTIVE_USER_KEY = 'learning-copilot-active-user';

export function getAllProfiles(): UserProfile[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function createProfile(name: string): UserProfile {
  const profiles = getAllProfiles();
  
  const newProfile: UserProfile = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
  
  profiles.push(newProfile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  
  return newProfile;
}

export function getActiveUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  
  const userId = localStorage.getItem(ACTIVE_USER_KEY);
  if (!userId) return null;
  
  const profiles = getAllProfiles();
  const user = profiles.find(p => p.id === userId);
  
  if (user) {
    // Update last active
    user.lastActive = Date.now();
    updateProfile(user);
  }
  
  return user || null;
}

export function setActiveUser(userId: string): void {
  localStorage.setItem(ACTIVE_USER_KEY, userId);
  
  // Update last active timestamp
  const profiles = getAllProfiles();
  const user = profiles.find(p => p.id === userId);
  if (user) {
    user.lastActive = Date.now();
    updateProfile(user);
  }
}

export function updateProfile(profile: UserProfile): void {
  const profiles = getAllProfiles();
  const index = profiles.findIndex(p => p.id === profile.id);
  
  if (index !== -1) {
    profiles[index] = profile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }
}

export function deleteProfile(userId: string): void {
  const profiles = getAllProfiles();
  const filtered = profiles.filter(p => p.id !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  
  // If deleting active user, clear active user
  const activeUserId = localStorage.getItem(ACTIVE_USER_KEY);
  if (activeUserId === userId) {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
}

export function logout(): void {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

export function switchProfile(userId: string): boolean {
  const profiles = getAllProfiles();
  const user = profiles.find(p => p.id === userId);
  
  if (user) {
    setActiveUser(userId);
    return true;
  }
  
  return false;
}
