import React, { useCallback, useState } from 'react';
import { Difficulty, GameDefinition } from '../types/game';
import { ThreeWorldsGame } from '../games/ThreeWorldsGames';
import { IphoneArcadeGame } from '../games/IphoneArcadeGames';
import { PhysicsSportsGame } from '../games/PhysicsSportsGames';
import { ActionShooterGame } from '../games/ActionShooterGames';
import { StrategyBoardGame } from '../games/StrategyBoardGames';
import { PuzzleMatchRhythmGame } from '../games/PuzzleMatchRhythmGames';
import { ArrowLeft, RotateCcw, Volume2, VolumeX, Star, ArrowRight, Layers } from 'lucide-react';

interface GamePlayShellProps {
  game: GameDefinition;
  level: number;
  difficulty: Difficulty;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onExit: () => void;
  onLevelComplete: (stars: 1 | 2 | 3, score: number) => void;
  onChangeLevelOrDiff: (difficulty: Difficulty, level: number) => void;
  onOpenLevelSelect: () => void;
}

const THREE_WORLDS_IDS = new Set([
  'craftrealm-3d',
  'bloxdsky-parkour',
  'nitro-horizon-3d',
  'tunnel-rush-3d',
  'cube-snake-3d',
]);

const IPHONE_ARCADE_IDS = new Set([
  'fruit-blade',
  'stack-tower',
  'helix-drop',
  'flappy-aero',
  'crossy-street',
  'skyward-hopper',
  'knife-strike',
  'color-ring',
  'gravity-flip',
  'brick-breaker',
]);

const PHYSICS_SPORTS_IDS = new Set([
  'pro-billiards',
  'air-hockey',
  'carrom-clash',
  'mini-golf',
  'pinball-steel',
  'hoops-swish',
  'penalty-curve',
  'archery-wind',
  'tactical-sniper',
  'slingshot-siege',
]);

const ACTION_DEFENSE_IDS = new Set([
  'orbital-invaders',
  'asteroid-belt',
  'sky-squadron',
  'fortress-td',
  'pac-labyrinth',
  'trench-defender',
]);

const STRATEGY_BOARD_IDS = new Set([
  'chess-master',
  'checkers-royale',
  'connect-four',
  'gomoku-five',
  'sudoku-vault',
  'minesweeper-ops',
  'pipe-conduit',
  'laser-prism',
]);

export const GamePlayShell: React.FC<GamePlayShellProps> = ({
  game,
  level,
  difficulty,
  soundEnabled,
  onToggleSound,
  onExit,
  onLevelComplete,
  onChangeLevelOrDiff,
  onOpenLevelSelect,
}) => {
  const [runKey, setRunKey] = useState(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [outcome, setOutcome] = useState<{
    type: 'win' | 'fail';
    stars: 1 | 2 | 3;
    score: number;
    message: string;
  } | null>(null);

  const handleComplete = useCallback(
    (stars: 1 | 2 | 3, finalScore: number, summary?: string) => {
      setScore(finalScore);
      setOutcome({
        type: 'win',
        stars,
        score: finalScore,
        message: summary || `Level ${level} cleared!`,
      });
      onLevelComplete(stars, finalScore);
    },
    [level, onLevelComplete]
  );

  const handleFail = useCallback((finalScore: number, reason: string) => {
    setScore(finalScore);
    setOutcome({
      type: 'fail',
      stars: 1,
      score: finalScore,
      message: reason,
    });
  }, []);

  const restart = () => {
    setOutcome(null);
    setScore(0);
    setStatus('Restarting...');
    setRunKey((k) => k + 1);
  };

  const diffLabel =
    difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Difficult';

  const renderEngine = () => {
    const props = {
      game,
      level,
      difficulty,
      soundEnabled,
      onScoreChange: setScore,
      onStatusChange: setStatus,
      onLevelComplete: handleComplete,
      onLevelFail: handleFail,
    };

    if (THREE_WORLDS_IDS.has(game.id)) return <ThreeWorldsGame key={runKey} {...props} />;
    if (IPHONE_ARCADE_IDS.has(game.id)) return <IphoneArcadeGame key={runKey} {...props} />;
    if (PHYSICS_SPORTS_IDS.has(game.id)) return <PhysicsSportsGame key={runKey} {...props} />;
    if (ACTION_DEFENSE_IDS.has(game.id)) return <ActionShooterGame key={runKey} {...props} />;
    if (STRATEGY_BOARD_IDS.has(game.id)) return <StrategyBoardGame key={runKey} {...props} />;
    return <PuzzleMatchRhythmGame key={runKey} {...props} />;
  };

  return (
    <div className="fixed inset-0 z-30 bg-[#0B0E14] flex flex-col">
      {/* Compact Game Top Bar */}
      <header className="shrink-0 h-14 px-3 sm:px-6 border-b border-white/8 bg-[#121722] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onExit}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center shrink-0 transition-colors"
            aria-label="Back to AYAAN GAMING"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-display text-sm sm:text-base font-bold text-white truncate">
              {game.title}
            </h2>
            <div className="text-[11px] text-slate-400 truncate">
              Level <span className="font-mono-num text-amber-400">{level}/100</span> · {diffLabel}
            </div>
          </div>
        </div>

        <div className="hidden md:block text-xs text-slate-300 truncate max-w-xs">
          {status}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-white/8 text-xs font-mono-num text-emerald-400 font-semibold">
            {score}
          </div>
          <button
            onClick={onOpenLevelSelect}
            className="h-10 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Levels & Difficulty"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Levels</span>
          </button>
          <button
            onClick={restart}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
            aria-label="Restart level"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSound}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Status Strip */}
      <div className="md:hidden shrink-0 px-4 py-1.5 bg-[#0E131D] border-b border-white/5 text-xs text-slate-300 text-center truncate">
        {status}
      </div>

      {/* Main Play Viewport */}
      <main className="flex-1 min-h-0 p-2 sm:p-4 flex flex-col items-center justify-center max-w-5xl w-full mx-auto">
        <div className="w-full h-full flex items-center justify-center min-h-0">
          {renderEngine()}
        </div>
      </main>

      {/* Outcome Modal */}
      {outcome && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#121722] border border-white/12 rounded-2xl p-6 text-center shadow-2xl space-y-4">
            <div className="text-xs font-medium text-slate-400">
              {game.title} · Level {level} ({diffLabel})
            </div>
            <h3 className="font-display text-2xl font-extrabold text-white">
              {outcome.type === 'win' ? 'Level Cleared' : 'Try Again'}
            </h3>
            {outcome.type === 'win' && (
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`w-8 h-8 ${
                      s <= outcome.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="text-sm text-slate-300">{outcome.message}</p>
            <div className="py-2 px-4 rounded-xl bg-[#0B0E14] border border-white/5 inline-block">
              <span className="text-xs text-slate-400 mr-2">Score</span>
              <span className="font-mono-num text-lg font-bold text-amber-400">{outcome.score}</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {outcome.type === 'win' && level < 100 && (
                <button
                  onClick={() => {
                    setOutcome(null);
                    setScore(0);
                    onChangeLevelOrDiff(difficulty, level + 1);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 min-h-[46px]"
                >
                  <span>Next Level ({level + 1}/100)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={restart}
                className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm min-h-[46px]"
              >
                Play Again
              </button>
              <button
                onClick={onExit}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium min-h-[42px]"
              >
                Back to Arcade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
