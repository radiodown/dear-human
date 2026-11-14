// Stage effects for the movement prototype (STAGE_DESIGN.md section 6): code-drawn canvas effects, v1.
// Each effect is one spawn function + one draw function so the content team can later swap a draw function
// for a sprite without touching the stage logic. Positions are world units (x along the ground, y up from the
// feet line); `view` converts them to canvas pixels: { ppu, groundY, sx(x), dpr, W, H }.
// Randomness comes from a seeded generator so the stage stays reproducible when it is stepped in tests.

export const FX_CONFIG = {
  maxItems: 200,                       // all effect items together; the oldest are dropped first
  rifleFlash: { length: 0.22, width: 0.10, life: 0.05, spin: 8 },
  pistolFlash: { length: 0.14, width: 0.07, life: 0.05, spin: 8 },
  muzzleLight: { radius: 0.45, alpha: 0.35, life: 0.07 },
  impact: { ring: 0.08, ringLife: 0.06, count: 5, color: '#7bd34a', speed: [1, 2], size: 0.02, life: 0.25, spread: 70 },
  explosion: { ring: 0.9, ringLife: 0.2, count: 12, color: '#7bd34a', speed: [1, 3], size: 0.03, life: 0.5 },
  dust: { count: 4, color: '#9a9585', speed: [0.4, 1.0], size: 0.035, life: 0.35 },
  casing: { w: 0.02, h: 0.01, life: 0.5, gravity: 9, color: '#d8b25a' },
  number: { life: 0.6, rise: 0.4 },
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFx(seed = 7) {
  const items = [];
  let rand = mulberry32(seed);
  const range = ([a, b]) => a + (b - a) * rand();
  const push = item => { items.push(item); while (items.length > FX_CONFIG.maxItems) items.shift(); return item; };
  const particle = (x, y, angle, speed, cfg, extra) => push({ type: 'particle', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    t: 0, life: cfg.life, size: cfg.size, color: cfg.color, gravity: 0, ...extra });

  return {
    items,
    reset(newSeed = seed) { items.length = 0; rand = mulberry32(newSeed); },
    // 1·2·3: muzzle flash (3-point star + cone) and a short radial light
    muzzle(x, y, dir, kind) {
      const cfg = kind === 'rifle' ? FX_CONFIG.rifleFlash : FX_CONFIG.pistolFlash;
      push({ type: 'flash', x, y, dir, t: 0, life: cfg.life, length: cfg.length, width: cfg.width, rot: (rand() * 2 - 1) * cfg.spin * Math.PI / 180 });
      push({ type: 'light', x, y, t: 0, life: FX_CONFIG.muzzleLight.life, radius: FX_CONFIG.muzzleLight.radius });
    },
    // 4 (P2): rifle casing kicked up and back
    casing(x, y, dir) {
      const c = FX_CONFIG.casing;
      push({ type: 'casing', x, y, vx: -dir * range([0.4, 0.9]), vy: range([1.2, 1.8]), t: 0, life: c.life, spin: rand() * 6 });
    },
    // 6: hit spark ring + green fluid fanning back against the bullet direction
    impact(x, y, dir) {
      const c = FX_CONFIG.impact;
      push({ type: 'ring', x, y, t: 0, life: c.ringLife, radius: c.ring, color: '#ffffff', width: 0.012 });
      for (let i = 0; i < c.count; i++) {
        const angle = (dir > 0 ? Math.PI : 0) + (rand() * 2 - 1) * c.spread * Math.PI / 180;
        particle(x, y, angle, range(c.speed), c, { gravity: 2 });
      }
    },
    // 8: explosion ring + 12 green particles
    explosion(x, y) {
      const c = FX_CONFIG.explosion;
      push({ type: 'ring', x, y, t: 0, life: c.ringLife, radius: c.ring, color: '#b7f27a', width: 0.03, grow: true });
      for (let i = 0; i < c.count; i++) particle(x, y, rand() * Math.PI * 2, range(c.speed), c, { gravity: 3 });
    },
    // 10: Q dash dust at the feet
    dust(x, dir) {
      const c = FX_CONFIG.dust;
      for (let i = 0; i < c.count; i++) particle(x, 0.02, (dir > 0 ? Math.PI : 0) + (rand() * 0.9 - 0.15) * (dir > 0 ? -1 : 1), range(c.speed), c, { grow: true });
    },
    // P1: damage number rising 0.4 units over 0.6 s
    number(x, y, value, color = '#ffffff') {
      push({ type: 'number', x: x + (rand() - 0.5) * 0.24, y: y + rand() * 0.08, t: 0, life: FX_CONFIG.number.life, value: Math.round(value), color });
    },
    update(dt) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.t += dt;
        if (it.t >= it.life) { items.splice(i, 1); continue; }
        if (it.type === 'particle') { it.vy -= it.gravity * dt; it.x += it.vx * dt; it.y = Math.max(0, it.y + it.vy * dt); }
        else if (it.type === 'casing') { it.vy -= FX_CONFIG.casing.gravity * dt; it.x += it.vx * dt; it.y += it.vy * dt; if (it.y < 0) { it.y = 0; it.vy *= -0.3; it.vx *= 0.5; } }
      }
    },
    draw(ctx, view) {
      for (const it of items) DRAW[it.type]?.(ctx, view, it);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    },
  };
}

