// Movement prototype: arrow keys move a sprite character left / right on a flat ground; Lian also draws, holsters
// and fires her weapons. The page only draws sprite sheets that were rendered offline from the GLBs
// (right side, 200 px per character unit, in place); nothing is rendered or generated here.
// World units: 1.0 = the character's height (~1.65 m), the same unit the sprites were rendered in.
//
// Lian (30 fps: sprite_004 from source/version04.glb + loadout_023, sprite_005 from loadout_027 for the stance
// transitions and the reworked dual draw / holster):
//   1 = rifle (AR-12), 2 = dual pistols (HP-14T): draw it, or put the other weapon away first and then draw it
//   X = draw the last carried weapon (default 1 = rifle) / put the drawn weapon away
//   A = single shot (rifle: 조준 사격 once; pistols: one right + one left shot, the first 0.5 s of 쌍권총 사격)
//   S = full auto while held (rifle: 750 RPM loop; pistols: alternating fire loop)
//   Stance rule with a weapon out (user rule 2026-11-13): drawn -> 기본 대기 (rifle_idle / 쌍권총 대기 dual_idle_high);
//   A or S first raises the weapon (내림→조준 / 쌍권총 대기→조준) and then fires; after firing the character stays in
//   사격 대기 (rifle_aim_idle / 쌍권총 조준 대기 dual_idle); standing still for AIM_HOLD (5 s) there lowers it again
//   (조준→내림 / 쌍권총 조준→대기).
//   Moving keeps the stance (2026-11-13, sprite_006): 기본 대기 walks low (소총 걷기 rifle_walk / 쌍권총 기본 걷기
//   dual_walk_basic), 사격 대기 walks aimed (이동 사격 shoot_rifle / 쌍권총 조준 걷기 dual_walk); running (Shift) uses
//   소총 달리기 rifle_run / 쌍권총 달리기 dual_run, both lowered, so running drops the stance to 기본 대기.
//   Holstering or switching from 사격 대기 lowers first.
//   Drawing, holstering, raising, lowering and firing are done standing: the character slows to a stop meanwhile.
// The other characters keep the earlier unarmed 12 fps sets (sprite_001).
//
// Stage (STAGE_DESIGN.md, stage.js / stage-fx.js): with Lian a combat stage runs on top of this flow (waves of
// enemies, bullets, HP, R reload, Q step, W piercing shot, E overdrive, Enter restart). ?stage=off turns it off.
// move.js only calls the stage hooks; the one change to the flow itself is that arrow keys turn the character
// in place while standing for a weapon action or full auto.

import { createStage } from './stage.js';

const LIAN4 = '/art/characters/clone_01/motion/glb_model_001/sprite_004/';
const LIAN5 = '/art/characters/clone_01/motion/glb_model_001/sprite_005/';
const IN_SPRITE5 = new Set(['rifle_down_to_aim', 'rifle_aim_to_down', 'dual_ready_to_aim', 'dual_aim_to_ready', 'dual_pull_out', 'dual_put_away']);
const LIAN6 = '/art/characters/clone_01/motion/glb_model_001/sprite_006/';
const IN_SPRITE6 = new Set(['rifle_walk', 'rifle_run', 'dual_walk_basic']);
// sprite_007 (loadout_030): 쌍권총 대기 with the face level and forward, and its four connecting clips
const LIAN7 = '/art/characters/clone_01/motion/glb_model_001/sprite_007/';
const IN_SPRITE7 = new Set(['dual_idle_high', 'dual_pull_out', 'dual_put_away', 'dual_ready_to_aim', 'dual_aim_to_ready']);
const UNARMED = ['idle', 'walk', 'run'];
const LIAN_CLIPS = [...UNARMED, 'rifle_idle', 'rifle_aim_idle', 'shoot_rifle', 'rifle_pull_out', 'rifle_put_away', 'gunplay', 'rifle_full_auto',
  'rifle_down_to_aim', 'rifle_aim_to_down', 'dual_idle_high', 'dual_idle', 'dual_walk', 'dual_run', 'dual_fire', 'dual_pull_out', 'dual_put_away',
  'dual_ready_to_aim', 'dual_aim_to_ready', 'rifle_walk', 'rifle_run', 'dual_walk_basic', 'rifle_reload', 'rifle_reload_empty'];
