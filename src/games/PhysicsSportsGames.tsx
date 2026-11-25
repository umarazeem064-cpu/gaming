import React, { useEffect, useRef } from 'react';
import { GameRuntimeProps } from '../types/game';
import { seededRandom, soundFX } from '../utils/audio';

export const PhysicsSportsGame: React.FC<GameRuntimeProps> = ({
  game,
  level,
  difficulty,
  onScoreChange,
  onStatusChange,
  onLevelComplete,
  onLevelFail,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cbRef = useRef({ onScoreChange, onStatusChange, onLevelComplete, onLevelFail });
  cbRef.current = { onScoreChange, onStatusChange, onLevelComplete, onLevelFail };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 560;
    const H = 640;
    canvas.width = W;
    canvas.height = H;

    const rand = seededRandom(level * 251 + (difficulty === 'easy' ? 13 : difficulty === 'medium' ? 53 : 101));
    const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'medium' ? 1.0 : 1.25;

    let rafId = 0;
    let lastTime = performance.now();
    let ended = false;

    const pointer = { down: false, x: W / 2, y: H / 2, startX: W / 2, startY: H / 2 };
    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H,
      };
    };

    let onDown = (_x: number, _y: number) => {};
    let onMove = (_x: number, _y: number) => {};
    let onUp = (_x: number, _y: number) => {};
    let onKey = (_code: string, _isDown: boolean) => {};

    const handleDown = (e: PointerEvent) => {
      const p = getPos(e);
      pointer.down = true;
      pointer.startX = p.x;
      pointer.startY = p.y;
      pointer.x = p.x;
      pointer.y = p.y;
      onDown(p.x, p.y);
    };
    const handleMove = (e: PointerEvent) => {
      const p = getPos(e);
      pointer.x = p.x;
      pointer.y = p.y;
      onMove(p.x, p.y);
    };
    const handleUp = (e: PointerEvent) => {
      const p = getPos(e);
      pointer.down = false;
      pointer.x = p.x;
      pointer.y = p.y;
      onUp(p.x, p.y);
    };
    const handleKeyDown = (e: KeyboardEvent) => onKey(e.code, true);
    const handleKeyUp = (e: KeyboardEvent) => onKey(e.code, false);

    canvas.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const win = (score: number, summary: string) => {
      if (ended) return;
      ended = true;
      soundFX.win();
      cbRef.current.onLevelComplete(3, Math.round(score), summary);
    };
    const fail = (score: number, reason: string) => {
      if (ended) return;
      ended = true;
      soundFX.fail();
      cbRef.current.onLevelFail(Math.round(score), reason);
    };

    let updateFn: (dt: number, t: number) => void = () => {};

    // =========================================================================
    // 1. PRO BILLIARDS 8 & 3. CARROM CLASH (Shared Realistic 2D Elastic Physics)
    // =========================================================================
    if (game.id === 'pro-billiards' || game.id === 'carrom-clash') {
      const isCarrom = game.id === 'carrom-clash';
      const pad = 42;
      const pockets = [
        { x: pad + 10, y: pad + 10 },
        { x: W - pad - 10, y: pad + 10 },
        { x: pad + 10, y: H - pad - 10 },
        { x: W - pad - 10, y: H - pad - 10 },
        ...(isCarrom ? [] : [{ x: pad + 6, y: H / 2 }, { x: W - pad - 6, y: H / 2 }]),
      ];

      interface Ball {
        x: number;
        y: number;
        vx: number;
        vy: number;
        r: number;
        color: string;
        isCue: boolean;
        sunk: boolean;
      }
      const balls: Ball[] = [
        {
          x: W / 2,
          y: isCarrom ? H - 135 : H - 150,
          vx: 0,
          vy: 0,
          r: isCarrom ? 17 : 13,
          color: '#F8FAFC',
          isCue: true,
          sunk: false,
        },
      ];
      const numTargets = Math.min(9, 3 + Math.floor(level / 14));
      const ballColors = ['#F59E0B', '#EF4444', '#2563EB', '#A855F7', '#10B981', '#EC4899'];
      for (let i = 0; i < numTargets; i++) {
        balls.push({
          x: W / 2 + ((i % 3) - 1) * 32 + (rand() - 0.5) * 14,
          y: (isCarrom ? H / 2 - 40 : 185) + Math.floor(i / 3) * 32,
          vx: 0,
          vy: 0,
          r: isCarrom ? 13 : 13,
          color: isCarrom && i === 0 ? '#EF4444' : ballColors[i % ballColors.length],
          isCue: false,
          sunk: false,
        });
      }

      let shotsLeft = Math.max(numTargets + 2, numTargets + (difficulty === 'easy' ? 7 : difficulty === 'medium' ? 5 : 3));
      let sunkCount = 0;
      let aiming = false;

      const allStopped = () => balls.every((b) => b.sunk || (Math.abs(b.vx) < 4 && Math.abs(b.vy) < 4));

      onDown = (x, y) => {
        if (!allStopped()) return;
        const cue = balls[0];
        if (Math.hypot(x - cue.x, y - cue.y) < 120) {
          aiming = true;
        }
      };
      onUp = (x, y) => {
        if (!aiming) return;
        aiming = false;
        const cue = balls[0];
        const dx = cue.x - x;
        const dy = cue.y - y;
        const mag = Math.min(220, Math.hypot(dx, dy));
        if (mag > 14) {
          cue.vx = (dx / Math.hypot(dx, dy)) * mag * 5.2;
          cue.vy = (dy / Math.hypot(dx, dy)) * mag * 5.2;
          shotsLeft -= 1;
          soundFX.hit();
          cbRef.current.onStatusChange(`Pocketed ${sunkCount}/${numTargets} · Shots ${shotsLeft}`);
        }
      };

      cbRef.current.onStatusChange(`Pocketed 0/${numTargets} · Shots ${shotsLeft}`);

      updateFn = (dt) => {
        const sub = 3;
        const sdt = dt / sub;
        for (let s = 0; s < sub; s++) {
          for (const b of balls) {
            if (b.sunk) continue;
            b.x += b.vx * sdt;
            b.y += b.vy * sdt;
            b.vx *= Math.pow(0.28, sdt);
            b.vy *= Math.pow(0.28, sdt);
            if (Math.hypot(b.vx, b.vy) < 4) {
              b.vx = 0;
              b.vy = 0;
            }
            if (b.x - b.r < pad) { b.x = pad + b.r; b.vx = Math.abs(b.vx) * 0.86; soundFX.bounce(); }
            if (b.x + b.r > W - pad) { b.x = W - pad - b.r; b.vx = -Math.abs(b.vx) * 0.86; soundFX.bounce(); }
            if (b.y - b.r < pad) { b.y = pad + b.r; b.vy = Math.abs(b.vy) * 0.86; soundFX.bounce(); }
            if (b.y + b.r > H - pad) { b.y = H - pad - b.r; b.vy = -Math.abs(b.vy) * 0.86; soundFX.bounce(); }

            for (const pk of pockets) {
              if (Math.hypot(b.x - pk.x, b.y - pk.y) < 22) {
                if (b.isCue) {
                  b.x = W / 2;
                  b.y = H - 140;
                  b.vx = 0;
                  b.vy = 0;
                } else {
                  b.sunk = true;
                  sunkCount += 1;
                  soundFX.score();
                  cbRef.current.onScoreChange(sunkCount * 150);
                  cbRef.current.onStatusChange(`Pocketed ${sunkCount}/${numTargets} · Shots ${shotsLeft}`);
                  if (sunkCount >= numTargets) {
                    win(sunkCount * 150 + shotsLeft * 80, 'Cleared all table balls!');
                    return;
                  }
                }
              }
            }
          }

          // Ball-to-ball collisions
          for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
              const a = balls[i];
              const b = balls[j];
              if (a.sunk || b.sunk) continue;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.hypot(dx, dy);
              const minD = a.r + b.r;
              if (dist > 0 && dist < minD) {
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = (minD - dist) * 0.5;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;
                const dvx = a.vx - b.vx;
                const dvy = a.vy - b.vy;
                const dot = dvx * nx + dvy * ny;
                if (dot > 0) {
                  a.vx -= dot * nx * 0.94;
                  a.vy -= dot * ny * 0.94;
                  b.vx += dot * nx * 0.94;
                  b.vy += dot * ny * 0.94;
                  soundFX.click();
                }
              }
            }
          }
        }

        if (allStopped() && shotsLeft <= 0 && sunkCount < numTargets) {
          fail(sunkCount * 150, 'Out of shots before clearing table!');
          return;
        }

        // Draw Table
        ctx.fillStyle = isCarrom ? '#78350F' : '#451A03';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = isCarrom ? '#E6C28B' : '#0F5132';
        ctx.fillRect(pad, pad, W - pad * 2, H - pad * 2);

        if (isCarrom) {
          ctx.strokeStyle = '#92400E';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(W / 2, H / 2, 54, 0, Math.PI * 2);
          ctx.stroke();
        }

        for (const pk of pockets) {
          ctx.fillStyle = '#090D16';
          ctx.beginPath();
          ctx.arc(pk.x, pk.y, 20, 0, Math.PI * 2);
          ctx.fill();
        }

        for (const b of balls) {
          if (b.sunk) continue;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }

        if (aiming) {
          const cue = balls[0];
          const dx = cue.x - pointer.x;
          const dy = cue.y - pointer.y;
          ctx.strokeStyle = 'rgba(255,255,255,0.75)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x + dx * 1.4, cue.y + dy * 1.4);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      };
    }

    // =========================================================================
    // 2. AIR HOCKEY DUEL
    // =========================================================================
    else if (game.id === 'air-hockey') {
      const targetGoals = 3 + Math.floor(level / 25);
      let pScore = 0;
      let aiScore = 0;
      const player = { x: W / 2, y: H - 95, vx: 0, vy: 0, r: 26 };
      const ai = { x: W / 2, y: 95, vx: 0, vy: 0, r: 26 };
      const puck = { x: W / 2, y: H / 2, vx: 160, vy: 220, r: 16 };

      onMove = (x, y) => {
        if (!pointer.down) return;
        player.vx = (x - player.x) * 14;
        player.vy = (Math.max(H / 2 + 26, y) - player.y) * 14;
        player.x = Math.max(46, Math.min(W - 46, x));
        player.y = Math.max(H / 2 + 26, Math.min(H - 46, y));
      };

      cbRef.current.onStatusChange(`You 0 - 0 AI (First to ${targetGoals})`);

      updateFn = (dt) => {
        // AI tracking
        const aiSpeed = (210 + level * 2.5) * diffMult;
        const targetX = puck.y < H / 2 + 60 ? puck.x : W / 2;
        const targetY = puck.y < H / 2 ? Math.max(60, Math.min(H / 2 - 40, puck.y - 30)) : 95;
        const adx = targetX - ai.x;
        const ady = targetY - ai.y;
        const ad = Math.hypot(adx, ady) || 1;
        ai.vx = (adx / ad) * Math.min(aiSpeed, ad * 8);
        ai.vy = (ady / ad) * Math.min(aiSpeed, ad * 8);
        ai.x += ai.vx * dt;
        ai.y += ai.vy * dt;

        puck.x += puck.vx * dt;
        puck.y += puck.vy * dt;
        puck.vx *= 0.996;
        puck.vy *= 0.996;

        if (puck.x < 34) { puck.x = 34; puck.vx = Math.abs(puck.vx); soundFX.bounce(); }
        if (puck.x > W - 34) { puck.x = W - 34; puck.vx = -Math.abs(puck.vx); soundFX.bounce(); }

        const inGoalX = Math.abs(puck.x - W / 2) < 75;
        if (puck.y < 34) {
          if (inGoalX) {
            pScore += 1;
            soundFX.score();
            puck.x = W / 2; puck.y = H / 2; puck.vx = (rand() - 0.5) * 200; puck.vy = 200;
            cbRef.current.onScoreChange(pScore * 200);
            cbRef.current.onStatusChange(`You ${pScore} - ${aiScore} AI`);
            if (pScore >= targetGoals) win(pScore * 250, `Won air hockey ${pScore}-${aiScore}!`);
          } else {
            puck.y = 34; puck.vy = Math.abs(puck.vy); soundFX.bounce();
          }
        }
        if (puck.y > H - 34) {
          if (inGoalX) {
            aiScore += 1;
            soundFX.hit();
            puck.x = W / 2; puck.y = H / 2; puck.vx = (rand() - 0.5) * 200; puck.vy = -200;
            cbRef.current.onStatusChange(`You ${pScore} - ${aiScore} AI`);
            if (aiScore >= targetGoals) fail(pScore * 150, `AI won ${aiScore}-${pScore}!`);
          } else {
            puck.y = H - 34; puck.vy = -Math.abs(puck.vy); soundFX.bounce();
          }
        }

        [player, ai].forEach((m) => {
          const dx = puck.x - m.x;
          const dy = puck.y - m.y;
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < puck.r + m.r) {
            const nx = dx / d;
            const ny = dy / d;
            puck.x = m.x + nx * (puck.r + m.r + 1);
            puck.y = m.y + ny * (puck.r + m.r + 1);
            puck.vx = nx * 420 + m.vx * 0.45;
            puck.vy = ny * 420 + m.vy * 0.45;
            soundFX.hit();
          }
        });

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 4;
        ctx.strokeRect(20, 20, W - 40, H - 40);
        ctx.beginPath();
        ctx.moveTo(20, H / 2);
        ctx.lineTo(W - 20, H / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 54, 0, Math.PI * 2);
        ctx.stroke();

        // Goals
        ctx.fillStyle = '#020617';
        ctx.fillRect(W / 2 - 75, 14, 150, 14);
        ctx.fillRect(W / 2 - 75, H - 28, 150, 14);

        ctx.fillStyle = '#EF4444';
        ctx.beginPath(); ctx.arc(ai.x, ai.y, ai.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath(); ctx.arc(puck.x, puck.y, puck.r, 0, Math.PI * 2); ctx.fill();
      };
    }

    // =========================================================================
    // 4. MINI GOLF LINKS
    // =========================================================================
    else if (game.id === 'mini-golf') {
      const hole = { x: W / 2 + (rand() - 0.5) * 180, y: 110, r: 18 };
      const ball = { x: W / 2, y: H - 105, vx: 0, vy: 0, r: 10 };
      const par = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 5 : 4;
      let strokes = 0;
      let aiming = false;

      const walls: Array<{ x: number; y: number; w: number; h: number }> = [];
      const wallCount = 2 + Math.min(5, Math.floor(level / 16));
      for (let i = 0; i < wallCount; i++) {
        walls.push({
          x: 70 + rand() * (W - 240),
          y: 180 + i * 75,
          w: 90 + rand() * 80,
          h: 18,
        });
      }

      onDown = () => {
        if (Math.hypot(ball.vx, ball.vy) < 4) aiming = true;
      };
      onUp = (x, y) => {
        if (!aiming) return;
        aiming = false;
        const dx = ball.x - x;
        const dy = ball.y - y;
        const mag = Math.min(200, Math.hypot(dx, dy));
        if (mag > 12) {
          ball.vx = (dx / Math.hypot(dx, dy)) * mag * 4.5;
          ball.vy = (dy / Math.hypot(dx, dy)) * mag * 4.5;
          strokes += 1;
          soundFX.click();
          cbRef.current.onStatusChange(`Strokes: ${strokes}/${par}`);
        }
      };

      cbRef.current.onStatusChange(`Strokes: 0/${par}`);

      updateFn = (dt) => {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.vx *= Math.pow(0.32, dt);
        ball.vy *= Math.pow(0.32, dt);
        if (Math.hypot(ball.vx, ball.vy) < 4) { ball.vx = 0; ball.vy = 0; }

        if (ball.x < 46) { ball.x = 46; ball.vx = Math.abs(ball.vx); soundFX.bounce(); }
        if (ball.x > W - 46) { ball.x = W - 46; ball.vx = -Math.abs(ball.vx); soundFX.bounce(); }
        if (ball.y < 46) { ball.y = 46; ball.vy = Math.abs(ball.vy); soundFX.bounce(); }
        if (ball.y > H - 46) { ball.y = H - 46; ball.vy = -Math.abs(ball.vy); soundFX.bounce(); }

        for (const w of walls) {
          if (ball.x + ball.r > w.x && ball.x - ball.r < w.x + w.w && ball.y + ball.r > w.y && ball.y - ball.r < w.y + w.h) {
            if (Math.abs(ball.x - (w.x + w.w / 2)) / w.w > Math.abs(ball.y - (w.y + w.h / 2)) / w.h) {
              ball.vx *= -0.85;
              ball.x += ball.vx > 0 ? 6 : -6;
            } else {
              ball.vy *= -0.85;
              ball.y += ball.vy > 0 ? 6 : -6;
            }
            soundFX.bounce();
          }
        }

        if (Math.hypot(ball.x - hole.x, ball.y - hole.y) < hole.r) {
          const pts = Math.max(100, (par - strokes + 2) * 200);
          cbRef.current.onScoreChange(pts);
          win(pts, `Sunk putt in ${strokes} stroke(s)!`);
          return;
        }
        if (strokes >= par && Math.hypot(ball.vx, ball.vy) < 4) {
          fail(50, 'Exceeded par stroke limit!');
          return;
        }

        ctx.fillStyle = '#064E3B';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#15803D';
        ctx.fillRect(36, 36, W - 72, H - 72);

        ctx.fillStyle = '#090D16';
        ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#F8FAFC'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hole.x, hole.y); ctx.lineTo(hole.x, hole.y - 42); ctx.stroke();
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(hole.x, hole.y - 42, 22, 14);

        ctx.fillStyle = '#78350F';
        for (const w of walls) ctx.fillRect(w.x, w.y, w.w, w.h);

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();

        if (aiming) {
          ctx.strokeStyle = '#FACC15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(ball.x + (ball.x - pointer.x), ball.y + (ball.y - pointer.y));
          ctx.stroke();
        }
      };
    }

    // =========================================================================
    // 5. PINBALL STEEL
    // =========================================================================
    else if (game.id === 'pinball-steel') {
      const targetScore = 600 + level * 50;
      let score = 0;
      let ballsLeft = difficulty === 'easy' ? 4 : 3;
      const ball = { x: W / 2 + 40, y: 120, vx: -120, vy: 60, r: 10 };
      let leftFlip = false;
      let rightFlip = false;
      const bumpers = [
        { x: W / 2 - 90, y: 180, r: 28, flash: 0 },
        { x: W / 2 + 90, y: 180, r: 28, flash: 0 },
        { x: W / 2, y: 265, r: 30, flash: 0 },
        { x: W / 2 - 120, y: 340, r: 22, flash: 0 },
        { x: W / 2 + 120, y: 340, r: 22, flash: 0 },
      ];

      onDown = (x) => {
        if (x < W / 2) leftFlip = true;
        else rightFlip = true;
        soundFX.click();
      };
      onUp = () => {
        leftFlip = false;
        rightFlip = false;
      };
      onKey = (code, isDown) => {
        if (code === 'ArrowLeft' || code === 'KeyA') leftFlip = isDown;
        if (code === 'ArrowRight' || code === 'KeyD') rightFlip = isDown;
      };

      cbRef.current.onStatusChange(`Score 0/${targetScore} · Balls ${ballsLeft}`);

      updateFn = (dt) => {
        ball.vy += 640 * diffMult * dt;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.x < 34) { ball.x = 34; ball.vx = Math.abs(ball.vx) * 0.9; }
        if (ball.x > W - 34) { ball.x = W - 34; ball.vx = -Math.abs(ball.vx) * 0.9; }
        if (ball.y < 34) { ball.y = 34; ball.vy = Math.abs(ball.vy) * 0.9; }

        for (const bp of bumpers) {
          bp.flash = Math.max(0, bp.flash - dt * 4);
          const dx = ball.x - bp.x;
          const dy = ball.y - bp.y;
          const d = Math.hypot(dx, dy);
          if (d < ball.r + bp.r) {
            const nx = dx / (d || 1);
            const ny = dy / (d || 1);
            ball.x = bp.x + nx * (ball.r + bp.r + 2);
            ball.y = bp.y + ny * (ball.r + bp.r + 2);
            ball.vx = nx * 420;
            ball.vy = ny * 420;
            bp.flash = 1;
            score += 100;
            soundFX.score();
            cbRef.current.onScoreChange(score);
            cbRef.current.onStatusChange(`Score ${score}/${targetScore} · Balls ${ballsLeft}`);
            if (score >= targetScore) {
              win(score + ballsLeft * 150, 'Pinball table score target smashed!');
              return;
            }
          }
        }

        // Flipper zone bounce
        if (ball.y > H - 110 && ball.y < H - 70) {
          const onLeft = ball.x > 110 && ball.x < W / 2 - 14;
          const onRight = ball.x < W - 110 && ball.x > W / 2 + 14;
          if ((onLeft && leftFlip) || (onRight && rightFlip)) {
            ball.vy = -560;
            ball.vx += onLeft ? 150 : -150;
            soundFX.hit();
          } else if ((onLeft || onRight) && ball.vy > 0) {
            ball.vy = -220;
          }
        }

        if (ball.y > H + 20) {
          ballsLeft -= 1;
          soundFX.hit();
          if (ballsLeft <= 0) {
            fail(score, 'All steel pinballs drained!');
            return;
          }
          ball.x = W / 2 + (rand() - 0.5) * 140;
          ball.y = 90;
          ball.vx = (rand() - 0.5) * 200;
          ball.vy = 60;
          cbRef.current.onStatusChange(`Score ${score}/${targetScore} · Balls ${ballsLeft}`);
        }

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 4;
        ctx.strokeRect(24, 24, W - 48, H - 30);

        for (const bp of bumpers) {
          ctx.fillStyle = bp.flash > 0 ? '#FDE047' : '#F59E0B';
          ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0B0E14';
          ctx.beginPath(); ctx.arc(bp.x, bp.y, bp.r * 0.45, 0, Math.PI * 2); ctx.fill();
        }

        // Flippers
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(115, H - 96);
        ctx.lineTo(W / 2 - 20, leftFlip ? H - 122 : H - 72);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W - 115, H - 96);
        ctx.lineTo(W / 2 + 20, rightFlip ? H - 122 : H - 72);
        ctx.stroke();

        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      };
    }

    // =========================================================================
    // 6. HOOPS SWISH & 7. PENALTY CURVE
    // =========================================================================
    else if (game.id === 'hoops-swish' || game.id === 'penalty-curve') {
      const isSoccer = game.id === 'penalty-curve';
      const targetGoals = 3 + Math.floor(level / 18);
      let shots = targetGoals + (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : 2);
      let goals = 0;
      const ball = { x: W / 2, y: H - 105, vx: 0, vy: 0, curve: 0, active: false, scale: 1 };
      let targetX = W / 2;
      let keeperX = W / 2;
      let keeperDir = 1;

      onUp = (x, y) => {
        if (ball.active) return;
        const dx = x - pointer.startX;
        const dy = y - pointer.startY;
        if (dy < -25) {
          ball.active = true;
          ball.vx = dx * 2.2;
          ball.vy = Math.max(-780, dy * 3.1);
          ball.curve = isSoccer ? dx * 0.8 : 0;
          shots -= 1;
          soundFX.click();
        }
      };

      cbRef.current.onStatusChange(`${isSoccer ? 'Goals' : 'Hoops'} 0/${targetGoals} · Shots ${shots}`);

      updateFn = (dt, t) => {
        if (level > 4 || difficulty === 'difficult') {
          targetX = W / 2 + Math.sin(t * (1.2 + level * 0.02) * diffMult) * 110;
        }
        keeperX += keeperDir * (140 + level * 2) * diffMult * dt;
        if (keeperX > W / 2 + 120) keeperDir = -1;
        if (keeperX < W / 2 - 120) keeperDir = 1;

        if (ball.active) {
          ball.x += ball.vx * dt;
          ball.y += ball.vy * dt;
          ball.vx += ball.curve * dt;
          if (!isSoccer) ball.vy += 680 * dt;
          ball.scale = Math.max(0.58, 1 - (H - 105 - ball.y) / 900);

          if (isSoccer && ball.y < 165) {
            const blocked = Math.abs(ball.x - keeperX) < 38;
            const inNet = Math.abs(ball.x - W / 2) < 155;
            if (inNet && !blocked) {
              goals += 1;
              soundFX.score();
              cbRef.current.onScoreChange(goals * 200);
            } else {
              soundFX.hit();
            }
            ball.active = false;
            ball.x = W / 2; ball.y = H - 105; ball.scale = 1;
            cbRef.current.onStatusChange(`Goals ${goals}/${targetGoals} · Shots ${shots}`);
          } else if (!isSoccer && ball.vy > 0 && Math.abs(ball.y - 190) < 20) {
            if (Math.abs(ball.x - targetX) < 34) {
              goals += 1;
              soundFX.score();
              cbRef.current.onScoreChange(goals * 200);
              ball.active = false;
              ball.x = W / 2; ball.y = H - 105; ball.scale = 1;
              cbRef.current.onStatusChange(`Hoops ${goals}/${targetGoals} · Shots ${shots}`);
            }
          }

          if (ball.y > H + 40 || ball.y < -40 || ball.x < -40 || ball.x > W + 40) {
            ball.active = false;
            ball.x = W / 2; ball.y = H - 105; ball.scale = 1;
            cbRef.current.onStatusChange(`${isSoccer ? 'Goals' : 'Hoops'} ${goals}/${targetGoals} · Shots ${shots}`);
          }

          if (!ball.active) {
            if (goals >= targetGoals) {
              win(goals * 200 + shots * 100, isSoccer ? 'Clinical penalty finishes!' : 'Nothing but net!');
              return;
            }
            if (shots <= 0) {
              fail(goals * 200, 'Out of attempts!');
              return;
            }
          }
        }

        ctx.fillStyle = isSoccer ? '#15803D' : '#1E293B';
        ctx.fillRect(0, 0, W, H);

        if (isSoccer) {
          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 6;
          ctx.strokeRect(W / 2 - 165, 95, 330, 80);
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(keeperX - 28, 145, 56, 26);
        } else {
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(targetX - 65, 110, 130, 82);
          ctx.strokeStyle = '#EA580C';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.ellipse(targetX, 194, 38, 10, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        const r = 24 * ball.scale;
        ctx.fillStyle = isSoccer ? '#FFFFFF' : '#EA580C';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2); ctx.fill();
        if (pointer.down && !ball.active) {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      };
    }

    // =========================================================================
    // 8. ARCHERY WIND & 9. TACTICAL SNIPER
    // =========================================================================
    else if (game.id === 'archery-wind' || game.id === 'tactical-sniper') {
      const isSniper = game.id === 'tactical-sniper';
      const targetScore = 250 + level * 15;
      let score = 0;
      let ammo = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 10 : 8;
      let targetX = W / 2;
      let targetY = 190;
      const wind = (rand() - 0.5) * 140 * diffMult;

      let scopeX = W / 2;
      let scopeY = 220;
      let arrow: { x: number; y: number; vx: number; vy: number } | null = null;

      onMove = (x, y) => {
        if (isSniper) {
          scopeX = x;
          scopeY = y;
        }
      };

      onUp = (x, y) => {
        if (ammo <= 0 || arrow) return;
        ammo -= 1;
        if (isSniper) {
          soundFX.laser();
          const dist = Math.hypot(x - targetX, y - targetY);
          if (dist < 48) {
            const pts = dist < 14 ? 120 : dist < 30 ? 80 : 50;
            score += pts;
            soundFX.score();
            cbRef.current.onScoreChange(score);
          } else {
            soundFX.hit();
          }
        } else {
          soundFX.slice();
          const dx = pointer.startX - x;
          const dy = pointer.startY - y;
          arrow = {
            x: W / 2,
            y: H - 90,
            vx: dx * 3.4,
            vy: Math.min(-420, dy * 4.5),
          };
        }
        cbRef.current.onStatusChange(`Score ${score}/${targetScore} · ${isSniper ? 'Rounds' : 'Arrows'} ${ammo}`);
      };

      cbRef.current.onStatusChange(`Score 0/${targetScore} · ${isSniper ? 'Rounds' : 'Arrows'} ${ammo}`);

      updateFn = (dt, t) => {
        targetX = W / 2 + Math.sin(t * (1.1 + level * 0.025) * diffMult) * 165;
        targetY = 180 + Math.cos(t * 0.9) * 35;

        if (arrow) {
          arrow.vx += wind * dt;
          arrow.vy += 420 * dt;
          arrow.x += arrow.vx * dt;
          arrow.y += arrow.vy * dt;
          if (Math.hypot(arrow.x - targetX, arrow.y - targetY) < 48) {
            const d = Math.hypot(arrow.x - targetX, arrow.y - targetY);
            score += d < 16 ? 120 : d < 32 ? 80 : 50;
            soundFX.score();
            cbRef.current.onScoreChange(score);
            cbRef.current.onStatusChange(`Score ${score}/${targetScore} · Arrows ${ammo}`);
            arrow = null;
          } else if (arrow.y < -20 || arrow.y > H + 20 || arrow.x < -20 || arrow.x > W + 20) {
            arrow = null;
          }
        }

        if (!arrow && score >= targetScore) {
          win(score + ammo * 40, 'Precision marksmanship!');
          return;
        }
        if (!arrow && ammo <= 0 && score < targetScore) {
          fail(score, 'Out of ammunition!');
          return;
        }

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);

        // Bullseye Target
        [48, 34, 20, 8].forEach((r, idx) => {
          ctx.fillStyle = ['#F8FAFC', '#38BDF8', '#EF4444', '#FACC15'][idx];
          ctx.beginPath(); ctx.arc(targetX, targetY, r, 0, Math.PI * 2); ctx.fill();
        });

        if (isSniper) {
          const swayX = Math.sin(t * 2.8) * 14 * diffMult;
          const swayY = Math.cos(t * 2.2) * 14 * diffMult;
          const rx = scopeX + swayX;
          const ry = scopeY + swayY;
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(rx, ry, 42, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(rx - 52, ry); ctx.lineTo(rx + 52, ry); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(rx, ry - 52); ctx.lineTo(rx, ry + 52); ctx.stroke();
        } else {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '13px monospace';
          ctx.fillText(`WIND: ${wind > 0 ? '→' : '←'} ${Math.abs(Math.round(wind))}`, 24, 34);
          if (arrow) {
            ctx.strokeStyle = '#F8FAFC';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(arrow.x, arrow.y);
            ctx.lineTo(arrow.x - arrow.vx * 0.04, arrow.y - arrow.vy * 0.04);
            ctx.stroke();
          }
          if (pointer.down) {
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(W / 2, H - 90);
            ctx.lineTo(W / 2 + (pointer.startX - pointer.x), H - 90 + (pointer.startY - pointer.y));
            ctx.stroke();
          }
        }
      };
    }

    // =========================================================================
    // 10. SLINGSHOT SIEGE
    // =========================================================================
    else {
      interface Block {
        x: number;
        y: number;
        w: number;
        h: number;
        isTarget: boolean;
        hit: boolean;
      }
      const blocks: Block[] = [];
      const rows = 2 + Math.min(3, Math.floor(level / 25));
      for (let r = 0; r < rows; r++) {
        blocks.push({ x: 350, y: H - 95 - r * 52, w: 32, h: 48, isTarget: false, hit: false });
        blocks.push({ x: 430, y: H - 95 - r * 52, w: 32, h: 48, isTarget: false, hit: false });
        blocks.push({ x: 344, y: H - 108 - r * 52, w: 124, h: 14, isTarget: false, hit: false });
        blocks.push({ x: 392, y: H - 80 - r * 52, w: 28, h: 28, isTarget: true, hit: false });
      }
      const totalTargets = blocks.filter((b) => b.isTarget).length;
      let shots = totalTargets + (difficulty === 'easy' ? 4 : difficulty === 'medium' ? 3 : 2);
      const slingPos = { x: 110, y: H - 150 };
      let proj: { x: number; y: number; vx: number; vy: number } | null = null;
      let pulling = false;

      onDown = (x, y) => {
        if (!proj && Math.hypot(x - slingPos.x, y - slingPos.y) < 110) pulling = true;
      };
      onUp = (x, y) => {
        if (!pulling) return;
        pulling = false;
        const dx = slingPos.x - x;
        const dy = slingPos.y - y;
        if (Math.hypot(dx, dy) > 15) {
          proj = { x: slingPos.x, y: slingPos.y, vx: dx * 6.8, vy: dy * 6.8 };
          shots -= 1;
          soundFX.slice();
        }
      };

      cbRef.current.onStatusChange(`Targets 0/${totalTargets} · Shots ${shots}`);

      updateFn = (dt) => {
        if (proj) {
          proj.vy += 680 * dt;
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;

          for (const b of blocks) {
            if (b.hit) continue;
            if (proj.x + 12 > b.x && proj.x - 12 < b.x + b.w && proj.y + 12 > b.y && proj.y - 12 < b.y + b.h) {
              b.hit = true;
              proj.vx *= 0.65;
              proj.vy *= -0.4;
              soundFX.hit();
              const cleared = blocks.filter((k) => k.isTarget && k.hit).length;
              cbRef.current.onScoreChange(cleared * 250);
              cbRef.current.onStatusChange(`Targets ${cleared}/${totalTargets} · Shots ${shots}`);
              if (cleared >= totalTargets) {
                win(cleared * 250 + shots * 120, 'Fortress demolished!');
                return;
              }
            }
          }

          if (proj.x > W + 30 || proj.y > H - 45) {
            proj = null;
            if (shots <= 0) {
              fail(blocks.filter((k) => k.isTarget && k.hit).length * 250, 'Out of siege boulders!');
              return;
            }
          }
        }

        ctx.fillStyle = '#131A27';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#15803D';
        ctx.fillRect(0, H - 48, W, 48);

        // Slingshot fork
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(slingPos.x, H - 48);
        ctx.lineTo(slingPos.x, slingPos.y);
        ctx.stroke();

        for (const b of blocks) {
          if (b.hit) continue;
          ctx.fillStyle = b.isTarget ? '#EF4444' : '#64748B';
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }

        if (proj) {
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath(); ctx.arc(proj.x, proj.y, 13, 0, Math.PI * 2); ctx.fill();
        } else {
          const bx = pulling ? Math.max(20, Math.min(200, pointer.x)) : slingPos.x;
          const by = pulling ? Math.max(H - 240, Math.min(H - 60, pointer.y)) : slingPos.y;
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(slingPos.x, slingPos.y); ctx.lineTo(bx, by); ctx.stroke();
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath(); ctx.arc(bx, by, 13, 0, Math.PI * 2); ctx.fill();
        }
      };
    }

    const loop = (now: number) => {
      if (ended) return;
      const dt = Math.min(0.04, (now - lastTime) / 1000);
      lastTime = now;
      updateFn(dt, now / 1000);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      ended = true;
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [game.id, level, difficulty]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#0B0E14] rounded-2xl border border-white/10 overflow-hidden p-2">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full aspect-[7/8] rounded-xl game-surface-touch shadow-2xl"
      />
    </div>
  );
};
