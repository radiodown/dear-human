// Stage 1 renderer: room backgrounds, the shallow floor, depth-sorted sprites, telegraphs, bullets, HUD and the
// branching tactical map. Reads the simulation state from game.js; changes nothing in it except G.halfW / G.viewHalfW.
import { VIEW, DEPTH, SPRITE_PPM, SETS, PLAYER, COMBAT, SKILLS, ENEMY, ROOMS, MAP } from './config.js';

const THEMES = {
  hangar: { sky: ['#26323a', '#3b4a50'], wall: '#2e3a3f', wallLine: '#3d4c52', floor: '#2b302d', floorLine: '#3a423c', edge: '#1b1f1d', prop: '#38464b', light: '#e8c27a' },
  farm: { sky: ['#2f3b35', '#56614f'], wall: '#3a4236', wallLine: '#4a5444', floor: '#33302a', floorLine: '#45413a', edge: '#201e1a', prop: '#4a5243', light: '#bfe38a' },
  refinery: { sky: ['#2c2a33', '#4b4652'], wall: '#36323c', wallLine: '#48434f', floor: '#2d2b30', floorLine: '#3e3b43', edge: '#1c1a1e', prop: '#4d4757', light: '#9ad0ff' },
  hive: { sky: ['#2b2221', '#4d3631'], wall: '#3a2a27', wallLine: '#4e3833', floor: '#2f2523', floorLine: '#433430', edge: '#1d1615', prop: '#5a3d36', light: '#9be36a' },
};
const LABELS = { rifle_idle: '소총 대기', rifle_aim_idle: '사격 대기', dual_idle_high: '쌍권총 대기', dual_idle: '쌍권총 사격 대기' };

