import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameRuntimeProps } from '../types/game';
import { seededRandom, soundFX } from '../utils/audio';

export const PuzzleMatchRhythmGame: React.FC<GameRuntimeProps> = (props) => {
  switch (props.game.id) {
    case 'brick-forge':
      return <TetrisGame {...props} />;
    case 'titanium-2048':
      return <Game2048 {...props} />;
    case 'gem-cascade':
      return <GemCascadeGame {...props} />;
    case 'bubble-pop':
      return <BubblePopGame {...props} />;
    case 'tube-sort':
      return <TubeSortGame {...props} />;
    case 'sliding-15':
      return <Sliding15Game {...props} />;
    case 'memory-matrix':
      return <MemoryMatrixGame {...props} />;
    case 'word-grid-hunt':
      return <WordGridHuntGame {...props} />;
    case 'word-scramble':
      return <WordScrambleGame {...props} />;
    case 'piano-tempo':
      return <PianoTempoGame {...props} />;
    case 'acoustic-simon':
      return <AcousticSimonGame {...props} />;
    case 'reflex-strike':
      return <ReflexStrikeGame {...props} />;
    default:
      return <MathBlitzGame {...props} />;
  }
};

// =========================================================================
// 1. BRICK FORGE (Tetris)
// =========================================================================
const TETROMINOES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];
const TET_COLORS = ['#06B6D4', '#FACC15', '#A855F7', '#3B82F6', '#F97316', '#EF4444', '#10B981'];

const TetrisGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const ROWS = 16;
  const COLS = 10;
  const targetLines = 4 + Math.floor(level / 12);
  const [board, setBoard] = useState<string[][]>(() => Array.from({ length: ROWS }, () => Array(COLS).fill('')));
  const stateRef = useRef({
    board: Array.from({ length: ROWS }, () => Array(COLS).fill('')),
    shape: TETROMINOES[0],
    color: TET_COLORS[0],
    r: 0,
    c: 3,
    lines: 0,
    score: 0,
    ended: false,
  });
  const [, forceRender] = useState(0);

  const collides = (b: string[][], sh: number[][], r: number, c: number) => {
    for (let sr = 0; sr < sh.length; sr++) {
      for (let sc = 0; sc < sh[0].length; sc++) {
        if (!sh[sr][sc]) continue;
        const nr = r + sr;
        const nc = c + sc;
        if (nr >= ROWS || nc < 0 || nc >= COLS || (nr >= 0 && b[nr][nc])) return true;
      }
    }
    return false;
  };

  const spawn = () => {
    const s = stateRef.current;
    const idx = Math.floor(Math.random() * TETROMINOES.length);
    s.shape = TETROMINOES[idx];
    s.color = TET_COLORS[idx];
    s.r = 0;
    s.c = 3;
    if (collides(s.board, s.shape, s.r, s.c)) {
      s.ended = true;
      soundFX.fail();
      onLevelFail(s.score, 'Stack reached ceiling!');
    }
  };

  const lockPiece = () => {
    const s = stateRef.current;
    for (let sr = 0; sr < s.shape.length; sr++) {
      for (let sc = 0; sc < s.shape[0].length; sc++) {
        if (s.shape[sr][sc] && s.r + sr >= 0) s.board[s.r + sr][s.c + sc] = s.color;
      }
    }
    let cleared = 0;
    s.board = s.board.filter((row) => {
      if (row.every(Boolean)) {
        cleared++;
        return false;
      }
      return true;
    });
    while (s.board.length < ROWS) s.board.unshift(Array(COLS).fill(''));
    if (cleared > 0) {
      s.lines += cleared;
      s.score += cleared * 150;
      soundFX.score();
      onScoreChange(s.score);
    } else soundFX.click();
    onStatusChange(`Lines ${s.lines}/${targetLines}`);
    if (s.lines >= targetLines) {
      s.ended = true;
      soundFX.win();
      onLevelComplete(3, s.score + 250, `Cleared ${s.lines} lines!`);
      return;
    }
    spawn();
    setBoard(s.board.map((r) => [...r]));
  };

  const stepDown = () => {
    const s = stateRef.current;
    if (s.ended) return;
    if (!collides(s.board, s.shape, s.r + 1, s.c)) s.r += 1;
    else lockPiece();
    forceRender((v) => v + 1);
  };

  const move = (dc: number) => {
    const s = stateRef.current;
    if (s.ended) return;
    if (!collides(s.board, s.shape, s.r, s.c + dc)) {
      s.c += dc;
      soundFX.click();
      forceRender((v) => v + 1);
    }
  };

  const rotate = () => {
    const s = stateRef.current;
    if (s.ended) return;
    const rot = s.shape[0].map((_, c) => s.shape.map((row) => row[c]).reverse());
    if (!collides(s.board, rot, s.r, s.c)) {
      s.shape = rot;
      soundFX.click();
      forceRender((v) => v + 1);
    }
  };

  useEffect(() => {
    onStatusChange(`Lines 0/${targetLines}`);
    const ms = Math.max(180, (difficulty === 'easy' ? 620 : difficulty === 'medium' ? 460 : 320) - level * 2);
    const id = window.setInterval(stepDown, ms);
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') move(-1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') move(1);
      if (e.code === 'ArrowUp' || e.code === 'KeyW') rotate();
      if (e.code === 'ArrowDown' || e.code === 'Space') stepDown();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [level, difficulty, targetLines]);

  const s = stateRef.current;
  const display = board.map((row) => [...row]);
  for (let sr = 0; sr < s.shape.length; sr++) {
    for (let sc = 0; sc < s.shape[0].length; sc++) {
      if (s.shape[sr][sc] && s.r + sr >= 0 && s.r + sr < ROWS) {
        display[s.r + sr][s.c + sc] = s.color;
      }
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
      <div className="grid grid-cols-10 gap-0.5 bg-slate-900 p-2 rounded-xl border border-cyan-500/30 w-full max-w-[260px]">
        {display.map((row, r) =>
          row.map((col, c) => (
            <div
              key={`${r}-${c}`}
              className="aspect-square rounded-[2px]"
              style={{ backgroundColor: col || '#181F2C' }}
            />
          ))
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => move(-1)} className="w-14 h-12 rounded-xl bg-slate-800 text-white font-bold">◀</button>
        <button onClick={rotate} className="px-4 h-12 rounded-xl bg-cyan-600 text-white text-xs font-bold">Rotate</button>
        <button onClick={stepDown} className="px-4 h-12 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold">Drop</button>
        <button onClick={() => move(1)} className="w-14 h-12 rounded-xl bg-slate-800 text-white font-bold">▶</button>
      </div>
    </div>
  );
};

// =========================================================================
// 2. 2048 TITANIUM
// =========================================================================
const Game2048: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const targetTile = level <= 10 ? 64 : level <= 35 ? 128 : level <= 70 ? 256 : 512;
  const addTile = (g: number[][]) => {
    const empty: Array<[number, number]> = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (g[r][c] === 0) empty.push([r, c]);
    if (empty.length > 0) {
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      g[r][c] = Math.random() > 0.85 ? 4 : 2;
    }
  };
  const [grid, setGrid] = useState<number[][]>(() => {
    const g = Array.from({ length: 4 }, () => Array(4).fill(0));
    addTile(g);
    addTile(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    onStatusChange(`Target Tile: ${targetTile}`);
  }, [targetTile, onStatusChange]);

  const slide = (dir: 'L' | 'R' | 'U' | 'D') => {
    const g = grid.map((r) => [...r]);
    let moved = false;
    let gained = 0;

    const compressLine = (line: number[]) => {
      const nz = line.filter((x) => x !== 0);
      for (let i = 0; i < nz.length - 1; i++) {
        if (nz[i] === nz[i + 1]) {
          nz[i] *= 2;
          gained += nz[i];
          nz[i + 1] = 0;
        }
      }
      const res = nz.filter((x) => x !== 0);
      while (res.length < 4) res.push(0);
      return res;
    };

    for (let i = 0; i < 4; i++) {
      let line = dir === 'L' || dir === 'R' ? [...g[i]] : [g[0][i], g[1][i], g[2][i], g[3][i]];
      if (dir === 'R' || dir === 'D') line.reverse();
      const nextLine = compressLine(line);
      if (dir === 'R' || dir === 'D') nextLine.reverse();
      for (let j = 0; j < 4; j++) {
        if (dir === 'L' || dir === 'R') {
          if (g[i][j] !== nextLine[j]) moved = true;
          g[i][j] = nextLine[j];
        } else {
          if (g[j][i] !== nextLine[j]) moved = true;
          g[j][i] = nextLine[j];
        }
      }
    }

    if (!moved) return;
    addTile(g);
    setGrid(g);
    const nextScore = score + gained;
    setScore(nextScore);
    onScoreChange(nextScore);
    soundFX.click();

    const maxTile = Math.max(...g.flat());
    if (maxTile >= targetTile) {
      soundFX.win();
      onLevelComplete(3, nextScore + 300, `Forged tile ${maxTile}!`);
      return;
    }

    const canMove = (() => {
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (g[r][c] === 0) return true;
          if (g[r + 1]?.[c] === g[r][c] || g[r][c + 1] === g[r][c]) return true;
        }
      }
      return false;
    })();
    if (!canMove) {
      soundFX.fail();
      onLevelFail(nextScore, 'No legal merges remaining!');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') slide('L');
      if (e.code === 'ArrowRight' || e.code === 'KeyD') slide('R');
      if (e.code === 'ArrowUp' || e.code === 'KeyW') slide('U');
      if (e.code === 'ArrowDown' || e.code === 'KeyS') slide('D');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  void difficulty;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-3 p-2 game-surface-touch"
      onPointerDown={(e) => { swipeStart.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        if (!swipeStart.current) return;
        const dx = e.clientX - swipeStart.current.x;
        const dy = e.clientY - swipeStart.current.y;
        swipeStart.current = null;
        if (Math.hypot(dx, dy) < 20) return;
        if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? 'R' : 'L');
        else slide(dy > 0 ? 'D' : 'U');
      }}
    >
      <div className="grid grid-cols-4 gap-2 bg-slate-900 p-3 rounded-2xl border border-amber-500/30 w-full max-w-[340px] aspect-square">
        {grid.flat().map((v, idx) => (
          <div
            key={idx}
            className={`rounded-xl font-mono-num text-xl font-extrabold flex items-center justify-center ${
              v === 0
                ? 'bg-slate-800 text-transparent'
                : v <= 4
                ? 'bg-slate-700 text-white'
                : v <= 16
                ? 'bg-amber-600 text-white'
                : v <= 64
                ? 'bg-orange-500 text-white'
                : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {v || '.'}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div />
        <button onClick={() => slide('U')} className="w-12 h-11 rounded-lg bg-slate-800 text-white font-bold">▲</button>
        <div />
        <button onClick={() => slide('L')} className="w-12 h-11 rounded-lg bg-slate-800 text-white font-bold">◀</button>
        <button onClick={() => slide('D')} className="w-12 h-11 rounded-lg bg-slate-800 text-white font-bold">▼</button>
        <button onClick={() => slide('R')} className="w-12 h-11 rounded-lg bg-slate-800 text-white font-bold">▶</button>
      </div>
    </div>
  );
};

// =========================================================================
// 3. GEM CASCADE (Match-3)
// =========================================================================
const GEMS = ['#EF4444', '#38BDF8', '#10B981', '#F59E0B', '#A855F7'];

const GemCascadeGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const N = 6;
  const targetScore = 450 + level * 25;
  const [moves, setMoves] = useState(difficulty === 'easy' ? 18 : difficulty === 'medium' ? 14 : 11);
  const [score, setScore] = useState(0);
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [grid, setGrid] = useState<number[][]>(() => {
    const rand = seededRandom(level * 73);
    return Array.from({ length: N }, () => Array.from({ length: N }, () => Math.floor(rand() * GEMS.length)));
  });

  useEffect(() => {
    onStatusChange(`Score ${score}/${targetScore} · Moves ${moves}`);
  }, [score, targetScore, moves, onStatusChange]);

  const resolveMatches = (g: number[][]): { next: number[][]; cleared: number } => {
    const hit = Array.from({ length: N }, () => Array(N).fill(false));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N - 2; c++) {
        if (g[r][c] === g[r][c + 1] && g[r][c] === g[r][c + 2]) {
          hit[r][c] = hit[r][c + 1] = hit[r][c + 2] = true;
        }
      }
    }
    for (let c = 0; c < N; c++) {
      for (let r = 0; r < N - 2; r++) {
        if (g[r][c] === g[r + 1][c] && g[r][c] === g[r + 2][c]) {
          hit[r][c] = hit[r + 1][c] = hit[r + 2][c] = true;
        }
      }
    }
    let cleared = 0;
    const next = g.map((row) => [...row]);
    for (let c = 0; c < N; c++) {
      const colVals: number[] = [];
      for (let r = N - 1; r >= 0; r--) {
        if (!hit[r][c]) colVals.push(next[r][c]);
        else cleared++;
      }
      while (colVals.length < N) colVals.push(Math.floor(Math.random() * GEMS.length));
      for (let r = N - 1, idx = 0; r >= 0; r--, idx++) next[r][c] = colVals[idx];
    }
    return { next, cleared };
  };

  const tapGem = (r: number, c: number) => {
    if (!sel) {
      setSel([r, c]);
      soundFX.click();
      return;
    }
    const [sr, sc] = sel;
    setSel(null);
    if (Math.abs(sr - r) + Math.abs(sc - c) !== 1) return;

    const next = grid.map((row) => [...row]);
    [next[sr][sc], next[r][c]] = [next[r][c], next[sr][sc]];
    const res = resolveMatches(next);
    if (res.cleared === 0) {
      soundFX.hit();
      return;
    }

    let totalCleared = res.cleared;
    let cur = res.next;
    for (let cascade = 0; cascade < 3; cascade++) {
      const again = resolveMatches(cur);
      if (again.cleared === 0) break;
      totalCleared += again.cleared;
      cur = again.next;
    }

    const nextScore = score + totalCleared * 45;
    const nextMoves = moves - 1;
    setGrid(cur);
    setScore(nextScore);
    setMoves(nextMoves);
    onScoreChange(nextScore);
    soundFX.score();

    if (nextScore >= targetScore) {
      soundFX.win();
      onLevelComplete(3, nextScore + nextMoves * 50, 'Gem cascade target smashed!');
    } else if (nextMoves <= 0) {
      soundFX.fail();
      onLevelFail(nextScore, 'Out of gem swaps!');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="grid grid-cols-6 gap-1.5 bg-slate-900 p-2.5 rounded-2xl border border-pink-500/30 w-full max-w-[360px] aspect-square">
        {grid.map((row, r) =>
          row.map((gemIdx, c) => {
            const isSel = sel?.[0] === r && sel?.[1] === c;
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => tapGem(r, c)}
                className={`rounded-xl flex items-center justify-center transition-transform ${
                  isSel ? 'ring-2 ring-white scale-95 bg-slate-700' : 'bg-slate-800 hover:bg-slate-700'
                }`}
              >
                <span
                  className="w-[62%] h-[62%] rotate-45 rounded-sm"
                  style={{ backgroundColor: GEMS[gemIdx] }}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 4. BUBBLE POP RICOCHET
// =========================================================================
const BubblePopGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onScoreChange, onStatusChange, onLevelComplete, onLevelFail });
  cbRef.current = { onScoreChange, onStatusChange, onLevelComplete, onLevelFail };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 500;
    const H = 600;
    canvas.width = W;
    canvas.height = H;

    const rand = seededRandom(level * 89);
    const colors = ['#EF4444', '#38BDF8', '#10B981', '#F59E0B', '#A855F7'];
    const bubbles: Array<{ x: number; y: number; color: string }> = [];
    const rows = Math.min(6, 3 + Math.floor(level / 20));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 10; c++) {
        bubbles.push({
          x: 42 + c * 44 + (r % 2 === 1 ? 18 : 0),
          y: 44 + r * 40,
          color: colors[Math.floor(rand() * colors.length)],
        });
      }
    }

    let curColor = colors[Math.floor(rand() * colors.length)];
    let shot: { x: number; y: number; vx: number; vy: number; color: string } | null = null;
    let shotsLeft = Math.max(12, 24 - (difficulty === 'difficult' ? 6 : 0));
    let score = 0;
    let aimAngle = -Math.PI / 2;
    let ended = false;
    let rafId = 0;
    let lastT = performance.now();

    cbRef.current.onStatusChange(`Bubbles ${bubbles.length} · Shots ${shotsLeft}`);

    const getAim = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const py = ((e.clientY - rect.top) / rect.height) * H;
      aimAngle = Math.atan2(Math.min(H - 90, py) - (H - 50), px - W / 2);
    };

    const fire = (e: PointerEvent) => {
      if (shot || ended) return;
      getAim(e);
      shot = { x: W / 2, y: H - 50, vx: Math.cos(aimAngle) * 620, vy: Math.sin(aimAngle) * 620, color: curColor };
      curColor = colors[Math.floor(Math.random() * colors.length)];
      shotsLeft -= 1;
      soundFX.slice();
    };

    canvas.addEventListener('pointermove', getAim);
    canvas.addEventListener('pointerdown', fire);

    const loop = (now: number) => {
      if (ended) return;
      const dt = Math.min(0.04, (now - lastT) / 1000);
      lastT = now;

      if (shot) {
        shot.x += shot.vx * dt;
        shot.y += shot.vy * dt;
        if (shot.x < 20) { shot.x = 20; shot.vx = Math.abs(shot.vx); soundFX.bounce(); }
        if (shot.x > W - 20) { shot.x = W - 20; shot.vx = -Math.abs(shot.vx); soundFX.bounce(); }

        const hitBubble = bubbles.find((b) => Math.hypot(b.x - shot!.x, b.y - shot!.y) < 36);
        if (hitBubble || shot.y < 24) {
          const placed = { x: shot.x, y: shot.y, color: shot.color };
          bubbles.push(placed);
          shot = null;

          // BFS same-color cluster
          const cluster = [placed];
          const q = [placed];
          while (q.length > 0) {
            const cur = q.shift()!;
            for (const other of bubbles) {
              if (!cluster.includes(other) && other.color === cur.color && Math.hypot(other.x - cur.x, other.y - cur.y) < 50) {
                cluster.push(other);
                q.push(other);
              }
            }
          }
          if (cluster.length >= 3) {
            for (const rem of cluster) {
              const idx = bubbles.indexOf(rem);
              if (idx >= 0) bubbles.splice(idx, 1);
            }
            score += cluster.length * 60;
            soundFX.score();
            cbRef.current.onScoreChange(score);
          } else soundFX.click();

          cbRef.current.onStatusChange(`Bubbles ${bubbles.length} · Shots ${shotsLeft}`);
          if (bubbles.length <= 5) {
            ended = true;
            soundFX.win();
            cbRef.current.onLevelComplete(3, score + shotsLeft * 80, 'Canopy cleared!');
            return;
          }
          if (shotsLeft <= 0) {
            ended = true;
            soundFX.fail();
            cbRef.current.onLevelFail(score, 'Out of bubble shots!');
            return;
          }
        }
      }

      ctx.fillStyle = '#0D1322';
      ctx.fillRect(0, 0, W, H);
      for (const b of bubbles) {
        ctx.fillStyle = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, 19, 0, Math.PI * 2); ctx.fill();
      }
      if (shot) {
        ctx.fillStyle = shot.color;
        ctx.beginPath(); ctx.arc(shot.x, shot.y, 19, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(W / 2, H - 50);
      ctx.lineTo(W / 2 + Math.cos(aimAngle) * 140, H - 50 + Math.sin(aimAngle) * 140);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = curColor;
      ctx.beginPath(); ctx.arc(W / 2, H - 50, 19, 0, Math.PI * 2); ctx.fill();

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      ended = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointermove', getAim);
      canvas.removeEventListener('pointerdown', fire);
    };
  }, [level, difficulty]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0B0E14] rounded-2xl border border-white/10 p-2">
      <canvas ref={canvasRef} className="max-w-full max-h-full aspect-[5/6] rounded-xl game-surface-touch" />
    </div>
  );
};

// =========================================================================
// 5. TUBE SORT LAB
// =========================================================================
const TUBE_COLORS = ['#EF4444', '#38BDF8', '#10B981', '#F59E0B', '#A855F7'];

const TubeSortGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete }) => {
  const numColors = Math.min(5, 3 + Math.floor(level / 25) + (difficulty === 'difficult' ? 1 : 0));
  const [tubes, setTubes] = useState<number[][]>(() => {
    const rand = seededRandom(level * 149);
    const pool: number[] = [];
    for (let c = 0; c < numColors; c++) for (let k = 0; k < 4; k++) pool.push(c);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const res: number[][] = [];
    for (let c = 0; c < numColors; c++) res.push(pool.slice(c * 4, c * 4 + 4));
    res.push([], []);
    return res;
  });
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    onStatusChange(`Sort ${numColors} color flasks · Moves ${moves}`);
  }, [numColors, moves, onStatusChange]);

  const tapTube = (idx: number) => {
    if (sel === null) {
      if (tubes[idx].length > 0) {
        setSel(idx);
        soundFX.click();
      }
      return;
    }
    if (sel === idx) { setSel(null); return; }

    const src = [...tubes[sel]];
    const dst = [...tubes[idx]];
    const topColor = src[src.length - 1];
    if (dst.length < 4 && (dst.length === 0 || dst[dst.length - 1] === topColor)) {
      src.pop();
      dst.push(topColor);
      const next = tubes.map((t, i) => (i === sel ? src : i === idx ? dst : t));
      setTubes(next);
      setMoves(moves + 1);
      soundFX.bounce();
      if (next.every((t) => t.length === 0 || (t.length === 4 && t.every((x) => x === t[0])))) {
        const sc = Math.max(200, 700 - moves * 10);
        onScoreChange(sc);
        soundFX.win();
        onLevelComplete(3, sc, 'All chemical flasks sorted!');
      }
    } else soundFX.hit();
    setSel(null);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="flex flex-wrap justify-center gap-4 max-w-md">
        {tubes.map((tube, idx) => (
          <button
            key={idx}
            onClick={() => tapTube(idx)}
            className={`w-14 h-40 rounded-b-2xl border-2 flex flex-col-reverse p-1.5 gap-1 transition-transform ${
              sel === idx ? 'border-amber-400 -translate-y-2 bg-slate-800' : 'border-slate-500 bg-slate-900/80'
            }`}
          >
            {tube.map((cIdx, bIdx) => (
              <div
                key={bIdx}
                className="w-full h-7 rounded-md"
                style={{ backgroundColor: TUBE_COLORS[cIdx] }}
              />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// 6. SLIDING 15 MATRIX
// =========================================================================
const Sliding15Game: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete }) => {
  const N = level <= 15 && difficulty === 'easy' ? 3 : 4;
  const [tiles, setTiles] = useState<number[]>(() => {
    const arr = Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N));
    const rand = seededRandom(level * 53);
    let empty = N * N - 1;
    const steps = 35 + Math.min(80, level);
    for (let s = 0; s < steps; s++) {
      const r = Math.floor(empty / N);
      const c = empty % N;
      const nbrs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([rr, cc]) => rr >= 0 && rr < N && cc >= 0 && cc < N);
      const [nr, nc] = nbrs[Math.floor(rand() * nbrs.length)];
      const ni = nr * N + nc;
      [arr[empty], arr[ni]] = [arr[ni], arr[empty]];
      empty = ni;
    }
    return arr;
  });
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    onStatusChange(`Moves: ${moves} · Arrange 1 to ${N * N - 1}`);
  }, [moves, N, onStatusChange]);

  const tapTile = (idx: number) => {
    const empty = tiles.indexOf(0);
    const r1 = Math.floor(idx / N); const c1 = idx % N;
    const r2 = Math.floor(empty / N); const c2 = empty % N;
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return;
    const next = [...tiles];
    [next[idx], next[empty]] = [next[empty], next[idx]];
    setTiles(next);
    setMoves(moves + 1);
    soundFX.click();

    if (next.every((v, i) => (i === N * N - 1 ? v === 0 : v === i + 1))) {
      const sc = Math.max(200, 800 - moves * 8);
      onScoreChange(sc);
      soundFX.win();
      onLevelComplete(3, sc, `Matrix solved in ${moves + 1} slides!`);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div
        className={`grid gap-2 bg-slate-900 p-3 rounded-2xl border border-blue-500/30 w-full max-w-[340px] aspect-square ${
          N === 3 ? 'grid-cols-3' : 'grid-cols-4'
        }`}
      >
        {tiles.map((v, idx) => (
          <button
            key={idx}
            onClick={() => tapTile(idx)}
            className={`rounded-xl font-mono-num text-xl font-bold flex items-center justify-center transition-colors ${
              v === 0 ? 'bg-transparent' : 'bg-blue-600 hover:bg-blue-500 text-white shadow'
            }`}
          >
            {v || ''}
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// 7. MEMORY MATRIX
// =========================================================================
const MEM_SYMBOLS = ['◆', '★', '▲', '●', '♣', '♠', '♥', '✦'];

const MemoryMatrixGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const pairs = Math.min(8, 4 + Math.floor(level / 20));
  const [cards] = useState<string[]>(() => {
    const rand = seededRandom(level * 179);
    const pool = [...MEM_SYMBOLS.slice(0, pairs), ...MEM_SYMBOLS.slice(0, pairs)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool;
  });
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [flipsLeft, setFlipsLeft] = useState(pairs * (difficulty === 'easy' ? 4 : difficulty === 'medium' ? 3 : 2) + 4);

  useEffect(() => {
    onStatusChange(`Matched ${matched.length / 2}/${pairs} · Turns Left ${flipsLeft}`);
  }, [matched, pairs, flipsLeft, onStatusChange]);

  const tapCard = (idx: number) => {
    if (flipped.length >= 2 || flipped.includes(idx) || matched.includes(idx)) return;
    const nf = [...flipped, idx];
    setFlipped(nf);
    soundFX.click();

    if (nf.length === 2) {
      const [a, b] = nf;
      const nextFlips = flipsLeft - 1;
      setFlipsLeft(nextFlips);
      if (cards[a] === cards[b]) {
        const nm = [...matched, a, b];
        setMatched(nm);
        setFlipped([]);
        onScoreChange(nm.length * 60);
        soundFX.score();
        if (nm.length === cards.length) {
          soundFX.win();
          onLevelComplete(3, nm.length * 70 + nextFlips * 30, 'All symbol pairs matched!');
        }
      } else {
        setTimeout(() => {
          setFlipped([]);
          if (nextFlips <= 0) {
            soundFX.fail();
            onLevelFail(matched.length * 50, 'Out of flip attempts!');
          }
        }, 550);
      }
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="grid grid-cols-4 gap-2.5 w-full max-w-[360px]">
        {cards.map((sym, idx) => {
          const open = flipped.includes(idx) || matched.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => tapCard(idx)}
              className={`aspect-square rounded-xl text-2xl font-bold flex items-center justify-center border transition-all ${
                matched.includes(idx)
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : open
                  ? 'bg-purple-600 border-purple-400 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-500'
              }`}
            >
              {open ? sym : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// 8. WORD GRID HUNT & 9. WORD SCRAMBLE
// =========================================================================
const WORD_BANK = [
  'CRAFT', 'PIXEL', 'BLOXD', 'ARENA', 'QUEST', 'SCORE', 'POWER', 'SPEED', 'LASER', 'ORBIT',
  'TURBO', 'SPARK', 'BLADE', 'STONE', 'FORGE', 'TOWER', 'DRIFT', 'CHESS', 'PULSE', 'BRAVE',
];

const WordGridHuntGame: React.FC<GameRuntimeProps> = ({ level, onScoreChange, onStatusChange, onLevelComplete }) => {
  const N = 7;
  const { grid, targetWords, positions } = useMemo(() => {
    const rand = seededRandom(level * 37);
    const w1 = WORD_BANK[level % WORD_BANK.length];
    const w2 = WORD_BANK[(level + 7) % WORD_BANK.length];
    const words = [w1, w2];
    const g = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => String.fromCharCode(65 + Math.floor(rand() * 26)))
    );
    const pos: Record<string, string[]> = {};
    // Place w1 horizontally on row 1, w2 vertically on col 5
    const r1 = 1;
    const c1 = 1;
    pos[w1] = [];
    for (let i = 0; i < w1.length; i++) {
      g[r1][c1 + i] = w1[i];
      pos[w1].push(`${r1},${c1 + i}`);
    }
    const r2 = 2;
    const c2 = 5;
    pos[w2] = [];
    for (let i = 0; i < w2.length; i++) {
      g[r2 + i][c2] = w2[i];
      pos[w2].push(`${r2 + i},${c2}`);
    }
    return { grid: g, targetWords: words, positions: pos };
  }, [level]);

  const [selected, setSelected] = useState<string[]>([]);
  const [found, setFound] = useState<string[]>([]);

  useEffect(() => {
    onStatusChange(`Found ${found.length}/${targetWords.length} words`);
  }, [found, targetWords, onStatusChange]);

  const tapCell = (r: number, c: number) => {
    const key = `${r},${c}`;
    const nextSel = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(nextSel);
    soundFX.click();

    for (const w of targetWords) {
      if (found.includes(w)) continue;
      if (positions[w].every((k) => nextSel.includes(k))) {
        const nf = [...found, w];
        setFound(nf);
        setSelected([]);
        onScoreChange(nf.length * 250);
        soundFX.score();
        if (nf.length === targetWords.length) {
          soundFX.win();
          onLevelComplete(3, 600, 'Found every hidden word!');
        }
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2">
      <div className="flex items-center gap-4 text-sm font-bold">
        {targetWords.map((w) => (
          <span key={w} className={found.includes(w) ? 'line-through text-emerald-400' : 'text-teal-300'}>
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5 bg-slate-900 p-2.5 rounded-xl border border-teal-500/30 w-full max-w-[360px] aspect-square">
        {grid.map((row, r) =>
          row.map((ch, c) => {
            const k = `${r},${c}`;
            const isFound = found.some((w) => positions[w].includes(k));
            const isSel = selected.includes(k);
            return (
              <button
                key={k}
                onClick={() => tapCell(r, c)}
                className={`rounded-lg font-mono-num text-base font-bold flex items-center justify-center ${
                  isFound
                    ? 'bg-emerald-500 text-slate-950'
                    : isSel
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
                }`}
              >
                {ch}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

const WordScrambleGame: React.FC<GameRuntimeProps> = ({ level, onScoreChange, onStatusChange, onLevelComplete }) => {
  const target = WORD_BANK[(level * 3) % WORD_BANK.length];
  const letters = useMemo(() => {
    const rand = seededRandom(level * 19);
    const arr = target.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [target, level]);

  const [pickedIndices, setPickedIndices] = useState<number[]>([]);

  useEffect(() => {
    onStatusChange(`Unscramble the 5-letter gaming word`);
  }, [onStatusChange]);

  const pickTile = (idx: number) => {
    if (pickedIndices.includes(idx)) return;
    const next = [...pickedIndices, idx];
    setPickedIndices(next);
    soundFX.click();
    if (next.length === target.length) {
      const word = next.map((i) => letters[i]).join('');
      if (word === target) {
        onScoreChange(500);
        soundFX.win();
        onLevelComplete(3, 500, `Decoded "${target}"!`);
      } else {
        soundFX.hit();
        setTimeout(() => setPickedIndices([]), 350);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-4">
      <div className="flex gap-2">
        {target.split('').map((_, i) => (
          <div
            key={i}
            className="w-12 h-14 rounded-xl bg-slate-900 border-2 border-orange-500/40 font-mono-num text-2xl font-extrabold flex items-center justify-center text-white"
          >
            {pickedIndices[i] !== undefined ? letters[pickedIndices[i]] : ''}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {letters.map((ch, idx) => (
          <button
            key={idx}
            disabled={pickedIndices.includes(idx)}
            onClick={() => pickTile(idx)}
            className={`w-12 h-14 rounded-xl font-mono-num text-xl font-extrabold transition-all ${
              pickedIndices.includes(idx)
                ? 'bg-slate-800 text-slate-600'
                : 'bg-orange-500 hover:bg-orange-400 text-slate-950 shadow-lg'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>
      <button
        onClick={() => setPickedIndices([])}
        className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white"
      >
        Clear Slots
      </button>
    </div>
  );
};

// =========================================================================
// 10. PIANO TEMPO
// =========================================================================
const PianoTempoGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const targetHits = 12 + Math.floor(level / 6);
  const [tiles, setTiles] = useState<Array<{ id: number; lane: number; y: number }>>([
    { id: 1, lane: 0, y: 10 },
    { id: 2, lane: 2, y: -20 },
    { id: 3, lane: 1, y: -50 },
  ]);
  const stateRef = useRef({ hits: 0, misses: 0, nextId: 4, ended: false });
  const notes = [0, 4, 7, 12];

  useEffect(() => {
    onStatusChange(`Notes 0/${targetHits}`);
    const speed = (38 + level * 0.4) * (difficulty === 'easy' ? 0.8 : difficulty === 'medium' ? 1 : 1.25);
    const id = window.setInterval(() => {
      if (stateRef.current.ended) return;
      setTiles((prev) => {
        const moved = prev.map((t) => ({ ...t, y: t.y + speed * 0.04 }));
        const missed = moved.filter((t) => t.y > 96);
        if (missed.length > 0) {
          stateRef.current.misses += missed.length;
          if (stateRef.current.misses >= 4) {
            stateRef.current.ended = true;
            soundFX.fail();
            onLevelFail(stateRef.current.hits * 80, 'Missed too many tempo keys!');
          }
        }
        const kept = moved.filter((t) => t.y <= 96);
        if (kept.length < 3) {
          kept.push({
            id: stateRef.current.nextId++,
            lane: Math.floor(Math.random() * 4),
            y: -18,
          });
        }
        return kept;
      });
    }, 35);
    return () => window.clearInterval(id);
  }, [level, difficulty, targetHits, onLevelFail, onStatusChange]);

  const hitLane = (lane: number) => {
    if (stateRef.current.ended) return;
    setTiles((prev) => {
      const target = prev.find((t) => t.lane === lane && t.y >= 55 && t.y <= 94);
      if (!target) {
        soundFX.hit();
        return prev;
      }
      soundFX.note(notes[lane]);
      stateRef.current.hits += 1;
      onScoreChange(stateRef.current.hits * 100);
      onStatusChange(`Notes ${stateRef.current.hits}/${targetHits}`);
      if (stateRef.current.hits >= targetHits) {
        stateRef.current.ended = true;
        soundFX.win();
        onLevelComplete(3, stateRef.current.hits * 110, 'Rhythm track perfected!');
      }
      return prev.filter((t) => t.id !== target.id);
    });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="relative w-full max-w-[320px] h-[420px] bg-slate-950 rounded-2xl border border-rose-500/30 overflow-hidden grid grid-cols-4">
        {[0, 1, 2, 3].map((lane) => (
          <div key={lane} className="relative border-r border-white/5 last:border-r-0">
            {tiles
              .filter((t) => t.lane === lane)
              .map((t) => (
                <div
                  key={t.id}
                  className="absolute left-1.5 right-1.5 h-16 rounded-lg bg-rose-500 shadow-lg"
                  style={{ top: `${t.y}%` }}
                />
              ))}
          </div>
        ))}
        <div className="absolute left-0 right-0 bottom-16 h-1 bg-amber-400/70 pointer-events-none" />
        <div className="absolute left-0 right-0 bottom-0 h-16 grid grid-cols-4 bg-slate-900 border-t border-white/10">
          {[0, 1, 2, 3].map((lane) => (
            <button
              key={lane}
              onPointerDown={() => hitLane(lane)}
              className="border-r border-white/10 last:border-r-0 text-xs font-bold text-slate-300 active:bg-rose-500 active:text-white"
            >
              KEY {lane + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 11. ACOUSTIC SIMON
// =========================================================================
const SIMON_PADS = [
  { color: '#10B981', note: 0, label: 'C' },
  { color: '#EF4444', note: 4, label: 'E' },
  { color: '#FACC15', note: 7, label: 'G' },
  { color: '#3B82F6', note: 12, label: 'C+' },
];

const AcousticSimonGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const seqLen = Math.min(9, 3 + Math.floor(level / 15) + (difficulty === 'difficult' ? 2 : 0));
  const sequence = useMemo(() => {
    const rand = seededRandom(level * 211);
    return Array.from({ length: seqLen }, () => Math.floor(rand() * 4));
  }, [level, seqLen]);

  const [lit, setLit] = useState<number | null>(null);
  const [playingDemo, setPlayingDemo] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setPlayingDemo(true);
    onStatusChange(`Listen closely (${seqLen} notes)...`);
    const timers: number[] = [];
    sequence.forEach((padIdx, i) => {
      timers.push(
        window.setTimeout(() => {
          setLit(padIdx);
          soundFX.note(SIMON_PADS[padIdx].note);
        }, 450 + i * 520)
      );
      timers.push(window.setTimeout(() => setLit(null), 450 + i * 520 + 300));
    });
    timers.push(
      window.setTimeout(() => {
        setPlayingDemo(false);
        onStatusChange(`Repeat sequence (0/${seqLen})`);
      }, 450 + sequence.length * 520)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [sequence, seqLen, onStatusChange]);

  const tapPad = (idx: number) => {
    if (playingDemo) return;
    setLit(idx);
    soundFX.note(SIMON_PADS[idx].note);
    setTimeout(() => setLit(null), 220);

    if (sequence[step] === idx) {
      const nextStep = step + 1;
      setStep(nextStep);
      onScoreChange(nextStep * 100);
      onStatusChange(`Repeat sequence (${nextStep}/${seqLen})`);
      if (nextStep >= seqLen) {
        soundFX.win();
        onLevelComplete(3, seqLen * 150, 'Harmonic sequence recalled!');
      }
    } else {
      soundFX.fail();
      onLevelFail(step * 100, 'Wrong harmonic pad pressed!');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="grid grid-cols-2 gap-4 w-full max-w-[320px] aspect-square">
        {SIMON_PADS.map((pad, idx) => (
          <button
            key={idx}
            onClick={() => tapPad(idx)}
            className={`rounded-3xl border-2 transition-all font-display text-xl font-bold ${
              lit === idx ? 'scale-95 brightness-150 border-white' : 'opacity-80 border-white/10'
            }`}
            style={{ backgroundColor: pad.color, color: '#0B0E14' }}
          >
            {pad.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// 12. REFLEX STRIKE
// =========================================================================
const ReflexStrikeGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const targetScore = 8 + Math.floor(level / 8);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isHazard, setIsHazard] = useState(false);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(difficulty === 'easy' ? 24 : difficulty === 'medium' ? 18 : 14);

  useEffect(() => {
    onStatusChange(`Hits ${score}/${targetScore} · ${timeLeft}s`);
  }, [score, targetScore, timeLeft, onStatusChange]);

  useEffect(() => {
    const tickMs = Math.max(460, (difficulty === 'easy' ? 950 : difficulty === 'medium' ? 760 : 580) - level * 3);
    const padTimer = window.setInterval(() => {
      setActiveIdx(Math.floor(Math.random() * 9));
      setIsHazard(Math.random() < 0.22);
    }, tickMs);
    const secTimer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          soundFX.fail();
          onLevelFail(scoreRef.current * 100, 'Time expired!');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(padTimer);
      window.clearInterval(secTimer);
    };
  }, [level, difficulty, onLevelFail]);

  const tapPad = (idx: number) => {
    if (idx !== activeIdx) return;
    if (isHazard) {
      soundFX.fail();
      onLevelFail(score * 100, 'Tapped a red hazard mine!');
      return;
    }
    const ns = score + 1;
    scoreRef.current = ns;
    setScore(ns);
    onScoreChange(ns * 100);
    soundFX.score();
    setActiveIdx((idx + 1 + Math.floor(Math.random() * 7)) % 9);
    if (ns >= targetScore) {
      soundFX.win();
      onLevelComplete(3, ns * 120 + timeLeft * 30, 'Lightning reflexes!');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="grid grid-cols-3 gap-3 w-full max-w-[340px] aspect-square">
        {Array.from({ length: 9 }, (_, i) => {
          const active = i === activeIdx;
          return (
            <button
              key={i}
              onPointerDown={() => tapPad(i)}
              className={`rounded-2xl border transition-colors font-bold ${
                active
                  ? isHazard
                    ? 'bg-rose-500 border-rose-300 text-white'
                    : 'bg-emerald-500 border-emerald-300 text-slate-950'
                  : 'bg-slate-800 border-white/10 text-slate-600'
              }`}
            >
              {active ? (isHazard ? 'BOMB' : 'HIT') : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// 13. MATH BLITZ ARENA
// =========================================================================
const MathBlitzGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const goal = 6 + Math.floor(level / 14);
  const [round, setRound] = useState(0);
  const roundRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(difficulty === 'easy' ? 28 : difficulty === 'medium' ? 22 : 16);

  const problem = useMemo(() => {
    const rand = seededRandom(level * 313 + round * 17);
    const maxN = 10 + Math.floor(level * 0.6);
    const a = 2 + Math.floor(rand() * maxN);
    const b = 2 + Math.floor(rand() * maxN);
    const op = round % 3 === 0 ? '+' : round % 3 === 1 ? '-' : '×';
    const ans = op === '+' ? a + b : op === '-' ? a - b : a * Math.min(12, b);
    const bb = op === '×' ? Math.min(12, b) : b;
    const opts = new Set<number>([ans]);
    while (opts.size < 4) {
      opts.add(ans + Math.floor((rand() - 0.5) * 14) || ans + 3);
    }
    return {
      text: `${a} ${op} ${bb} = ?`,
      ans,
      choices: Array.from(opts).sort((x, y) => x - y),
    };
  }, [level, round]);

  useEffect(() => {
    onStatusChange(`Solved ${round}/${goal} · ${timeLeft}s`);
  }, [round, goal, timeLeft, onStatusChange]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          soundFX.fail();
          onLevelFail(roundRef.current * 100, 'Clock ran out!');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onLevelFail]);

  const answer = (val: number) => {
    if (val === problem.ans) {
      const nr = round + 1;
      roundRef.current = nr;
      setRound(nr);
      onScoreChange(nr * 120);
      soundFX.score();
      if (nr >= goal) {
        soundFX.win();
        onLevelComplete(3, nr * 140 + timeLeft * 25, 'Mental math arena cleared!');
      }
    } else {
      soundFX.fail();
      onLevelFail(round * 100, `Incorrect! ${problem.text.replace('?', String(problem.ans))}`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-4">
      <div className="px-8 py-6 rounded-2xl bg-slate-900 border border-sky-500/30 font-mono-num text-3xl sm:text-4xl font-extrabold text-white">
        {problem.text}
      </div>
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {problem.choices.map((c) => (
          <button
            key={c}
            onClick={() => answer(c)}
            className="py-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono-num text-xl font-bold active:scale-95 transition-transform"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
};
