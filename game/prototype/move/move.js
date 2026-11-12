// Movement prototype 001: arrow keys move a sprite character left / right on a flat ground.
// Uses the right-side sprite sheets already rendered from each character's GLB (glb_model_001/sprite_00N,
// 200 px per character unit, 12 fps, in place); the page only draws them, nothing is rendered here.
// World units: 1.0 = the character's height (~1.65 m), the same unit the sprites were rendered in.

const CHARACTERS = {
  clone_01: { name: '리안', base: '/art/characters/clone_01/motion/glb_model_001/sprite_003/' },
  iren: { name: '아렌', base: '/art/characters/iren/motion/glb_model_001/sprite_001/' },
  moa: { name: '모아', base: '/art/characters/moa/motion/glb_model_001/sprite_001/' },
  yuna: { name: '유나', base: '/art/characters/yuna/motion/glb_model_001/sprite_001/' },
  sena: { name: '세나', base: '/art/characters/sena/motion/glb_model_001/sprite_001/' },
};
// Ground speeds measured from the source clips (Lian's version04.glb): the planted foot slides backward at
// 0.69 (walk) and 2.25 (run) units/s in the in-place clips, so moving at that speed keeps the feet still.
const WALK_SPEED = 0.69, RUN_SPEED = 2.25;
const ACCEL = 6, DECEL = 9;          // units/s²
const RUN_SWITCH = 1.3;              // above this speed the run cycle is shown
const LEVEL = { left: -12, right: 12 };
const UNITS_ON_SCREEN = 3.2;         // vertical units visible: the character is ~1/3 of the screen tall
const SPRITE_PPM = 200;              // sprite pixels per character unit (manifest_200)

const canvas = document.getElementById('stage'), ctx = canvas.getContext('2d');
const status = document.getElementById('status'), picker = document.getElementById('character');
const keys = new Set();
let sprites = null, loadId = 0;
const player = { x: 0, vx: 0, facing: 1, anim: 'idle', phase: 0, idleTime: 0 };
const camera = { x: 0 };

async function loadClip(base, clip) {
  const manifest = await (await fetch(`${base}${clip}/manifest_200.json`)).json();
  const image = new Image(); image.src = `${base}${clip}/spritesheet_200.webp`;
  await image.decode();
  return { manifest, image };
}

async function loadCharacter(id) {
  const ticket = ++loadId, c = CHARACTERS[id] ?? CHARACTERS.clone_01;
  status.textContent = `${c.name} 스프라이트 불러오는 중…`;
  const [idle, walk, run] = await Promise.all(['idle', 'walk', 'run'].map(clip => loadClip(c.base, clip)));
  if (ticket !== loadId) return;
  sprites = { idle, walk, run, name: c.name };
  const url = new URL(location.href); url.searchParams.set('c', id); history.replaceState(null, '', url);
}

// ---- input
const onKey = down => event => {
  if (['ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
    if (down) keys.add(event.code); else keys.delete(event.code);
    event.preventDefault();
  }
};
addEventListener('keydown', onKey(true));
addEventListener('keyup', onKey(false));
addEventListener('blur', () => keys.clear());
picker.addEventListener('change', () => { loadCharacter(picker.value); picker.blur(); });

// ---- simulation
function update(dt) {
  const dir = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const target = dir * (running ? RUN_SPEED : WALK_SPEED);
  const rate = Math.abs(target) > Math.abs(player.vx) && Math.sign(target || player.vx) === Math.sign(player.vx || target) ? ACCEL : DECEL;
  const dv = target - player.vx;
  player.vx += Math.sign(dv) * Math.min(Math.abs(dv), rate * dt);
  if (dir) player.facing = dir;
  player.x += player.vx * dt;
  if (player.x < LEVEL.left || player.x > LEVEL.right) { player.x = Math.min(LEVEL.right, Math.max(LEVEL.left, player.x)); player.vx = 0; }

  const speed = Math.abs(player.vx);
  const anim = speed < 0.04 ? 'idle' : speed > RUN_SWITCH ? 'run' : 'walk';
  if (anim !== player.anim) { player.anim = anim; player.phase = 0; }
  if (sprites && anim !== 'idle') {
    // advance the cycle by distance covered, so steps stay planted while speeding up / slowing down
    const m = sprites[anim].manifest, cycleTime = m.frameCount / m.fps;
    const stride = (anim === 'run' ? RUN_SPEED : WALK_SPEED) * cycleTime;      // units travelled per cycle
    player.phase = (player.phase + speed * dt / stride) % 1;
  } else {
    player.idleTime += dt;
  }
  camera.x += (player.x - camera.x) * Math.min(1, dt * 4);
}

// ---- drawing
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
}
addEventListener('resize', resize); resize();