const AIM_HOLD = 5;                  // s standing still in 사격 대기 before the weapon is lowered to 기본 대기
const CHARACTERS = {
  clone_01: { name: '리안', base: clip => IN_SPRITE7.has(clip) ? LIAN7 : IN_SPRITE6.has(clip) ? LIAN6 : IN_SPRITE5.has(clip) ? LIAN5 : LIAN4, clips: LIAN_CLIPS, armed: true },
  iren: { name: '아렌', base: '/art/characters/iren/motion/glb_model_001/sprite_001/', clips: UNARMED },
  moa: { name: '모아', base: '/art/characters/moa/motion/glb_model_001/sprite_001/', clips: UNARMED },
  yuna: { name: '유나', base: '/art/characters/yuna/motion/glb_model_001/sprite_001/', clips: UNARMED },
  sena: { name: '세나', base: '/art/characters/sena/motion/glb_model_001/sprite_001/', clips: UNARMED },
};
// per weapon: 기본 대기 (idle) / 사격 대기 (aimIdle), walking in 기본 대기 (walk) / 사격 대기 (aimWalk), running, drawing, holstering,
// raising to / lowering from the aim, firing
const SETS = {
  none: { idle: 'idle', walk: 'walk', run: 'run' },
  rifle: { idle: 'rifle_idle', aimIdle: 'rifle_aim_idle', walk: 'rifle_walk', aimWalk: 'shoot_rifle', run: 'rifle_run', draw: 'rifle_pull_out', holster: 'rifle_put_away',
           raise: 'rifle_down_to_aim', lower: 'rifle_aim_to_down', single: { clip: 'gunplay' }, auto: 'rifle_full_auto', label: 'AR-12' },
  dual: { idle: 'dual_idle_high', aimIdle: 'dual_idle', walk: 'dual_walk_basic', aimWalk: 'dual_walk', run: 'dual_run', draw: 'dual_pull_out', holster: 'dual_put_away',
          raise: 'dual_ready_to_aim', lower: 'dual_aim_to_ready', single: { clip: 'dual_fire', duration: 0.5 }, auto: 'dual_fire', label: '쌍권총' },
};
const LABELS = { idle: '대기', walk: '걷기', run: '달리기', rifle_idle: '소총 대기', rifle_aim_idle: '소총 조준 대기', shoot_rifle: '소총 조준 걷기', rifle_walk: '소총 걷기', rifle_run: '소총 달리기',
  rifle_pull_out: '소총 꺼내기', rifle_put_away: '소총 넣기', gunplay: '단발', rifle_full_auto: '풀오토', rifle_down_to_aim: '내림 → 조준',
  rifle_aim_to_down: '조준 → 내림', dual_idle_high: '쌍권총 대기', dual_idle: '쌍권총 조준 대기', dual_walk: '쌍권총 조준 걷기', dual_walk_basic: '쌍권총 기본 걷기',
  dual_run: '쌍권총 달리기', dual_fire: '쌍권총 사격', dual_pull_out: '쌍권총 꺼내기', dual_put_away: '쌍권총 넣기',
  dual_ready_to_aim: '쌍권총 대기 → 조준', dual_aim_to_ready: '쌍권총 조준 → 대기', rifle_reload: '장전', rifle_reload_empty: '장전 · 탄 소진' };
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
const player = { x: 0, vx: 0, facing: 1, anim: 'idle', phase: 0, clock: 0, weapon: 'none', last: 'rifle', action: null,
                 stance: 'ready', still: 0,   // stance: 'ready' = 기본 대기, 'aim' = 사격 대기
                 autoFire: false, dash: null, frozen: false };   // for the stage: full auto this frame, Q step, down
const camera = { x: 0 };
const STAGE_ON = new URL(location.href).searchParams.get('stage') !== 'off';
const stage = createStage({ enabled: STAGE_ON, player, keys, camera, sets: SETS, play: (...a) => play(...a), aimThen: (...a) => aimThen(...a),
  onKeyDown: e => onKeyDown(e), update: dt => update(dt), frameInfo: () => frameInfo() });

async function loadClip(base, clip) {
  const manifest = await (await fetch(`${base}${clip}/manifest_200.json`)).json();
  const image = new Image(); image.src = `${base}${clip}/spritesheet_200.webp`;
  await image.decode();
  return { manifest, image };
}

