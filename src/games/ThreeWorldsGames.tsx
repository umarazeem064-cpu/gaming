import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GameRuntimeProps } from '../types/game';
import { seededRandom, soundFX } from '../utils/audio';

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createVoxelTexture(
  baseHex: string,
  speckHex: string,
  accentHex?: string,
  isGrassSide = false
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 32, 32);

  const rand = seededRandom(baseHex.charCodeAt(1) * 97 + speckHex.charCodeAt(1));
  for (let y = 0; y < 32; y += 2) {
    for (let x = 0; x < 32; x += 2) {
      if (rand() > 0.62) {
        ctx.fillStyle = speckHex;
        ctx.fillRect(x, y, 2, 2);
      } else if (accentHex && rand() > 0.88) {
        ctx.fillStyle = accentHex;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  if (isGrassSide) {
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(0, 0, 32, 8);
    ctx.fillStyle = '#16A34A';
    for (let x = 0; x < 32; x += 4) {
      if (rand() > 0.4) ctx.fillRect(x, 8, 2, 3);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  return tex;
}

function createRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1B2028';
  ctx.fillRect(0, 0, 256, 256);
  const rand = seededRandom(777);
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(rand() * 256, rand() * 256, 2, 4);
  }
  // Outer edge lines
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(10, 0, 6, 256);
  ctx.fillRect(240, 0, 6, 256);
  // Dashed lane lines
  ctx.fillStyle = '#F59E0B';
  for (let y = 12; y < 256; y += 64) {
    ctx.fillRect(88, y, 4, 34);
    ctx.fillRect(164, y, 4, 34);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 14);
  return tex;
}

function initStudioRenderer(container: HTMLElement) {
  const isSoftwareGl = detectSoftwareGl();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setSize(container.clientWidth || 640, container.clientHeight || 420);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  return { renderer, scene, isSoftwareGl };
}

function scheduleNextFrame(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  tick: () => void,
  refId: { current: number }
) {
  if (!isSoftwareGl) {
    refId.current = requestAnimationFrame(tick);
    return;
  }
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (!gl || !gl.fenceSync) {
    refId.current = window.setTimeout(tick, 80);
    return;
  }
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  const poll = () => {
    const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
    if (state === gl.UNSIGNALED) {
      refId.current = window.setTimeout(poll, 5);
    } else {
      if (sync) gl.deleteSync(sync);
      refId.current = window.setTimeout(tick, 80);
    }
  };
  refId.current = window.setTimeout(poll, 5);
}

export const ThreeWorldsGame: React.FC<GameRuntimeProps> = ({
  game,
  level,
  difficulty,
  onScoreChange,
  onStatusChange,
  onLevelComplete,
  onLevelFail,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef({
    fwd: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    nitro: false,
    actionMine: false,
    actionPlace: false,
    yawDelta: 0,
    pitchDelta: 0,
    steerDir: 0, // -1..1 for snake / tunnel
  });
  const [hudSub, setHudSub] = useState('');
  const [blocksBag, setBlocksBag] = useState(6);

  const callbacksRef = useRef({ onScoreChange, onStatusChange, onLevelComplete, onLevelFail });
  callbacksRef.current = { onScoreChange, onStatusChange, onLevelComplete, onLevelFail };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const { renderer, scene, isSoftwareGl } = initStudioRenderer(container);
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 420;
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 240);

    const frameId = { current: 0 };
    let disposed = false;
    const disposables: Array<{ dispose: () => void }> = [];
    const clock = new THREE.Clock();

    const rand = seededRandom(level * 131 + (difficulty === 'easy' ? 7 : difficulty === 'medium' ? 29 : 83));
    const diffMult = difficulty === 'easy' ? 0.85 : difficulty === 'medium' ? 1.0 : 1.25;

    // Resize observer
    const onResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        inputRef.current.fwd = true;
        inputRef.current.steerDir = 1;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        inputRef.current.back = true;
        inputRef.current.steerDir = 2;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        inputRef.current.left = true;
        inputRef.current.steerDir = -1;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        inputRef.current.right = true;
        inputRef.current.steerDir = 3;
      }
      if (e.code === 'Space') {
        inputRef.current.jump = true;
        inputRef.current.nitro = true;
      }
      if (e.code === 'KeyE') inputRef.current.actionPlace = true;
      if (e.code === 'KeyF') inputRef.current.actionMine = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') inputRef.current.fwd = false;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') inputRef.current.back = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputRef.current.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputRef.current.right = false;
      if (e.code === 'Space') {
        inputRef.current.jump = false;
        inputRef.current.nitro = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Pointer drag camera look
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      inputRef.current.yawDelta -= dx * 0.0055;
      inputRef.current.pitchDelta -= dy * 0.0045;
    };
    const onPointerUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let cleanupSpecific = () => {};

    // =========================================================================
    // 1. CRAFTREALM 3D (Minecraft-Style Voxel Sandbox & Beacon Quest)
    // =========================================================================
    if (game.id === 'craftrealm-3d') {
      scene.background = new THREE.Color('#7CC4FA');
      scene.fog = new THREE.FogExp2('#7CC4FA', 0.018);

      const hemi = new THREE.HemisphereLight('#E0F2FE', '#57534E', 0.85);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight('#FFF7ED', 1.4);
      sun.position.set(18, 28, 12);
      if (!isSoftwareGl) {
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -20;
        sun.shadow.camera.right = 20;
        sun.shadow.camera.top = 20;
        sun.shadow.camera.bottom = -20;
      }
      scene.add(sun);

      const grassTopTex = createVoxelTexture('#22C55E', '#16A34A', '#4ADE80');
      const grassSideTex = createVoxelTexture('#78350F', '#57260A', '#92400E', true);
      const stoneTex = createVoxelTexture('#64748B', '#475569', '#94A3B8');
      const woodTex = createVoxelTexture('#78350F', '#451A03', '#92400E');
      const oreTex = createVoxelTexture('#475569', '#334155', '#10B981');
      [grassTopTex, grassSideTex, stoneTex, woodTex, oreTex].forEach((t) => disposables.push(t));

      const blockGeo = new THREE.BoxGeometry(1, 1, 1);
      disposables.push(blockGeo);

      const matGrass = [
        new THREE.MeshStandardMaterial({ map: grassSideTex, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ map: grassSideTex, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ map: grassTopTex, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ map: grassSideTex, roughness: 0.85 }),
        new THREE.MeshStandardMaterial({ map: grassSideTex, roughness: 0.85 }),
      ];
      const matStone = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.78 });
      const matWood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.88 });
      const matOre = new THREE.MeshStandardMaterial({
        map: oreTex,
        roughness: 0.45,
        emissive: new THREE.Color('#059669'),
        emissiveIntensity: 0.35,
      });
      [...matGrass, matStone, matWood, matOre].forEach((m) => disposables.push(m));

      // Ground terrain grid
      const worldMap = new Map<string, { mesh: THREE.Mesh; type: 'grass' | 'stone' | 'wood' | 'ore' }>();
      const keyOf = (x: number, y: number, z: number) => `${x},${y},${z}`;

      const addBlock = (x: number, y: number, z: number, type: 'grass' | 'stone' | 'wood' | 'ore') => {
        const k = keyOf(x, y, z);
        if (worldMap.has(k)) return;
        const mat =
          type === 'grass' ? matGrass : type === 'stone' ? matStone : type === 'wood' ? matWood : matOre;
        const m = new THREE.Mesh(blockGeo, mat);
        m.position.set(x, y, z);
        m.castShadow = !isSoftwareGl;
        m.receiveShadow = !isSoftwareGl;
        scene.add(m);
        worldMap.set(k, { mesh: m, type });
      };

      const removeBlock = (x: number, y: number, z: number): 'grass' | 'stone' | 'wood' | 'ore' | null => {
        const k = keyOf(x, y, z);
        const item = worldMap.get(k);
        if (!item) return null;
        scene.remove(item.mesh);
        worldMap.delete(k);
        return item.type;
      };

      // Generate seeded Minecraft island + cliff
      const half = 8;
      for (let x = -half; x <= half; x++) {
        for (let z = -half; z <= half; z++) {
          const dist = Math.hypot(x, z);
          if (dist > half + 0.5) continue;
          const h = Math.round(
            Math.sin(x * 0.45 + level) * 1.1 + Math.cos(z * 0.45 - level * 0.5) * 1.1
          );
          addBlock(x, h - 1, z, 'stone');
          addBlock(x, h, z, 'grass');
          // Occasional oak tree
          if (x > -6 && x < 5 && z > -6 && z < 5 && Math.abs(x) + Math.abs(z) > 3 && rand() > 0.94) {
            addBlock(x, h + 1, z, 'wood');
            addBlock(x, h + 2, z, 'wood');
          }
        }
      }

      // Target emerald ores scattered
      const targetOres = Math.min(8, 2 + Math.floor(level / 15) + (difficulty === 'difficult' ? 2 : 0));
      let placedOres = 0;
      for (let i = 0; i < 40 && placedOres < targetOres; i++) {
        const ox = Math.floor((rand() - 0.5) * 10);
        const oz = Math.floor((rand() - 0.5) * 10);
        if (Math.hypot(ox, oz) < 2) continue;
        let topY = -5;
        for (let y = 5; y >= -3; y--) {
          if (worldMap.has(keyOf(ox, y, oz))) {
            topY = y;
            break;
          }
        }
        if (topY > -4) {
          addBlock(ox, topY + 1, oz, 'ore');
          placedOres++;
        }
      }

      // Elevated Emerald Beacon tower at far end
      const bx = Math.round((rand() - 0.5) * 4);
      const bz = -6;
      const beaconY = 3 + Math.min(4, Math.floor(level / 25));
      for (let y = 0; y < beaconY; y++) {
        addBlock(bx, y, bz, 'stone');
      }
      const beaconGeo = new THREE.OctahedronGeometry(0.55, 0);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: '#34D399',
        emissive: '#10B981',
        emissiveIntensity: 1.3,
        roughness: 0.15,
        metalness: 0.4,
      });
      disposables.push(beaconGeo, beaconMat);
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(bx, beaconY + 0.9, bz);
      scene.add(beacon);

      // Player avatar (Steve-style composite group)
      const playerGroup = new THREE.Group();
      const bodyGeo = new THREE.BoxGeometry(0.55, 0.9, 0.35);
      const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
      const bodyMat = new THREE.MeshStandardMaterial({ color: '#0284C7', roughness: 0.6 });
      const headMat = new THREE.MeshStandardMaterial({ color: '#FDBA74', roughness: 0.65 });
      disposables.push(bodyGeo, headGeo, bodyMat, headMat);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.y = 0.45;
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.position.y = 1.15;
      playerGroup.add(bodyMesh, headMesh);
      scene.add(playerGroup);

      const pos = new THREE.Vector3(0, 3, 4);
      const vel = new THREE.Vector3(0, 0, 0);
      let yaw = 0;
      let pitch = 0.25;
      let onGround = false;
      let oresMined = 0;
      let bag = 6;
      let finished = false;
      setBlocksBag(bag);
      callbacksRef.current.onStatusChange(`Ores 0/${placedOres} · Reach Beacon`);
      setHudSub(`Mine ${placedOres} Emerald Ores, then climb to the Beacon!`);

      const surfaceHeightAt = (px: number, pz: number, py: number) => {
        const gx = Math.round(px);
        const gz = Math.round(pz);
        for (let y = Math.floor(py + 1); y >= -5; y--) {
          if (worldMap.has(keyOf(gx, y, gz))) return y + 0.5;
        }
        return -20;
      };

      const tick = () => {
        if (disposed || finished) return;
        const dt = Math.min(clock.getDelta(), 0.05);

        yaw += inputRef.current.yawDelta;
        pitch = THREE.MathUtils.clamp(pitch + inputRef.current.pitchDelta, -0.4, 1.0);
        inputRef.current.yawDelta = 0;
        inputRef.current.pitchDelta = 0;

        const moveX = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        const moveZ = (inputRef.current.back ? 1 : 0) - (inputRef.current.fwd ? 1 : 0);
        const speed = 5.4;
        if (moveX !== 0 || moveZ !== 0) {
          const sin = Math.sin(yaw);
          const cos = Math.cos(yaw);
          const vx = (moveX * cos + moveZ * sin) * speed;
          const vz = (-moveX * sin + moveZ * cos) * speed;
          const nextX = pos.x + vx * dt;
          const nextZ = pos.z + vz * dt;
          if (surfaceHeightAt(nextX, pos.z, pos.y) <= pos.y + 0.65) pos.x = nextX;
          if (surfaceHeightAt(pos.x, nextZ, pos.y) <= pos.y + 0.65) pos.z = nextZ;
        }

        if (inputRef.current.jump && onGround) {
          vel.y = 7.4;
          onGround = false;
          soundFX.bounce();
        }
        vel.y -= 18 * dt;
        pos.y += vel.y * dt;

        const groundY = surfaceHeightAt(pos.x, pos.z, pos.y);
        if (pos.y <= groundY) {
          pos.y = groundY;
          vel.y = 0;
          onGround = true;
        } else {
          onGround = false;
        }

        // Mine or Place block in front
        const lookX = Math.round(pos.x - Math.sin(yaw) * 1.35);
        const lookZ = Math.round(pos.z - Math.cos(yaw) * 1.35);
        const lookY = Math.round(pos.y + 0.6);

        if (inputRef.current.actionMine) {
          inputRef.current.actionMine = false;
          let mined = removeBlock(lookX, lookY, lookZ) || removeBlock(lookX, lookY - 1, lookZ);
          if (mined) {
            soundFX.hit();
            bag += 1;
            setBlocksBag(bag);
            if (mined === 'ore') {
              oresMined++;
              soundFX.score();
              callbacksRef.current.onScoreChange(oresMined * 150);
            }
            callbacksRef.current.onStatusChange(`Ores ${oresMined}/${placedOres} · Bag ${bag}`);
          }
        }
        if (inputRef.current.actionPlace) {
          inputRef.current.actionPlace = false;
          if (bag > 0 && !worldMap.has(keyOf(lookX, lookY - 1, lookZ))) {
            addBlock(lookX, lookY - 1, lookZ, 'wood');
            bag -= 1;
            setBlocksBag(bag);
            soundFX.click();
          }
        }

        if (pos.y < -8) {
          finished = true;
          soundFX.fail();
          callbacksRef.current.onLevelFail(oresMined * 150, 'Fell off the floating voxel island.');
          return;
        }

        // Rotate beacon
        beacon.rotation.y += dt * 2.2;
        beacon.position.y = beaconY + 0.9 + Math.sin(clock.elapsedTime * 3) * 0.15;

        // Check win
        if (pos.distanceTo(beacon.position) < 1.6) {
          if (oresMined >= placedOres) {
            finished = true;
            soundFX.win();
            const finalScore = oresMined * 200 + bag * 30 + level * 20;
            callbacksRef.current.onLevelComplete(3, finalScore, `Mined ${oresMined} emerald ores & activated Beacon!`);
            return;
          } else {
            setHudSub(`Need ${placedOres - oresMined} more Emerald Ore(s) before activating Beacon!`);
          }
        }

        playerGroup.position.copy(pos);
        playerGroup.rotation.y = yaw;

        // Smooth chase cam
        const camDist = 4.2;
        const targetCamX = pos.x + Math.sin(yaw) * Math.cos(pitch) * camDist;
        const targetCamY = pos.y + 1.6 + Math.sin(pitch) * camDist;
        const targetCamZ = pos.z + Math.cos(yaw) * Math.cos(pitch) * camDist;
        camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 1 - Math.exp(-12 * dt));
        camera.lookAt(pos.x, pos.y + 1.0, pos.z);

        renderer.render(scene, camera);
        scheduleNextFrame(renderer, isSoftwareGl, tick, frameId);
      };
      tick();
    }

    // =========================================================================
    // 2. BLOXDSKY PARKOUR (Bloxd.io-Style 3D Sky Island Course)
    // =========================================================================
    else if (game.id === 'bloxdsky-parkour') {
      scene.background = new THREE.Color('#38BDF8');
      scene.fog = new THREE.FogExp2('#BAE6FD', 0.015);
      scene.add(new THREE.HemisphereLight('#F0F9FF', '#0284C7', 0.9));
      const sun = new THREE.DirectionalLight('#FFFBEB', 1.4);
      sun.position.set(14, 24, 10);
      scene.add(sun);

      interface Platform {
        mesh: THREE.Mesh;
        x: number;
        y: number;
        z: number;
        w: number;
        d: number;
        movingAmp: number;
        movingSpeed: number;
        phase: number;
        isBoost?: boolean;
        isFinish?: boolean;
      }

      const platforms: Platform[] = [];
      const padColors = ['#10B981', '#F59E0B', '#6366F1', '#EC4899'];
      let curX = 0;
      let curY = 0;
      let curZ = 0;
      const numPads = Math.min(18, 7 + Math.floor(level / 8));

      for (let i = 0; i <= numPads; i++) {
        const isStart = i === 0;
        const isFinish = i === numPads;
        const isBoost = !isStart && !isFinish && i % 4 === 0;
        const w = isStart || isFinish ? 3.2 : Math.max(1.5, 2.4 - (difficulty === 'difficult' ? 0.5 : 0) - level * 0.005);
        const d = w;
        const geo = new THREE.BoxGeometry(w, 0.5, d);
        const color = isFinish ? '#FACC15' : isBoost ? '#06B6D4' : padColors[i % padColors.length];
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.4,
          metalness: isFinish ? 0.6 : 0.1,
          emissive: isFinish || isBoost ? new THREE.Color(color) : new THREE.Color('#000000'),
          emissiveIntensity: isFinish ? 0.45 : isBoost ? 0.25 : 0,
        });
        disposables.push(geo, mat);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(curX, curY, curZ);
        scene.add(mesh);

        const movingAmp = !isStart && !isFinish && i % 3 === 0 ? 1.5 * diffMult : 0;
        platforms.push({
          mesh,
          x: curX,
          y: curY,
          z: curZ,
          w,
          d,
          movingAmp,
          movingSpeed: 1.4 + rand() * 1.2,
          phase: rand() * Math.PI * 2,
          isBoost,
          isFinish,
        });

        curZ -= 3.2 + rand() * 1.2;
        curX += (rand() - 0.5) * 3.4;
        curY += (rand() - 0.35) * 0.9;
      }

      // Finish Portal Torus
      const finishPlat = platforms[platforms.length - 1];
      const portalGeo = new THREE.TorusGeometry(0.95, 0.14, 12, 24);
      const portalMat = new THREE.MeshStandardMaterial({
        color: '#FDE047',
        emissive: '#F59E0B',
        emissiveIntensity: 0.8,
      });
      disposables.push(portalGeo, portalMat);
      const portal = new THREE.Mesh(portalGeo, portalMat);
      portal.position.set(finishPlat.x, finishPlat.y + 1.4, finishPlat.z);
      scene.add(portal);

      // Bloxd character (cube head + body + visor)
      const player = new THREE.Group();
      const torsoGeo = new THREE.BoxGeometry(0.6, 0.75, 0.4);
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const torsoMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', roughness: 0.45 });
      const headMat = new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.4 });
      disposables.push(torsoGeo, headGeo, torsoMat, headMat);
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 0.4;
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.05;
      player.add(torso, head);
      scene.add(player);

      const pos = new THREE.Vector3(0, 1.2, 0);
      const vel = new THREE.Vector3(0, 0, 0);
      let yaw = 0;
      let jumpsLeft = 2;
      let jumpWasDown = false;
      let checkpoint = new THREE.Vector3(0, 1.2, 0);
      let checkpointIdx = 0;
      let falls = 0;
      let finished = false;
      setHudSub('Jump across sky islands! Double-tap Jump in mid-air.');
      callbacksRef.current.onStatusChange(`Pad 1/${platforms.length}`);

      const tick = () => {
        if (disposed || finished) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        yaw += inputRef.current.yawDelta;
        inputRef.current.yawDelta = 0;

        for (const p of platforms) {
          if (p.movingAmp > 0) {
            p.x = p.mesh.position.x = p.mesh.position.x * 0 + Math.sin(t * p.movingSpeed + p.phase) * p.movingAmp + (p.phase > 3 ? 1 : -1);
          }
        }

        const mx = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        const mz = (inputRef.current.back ? 1 : 0) - (inputRef.current.fwd ? 1 : 0);
        const spd = 6.2;
        if (mx !== 0 || mz !== 0) {
          const s = Math.sin(yaw);
          const c = Math.cos(yaw);
          pos.x += (mx * c + mz * s) * spd * dt;
          pos.z += (-mx * s + mz * c) * spd * dt;
        }

        const jumpDown = inputRef.current.jump;
        if (jumpDown && !jumpWasDown && jumpsLeft > 0) {
          vel.y = 8.4;
          jumpsLeft -= 1;
          soundFX.bounce();
        }
        jumpWasDown = jumpDown;

        vel.y -= 20 * dt;
        const prevY = pos.y;
        pos.y += vel.y * dt;

        // Check platform landings
        platforms.forEach((p, idx) => {
          const px = p.mesh.position.x;
          const py = p.mesh.position.y + 0.25;
          const pz = p.mesh.position.z;
          if (
            vel.y <= 0 &&
            prevY >= py - 0.2 &&
            pos.y <= py &&
            Math.abs(pos.x - px) <= p.w * 0.55 &&
            Math.abs(pos.z - pz) <= p.d * 0.55
          ) {
            pos.y = py;
            vel.y = p.isBoost ? 12.2 : 0;
            jumpsLeft = 2;
            if (p.isBoost) soundFX.score();
            if (idx > checkpointIdx) {
              checkpointIdx = idx;
              checkpoint.set(px, py + 0.6, pz);
              soundFX.click();
              callbacksRef.current.onScoreChange(checkpointIdx * 100);
              callbacksRef.current.onStatusChange(`Pad ${idx + 1}/${platforms.length}`);
            }
            if (p.isFinish) {
              finished = true;
              soundFX.win();
              const stars: 1 | 2 | 3 = falls === 0 ? 3 : falls <= 2 ? 2 : 1;
              callbacksRef.current.onLevelComplete(stars, platforms.length * 120 - falls * 50, 'Sky island course conquered!');
            }
          }
        });

        if (pos.y < -8) {
          falls += 1;
          soundFX.hit();
          if (falls >= (difficulty === 'difficult' ? 2 : 5)) {
            finished = true;
            soundFX.fail();
            callbacksRef.current.onLevelFail(checkpointIdx * 100, 'Too many sky falls!');
            return;
          }
          pos.copy(checkpoint);
          vel.set(0, 0, 0);
          setHudSub(`Respawned at checkpoint! Falls: ${falls}`);
        }

        portal.rotation.y += dt * 2.5;
        player.position.copy(pos);
        player.rotation.y = yaw;

        const targetCam = new THREE.Vector3(
          pos.x + Math.sin(yaw) * 4.8,
          pos.y + 2.6,
          pos.z + Math.cos(yaw) * 4.8
        );
        camera.position.lerp(targetCam, 1 - Math.exp(-10 * dt));
        camera.lookAt(pos.x, pos.y + 0.9, pos.z - 1.2);

        renderer.render(scene, camera);
        scheduleNextFrame(renderer, isSoftwareGl, tick, frameId);
      };
      tick();
    }

    // =========================================================================
    // 3. NITRO HORIZON 3D (3D Highway Supercar Racing)
    // =========================================================================
    else if (game.id === 'nitro-horizon-3d') {
      scene.background = new THREE.Color('#1E1B2E');
      scene.fog = new THREE.FogExp2('#1E1B2E', 0.022);
      scene.add(new THREE.HemisphereLight('#FDBA74', '#0F172A', 0.85));
      const sun = new THREE.DirectionalLight('#FB923C', 1.3);
      sun.position.set(10, 15, -20);
      scene.add(sun);

      const roadTex = createRoadTexture();
      disposables.push(roadTex);
      const roadGeo = new THREE.PlaneGeometry(11, 140);
      const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.4, metalness: 0.15 });
      disposables.push(roadGeo, roadMat);
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.z = -50;
      scene.add(road);

      // Build composite 3D player supercar
      const car = new THREE.Group();
      const chassisGeo = new THREE.BoxGeometry(1.5, 0.45, 3.2);
      const cabinGeo = new THREE.BoxGeometry(1.2, 0.4, 1.5);
      const spoilerGeo = new THREE.BoxGeometry(1.55, 0.08, 0.35);
      const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12);
      const carMat = new THREE.MeshPhysicalMaterial({
        color: '#2563EB',
        metalness: 0.75,
        roughness: 0.25,
        clearcoat: 1.0,
      });
      const glassMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.1, metalness: 0.9 });
      const wheelMat = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8 });
      const tailMat = new THREE.MeshStandardMaterial({ color: '#EF4444', emissive: '#EF4444', emissiveIntensity: 1.5 });
      disposables.push(chassisGeo, cabinGeo, spoilerGeo, wheelGeo, carMat, glassMat, wheelMat, tailMat);

      const chassis = new THREE.Mesh(chassisGeo, carMat);
      chassis.position.y = 0.45;
      const cabin = new THREE.Mesh(cabinGeo, glassMat);
      cabin.position.set(0, 0.82, -0.15);
      const spoiler = new THREE.Mesh(spoilerGeo, carMat);
      spoiler.position.set(0, 0.85, 1.4);
      car.add(chassis, cabin, spoiler);
      [[-0.78, 0.32, -1.0], [0.78, 0.32, -1.0], [-0.78, 0.32, 1.0], [0.78, 0.32, 1.0]].forEach(([wx, wy, wz]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, wy, wz);
        car.add(w);
      });
      const tlGeo = new THREE.BoxGeometry(0.32, 0.12, 0.08);
      disposables.push(tlGeo);
      [-0.48, 0.48].forEach((lx) => {
        const tl = new THREE.Mesh(tlGeo, tailMat);
        tl.position.set(lx, 0.52, 1.6);
        car.add(tl);
      });
      scene.add(car);

      // Traffic cars pool
      const lanes = [-3.1, 0, 3.1];
      const traffic: Array<{ mesh: THREE.Group; lane: number; z: number; speed: number }> = [];
      const trafficColors = ['#EF4444', '#10B981', '#F59E0B', '#E2E8F0'];
      for (let i = 0; i < 8; i++) {
        const tg = new THREE.Group();
        const tMat = new THREE.MeshStandardMaterial({ color: trafficColors[i % trafficColors.length], roughness: 0.35, metalness: 0.5 });
        disposables.push(tMat);
        const tb = new THREE.Mesh(chassisGeo, tMat);
        tb.position.y = 0.45;
        const tc = new THREE.Mesh(cabinGeo, glassMat);
        tc.position.set(0, 0.82, 0.1);
        tg.add(tb, tc);
        const ln = Math.floor(rand() * 3);
        const tz = -25 - i * 16;
        tg.position.set(lanes[ln], 0, tz);
        scene.add(tg);
        traffic.push({ mesh: tg, lane: ln, z: tz, speed: 12 + rand() * 8 });
      }

      // Side light poles
      const poleGeo = new THREE.BoxGeometry(0.2, 4.5, 0.2);
      const poleMat = new THREE.MeshStandardMaterial({ color: '#475569' });
      disposables.push(poleGeo, poleMat);
      const poles: THREE.Mesh[] = [];
      for (let i = 0; i < 12; i++) {
        [-6, 6].forEach((px) => {
          const pm = new THREE.Mesh(poleGeo, poleMat);
          pm.position.set(px, 2.2, -i * 11);
          scene.add(pm);
          poles.push(pm);
        });
      }

      camera.position.set(0, 2.8, 5.2);
      camera.lookAt(0, 0.8, -8);

      let laneIdx = 1;
      let targetX = 0;
      let leftWas = false;
      let rightWas = false;
      let dist = 0;
      const targetDist = 450 + level * 22;
      let finished = false;
      setHudSub(`Reach ${targetDist}m! Dodge traffic & hold Nitro.`);

      const tick = () => {
        if (disposed || finished) return;
        const dt = Math.min(clock.getDelta(), 0.05);

        if (inputRef.current.left && !leftWas) laneIdx = Math.max(0, laneIdx - 1);
        if (inputRef.current.right && !rightWas) laneIdx = Math.min(2, laneIdx + 1);
        leftWas = inputRef.current.left;
        rightWas = inputRef.current.right;
        targetX = lanes[laneIdx];
        car.position.x = THREE.MathUtils.damp(car.position.x, targetX, 12, dt);
        car.rotation.z = (car.position.x - targetX) * 0.14;

        const baseSpeed = (26 + level * 0.25) * diffMult;
        const speed = inputRef.current.nitro ? baseSpeed * 1.45 : baseSpeed;
        dist += speed * dt;
        roadTex.offset.y -= speed * dt * 0.04;

        camera.fov = THREE.MathUtils.damp(camera.fov, inputRef.current.nitro ? 80 : 68, 8, dt);
        camera.updateProjectionMatrix();

        for (const p of poles) {
          p.position.z += speed * dt;
          if (p.position.z > 10) p.position.z -= 132;
        }

        for (const t of traffic) {
          t.z += (speed - t.speed) * dt;
          if (t.z > 8) {
            t.z = -115 - rand() * 35;
            t.lane = Math.floor(rand() * 3);
            t.mesh.position.x = lanes[t.lane];
          }
          t.mesh.position.z = t.z;

          if (Math.abs(t.z) < 2.6 && Math.abs(t.mesh.position.x - car.position.x) < 1.3) {
            finished = true;
            soundFX.fail();
            callbacksRef.current.onLevelFail(Math.round(dist), 'Highway collision!');
            return;
          }
        }

        callbacksRef.current.onScoreChange(Math.round(dist));
        callbacksRef.current.onStatusChange(`${Math.min(100, Math.round((dist / targetDist) * 100))}% · ${Math.round(speed * 4)} km/h`);

        if (dist >= targetDist) {
          finished = true;
          soundFX.win();
          callbacksRef.current.onLevelComplete(3, Math.round(dist), 'Finished highway sector at top speed!');
          return;
        }

        renderer.render(scene, camera);
        scheduleNextFrame(renderer, isSoftwareGl, tick, frameId);
      };
      tick();
    }

    // =========================================================================
    // 4. TUNNEL RUSH 3D (First-Person 3D Tunnel Dodger)
    // =========================================================================
    else if (game.id === 'tunnel-rush-3d') {
      scene.background = new THREE.Color('#090D16');
      scene.fog = new THREE.Fog('#090D16', 10, 48);
      scene.add(new THREE.HemisphereLight('#E2E8F0', '#0F172A', 1.1));
      const pLight = new THREE.PointLight('#F59E0B', 2.5, 35);
      pLight.position.set(0, 0, -4);
      scene.add(pLight);

      const ringGeo = new THREE.TorusGeometry(4.2, 0.14, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.5, metalness: 0.4 });
      disposables.push(ringGeo, ringMat);
      const tunnelRings: THREE.Mesh[] = [];
      for (let i = 0; i < 16; i++) {
        const rm = new THREE.Mesh(ringGeo, ringMat);
        rm.position.z = -i * 3.5;
        scene.add(rm);
        tunnelRings.push(rm);
      }

      // Rotating obstacle gates
      interface Gate {
        group: THREE.Group;
        z: number;
        gapAngle: number;
        gapWidth: number;
        rotSpeed: number;
        passed: boolean;
      }
      const gates: Gate[] = [];
      const gateCount = 10 + Math.floor(level / 4);
      const barGeo = new THREE.BoxGeometry(4.2, 1.3, 0.4);
      const barMat = new THREE.MeshStandardMaterial({ color: '#EF4444', emissive: '#991B1B', emissiveIntensity: 0.4 });
      disposables.push(barGeo, barMat);

      for (let i = 0; i < gateCount; i++) {
        const g = new THREE.Group();
        const b1 = new THREE.Mesh(barGeo, barMat);
        b1.position.x = -2.3;
        const b2 = new THREE.Mesh(barGeo, barMat);
        b2.position.x = 2.3;
        g.add(b1);
        if (difficulty !== 'easy' || i % 2 === 0) {
          const b3 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.2, 0.4), barMat);
          b3.position.y = 2.4;
          g.add(b3);
        }
        const angle = rand() * Math.PI * 2;
        g.rotation.z = angle;
        const gz = -22 - i * 11;
        g.position.z = gz;
        scene.add(g);
        gates.push({
          group: g,
          z: gz,
          gapAngle: angle,
          gapWidth: 1.05,
          rotSpeed: (rand() > 0.5 ? 1 : -1) * (0.6 + level * 0.015) * diffMult,
          passed: false,
        });
      }

      let playerAngle = Math.PI / 2;
      let cleared = 0;
      let finished = false;
      camera.position.set(0, 0, 2);
      setHudSub('Steer around the tunnel to dodge red barriers!');

      const tick = () => {
        if (disposed || finished) return;
        const dt = Math.min(clock.getDelta(), 0.05);

        const turn = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
        playerAngle += turn * 3.4 * dt;

        const fwdSpeed = (13 + level * 0.14) * diffMult;
        for (const r of tunnelRings) {
          r.position.z += fwdSpeed * dt;
          if (r.position.z > 3) r.position.z -= 56;
        }

        for (const g of gates) {
          g.z += fwdSpeed * dt;
          g.group.position.z = g.z;
          g.group.rotation.z += g.rotSpeed * dt;

          if (!g.passed && g.z >= 1.5) {
            g.passed = true;
            // Check collision with horizontal bar along local X axis of gate
            const relAngle = Math.abs(Math.sin(playerAngle - g.group.rotation.z));
            if (relAngle < 0.38) {
              finished = true;
              soundFX.fail();
              callbacksRef.current.onLevelFail(cleared * 100, 'Struck a tunnel barrier!');
              return;
            }
            cleared += 1;
            soundFX.score();
            callbacksRef.current.onScoreChange(cleared * 100);
            callbacksRef.current.onStatusChange(`Gate ${cleared}/${gateCount}`);
          }
        }

        camera.position.x = Math.cos(playerAngle) * 2.5;
        camera.position.y = Math.sin(playerAngle) * 2.5;
        camera.lookAt(0, 0, -20);
        camera.rotation.z = playerAngle - Math.PI / 2;

        if (cleared >= gateCount) {
          finished = true;
          soundFX.win();
          callbacksRef.current.onLevelComplete(3, cleared * 150, 'Navigated the 3D tunnel!');
          return;
        }

        renderer.render(scene, camera);
        scheduleNextFrame(renderer, isSoftwareGl, tick, frameId);
      };
      tick();
    }

    // =========================================================================
    // 5. CUBE SNAKE 3D (3D Lit Isometric Arena Serpent)
    // =========================================================================
    else {
      scene.background = new THREE.Color('#0B121D');
      scene.add(new THREE.HemisphereLight('#E2E8F0', '#1E293B', 1.0));
      const dLight = new THREE.DirectionalLight('#FFFBEB', 1.3);
      dLight.position.set(10, 18, 12);
      scene.add(dLight);

      const gridSize = 15;
      const halfG = Math.floor(gridSize / 2);
      const floorGeo = new THREE.PlaneGeometry(gridSize, gridSize);
      const floorMat = new THREE.MeshStandardMaterial({ color: '#141B29', roughness: 0.8 });
      disposables.push(floorGeo, floorMat);
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.5;
      scene.add(floor);

      const gridHelper = new THREE.GridHelper(gridSize, gridSize, '#334155', '#1E293B');
      gridHelper.position.y = -0.49;
      scene.add(gridHelper);

      const segGeo = new THREE.BoxGeometry(0.86, 0.86, 0.86);
      const headMat = new THREE.MeshStandardMaterial({ color: '#4ADE80', roughness: 0.3 });
      const bodyMat = new THREE.MeshStandardMaterial({ color: '#16A34A', roughness: 0.45 });
      const wallMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7 });
      const foodGeo = new THREE.OctahedronGeometry(0.42, 0);
      const foodMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', emissive: '#D97706', emissiveIntensity: 0.6 });
      disposables.push(segGeo, headMat, bodyMat, wallMat, foodGeo, foodMat);

      const obstacles = new Set<string>();
      const numObs = Math.min(12, Math.floor(level / 8) + (difficulty === 'difficult' ? 3 : 0));
      for (let i = 0; i < numObs; i++) {
        const ox = Math.floor(rand() * (gridSize - 2)) - halfG + 1;
        const oz = Math.floor(rand() * (gridSize - 2)) - halfG + 1;
        if (Math.abs(ox) <= 2 && Math.abs(oz) <= 2) continue;
        obstacles.add(`${ox},${oz}`);
        const wm = new THREE.Mesh(segGeo, wallMat);
        wm.position.set(ox, 0, oz);
        scene.add(wm);
      }

      const snake: Array<{ x: number; z: number; mesh: THREE.Mesh }> = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(segGeo, i === 0 ? headMat : bodyMat);
        m.position.set(-i, 0, 0);
        scene.add(m);
        snake.push({ x: -i, z: 0, mesh: m });
      }

      const foodMesh = new THREE.Mesh(foodGeo, foodMat);
      scene.add(foodMesh);
      let fx = 3;
      let fz = 0;
      const placeFood = () => {
        for (let t = 0; t < 100; t++) {
          const nx = Math.floor(rand() * gridSize) - halfG;
          const nz = Math.floor(rand() * gridSize) - halfG;
          if (!obstacles.has(`${nx},${nz}`) && !snake.some((s) => s.x === nx && s.z === nz)) {
            fx = nx;
            fz = nz;
            foodMesh.position.set(fx, 0, fz);
            return;
          }
        }
      };
      placeFood();

      camera.position.set(0, 14, 11);
      camera.lookAt(0, 0, 0);

      let dir = { x: 1, z: 0 };
      let nextDir = { x: 1, z: 0 };
      let stepAccum = 0;
      const stepTime = Math.max(0.085, (0.19 - level * 0.0007) / diffMult);
      let eaten = 0;
      const targetEat = 5 + Math.floor(level / 10);
      let finished = false;
      setHudSub(`Eat ${targetEat} golden cores! Avoid walls & obstacles.`);
      callbacksRef.current.onStatusChange(`Cores 0/${targetEat}`);

      const tick = () => {
        if (disposed || finished) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        foodMesh.rotation.y += dt * 3;

        if (inputRef.current.steerDir === 1 && dir.z !== 1) nextDir = { x: 0, z: -1 };
        else if (inputRef.current.steerDir === 2 && dir.z !== -1) nextDir = { x: 0, z: 1 };
        else if (inputRef.current.steerDir === -1 && dir.x !== 1) nextDir = { x: -1, z: 0 };
        else if (inputRef.current.steerDir === 3 && dir.x !== -1) nextDir = { x: 1, z: 0 };
        inputRef.current.steerDir = 0;

        stepAccum += dt;
        if (stepAccum >= stepTime) {
          stepAccum = 0;
          dir = nextDir;
          const nx = snake[0].x + dir.x;
          const nz = snake[0].z + dir.z;
          if (
            nx < -halfG ||
            nx > halfG ||
            nz < -halfG ||
            nz > halfG ||
            obstacles.has(`${nx},${nz}`) ||
            snake.some((s) => s.x === nx && s.z === nz)
          ) {
            finished = true;
            soundFX.fail();
            callbacksRef.current.onLevelFail(eaten * 100, 'Snake crashed!');
            return;
          }

          const ate = nx === fx && nz === fz;
          if (ate) {
            const tail = snake[snake.length - 1];
            const nm = new THREE.Mesh(segGeo, bodyMat);
            nm.position.set(tail.x, 0, tail.z);
            scene.add(nm);
            snake.push({ x: tail.x, z: tail.z, mesh: nm });
          }
          for (let i = snake.length - 1; i > 0; i--) {
            snake[i].x = snake[i - 1].x;
            snake[i].z = snake[i - 1].z;
            snake[i].mesh.position.set(snake[i].x, 0, snake[i].z);
          }
          snake[0].x = nx;
          snake[0].z = nz;
          snake[0].mesh.position.set(nx, 0, nz);

          if (ate) {
            eaten += 1;
            soundFX.score();
            callbacksRef.current.onScoreChange(eaten * 120);
            callbacksRef.current.onStatusChange(`Cores ${eaten}/${targetEat}`);
            if (eaten >= targetEat) {
              finished = true;
              soundFX.win();
              callbacksRef.current.onLevelComplete(3, eaten * 150, 'All 3D energy cores collected!');
              return;
            }
            placeFood();
          }
        }

        renderer.render(scene, camera);
        scheduleNextFrame(renderer, isSoftwareGl, tick, frameId);
      };
      tick();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId.current);
      window.clearTimeout(frameId.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cleanupSpecific();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [game.id, level, difficulty]);

  const setBtn = (key: keyof typeof inputRef.current, val: boolean) => {
    (inputRef.current[key] as boolean) = val;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0B0E14] rounded-2xl overflow-hidden border border-white/10">
      <div
        ref={mountRef}
        className="w-full flex-1 min-h-[360px] game-surface-touch relative"
      />

      {/* Top instruction strip */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-center">
        <div className="px-3 py-1.5 rounded-lg bg-black/65 text-xs text-slate-200 border border-white/10 text-center">
          {hudSub}
        </div>
      </div>

      {/* Mobile & Desktop Touch Controls Overlay */}
      {(game.id === 'craftrealm-3d' || game.id === 'bloxdsky-parkour') && (
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
          {/* D-Pad */}
          <div className="grid grid-cols-3 gap-1.5 pointer-events-auto">
            <div />
            <button
              onPointerDown={() => setBtn('fwd', true)}
              onPointerUp={() => setBtn('fwd', false)}
              onPointerLeave={() => setBtn('fwd', false)}
              className="w-12 h-12 rounded-xl bg-black/65 border border-white/15 text-white font-bold active:bg-amber-500 active:text-black"
            >
              ▲
            </button>
            <div />
            <button
              onPointerDown={() => setBtn('left', true)}
              onPointerUp={() => setBtn('left', false)}
              onPointerLeave={() => setBtn('left', false)}
              className="w-12 h-12 rounded-xl bg-black/65 border border-white/15 text-white font-bold active:bg-amber-500 active:text-black"
            >
              ◀
            </button>
            <button
              onPointerDown={() => setBtn('back', true)}
              onPointerUp={() => setBtn('back', false)}
              onPointerLeave={() => setBtn('back', false)}
              className="w-12 h-12 rounded-xl bg-black/65 border border-white/15 text-white font-bold active:bg-amber-500 active:text-black"
            >
              ▼
            </button>
            <button
              onPointerDown={() => setBtn('right', true)}
              onPointerUp={() => setBtn('right', false)}
              onPointerLeave={() => setBtn('right', false)}
              className="w-12 h-12 rounded-xl bg-black/65 border border-white/15 text-white font-bold active:bg-amber-500 active:text-black"
            >
              ▶
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {game.id === 'craftrealm-3d' && (
              <>
                <button
                  onClick={() => {
                    inputRef.current.actionMine = true;
                  }}
                  className="h-12 px-4 rounded-xl bg-rose-600/85 hover:bg-rose-500 text-white text-xs font-bold border border-white/15 active:scale-95"
                >
                  Mine
                </button>
                <button
                  onClick={() => {
                    inputRef.current.actionPlace = true;
                  }}
                  className="h-12 px-4 rounded-xl bg-emerald-600/85 hover:bg-emerald-500 text-white text-xs font-bold border border-white/15 active:scale-95"
                >
                  Place ({blocksBag})
                </button>
              </>
            )}
            <button
              onPointerDown={() => setBtn('jump', true)}
              onPointerUp={() => setBtn('jump', false)}
              onPointerLeave={() => setBtn('jump', false)}
              className="h-14 w-16 rounded-xl bg-amber-500/90 text-slate-950 text-xs font-extrabold border border-amber-300/40 active:scale-95"
            >
              Jump
            </button>
          </div>
        </div>
      )}

      {(game.id === 'nitro-horizon-3d' || game.id === 'tunnel-rush-3d') && (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            <button
              onPointerDown={() => setBtn('left', true)}
              onPointerUp={() => setBtn('left', false)}
              onPointerLeave={() => setBtn('left', false)}
              className="w-16 h-14 rounded-xl bg-black/70 border border-white/15 text-white text-lg font-bold active:bg-amber-500 active:text-black"
            >
              ◀
            </button>
            <button
              onPointerDown={() => setBtn('right', true)}
              onPointerUp={() => setBtn('right', false)}
              onPointerLeave={() => setBtn('right', false)}
              className="w-16 h-14 rounded-xl bg-black/70 border border-white/15 text-white text-lg font-bold active:bg-amber-500 active:text-black"
            >
              ▶
            </button>
          </div>
          {game.id === 'nitro-horizon-3d' && (
            <button
              onPointerDown={() => setBtn('nitro', true)}
              onPointerUp={() => setBtn('nitro', false)}
              onPointerLeave={() => setBtn('nitro', false)}
              className="pointer-events-auto h-14 px-5 rounded-xl bg-amber-500 text-slate-950 text-xs font-extrabold active:scale-95"
            >
              NITRO BOOST
            </button>
          )}
        </div>
      )}

      {game.id === 'cube-snake-3d' && (
        <div className="absolute bottom-3 right-3 grid grid-cols-3 gap-1.5">
          <div />
          <button
            onClick={() => { inputRef.current.steerDir = 1; }}
            className="w-12 h-12 rounded-xl bg-black/70 border border-white/15 text-white font-bold active:bg-emerald-500"
          >
            ▲
          </button>
          <div />
          <button
            onClick={() => { inputRef.current.steerDir = -1; }}
            className="w-12 h-12 rounded-xl bg-black/70 border border-white/15 text-white font-bold active:bg-emerald-500"
          >
            ◀
          </button>
          <button
            onClick={() => { inputRef.current.steerDir = 2; }}
            className="w-12 h-12 rounded-xl bg-black/70 border border-white/15 text-white font-bold active:bg-emerald-500"
          >
            ▼
          </button>
          <button
            onClick={() => { inputRef.current.steerDir = 3; }}
            className="w-12 h-12 rounded-xl bg-black/70 border border-white/15 text-white font-bold active:bg-emerald-500"
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
};
