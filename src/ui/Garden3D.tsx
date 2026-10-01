import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SiteConfig } from '../state/store';
import { FEATURE_DEFAULTS } from '../state/store';
import { PLANT_BY_ID } from '../data/plants';
import { sunAt, sunDirPlan, type SunSample } from '../garden/sun';
import { noonAtOffset, tzOffsetHours } from '../astro/dates';

interface Props { site: SiteConfig; date: string; hour: number; selectedId: string | null; onSelect: (type: 'bed' | 'feature', id: string | null) => void; samples: SunSample[]; }

/** Plant appearance by id/part: canopy colour, shape. */
function plantLook(id: string): { color: number; shape: 'bush' | 'rosette' | 'tall' | 'vine' | 'spike'; accent?: number } {
  const p = PLANT_BY_ID[id];
  const by: Record<string, ReturnType<typeof plantLook>> = {
    corn: { color: 0x6aa84f, shape: 'tall', accent: 0xf1c232 }, sunflower: { color: 0x5b8c3a, shape: 'tall', accent: 0xf5c518 }, sesame: { color: 0x7fa85a, shape: 'tall' }, okra: { color: 0x5d8a46, shape: 'tall', accent: 0xf3e9a0 },
    tomato: { color: 0x4f8a3b, shape: 'bush', accent: 0xd9442b }, pepper: { color: 0x3f7d3a, shape: 'bush', accent: 0xc62f2f }, eggplant: { color: 0x4a6f3f, shape: 'bush', accent: 0x4b2a6b },
    cucumber: { color: 0x58a04a, shape: 'vine' }, zucchini: { color: 0x4e8f3c, shape: 'vine', accent: 0x2e5e26 }, winter_squash: { color: 0x4a8a3a, shape: 'vine', accent: 0xd98f2b }, pumpkin: { color: 0x4a8a3a, shape: 'vine', accent: 0xe8792b }, melon: { color: 0x5aa04a, shape: 'vine', accent: 0x8fbf6a },
    garlic: { color: 0x8fbf8f, shape: 'spike' }, onion: { color: 0x9ccc9c, shape: 'spike' }, scallion: { color: 0x7fc97f, shape: 'spike' }, chive_korean: { color: 0x6fbf6f, shape: 'spike' }, leek: { color: 0x7fb3a0, shape: 'spike' },
    marigold: { color: 0x4d8a3a, shape: 'rosette', accent: 0xf2a93b }, calendula: { color: 0x5a9a44, shape: 'rosette', accent: 0xf7b733 }, nasturtium: { color: 0x5fae4a, shape: 'rosette', accent: 0xe8632b }, borage: { color: 0x5f9a60, shape: 'bush', accent: 0x6c8fe0 },
    napa: { color: 0xa8d66a, shape: 'rosette' }, lettuce: { color: 0x9ed15c, shape: 'rosette' }, cabbage: { color: 0x8fbf9f, shape: 'rosette' }, kale: { color: 0x3f7a5a, shape: 'rosette' }, spinach: { color: 0x3f8a3f, shape: 'rosette' }, chard: { color: 0x4f9a4f, shape: 'rosette', accent: 0xd94b4b }, perilla: { color: 0x6f9a4f, shape: 'bush' }, basil: { color: 0x5fa55f, shape: 'bush' }
  };
  if (by[id]) return by[id];
  return p?.part === 'root' ? { color: 0x6fa85a, shape: 'rosette' } : p?.part === 'flower' ? { color: 0x5a9a4a, shape: 'rosette', accent: 0xf2c94c } : p?.heightCm && p.heightCm > 150 ? { color: 0x5a9a4a, shape: 'tall' } : { color: 0x5a9a4a, shape: 'bush' };
}

function labelSprite(text: string, color = '#e8eedf', size = 0.5): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(15,26,19,0.65)'; g.beginPath(); g.roundRect(8, 24, 496, 80, 24); g.fill();
  g.font = '600 56px system-ui, sans-serif'; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text.slice(0, 22), 256, 64);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(size * 4, size, 1); return sp;
}

