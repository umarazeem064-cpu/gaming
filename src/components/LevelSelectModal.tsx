import React, { useState } from 'react';
import { Difficulty, GameDefinition, PlayerProgress } from '../types/game';
import { getLevelRecord } from '../utils/storage';
import { GameArtwork } from './GameArtwork';
import { X, Star, Play, Trophy } from 'lucide-react';

interface LevelSelectModalProps {
  game: GameDefinition;
  progress: PlayerProgress;
  initialDifficulty: Difficulty;
  onStartLevel: (difficulty: Difficulty, level: number) => void;
  onClose: () => void;
}

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  { id: 'easy', label: 'Easy', desc: 'Balanced pace & extra margin' },
  { id: 'medium', label: 'Medium', desc: 'Standard arcade challenge' },
  { id: 'difficult', label: 'Difficult', desc: 'High speed & sharp AI' },
];

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  game,
  progress,
  initialDifficulty,
  onStartLevel,
  onClose,
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [pageRange, setPageRange] = useState<number>(0); // 0: 1-25, 1: 26-50, 2: 51-75, 3: 76-100

  let completedInDiff = 0;
  let starsInDiff = 0;
  let nextLevel = 1;
  for (let i = 1; i <= 100; i++) {
    const rec = getLevelRecord(progress, game.id, difficulty, i);
    if (rec && rec.stars > 0) {
      completedInDiff++;
      starsInDiff += rec.stars;
      nextLevel = Math.min(100, i + 1);
    }
  }

  const startNum = pageRange * 25 + 1;
  const levels = Array.from({ length: 25 }, (_, i) => startNum + i);

  return (
    <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-[#121722] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Banner */}
        <div className="relative h-36 sm:h-44 shrink-0">
          <GameArtwork
            title={game.title}
            motif={game.motif}
            accentColor={game.accentColor}
            coverImage={game.coverImage}
            className="w-full h-full"
          />
          <button
            onClick={onClose}
            aria-label="Close level selector"
            className="absolute top-3 right-3 w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-5 right-14">
            <div className="text-xs text-slate-300">
              {game.category} · 100 Levels
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white truncate">
              {game.title}
            </h2>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          <p className="text-sm text-slate-300">{game.subtitle}</p>

          {/* Difficulty Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400">Select Difficulty</span>
              <span className="text-xs font-mono-num text-amber-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                {completedInDiff}/100 Cleared · {starsInDiff} Stars
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#0B0E14] rounded-xl border border-white/5">
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDifficulty(d.id)}
                    className={`py-2.5 px-3 rounded-lg text-left transition-colors min-h-[44px] ${
                      active
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-semibold whitespace-nowrap">
                      {d.label}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        active ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {d.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Resume CTA */}
          <button
            onClick={() => onStartLevel(difficulty, nextLevel)}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all min-h-[48px]"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              Play Level {nextLevel} ({difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})
            </span>
          </button>

          {/* 100 Level Range Tabs */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-slate-400">
                Choose Any Level (1–100)
              </span>
              <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-lg border border-white/5">
                {['1–25', '26–50', '51–75', '76–100'].map((label, idx) => (
                  <button
                    key={label}
                    onClick={() => setPageRange(idx)}
                    className={`px-2.5 py-1.5 text-xs font-mono-num rounded-md transition-colors whitespace-nowrap ${
                      pageRange === idx
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {levels.map((lvl) => {
                const rec = getLevelRecord(progress, game.id, difficulty, lvl);
                const stars = rec?.stars ?? 0;
                return (
                  <button
                    key={lvl}
                    onClick={() => onStartLevel(difficulty, lvl)}
                    className={`group relative flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all min-h-[54px] active:scale-95 ${
                      stars > 0
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/20'
                        : 'bg-[#181F2C] border-white/8 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-mono-num text-sm font-bold">{lvl}</span>
                    <div className="flex items-center gap-0.5 mt-1">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-2.5 h-2.5 ${
                            s <= stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
