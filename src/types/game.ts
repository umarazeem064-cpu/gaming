export type Difficulty = 'easy' | 'medium' | 'difficult';

export type GameCategory =
  | '3D Worlds'
  | 'iPhone Hits'
  | 'Sports & Physics'
  | 'Action & Defense'
  | 'Strategy & Board'
  | 'Puzzles & Rhythm';

export type ArtworkMotif =
  | 'voxel'
  | 'parkour'
  | 'racing'
  | 'tunnel'
  | 'snake3d'
  | 'billiards'
  | 'hockey'
  | 'carrom'
  | 'golf'
  | 'pinball'
  | 'hoops'
  | 'soccer'
  | 'archery'
  | 'sniper'
  | 'slingshot'
  | 'fruit'
  | 'stack'
  | 'helix'
  | 'flight'
  | 'crossy'
  | 'hopper'
  | 'knife'
  | 'colorring'
  | 'gravity'
  | 'breaker'
  | 'invaders'
  | 'asteroid'
  | 'squadron'
  | 'towerdefense'
  | 'pacman'
  | 'trench'
  | 'tetris'
  | 'num2048'
  | 'gems'
  | 'bubbles'
  | 'tubes'
  | 'chess'
  | 'checkers'
  | 'connect4'
  | 'gomoku'
  | 'sudoku'
  | 'mines'
  | 'slide15'
  | 'pipes'
  | 'laser'
  | 'memory'
  | 'wordhunt'
  | 'scramble'
  | 'piano'
  | 'simon'
  | 'reflex'
  | 'math';

export interface GameDefinition {
  id: string;
  title: string;
  subtitle: string;
  category: GameCategory;
  motif: ArtworkMotif;
  accentColor: string;
  coverImage?: string;
  popular?: boolean;
  popularLabel?: string;
  controlsHint: string;
  objectiveSummary: string;
  totalLevels: number;
}

export interface DifficultyLevelRecord {
  stars: number; // 0..3
  bestScore: number;
}

export interface PlayerProgress {
  soundEnabled: boolean;
  recentGameIds: string[];
  // Key: `${gameId}:${difficulty}:${level}`
  completed: Record<string, DifficultyLevelRecord>;
}

export interface GameRuntimeProps {
  game: GameDefinition;
  level: number; // 1..100
  difficulty: Difficulty;
  soundEnabled: boolean;
  onScoreChange: (score: number) => void;
  onStatusChange: (status: string) => void;
  onLevelComplete: (stars: 1 | 2 | 3, score: number, summary?: string) => void;
  onLevelFail: (score: number, reason: string) => void;
}
