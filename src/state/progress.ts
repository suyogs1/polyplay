// localStorage-backed progress tracking

const STORAGE_PREFIX = 'polyglot_playground_';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string; // ISO date string
}

// Safe localStorage operations
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.warn('localStorage get failed:', error);
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, value);
    return true;
  } catch (error) {
    console.warn('localStorage set failed:', error);
    return false;
  }
}

// Streak management
export function getStreak(): number {
  const streakData = safeGetItem('streak');
  if (!streakData) return 0;
  
  try {
    const { count, lastDate } = JSON.parse(streakData);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // If last activity was today, return current streak
    if (lastDate === today) return count;
    
    // If last activity was yesterday, streak continues
    if (lastDate === yesterday) return count;
    
    // Otherwise, streak is broken
    return 0;
  } catch (error) {
    return 0;
  }
}

export function incrementStreak(todayISO?: string): number {
  const today = todayISO || new Date().toISOString().split('T')[0];
  const currentStreak = getStreak();
  const streakData = safeGetItem('streak');
  
  let lastDate = '';
  if (streakData) {
    try {
      ({ lastDate } = JSON.parse(streakData));
    } catch (error) {
      // Ignore parse errors
    }
  }
  
  // Don't increment if already counted today
  if (lastDate === today) {
    return currentStreak;
  }
  
  const newStreak = currentStreak + 1;
  safeSetItem('streak', JSON.stringify({
    count: newStreak,
    lastDate: today
  }));
  
  return newStreak;
}

// Badge management
export function awardBadge(id: string): boolean {
  if (hasBadge(id)) return false;
  
  const badges = listBadges();
  const badgeDefinitions: Record<string, Omit<Badge, 'id' | 'unlockedAt'>> = {
    loop_learner: {
      name: 'Loop Learner',
      description: 'Completed your first sum-array challenge',
      icon: '🔄'
    },
    bracket_buster: {
      name: 'Bracket Buster',
      description: 'Mastered balanced brackets',
      icon: '🎯'
    },
    debug_detective: {
      name: 'Debug Detective',
      description: 'Used the tutor to fix a bug and then passed',
      icon: '🕵️'
    }
  };
  
  const badgeInfo = badgeDefinitions[id];
  if (!badgeInfo) return false;
  
  const newBadge: Badge = {
    id,
    ...badgeInfo,
    unlockedAt: new Date().toISOString()
  };
  
  badges.push(newBadge);
  safeSetItem('badges', JSON.stringify(badges));
  return true;
}

export function hasBadge(id: string): boolean {
  const badges = listBadges();
  return badges.some(badge => badge.id === id);
}

export function listBadges(): Badge[] {
  const badgesData = safeGetItem('badges');
  if (!badgesData) return [];
  
  try {
    return JSON.parse(badgesData);
  } catch (error) {
    return [];
  }
}

// Challenge results
export function saveChallengeResult(
  challengeId: string, 
  lang: 'js' | 'py', 
  passed: boolean
): void {
  const key = `challenge_${challengeId}_${lang}`;
  const result = {
    passed,
    completedAt: new Date().toISOString(),
    attempts: getChallengeAttempts(challengeId, lang) + 1
  };
  
  safeSetItem(key, JSON.stringify(result));
  
  // Award badges based on challenge completion
  if (passed) {
    if (challengeId === 'sum-array') {
      awardBadge('loop_learner');
    } else if (challengeId === 'balanced-brackets') {
      awardBadge('bracket_buster');
    }
  }
}

export function getChallengeResult(challengeId: string, lang: 'js' | 'py'): {
  passed: boolean;
  completedAt: string;
  attempts: number;
} | null {
  const key = `challenge_${challengeId}_${lang}`;
  const resultData = safeGetItem(key);
  
  if (!resultData) return null;
  
  try {
    return JSON.parse(resultData);
  } catch (error) {
    return null;
  }
}

export function getChallengeAttempts(challengeId: string, lang: 'js' | 'py'): number {
  const result = getChallengeResult(challengeId, lang);
  return result?.attempts || 0;
}

// Tutor usage tracking
export function markTutorUsed(challengeId: string): void {
  safeSetItem(`tutor_used_${challengeId}`, 'true');
}

export function wasTutorUsed(challengeId: string): boolean {
  return safeGetItem(`tutor_used_${challengeId}`) === 'true';
}

// Clear all data (for testing/reset)
export function clearAllProgress(): void {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear progress:', error);
  }
}