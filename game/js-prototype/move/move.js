// Movement prototype: arrow keys move a sprite character left / right on a flat ground; Lian also draws, holsters
// and fires her weapons. The page only draws sprite sheets that were rendered offline from the GLBs
// (right side, 200 px per character unit, in place); nothing is rendered or generated here.
// World units: 1.0 = the character's height (~1.65 m), the same unit the sprites were rendered in.
//
// Lian (sprite_004, 30 fps, from source/version04.glb + loadout_023):
//   1 = rifle (AR-12), 2 = dual pistols (HP-14T): draw it, or put the other weapon away first and then draw it
//   X = draw the last carried weapon (default 1 = rifle) / put the drawn weapon away
//   A = single shot (rifle: 조준 사격 once; pistols: one right + one left shot, the first 0.5 s of 쌍권총 사격)
//   S = full auto while held (rifle: 750 RPM loop; pistols: alternating fire loop)
//   Drawing, holstering and firing are done standing: the character slows to a stop while they play.
//   With the rifle there is no run clip, so Shift does nothing and the walk uses 이동 사격 (shoot_rifle).
// The other characters keep the earlier unarmed 12 fps sets (sprite_001).

const LIAN = '/art/characters/clone_01/motion/glb_model_001/sprite_004/';
const UNARMED = ['idle', 'walk', 'run'];
const LIAN_CLIPS = [...UNARMED, 'rifle_idle', 'shoot_rifle', 'rifle_pull_out', 'rifle_put_away', 'gunplay', 'rifle_full_auto',
  'dual_idle', 'dual_walk', 'dual_run', 'dual_fire', 'dual_pull_out', 'dual_put_away'];
const CHARACTERS = {
  clone_01: { name: '리안', base: LIAN, clips: LIAN_CLIPS, armed: true },
  iren: { name: '아렌', base: '/art/characters/iren/motion/glb_model_001/sprite_001/', clips: UNARMED },
  moa: { name: '모아', base: '/art/characters/moa/motion/glb_model_001/sprite_001/', clips: UNARMED },
  yuna: { name: '유나', base: '/art/characters/yuna/motion/glb_model_001/sprite_001/', clips: UNARMED },
  sena: { name: '세나', base: '/art/characters/sena/motion/glb_model_001/sprite_001/', clips: UNARMED },
};
// per weapon: which clip plays standing, walking, running (null = cannot run), drawing, holstering, firing
const SETS = {
  none: { idle: 'idle', walk: 'walk', run: 'run' },
  rifle: { idle: 'rifle_idle', walk: 'shoot_rifle', run: null, draw: 'rifle_pull_out', holster: 'rifle_put_away',
           single: { clip: 'gunplay' }, auto: 'rifle_full_auto', label: 'AR-12' },
  dual: { idle: 'dual_idle', walk: 'dual_walk', run: 'dual_run', draw: 'dual_pull_out', holster: 'dual_put_away',
          single: { clip: 'dual_fire', duration: 0.5 }, auto: 'dual_fire', label: '쌍권총' },
};
const LABELS = { idle: '대기', walk: '걷기', run: '달리기', rifle_idle: '소총 대기', shoot_rifle: '소총 걷기', rifle_pull_out: '소총 꺼내기',
  rifle_put_away: '소총 넣기', gunplay: '단발', rifle_full_auto: '풀오토', dual_idle: '쌍권총 대기', dual_walk: '쌍권총 걷기',
  dual_run: '쌍권총 달리기', dual_fire: '쌍권총 사격', dual_pull_out: '쌍권총 꺼내기', dual_put_away: '쌍권총 넣기' };
// Ground speeds measured from the bare clips (Lian's version04.glb): the planted foot slides backward at
// 0.69 (walk) and 2.25 (run) units/s in the in-place clips, so moving at that speed keeps the feet still.
// The bare walk / run advance their frames by distance; the armed walks / run play by time scaled with speed.
const WALK_SPEED = 0.69, RUN_SPEED = 2.25;
const ACCEL = 6, DECEL = 9;          // units/s²
const RUN_SWITCH = 1.3;              // above this speed the run cycle is shown
const LEVEL = { left: -12, right: 12 };
const UNITS_ON_SCREEN = 3.2;         // vertical units visible: the character is ~1/3 of the screen tall
const SPRITE_PPM = 200;              // sprite pixels per character unit (manifest_200)

const canvas = document.getElementById('stage'), ctx = canvas.getContext('2d');
const status = document.getElementById('status'), picker = document.getElementById('character');
const help = document.getElementById('help');
const keys = new Set();
let sprites = null, loadId = 0;
const player = { x: 0, vx: 0, facing: 1, anim: 'idle', phase: 0, clock: 0, weapon: 'none', last: 'rifle', action: null };
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
  const loaded = await Promise.all(c.clips.map(clip => loadClip(c.base, clip)));
  if (ticket !== loadId) return;
  sprites = { name: c.name, armed: !!c.armed, clips: Object.fromEntries(c.clips.map((clip, i) => [clip, loaded[i]])) };
  Object.assign(player, { weapon: 'none', last: 'rifle', action: null, anim: 'idle', phase: 0, clock: 0 });
  help.textContent = c.armed ? '1 소총 · 2 쌍권총 · X 꺼내기/넣기 · A 단발 · S 풀오토(누르는 동안)' : '무기 동작은 리안만 있습니다';
  const url = new URL(location.href); url.searchParams.set('c', id); history.replaceState(null, '', url);
}

