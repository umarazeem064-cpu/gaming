import React, { useEffect, useMemo, useState } from 'react';
import { GameRuntimeProps } from '../types/game';
import { seededRandom, soundFX } from '../utils/audio';

export const StrategyBoardGame: React.FC<GameRuntimeProps> = ({
  game,
  level,
  difficulty,
  onScoreChange,
  onStatusChange,
  onLevelComplete,
  onLevelFail,
}) => {
  if (game.id === 'chess-master') {
    return <ChessGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
  }
  if (game.id === 'checkers-royale') {
    return <CheckersGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
  }
  if (game.id === 'connect-four') {
    return <ConnectFourGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
  }
  if (game.id === 'gomoku-five') {
    return <GomokuGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
  }
  if (game.id === 'sudoku-vault') {
    return <SudokuGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
  }
  if (game.id === 'minesweeper-ops') {
    return <MinesweeperGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
  }
  if (game.id === 'pipe-conduit') {
    return <PipeConduitGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
  }
  return <LaserPrismGame game={game} level={level} difficulty={difficulty} soundEnabled onScoreChange={onScoreChange} onStatusChange={onStatusChange} onLevelComplete={onLevelComplete} onLevelFail={onLevelFail} />;
};

// =========================================================================
// 1. CHESS MASTER AI
// =========================================================================
type ChessPiece = string | null; // 'wK','wQ','wR','wB','wN','wP' / 'bK'...
const PIECE_GLYPH: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};
const PIECE_VAL: Record<string, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };

function createSeededChessBoard(level: number): ChessPiece[][] {
  const b: ChessPiece[][] = [
    ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
    ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
    ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
  ];
  // Vary midgame handicap/tactical setups on higher levels
  if (level % 3 === 0) {
    b[1][4] = null;
    b[3][4] = 'bP';
    b[6][4] = null;
    b[4][4] = 'wP';
  } else if (level % 3 === 2) {
    b[0][1] = null;
    b[2][2] = 'bN';
  }
  return b;
}

function getPseudoMoves(board: ChessPiece[][], r: number, c: number): Array<[number, number]> {
  const p = board[r][c];
  if (!p) return [];
  const color = p[0];
  const type = p[1];
  const moves: Array<[number, number]> = [];
  const inB = (rr: number, cc: number) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;

  const slide = (dirs: Array<[number, number]>) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inB(nr, nc)) {
        const t = board[nr][nc];
        if (!t) moves.push([nr, nc]);
        else {
          if (t[0] !== color) moves.push([nr, nc]);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (inB(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      if (r === startRow && !board[r + dir * 2][c]) moves.push([r + dir * 2, c]);
    }
    for (const dc of [-1, 1]) {
      if (inB(r + dir, c + dc) && board[r + dir][c + dc] && board[r + dir][c + dc]![0] !== color) {
        moves.push([r + dir, c + dc]);
      }
    }
  } else if (type === 'N') {
    [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => {
      const nr = r + dr; const nc = c + dc;
      if (inB(nr, nc) && (!board[nr][nc] || board[nr][nc]![0] !== color)) moves.push([nr, nc]);
    });
  } else if (type === 'B') {
    slide([[-1, -1], [-1, 1], [1, -1], [1, 1]]);
  } else if (type === 'R') {
    slide([[-1, 0], [1, 0], [0, -1], [0, 1]]);
  } else if (type === 'Q') {
    slide([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]);
  } else if (type === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr; const nc = c + dc;
        if (inB(nr, nc) && (!board[nr][nc] || board[nr][nc]![0] !== color)) moves.push([nr, nc]);
      }
    }
  }
  return moves;
}

const ChessGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const [board, setBoard] = useState<ChessPiece[][]>(() => createSeededChessBoard(level));
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [captures, setCaptures] = useState(0);
  const goalCaptures = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;

  useEffect(() => {
    onStatusChange(`White Turn · Capture ${captures}/${goalCaptures} pts or Checkmate`);
  }, [captures, goalCaptures, onStatusChange]);

  const legalMoves = useMemo(() => {
    if (!selected) return [];
    return getPseudoMoves(board, selected[0], selected[1]);
  }, [board, selected]);

  const makeBotMove = (curBoard: ChessPiece[][], curCap: number) => {
    const candidates: Array<{ fr: number; fc: number; tr: number; tc: number; score: number }> = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (curBoard[r][c]?.[0] === 'b') {
          for (const [tr, tc] of getPseudoMoves(curBoard, r, c)) {
            const tgt = curBoard[tr][tc];
            const val = tgt ? PIECE_VAL[tgt[1]] * 10 : 0;
            const centerBonus = (3.5 - Math.abs(tr - 3.5)) + (3.5 - Math.abs(tc - 3.5));
            candidates.push({ fr: r, fc: c, tr, tc, score: val + (difficulty === 'easy' ? Math.random() * 6 : centerBonus) });
          }
        }
      }
    }
    if (candidates.length === 0) {
      soundFX.win();
      onLevelComplete(3, curCap * 150 + 300, 'Opponent has no legal moves!');
      return;
    }
    candidates.sort((a, b) => b.score - a.score);
    const pick = difficulty === 'easy' ? candidates[Math.min(candidates.length - 1, Math.floor(Math.random() * 4))] : candidates[0];
    const next = curBoard.map((row) => [...row]);
    const captured = next[pick.tr][pick.tc];
    next[pick.tr][pick.tc] = next[pick.fr][pick.fc];
    if (next[pick.tr][pick.tc] === 'bP' && pick.tr === 7) next[pick.tr][pick.tc] = 'bQ';
    next[pick.fr][pick.fc] = null;
    setBoard(next);
    setTurn('w');
    if (captured === 'wK') {
      soundFX.fail();
      onLevelFail(curCap * 100, 'Your King was captured!');
    }
  };

  const handleSquare = (r: number, c: number) => {
    if (turn !== 'w') return;
    const isDest = legalMoves.some(([mr, mc]) => mr === r && mc === c);
    if (selected && isDest) {
      const next = board.map((row) => [...row]);
      const target = next[r][c];
      next[r][c] = next[selected[0]][selected[1]];
      if (next[r][c] === 'wP' && r === 0) next[r][c] = 'wQ';
      next[selected[0]][selected[1]] = null;
      setSelected(null);
      setBoard(next);
      soundFX.click();

      let nextCap = captures;
      if (target) {
        nextCap += PIECE_VAL[target[1]];
        setCaptures(nextCap);
        onScoreChange(nextCap * 120);
        soundFX.score();
      }
      if (target === 'bK' || nextCap >= goalCaptures) {
        soundFX.win();
        onLevelComplete(3, nextCap * 150 + 250, target === 'bK' ? 'Checkmate!' : 'Decisive material victory!');
        return;
      }
      setTurn('b');
      setTimeout(() => makeBotMove(next, nextCap), 420);
      return;
    }
    if (board[r][c]?.[0] === 'w') {
      setSelected([r, c]);
      soundFX.click();
    } else {
      setSelected(null);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="grid grid-cols-8 w-full max-w-[440px] aspect-square border-4 border-amber-800/70 rounded-xl overflow-hidden shadow-2xl">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleSquare(r, c)}
                className={`relative flex items-center justify-center text-2xl sm:text-3xl select-none transition-colors ${
                  isSel
                    ? 'bg-amber-400 text-slate-950'
                    : dark
                    ? 'bg-[#334155]'
                    : 'bg-[#CBD5E1]'
                }`}
              >
                {isLegal && (
                  <span className="absolute w-3 h-3 rounded-full bg-emerald-500/80" />
                )}
                <span className={piece?.[0] === 'w' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : 'text-slate-950'}>
                  {piece ? PIECE_GLYPH[piece] : ''}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 2. CHECKERS ROYALE
// =========================================================================
type Checker = { color: 'r' | 'b'; king: boolean } | null;

const CheckersGame: React.FC<GameRuntimeProps> = ({ difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const [board, setBoard] = useState<Checker[][]>(() => {
    const b: Checker[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) b[r][c] = { color: 'b', king: false };
          if (r > 4) b[r][c] = { color: 'r', king: false };
        }
      }
    }
    return b;
  });
  const [sel, setSel] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);

  const getMoves = (b: Checker[][], r: number, c: number) => {
    const p = b[r][c];
    if (!p) return [];
    const dirs = p.king ? [-1, 1] : p.color === 'r' ? [-1] : [1];
    const res: Array<{ tr: number; tc: number; cap?: [number, number] }> = [];
    for (const dr of dirs) {
      for (const dc of [-1, 1]) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (!b[nr][nc]) res.push({ tr: nr, tc: nc });
          else if (b[nr][nc]!.color !== p.color) {
            const jr = nr + dr;
            const jc = nc + dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !b[jr][jc]) {
              res.push({ tr: jr, tc: jc, cap: [nr, nc] });
            }
          }
        }
      }
    }
    return res;
  };

  useEffect(() => {
    onStatusChange('Red Turn · Capture opponent pieces');
  }, [onStatusChange]);

  const legal = useMemo(() => (sel ? getMoves(board, sel[0], sel[1]) : []), [board, sel]);

  const runAi = (b: Checker[][], curScore: number) => {
    const opts: Array<{ fr: number; fc: number; tr: number; tc: number; cap?: [number, number] }> = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]?.color === 'b') {
          for (const m of getMoves(b, r, c)) opts.push({ fr: r, fc: c, ...m });
        }
      }
    }
    if (opts.length === 0) {
      soundFX.win();
      onLevelComplete(3, curScore + 300, 'Opponent blocked!');
      return;
    }
    opts.sort((a, b2) => (b2.cap ? 1 : 0) - (a.cap ? 1 : 0));
    const pick = difficulty === 'easy' ? opts[Math.floor(Math.random() * opts.length)] : opts[0];
    const next = b.map((row) => [...row]);
    next[pick.tr][pick.tc] = { ...next[pick.fr][pick.fc]!, king: next[pick.fr][pick.fc]!.king || pick.tr === 7 };
    next[pick.fr][pick.fc] = null;
    if (pick.cap) next[pick.cap[0]][pick.cap[1]] = null;
    setBoard(next);
    const redLeft = next.flat().filter((x) => x?.color === 'r').length;
    if (redLeft === 0) {
      soundFX.fail();
      onLevelFail(curScore, 'All your checkers were captured!');
    }
  };

  const tapCell = (r: number, c: number) => {
    const mv = legal.find((m) => m.tr === r && m.tc === c);
    if (sel && mv) {
      const next = board.map((row) => [...row]);
      const piece = next[sel[0]][sel[1]]!;
      next[r][c] = { color: 'r', king: piece.king || r === 0 };
      next[sel[0]][sel[1]] = null;
      let nextScore = score;
      if (mv.cap) {
        next[mv.cap[0]][mv.cap[1]] = null;
        nextScore += 150;
        setScore(nextScore);
        onScoreChange(nextScore);
        soundFX.score();
      } else {
        soundFX.click();
      }
      setSel(null);
      setBoard(next);
      const blackLeft = next.flat().filter((x) => x?.color === 'b').length;
      if (blackLeft <= (difficulty === 'easy' ? 7 : 4)) {
        soundFX.win();
        onLevelComplete(3, nextScore + 300, 'Dominated the checkers board!');
        return;
      }
      setTimeout(() => runAi(next, nextScore), 380);
      return;
    }
    if (board[r][c]?.color === 'r') {
      setSel([r, c]);
      soundFX.click();
    } else setSel(null);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="grid grid-cols-8 w-full max-w-[440px] aspect-square border-4 border-slate-700 rounded-xl overflow-hidden">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const isSel = sel?.[0] === r && sel?.[1] === c;
            const isDest = legal.some((m) => m.tr === r && m.tc === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => tapCell(r, c)}
                className={`relative flex items-center justify-center ${
                  isSel ? 'bg-amber-500/40' : dark ? 'bg-slate-800' : 'bg-slate-200'
                }`}
              >
                {isDest && <span className="w-3.5 h-3.5 rounded-full bg-emerald-400" />}
                {cell && (
                  <div
                    className={`w-[74%] h-[74%] rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                      cell.color === 'r'
                        ? 'bg-red-600 border-red-300 text-white'
                        : 'bg-slate-950 border-slate-500 text-amber-400'
                    }`}
                  >
                    {cell.king ? '★' : ''}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 3. CONNECT FOUR PRO
// =========================================================================
const ConnectFourGame: React.FC<GameRuntimeProps> = ({ difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const ROWS = 6;
  const COLS = 7;
  const [grid, setGrid] = useState<(0 | 1 | 2)[][]>(() => Array.from({ length: ROWS }, () => Array(COLS).fill(0)));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onStatusChange('Your Turn (Gold) · Connect 4 in any line');
  }, [onStatusChange]);

  const checkWin = (g: (0 | 1 | 2)[][], player: 1 | 2) => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (g[r][c] !== player) continue;
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (const [dr, dc] of dirs) {
          let cnt = 0;
          for (let k = 0; k < 4; k++) {
            if (g[r + dr * k]?.[c + dc * k] === player) cnt++;
          }
          if (cnt === 4) return true;
        }
      }
    }
    return false;
  };

  const dropInCol = (g: (0 | 1 | 2)[][], col: number, player: 1 | 2): boolean => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (g[r][col] === 0) {
        g[r][col] = player;
        return true;
      }
    }
    return false;
  };

  const handleCol = (c: number) => {
    if (busy) return;
    const next = grid.map((r) => [...r]);
    if (!dropInCol(next, c, 1)) return;
    soundFX.click();
    setGrid(next);
    if (checkWin(next, 1)) {
      onScoreChange(500);
      soundFX.win();
      onLevelComplete(3, 500, 'Connected 4 discs!');
      return;
    }
    setBusy(true);
    setTimeout(() => {
      const validCols = Array.from({ length: COLS }, (_, i) => i).filter((col) => next[0][col] === 0);
      if (validCols.length === 0) {
        onLevelFail(100, 'Board full — draw!');
        return;
      }
      let chosen = validCols[Math.floor(Math.random() * validCols.length)];
      if (difficulty !== 'easy') {
        for (const col of validCols) {
          const test = next.map((r) => [...r]);
          dropInCol(test, col, 2);
          if (checkWin(test, 2)) { chosen = col; break; }
          const testBlock = next.map((r) => [...r]);
          dropInCol(testBlock, col, 1);
          if (checkWin(testBlock, 1)) chosen = col;
        }
      }
      dropInCol(next, chosen, 2);
      setGrid([...next]);
      setBusy(false);
      soundFX.bounce();
      if (checkWin(next, 2)) {
        soundFX.fail();
        onLevelFail(100, 'AI connected 4 discs!');
      }
    }, 320);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="bg-blue-700 p-3 rounded-2xl border-4 border-blue-900 shadow-2xl w-full max-w-[440px]">
        <div className="grid grid-cols-7 gap-2">
          {grid.map((row, r) =>
            row.map((val, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => handleCol(c)}
                className={`aspect-square rounded-full transition-colors ${
                  val === 1 ? 'bg-amber-400' : val === 2 ? 'bg-rose-500' : 'bg-[#0B0E14] hover:bg-slate-800'
                }`}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// 4. GOMOKU 5-IN-A-ROW
// =========================================================================
const GomokuGame: React.FC<GameRuntimeProps> = ({ difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const N = 11;
  const [board, setBoard] = useState<(0 | 1 | 2)[][]>(() => Array.from({ length: N }, () => Array(N).fill(0)));

  useEffect(() => {
    onStatusChange('Place 5 stones in any unbroken line');
  }, [onStatusChange]);

  const hasFive = (g: (0 | 1 | 2)[][], p: 1 | 2) => {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (g[r][c] !== p) continue;
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          let cnt = 0;
          for (let k = 0; k < 5; k++) if (g[r + dr * k]?.[c + dc * k] === p) cnt++;
          if (cnt === 5) return true;
        }
      }
    }
    return false;
  };

  const tap = (r: number, c: number) => {
    if (board[r][c] !== 0) return;
    const next = board.map((row) => [...row]);
    next[r][c] = 1;
    soundFX.click();
    setBoard(next);
    if (hasFive(next, 1)) {
      onScoreChange(600);
      soundFX.win();
      onLevelComplete(3, 600, '5-in-a-row achieved!');
      return;
    }

    // Heuristic AI
    let best: [number, number] | null = null;
    let bestScore = -1;
    for (let rr = 0; rr < N; rr++) {
      for (let cc = 0; cc < N; cc++) {
        if (next[rr][cc] !== 0) continue;
        let sc = Math.random() * 0.5;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (next[rr + dr]?.[cc + dc] === 1) sc += difficulty === 'easy' ? 1 : 3;
            if (next[rr + dr]?.[cc + dc] === 2) sc += 2.5;
          }
        }
        if (sc > bestScore) { bestScore = sc; best = [rr, cc]; }
      }
    }
    if (best) {
      next[best[0]][best[1]] = 2;
      setBoard([...next]);
      if (hasFive(next, 2)) {
        soundFX.fail();
        onLevelFail(100, 'AI formed 5-in-a-row!');
      }
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="grid grid-cols-11 gap-0.5 bg-amber-900/40 p-2 rounded-xl border border-amber-700/50 w-full max-w-[440px] aspect-square">
        {board.map((row, r) =>
          row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              onClick={() => tap(r, c)}
              className="bg-[#181F2C] hover:bg-slate-700 rounded-sm flex items-center justify-center"
            >
              {v !== 0 && (
                <span className={`w-[78%] h-[78%] rounded-full ${v === 1 ? 'bg-teal-400' : 'bg-rose-500'}`} />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 5. SUDOKU VAULT
// =========================================================================
const BASE_SUDOKU = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const SudokuGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete }) => {
  const { solution, fixedMask, initial } = useMemo(() => {
    const rand = seededRandom(level * 41);
    const shift = Math.floor(rand() * 9);
    const sol = BASE_SUDOKU.map((row) => row.map((v) => ((v - 1 + shift) % 9) + 1));
    const blanks = Math.min(48, (difficulty === 'easy' ? 14 : difficulty === 'medium' ? 24 : 34) + Math.floor(level / 6));
    const fixed = Array.from({ length: 9 }, () => Array(9).fill(true));
    let removed = 0;
    while (removed < blanks) {
      const r = Math.floor(rand() * 9);
      const c = Math.floor(rand() * 9);
      if (fixed[r][c]) {
        fixed[r][c] = false;
        removed++;
      }
    }
    const init = sol.map((row, r) => row.map((v, c) => (fixed[r][c] ? v : 0)));
    return { solution: sol, fixedMask: fixed, initial: init };
  }, [level, difficulty]);

  const [grid, setGrid] = useState<number[][]>(initial);
  const [sel, setSel] = useState<[number, number] | null>(null);

  useEffect(() => {
    const rem = grid.flat().filter((v) => v === 0).length;
    onStatusChange(`Empty Cells: ${rem}`);
  }, [grid, onStatusChange]);

  const setNum = (n: number) => {
    if (!sel) return;
    const [r, c] = sel;
    if (fixedMask[r][c]) return;
    const next = grid.map((row) => [...row]);
    next[r][c] = n;
    setGrid(next);
    soundFX.click();

    const filled = next.flat().every((v) => v !== 0);
    if (filled) {
      const valid = next.every((row, rr) => row.every((v, cc) => v === solution[rr][cc]));
      if (valid) {
        onScoreChange(600 + level * 10);
        soundFX.win();
        onLevelComplete(3, 600 + level * 10, 'Sudoku Vault unlocked!');
      } else {
        onStatusChange('Some numbers conflict — check highlighted rows!');
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2">
      <div className="grid grid-cols-9 bg-slate-800 p-1 rounded-xl border border-indigo-500/40 w-full max-w-[380px] aspect-square">
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isSel = sel?.[0] === r && sel?.[1] === c;
            const isWrong = val !== 0 && val !== solution[r][c];
            const borderB = r % 3 === 2 && r !== 8 ? 'border-b-2 border-indigo-400/40' : 'border-b border-slate-700';
            const borderR = c % 3 === 2 && c !== 8 ? 'border-r-2 border-indigo-400/40' : 'border-r border-slate-700';
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => setSel([r, c])}
                className={`font-mono-num text-sm sm:text-base font-bold flex items-center justify-center ${borderB} ${borderR} ${
                  isSel
                    ? 'bg-indigo-500 text-white'
                    : fixedMask[r][c]
                    ? 'bg-slate-900 text-slate-200'
                    : isWrong
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-slate-950 text-indigo-300'
                }`}
              >
                {val || ''}
              </button>
            );
          })
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 max-w-[380px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
          <button
            key={n}
            onClick={() => setNum(n)}
            className="w-10 h-10 rounded-lg bg-slate-800 hover:bg-indigo-600 text-white font-mono-num text-sm font-bold border border-white/10"
          >
            {n === 0 ? '✕' : n}
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// 6. MINESWEEPER OPS
// =========================================================================
const MinesweeperGame: React.FC<GameRuntimeProps> = ({ level, difficulty, onScoreChange, onStatusChange, onLevelComplete, onLevelFail }) => {
  const N = 8;
  const mineCount = Math.min(18, (difficulty === 'easy' ? 7 : difficulty === 'medium' ? 10 : 14) + Math.floor(level / 25));
  const [mines, setMines] = useState<boolean[][] | null>(null);
  const [revealed, setRevealed] = useState<boolean[][]>(() => Array.from({ length: N }, () => Array(N).fill(false)));
  const [flagged, setFlagged] = useState<boolean[][]>(() => Array.from({ length: N }, () => Array(N).fill(false)));
  const [flagMode, setFlagMode] = useState(false);

  const countAdj = (m: boolean[][], r: number, c: number) => {
    let cnt = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (m[r + dr]?.[c + dc]) cnt++;
    return cnt;
  };

  useEffect(() => {
    const revCnt = revealed.flat().filter(Boolean).length;
    onStatusChange(`Safe Cells ${revCnt}/${N * N - mineCount} · Mines ${mineCount}`);
  }, [revealed, mineCount, onStatusChange]);

  const tap = (r: number, c: number) => {
    if (flagMode) {
      if (revealed[r][c]) return;
      const nf = flagged.map((row) => [...row]);
      nf[r][c] = !nf[r][c];
      setFlagged(nf);
      soundFX.click();
      return;
    }
    if (flagged[r][c]) return;

    let m = mines;
    if (!m) {
      const rand = seededRandom(level * 99 + r * 7 + c);
      m = Array.from({ length: N }, () => Array(N).fill(false));
      let placed = 0;
      while (placed < mineCount) {
        const mr = Math.floor(rand() * N);
        const mc = Math.floor(rand() * N);
        if ((Math.abs(mr - r) <= 1 && Math.abs(mc - c) <= 1) || m[mr][mc]) continue;
        m[mr][mc] = true;
        placed++;
      }
      setMines(m);
    }

    if (m[r][c]) {
      soundFX.fail();
      onLevelFail(100, 'Detonated a hidden mine!');
      return;
    }

    const nextRev = revealed.map((row) => [...row]);
    const queue: Array<[number, number]> = [[r, c]];
    while (queue.length > 0) {
      const [cr, cc] = queue.shift()!;
      if (cr < 0 || cr >= N || cc < 0 || cc >= N || nextRev[cr][cc]) continue;
      nextRev[cr][cc] = true;
      if (countAdj(m, cr, cc) === 0) {
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) queue.push([cr + dr, cc + dc]);
      }
    }
    setRevealed(nextRev);
    soundFX.click();
    const safeOpened = nextRev.flat().filter(Boolean).length;
    onScoreChange(safeOpened * 25);
    if (safeOpened >= N * N - mineCount) {
      soundFX.win();
      onLevelComplete(3, safeOpened * 30, 'Minefield swept cleanly!');
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2">
      <div className="flex gap-2">
        <button
          onClick={() => setFlagMode(false)}
          className={`px-4 py-2 rounded-lg text-xs font-bold min-h-[40px] ${!flagMode ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
        >
          Reveal Mode
        </button>
        <button
          onClick={() => setFlagMode(true)}
          className={`px-4 py-2 rounded-lg text-xs font-bold min-h-[40px] ${flagMode ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'}`}
        >
          Flag Mode
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1 bg-slate-900 p-2 rounded-xl border border-white/10 w-full max-w-[400px] aspect-square">
        {revealed.map((row, r) =>
          row.map((isRev, c) => {
            const adj = isRev && mines ? countAdj(mines, r, c) : 0;
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => tap(r, c)}
                className={`rounded-md font-mono-num text-sm font-bold flex items-center justify-center transition-colors ${
                  isRev
                    ? 'bg-slate-800 text-sky-300'
                    : flagged[r][c]
                    ? 'bg-rose-600/40 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {isRev ? (adj > 0 ? adj : '') : flagged[r][c] ? '⚑' : ''}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 7. PIPE CONDUIT
// =========================================================================
// Pipe types: 'S' straight (top-bottom at rot 0), 'L' elbow (top-right at rot 0), 'T' tee (top-right-bottom at rot 0)
const PipeConduitGame: React.FC<GameRuntimeProps> = ({ level, onScoreChange, onStatusChange, onLevelComplete }) => {
  const N = 5;
  const solutionGrid = useMemo(() => {
    const rand = seededRandom(level * 67);
    const grid: Array<Array<{ shape: 'S' | 'L' | 'T'; rot: number }>> = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({ shape: rand() > 0.5 ? 'L' : 'S', rot: Math.floor(rand() * 4) }))
    );
    // Guarantee solvable path from (0,0) to (4,4)
    let r = 0;
    let c = 0;
    const path: Array<[number, number]> = [[0, 0]];
    while (r < N - 1 || c < N - 1) {
      if (r === N - 1) c++;
      else if (c === N - 1) r++;
      else if (rand() > 0.5) c++;
      else r++;
      path.push([r, c]);
    }
    for (let i = 0; i < path.length; i++) {
      const [cr, cc] = path[i];
      const prev = i === 0 ? [0, -1] : path[i - 1];
      const next = i === path.length - 1 ? [N - 1, N] : path[i + 1];
      const straight = prev[0] === next[0] || prev[1] === next[1];
      grid[cr][cc] = { shape: straight ? 'S' : 'L', rot: (Math.floor(rand() * 3) + 1) % 4 };
    }
    return grid;
  }, [level]);

  const [tiles, setTiles] = useState(solutionGrid);

  const openings = (shape: 'S' | 'L' | 'T', rot: number): number[] => {
    // 0:Top, 1:Right, 2:Bottom, 3:Left
    const base = shape === 'S' ? [0, 2] : shape === 'L' ? [0, 1] : [0, 1, 2];
    return base.map((d) => (d + rot) % 4);
  };

  const connectedSet = useMemo(() => {
    const visited = new Set<string>();
    if (!openings(tiles[0][0].shape, tiles[0][0].rot).includes(3)) return visited;
    const q: Array<[number, number]> = [[0, 0]];
    visited.add('0,0');
    const dirs = [[-1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]];
    while (q.length > 0) {
      const [r, c] = q.shift()!;
      const ops = openings(tiles[r][c].shape, tiles[r][c].rot);
      for (const [dr, dc, outD, inD] of dirs) {
        if (!ops.includes(outD)) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
        if (visited.has(`${nr},${nc}`)) continue;
        if (openings(tiles[nr][nc].shape, tiles[nr][nc].rot).includes(inD)) {
          visited.add(`${nr},${nc}`);
          q.push([nr, nc]);
        }
      }
    }
    return visited;
  }, [tiles]);

  useEffect(() => {
    onStatusChange('Rotate segments to link Inlet (top-left) → Outlet (bottom-right)');
  }, [onStatusChange]);

  const rotateTile = (r: number, c: number) => {
    const next = tiles.map((row) => row.map((t) => ({ ...t })));
    next[r][c].rot = (next[r][c].rot + 1) % 4;
    setTiles(next);
    soundFX.click();

    // Check outlet at (N-1, N-1) having Right (1) opening
    const vis = new Set<string>();
    if (openings(next[0][0].shape, next[0][0].rot).includes(3)) {
      const q: Array<[number, number]> = [[0, 0]];
      vis.add('0,0');
      const dirs = [[-1, 0, 0, 2], [0, 1, 1, 3], [1, 0, 2, 0], [0, -1, 3, 1]];
      while (q.length > 0) {
        const [cr, cc] = q.shift()!;
        const ops = openings(next[cr][cc].shape, next[cr][cc].rot);
        for (const [dr, dc, outD, inD] of dirs) {
          if (!ops.includes(outD)) continue;
          const nr = cr + dr; const nc = cc + dc;
          if (nr < 0 || nr >= N || nc < 0 || nc >= N || vis.has(`${nr},${nc}`)) continue;
          if (openings(next[nr][nc].shape, next[nr][nc].rot).includes(inD)) {
            vis.add(`${nr},${nc}`);
            q.push([nr, nc]);
          }
        }
      }
    }
    if (vis.has(`${N - 1},${N - 1}`) && openings(next[N - 1][N - 1].shape, next[N - 1][N - 1].rot).includes(1)) {
      onScoreChange(500);
      soundFX.win();
      onLevelComplete(3, 500, 'Pressurized fluid flow connected!');
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
      <div className="flex items-center justify-between w-full max-w-[380px] text-xs text-slate-300 px-1">
        <span className="text-emerald-400 font-semibold">INLET ▶</span>
        <span className="text-amber-400 font-semibold">OUTLET ▶</span>
      </div>
      <div className="grid grid-cols-5 gap-1.5 bg-slate-900 p-2 rounded-xl border border-sky-500/30 w-full max-w-[380px] aspect-square">
        {tiles.map((row, r) =>
          row.map((t, c) => {
            const lit = connectedSet.has(`${r},${c}`);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => rotateTile(r, c)}
                className="bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center p-1"
              >
                <svg
                  viewBox="0 0 40 40"
                  className="w-full h-full transition-transform duration-150"
                  style={{ transform: `rotate(${t.rot * 90}deg)` }}
                >
                  {t.shape === 'S' ? (
                    <line x1="20" y1="0" x2="20" y2="40" stroke={lit ? '#38BDF8' : '#64748B'} strokeWidth="10" />
                  ) : (
                    <path d="M20,0 L20,20 L40,20" fill="none" stroke={lit ? '#38BDF8' : '#64748B'} strokeWidth="10" strokeLinejoin="round" />
                  )}
                </svg>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 8. LASER PRISM OPTICS
// =========================================================================
const LaserPrismGame: React.FC<GameRuntimeProps> = ({ level, onScoreChange, onStatusChange, onLevelComplete }) => {
  const N = 5;
  // Mirrors: 0 = none, 1 = '/', 2 = '\'
  const [mirrors, setMirrors] = useState<number[][]>(() => {
    const rand = seededRandom(level * 109);
    const g = Array.from({ length: N }, () => Array(N).fill(0));
    g[2][2] = 1;
    g[2][4] = 2;
    g[4][4] = 1;
    if (level > 10) g[0][2] = 2;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (g[r][c] > 0 && rand() > 0.4) g[r][c] = g[r][c] === 1 ? 2 : 1;
    return g;
  });

  // Emitter at (2,0) shooting right; Target crystal at (4,4) or (0,4)
  const targetCell: [number, number] = level > 10 ? [0, 4] : [4, 2];

  const traceBeam = (g: number[][]) => {
    const path: Array<[number, number]> = [];
    let r = 2;
    let c = 0;
    let dr = 0;
    let dc = 1;
    for (let step = 0; step < 30; step++) {
      path.push([r, c]);
      if (r === targetCell[0] && c === targetCell[1]) return { path, hit: true };
      const m = g[r][c];
      if (m === 1) {
        // '/' : (0,1)->(-1,0), (-1,0)->(0,1), (0,-1)->(1,0), (1,0)->(0,-1)
        const ndr = -dc;
        const ndc = -dr;
        dr = ndr;
        dc = ndc;
      } else if (m === 2) {
        // '\' : (0,1)->(1,0), (1,0)->(0,1)
        const ndr = dc;
        const ndc = dr;
        dr = ndr;
        dc = ndc;
      }
      r += dr;
      c += dc;
      if (r < 0 || r >= N || c < 0 || c >= N) break;
    }
    return { path, hit: false };
  };

  const { path, hit } = useMemo(() => traceBeam(mirrors), [mirrors, targetCell]);

  useEffect(() => {
    onStatusChange('Tap mirrors to bounce the crimson laser into the Cyan Crystal');
  }, [onStatusChange]);

  const toggleMirror = (r: number, c: number) => {
    if (mirrors[r][c] === 0) return;
    const next = mirrors.map((row) => [...row]);
    next[r][c] = next[r][c] === 1 ? 2 : 1;
    setMirrors(next);
    soundFX.click();
    if (traceBeam(next).hit) {
      onScoreChange(500);
      soundFX.win();
      onLevelComplete(3, 500, 'Optical receiver energized!');
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-2">
      <div className="grid grid-cols-5 gap-1.5 bg-slate-900 p-2.5 rounded-xl border border-rose-500/30 w-full max-w-[380px] aspect-square">
        {mirrors.map((row, r) =>
          row.map((m, c) => {
            const onBeam = path.some(([pr, pc]) => pr === r && pc === c);
            const isTarget = r === targetCell[0] && c === targetCell[1];
            const isSource = r === 2 && c === 0;
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => toggleMirror(r, c)}
                className={`relative rounded-lg flex items-center justify-center border ${
                  onBeam ? 'bg-rose-500/15 border-rose-500/40' : 'bg-slate-800 border-white/5'
                }`}
              >
                {isSource && <span className="w-4 h-4 rounded-full bg-rose-500" />}
                {isTarget && <span className={`w-5 h-5 rotate-45 ${hit ? 'bg-emerald-400' : 'bg-cyan-400'}`} />}
                {m === 1 && <div className="w-8 h-1.5 bg-slate-200 -rotate-45 rounded" />}
                {m === 2 && <div className="w-8 h-1.5 bg-slate-200 rotate-45 rounded" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