function draw() {
  const W = canvas.width, H = canvas.height, ppu = H / UNITS_ON_SCREEN;        // screen px per unit
  const groundY = H * 0.78;
  const sx = x => W / 2 + (x - camera.x) * ppu;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // sky and far layers (parallax so the movement reads)
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#2b3a44'); sky.addColorStop(1, '#4d5d63'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
  for (const [depth, color, h] of [[0.25, '#3b4a50', 0.9], [0.5, '#33413f', 0.55]]) {
    ctx.fillStyle = color;
    for (let i = -20; i <= 20; i++) {
      const x = W / 2 + (i * 2.6 - camera.x * depth) * ppu;
      if (x < -3 * ppu || x > W + 3 * ppu) continue;
      const bh = (h + ((i * 37) % 5 + 5) % 5 * 0.12) * ppu;
      ctx.fillRect(x, groundY - bh, 1.6 * ppu, bh);
    }
  }
  // ground with one tick per unit and level ends
  ctx.fillStyle = '#2a2f2b'; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = '#5c6458'; ctx.fillRect(0, groundY, W, Math.max(2, ppu * 0.012));
  ctx.fillStyle = '#454c44';
  for (let u = Math.floor(camera.x - W / ppu); u <= camera.x + W / ppu; u++) ctx.fillRect(sx(u), groundY, Math.max(1, ppu * 0.008), ppu * (u % 5 === 0 ? 0.08 : 0.04));
  ctx.fillStyle = '#7a3b32';
  for (const edge of [LEVEL.left - 0.4, LEVEL.right + 0.4]) ctx.fillRect(sx(edge) - ppu * 0.03, groundY - ppu * 0.6, ppu * 0.06, ppu * 0.6);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(sx(player.x), groundY, ppu * 0.16, ppu * 0.035, 0, 0, Math.PI * 2); ctx.fill();

  if (sprites) {
    const { manifest: m, image } = sprites[player.anim];
    const frame = player.anim === 'idle' ? Math.floor(player.idleTime * m.fps) % m.frameCount
                                         : Math.min(m.frameCount - 1, Math.floor(player.phase * m.frameCount));
    const cols = m.columns, cw = m.crop.width, ch = m.crop.height, s = ppu / SPRITE_PPM;
    const fx = (frame % cols) * cw, fy = Math.floor(frame / cols) * ch;
    // the frame sits at manifest.crop inside the render canvas; originX / groundY mark the feet in that canvas
    ctx.setTransform(player.facing * s, 0, 0, s, sx(player.x), groundY);
    ctx.drawImage(image, fx, fy, cw, ch, m.crop.x - m.originX, m.crop.y - m.groundY, cw, ch);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const label = { idle: '대기', walk: '걷기', run: '달리기' }[player.anim];
    status.textContent = `${sprites.name} · ${label} · ${(Math.abs(player.vx) * 1.65).toFixed(2)} m/s · x ${(player.x * 1.65).toFixed(1)} m`;
  }
}

let last = null;
function tick(now) {
  const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw();
  requestAnimationFrame(tick);
}

const start = new URL(location.href).searchParams.get('c');
picker.value = CHARACTERS[start] ? start : 'clone_01';
loadCharacter(picker.value).catch(err => { status.textContent = `불러오기 실패: ${err.message}`; });
requestAnimationFrame(tick);