// ---- weapon actions (one-shot clips that play to their end, then call done)
const duration = (clip, limit) => {
  const m = sprites.clips[clip].manifest;
  return Math.min(limit ?? Infinity, m.frameCount / m.fps);
};
function play(clip, done, limit) { player.action = { clip, t: 0, end: duration(clip, limit), done }; }
function draw(weapon) { play(SETS[weapon].draw, () => { player.weapon = weapon; player.last = weapon; }); }
function holster(then) { play(SETS[player.weapon].holster, () => { player.weapon = 'none'; then?.(); }); }
function equip(weapon) {
  if (player.weapon === weapon) return;
  if (player.weapon === 'none') draw(weapon);
  else holster(() => draw(weapon));          // switching: put the current weapon away, then draw the other
}
function toggle() { if (player.weapon === 'none') draw(player.last); else holster(); }
function single() {
  const shot = SETS[player.weapon].single;
  if (shot) play(shot.clip, null, shot.duration);
}

// ---- input
const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyS'];
addEventListener('keydown', event => {
  if (MOVE_KEYS.includes(event.code)) { keys.add(event.code); event.preventDefault(); }
  if (!sprites?.armed || event.repeat || player.action) return;
  const busyFiring = keys.has('KeyS') && player.weapon !== 'none';
  if (event.code === 'Digit1' || event.code === 'Numpad1') equip('rifle');
  else if (event.code === 'Digit2' || event.code === 'Numpad2') equip('dual');
  else if (event.code === 'KeyX') toggle();
  else if (event.code === 'KeyA' && player.weapon !== 'none' && !busyFiring) single();
  else return;
  event.preventDefault();
});
addEventListener('keyup', event => { if (MOVE_KEYS.includes(event.code)) { keys.delete(event.code); event.preventDefault(); } });
addEventListener('blur', () => keys.clear());
picker.addEventListener('change', () => { loadCharacter(picker.value); picker.blur(); });

// ---- simulation
function update(dt) {
  const set = SETS[player.weapon];
  const autoFire = !!sprites?.armed && keys.has('KeyS') && player.weapon !== 'none' && !player.action;
  const standing = !!player.action || autoFire;   // weapon actions and firing are done standing
  const dir = standing ? 0 : (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  const running = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && set.run !== null;
  const target = dir * (running ? RUN_SPEED : WALK_SPEED);
  const rate = Math.abs(target) > Math.abs(player.vx) && Math.sign(target || player.vx) === Math.sign(player.vx || target) ? ACCEL : DECEL;
  const dv = target - player.vx;
  player.vx += Math.sign(dv) * Math.min(Math.abs(dv), rate * dt);
  if (dir) player.facing = dir;
  player.x += player.vx * dt;
  if (player.x < LEVEL.left || player.x > LEVEL.right) { player.x = Math.min(LEVEL.right, Math.max(LEVEL.left, player.x)); player.vx = 0; }

  const speed = Math.abs(player.vx);
  let anim;
  if (player.action) {
    const a = player.action; a.t += dt; anim = a.clip;
    if (a.t >= a.end) { player.action = null; a.done?.(); anim = player.action ? player.action.clip : SETS[player.weapon].idle; }
  } else if (autoFire) anim = set.auto;
  else anim = speed < 0.04 ? set.idle : speed > RUN_SWITCH && set.run ? set.run : set.walk;
  if (anim !== player.anim) { player.anim = anim; player.phase = 0; player.clock = 0; }
  if (!sprites) return;
  const m = sprites.clips[anim]?.manifest;
  if ((anim === 'walk' || anim === 'run') && m) {
    // bare cycles advance by distance covered, so steps stay planted while speeding up / slowing down
    const stride = (anim === 'run' ? RUN_SPEED : WALK_SPEED) * m.frameCount / m.fps;   // units travelled per cycle
    player.phase = (player.phase + speed * dt / stride) % 1;
  } else if (anim === set.walk || anim === set.run) {
    player.clock += dt * Math.max(0.3, speed / (anim === set.run ? RUN_SPEED : WALK_SPEED));
  } else player.clock += dt;
  camera.x += (player.x - camera.x) * Math.min(1, dt * 4);
}

function frameOf(anim, m) {
  if (player.action?.clip === anim) return Math.min(m.frameCount - 1, Math.floor(player.action.t * m.fps));
  if (anim === 'walk' || anim === 'run') return Math.min(m.frameCount - 1, Math.floor(player.phase * m.frameCount));
  return Math.floor(player.clock * m.fps) % m.frameCount;
}

// ---- drawing
function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr);
}
addEventListener('resize', resize); resize();

function drawScene() {
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

  const clip = sprites?.clips[player.anim];
  if (clip) {
    const { manifest: m, image } = clip;
    const frame = frameOf(player.anim, m);
    const cols = m.columns, cw = m.crop.width, ch = m.crop.height, s = ppu / SPRITE_PPM;
    const fx = (frame % cols) * cw, fy = Math.floor(frame / cols) * ch;
    // the frame sits at manifest.crop inside the render canvas; originX / groundY mark the feet in that canvas
    ctx.setTransform(player.facing * s, 0, 0, s, sx(player.x), groundY);
    ctx.drawImage(image, fx, fy, cw, ch, m.crop.x - m.originX, m.crop.y - m.groundY, cw, ch);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const weapon = player.weapon === 'none' ? '맨손' : SETS[player.weapon].label;
    status.textContent = `${sprites.name} · ${weapon} · ${LABELS[player.anim] ?? player.anim} · ${m.fps} fps · ${(Math.abs(player.vx) * 1.65).toFixed(2)} m/s · x ${(player.x * 1.65).toFixed(1)} m`;
  }
}

let last = null;
function tick(now) {
  const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); drawScene();
  requestAnimationFrame(tick);
}

const start = new URL(location.href).searchParams.get('c');
picker.value = CHARACTERS[start] ? start : 'clone_01';
loadCharacter(picker.value).catch(err => { status.textContent = `불러오기 실패: ${err.message}`; });
requestAnimationFrame(tick);
