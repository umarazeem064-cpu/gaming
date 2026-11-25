import React, { useEffect, useMemo, useState } from 'react';
import { GAMES_CATALOG } from './data/gamesCatalog';
import { Difficulty, GameCategory, GameDefinition, PlayerProgress } from './types/game';
import { soundFX } from './utils/audio';
import {
  getGameCompletionCount,
  getTotalStats,
  loadProgress,
  recordLevelWin,
  recordRecentGame,
  saveProgress,
} from './utils/storage';
import { GameArtwork } from './components/GameArtwork';
import { GameLaunchLoader, SiteSplashLoader } from './components/LoadingScreens';
import { LevelSelectModal } from './components/LevelSelectModal';
import { GamePlayShell } from './components/GamePlayShell';
import {
  Search,
  Volume2,
  VolumeX,
  Play,
  Star,
  Compass,
  Flame,
  Box,
  Trophy,
  SlidersHorizontal,
} from 'lucide-react';

type CategoryFilter = 'All' | GameCategory;

const CATEGORIES: CategoryFilter[] = [
  'All',
  '3D Worlds',
  'iPhone Hits',
  'Sports & Physics',
  'Action & Defense',
  'Strategy & Board',
  'Puzzles & Rhythm',
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultDiff, setDefaultDiff] = useState<Difficulty>('medium');

  // Modals & Active Game Flow
  const [levelModalGame, setLevelModalGame] = useState<GameDefinition | null>(null);
  const [loadingLaunch, setLoadingLaunch] = useState<{
    game: GameDefinition;
    difficulty: Difficulty;
    level: number;
  } | null>(null);
  const [activeGame, setActiveGame] = useState<{
    game: GameDefinition;
    difficulty: Difficulty;
    level: number;
  } | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    soundFX.setEnabled(progress.soundEnabled);
  }, [progress.soundEnabled]);

  const toggleSound = () => {
    const next = { ...progress, soundEnabled: !progress.soundEnabled };
    setProgress(next);
    saveProgress(next);
    soundFX.setEnabled(next.soundEnabled);
    if (next.soundEnabled) soundFX.click();
  };

  const stats = useMemo(() => getTotalStats(progress), [progress]);
  const popularGames = useMemo(() => GAMES_CATALOG.filter((g) => g.popular), []);

  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return GAMES_CATALOG.filter((g) => {
      const catOk = category === 'All' || g.category === category;
      if (!catOk) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.subtitle.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.popularLabel && g.popularLabel.toLowerCase().includes(q))
      );
    });
  }, [category, searchQuery]);

  const launchGame = (game: GameDefinition, difficulty: Difficulty, level: number) => {
    soundFX.click();
    setLevelModalGame(null);
    setProgress((prev) => recordRecentGame(prev, game.id));
    setLoadingLaunch({ game, difficulty, level });
  };

  const handleQuickPlay = () => {
    const recentId = progress.recentGameIds[0] || 'craftrealm-3d';
    const found = GAMES_CATALOG.find((g) => g.id === recentId) || GAMES_CATALOG[0];
    launchGame(found, defaultDiff, 1);
  };

  const scrollToCatalog = (cat?: CategoryFilter) => {
    if (cat) setCategory(cat);
    const el = document.getElementById('games-catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#F1F5F9] pb-20 md:pb-12">
      {/* 1. Initial Site Splash Loading Page */}
      {showSplash && <SiteSplashLoader onReady={() => setShowSplash(false)} />}

      {/* 2. Per-Game Launch Loading Page */}
      {loadingLaunch && (
        <GameLaunchLoader
          game={loadingLaunch.game}
          level={loadingLaunch.level}
          difficulty={loadingLaunch.difficulty}
          onComplete={() => {
            setActiveGame(loadingLaunch);
            setLoadingLaunch(null);
          }}
          onCancel={() => setLoadingLaunch(null)}
        />
      )}

      {/* 3. Active Gameplay Shell */}
      {activeGame && (
        <GamePlayShell
          game={activeGame.game}
          level={activeGame.level}
          difficulty={activeGame.difficulty}
          soundEnabled={progress.soundEnabled}
          onToggleSound={toggleSound}
          onExit={() => setActiveGame(null)}
          onLevelComplete={(stars, score) => {
            setProgress((prev) =>
              recordLevelWin(
                prev,
                activeGame.game.id,
                activeGame.difficulty,
                activeGame.level,
                stars,
                score
              )
            );
          }}
          onChangeLevelOrDiff={(diff, lvl) => {
            setActiveGame(null);
            setLoadingLaunch({ game: activeGame.game, difficulty: diff, level: lvl });
          }}
          onOpenLevelSelect={() => setLevelModalGame(activeGame.game)}
        />
      )}

      {/* 4. 100-Level & Difficulty Selector Modal */}
      {levelModalGame && (
        <LevelSelectModal
          game={levelModalGame}
          progress={progress}
          initialDifficulty={defaultDiff}
          onStartLevel={(diff, lvl) => launchGame(levelModalGame, diff, lvl)}
          onClose={() => setLevelModalGame(null)}
        />
      )}

      {/* Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-20 h-14 bg-[#0B0E14]/90 backdrop-blur-md border-b border-white/8">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            AYAAN GAMING
          </a>

          {/* Zone 2: 4 Single-line Text Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => scrollToCatalog('All')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              All Games
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('popular-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Popular Hits
            </button>
            <button
              onClick={() => scrollToCatalog('3D Worlds')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              3D Worlds
            </button>
            <button
              onClick={() => scrollToCatalog('iPhone Hits')}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              iPhone Hits
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              onClick={handleQuickPlay}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              Quick Play
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 space-y-12">
        {/* Hero Split Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between bg-[#121722] border border-white/8 rounded-2xl p-6 sm:p-8">
            <div className="space-y-4">
              <div className="text-xs font-medium text-amber-400">
                AYAAN GAMING Studio · Mobile & Desktop Arcade
              </div>
              <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08] [text-wrap:balance]">
                52 Distinct Games. 100 Levels Each.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Explore realistic 3D voxel sandboxes inspired by Minecraft and Bloxd.io,
                precision physics sports, and tactile iPhone-style arcade hits. Every single
                game plays differently and scales across Easy, Medium, and Difficult modes.
              </p>
            </div>

            <div className="pt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setLevelModalGame(GAMES_CATALOG[0])}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-xl flex items-center gap-2 transition-colors min-h-[46px] whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play CraftRealm 3D</span>
              </button>
              <button
                onClick={() => setLevelModalGame(GAMES_CATALOG[1])}
                className="px-5 py-3 bg-[#181F2C] hover:bg-slate-800 text-white font-medium text-sm rounded-xl border border-white/10 transition-colors min-h-[46px] whitespace-nowrap shrink-0"
              >
                Try BloxdSky Parkour
              </button>
              <button
                onClick={toggleSound}
                aria-label="Toggle arcade sound"
                className="w-11 h-11 rounded-xl bg-[#181F2C] hover:bg-slate-800 text-slate-300 border border-white/10 flex items-center justify-center transition-colors shrink-0"
              >
                {progress.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-white/8 bg-[#121722] min-h-[240px] sm:min-h-[320px]">
            {!heroImgError ? (
              <img
                src="/src/assets/images/hero_ayaan_arena_1795603520230.jpg"
                alt="AYAAN GAMING 3D Voxel Mountains and Supercar Showcase"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgError(true)}
                className="w-full h-full lg:h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/90 via-[#0B0E14]/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs text-amber-400 font-medium">Featured Engines</div>
                <div className="font-display text-lg sm:text-xl font-bold text-white">
                  CraftRealm 3D · BloxdSky · Nitro Horizon
                </div>
              </div>
              <button
                onClick={() => scrollToCatalog('All')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/15 backdrop-blur-sm whitespace-nowrap shrink-0"
              >
                Explore 52
              </button>
            </div>
          </div>
        </section>

        {/* Full-Width 4-Column Metric Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#121722] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-slate-400">Unique Games</div>
            <div className="font-mono-num text-2xl font-bold text-white mt-1">
              {GAMES_CATALOG.length}
            </div>
          </div>
          <div className="bg-[#121722] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-slate-400">Playable Levels</div>
            <div className="font-mono-num text-2xl font-bold text-amber-400 mt-1">
              {(GAMES_CATALOG.length * 100).toLocaleString()}
            </div>
          </div>
          <div className="bg-[#121722] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-slate-400">Difficulty Tiers</div>
            <div className="font-mono-num text-2xl font-bold text-emerald-400 mt-1">
              3 Modes
            </div>
          </div>
          <div className="bg-[#121722] border border-white/8 rounded-xl p-4">
            <div className="text-xs text-slate-400">Your Stars · Clears</div>
            <div className="font-mono-num text-2xl font-bold text-sky-400 mt-1">
              {stats.totalStars} · {stats.totalClears}
            </div>
          </div>
        </section>

        {/* Popular & Trending Hits (Minecraft, Bloxd.io, iPhone Hits) */}
        <section id="popular-section" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                Popular Spotlight
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Minecraft-inspired 3D voxel worlds, Bloxd.io parkour, and iPhone-style hits
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularGames.slice(0, 4).map((g) => {
              const prog = getGameCompletionCount(progress, g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => setLevelModalGame(g)}
                  className="group text-left bg-[#121722] hover:bg-[#161D2B] border border-white/8 hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all flex flex-col"
                >
                  <div className="relative h-40 w-full">
                    <GameArtwork
                      title={g.title}
                      motif={g.motif}
                      accentColor={g.accentColor}
                      coverImage={g.coverImage}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-amber-400 font-medium truncate">
                        {g.popularLabel || g.category} · 100 Levels
                      </div>
                      <h3 className="font-display text-base font-bold text-white mt-0.5 truncate">
                        {g.title}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{g.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                      <span>Easy · Med · Hard</span>
                      <span className="font-mono-num text-emerald-400">
                        {prog.levelsDone}/100 Done
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* All 52 Games Directory */}
        <section id="games-catalog" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                Complete Arcade Library ({filteredGames.length})
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Every game features unique mechanics, 100 progressive levels, and 3 difficulty modes
              </p>
            </div>

            {/* Search + Default Difficulty Switch */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 52 games..."
                  className="w-full h-11 pl-10 pr-4 bg-[#121722] border border-white/10 focus:border-amber-500 rounded-xl text-sm text-white placeholder:text-slate-500 outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#121722] border border-white/10 rounded-xl shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 hidden sm:block" />
                {(['easy', 'medium', 'difficult'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDefaultDiff(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors min-h-[34px] whitespace-nowrap ${
                      defaultDiff === d
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Horizontal Scrollable Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => {
              const active = category === cat;
              const count =
                cat === 'All'
                  ? GAMES_CATALOG.length
                  : GAMES_CATALOG.filter((g) => g.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] border ${
                    active
                      ? 'bg-white text-slate-950 border-white'
                      : 'bg-[#121722] text-slate-300 hover:text-white border-white/8 hover:border-white/20'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* 52-Game Responsive Grid */}
          {filteredGames.length === 0 ? (
            <div className="bg-[#121722] border border-white/8 rounded-2xl p-10 text-center space-y-3">
              <p className="text-sm text-slate-300">No games match "{searchQuery}".</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCategory('All');
                }}
                className="px-4 py-2 bg-amber-500 text-slate-950 text-xs font-semibold rounded-lg"
              >
                Show All 52 Games
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredGames.map((g, idx) => {
                const prog = getGameCompletionCount(progress, g.id);
                return (
                  <div
                    key={g.id}
                    className="group bg-[#121722] hover:bg-[#161D2B] border border-white/8 hover:border-amber-500/40 rounded-2xl overflow-hidden transition-all flex flex-col"
                  >
                    <button
                      onClick={() => setLevelModalGame(g)}
                      className="text-left flex-1 flex flex-col"
                    >
                      <div className="relative h-36 w-full">
                        <GameArtwork
                          title={g.title}
                          motif={g.motif}
                          accentColor={g.accentColor}
                          coverImage={g.coverImage}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between gap-2 w-full">
                        <div>
                          <div className="text-[11px] text-slate-400 truncate">
                            #{String(idx + 1).padStart(2, '0')} · {g.category}
                          </div>
                          <h3 className="font-display text-base font-bold text-white mt-0.5 truncate">
                            {g.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{g.subtitle}</p>
                        </div>
                      </div>
                    </button>

                    <div className="px-4 pb-3.5 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-400 font-mono-num flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span>{prog.levelsDone}/100</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setLevelModalGame(g)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#181F2C] hover:bg-slate-700 text-slate-200 text-xs font-medium min-h-[34px]"
                        >
                          Levels
                        </button>
                        <button
                          onClick={() => launchGame(g, defaultDiff, 1)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold min-h-[34px]"
                        >
                          Play
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Clean Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 mt-16 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>AYAAN GAMING · 52 Distinct Realistic Games · 100 Levels Per Game</div>
        <div>Easy · Medium · Difficult Modes</div>
      </footer>

      {/* Mobile Fixed Thumb Navigation Bar (<=15% sticky cap) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0B0E14]/95 backdrop-blur-md border-t border-white/10 pb-safe">
        <div className="grid grid-cols-4 h-14 items-center">
          <button
            onClick={() => scrollToCatalog('All')}
            className="flex flex-col items-center justify-center gap-0.5 text-slate-300 hover:text-amber-400 min-h-[44px]"
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-medium">All (52)</span>
          </button>
          <button
            onClick={() => {
              const el = document.getElementById('popular-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center gap-0.5 text-slate-300 hover:text-amber-400 min-h-[44px]"
          >
            <Flame className="w-5 h-5" />
            <span className="text-[10px] font-medium">Popular</span>
          </button>
          <button
            onClick={() => scrollToCatalog('3D Worlds')}
            className="flex flex-col items-center justify-center gap-0.5 text-slate-300 hover:text-amber-400 min-h-[44px]"
          >
            <Box className="w-5 h-5" />
            <span className="text-[10px] font-medium">3D Worlds</span>
          </button>
          <button
            onClick={() => handleQuickPlay()}
            className="flex flex-col items-center justify-center gap-0.5 text-amber-400 min-h-[44px]"
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] font-semibold">Quick Play</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