export function createRenderer({ canvas, ctx, G, P, fx, frameOf, living, odActive, reloading, bulletZ, skillInfo }) {
  let view = null;
  function measure() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(innerWidth * dpr), h = Math.round(innerHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const W = canvas.width, H = canvas.height, ppu = H / VIEW.unitsOnScreen;
    // visible half width for drawing; the rules (lock, spawn, on screen) use it capped at 3.2 (권고 16항).
    // A hidden window can report 0 x 0: keep a 16:9 value then.
    const visible = W / 2 / ppu;
    G.viewHalfW = Number.isFinite(visible) && visible > 0 ? visible : VIEW.halfWFallback;
    G.halfW = Math.min(VIEW.halfWCap, G.viewHalfW);
    const sh = G.shakeT > 0 ? G.shakeAmp * Math.min(1, G.shakeT / 0.15) : 0;
    const shx = Math.sin(G.time * 93) * sh, shy = Math.cos(G.time * 71) * sh * 0.6;
    const camX = G.camera.x + shx, frontY = H * VIEW.frontY + shy * ppu;
    const sx = x => W / 2 + (x - camX) * ppu;
    const sy = (z, h = 0) => frontY - (z * VIEW.depthK + h) * ppu;
    view = { W, H, ppu, dpr: W / Math.max(1, canvas.clientWidth || innerWidth), camX, frontY, sx, sy,
             fx: { W, H, ppu, groundY: frontY, sx, dpr: W / Math.max(1, canvas.clientWidth || innerWidth) } };
  }

  // ---------- helpers
  function text(str, x, y, size, color, align = 'left', weight = 600, stroke = 'rgba(0,0,0,.7)') {
    ctx.font = `${weight} ${size}px system-ui, "Malgun Gothic", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = stroke; ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function sprite(sheet, frame, x, y, facing, scale, look) {
    if (!sheet) return;
    const m = sheet.manifest, n = m.frameCount;
    frame = m.loop === false ? Math.min(n - 1, frame) : ((frame % n) + n) % n;
    const cols = m.columns, cw = m.crop.width, ch = m.crop.height, s = view.ppu / SPRITE_PPM * scale;
    ctx.save();
    if (look?.alpha != null) ctx.globalAlpha = look.alpha;
    if (look?.filter) ctx.filter = look.filter;
    ctx.setTransform(facing * s, 0, 0, s, x, y);
    if (look?.rot) ctx.rotate(look.rot);
    ctx.drawImage(sheet.image, (frame % cols) * cw, Math.floor(frame / cols) * ch, cw, ch, m.crop.x - m.originX, m.crop.y - m.groundY, cw, ch);
    ctx.restore();
  }
  const shadow = (x, z, r, a = 0.28) => {
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.beginPath(); ctx.ellipse(view.sx(x), view.sy(z), view.ppu * r, view.ppu * r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  };

  // ---------- background
  function drawRoom() {
    const { W, H, ppu, sx, sy, camX } = view, R = G.room, T = THEMES[R?.def.theme ?? 'hangar'];
    const backY = sy(DEPTH.max), frontY = sy(0), L = R?.def.length ?? 20;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, backY);
    sky.addColorStop(0, T.sky[0]); sky.addColorStop(1, T.sky[1]); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, backY);
    for (const [depth, a, h] of [[0.25, 0.35, 1.0], [0.5, 0.55, 0.6]]) {             // far silhouettes (parallax)
      ctx.fillStyle = T.wall; ctx.globalAlpha = a;
      for (let i = -12; i <= 30; i++) {
        const x = W / 2 + (i * 2.4 - camX * depth) * ppu;
        if (x < -3 * ppu || x > W + 3 * ppu) continue;
        const bh = (h + ((i * 37) % 5 + 5) % 5 * 0.14) * ppu;
        ctx.fillRect(x, backY - bh - 0.4 * ppu, 1.5 * ppu, bh);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = T.wall; ctx.fillRect(0, backY - 0.55 * ppu, W, 0.55 * ppu);          // back wall strip
    ctx.fillStyle = T.wallLine; ctx.fillRect(0, backY - 0.55 * ppu, W, Math.max(2, 0.02 * ppu));
    for (let u = Math.floor(camX - G.viewHalfW) - 1; u <= camX + G.viewHalfW + 1; u++) {
      if (u % 3 === 0) { ctx.fillStyle = T.prop; ctx.fillRect(sx(u) - 0.12 * ppu, backY - 0.9 * ppu, 0.24 * ppu, 0.9 * ppu); }
      if (u % 6 === 3) { ctx.fillStyle = T.light; ctx.globalAlpha = 0.5; ctx.fillRect(sx(u) - 0.2 * ppu, backY - 0.48 * ppu, 0.4 * ppu, 0.05 * ppu); ctx.globalAlpha = 1; }
    }
    ctx.fillStyle = T.floor; ctx.fillRect(0, backY, W, H - backY);                        // floor band
    ctx.strokeStyle = T.floorLine; ctx.lineWidth = Math.max(1, 0.01 * ppu);
    for (let k = 1; k < 4; k++) { const y = sy(DEPTH.max * k / 4); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let u = Math.floor((camX - G.viewHalfW) / 1.5) - 1; u * 1.5 <= camX + G.viewHalfW + 1.5; u++) {   // seams leaning out a little
      const x = sx(u * 1.5), lean = (x - W / 2) * 0.06;
      ctx.beginPath(); ctx.moveTo(x - lean, backY); ctx.lineTo(x + lean, frontY); ctx.stroke();
    }
    ctx.fillStyle = T.edge; ctx.fillRect(0, frontY, W, H - frontY);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, backY, W, 0.06 * ppu);
    for (const edge of [0, L]) {                                                          // room ends
      ctx.fillStyle = '#151a1c'; const x = sx(edge);
      ctx.fillRect(edge === 0 ? x - 4 * ppu : x, 0, 4 * ppu, H);
    }
    if (R && !R.def.boss) drawDoor(L, T);
    if (R?.lock) {                                                                        // screen lock barriers
      ctx.fillStyle = 'rgba(255,80,60,.18)';
      for (const x of [R.lock.left + 0.15, R.lock.right - 0.15]) ctx.fillRect(sx(x) - 0.03 * ppu, backY - 0.5 * ppu, 0.06 * ppu, frontY - backY + 0.5 * ppu);
    }
  }
  function drawDoor(L, T) {
    const { ppu, sx, sy } = view, x = sx(L - 0.5), top = sy(DEPTH.max) - 1.0 * ppu, h = 1.0 * ppu, w = 0.8 * ppu, open = G.room.cleared;
    ctx.fillStyle = '#1c2224'; ctx.fillRect(x - w / 2, top, w, h);
    ctx.strokeStyle = open ? '#7fe08a' : '#c0503f'; ctx.lineWidth = 0.03 * ppu; ctx.strokeRect(x - w / 2, top, w, h);
    if (!open) { ctx.fillStyle = 'rgba(192,80,63,.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2, top + (i + 0.3) * h / 4, w, h / 12); }
    else {
      const a = 0.5 + 0.5 * Math.sin(G.room.doorT * 6);
      ctx.fillStyle = `rgba(127,224,138,${0.25 + 0.3 * a})`; ctx.fillRect(x - w / 2, top, w, h);
      text('출구 →', x, top - 0.12 * ppu, Math.round(0.11 * ppu), '#bff5c4', 'center', 800);
    }
  }

  // ---------- characters
  function enemyClip(e) {
    const c = e.cfg;
    if (e.dying === 'death') return ['death', Math.floor(e.dieT * ENEMY.death.fps)];
    if (e.dying === 'explode') return ['explode', Math.floor(e.dieT * ENEMY.explode.fps)];
    if (e.type === 'boss') {
      if (e.state === 'stunned') return ['death', Math.min(7, Math.floor(e.t * 12))];
      if (e.state === 'charge' && e.dashing) return ['walk_fast', Math.floor(e.animT * 24)];
      if (e.state === 'swipe' || e.state === 'spit' || e.state === 'summon') return ['pounce', Math.floor(e.t * 14)];
      return ['walk', Math.floor(e.animT * 12 * 2)];
    }
    if (e.state === 'attack') return [c.attack, Math.floor(e.t * 12)];
    return [c.walk, Math.floor(e.animT * 12 * ENEMY.walkAnimRate)];
  }
  function drawEnemy(e) {
    const c = e.cfg, x = view.sx(e.x), y = view.sy(e.z), scale = c.scale;
    let alpha = 1;
    if (e.dying === 'death') { const fadeStart = ENEMY.death.frames / ENEMY.death.fps + ENEMY.death.hold; if (e.dieT > fadeStart) alpha = Math.max(0, 1 - (e.dieT - fadeStart) / ENEMY.death.fade); }
    const [clip, frame] = enemyClip(e);
    const sheet = G.enemySprites[clip];
    const filter = [c.filter, e.flash > 0 ? 'brightness(3)' : '', e.type === 'boss' && e.state === 'stunned' ? 'brightness(1.3)' : ''].filter(Boolean).join(' ');
    if (sheet) sprite(sheet, frame, x, y, e.facing, scale, { alpha, filter });
    else { ctx.fillStyle = '#7a4a3c'; ctx.fillRect(x - 0.4 * view.ppu * scale, y - 0.5 * view.ppu * scale, 0.8 * view.ppu * scale, 0.5 * view.ppu * scale); }
  }
  function lianLook() {
    let alpha = 1, rot = 0;
    if (G.mode === 'defeated') { const k = Math.min(1, (G.deathT ?? 0) / 0.6); rot = -85 * Math.PI / 180 * (1 - (1 - k) ** 2); alpha = 1 - 0.6 * k; }
    else if (G.hitInv > 0 && Math.floor(G.hitInv * 20) % 2 === 1) alpha = 0.4;
    const filter = [G.hitFlash > 0 ? 'sepia(1) saturate(7) hue-rotate(-50deg)' : '',
      odActive() ? `drop-shadow(0 0 ${3 * view.dpr}px #ff9a2a) drop-shadow(0 0 ${6 * view.dpr}px rgba(255,140,40,.8))` : '',
      G.witch > 0 ? `drop-shadow(0 0 ${4 * view.dpr}px #8fe3ff)` : ''].filter(Boolean).join(' ');
    return { alpha, rot, filter };
  }
  const GHOST_TINT = { rifle: 'sepia(1) saturate(3) brightness(1.5)', dual: 'sepia(1) hue-rotate(150deg) saturate(4) brightness(1.35)' };
  function drawLian() {
    for (const g of G.ghosts) sprite(G.sprites[g.anim], g.frame, view.sx(g.x), view.sy(g.z), g.facing, 1,
      { alpha: 0.45 * (1 - g.t / PLAYER.roll.ghostLife), filter: 'brightness(1.6) saturate(.3)' });
    for (const g of G.skillGhosts) sprite(G.sprites[g.anim], g.frame, view.sx(g.x), view.sy(g.z), g.facing, 1,      // skill after-images (own pool)
      { alpha: 0.5 * (1 - g.t / g.life), filter: GHOST_TINT[g.tint] ?? GHOST_TINT.rifle });
    sprite(G.sprites[P.anim], frameOf(P.anim), view.sx(P.x), view.sy(P.z), P.facing, 1, lianLook());
  }

  // ---------- telegraphs (drawn on the floor before the sprites)
  function drawTelegraphs() {
    const { ppu, sx, sy } = view;
    for (const e of living()) {
      if (e.state !== 'attack' || e.stagger > 0) continue;
      const w = e.cfg.windup, k = Math.min(1, e.t / w);
      if (e.t > w) continue;
      ctx.strokeStyle = ENEMY.telegraph; ctx.globalAlpha = 0.35 + 0.5 * k; ctx.lineWidth = Math.max(2, 0.025 * ppu);
      if (e.cfg.ranged) { ctx.beginPath(); ctx.moveTo(sx(e.x), sy(e.z, 0.45)); ctx.lineTo(sx(P.x), sy(P.z, 0.45)); ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]); }
      else {
        const r = e.cfg.hitRange * (0.6 + 0.4 * k);
        ctx.beginPath(); ctx.ellipse(sx(e.x + e.facing * e.cfg.hitRange * 0.5), sy(e.z), r * 0.6 * ppu, r * 0.6 * ppu * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      text('!', sx(e.x), sy(e.z, 1.0 * e.cfg.scale), Math.round(0.16 * ppu), '#ff7a5c', 'center', 900);
    }
    const b = G.boss;
    if (b && !b.dying) {
      const B = ENEMY.boss;
      if (b.state === 'charge' && !b.dashing) {
        const k = Math.min(1, b.t / B.charge.telegraph), x0 = b.x, x1 = b.x + b.dir * B.charge.distance;
        ctx.fillStyle = `rgba(255,70,50,${0.12 + 0.25 * k})`;
        const yT = sy(b.z + B.charge.hitDz), yB = sy(b.z - B.charge.hitDz);
        ctx.fillRect(Math.min(sx(x0), sx(x1)), yT, Math.abs(sx(x1) - sx(x0)), yB - yT);
        text('돌진!', sx(b.x), sy(b.z, 2.1), Math.round(0.14 * ppu), '#ff7a5c', 'center', 900);
      } else if (b.state === 'swipe' && b.t < B.swipe.windup) {
        ctx.fillStyle = `rgba(255,70,50,${0.15 + 0.3 * b.t / B.swipe.windup})`;
        const xs = [sx(b.x - b.facing * 0.3), sx(b.x + b.facing * B.swipe.range)];
        ctx.fillRect(Math.min(...xs), sy(b.z + 0.6), Math.abs(xs[1] - xs[0]), sy(b.z - 0.6) - sy(b.z + 0.6));
      } else if (b.state === 'spit' && b.t < B.spit.windup) text('!', sx(b.x), sy(b.z, 2.0), Math.round(0.2 * ppu), '#c58cff', 'center', 900);
      else if (b.state === 'stunned') text('약점', sx(b.x), sy(b.z, 1.7), Math.round(0.13 * ppu), '#ffe08a', 'center', 900);
    }
  }

  // ---------- v1.3 skill effects (code drawn): floor streak, trail lines, orbit arc, 일제사격 crosshair marks
  const markHeight = e => (e.type === 'boss' ? 1.0 : 0.5 * e.cfg.scale);
  const fxp = (x, y) => [view.sx(x), view.frontY - y * view.ppu];      // stage-fx coordinates: y = depth x depthK + height
  function drawSkillFloor() {
    const { ppu, sx, sy } = view;
    for (const f of G.sfx) {
      if (f.type !== 'streak') continue;
      const k = f.t / f.life, x0 = sx(f.x0), y0 = sy(f.z0), x1 = sx(f.x1), y1 = sy(f.z1);
      ctx.save(); ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(150,140,118,${0.5 * (1 - k)})`; ctx.lineWidth = Math.max(3, 0.07 * ppu);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = `rgba(230,215,170,${0.55 * (1 - k)})`; ctx.lineWidth = Math.max(1, 0.015 * ppu);
      for (const o of [-0.025, 0.025]) { ctx.beginPath(); ctx.moveTo(x0, y0 + o * ppu); ctx.lineTo(x1, y1 + o * ppu); ctx.stroke(); }
      ctx.restore();
    }
  }
  function crosshair(x, y, r, color, alpha, spin) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.translate(x, y); ctx.rotate(spin);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(r * 0.45, 0); ctx.lineTo(r * 1.45, 0); ctx.stroke(); }
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawSkillFx() {
    const { ppu, sx, sy } = view;
    for (const f of G.sfx) {
      const k = f.t / f.life;
      if (f.type === 'line') {
        const [x0, y0] = fxp(f.x0, f.y0), [x1, y1] = fxp(f.x1, f.y1);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.globalAlpha = 1 - k;
        if (f.glow) { ctx.strokeStyle = f.color; ctx.globalAlpha = 0.35 * (1 - k); ctx.lineWidth = Math.max(4, f.width * 3.5 * ppu); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1 - k; }
        ctx.strokeStyle = f.color; ctx.lineWidth = Math.max(1.5, f.width * ppu); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, f.width * 0.35 * ppu); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.restore();
      } else if (f.type === 'arc') {                                   // spinning arc at muzzle height around Lian (2 turns in 0.8 s)
        const cx = sx(P.x), cy = sy(P.z, 0.78), rx = 0.78 * ppu, ry = rx * 0.36, head = f.dir * k * Math.PI * 4;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = f.color;
        for (let i = 0; i < 16; i++) {
          const a1 = head - f.dir * i * 0.17, a0 = a1 - f.dir * 0.19;
          ctx.globalAlpha = (1 - i / 16) * (k > 0.85 ? (1 - k) / 0.15 : 1) * 0.9; ctx.lineWidth = Math.max(1.5, (0.035 - i * 0.0016) * ppu);
          ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
        }
        ctx.restore();
      }
    }
    const s = P.skill;                                                 // 일제사격 marks: a crosshair drops onto the enemy, then locks
    if (s?.id === 'rifleD' && s.marks) {
      const r = 0.085 * ppu, drop = 0.14;
      for (const m of s.marks) {
        if (m.fired || m.e.dying) continue;
        const since = s.phase === 'mark' ? s.t - m.landT : 1;
        if (since < -drop) continue;
        const u = Math.min(1, (since + drop) / drop), off = (m.slot - (m.of - 1) / 2) * 0.16;
        const x = sx(m.e.x + off), y = sy(m.e.z, markHeight(m.e) + 0.7 * (1 - u) ** 2);
        const locked = since >= 0;
        crosshair(x, y, r * (locked ? 1 + 0.08 * Math.sin(G.time * 30) : 1.4 - 0.4 * u), locked ? '#ff6a3c' : '#ffd24a', locked ? 1 : 0.5 + 0.5 * u, locked ? 0 : (1 - u) * 1.5);
      }
    }
  }

  // ---------- projectiles
  function drawBullets() {
    const { ppu, sx, sy } = view;
    for (const b of G.bullets) {
      const s = b.spec, alpha = b.fade >= 0 ? b.fade / COMBAT.bullets.fadeTime : 1;
      const travelled = (b.x - b.startX) * b.dir, behind = Math.max(0, Math.min(b.kind === 'pierce' ? s.speed * 0.15 : s.length, travelled));
      const hx = sx(b.x), hy = sy(b.z, b.h), tx = sx(b.x - b.dir * behind), ty = sy(bulletZ(b, travelled - behind), b.h);
      ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
      if (b.kind === 'pierce') {
        const g = ctx.createLinearGradient(hx, hy, tx, ty); g.addColorStop(0, 'rgba(170,220,255,.6)'); g.addColorStop(1, 'rgba(170,220,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, s.width * 2.2 * ppu); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.strokeStyle = s.color; ctx.lineWidth = Math.max(1, s.width * ppu); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, Math.max(1.2, s.width * ppu * 0.9), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const g of G.globs) {
      shadow(g.x, g.z, g.size * 1.3, 0.25);
      const x = sx(g.x), y = sy(g.z, g.h), r = g.size * ppu;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
      grad.addColorStop(0, 'rgba(220,255,160,1)'); grad.addColorStop(0.45, 'rgba(140,230,70,.9)'); grad.addColorStop(1, 'rgba(90,180,40,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------- HUD
  function hpBars() {
    const { ppu, sx, sy } = view;
    for (const e of living()) {
      if (!e.damaged) continue;
      const w = 0.5 * ppu * Math.min(1.4, e.cfg.scale), h = Math.max(3, 0.045 * ppu), x = sx(e.x) - w / 2, y = sy(e.z, 0.78 * e.cfg.scale);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = e.cfg.bar; ctx.fillRect(x, y, w * e.hp / e.maxHp, h);
    }
  }
  function hud() {
    const { W, H, dpr: d } = view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const hx = 16 * d, hy = 16 * d, hw = 260 * d, hh = 18 * d;
    const low = G.hp <= PLAYER.hp * 0.25 && G.mode === 'room' && Math.floor(G.time * 4) % 2 === 0;
    ctx.fillStyle = 'rgba(10,14,16,.75)'; ctx.fillRect(hx - 2 * d, hy - 2 * d, hw + 4 * d, hh + 4 * d);
    ctx.fillStyle = '#a3302a'; ctx.fillRect(hx, hy, hw * G.hpLag / PLAYER.hp, hh);
    ctx.fillStyle = low ? '#f0e6c8' : G.hp <= PLAYER.hp * 0.25 ? '#e0523f' : '#5fc46b'; ctx.fillRect(hx, hy, hw * G.hp / PLAYER.hp, hh);
    text(`리안  HP ${Math.ceil(G.hp)}/${PLAYER.hp}`, hx + 8 * d, hy + hh / 2, 14 * d, low ? '#2a0e0a' : '#fff', 'left', 700, low ? 'rgba(255,255,255,.85)' : undefined);
    let y = hy + hh + 15 * d;
    const pb = Math.round((COMBAT.pointBlank.mult - 1) * 100);
    const wpn = P.weapon === 'none' ? '맨손' : P.weapon === 'rifle' ? `AR-12  ${G.ammo}/${COMBAT.rifleMag}` : `HP-14T  ∞  (근접 사격 +${pb}%)`;
    text(wpn + (odActive() && P.weapon === 'rifle' ? '  각성: 탄 소모 없음' : ''), hx, y, 13 * d, P.weapon === 'rifle' && G.ammo === 0 ? '#ff8b6b' : '#e8e3cf');
    const bar = (frac, color, label) => {
      y += 15 * d; ctx.fillStyle = 'rgba(10,14,16,.75)'; ctx.fillRect(hx, y - 4 * d, 160 * d, 8 * d);
      ctx.fillStyle = color; ctx.fillRect(hx, y - 4 * d, 160 * d * Math.max(0, Math.min(1, frac)), 8 * d); text(label, hx + 168 * d, y, 11 * d, color);
    };
    if (reloading()) bar(P.action.t / P.action.end, '#f0d29c', '장전');
    if (odActive()) bar(G.overdrive / COMBAT.skills.e.time, '#ff9a2a', `각성 ${G.overdrive.toFixed(1)}초`);
    if (G.witch > 0) bar(G.witch / PLAYER.roll.witchTime, '#8fe3ff', '완벽 회피 · 적 감속');
    if (G.chain.n >= 2) {
      y += 22 * d;
      const pct = Math.min(COMBAT.chain.maxStacks, G.chain.n) * COMBAT.chain.step * 100;
      text(`연속 처치 ×${G.chain.n}`, hx, y, 18 * d, '#ffd27a', 'left', 800);
      text(`피해 +${pct.toFixed(0)}%`, hx + 150 * d, y, 14 * d, '#ffd27a');
      ctx.fillStyle = 'rgba(255,210,122,.8)'; ctx.fillRect(hx, y + 12 * d, 140 * d * G.chain.t / COMBAT.chain.window, 3 * d);
    }
    // top centre: room and enemies left
    const R = G.room;
    if (R && G.mode !== 'map') {
      const left = R.def.boss ? '' : `남은 무리 ${R.def.groups.length - R.next + (R.lock ? 1 : 0)} · 적 ${living().length}`;
      // REQ-010: the boss room shows its name only (the 2.2 s entry banner already says "목표: 보스")
      text(R.def.boss ? R.def.name : `${R.def.name} · ${R.def.goal}${left ? ` · ${left}` : ''}`, W / 2, 22 * d, 15 * d, '#f0d29c', 'center', 700);
      text(`진행 ${G.run.rooms + 1}/5`, W - 16 * d, 22 * d, 14 * d, '#a9b8b6', 'right');
    }
    const b = G.boss;
    if (b && !b.dying && G.mode === 'room') {
      const bw = Math.min(W * 0.6, 640 * d), bx = W / 2 - bw / 2, by = 44 * d, bh = 14 * d;
      ctx.fillStyle = 'rgba(10,14,16,.8)'; ctx.fillRect(bx - 2 * d, by - 2 * d, bw + 4 * d, bh + 4 * d);
      ctx.fillStyle = b.hp / b.maxHp < ENEMY.boss.phase2 ? '#ff6a3d' : ENEMY.boss.bar; ctx.fillRect(bx, by, bw * b.hp / b.maxHp, bh);
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(bx + bw * ENEMY.boss.phase2, by, 2 * d, bh);
      text(`${ENEMY.boss.label}${b.hp / b.maxHp < ENEMY.boss.phase2 ? ' · 격앙' : ''}`, W / 2, by + bh + 14 * d, 14 * d, '#ffd0c0', 'center', 700);
    }
    skills(d, H);
    // popups and banner
    for (const p of G.popups) { ctx.globalAlpha = 1 - (p.t / p.life) ** 2; text(p.text, view.sx(p.x), view.sy(0, p.h + p.t * 0.4), 18 * d, p.color, 'center', 800); }
    ctx.globalAlpha = 1;
    if (G.banner && (G.banner.t > 0 || G.banner.t === Infinity)) {
      const a = G.banner.t === Infinity ? 1 : Math.min(1, G.banner.t / 0.4);
      ctx.globalAlpha = a;
      text(G.banner.text, W / 2, H * 0.3, 40 * d, '#f6e6c0', 'center', 800);
      if (G.banner.sub) text(G.banner.sub, W / 2, H * 0.3 + 36 * d, 15 * d, '#d9dccf', 'center');
      ctx.globalAlpha = 1;
    }
    if (G.mode === 'defeated' || G.mode === 'clear') result(d);
  }
  // 12장 / 19.7: one row of 5 slots (72 px, gap 6 -> 384 px): Space / W / E shared, D / F follow the weapon (bare hands: the last weapon)
  function skills(d, H) {
    const size = 72 * d, gap = 6 * d, x0 = 16 * d, y0 = H - 16 * d - size - 8 * d, live = G.mode === 'room';
    const wD = skillInfo('D'), wF = skillInfo('F'), wColor = wD.weapon === 'dual' ? '#6ccfff' : '#ff8a2a';
    const link = live && G.time < G.link, blink = Math.floor(G.time * 10) % 2 === 0;
    const weaponSlot = (key, w) => ({ key, name: w.name, cd: w.cd, max: w.max, usable: w.usable, reason: w.reason, color: wColor, link: link && w.usable && w.cd <= 0 });
    const slots = [
      { key: 'Space', name: '구르기', cd: G.cd.roll, max: PLAYER.roll.cooldown, usable: live && !reloading() },
      { key: 'W', name: '관통탄', cd: G.cd.w, max: COMBAT.skills.w.cooldown, usable: live && P.weapon !== 'none' && !reloading() },
      { key: 'E', name: '각성', cd: G.cd.e, max: COMBAT.skills.e.cooldown, usable: live && P.weapon !== 'none' && !reloading(), buff: G.overdrive / COMBAT.skills.e.time },
      weaponSlot('D', wD), weaponSlot('F', wF),
    ];
    slots.forEach((s, i) => {
      const x = x0 + i * (size + gap), y = y0, cx = x + size / 2, cy = y + size / 2;
      ctx.fillStyle = 'rgba(18,24,28,.85)'; ctx.fillRect(x, y, size, size);
      const kw = (s.key.length > 1 ? 40 : 17) * d, kh = 16 * d;                    // key cap
      ctx.fillStyle = '#2b363c'; ctx.fillRect(x + 5 * d, y + 5 * d, kw, kh);
      ctx.strokeStyle = '#71828a'; ctx.lineWidth = d; ctx.strokeRect(x + 5 * d + 0.5, y + 5 * d + 0.5, kw - 1, kh - 1);
      text(s.key, x + 5 * d + kw / 2, y + 5 * d + kh / 2 + d, 11 * d, '#f6e6c0', 'center', 800);
      text(s.name, cx, y + size - 13 * d, 14 * d, '#d6dccf', 'center', 700);
      if (s.cd > 0) {
        ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(x, y, size, size * s.cd / s.max);
        text(s.cd.toFixed(1), cx, cy + 2 * d, 18 * d, '#fff', 'center', 800);
      } else if (!s.usable) {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, size, size);
        if (s.reason) text(s.reason, cx, cy + 2 * d, 12 * d, '#ff9a7a', 'center', 700);
      }
      const ready = s.cd <= 0 && s.usable;
      ctx.save();
      if (s.link) { ctx.strokeStyle = blink ? '#fff2a8' : '#ffb400'; ctx.lineWidth = 3 * d; ctx.shadowColor = '#ffcc33'; ctx.shadowBlur = 10 * d; }   // 구르기 연계 창: gold blink
      else if (s.color) { ctx.strokeStyle = s.color; ctx.globalAlpha = ready ? 1 : 0.45; ctx.lineWidth = (ready ? 2 : 1.5) * d; }
      else { ctx.strokeStyle = ready ? '#ffd27a' : '#3a4850'; ctx.lineWidth = (ready ? 2 : 1) * d; }
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      ctx.restore();
      if (s.buff > 0) { ctx.fillStyle = '#ff9a2a'; ctx.fillRect(x, y + size + 3 * d, size * s.buff, 4 * d); }
    });
  }
  function result(d) {
    const { W, H } = view, cx = W / 2, cy = H * 0.42, bw = 380 * d, bh = 150 * d, win = G.mode === 'clear';
    ctx.fillStyle = 'rgba(12,16,18,.85)'; ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
    ctx.strokeStyle = win ? '#f0d29c' : '#c0503f'; ctx.lineWidth = 2 * d; ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
    text(win ? 'STAGE 1 CLEAR' : 'DEFEATED', cx, cy - 44 * d, 28 * d, win ? '#f6e6c0' : '#ff8070', 'center', 800);
    const R = G.run, m = Math.floor(R.time / 60), s = (R.time % 60).toFixed(1).padStart(4, '0');
    // 권고 19항: the room in progress, same as the HUD's 진행 n/5 (a clear ends in the boss room: 5/5)
    text(`시간 ${m}:${s} · 방 ${R.rooms + 1}/5 · 처치 ${R.kills}`, cx, cy - 6 * d, 14 * d, '#e8e3cf', 'center');
    text(`최대 연속 처치 ${R.bestChain} · 완벽 회피 ${R.perfect} · 받은 피해 ${R.damageTaken}`, cx, cy + 18 * d, 13 * d, '#c9cfc4', 'center');
    text('Enter로 처음부터', cx, cy + 48 * d, 13 * d, '#a9b8b6', 'center');
  }

  // ---------- tactical map
  function drawMap() {
    const { W, H, dpr: d } = view, M = G.map;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1518'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,170,160,.07)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40 * d) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40 * d) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    text('전술 지도 · 스테이지 1', W / 2, 40 * d, 22 * d, '#f0d29c', 'center', 800);
    text('수송선 관제 · 다음 진입 구역을 고르세요', W / 2, 66 * d, 13 * d, '#9fb3ae', 'center');
    const pos = id => { const n = MAP.nodes[id]; return [W * 0.12 + n.col * (W * 0.76 / 4), H * 0.46 + n.row * Math.min(H * 0.17, 130 * d)]; };
    const visited = new Set(G.run.visited), current = G.run.node, sel = M.choices[M.sel];
    for (const [id, n] of Object.entries(MAP.nodes)) for (const to of n.next) {
      const [x0, y0] = pos(id), [x1, y1] = pos(to), active = id === current && M.choices.includes(to), walked = visited.has(id) && visited.has(to);
      ctx.strokeStyle = walked ? '#f0d29c' : active ? (to === sel ? '#ffd27a' : '#7d8f8a') : '#33413f';
      ctx.lineWidth = (walked || to === sel && active ? 3 : 2) * d; ctx.setLineDash(active && to !== sel ? [6 * d, 6 * d] : []);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const id of Object.keys(MAP.nodes)) {
      const [x, y] = pos(id), room = ROOMS[id], isSel = id === sel, choice = M.choices.includes(id);
      const r = (room.boss ? 26 : 20) * d * (isSel ? 1.15 + 0.06 * Math.sin(M.t * 6) : 1);
      ctx.fillStyle = visited.has(id) ? '#3e4a3e' : choice ? '#26343a' : '#1a2226';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = isSel ? '#ffd27a' : room.boss ? '#e2563f' : choice ? '#9fb3ae' : visited.has(id) ? '#f0d29c' : '#3a4850';
      ctx.lineWidth = (isSel ? 3 : 2) * d; ctx.stroke();
      text(room.boss ? '보스' : visited.has(id) ? '완료' : '소탕', x, y, 14 * d, room.boss ? '#ffb0a0' : '#e8e3cf', 'center', 700);
      text(room.name, x, y + r + 16 * d, 14 * d, choice ? '#f6e6c0' : '#7d8f8a', 'center', choice ? 700 : 500);
      if (room.tag) text(room.tag, x, y + r + 34 * d, 14 * d, choice ? '#c9b48a' : '#5d6d69', 'center');
    }
    const room = ROOMS[sel], counts = {};
    for (const g of room.groups) for (const [t] of g.spawn) counts[t] = (counts[t] ?? 0) + 1;
    const list = room.boss ? `${ENEMY.boss.label} + 소환` : Object.entries(counts).map(([t, n]) => `${ENEMY.types[t].label} ${n}`).join(' · ');
    const bx = W / 2, by = H - 96 * d;
    ctx.fillStyle = 'rgba(20,28,32,.9)'; ctx.fillRect(bx - 260 * d, by - 34 * d, 520 * d, 68 * d);
    ctx.strokeStyle = '#3a4850'; ctx.lineWidth = d; ctx.strokeRect(bx - 260 * d, by - 34 * d, 520 * d, 68 * d);
    text(`${room.name} · 목표 ${room.goal} · 길이 ${(room.length * 1.65).toFixed(0)}m`, bx, by - 12 * d, 15 * d, '#f6e6c0', 'center', 700);
    text(`예상 적: ${list}`, bx, by + 12 * d, 14 * d, '#c9cfc4', 'center');
    text(M.choices.length > 1 ? '← → 선택 · Enter 진입' : 'Enter 진입', bx, H - 30 * d, 13 * d, '#a9b8b6', 'center');
    if (G.run.rooms > 0) text(`HP ${Math.ceil(G.hp)}/${PLAYER.hp} (방을 끝낼 때마다 +${COMBAT.roomHeal})`, 16 * d, 22 * d, 13 * d, '#9fdc9f');
  }

  function draw() {
    if (!view) measure();
    document.body.classList.toggle('map', G.mode === 'map');     // the map draws its own key help
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!G.sprites || G.mode === 'loading') { ctx.fillStyle = '#182026'; ctx.fillRect(0, 0, view.W, view.H); return; }
    if (G.mode === 'map') return drawMap();
    drawRoom();
    drawSkillFloor();
    drawTelegraphs();
    // shadows, then sprites back (far) to front (near)
    const items = [...G.enemies.map(e => ({ z: e.z, e })), ...(G.boss ? [{ z: G.boss.z, e: G.boss }] : []), { z: P.z, lian: true }];
    for (const it of items) {
      if (it.lian) shadow(P.x, P.z, 0.17);
      else if (!it.e.dying || it.e.dying === 'death') shadow(it.e.x, it.e.z, (it.e.type === 'boss' ? 0.4 : 0.42) * it.e.cfg.scale, 0.25);
    }
    items.sort((a, b) => b.z - a.z || (a.e?.dying ? -1 : 0));
    for (const it of items) it.lian ? drawLian() : drawEnemy(it.e);
    drawBullets();
    drawSkillFx();
    fx.draw(ctx, view.fx);
    hpBars();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (G.witch > 0) { ctx.fillStyle = `rgba(80,160,220,${0.14 * Math.min(1, G.witch / 0.3)})`; ctx.fillRect(0, 0, view.W, view.H); }
    if (P.skill?.id === 'rifleD' && P.skill.phase === 'mark') {         // 일제사격 marking: darker screen edges
      const W = view.W, H = view.H, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.68);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if ((G.vignette ?? 0) > 0) {
      const W = view.W, H = view.H, g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(200,20,20,0)'); g.addColorStop(1, `rgba(200,20,20,${0.45 * G.vignette / 0.25})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    hud();
  }
  return { measure, draw };
}
