import React, { useEffect, useState } from 'react';
import { Difficulty, GameDefinition } from '../types/game';
import { GameArtwork } from './GameArtwork';
import { Loader2, ShieldCheck, Gamepad2 } from 'lucide-react';

interface SiteSplashLoaderProps {
  onReady: () => void;
}

export const SiteSplashLoader: React.FC<SiteSplashLoaderProps> = ({ onReady }) => {
  const [progress, setProgress] = useState(12);
  const [stageText, setStageText] = useState('Initializing 3D & Physics Engines');

  useEffect(() => {
    const steps = [
      { pct: 34, label: 'Loading 52 Game Modules', delay: 220 },
      { pct: 68, label: 'Preparing 5,200 Stage Seeds', delay: 480 },
      { pct: 92, label: 'Calibrating Mobile Touch & WebGL', delay: 760 },
      { pct: 100, label: 'Welcome to AYAAN GAMING', delay: 1020 },
    ];
    const timers: number[] = [];
    steps.forEach((s) => {
      timers.push(
        window.setTimeout(() => {
          setProgress(s.pct);
          setStageText(s.label);
        }, s.delay)
      );
    });
    timers.push(window.setTimeout(onReady, 1280));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [onReady]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
          <Gamepad2 className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-50">
          AYAAN GAMING
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          52 Realistic Games · 100 Levels Each · Easy, Medium & Difficult
        </p>

        <div className="mt-8 bg-[#141923] border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span>{stageText}</span>
            <span className="font-mono-num text-amber-400 font-semibold">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          onClick={onReady}
          className="mt-6 text-xs text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors py-2 px-4"
        >
          Enter Arcade Now
        </button>
      </div>
    </div>
  );
};

interface GameLaunchLoaderProps {
  game: GameDefinition;
  level: number;
  difficulty: Difficulty;
  onComplete: () => void;
  onCancel: () => void;
}

export const GameLaunchLoader: React.FC<GameLaunchLoaderProps> = ({
  game,
  level,
  difficulty,
  onComplete,
  onCancel,
}) => {
  const [progress, setProgress] = useState(18);
  const [phase, setPhase] = useState('Building stage geometry');

  useEffect(() => {
    const phases = [
      { pct: 46, text: `Configuring ${difficulty} physics & AI`, ms: 200 },
      { pct: 80, text: `Generating Level ${level} / 100`, ms: 460 },
      { pct: 100, text: 'Stage Ready', ms: 720 },
    ];
    const timers: number[] = [];
    phases.forEach((p) => {
      timers.push(
        window.setTimeout(() => {
          setProgress(p.pct);
          setPhase(p.text);
        }, p.ms)
      );
    });
    timers.push(window.setTimeout(onComplete, 920));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [difficulty, level, onComplete]);

  const diffLabel =
    difficulty === 'easy' ? 'Easy' : difficulty === 'medium' ? 'Medium' : 'Difficult';

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-[#121722] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative h-48 sm:h-56">
          <GameArtwork
            title={game.title}
            motif={game.motif}
            accentColor={game.accentColor}
            coverImage={game.coverImage}
            className="w-full h-full"
          />
          <div className="absolute bottom-4 left-5 right-5">
            <div className="text-xs text-amber-400 font-medium">
              {game.category} · {diffLabel} Mode · Level {level} of 100
            </div>
            <h2 className="font-display text-2xl font-bold text-white mt-0.5">
              {game.title}
            </h2>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                {phase}
              </span>
              <span className="font-mono-num text-amber-400">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-[#0B0E14] border border-white/5 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Controls & Objective</span>
            </div>
            <p className="text-slate-200">{game.controlsHint}</p>
            <p className="text-slate-400">{game.objectiveSummary}</p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors min-h-[40px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
