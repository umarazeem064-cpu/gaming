import React, { useEffect, useRef } from 'react';
import { GameRuntimeProps } from '../types/game';
import { seededRandom, soundFX } from '../utils/audio';

export const IphoneArcadeGame: React.FC<GameRuntimeProps> = ({
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

    const rand = seededRandom(level * 193 + (difficulty === 'easy' ? 11 : difficulty === 'medium' ? 43 : 97));
    const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'medium' ? 1.0 : 1.28;

    let rafId = 0;
    let lastTime = performance.now();
    let ended = false;

    const pointer = {
      down: false,
      x: W / 2,
      y: H / 2,
      prevX: W / 2,
      prevY: H / 2,
      trail: [] as Array<{ x: number; y: number; life: number }>,
    };

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H,
      };
    };

    let onTapAction = (_x: number, _y: number) => {};
    let onDragAction = (_dx: number, _dy: number, _x: number, _y: number) => {};
    let onKeyAction = (_code: string) => {};

    const handlePointerDown = (e: PointerEvent) => {
      const p = getPos(e);
      pointer.down = true;
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.prevX = p.x;
      pointer.prevY = p.y;
      onTapAction(p.x, p.y);
    };
    const handlePointerMove = (e: PointerEvent) => {
      const p = getPos(e);
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      pointer.prevX = pointer.x;
      pointer.prevY = pointer.y;
      pointer.x = p.x;
      pointer.y = p.y;
      if (pointer.down) {
        pointer.trail.push({ x: p.x, y: p.y, life: 1 });
        onDragAction(dx, dy, p.x, p.y);
      }
    };
    const handlePointerUp = () => {
      pointer.down = false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      onKeyAction(e.code);
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

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
    // 1. FRUIT BLADE PRO
    // =========================================================================
    if (game.id === 'fruit-blade') {
      const fruitColors = [
        { name: 'Watermelon', outer: '#16A34A', inner: '#EF4444', r: 30 },
        { name: 'Orange', outer: '#EA580C', inner: '#FB923C', r: 24 },
        { name: 'Kiwi', outer: '#854D0E', inner: '#84CC16', r: 22 },
        { name: 'Dragon', outer: '#DB2777', inner: '#F8FAFC', r: 27 },
      ];
      interface FlyingItem {
        x: number;
        y: number;
        vx: number;
        vy: number;
        r: number;
        isBomb: boolean;
        outer: string;
        inner: string;
        rot: number;
        vrot: number;
        sliced: boolean;
      }
      const items: FlyingItem[] = [];
      const particles: Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }> = [];
      let score = 0;
      const targetScore = 10 + Math.floor(level * 0.45);
      let lives = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 3 : 2;
      let spawnTimer = 0.3;

      cbRef.current.onStatusChange(`Sliced 0/${targetScore} · Lives ${lives}`);

      const checkSlice = (x1: number, y1: number, x2: number, y2: number) => {
        for (const it of items) {
          if (it.sliced) continue;
          const dist = Math.hypot(it.x - x2, it.y - y2);
          const midDist = Math.hypot(it.x - (x1 + x2) / 2, it.y - (y1 + y2) / 2);
          if (dist < it.r + 12 || midDist < it.r + 12) {
            it.sliced = true;
            if (it.isBomb) {
              soundFX.hit();
              fail(score * 50, 'Sliced an iron bomb!');
              return;
            }
            soundFX.slice();
            score += 1;
            cbRef.current.onScoreChange(score * 50);
            cbRef.current.onStatusChange(`Sliced ${score}/${targetScore} · Lives ${lives}`);
            for (let p = 0; p < 12; p++) {
              const a = rand() * Math.PI * 2;
              const spd = 80 + rand() * 180;
              particles.push({
                x: it.x,
                y: it.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                color: it.inner,
                life: 1,
              });
            }
            if (score >= targetScore) {
              win(score * 60 + lives * 100, `Mastered ${score} clean fruit slices!`);
            }
          }
        }
      };

      onDragAction = () => {
        checkSlice(pointer.prevX, pointer.prevY, pointer.x, pointer.y);
      };

      updateFn = (dt) => {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawnTimer = Math.max(0.45, (1.2 - level * 0.005) / diffMult);
          const count = rand() > 0.6 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            const isBomb = rand() < (0.14 + level * 0.001) * diffMult;
            const fc = fruitColors[Math.floor(rand() * fruitColors.length)];
            items.push({
              x: 90 + rand() * (W - 180),
              y: H + 30,
              vx: (rand() - 0.5) * 180,
              vy: -(620 + rand() * 140),
              r: isBomb ? 24 : fc.r,
              isBomb,
              outer: isBomb ? '#1E293B' : fc.outer,
              inner: isBomb ? '#EF4444' : fc.inner,
              rot: 0,
              vrot: (rand() - 0.5) * 4,
              sliced: false,
            });
          }
        }

        // Background wood board
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#291D16');
        bg.addColorStop(1, '#17100C');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        for (let y = 0; y < H; y += 64) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }

        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.vy += 680 * dt;
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.rot += it.vrot * dt;

          if (!it.sliced) {
            ctx.save();
            ctx.translate(it.x, it.y);
            ctx.rotate(it.rot);
            if (it.isBomb) {
              ctx.fillStyle = '#0F172A';
              ctx.beginPath();
              ctx.arc(0, 0, it.r, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#EF4444';
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.fillStyle = '#F59E0B';
              ctx.fillRect(-3, -it.r - 7, 6, 8);
            } else {
              ctx.fillStyle = it.outer;
              ctx.beginPath();
              ctx.arc(0, 0, it.r, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = it.inner;
              ctx.beginPath();
              ctx.arc(0, 0, it.r * 0.78, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,0.28)';
              ctx.beginPath();
              ctx.arc(-it.r * 0.3, -it.r * 0.3, it.r * 0.22, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          if (it.y > H + 60) {
            if (!it.sliced && !it.isBomb) {
              lives -= 1;
              cbRef.current.onStatusChange(`Sliced ${score}/${targetScore} · Lives ${lives}`);
              if (lives <= 0) fail(score * 50, 'Too many missed fruits!');
            }
            items.splice(i, 1);
          }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 320 * dt;
          p.life -= dt * 1.8;
          if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Blade trail
        for (let i = pointer.trail.length - 1; i >= 0; i--) {
          pointer.trail[i].life -= dt * 6;
          if (pointer.trail[i].life <= 0) pointer.trail.splice(i, 1);
        }
        if (pointer.trail.length > 1) {
          ctx.strokeStyle = '#F8FAFC';
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(pointer.trail[0].x, pointer.trail[0].y);
          for (const pt of pointer.trail) ctx.lineTo(pt.x, pt.y);
          ctx.stroke();
        }
      };
    }

    // =========================================================================
    // 2. STACK TOWER 3D (Isometric Precision Block Stacker)
    // =========================================================================
    else if (game.id === 'stack-tower') {
      const targetFloors = 8 + Math.floor(level / 6);
      const stack: Array<{ x: number; w: number; hue: number }> = [{ x: W / 2 - 110, w: 220, hue: 32 }];
      const debris: Array<{ x: number; y: number; w: number; vy: number; hue: number }> = [];
      let curX = 40;
      let curW = 220;
      let dir = 1;
      const moveSpeed = (220 + level * 2.5) * diffMult;
      let cameraY = 0;

      cbRef.current.onStatusChange(`Floor 1/${targetFloors}`);

      const dropBlock = () => {
        if (ended) return;
        const prev = stack[stack.length - 1];
        const overlapLeft = Math.max(curX, prev.x);
        const overlapRight = Math.min(curX + curW, prev.x + prev.w);
        const overlap = overlapRight - overlapLeft;

        if (overlap <= 4) {
          fail(stack.length * 100, 'Missed the tower completely!');
          return;
        }

        const perfect = Math.abs(curX - prev.x) < (difficulty === 'easy' ? 12 : 7);
        const finalX = perfect ? prev.x : overlapLeft;
        const finalW = perfect ? prev.w : overlap;

        if (!perfect) {
          const cutW = curW - overlap;
          const cutX = curX < prev.x ? curX : overlapRight;
          debris.push({
            x: cutX,
            y: H - 140 - stack.length * 32 + cameraY,
            w: cutW,
            vy: 0,
            hue: (32 + stack.length * 14) % 360,
          });
        }

        stack.push({ x: finalX, w: finalW, hue: (32 + stack.length * 14) % 360 });
        if (perfect) soundFX.score();
        else soundFX.click();

        curW = finalW;
        curX = stack.length % 2 === 0 ? 40 : W - curW - 40;
        dir = stack.length % 2 === 0 ? 1 : -1;

        cbRef.current.onScoreChange(stack.length * 100);
        cbRef.current.onStatusChange(`Floor ${stack.length}/${targetFloors}`);

        if (stack.length >= targetFloors) {
          win(stack.length * 120 + finalW, `Stacked ${targetFloors} floors cleanly!`);
        }
      };

      onTapAction = dropBlock;
      onKeyAction = (code) => {
        if (code === 'Space') dropBlock();
      };

      updateFn = (dt) => {
        curX += dir * moveSpeed * dt;
        if (curX + curW > W - 20) dir = -1;
        if (curX < 20) dir = 1;

        const targetCam = Math.max(0, (stack.length - 7) * 32);
        cameraY += (targetCam - cameraY) * Math.min(1, dt * 8);

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0F172A');
        bg.addColorStop(1, '#1E293B');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        const drawIsoBlock = (bx: number, by: number, bw: number, bh: number, hue: number) => {
          ctx.fillStyle = `hsl(${hue}, 78%, 52%)`;
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = `hsl(${hue}, 82%, 65%)`;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + 18, by - 12);
          ctx.lineTo(bx + bw + 18, by - 12);
          ctx.lineTo(bx + bw, by);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = `hsl(${hue}, 75%, 38%)`;
          ctx.beginPath();
          ctx.moveTo(bx + bw, by);
          ctx.lineTo(bx + bw + 18, by - 12);
          ctx.lineTo(bx + bw + 18, by + bh - 12);
          ctx.lineTo(bx + bw, by + bh);
          ctx.closePath();
          ctx.fill();
        };

        stack.forEach((b, idx) => {
          const by = H - 110 - idx * 32 + cameraY;
          if (by < H + 40 && by > -60) drawIsoBlock(b.x, by, b.w, 30, b.hue);
        });

        const activeY = H - 110 - stack.length * 32 + cameraY;
        drawIsoBlock(curX, activeY, curW, 30, (32 + stack.length * 14) % 360);

        for (let i = debris.length - 1; i >= 0; i--) {
          const d = debris[i];
          d.vy += 650 * dt;
          d.y += d.vy * dt;
          drawIsoBlock(d.x, d.y, d.w, 28, d.hue);
          if (d.y > H + 80) debris.splice(i, 1);
        }
      };
    }

    // =========================================================================
    // 3. HELIX DROP
    // =========================================================================
    else if (game.id === 'helix-drop') {
      const totalRings = 10 + Math.floor(level / 5);
      const rings: Array<{ gapStart: number; gapSize: number; hazardStart: number; hazardSize: number; cleared: boolean }> = [];
      for (let i = 0; i < totalRings; i++) {
        const gs = rand() * Math.PI * 2;
        const gapSize = Math.max(0.75, 1.35 - level * 0.003);
        const hs = (gs + gapSize + 0.4 + rand() * 1.5) % (Math.PI * 2);
        rings.push({
          gapStart: gs,
          gapSize,
          hazardStart: hs,
          hazardSize: difficulty === 'easy' ? 0.55 : 0.95,
          cleared: false,
        });
      }

      let towerRot = 0;
      let ballY = 120;
      let ballVy = 0;
      let camLayer = 0;
      let ringIdx = 0;
      let score = 0;

      cbRef.current.onStatusChange(`Ring 0/${totalRings}`);

      onDragAction = (dx) => {
        towerRot += dx * 0.014;
      };
      onKeyAction = (code) => {
        if (code === 'ArrowLeft' || code === 'KeyA') towerRot -= 0.35;
        if (code === 'ArrowRight' || code === 'KeyD') towerRot += 0.35;
      };

      const angleInArc = (a: number, start: number, size: number) => {
        const norm = ((a - start) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        return norm <= size;
      };

      updateFn = (dt) => {
        ballVy += 900 * dt;
        ballY += ballVy * dt;
        const targetCam = ringIdx * 110;
        camLayer += (targetCam - camLayer) * Math.min(1, dt * 10);

        const activeScreenY = 230 + ringIdx * 110 - camLayer;
        if (ringIdx < rings.length && ballY >= activeScreenY - 12 && ballVy > 0) {
          const r = rings[ringIdx];
          // Ball is positioned at front angle PI/2 relative to tower rotation
          const hitAngle = Math.PI / 2 - towerRot;
          if (angleInArc(hitAngle, r.gapStart, r.gapSize)) {
            r.cleared = true;
            ringIdx += 1;
            score += 100;
            soundFX.score();
            cbRef.current.onScoreChange(score);
            cbRef.current.onStatusChange(`Ring ${ringIdx}/${totalRings}`);
            if (ringIdx >= totalRings) {
              win(score + 200, 'Shattered all helix tiers!');
              return;
            }
          } else if (angleInArc(hitAngle, r.hazardStart, r.hazardSize)) {
            fail(score, 'Hit a red hazard plate!');
            return;
          } else {
            ballY = activeScreenY - 12;
            ballVy = -390;
            soundFX.bounce();
          }
        }

        ctx.fillStyle = '#0B1120';
        ctx.fillRect(0, 0, W, H);

        // Central pillar
        ctx.fillStyle = '#334155';
        ctx.fillRect(W / 2 - 22, 0, 44, H);

        // Draw rings
        for (let i = Math.min(rings.length - 1, ringIdx + 4); i >= ringIdx; i--) {
          const ry = 230 + i * 110 - camLayer;
          const r = rings[i];
          ctx.save();
          ctx.translate(W / 2, ry);
          ctx.scale(1, 0.36);

          // Safe solid ring
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 34;
          ctx.beginPath();
          ctx.arc(0, 0, 120, r.gapStart + r.gapSize + towerRot, r.gapStart + Math.PI * 2 + towerRot);
          ctx.stroke();

          // Hazard arc
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 36;
          ctx.beginPath();
          ctx.arc(0, 0, 120, r.hazardStart + towerRot, r.hazardStart + r.hazardSize + towerRot);
          ctx.stroke();

          ctx.restore();
        }

        // Bouncing ball in front
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(W / 2, ballY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(W / 2 - 4, ballY - 4, 4, 0, Math.PI * 2);
        ctx.fill();
      };
    }

    // =========================================================================
    // 4. FLAPPY AERO
    // =========================================================================
    else if (game.id === 'flappy-aero') {
      const targetGates = 8 + Math.floor(level / 6);
      let py = H / 2;
      let pvy = 0;
      let passed = 0;
      const gapH = Math.max(120, 195 - level * 0.45 - (difficulty === 'difficult' ? 25 : 0));
      const speed = (175 + level * 1.8) * diffMult;

      const pipes: Array<{ x: number; gapY: number; scored: boolean }> = [];
      for (let i = 0; i < 4; i++) {
        pipes.push({ x: W + i * 220, gapY: 140 + rand() * (H - 280), scored: false });
      }

      const flap = () => {
        if (ended) return;
        pvy = -345;
        soundFX.click();
      };
      onTapAction = flap;
      onKeyAction = (code) => {
        if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') flap();
      };

      cbRef.current.onStatusChange(`Gates 0/${targetGates}`);

      updateFn = (dt) => {
        pvy += 940 * dt;
        py += pvy * dt;

        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0C192C');
        bg.addColorStop(1, '#1E293B');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        for (const p of pipes) {
          p.x -= speed * dt;
          if (p.x < -70) {
            p.x += 4 * 220;
            p.gapY = 130 + rand() * (H - 260);
            p.scored = false;
          }

          ctx.fillStyle = '#334155';
          ctx.fillRect(p.x, 0, 62, p.gapY - gapH / 2);
          ctx.fillRect(p.x, p.gapY + gapH / 2, 62, H - (p.gapY + gapH / 2));
          ctx.fillStyle = '#0EA5E9';
          ctx.fillRect(p.x - 4, p.gapY - gapH / 2 - 12, 70, 12);
          ctx.fillRect(p.x - 4, p.gapY + gapH / 2, 70, 12);

          if (!p.scored && p.x + 62 < 140) {
            p.scored = true;
            passed += 1;
            soundFX.score();
            cbRef.current.onScoreChange(passed * 100);
            cbRef.current.onStatusChange(`Gates ${passed}/${targetGates}`);
            if (passed >= targetGates) {
              win(passed * 125, `Flew cleanly through ${targetGates} gates!`);
              return;
            }
          }

          if (140 + 14 > p.x && 140 - 14 < p.x + 62) {
            if (py - 12 < p.gapY - gapH / 2 || py + 12 > p.gapY + gapH / 2) {
              fail(passed * 100, 'Crashed into steel canyon gate!');
              return;
            }
          }
        }

        if (py < 12 || py > H - 12) {
          fail(passed * 100, 'Hit terrain boundary!');
          return;
        }

        // Sleek jet silhouette
        ctx.save();
        ctx.translate(140, py);
        ctx.rotate(Math.max(-0.45, Math.min(0.6, pvy * 0.0014)));
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-16, -12);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-16, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#38BDF8';
        ctx.beginPath();
        ctx.arc(4, -2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
    }

    // =========================================================================
    // 5. CROSSY STREET
    // =========================================================================
    else if (game.id === 'crossy-street') {
      const totalRows = 11 + Math.floor(level / 12);
      const cellSize = 44;
      const cols = 11;
      interface Lane {
        type: 'grass' | 'road' | 'river';
        speed: number;
        items: Array<{ x: number; w: number; color: string }>;
      }
      const lanes: Lane[] = [];
      for (let r = 0; r <= totalRows; r++) {
        if (r === 0 || r === totalRows || r % 4 === 0) {
          lanes.push({ type: 'grass', speed: 0, items: [] });
        } else {
          const isRiver = r % 3 === 0;
          const spd = (rand() > 0.5 ? 1 : -1) * (80 + rand() * 90 + level * 1.2) * diffMult;
          const items: Array<{ x: number; w: number; color: string }> = [];
          const count = isRiver ? 3 : 2 + (rand() > 0.5 ? 1 : 0);
          for (let i = 0; i < count; i++) {
            items.push({
              x: i * (W / count) + rand() * 35,
              w: isRiver ? 100 : 62 + rand() * 24,
              color: isRiver ? '#92400E' : ['#EF4444', '#F59E0B', '#38BDF8', '#E2E8F0'][i % 4],
            });
          }
          lanes.push({ type: isRiver ? 'river' : 'road', speed: spd, items });
        }
      }

      let pr = 0;
      let px = W / 2;

      const hop = (dr: number, dc: number) => {
        if (ended) return;
        pr = Math.max(0, Math.min(totalRows, pr + dr));
        px = Math.max(24, Math.min(W - 24, px + dc * cellSize));
        soundFX.click();
        cbRef.current.onScoreChange(pr * 80);
        cbRef.current.onStatusChange(`Lane ${pr}/${totalRows}`);
        if (pr >= totalRows) {
          win(totalRows * 100, 'Crossed every street and river safely!');
        }
      };

      onTapAction = (x, y) => {
        if (y < H * 0.65) hop(1, 0);
        else if (x < W * 0.35) hop(0, -1);
        else if (x > W * 0.65) hop(0, 1);
        else hop(-1, 0);
      };
      onKeyAction = (code) => {
        if (code === 'ArrowUp' || code === 'KeyW') hop(1, 0);
        if (code === 'ArrowDown' || code === 'KeyS') hop(-1, 0);
        if (code === 'ArrowLeft' || code === 'KeyA') hop(0, -1);
        if (code === 'ArrowRight' || code === 'KeyD') hop(0, 1);
      };

      cbRef.current.onStatusChange(`Lane 0/${totalRows}`);

      updateFn = (dt) => {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);

        const viewOffset = Math.max(0, (pr - 4) * cellSize);

        lanes.forEach((ln, idx) => {
          const ly = H - 70 - idx * cellSize + viewOffset;
          ctx.fillStyle =
            idx === totalRows
              ? '#10B981'
              : ln.type === 'grass'
              ? '#15803D'
              : ln.type === 'road'
              ? '#1E293B'
              : '#0284C7';
          ctx.fillRect(0, ly - cellSize / 2, W, cellSize - 2);

          let onLog = false;
          for (const it of ln.items) {
            it.x += ln.speed * dt;
            if (it.x > W + 40) it.x = -it.w - 20;
            if (it.x + it.w < -40) it.x = W + 20;

            ctx.fillStyle = it.color;
            ctx.fillRect(it.x, ly - 13, it.w, 26);

            if (idx === pr) {
              if (ln.type === 'road' && px + 12 > it.x && px - 12 < it.x + it.w) {
                fail(pr * 80, 'Struck by oncoming traffic!');
                return;
              }
              if (ln.type === 'river' && px > it.x - 4 && px < it.x + it.w + 4) {
                onLog = true;
                px += ln.speed * dt;
              }
            }
          }
          if (idx === pr && ln.type === 'river' && !onLog) {
            fail(pr * 80, 'Fell into the river!');
            return;
          }
          if (px < 8 || px > W - 8) {
            fail(pr * 80, 'Drifted out of bounds!');
            return;
          }
        });

        // Player cube character
        const py = H - 70 - pr * cellSize + viewOffset;
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(px - 14, py - 14, 28, 28);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(px - 6, py - 8, 12, 8);
        void cols;
      };
    }

    // =========================================================================
    // 6. SKYWARD HOPPER (Doodle Jump style)
    // =========================================================================
    else if (game.id === 'skyward-hopper') {
      const targetAlt = 1400 + level * 55;
      interface Plat {
        x: number;
        y: number;
        w: number;
        moving: number;
        spring: boolean;
      }
      const plats: Plat[] = [];
      for (let i = 0; i < 16; i++) {
        plats.push({
          x: 60 + rand() * (W - 180),
          y: H - 40 - i * 52,
          w: Math.max(66, 105 - level * 0.25),
          moving: i > 2 && rand() > 0.65 ? (rand() > 0.5 ? 90 : -90) * diffMult : 0,
          spring: rand() > 0.85,
        });
      }
      plats[0].x = W / 2 - 50;
      plats[0].w = 110;

      let px = W / 2;
      let py = H - 70;
      let pvx = 0;
      let pvy = -420;
      let maxAlt = 0;

      onDragAction = (dx) => {
        px += dx * 1.15;
      };
      onTapAction = (x) => {
        pvx = x < W / 2 ? -240 : 240;
      };
      onKeyAction = (code) => {
        if (code === 'ArrowLeft' || code === 'KeyA') pvx = -290;
        if (code === 'ArrowRight' || code === 'KeyD') pvx = 290;
      };

      cbRef.current.onStatusChange(`Altitude 0/${targetAlt}m`);

      updateFn = (dt) => {
        pvy += 860 * dt;
        px += pvx * dt;
        pvx *= 0.92;
        py += pvy * dt;
        if (px < 0) px = W;
        if (px > W) px = 0;

        if (py < H * 0.4 && pvy < 0) {
          const shift = H * 0.4 - py;
          py = H * 0.4;
          maxAlt += shift;
          for (const pl of plats) {
            pl.y += shift;
            if (pl.y > H + 20) {
              pl.y -= 16 * 52;
              pl.x = 40 + rand() * (W - 140);
            }
          }
          cbRef.current.onScoreChange(Math.round(maxAlt));
          cbRef.current.onStatusChange(`Altitude ${Math.round(maxAlt)}/${targetAlt}m`);
          if (maxAlt >= targetAlt) {
            win(maxAlt, 'Reached peak sky altitude!');
            return;
          }
        }

        if (pvy > 0) {
          for (const pl of plats) {
            if (py + 14 >= pl.y && py + 14 <= pl.y + 18 && px + 10 >= pl.x && px - 10 <= pl.x + pl.w) {
              pvy = pl.spring ? -760 : -510;
              soundFX.bounce();
            }
          }
        }

        if (py > H + 40) {
          fail(maxAlt, 'Fell below cloud deck!');
          return;
        }

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);

        for (const pl of plats) {
          if (pl.moving !== 0) {
            pl.x += pl.moving * dt;
            if (pl.x < 10 || pl.x + pl.w > W - 10) pl.moving *= -1;
          }
          ctx.fillStyle = pl.spring ? '#F59E0B' : pl.moving !== 0 ? '#38BDF8' : '#22C55E';
          ctx.fillRect(pl.x, pl.y, pl.w, 12);
        }

        ctx.fillStyle = '#A855F7';
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
      };
    }

    // =========================================================================
    // 7. KNIFE STRIKE
    // =========================================================================
    else if (game.id === 'knife-strike') {
      const totalKnives = 6 + Math.floor(level / 10);
      const pinnedAngles: number[] = [];
      const initialPinned = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
      for (let i = 0; i < initialPinned; i++) {
        pinnedAngles.push((i * Math.PI * 2) / initialPinned);
      }

      let logAngle = 0;
      let knivesLeft = totalKnives;
      let thrownY: number | null = null;
      let score = 0;

      const throwKnife = () => {
        if (ended || thrownY !== null || knivesLeft <= 0) return;
        thrownY = H - 110;
        soundFX.slice();
      };
      onTapAction = throwKnife;
      onKeyAction = (code) => {
        if (code === 'Space' || code === 'ArrowUp') throwKnife();
      };

      cbRef.current.onStatusChange(`Knives Left: ${knivesLeft}`);

      updateFn = (dt, t) => {
        const speedWave = 1.6 + level * 0.02 + Math.sin(t * 1.4) * (difficulty === 'difficult' ? 1.5 : 0.6);
        logAngle += speedWave * diffMult * dt;

        if (thrownY !== null) {
          thrownY -= 1200 * dt;
          if (thrownY <= 255) {
            const impactAngle = ((Math.PI / 2 - logAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
            const hitOther = pinnedAngles.some((a) => {
              const d = Math.abs(((impactAngle - a + Math.PI) % (Math.PI * 2)) - Math.PI);
              return d < 0.24;
            });
            if (hitOther) {
              fail(score, 'Knife clashed against an embedded blade!');
              return;
            }
            pinnedAngles.push(impactAngle);
            knivesLeft -= 1;
            score += 120;
            thrownY = null;
            soundFX.hit();
            cbRef.current.onScoreChange(score);
            cbRef.current.onStatusChange(`Knives Left: ${knivesLeft}`);
            if (knivesLeft <= 0) {
              win(score + 200, 'All steel blades embedded cleanly!');
              return;
            }
          }
        }

        ctx.fillStyle = '#131620';
        ctx.fillRect(0, 0, W, H);

        // Embedded knives
        const cx = W / 2;
        const cy = 200;
        for (const a of pinnedAngles) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(a + logAngle);
          ctx.fillStyle = '#E2E8F0';
          ctx.fillRect(62, -4, 48, 8);
          ctx.fillStyle = '#F97316';
          ctx.fillRect(102, -7, 26, 14);
          ctx.restore();
        }

        // Timber Log
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.arc(cx, cy, 72, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(cx, cy, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#92400E';
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fill();

        // Active / Ready knife
        const ky = thrownY ?? H - 110;
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(cx, ky - 34);
        ctx.lineTo(cx + 6, ky);
        ctx.lineTo(cx - 6, ky);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#F97316';
        ctx.fillRect(cx - 7, ky, 14, 34);
      };
    }

    // =========================================================================
    // 8. COLOR RING DASH
    // =========================================================================
    else if (game.id === 'color-ring') {
      const colors = ['#EC4899', '#38BDF8', '#FACC15', '#10B981'];
      const totalGates = 5 + Math.floor(level / 14);
      let ballColorIdx = 0;
      let ballY = H - 120;
      let ballVy = 0;
      let camY = 0;
      let cleared = 0;

      const gates = Array.from({ length: totalGates }, (_, i) => ({
        y: H - 300 - i * 240,
        rot: rand() * Math.PI * 2,
        speed: (i % 2 === 0 ? 1 : -1) * (1.3 + level * 0.018) * diffMult,
        scored: false,
      }));

      const jump = () => {
        if (ended) return;
        ballVy = -370;
        soundFX.click();
      };
      onTapAction = jump;
      onKeyAction = (code) => {
        if (code === 'Space' || code === 'ArrowUp') jump();
      };

      cbRef.current.onStatusChange(`Rings 0/${totalGates}`);

      updateFn = (dt) => {
        ballVy += 880 * dt;
        ballY += ballVy * dt;
        if (ballY > H - 40) {
          ballY = H - 40;
          ballVy = 0;
        }
        if (ballY < H * 0.45) {
          const shift = H * 0.45 - ballY;
          ballY = H * 0.45;
          camY += shift;
          for (const g of gates) g.y += shift;
        }

        ctx.fillStyle = '#0B0E14';
        ctx.fillRect(0, 0, W, H);

        for (const g of gates) {
          g.rot += g.speed * dt;
          for (let q = 0; q < 4; q++) {
            const a0 = g.rot + (q * Math.PI) / 2;
            const a1 = a0 + Math.PI / 2;
            ctx.strokeStyle = colors[q];
            ctx.lineWidth = 18;
            ctx.beginPath();
            ctx.arc(W / 2, g.y, 76, a0, a1);
            ctx.stroke();

            // Check intersection at top or bottom of ring (angle PI/2 bottom, -PI/2 top)
            const checkArc = (probeY: number, probeAngle: number) => {
              if (Math.abs(ballY - probeY) < 14) {
                const rel = ((probeAngle - g.rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
                const seg = Math.floor(rel / (Math.PI / 2)) % 4;
                if (seg !== ballColorIdx) {
                  fail(cleared * 150, 'Touched mismatched color arc!');
                }
              }
            };
            if (q === 0) {
              checkArc(g.y + 76, Math.PI / 2);
              checkArc(g.y - 76, -Math.PI / 2);
            }
          }

          if (!g.scored && ballY < g.y) {
            g.scored = true;
            cleared += 1;
            ballColorIdx = (ballColorIdx + 1) % 4;
            soundFX.score();
            cbRef.current.onScoreChange(cleared * 150);
            cbRef.current.onStatusChange(`Rings ${cleared}/${totalGates}`);
            if (cleared >= totalGates) {
              win(cleared * 180 + Math.round(camY * 0.1), 'Cleared all spectrum gates!');
              return;
            }
          }
        }

        ctx.fillStyle = colors[ballColorIdx];
        ctx.beginPath();
        ctx.arc(W / 2, ballY, 13, 0, Math.PI * 2);
        ctx.fill();
      };
    }

    // =========================================================================
    // 9. GRAVITY FLIP
    // =========================================================================
    else if (game.id === 'gravity-flip') {
      const floorY = H - 100;
      const ceilY = 100;
      let py = floorY - 20;
      let grav = 1; // 1 down, -1 up
      let vy = 0;
      let dist = 0;
      const targetDist = 900 + level * 40;
      const speed = (240 + level * 2.2) * diffMult;
      const spikes: Array<{ x: number; onCeil: boolean; w: number }> = [];
      for (let i = 0; i < 6; i++) {
        spikes.push({ x: W + i * 210, onCeil: rand() > 0.5, w: 34 });
      }

      const flip = () => {
        if (ended) return;
        grav *= -1;
        soundFX.click();
      };
      onTapAction = flip;
      onKeyAction = (code) => {
        if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown') flip();
      };

      cbRef.current.onStatusChange(`0% Distance`);

      updateFn = (dt) => {
        vy += grav * 1850 * dt;
        py += vy * dt;
        if (py > floorY - 18) {
          py = floorY - 18;
          vy = 0;
        }
        if (py < ceilY + 18) {
          py = ceilY + 18;
          vy = 0;
        }

        dist += speed * dt;
        cbRef.current.onScoreChange(Math.round(dist));
        cbRef.current.onStatusChange(`${Math.min(100, Math.round((dist / targetDist) * 100))}%`);
        if (dist >= targetDist) {
          win(dist, 'Outran the gravity corridor!');
          return;
        }

        ctx.fillStyle = '#0D131F';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#14B8A6';
        ctx.fillRect(0, ceilY - 10, W, 10);
        ctx.fillRect(0, floorY, W, 10);

        for (const sp of spikes) {
          sp.x -= speed * dt;
          if (sp.x < -50) {
            sp.x += 6 * 210;
            sp.onCeil = rand() > 0.5;
          }
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          if (sp.onCeil) {
            ctx.moveTo(sp.x, ceilY);
            ctx.lineTo(sp.x + sp.w / 2, ceilY + 34);
            ctx.lineTo(sp.x + sp.w, ceilY);
          } else {
            ctx.moveTo(sp.x, floorY);
            ctx.lineTo(sp.x + sp.w / 2, floorY - 34);
            ctx.lineTo(sp.x + sp.w, floorY);
          }
          ctx.closePath();
          ctx.fill();

          // Collision check
          if (Math.abs(120 - (sp.x + sp.w / 2)) < 22) {
            if ((sp.onCeil && py - 16 < ceilY + 28) || (!sp.onCeil && py + 16 > floorY - 28)) {
              fail(dist, 'Impaled on corridor spikes!');
              return;
            }
          }
        }

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(104, py - 16, 32, 32);
        ctx.fillStyle = '#14B8A6';
        ctx.fillRect(114, py - 6, 12, 12);
      };
    }

    // =========================================================================
    // 10. BRICK BREAKER FORGE
    // =========================================================================
    else {
      const rows = Math.min(7, 3 + Math.floor(level / 18));
      const cols = 8;
      const bricks: Array<{ x: number; y: number; w: number; h: number; hp: number; color: string }> = [];
      const bw = (W - 60) / cols;
      const palette = ['#EF4444', '#F59E0B', '#10B981', '#38BDF8', '#A855F7'];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (rand() > 0.15) {
            bricks.push({
              x: 30 + c * bw + 2,
              y: 65 + r * 28,
              w: bw - 4,
              h: 22,
              hp: r === 0 && level > 15 ? 2 : 1,
              color: palette[r % palette.length],
            });
          }
        }
      }

      let padX = W / 2 - 55;
      const padW = difficulty === 'easy' ? 125 : difficulty === 'medium' ? 105 : 85;
      let bx = W / 2;
      let by = H - 100;
      let bvx = (220 + level * 1.6) * diffMult * (rand() > 0.5 ? 1 : -1);
      let bvy = -(280 + level * 1.8) * diffMult;
      let lives = difficulty === 'easy' ? 4 : 3;
      let score = 0;

      onDragAction = (_dx, _dy, x) => {
        padX = Math.max(10, Math.min(W - padW - 10, x - padW / 2));
      };
      onTapAction = (x) => {
        padX = Math.max(10, Math.min(W - padW - 10, x - padW / 2));
      };
      onKeyAction = (code) => {
        if (code === 'ArrowLeft' || code === 'KeyA') padX = Math.max(10, padX - 42);
        if (code === 'ArrowRight' || code === 'KeyD') padX = Math.min(W - padW - 10, padX + 42);
      };

      cbRef.current.onStatusChange(`Bricks ${bricks.length} · Lives ${lives}`);

      updateFn = (dt) => {
        bx += bvx * dt;
        by += bvy * dt;
        if (bx < 10) { bx = 10; bvx = Math.abs(bvx); soundFX.bounce(); }
        if (bx > W - 10) { bx = W - 10; bvx = -Math.abs(bvx); soundFX.bounce(); }
        if (by < 10) { by = 10; bvy = Math.abs(bvy); soundFX.bounce(); }

        if (by > H - 64 && by < H - 44 && bx > padX - 8 && bx < padX + padW + 8 && bvy > 0) {
          const hitNorm = (bx - (padX + padW / 2)) / (padW / 2);
          bvx = hitNorm * 340 * diffMult;
          bvy = -Math.abs(bvy);
          soundFX.bounce();
        }

        if (by > H + 20) {
          lives -= 1;
          soundFX.hit();
          if (lives <= 0) {
            fail(score, 'Lost all steel balls!');
            return;
          }
          bx = padX + padW / 2;
          by = H - 90;
          bvy = -Math.abs(bvy);
          cbRef.current.onStatusChange(`Bricks ${bricks.length} · Lives ${lives}`);
        }

        for (let i = bricks.length - 1; i >= 0; i--) {
          const br = bricks[i];
          if (bx + 8 > br.x && bx - 8 < br.x + br.w && by + 8 > br.y && by - 8 < br.y + br.h) {
            bvy *= -1;
            br.hp -= 1;
            if (br.hp <= 0) {
              bricks.splice(i, 1);
              score += 100;
              soundFX.score();
            } else {
              soundFX.click();
            }
            cbRef.current.onScoreChange(score);
            cbRef.current.onStatusChange(`Bricks ${bricks.length} · Lives ${lives}`);
            if (bricks.length === 0) {
              win(score + lives * 150, 'All armored bricks shattered!');
              return;
            }
            break;
          }
        }

        ctx.fillStyle = '#0B0E14';
        ctx.fillRect(0, 0, W, H);
        for (const br of bricks) {
          ctx.fillStyle = br.hp > 1 ? '#94A3B8' : br.color;
          ctx.fillRect(br.x, br.y, br.w, br.h);
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(br.x, br.y, br.w, 4);
        }

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(padX, H - 56, padW, 14);
        ctx.fillStyle = '#EAB308';
        ctx.beginPath();
        ctx.arc(bx, by, 9, 0, Math.PI * 2);
        ctx.fill();
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
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
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