export default function Garden3D({ site, date, hour, selectedId, onSelect, samples }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const world = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; sun: THREE.DirectionalLight; sky: THREE.HemisphereLight; sunMesh: THREE.Mesh; pick: THREE.Object3D[]; frame: number; dispose: () => void } | null>(null);
  const W = site.widthM, D = site.depthM;
  const toX = (x: number) => x - W / 2, toZ = (y: number) => y - D / 2;

  // ---- scene build (beds/features/orientation) ----
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fc3e0);
    scene.fog = new THREE.Fog(0x9fc3e0, Math.max(W, D) * 2.5, Math.max(W, D) * 8);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    const span = Math.max(W, D);
    // Start the camera on the side away from the tall features so the plot is in front of them.
    const tall = (site.features ?? []).filter(f => f.heightM >= 2);
    let vx = 0.6, vz = 1.0;
    if (tall.length) { const cx0 = tall.reduce((a, f) => a + (f.x + f.w / 2 - W / 2) * f.heightM, 0), cz0 = tall.reduce((a, f) => a + (f.y + f.h / 2 - D / 2) * f.heightM, 0); const L = Math.hypot(cx0, cz0) || 1; vx = -cx0 / L * 0.9 + 0.35; vz = -cz0 / L * 0.9 + 0.2; }
    const home = new THREE.Vector3(vx * span, span * 0.75, vz * span);
    camera.position.copy(home);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.target.set(0, 0, 0); controls.minDistance = 3; controls.maxDistance = span * 4;
    (el as any).__view = (which: 'home' | 'top' | 'north' | 'south' | 'east' | 'west') => {
      const [nx0, nz0] = sunDirPlan(0, site.rotationDeg); const d = span * 1.1;
      const pos = which === 'home' ? home : which === 'top' ? new THREE.Vector3(0.001, span * 1.6, 0.001) : which === 'north' ? new THREE.Vector3(nx0 * d, span * 0.6, nz0 * d) : which === 'south' ? new THREE.Vector3(-nx0 * d, span * 0.6, -nz0 * d) : which === 'east' ? new THREE.Vector3(-nz0 * d, span * 0.6, nx0 * d) : new THREE.Vector3(nz0 * d, span * 0.6, -nx0 * d);
      camera.position.copy(pos); controls.target.set(0, 0, 0); controls.update();
    };

    // ground
    const groundR = span * 4;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(groundR, 64), new THREE.MeshStandardMaterial({ color: 0x5e8c4a, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const plot = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x6f9a52, roughness: 1 })); plot.rotation.x = -Math.PI / 2; plot.position.y = 0.005; plot.receiveShadow = true; scene.add(plot);
    const grid = new THREE.GridHelper(Math.max(W, D), Math.max(W, D), 0x3f6b3a, 0x4f7b48); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.25; grid.position.y = 0.01; grid.scale.set(W / Math.max(W, D), 1, D / Math.max(W, D)); scene.add(grid);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, D)), new THREE.LineBasicMaterial({ color: 0xf3e9c6 })); edge.rotation.x = -Math.PI / 2; edge.position.y = 0.02; scene.add(edge);

    const pick: THREE.Object3D[] = [];
    // beds
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6240, roughness: 0.9 });
    for (const b of site.beds) {
      const hM = Math.max(0.06, (b.heightCm ?? 0) / 100);
      const g = new THREE.Group(); g.position.set(toX(b.x + b.w / 2), 0, toZ(b.y + b.h / 2));
      const soil = new THREE.Mesh(new THREE.BoxGeometry(b.w, hM, b.h), soilMat); soil.position.y = hM / 2; soil.castShadow = true; soil.receiveShadow = true; soil.userData = { type: 'bed', id: b.id }; g.add(soil); pick.push(soil);
      if ((b.heightCm ?? 0) >= 8) { const t = 0.05; for (const [x, z, w, d] of [[0, -b.h / 2, b.w + t, t], [0, b.h / 2, b.w + t, t], [-b.w / 2, 0, t, b.h], [b.w / 2, 0, t, b.h]] as number[][]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(w, hM + 0.04, d), woodMat); pl.position.set(x, (hM + 0.04) / 2, z); pl.castShadow = true; pl.receiveShadow = true; pl.userData = { type: 'bed', id: b.id }; g.add(pl); pick.push(pl); } }
      if (b.id === selectedId) { const ring = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.2, 0.02, b.h + 0.2), new THREE.MeshBasicMaterial({ color: 0xf3e9c6 })); ring.position.y = 0.012; g.add(ring); }
      // plants
      const n = b.plants.length;
      b.plants.forEach((pid, pi) => {
        const p = PLANT_BY_ID[pid]; if (!p) return; const look = plantLook(pid);
        const hp = Math.min(p.heightCm, 260) / 100; const sp = Math.max(0.12, p.spacingCm / 100);
        // each plant gets a horizontal strip of the bed
        const stripW = b.w / n, x0 = -b.w / 2 + pi * stripW;
        const cols = Math.max(1, Math.floor(stripW / sp)), rowsN = Math.max(1, Math.floor(b.h / sp));
        const cnt = Math.min(cols * rowsN, 220);
        const geo = look.shape === 'tall' ? new THREE.CylinderGeometry(0.02, 0.035, hp, 6) : look.shape === 'spike' ? new THREE.ConeGeometry(sp * 0.25, hp, 5) : look.shape === 'rosette' ? new THREE.SphereGeometry(sp * 0.42, 8, 6) : look.shape === 'vine' ? new THREE.SphereGeometry(sp * 0.5, 8, 6) : new THREE.SphereGeometry(Math.min(sp * 0.45, hp * 0.5), 8, 6);
        const mat = new THREE.MeshStandardMaterial({ color: look.color, roughness: 0.95 });
        const inst = new THREE.InstancedMesh(geo, mat, cnt); inst.castShadow = true; inst.receiveShadow = true; inst.userData = { type: 'bed', id: b.id };
        const acc = look.accent != null ? new THREE.InstancedMesh(look.shape === 'tall' ? new THREE.SphereGeometry(0.09, 8, 6) : new THREE.SphereGeometry(Math.min(0.05, sp * 0.15), 6, 5), new THREE.MeshStandardMaterial({ color: look.accent, roughness: 0.7 }), cnt) : null;
        const m4 = new THREE.Matrix4(); let k = 0;
        for (let r = 0; r < rowsN && k < cnt; r++) for (let c = 0; c < cols && k < cnt; c++, k++) {
          const jitter = () => (Math.random() - 0.5) * sp * 0.25;
          const px = x0 + (c + 0.5) * (stripW / cols) + jitter(), pz = -b.h / 2 + (r + 0.5) * (b.h / rowsN) + jitter();
          const sc = 0.85 + Math.random() * 0.3;
          const py = look.shape === 'tall' || look.shape === 'spike' ? hM + hp * sc / 2 : look.shape === 'rosette' ? hM + sp * 0.2 : hM + Math.min(sp * 0.45, hp * 0.5) * sc * 0.9;
          m4.compose(new THREE.Vector3(px, py, pz), new THREE.Quaternion(), new THREE.Vector3(sc, look.shape === 'rosette' ? sc * 0.5 : sc, sc)); inst.setMatrixAt(k, m4);
          if (acc) { const ay = look.shape === 'tall' ? hM + hp * sc : py + (look.shape === 'rosette' ? sp * 0.2 : Math.min(sp * 0.45, hp * 0.5) * 0.5); m4.compose(new THREE.Vector3(px + jitter() * 0.5, ay, pz + jitter() * 0.5), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)); acc.setMatrixAt(k, m4); }
        }
        inst.instanceMatrix.needsUpdate = true; g.add(inst); pick.push(inst); if (acc) { acc.instanceMatrix.needsUpdate = true; g.add(acc); }
      });
      const lab = labelSprite(b.label, b.id === selectedId ? '#f3e9c6' : '#e8eedf', Math.max(0.5, span * 0.03)); lab.position.set(0, hM + Math.max(0.6, ...b.plants.map(p => PLANT_BY_ID[p]?.heightCm ?? 0).map(h => h / 100 + 0.4)), 0); g.add(lab);
      scene.add(g);
    }
    // features
    for (const f of site.features ?? []) {
      const g = new THREE.Group(); g.position.set(toX(f.x + f.w / 2), 0, toZ(f.y + f.h / 2));
      const sel = f.id === selectedId;
      const add = (m: THREE.Mesh) => { m.castShadow = FEATURE_DEFAULTS[f.kind].casts; m.receiveShadow = true; m.userData = { type: 'feature', id: f.id }; g.add(m); pick.push(m); };
      if (f.kind === 'house' || f.kind === 'shed') {
        const wallH = f.kind === 'house' ? f.heightM * 0.7 : f.heightM * 0.85;
        add(new THREE.Mesh(new THREE.BoxGeometry(f.w, wallH, f.h), new THREE.MeshStandardMaterial({ color: f.kind === 'house' ? 0xd9cdb8 : 0x8a7a62, roughness: 0.9 }))); g.children[0].position.y = wallH / 2;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(f.w, f.h) / 2, f.heightM - wallH, 4), new THREE.MeshStandardMaterial({ color: 0x6b4a3a, roughness: 0.9 })); roof.position.y = wallH + (f.heightM - wallH) / 2; roof.rotation.y = Math.PI / 4; roof.scale.set(f.w / Math.hypot(f.w, f.h) * 1.42, 1, f.h / Math.hypot(f.w, f.h) * 1.42); add(roof);
      } else if (f.kind === 'greenhouse') {
        add(new THREE.Mesh(new THREE.BoxGeometry(f.w, f.heightM, f.h), new THREE.MeshPhysicalMaterial({ color: 0xcfe8f3, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0 }))); g.children[0].position.y = f.heightM / 2;
      } else if (f.kind === 'tree') {
        const trunkH = f.heightM * 0.4;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, trunkH, 8), new THREE.MeshStandardMaterial({ color: 0x5a3f2a, roughness: 1 }))); g.children[0].position.y = trunkH / 2;
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ color: 0x3f7d3a, roughness: 1 })); canopy.scale.set(f.w / 2, (f.heightM - trunkH * 0.6) / 2, f.h / 2); canopy.position.y = trunkH * 0.6 + (f.heightM - trunkH * 0.6) / 2; add(canopy);
      } else if (f.kind === 'fence' || f.kind === 'wall') {
        add(new THREE.Mesh(new THREE.BoxGeometry(f.w, f.heightM, Math.max(0.05, f.h)), new THREE.MeshStandardMaterial({ color: f.kind === 'fence' ? 0xa67c52 : 0x9a9a9a, roughness: 0.95 }))); g.children[0].position.y = f.heightM / 2;
        if (f.kind === 'fence') { const long = f.w >= f.h; const len = long ? f.w : f.h; const nP = Math.max(2, Math.floor(len / 2.4) + 1); for (let i = 0; i < nP; i++) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, f.heightM + 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x6b4a3a })); post.position.set(long ? -len / 2 + i * len / (nP - 1) : 0, (f.heightM + 0.1) / 2, long ? 0 : -len / 2 + i * len / (nP - 1)); add(post); } }
      } else if (f.kind === 'path') {
        add(new THREE.Mesh(new THREE.BoxGeometry(f.w, 0.03, f.h), new THREE.MeshStandardMaterial({ color: 0xb9b2a0, roughness: 1 }))); g.children[0].position.y = 0.015;
      }
      if (sel) { const ring = new THREE.Mesh(new THREE.BoxGeometry(f.w + 0.3, 0.02, f.h + 0.3), new THREE.MeshBasicMaterial({ color: 0xf3e9c6 })); ring.position.y = 0.012; g.add(ring); }
      const lab = labelSprite(f.label ?? f.kind, sel ? '#f3e9c6' : '#e8eedf', Math.max(0.6, span * 0.035)); lab.position.set(0, f.heightM + 0.6, 0); g.add(lab);
      scene.add(g);
    }
    // compass: north arrow outside the plot
    const [nx, ny] = sunDirPlan(0, site.rotationDeg);
    const compass = new THREE.Group(); const cR = span * 0.62;
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(nx, 0, ny), new THREE.Vector3(0, 0.1, 0), span * 0.12, 0xf3e9c6, span * 0.03, span * 0.02); compass.add(arrow);
    const nLab = labelSprite('N', '#f3e9c6', Math.max(0.6, span * 0.04)); nLab.position.set(nx * span * 0.16, 0.6, ny * span * 0.16); compass.add(nLab);
    compass.position.set(-cR, 0, cR); scene.add(compass);
    // wind arrow
    const [wx, wy] = sunDirPlan(site.windDeg, site.rotationDeg);
    const wind = new THREE.ArrowHelper(new THREE.Vector3(-wx, 0, -wy), new THREE.Vector3(wx * cR, 1.2, wy * cR), span * 0.18, 0x5aa0d9, span * 0.04, span * 0.025); scene.add(wind);
    const wLab = labelSprite('wind', '#9fd0ff', Math.max(0.6, span * 0.035)); wLab.position.set(wx * cR, 2.2, wy * cR); scene.add(wLab);

    // lights
    const sky = new THREE.HemisphereLight(0xbfd9ff, 0x4f6b3a, 0.9); scene.add(sky);
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -span * 1.2; sc.right = span * 1.2; sc.top = span * 1.2; sc.bottom = -span * 1.2; sc.near = 1; sc.far = span * 8; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(span * 0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1a8 })); scene.add(sunMesh);
    // sun path for the day
    if (samples.length > 1) { const pts = samples.map(s => { const [dx, dz] = sunDirPlan(s.azimuth, site.rotationDeg); const alt = s.altitude * Math.PI / 180; const R = span * 2.2; return new THREE.Vector3(dx * Math.cos(alt) * R, Math.sin(alt) * R, dz * Math.cos(alt) * R); }); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.8 })); scene.add(line); }

    const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2(); let downAt = 0;
    const onDown = () => { downAt = Date.now(); };
    const onUp = (e: PointerEvent) => { if (Date.now() - downAt > 250) return; const r = renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(pick, false)[0]; if (hit) onSelect(hit.object.userData.type, hit.object.userData.id); else onSelect('bed', null); };
    renderer.domElement.addEventListener('pointerdown', onDown); renderer.domElement.addEventListener('pointerup', onUp);
    const resize = () => { const w = el.clientWidth, h = Math.max(380, Math.min(640, Math.round(w * 0.62))); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    resize(); const ro = new ResizeObserver(resize); ro.observe(el);
    let frame = 0; const loop = () => { controls.update(); renderer.render(scene, camera); frame = requestAnimationFrame(loop); }; loop();
    world.current = { renderer, scene, camera, controls, sun, sky, sunMesh, pick, frame, dispose: () => { cancelAnimationFrame(frame); ro.disconnect(); renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp); controls.dispose(); scene.traverse(o => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach(x => x.dispose()); else mat?.dispose?.(); }); renderer.dispose(); el.removeChild(renderer.domElement); } };
    return () => { world.current?.dispose(); world.current = null; };
     
  }, [site.beds, site.features, site.rotationDeg, site.widthM, site.depthM, site.windDeg, selectedId, samples]);

  // ---- sun position per hour (cheap update) ----
  useEffect(() => {
    const w = world.current; if (!w) return;
    const off = tzOffsetHours(site.tz, noonAtOffset(date, 0));
    const t = new Date(noonAtOffset(date, off).getTime() + (hour - 12) * 3_600_000);
    const s = sunAt(t, site.lat, site.lon, site.elevationM);
    const span = Math.max(W, D);
    const [dx, dz] = sunDirPlan(s.azimuth, site.rotationDeg); const alt = Math.max(-0.2, s.altitude * Math.PI / 180);
    const R = span * 2.2;
    w.sun.position.set(dx * Math.cos(alt) * R, Math.sin(alt) * R, dz * Math.cos(alt) * R); w.sun.target.position.set(0, 0, 0);
    w.sunMesh.position.copy(w.sun.position).multiplyScalar(1.5);
    const up = Math.max(0, Math.sin(alt));
    w.sun.intensity = s.altitude > 0 ? 0.6 + 1.9 * Math.min(1, up * 1.6) : 0;
    const warm = s.altitude > 0 && s.altitude < 12 ? 1 - s.altitude / 12 : 0;
    w.sun.color.setRGB(1, 1 - 0.35 * warm, 1 - 0.6 * warm);
    const skyCol = new THREE.Color().lerpColors(new THREE.Color(0x24324a), new THREE.Color(0x9fc3e0), Math.min(1, Math.max(0, (s.altitude + 6) / 20)));
    if (warm) skyCol.lerp(new THREE.Color(0xf0a06a), warm * 0.45);
    (w.scene.background as THREE.Color).copy(skyCol); if (w.scene.fog) (w.scene.fog as THREE.Fog).color.copy(skyCol);
    w.sky.intensity = s.altitude > 0 ? 0.5 + 0.6 * up : 0.25;
    w.sunMesh.visible = s.altitude > -2;
  }, [date, hour, site, W, D]);

  const view = (w: string) => (ref.current as any)?.__view?.(w);
  return (
    <div>
      <div className="chips" style={{ marginTop: 8 }}>{[['home', 'Reset view'], ['top', 'Top'], ['north', 'From north'], ['south', 'From south'], ['east', 'From east'], ['west', 'From west']].map(([k, l]) => <button key={k} className="chip" onClick={() => view(k)}>{l}</button>)}</div>
      <div ref={ref} style={{ width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8, border: '1px solid var(--line)' }} />
      <p className="sr">Drag to orbit, scroll to zoom, right-drag to pan. Click a bed or feature to select it. The Sun, its path (yellow arc) and every shadow come from the real solar position at {site.name} for the chosen date and hour; north is the cream arrow, wind the blue one.</p>
    </div>
  );
}