async function loadCharacter(id) {
  const ticket = ++loadId, c = CHARACTERS[id] ?? CHARACTERS.clone_01;
  stage.stop();
  status.textContent = `${c.name} 스프라이트 불러오는 중…`;
  const baseOf = clip => typeof c.base === 'function' ? c.base(clip) : c.base;
  const loaded = await Promise.all(c.clips.map(clip => loadClip(baseOf(clip), clip)));
  if (ticket !== loadId) return;
  sprites = { name: c.name, armed: !!c.armed, clips: Object.fromEntries(c.clips.map((clip, i) => [clip, loaded[i]])) };
  Object.assign(player, { weapon: 'none', last: 'rifle', action: null, anim: 'idle', phase: 0, clock: 0, stance: 'ready', still: 0 });
  help.textContent = c.armed ? '1 소총 · 2 쌍권총 · X 꺼내기/넣기 · A 단발 · S 풀오토(누르는 동안) · 사격 후 5초 정지하면 기본 대기'
    + (STAGE_ON ? ' · R 장전 · Q 스텝 · W 관통탄 · E 각성 · Enter 재시작' : '')
    : '무기 동작은 리안만 있습니다' + (STAGE_ON ? ' · 스테이지는 리안만' : '');
  if (c.armed) stage.start();    // Lian: the stage starts over from READY with the rifle drawn
  const url = new URL(location.href); url.searchParams.set('c', id); history.replaceState(null, '', url);
}

// ---- weapon actions (one-shot clips that play to their end, then call done)
const duration = (clip, limit) => {
  const m = sprites.clips[clip].manifest;
  return Math.min(limit ?? Infinity, m.frameCount / m.fps);
};
// Connecting clips play faster than authored here only (user request 2026-11-13: "원본은 두고 프로토타입에서 모두 지금보다
// 4배 빠르게"); the GLBs and sprite sheets keep their length. Firing clips keep their speed.
const TRANSITION_SPEED = 4;
const TRANSITIONS = new Set(['rifle_pull_out', 'rifle_put_away', 'dual_pull_out', 'dual_put_away',
  'rifle_down_to_aim', 'rifle_aim_to_down', 'dual_ready_to_aim', 'dual_aim_to_ready']);
// speed: playback rate (default TRANSITION_SPEED for connecting clips, else 1); offset: clip time to start from
function play(clip, done, limit, speed, offset = 0) {
  player.action = { clip, t: offset, end: duration(clip, limit), done, speed: speed ?? (TRANSITIONS.has(clip) ? TRANSITION_SPEED : 1) };
}
function draw(weapon) { play(SETS[weapon].draw, () => { player.weapon = weapon; player.last = weapon; player.stance = 'ready'; }); }
// 기본 대기 -> 사격 대기 (raise) before firing; 사격 대기 -> 기본 대기 (lower) before holstering or after AIM_HOLD
function aimThen(then) {
  if (player.stance === 'aim') return then?.();
  play(SETS[player.weapon].raise, () => { player.stance = 'aim'; player.still = 0; then?.(); });
}
function readyThen(then) {
  if (player.stance === 'ready') return then?.();
  play(SETS[player.weapon].lower, () => { player.stance = 'ready'; then?.(); });
}
function holster(then) {
  readyThen(() => play(SETS[player.weapon].holster, () => { player.weapon = 'none'; player.stance = 'ready'; then?.(); }));
}
function equip(weapon) {
  if (player.weapon === weapon) return;
  if (player.weapon === 'none') draw(weapon);
  else holster(() => draw(weapon));          // switching: put the current weapon away, then draw the other
}
function toggle() { if (player.weapon === 'none') draw(player.last); else holster(); }
function single() {
  const shot = SETS[player.weapon].single;
  if (shot) aimThen(() => play(shot.clip, () => { player.still = 0; }, shot.duration, stage.fireRate()));
}
// HUD: which stance, and how long until 사격 대기 lowers to 기본 대기
const stanceText = () => player.weapon === 'none' ? '' : player.stance === 'aim'
  ? ` (사격 대기${player.action ? '' : ` · ${Math.max(0, AIM_HOLD - player.still).toFixed(1)}초 후 기본 대기`})` : ' (기본 대기)';
const idleOf = () => (player.weapon !== 'none' && player.stance === 'aim' ? SETS[player.weapon].aimIdle : SETS[player.weapon].idle);

// ---- input
const MOVE_KEYS = ['ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyS'];
function onKeyDown(event) {
  if (MOVE_KEYS.includes(event.code)) { keys.add(event.code); event.preventDefault(); }
  if (stage.keyDown(event)) { event.preventDefault(); return; }   // stage: Enter R Q W E, input buffer, lock while down / stepping
  if (!sprites?.armed || event.repeat || player.action) return;
  const busyFiring = keys.has('KeyS') && player.weapon !== 'none';
  if (event.code === 'Digit1' || event.code === 'Numpad1') equip('rifle');
  else if (event.code === 'Digit2' || event.code === 'Numpad2') equip('dual');
  else if (event.code === 'KeyX') toggle();
  else if (event.code === 'KeyA' && player.weapon !== 'none' && !busyFiring) single();
  else return;
  event.preventDefault();
}
addEventListener('keydown', onKeyDown);
addEventListener('keyup', event => { if (MOVE_KEYS.includes(event.code)) { keys.delete(event.code); event.preventDefault(); } });
addEventListener('blur', () => keys.clear());
picker.addEventListener('change', () => { loadCharacter(picker.value); picker.blur(); });

