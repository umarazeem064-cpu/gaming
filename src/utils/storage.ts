import { Difficulty, PlayerProgress } from '../types/game';

const STORAGE_KEY = 'ayaan_gaming_progress_v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  soundEnabled: true,
  recentGameIds: [],
  completed: {},
};

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      soundEnabled: parsed.soundEnabled ?? true,
      recentGameIds: Array.isArray(parsed.recentGameIds) ? parsed.recentGameIds : [],
      completed: parsed.completed && typeof parsed.completed === 'object' ? parsed.completed : {},
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore quota errors
  }
}

export function recordLevelWin(
  progress: PlayerProgress,
  gameId: string,
  difficulty: Difficulty,
  level: number,
  stars: number,
  score: number
): PlayerProgress {
  const key = `${gameId}:${difficulty}:${level}`;
  const prev = progress.completed[key];
  const nextCompleted = {
    ...progress.completed,
    [key]: {
      stars: Math.max(prev?.stars ?? 0, stars),
      bestScore: Math.max(prev?.bestScore ?? 0, score),
    },
  };
  const recent = [gameId, ...progress.recentGameIds.filter((id) => id !== gameId)].slice(0, 8);
  const updated: PlayerProgress = {
    ...progress,
    recentGameIds: recent,
    completed: nextCompleted,
  };
  saveProgress(updated);
  return updated;
}

export function recordRecentGame(progress: PlayerProgress, gameId: string): PlayerProgress {
  const recent = [gameId, ...progress.recentGameIds.filter((id) => id !== gameId)].slice(0, 8);
  const updated: PlayerProgress = { ...progress, recentGameIds: recent };
  saveProgress(updated);
  return updated;
}

export function getLevelRecord(
  progress: PlayerProgress,
  gameId: string,
  difficulty: Difficulty,
  level: number
) {
  return progress.completed[`${gameId}:${difficulty}:${level}`] || null;
}

export function getGameCompletionCount(
  progress: PlayerProgress,
  gameId: string,
  difficulty?: Difficulty
): { levelsDone: number; stars: number } {
  let levelsDone = 0;
  let stars = 0;
  const prefix = difficulty ? `${gameId}:${difficulty}:` : `${gameId}:`;
  const seenLevels = new Set<string>();
  for (const [k, rec] of Object.entries(progress.completed)) {
    if (k.startsWith(prefix)) {
      stars += rec.stars;
      const lvlPart = k.split(':')[2];
      if (!seenLevels.has(lvlPart)) {
        seenLevels.add(lvlPart);
        levelsDone += 1;
      }
    }
  }
  return { levelsDone, stars };
}

export function getTotalStats(progress: PlayerProgress): {
  totalStars: number;
  totalClears: number;
  gamesPlayed: number;
} {
  let totalStars = 0;
  let totalClears = 0;
  const games = new Set<string>();
  for (const [k, rec] of Object.entries(progress.completed)) {
    totalStars += rec.stars;
    totalClears += 1;
    games.add(k.split(':')[0]);
  }
  return {
    totalStars,
    totalClears,
    gamesPlayed: Math.max(games.size, progress.recentGameIds.length),
  };
}
