import React, { useEffect, useRef, useState } from 'react';
import { GameRuntimeProps } from '../types/game';
import { seededRandom, soundFX } from '../utils/audio';

export const ActionShooterGame: React.FC<GameRuntimeProps> = ({
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

  const ctrlRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    tdType: 'cannon' as 'cannon' | 'frost' | 'laser',
    pacDir: { x: 1, y: 0 },
  });
  const [tdSelected, setTdSelected] = useState<'cannon' | 'frost' | 'laser'>('cannon');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 560;
    const H = 640;
    canvas.width = W;
    canvas.height = H;

    const rand = seededRandom(level * 307 + (difficulty === 'easy' ? 17 : difficulty === 'medium' ? 59 : 113));
    const diffMult = difficulty === 'easy' ? 0.8 : difficulty === 'medium' ? 1.0 : 1.25;

    let rafId = 0;
    let lastTime = performance.now();
    let ended = false;

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * W,
        y: ((e.clientY - rect.top) / rect.height) * H,
      };
    };

    let onTap = (_x: number, _y: number) => {};
    let onDrag = (_x: number, _y: number) => {};
    let pointerDown = false;

    const handleDown = (e: PointerEvent) => {
      pointerDown = true;
      const p = getPos(e);
      onTap(p.x, p.y);
    };
    const handleMove = (e: PointerEvent) => {
      if (!pointerDown) return;
      const p = getPos(e);
      onDrag(p.x, p.y);
    };
    const handleUp = () => {
      pointerDown = false;
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        ctrlRef.current.left = true;
        ctrlRef.current.pacDir = { x: -1, y: 0 };
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        ctrlRef.current.right = true;
        ctrlRef.current.pacDir = { x: 1, y: 0 };
      }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        ctrlRef.current.up = true;
        ctrlRef.current.pacDir = { x: 0, y: -1 };
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        ctrlRef.current.down = true;
        ctrlRef.current.pacDir = { x: 0, y: 1 };
      }
      if (e.code === 'Space') ctrlRef.current.fire = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') ctrlRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') ctrlRef.current.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') ctrlRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') ctrlRef.current.down = false;
      if (e.code === 'Space') ctrlRef.current.fire = false;
    };

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
    // 1. ORBITAL INVADERS
    // =========================================================================
    if (game.id === 'orbital-invaders') {
      let shipX = W / 2;
      const rows = Math.min(5, 2 + Math.floor(level / 22));
      const cols = 7;
      const aliens: Array<{ x: number; y: number; alive: boolean; row: number }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          aliens.push({ x: 75 + c * 62, y: 75 + r * 44, alive: true, row: r });
        }
      }
      const bullets: Array<{ x: number; y: number; vy: number; enemy: boolean }> = [];
      let alienDir = 1;
      let fireCooldown = 0;
      let enemyFireTimer = 0.9;
      let lives = difficulty === 'easy' ? 4 : 3;
      let score = 0;

      onDrag = (x) => { shipX = Math.max(30, Math.min(W - 30, x)); };
      onTap = (x) => { shipX = Math.max(30, Math.min(W - 30, x)); };
      cbRef.current.onStatusChange(`Aliens ${aliens.length} · Lives ${lives}`);

      updateFn = (dt) => {
        if (ctrlRef.current.left) shipX -= 320 * dt;
        if (ctrlRef.current.right) shipX += 320 * dt;
        shipX = Math.max(30, Math.min(W - 30, shipX));

        fireCooldown -= dt;
        if (fireCooldown <= 0) {
          fireCooldown = 0.28;
          bullets.push({ x: shipX, y: H - 62, vy: -520, enemy: false });
          soundFX.laser();
        }

        enemyFireTimer -= dt;
        const aliveAliens = aliens.filter((a) => a.alive);
        if (enemyFireTimer <= 0 && aliveAliens.length > 0) {
          enemyFireTimer = Math.max(0.35, 1.15 / diffMult - level * 0.005);
          const shooter = aliveAliens[Math.floor(rand() * aliveAliens.length)];
          bullets.push({ x: shooter.x, y: shooter.y + 14, vy: 280 * diffMult, enemy: true });
        }

        let hitEdge = false;
        const alienSpd = (55 + level * 0.8 + (aliens.length - aliveAliens.length) * 1.5) * diffMult;
        for (const a of aliveAliens) {
          a.x += alienDir * alienSpd * dt;
          if (a.x > W - 36 || a.x < 36) hitEdge = true;
          if (a.y > H - 90) {
            fail(score, 'Alien squadron landed!');
            return;
          }
        }
        if (hitEdge) {
          alienDir *= -1;
          for (const a of aliveAliens) a.y += 18;
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.y += b.vy * dt;
          if (b.y < -20 || b.y > H + 20) { bullets.splice(i, 1); continue; }
          if (!b.enemy) {
            for (const a of aliveAliens) {
              if (Math.abs(b.x - a.x) < 18 && Math.abs(b.y - a.y) < 14) {
                a.alive = false;
                bullets.splice(i, 1);
                score += 100;
                soundFX.score();
                cbRef.current.onScoreChange(score);
                const rem = aliens.filter((k) => k.alive).length;
                cbRef.current.onStatusChange(`Aliens ${rem} · Lives ${lives}`);
                if (rem === 0) {
                  win(score + lives * 200, 'Orbital sector cleared!');
                  return;
                }
                break;
              }
            }
          } else if (Math.abs(b.x - shipX) < 20 && Math.abs(b.y - (H - 50)) < 16) {
            bullets.splice(i, 1);
            lives -= 1;
            soundFX.hit();
            cbRef.current.onStatusChange(`Aliens ${aliveAliens.length} · Lives ${lives}`);
            if (lives <= 0) {
              fail(score, 'Interceptor destroyed!');
              return;
            }
          }
        }

        ctx.fillStyle = '#070B14';
        ctx.fillRect(0, 0, W, H);

        for (const a of aliveAliens) {
          ctx.fillStyle = ['#22D3EE', '#A855F7', '#F59E0B', '#EF4444'][a.row % 4];
          ctx.fillRect(a.x - 16, a.y - 10, 32, 20);
          ctx.fillStyle = '#070B14';
          ctx.fillRect(a.x - 9, a.y - 4, 5, 5);
          ctx.fillRect(a.x + 4, a.y - 4, 5, 5);
        }

        for (const b of bullets) {
          ctx.fillStyle = b.enemy ? '#EF4444' : '#FACC15';
          ctx.fillRect(b.x - 2, b.y - 7, 4, 14);
        }

        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.moveTo(shipX, H - 68);
        ctx.lineTo(shipX + 20, H - 40);
        ctx.lineTo(shipX - 20, H - 40);
        ctx.closePath();
        ctx.fill();
      };
    }

    // =========================================================================
    // 2. ASTEROID BELT 360
    // =========================================================================
    else if (game.id === 'asteroid-belt') {
      const ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2 };
      interface Rock { x: number; y: number; vx: number; vy: number; r: number; }
      const rocks: Rock[] = [];
      const count = 4 + Math.floor(level / 15);
      for (let i = 0; i < count; i++) {
        const ang = rand() * Math.PI * 2;
        rocks.push({
          x: i % 2 === 0 ? 50 : W - 50,
          y: 60 + rand() * (H - 120),
          vx: Math.cos(ang) * (70 + level * 0.9) * diffMult,
          vy: Math.sin(ang) * (70 + level * 0.9) * diffMult,
          r: 28,
        });
      }
      const shots: Array<{ x: number; y: number; vx: number; vy: number; life: number }> = [];
      let fireCd = 0;
      let score = 0;
      let lives = difficulty === 'easy' ? 4 : 3;

      cbRef.current.onStatusChange(`Meteors ${rocks.length} · Lives ${lives}`);

      updateFn = (dt) => {
        if (ctrlRef.current.left) ship.angle -= 3.6 * dt;
        if (ctrlRef.current.right) ship.angle += 3.6 * dt;
        if (ctrlRef.current.up) {
          ship.vx += Math.cos(ship.angle) * 260 * dt;
          ship.vy += Math.sin(ship.angle) * 260 * dt;
        }
        ship.vx *= 0.99;
        ship.vy *= 0.99;
        ship.x = (ship.x + ship.vx * dt + W) % W;
        ship.y = (ship.y + ship.vy * dt + H) % H;

        fireCd -= dt;
        if ((ctrlRef.current.fire || pointerDown) && fireCd <= 0) {
          fireCd = 0.22;
          shots.push({
            x: ship.x + Math.cos(ship.angle) * 16,
            y: ship.y + Math.sin(ship.angle) * 16,
            vx: Math.cos(ship.angle) * 480,
            vy: Math.sin(ship.angle) * 480,
            life: 1.1,
          });
          soundFX.laser();
        }

        ctx.fillStyle = '#070A12';
        ctx.fillRect(0, 0, W, H);

        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.x = (s.x + s.vx * dt + W) % W;
          s.y = (s.y + s.vy * dt + H) % H;
          s.life -= dt;
          if (s.life <= 0) { shots.splice(i, 1); continue; }
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
        }

        for (let i = rocks.length - 1; i >= 0; i--) {
          const r = rocks[i];
          r.x = (r.x + r.vx * dt + W) % W;
          r.y = (r.y + r.vy * dt + H) % H;

          ctx.strokeStyle = '#94A3B8';
          ctx.fillStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

          if (Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 12) {
            lives -= 1;
            soundFX.hit();
            ship.x = W / 2; ship.y = H / 2; ship.vx = 0; ship.vy = 0;
            cbRef.current.onStatusChange(`Meteors ${rocks.length} · Lives ${lives}`);
            if (lives <= 0) {
              fail(score, 'Ship hull breached by asteroids!');
              return;
            }
          }

          for (let j = shots.length - 1; j >= 0; j--) {
            const s = shots[j];
            if (Math.hypot(s.x - r.x, s.y - r.y) < r.r) {
              shots.splice(j, 1);
              rocks.splice(i, 1);
              score += 100;
              soundFX.score();
              if (r.r > 18) {
                rocks.push({ x: r.x, y: r.y, vx: r.vy * 1.2, vy: -r.vx * 1.2, r: 14 });
                rocks.push({ x: r.x, y: r.y, vx: -r.vy * 1.2, vy: r.vx * 1.2, r: 14 });
              }
              cbRef.current.onScoreChange(score);
              cbRef.current.onStatusChange(`Meteors ${rocks.length} · Lives ${lives}`);
              if (rocks.length === 0) {
                win(score + lives * 150, 'Asteroid belt cleared!');
                return;
              }
              break;
            }
          }
        }

        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-12, -10);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-12, 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };
    }

    // =========================================================================
    // 3. SKY SQUADRON
    // =========================================================================
    else if (game.id === 'sky-squadron') {
      let px = W / 2;
      let py = H - 90;
      const targetKills = 12 + Math.floor(level * 0.4);
      let kills = 0;
      let lives = difficulty === 'easy' ? 4 : 3;
      const enemies: Array<{ x: number; y: number; vx: number; vy: number; hp: number }> = [];
      const bullets: Array<{ x: number; y: number; vx: number; vy: number; enemy: boolean }> = [];
      let spawnT = 0.4;
      let fireT = 0;

      onDrag = (x, y) => {
        px = Math.max(24, Math.min(W - 24, x));
        py = Math.max(120, Math.min(H - 36, y));
      };
      cbRef.current.onStatusChange(`Hostiles 0/${targetKills} · HP ${lives}`);

      updateFn = (dt) => {
        if (ctrlRef.current.left) px -= 320 * dt;
        if (ctrlRef.current.right) px += 320 * dt;
        if (ctrlRef.current.up) py -= 280 * dt;
        if (ctrlRef.current.down) py += 280 * dt;
        px = Math.max(24, Math.min(W - 24, px));
        py = Math.max(120, Math.min(H - 36, py));

        fireT -= dt;
        if (fireT <= 0) {
          fireT = 0.16;
          bullets.push({ x: px - 10, y: py - 18, vx: 0, vy: -600, enemy: false });
          bullets.push({ x: px + 10, y: py - 18, vx: 0, vy: -600, enemy: false });
        }

        spawnT -= dt;
        if (spawnT <= 0) {
          spawnT = Math.max(0.35, 1.0 / diffMult - level * 0.004);
          enemies.push({
            x: 40 + rand() * (W - 80),
            y: -24,
            vx: (rand() - 0.5) * 90,
            vy: (120 + level * 1.4) * diffMult,
            hp: level > 20 ? 2 : 1,
          });
        }

        ctx.fillStyle = '#09111E';
        ctx.fillRect(0, 0, W, H);

        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.y < -20 || b.y > H + 20) { bullets.splice(i, 1); continue; }
          ctx.fillStyle = b.enemy ? '#F97316' : '#38BDF8';
          ctx.fillRect(b.x - 2, b.y - 8, 4, 14);

          if (!b.enemy) {
            for (let j = enemies.length - 1; j >= 0; j--) {
              const e = enemies[j];
              if (Math.hypot(b.x - e.x, b.y - e.y) < 22) {
                bullets.splice(i, 1);
                e.hp -= 1;
                if (e.hp <= 0) {
                  enemies.splice(j, 1);
                  kills += 1;
                  soundFX.score();
                  cbRef.current.onScoreChange(kills * 120);
                  cbRef.current.onStatusChange(`Hostiles ${kills}/${targetKills} · HP ${lives}`);
                  if (kills >= targetKills) {
                    win(kills * 120 + lives * 200, 'Air superiority achieved!');
                    return;
                  }
                }
                break;
              }
            }
          } else if (Math.hypot(b.x - px, b.y - py) < 18) {
            bullets.splice(i, 1);
            lives -= 1;
            soundFX.hit();
            if (lives <= 0) { fail(kills * 120, 'Fighter shot down!'); return; }
          }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (rand() < 0.012 * diffMult) {
            bullets.push({ x: e.x, y: e.y + 14, vx: 0, vy: 280, enemy: true });
          }
          if (e.y > H + 30) { enemies.splice(i, 1); continue; }
          if (Math.hypot(e.x - px, e.y - py) < 26) {
            enemies.splice(i, 1);
            lives -= 1;
            soundFX.hit();
            cbRef.current.onStatusChange(`Hostiles ${kills}/${targetKills} · HP ${lives}`);
            if (lives <= 0) { fail(kills * 120, 'Mid-air collision!'); return; }
          }
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + 16);
          ctx.lineTo(e.x - 18, e.y - 12);
          ctx.lineTo(e.x + 18, e.y - 12);
          ctx.closePath();
          ctx.fill();
        }

        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.moveTo(px, py - 20);
        ctx.lineTo(px + 22, py + 16);
        ctx.lineTo(px, py + 8);
        ctx.lineTo(px - 22, py + 16);
        ctx.closePath();
        ctx.fill();
      };
    }

    // =========================================================================
    // 4. FORTRESS TD (Tower Defense)
    // =========================================================================
    else if (game.id === 'fortress-td') {
      const waypoints = [
        { x: 0, y: 140 },
        { x: 420, y: 140 },
        { x: 420, y: 310 },
        { x: 130, y: 310 },
        { x: 130, y: 490 },
        { x: W, y: 490 },
      ];
      const pads = [
        { x: 160, y: 80 }, { x: 300, y: 80 },
        { x: 240, y: 225 }, { x: 355, y: 225 },
        { x: 240, y: 400 }, { x: 390, y: 400 },
        { x: 260, y: 560 }, { x: 420, y: 560 },
      ];
      const towers: Array<{ x: number; y: number; type: 'cannon' | 'frost' | 'laser'; cd: number }> = [];
      const enemies: Array<{ x: number; y: number; wp: number; hp: number; maxHp: number; speed: number; slow: number }> = [];
      const shots: Array<{ x1: number; y1: number; x2: number; y2: number; color: string; life: number }> = [];

      let gold = 140;
      let castleHp = difficulty === 'easy' ? 12 : difficulty === 'medium' ? 8 : 5;
      const totalEnemies = 8 + Math.floor(level / 6);
      let spawned = 0;
      let defeated = 0;
      let spawnTimer = 0.6;
      let score = 0;

      const costs = { cannon: 50, frost: 60, laser: 80 };
      onTap = (x, y) => {
        for (const pad of pads) {
          if (Math.hypot(x - pad.x, y - pad.y) < 34) {
            if (towers.some((t) => t.x === pad.x && t.y === pad.y)) return;
            const tType = ctrlRef.current.tdType;
            if (gold >= costs[tType]) {
              gold -= costs[tType];
              towers.push({ x: pad.x, y: pad.y, type: tType, cd: 0 });
              soundFX.click();
              cbRef.current.onStatusChange(`Gold ${gold} · Gate HP ${castleHp} · Left ${totalEnemies - defeated}`);
            }
          }
        }
      };

      cbRef.current.onStatusChange(`Gold ${gold} · Gate HP ${castleHp} · Left ${totalEnemies}`);

      updateFn = (dt) => {
        spawnTimer -= dt;
        if (spawned < totalEnemies && spawnTimer <= 0) {
          spawnTimer = Math.max(0.75, 1.55 / diffMult);
          spawned += 1;
          const hp = (45 + level * 4) * diffMult;
          enemies.push({ x: waypoints[0].x, y: waypoints[0].y, wp: 1, hp, maxHp: hp, speed: 70 * diffMult, slow: 0 });
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
          const e = enemies[i];
          e.slow = Math.max(0, e.slow - dt);
          const tgt = waypoints[e.wp];
          const dx = tgt.x - e.x;
          const dy = tgt.y - e.y;
          const d = Math.hypot(dx, dy);
          const spd = e.slow > 0 ? e.speed * 0.5 : e.speed;
          if (d < 4) {
            e.wp += 1;
            if (e.wp >= waypoints.length) {
              enemies.splice(i, 1);
              castleHp -= 1;
              defeated += 1;
              soundFX.hit();
              cbRef.current.onStatusChange(`Gold ${gold} · Gate HP ${castleHp} · Left ${totalEnemies - defeated}`);
              if (castleHp <= 0) { fail(score, 'Citadel gate breached!'); return; }
            }
          } else {
            e.x += (dx / d) * spd * dt;
            e.y += (dy / d) * spd * dt;
          }
        }

        for (const tw of towers) {
          tw.cd -= dt;
          if (tw.cd <= 0 && enemies.length > 0) {
            const range = tw.type === 'laser' ? 190 : 155;
            const target = enemies.find((e) => Math.hypot(e.x - tw.x, e.y - tw.y) <= range);
            if (target) {
              tw.cd = tw.type === 'laser' ? 0.35 : tw.type === 'frost' ? 0.8 : 0.65;
              const dmg = tw.type === 'laser' ? 18 : tw.type === 'frost' ? 12 : 26;
              target.hp -= dmg;
              if (tw.type === 'frost') target.slow = 2.0;
              shots.push({
                x1: tw.x,
                y1: tw.y,
                x2: target.x,
                y2: target.y,
                color: tw.type === 'laser' ? '#EF4444' : tw.type === 'frost' ? '#38BDF8' : '#F59E0B',
                life: 0.14,
              });
              if (target.hp <= 0) {
                const idx = enemies.indexOf(target);
                if (idx >= 0) enemies.splice(idx, 1);
                gold += 22;
                score += 100;
                defeated += 1;
                soundFX.score();
                cbRef.current.onScoreChange(score);
                cbRef.current.onStatusChange(`Gold ${gold} · Gate HP ${castleHp} · Left ${totalEnemies - defeated}`);
              }
            }
          }
        }

        if (defeated >= totalEnemies && enemies.length === 0) {
          win(score + castleHp * 150, 'All siege waves repelled!');
          return;
        }

        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);

        // Path
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 42;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(waypoints[0].x, waypoints[0].y);
        waypoints.slice(1).forEach((w) => ctx.lineTo(w.x, w.y));
        ctx.stroke();

        // Build pads
        for (const p of pads) {
          ctx.fillStyle = '#1E293B';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }

        for (const tw of towers) {
          ctx.fillStyle = tw.type === 'laser' ? '#EF4444' : tw.type === 'frost' ? '#38BDF8' : '#F59E0B';
          ctx.beginPath(); ctx.arc(tw.x, tw.y, 17, 0, Math.PI * 2); ctx.fill();
        }

        for (const e of enemies) {
          ctx.fillStyle = e.slow > 0 ? '#7DD3FC' : '#F43F5E';
          ctx.beginPath(); ctx.arc(e.x, e.y, 12, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#10B981';
          ctx.fillRect(e.x - 14, e.y - 20, 28 * Math.max(0, e.hp / e.maxHp), 4);
        }

        for (let i = shots.length - 1; i >= 0; i--) {
          const s = shots[i];
          s.life -= dt;
          if (s.life <= 0) { shots.splice(i, 1); continue; }
          ctx.strokeStyle = s.color;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        }
      };
    }

    // =========================================================================
    // 5. PAC-LABYRINTH
    // =========================================================================
    else if (game.id === 'pac-labyrinth') {
      const cols = 13;
      const rows = 15;
      const cell = 40;
      const ox = (W - cols * cell) / 2;
      const oy = (H - rows * cell) / 2;

      // Build open maze with seeded pillars
      const grid: number[][] = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) return 1;
          if (r % 2 === 0 && c % 2 === 0 && rand() > 0.25) return 1;
          return 2; // 2 = pellet
        })
      );
      grid[1][1] = 0;
      grid[1][cols - 2] = 3; // power orb
      grid[rows - 2][1] = 3;
      grid[rows - 2][cols - 2] = 3;

      let totalPellets = 0;
      grid.forEach((row) => row.forEach((v) => { if (v === 2 || v === 3) totalPellets++; }));

      const pac = { r: 1, c: 1 };
      const ghosts = [
        { r: rows - 2, c: cols - 2, color: '#EF4444' },
        { r: rows - 2, c: 1, color: '#EC4899' },
        ...(difficulty !== 'easy' ? [{ r: 1, c: cols - 2, color: '#38BDF8' }] : []),
      ];

      let pacTimer = 0;
      let ghostTimer = 0;
      let powerTime = 0;
      let eaten = 0;
      let score = 0;

      onTap = (x, y) => {
        const cx = ox + pac.c * cell + cell / 2;
        const cy = oy + pac.r * cell + cell / 2;
        const dx = x - cx;
        const dy = y - cy;
        if (Math.abs(dx) > Math.abs(dy)) ctrlRef.current.pacDir = { x: dx > 0 ? 1 : -1, y: 0 };
        else ctrlRef.current.pacDir = { x: 0, y: dy > 0 ? 1 : -1 };
      };

      cbRef.current.onStatusChange(`Pellets 0/${totalPellets}`);

      updateFn = (dt) => {
        powerTime = Math.max(0, powerTime - dt);
        pacTimer += dt;
        ghostTimer += dt;

        if (pacTimer >= 0.17) {
          pacTimer = 0;
          const nr = pac.r + ctrlRef.current.pacDir.y;
          const nc = pac.c + ctrlRef.current.pacDir.x;
          if (grid[nr]?.[nc] !== 1) {
            pac.r = nr;
            pac.c = nc;
            if (grid[nr][nc] === 2 || grid[nr][nc] === 3) {
              if (grid[nr][nc] === 3) powerTime = 6;
              grid[nr][nc] = 0;
              eaten += 1;
              score += 50;
              soundFX.score();
              cbRef.current.onScoreChange(score);
              cbRef.current.onStatusChange(`Pellets ${eaten}/${totalPellets}`);
              if (eaten >= totalPellets) {
                win(score + 300, 'Maze cleared of every energy pellet!');
                return;
              }
            }
          }
        }

        const gStep = Math.max(0.18, 0.34 / diffMult - level * 0.001);
        if (ghostTimer >= gStep) {
          ghostTimer = 0;
          for (const g of ghosts) {
            const dirs = [
              { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 },
            ].filter((d) => grid[g.r + d.r]?.[g.c + d.c] !== 1);
            if (dirs.length > 0) {
              dirs.sort((a, b) => {
                const da = Math.hypot(g.r + a.r - pac.r, g.c + a.c - pac.c);
                const db = Math.hypot(g.r + b.r - pac.r, g.c + b.c - pac.c);
                return powerTime > 0 ? db - da : da - db;
              });
              const pick = rand() > 0.25 ? dirs[0] : dirs[Math.floor(rand() * dirs.length)];
              g.r += pick.r;
              g.c += pick.c;
            }
          }
        }

        for (const g of ghosts) {
          if (g.r === pac.r && g.c === pac.c) {
            if (powerTime > 0) {
              g.r = Math.floor(rows / 2);
              g.c = Math.floor(cols / 2);
              score += 200;
              soundFX.hit();
            } else {
              fail(score, 'Caught by a maze sentinel!');
              return;
            }
          }
        }

        ctx.fillStyle = '#070A12';
        ctx.fillRect(0, 0, W, H);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const gx = ox + c * cell;
            const gy = oy + r * cell;
            if (grid[r][c] === 1) {
              ctx.fillStyle = '#1E3A8A';
              ctx.fillRect(gx + 2, gy + 2, cell - 4, cell - 4);
            } else if (grid[r][c] === 2) {
              ctx.fillStyle = '#FDE68A';
              ctx.beginPath(); ctx.arc(gx + cell / 2, gy + cell / 2, 4, 0, Math.PI * 2); ctx.fill();
            } else if (grid[r][c] === 3) {
              ctx.fillStyle = '#38BDF8';
              ctx.beginPath(); ctx.arc(gx + cell / 2, gy + cell / 2, 8, 0, Math.PI * 2); ctx.fill();
            }
          }
        }

        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(ox + pac.c * cell + cell / 2, oy + pac.r * cell + cell / 2, 14, 0.25, Math.PI * 2 - 0.25);
        ctx.lineTo(ox + pac.c * cell + cell / 2, oy + pac.r * cell + cell / 2);
        ctx.fill();

        for (const g of ghosts) {
          ctx.fillStyle = powerTime > 0 ? '#38BDF8' : g.color;
          ctx.beginPath();
          ctx.arc(ox + g.c * cell + cell / 2, oy + g.r * cell + cell / 2, 13, 0, Math.PI * 2);
          ctx.fill();
        }
      };
    }

    // =========================================================================
    // 6. TRENCH DEFENDER
    // =========================================================================
    else {
      const targetWave = 8 + Math.floor(level / 8);
      let destroyed = 0;
      let bunkerHp = difficulty === 'easy' ? 5 : 3;
      const tanks: Array<{ x: number; y: number; speed: number; hp: number }> = [];
      const shells: Array<{ x: number; y: number; vx: number; vy: number }> = [];
      let spawnCd = 0.5;
      let score = 0;

      onTap = (x, y) => {
        if (ended) return;
        const dx = x - 65;
        const dy = y - (H - 85);
        const ang = Math.atan2(dy, dx);
        const spd = Math.min(720, Math.max(360, Math.hypot(dx, dy) * 1.65));
        shells.push({ x: 65, y: H - 85, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd });
        soundFX.laser();
      };

      cbRef.current.onStatusChange(`Squads 0/${targetWave} · Bunker HP ${bunkerHp}`);

      updateFn = (dt) => {
        spawnCd -= dt;
        if (spawnCd <= 0 && destroyed + tanks.length < targetWave) {
          spawnCd = Math.max(0.9, 2.1 / diffMult - level * 0.008);
          tanks.push({ x: W + 20, y: H - 72, speed: (55 + level * 0.8) * diffMult, hp: 1 });
        }

        ctx.fillStyle = '#11161F';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#3F3A36';
        ctx.fillRect(0, H - 56, W, 56);

        // Bunker
        ctx.fillStyle = '#78716C';
        ctx.fillRect(22, H - 102, 56, 46);

        for (let i = shells.length - 1; i >= 0; i--) {
          const s = shells[i];
          s.vy += 560 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath(); ctx.arc(s.x, s.y, 6, 0, Math.PI * 2); ctx.fill();
          if (s.y > H - 50 || s.x > W + 20) { shells.splice(i, 1); continue; }

          for (let j = tanks.length - 1; j >= 0; j--) {
            const t = tanks[j];
            if (Math.hypot(s.x - t.x, s.y - t.y) < 26) {
              shells.splice(i, 1);
              tanks.splice(j, 1);
              destroyed += 1;
              score += 150;
              soundFX.score();
              cbRef.current.onScoreChange(score);
              cbRef.current.onStatusChange(`Squads ${destroyed}/${targetWave} · Bunker HP ${bunkerHp}`);
              if (destroyed >= targetWave) {
                win(score + bunkerHp * 150, 'Perimeter trench defended!');
                return;
              }
              break;
            }
          }
        }

        for (let i = tanks.length - 1; i >= 0; i--) {
          const t = tanks[i];
          t.x -= t.speed * dt;
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(t.x - 20, t.y - 12, 40, 22);
          if (t.x < 82) {
            tanks.splice(i, 1);
            bunkerHp -= 1;
            soundFX.hit();
            cbRef.current.onStatusChange(`Squads ${destroyed}/${targetWave} · Bunker HP ${bunkerHp}`);
            if (bunkerHp <= 0) {
              fail(score, 'Bunker overrun!');
              return;
            }
          }
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
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B0E14] rounded-2xl border border-white/10 overflow-hidden p-2 gap-2">
      <canvas
        ref={canvasRef}
        className="max-w-full flex-1 min-h-0 aspect-[7/8] rounded-xl game-surface-touch shadow-2xl"
      />
      {game.id === 'fortress-td' && (
        <div className="flex items-center gap-2">
          {(['cannon', 'frost', 'laser'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                ctrlRef.current.tdType = t;
                setTdSelected(t);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold min-h-[40px] border transition-colors ${
                tdSelected === t
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-200 border-white/10'
              }`}
            >
              {t === 'cannon' ? 'Cannon (50g)' : t === 'frost' ? 'Frost (60g)' : 'Laser (80g)'}
            </button>
          ))}
        </div>
      )}
      {game.id === 'asteroid-belt' && (
        <div className="flex items-center gap-2">
          <button
            onPointerDown={() => { ctrlRef.current.left = true; }}
            onPointerUp={() => { ctrlRef.current.left = false; }}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold min-h-[44px]"
          >
            ◀ Turn
          </button>
          <button
            onPointerDown={() => { ctrlRef.current.up = true; }}
            onPointerUp={() => { ctrlRef.current.up = false; }}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold min-h-[44px]"
          >
            ▲ Thrust
          </button>
          <button
            onPointerDown={() => { ctrlRef.current.fire = true; }}
            onPointerUp={() => { ctrlRef.current.fire = false; }}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold min-h-[44px]"
          >
            Fire
          </button>
          <button
            onPointerDown={() => { ctrlRef.current.right = true; }}
            onPointerUp={() => { ctrlRef.current.right = false; }}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold min-h-[44px]"
          >
            Turn ▶
          </button>
        </div>
      )}
    </div>
  );
};