// ---- simulation
function update(dt) {
  if (player.frozen) { player.vx = 0; stage.update(dt); return; }   // stage: Lian is down, the pose holds
  const set = SETS[player.weapon];
  const armed = !!sprites?.armed && player.weapon !== 'none';
  const locked = stage.locked();                  // stage: Q step or down, no movement / firing input
  const fireHeld = keys.has('KeyS') && !locked;
  if (armed && fireHeld && !player.action) stage.beforeAuto();   // stage: empty rifle -> automatic reload
  // S held: raise first if in 기본 대기, then fire while held
  if (armed && fireHeld && !player.action && player.stance === 'ready') aimThen();
  const autoFire = armed && fireHeld && !player.action && player.stance === 'aim';
  player.autoFire = autoFire;
  const standing = !!player.action || autoFire;   // weapon actions and firing are done standing
  const input = locked ? 0 : (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
  const dir = standing ? 0 : input;
  const running = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && set.run !== null;
  const target = dir * (running ? RUN_SPEED : WALK_SPEED);
  const rate = Math.abs(target) > Math.abs(player.vx) && Math.sign(target || player.vx) === Math.sign(player.vx || target) ? ACCEL : DECEL;
  const dv = target - player.vx;
  if (player.dash) player.vx = 0;                 // the stage moves Lian during the Q step
  else player.vx += Math.sign(dv) * Math.min(Math.abs(dv), rate * dt);
  if (dir) player.facing = dir;
  else if (standing && input) player.facing = input;   // firing / weapon action: turn in place (enemies come from both sides)
  player.x += player.vx * dt;
  if (player.x < LEVEL.left || player.x > LEVEL.right) { player.x = Math.min(LEVEL.right, Math.max(LEVEL.left, player.x)); player.vx = 0; }

  const speed = Math.abs(player.vx);
  // walking keeps the stance; the run clips carry the weapon lowered, so running drops to 기본 대기
  if (armed && !player.action && speed > RUN_SWITCH) player.stance = 'ready';
  // 사격 대기 held still for AIM_HOLD -> lower to 기본 대기
  if (armed && !player.action && !autoFire && player.stance === 'aim' && speed < 0.04) {
    player.still += dt;
    if (player.still >= AIM_HOLD) { player.still = 0; readyThen(); }
  } else if (!player.action) player.still = 0;
  let anim;
  if (player.dash) anim = set.run;                 // Q step: the weapon's run cycle, faster
  else if (player.action) {
    const a = player.action, prev = a.t; a.t += dt * a.speed; anim = a.clip;   // a.t is clip time
    stage.actionTick(a, prev);                      // stage: shots at their clip times
    if (a.t >= a.end) { player.action = null; a.done?.(); anim = player.action ? player.action.clip : idleOf(); }
  } else if (autoFire) anim = set.auto;
  else anim = speed < 0.04 ? idleOf() : speed > RUN_SWITCH && set.run ? set.run
    : (armed && player.stance === 'aim' && set.aimWalk) || set.walk;
  if (anim !== player.anim) { player.anim = anim; player.phase = 0; player.clock = 0; }
  stage.update(dt);
  if (!sprites) return;
  const m = sprites.clips[anim]?.manifest;
  if (player.dash && m) {                          // Q step: run cycle at animRate (2x) by time
    if (anim === 'run') player.phase = (player.phase + player.dash.animRate * dt * m.fps / m.frameCount) % 1;
    else player.clock += dt * player.dash.animRate;
  } else if ((anim === 'walk' || anim === 'run') && m) {
    // bare cycles advance by distance covered, so steps stay planted while speeding up / slowing down
    const stride = (anim === 'run' ? RUN_SPEED : WALK_SPEED) * m.frameCount / m.fps;   // units travelled per cycle
    player.phase = (player.phase + speed * dt / stride) % 1;
  } else if (anim === set.walk || anim === set.aimWalk || anim === set.run) {
    player.clock += dt * Math.max(0.3, speed / (anim === set.run ? RUN_SPEED : WALK_SPEED));
  } else player.clock += dt * (autoFire ? stage.fireRate() : 1);   // E overdrive plays the firing loop faster
  camera.x += (player.x - camera.x) * Math.min(1, dt * 4);
}

const frameInfo = () => {
  const m = sprites?.clips[player.anim]?.manifest;
  return m ? { anim: player.anim, frame: frameOf(player.anim, m) } : null;
};
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

// one Lian frame with its feet at x; look (from the stage): alpha, rot (around the feet), canvas filter
function drawCharacter(anim, frame, x, facing, view, look) {
  const clip = sprites?.clips[anim];
  if (!clip) return null;
  const { manifest: m, image } = clip;
  const cols = m.columns, cw = m.crop.width, ch = m.crop.height, s = view.ppu / SPRITE_PPM;
  const fx = (frame % cols) * cw, fy = Math.floor(frame / cols) * ch;
  ctx.save();
  if (look?.alpha != null) ctx.globalAlpha = look.alpha;
  if (look?.filter) ctx.filter = look.filter;
  // the frame sits at manifest.crop inside the render canvas; originX / groundY mark the feet in that canvas
  ctx.setTransform(facing * s, 0, 0, s, view.sx(x), view.groundY);
  if (look?.rot) ctx.rotate(look.rot);
  ctx.drawImage(image, fx, fy, cw, ch, m.crop.x - m.originX, m.crop.y - m.groundY, cw, ch);
  ctx.restore();
  return m;
}

function drawScene() {
  const W = canvas.width, H = canvas.height, ppu = H / UNITS_ON_SCREEN;        // screen px per unit
  const shake = stage.shake();                                                 // stage: hit camera shake (units)
  const groundY = H * 0.78 + shake.y * ppu;
  const camX = camera.x + shake.x;
  const sx = x => W / 2 + (x - camX) * ppu;
  const view = { W, H, ppu, groundY, sx, dpr: W / Math.max(1, canvas.clientWidth || innerWidth) };
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // sky and far layers (parallax so the movement reads)
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#2b3a44'); sky.addColorStop(1, '#4d5d63'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, groundY);
  for (const [depth, color, h] of [[0.25, '#3b4a50', 0.9], [0.5, '#33413f', 0.55]]) {
    ctx.fillStyle = color;
    for (let i = -20; i <= 20; i++) {
      const x = W / 2 + (i * 2.6 - camX * depth) * ppu;
      if (x < -3 * ppu || x > W + 3 * ppu) continue;
      const bh = (h + ((i * 37) % 5 + 5) % 5 * 0.12) * ppu;
      ctx.fillRect(x, groundY - bh, 1.6 * ppu, bh);
    }
  }
  // ground with one tick per unit and level ends
  ctx.fillStyle = '#2a2f2b'; ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = '#5c6458'; ctx.fillRect(0, groundY, W, Math.max(2, ppu * 0.012));
  ctx.fillStyle = '#454c44';
  for (let u = Math.floor(camX - W / ppu); u <= camX + W / ppu; u++) ctx.fillRect(sx(u), groundY, Math.max(1, ppu * 0.008), ppu * (u % 5 === 0 ? 0.08 : 0.04));
  ctx.fillStyle = '#7a3b32';
  for (const edge of [LEVEL.left - 0.4, LEVEL.right + 0.4]) ctx.fillRect(sx(edge) - ppu * 0.03, groundY - ppu * 0.6, ppu * 0.06, ppu * 0.6);
  stage.drawWorld(ctx, view);                                                  // stage: enemies
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(sx(player.x), groundY, ppu * 0.16, ppu * 0.035, 0, 0, Math.PI * 2); ctx.fill();

  const look = stage.playerLook(view);                                          // stage: hit blink / flash, fall, glow, Q afterimages
  for (const g of look?.ghosts ?? []) drawCharacter(g.anim, g.frame, g.x, g.facing, view, { alpha: g.alpha });
  const clip = sprites?.clips[player.anim];
  if (clip) {
    const m = drawCharacter(player.anim, frameOf(player.anim, clip.manifest), player.x, player.facing, view, look);
    const weapon = player.weapon === 'none' ? '맨손' : SETS[player.weapon].label;
    status.textContent = `${sprites.name} · ${weapon} · ${LABELS[player.anim] ?? player.anim}${stanceText()} · ${m.fps} fps · ${(Math.abs(player.vx) * 1.65).toFixed(2)} m/s · x ${(player.x * 1.65).toFixed(1)} m`;
  }
  stage.drawFront(ctx, view);                                                  // stage: bullets, effects, HUD
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

// ?debug: expose the simulation so a test can step it frame by frame without relying on requestAnimationFrame
if (new URL(location.href).searchParams.has('debug')) window.__move = { player, keys, update, onKeyDown, stage, get loaded() { return !!sprites; } };