const px = (view, x, y) => [view.sx(x), view.groundY - y * view.ppu];

const DRAW = {
  flash(ctx, view, it) {
    const [x, y] = px(view, it.x, it.y), k = 1 - it.t / it.life, L = it.length * view.ppu, Wd = it.width * view.ppu;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y); ctx.scale(it.dir, 1); ctx.rotate(-it.rot);
    const g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, `rgba(255,255,240,${k})`); g.addColorStop(0.35, `rgba(255,200,90,${0.9 * k})`); g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -Wd * 0.5); ctx.lineTo(L, 0); ctx.lineTo(0, Wd * 0.5); ctx.closePath(); ctx.fill();   // cone
    for (const a of [-0.9, 0.9, Math.PI]) {                                                                            // 3-point star
      ctx.save(); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, -Wd * 0.18); ctx.lineTo(L * 0.42, 0); ctx.lineTo(0, Wd * 0.18); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = `rgba(255,255,255,${k})`;
    ctx.beginPath(); ctx.arc(0, 0, Wd * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
  light(ctx, view, it) {
    const [x, y] = px(view, it.x, it.y), r = it.radius * view.ppu, a = FX_CONFIG.muzzleLight.alpha * (1 - it.t / it.life);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,190,110,${a})`); g.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  },
  ring(ctx, view, it) {
    const [x, y] = px(view, it.x, it.y), k = it.t / it.life;
    const r = (it.grow ? 0.15 + 0.85 * k : 0.4 + 0.6 * k) * it.radius * view.ppu;
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.strokeStyle = it.color; ctx.lineWidth = Math.max(1, it.width * view.ppu);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  },
  particle(ctx, view, it) {
    const [x, y] = px(view, it.x, it.y), k = it.t / it.life, s = it.size * view.ppu * (it.grow ? 1 + k * 1.5 : 1);
    ctx.globalAlpha = (1 - k) * (it.grow ? 0.5 : 1); ctx.fillStyle = it.color;
    ctx.fillRect(x - s / 2, y - s / 2, s, s); ctx.globalAlpha = 1;
  },
  casing(ctx, view, it) {
    const [x, y] = px(view, it.x, it.y), c = FX_CONFIG.casing;
    ctx.save(); ctx.translate(x, y); ctx.rotate(it.spin * it.t); ctx.globalAlpha = 1 - it.t / it.life;
    ctx.fillStyle = c.color; ctx.fillRect(-c.w * view.ppu / 2, -c.h * view.ppu / 2, c.w * view.ppu, Math.max(1, c.h * view.ppu)); ctx.restore();
  },
  number(ctx, view, it) {
    const k = it.t / it.life, [x, y] = px(view, it.x, it.y + FX_CONFIG.number.rise * k);
    ctx.save(); ctx.globalAlpha = 1 - k * k;
    ctx.font = `700 ${Math.round(14 * view.dpr)}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3 * view.dpr; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(it.value, x, y);
    ctx.fillStyle = it.color; ctx.fillText(it.value, x, y); ctx.restore();
  },
};

// 5 / 7 / 10: bullets (drawn from the stage's bullet list; fading = 0.05 s at the range end)
export function drawBullet(ctx, view, b) {
  const y = view.groundY - b.y * view.ppu;
  const alpha = b.fade >= 0 ? b.fade / 0.05 : 1;
  const behind = Math.max(0, Math.min(b.length, (b.x - b.startX) * b.dir));   // never draw behind the muzzle
  const head = view.sx(b.x), tail = view.sx(b.x - b.dir * behind);
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
  if (b.kind === 'pierce') {
    const trail = Math.max(0, Math.min(b.speed * 0.15, (b.x - b.startX) * b.dir));   // 0.15 s tail
    const end = view.sx(b.x - b.dir * trail);
    const g = ctx.createLinearGradient(head, y, end, y);
    g.addColorStop(0, 'rgba(170,220,255,.55)'); g.addColorStop(1, 'rgba(170,220,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(2, b.width * 2.2 * view.ppu);
    ctx.beginPath(); ctx.moveTo(head, y); ctx.lineTo(end, y); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
  }
  ctx.strokeStyle = b.color; ctx.lineWidth = Math.max(1, b.width * view.ppu);
  ctx.beginPath(); ctx.moveTo(tail, y); ctx.lineTo(head, y); ctx.stroke();
  ctx.fillStyle = '#ffffff';
  const r = Math.max(1.2, b.width * view.ppu * 0.9);
  ctx.beginPath(); ctx.arc(head, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
