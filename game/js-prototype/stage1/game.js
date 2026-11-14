// Stage 1 prototype (STAGE1_DESIGN.md): Lian clears side-scrolling rooms on a shallow floor (x along the room, z across
// the floor depth) and picks the next room on a branching tactical map until the boss.
// This file owns the simulation; draw.js draws it. Sprites are the offline renders already used by the movement
// prototype (nothing is rendered or generated here). Effects reuse ../move/stage-fx.js.
// Deterministic: a fixed seed and `dt` only, so ?debug tests can step it (window.__s1.step).

import { createFx, mulberry32, FX_CONFIG } from '../move/stage-fx.js';
import { VIEW, DEPTH, LIAN, SETS, TRANSITIONS, TRANSITION_SPEED, PLAYER, COMBAT, SKILLS, ENEMY, ROOMS, MAP } from './config.js';
import { createRenderer } from './draw.js';

const canvas = document.getElementById('stage'), ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const keys = new Set();
const P = { x: 1, z: DEPTH.max / 2, vx: 0, vz: 0, facing: 1, anim: 'rifle_idle', phase: 0, clock: 0, weapon: 'rifle', last: 'rifle',
            action: null, stance: 'ready', still: 0, autoFire: false, roll: null, knock: null, skill: null };
const G = {
  mode: 'loading', time: 0, hitstop: 0, witch: 0, shakeT: 0, shakeAmp: 0,
  sprites: null, enemySprites: {}, muzzle: null,
  run: null, room: null, map: null, camera: { x: 0 }, halfW: VIEW.halfWFallback, viewHalfW: VIEW.halfWFallback,
  enemies: [], bullets: [], globs: [], ghosts: [], boss: null,
  hp: PLAYER.hp, hpLag: PLAYER.hp, hitInv: 0, rollInv: 0, ammo: COMBAT.rifleMag, cd: freshCd(), cdMax: {}, overdrive: 0,
  autoOn: false, autoAcc: 0, lastFlash: { rifle: -1, right: -1, left: -1 }, buffer: null, chain: { n: 0, t: 0 },
  banner: null, popups: [],
  slowMark: 0, link: -1, skillGhosts: [], sfx: [],      // v1.3 skills: marking slow (apart from G.witch), roll link window, after-images, skill effects
};
function freshCd() { return { roll: 0, w: 0, e: 0, rifleD: 0, rifleF: 0, dualD: 0, dualF: 0 }; }
const fx = createFx(COMBAT.seed);
let rand = mulberry32(COMBAT.seed), nextId = 1, fxRand = mulberry32(COMBAT.seed + 7);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const living = () => G.enemies.filter(e => !e.dying);
const reloading = () => P.action?.clip === 'rifle_reload' || P.action?.clip === 'rifle_reload_empty';
const DRAW_CLIPS = new Set(Object.values(SETS).flatMap(s => [s.draw, s.holster]).filter(Boolean));
const odActive = () => G.overdrive > 0;
const fireRate = () => (odActive() ? COMBAT.skills.e.playRate : 1);
const banner = (text, sub = '', t = 1.6) => { G.banner = { text, sub, t, life: t }; };
const popup = (x, h, text, color) => G.popups.push({ x, h, text, color, t: 0, life: 0.9 });
const shake = (amp, t = 0.15) => { if (amp >= G.shakeAmp * (G.shakeT > 0 ? 1 : 0)) { G.shakeAmp = amp; G.shakeT = t; } };
const hitstop = t => { G.hitstop = Math.min(COMBAT.hitstop.max, Math.max(G.hitstop, t)); };

// ---------- loading
// The load event, not image.decode(): Chromium holds decode() pending while the window is hidden (nothing is
// painted), so a hidden preview never left 'loading'. onload fires either way; decode() stays a non-blocking hint.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { image.decode?.().catch(() => {}); resolve(image); };
    image.onerror = () => reject(new Error(`이미지 ${src}`));
    image.src = src;
  });
}
async function loadSheet(base, clip) {
  const res = await fetch(`${base}${clip}/manifest_200.json`);
  if (!res.ok) throw new Error(`${clip} ${res.status}`);
  const manifest = await res.json();
  const image = await loadImage(`${base}${clip}/${manifest.spritesheet ?? 'spritesheet_200.webp'}`);
  return { manifest, image };
}
async function load() {
  statusEl.textContent = '스프라이트 불러오는 중…';
  const lian = await Promise.all(LIAN.clips.map(c => loadSheet(LIAN.base(c), c)));
  G.sprites = Object.fromEntries(LIAN.clips.map((c, i) => [c, lian[i]]));
  await Promise.all(ENEMY.clips.map(async c => { try { G.enemySprites[c] = await loadSheet(ENEMY.base, c); } catch (err) { console.warn('적 스프라이트 실패', c, err); } }));
  try { G.muzzle = (await (await fetch(LIAN.muzzleAnchors)).json()).clips ?? null; } catch (err) { console.warn('총구 앵커 실패, 대표값 사용', err); }
  statusEl.textContent = '';
  newRun();
}

// ---------- run / map / rooms
function newRun() {
  rand = mulberry32(COMBAT.seed); nextId = 1; fx.reset(COMBAT.seed); fxRand = mulberry32(COMBAT.seed + 7);
  Object.assign(G, { hp: PLAYER.hp, hpLag: PLAYER.hp, ammo: COMBAT.rifleMag, cd: freshCd(), cdMax: {}, link: -1, overdrive: 0, witch: 0, hitInv: 0, rollInv: 0,
    hitFlash: 0, vignette: 0, hitstop: 0, shakeT: 0, shakeAmp: 0, deathT: 0, autoOn: false, autoAcc: 0, lastFlash: { rifle: -1, right: -1, left: -1 },
    chain: { n: 0, t: 0 }, buffer: null, banner: null, boss: null, room: null });
  G.popups.length = 0;
  G.run = { node: null, visited: [], kills: 0, damageTaken: 0, time: 0, rooms: 0, bestChain: 0, perfect: 0 };
  Object.assign(P, { x: 1, z: DEPTH.max / 2, vx: 0, vz: 0, facing: 1, phase: 0, clock: 0, weapon: 'rifle', last: 'rifle', stance: 'ready', action: null,
    anim: 'rifle_idle', still: 0, autoFire: false, roll: null, knock: null, skill: null });
  openMap([MAP.start]);
}
function openMap(choices) {
  G.mode = 'map'; G.map = { choices, sel: 0, t: 0 };
  G.enemies.length = 0; G.bullets.length = 0; G.globs.length = 0; G.ghosts.length = 0;
  clearSkills();
}
// skills never carry over a room change / map / result: state, marking slow and the effect pools are cleared
function clearSkills() { P.skill = null; G.slowMark = 0; G.skillGhosts.length = 0; G.sfx.length = 0; }
function enterRoom(id) {
  const def = ROOMS[id];
  G.run.node = id; G.run.visited.push(id);
  G.room = { id, def, next: 0, lock: null, cleared: false, doorT: 0, t: 0 };
  G.enemies.length = 0; G.bullets.length = 0; G.globs.length = 0; G.ghosts.length = 0; G.popups.length = 0; G.boss = null;
  clearSkills();
  Object.assign(P, { x: 1.0, z: DEPTH.max / 2, vx: 0, vz: 0, facing: 1, action: null, roll: null, knock: null, autoFire: false, still: 0 });
  P.stance = 'ready'; P.anim = SETS[P.weapon].idle; P.phase = 0; P.clock = 0;
  if (COMBAT.roomRefill) G.ammo = COMBAT.rifleMag;                 // 권고 11항
  G.buffer = null; G.autoOn = false; G.autoAcc = 0;
  G.camera.x = clampCamera(P.x);
  G.mode = 'room';
  banner(def.name, `목표: ${def.goal}${def.tag ? ` · ${def.tag}` : ''}`, 2.2);
  if (def.boss) { G.room.lock = { left: G.camera.x - G.halfW, right: G.camera.x + G.halfW, ids: [], boss: true }; spawnBoss(); }   // REQ-008: arena = one screen, locked on entry
}
function finishRoom() {
  G.run.rooms++;
  G.hp = Math.min(PLAYER.hp, G.hp + COMBAT.roomHeal);
  G.hpLag = G.hp;
  openMap(MAP.nodes[G.room.id].next);
}
const clampCamera = x => {
  const L = G.room?.def.length ?? 20;
  return L <= G.halfW * 2 ? L / 2 : clamp(x, G.halfW, L - G.halfW);
};

function spawnEnemy(type, side, zf) {
  const cfg = ENEMY.types[type], cam = G.camera.x;
  let x = side === 'left' ? cam - G.halfW - 0.7 : side === 'ahead' ? P.x + P.facing * 3 : cam + G.halfW + 0.7;
  if (G.room) x = clamp(x, -ENEMY.outside, G.room.def.length + ENEMY.outside);      // not deep inside the end walls
  const e = { id: nextId++, type, cfg, x, z: clamp(zf * DEPTH.max, 0.05, DEPTH.max - 0.05), hp: cfg.hp, maxHp: cfg.hp,
              facing: P.x >= x ? 1 : -1, state: 'walk', t: 0, animT: rand() * 2, cd: 0.6 + rand() * 0.6, flash: 0, kbV: 0, kbT: 0,
              stagger: 0, dying: null, dieT: 0, exploded: false, damaged: false };
  G.enemies.push(e);
  return e;
}
function updateRoom(dt) {
  const R = G.room, def = R.def;
  R.t += dt;
  if (!R.lock && R.next < def.groups.length && P.x >= def.groups[R.next].at) {
    const g = def.groups[R.next];
    const ids = g.spawn.map(([type, side, zf]) => spawnEnemy(type, side, zf).id);
    R.lock = { left: G.camera.x - G.halfW, right: G.camera.x + G.halfW, ids };
    R.next++;
  }
  if (R.lock?.boss && G.boss?.dying) R.lock = null;
  if (R.lock && !R.lock.boss && !G.enemies.some(e => !e.dying && R.lock.ids.includes(e.id))) {
    R.lock = null;
    if (R.next < def.groups.length) popup(P.x + 1.2, 1.25, 'GO →', '#f0d29c');
  }
  const wasCleared = R.cleared;
  R.cleared = !def.boss && R.next >= def.groups.length && !R.lock && living().length === 0;
  if (R.cleared && !wasCleared) banner('소탕 완료', '오른쪽 출구로 이동', 1.8);
  if (R.cleared) { R.doorT += dt; if (P.x >= def.length - 0.9) finishRoom(); }
  if (def.boss && G.boss?.dying && G.mode === 'room') {             // 2.2 s of world time (not slowed by 완벽 회피)
    G.boss.clearT = (G.boss.clearT ?? 0) + dt;
    if (G.boss.clearT >= ENEMY.boss.clearDelay - 1e-9) { G.mode = 'clear'; G.banner = null; Object.assign(P, { action: null, roll: null, autoFire: false }); clearSkills(); }
  }
}

// ---------- Lian actions (same flow as the movement prototype)
const duration = (clip, limit) => { const m = G.sprites[clip].manifest; return Math.min(limit ?? Infinity, m.frameCount / m.fps); };
function play(clip, done, limit, speed, offset = 0) {
  P.action = { clip, t: offset, end: duration(clip, limit), done, speed: speed ?? (TRANSITIONS.has(clip) ? TRANSITION_SPEED : 1) };
}
function draw(weapon) { play(SETS[weapon].draw, () => { P.weapon = weapon; P.last = weapon; P.stance = 'ready'; }); }
function aimThen(then) {
  if (P.stance === 'aim') return then?.();
  play(SETS[P.weapon].raise, () => { P.stance = 'aim'; P.still = 0; then?.(); });
}
function readyThen(then) {
  if (P.stance === 'ready') return then?.();
  play(SETS[P.weapon].lower, () => { P.stance = 'ready'; then?.(); });
}
function holster(then) { readyThen(() => play(SETS[P.weapon].holster, () => { P.weapon = 'none'; P.stance = 'ready'; then?.(); })); }
function equip(weapon) { if (P.weapon === weapon) return; if (P.weapon === 'none') draw(weapon); else holster(() => draw(weapon)); }
function toggle() { if (P.weapon === 'none') draw(P.last); else holster(); }
function single() {
  const shot = SETS[P.weapon].single;
  if (P.weapon === 'rifle' && G.ammo <= 0 && !odActive()) return startReload();
  if (shot) aimThen(() => play(shot.clip, () => { P.still = 0; }, shot.duration, fireRate()));
}
function startReload() {
  if (P.weapon !== 'rifle') return;
  play(G.ammo > 0 ? 'rifle_reload' : 'rifle_reload_empty', () => { G.ammo = COMBAT.rifleMag; P.stance = 'aim'; P.still = 0; }, undefined, COMBAT.reloadSpeed);
  G.buffer = null; G.autoOn = false; G.autoAcc = 0;
}
function tryPierce() {
  if (P.weapon === 'none' || G.cd.w > 0 || P.roll || P.action || P.skill) return;
  const single = SETS[P.weapon].single;
  aimThen(() => { play(single.clip, () => { P.still = 0; }, single.duration, fireRate()); P.action.tag = 'pierce'; });
}
function tryOverdrive() { if (P.weapon !== 'none' && G.cd.e <= 0 && !reloading()) { G.overdrive = COMBAT.skills.e.time; G.cd.e = COMBAT.skills.e.cooldown; } }

// roll (회피): any time except reloading / drawing; cancels raise / lower / firing; invulnerable for roll.invuln
function tryRoll() {
  const R = PLAYER.roll;
  if (G.cd.roll > 0 || P.roll || G.mode !== 'room') return;
  // drawing happens while P.weapon is still the old weapon, so test the clip against every weapon's draw / holster
  if (reloading() || DRAW_CLIPS.has(P.action?.clip)) return;
  if (P.skill) { if (!P.skill.cancel) return; cancelSkill(); }        // 19.2: only the rifle D marking / dual D firing (and a rifle D raise) yield to a roll
  let dx = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), dz = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
  if (!dx && !dz) dx = P.facing;
  const n = Math.hypot(dx, dz * 1.6) || 1;           // depth rolls cover less ground (the floor is shallow)
  if (dx) P.facing = Math.sign(dx);
  Object.assign(P, { action: null, stance: 'ready', still: 0, vx: 0, vz: 0, autoFire: false });
  P.roll = { dx: dx / n, dz: dz / n, t: 0, start: G.time, ghostT: 0 };
  G.rollInv = R.invuln; G.cd.roll = R.cooldown; G.buffer = null; G.autoOn = false;
  footDust(P.x, P.z, dx || P.facing);
  G.link = G.time + SKILLS.link;                                      // 구르기 연계 창 (19.2)
  if (['D', 'F'].some(k => { const i = skillInfo(k); return i.usable && i.cd <= 0; })) popup(P.x, 1.45, 'LINK!', '#ffd24a');
}
function updateRoll(dt) {
  const R = PLAYER.roll;
  for (let i = G.ghosts.length - 1; i >= 0; i--) { G.ghosts[i].t += dt; if (G.ghosts[i].t >= R.ghostLife) G.ghosts.splice(i, 1); }
  const r = P.roll; if (!r) return;
  const step = Math.min(dt, R.time - r.t);
  P.x += r.dx * R.speed * step; P.z += r.dz * R.speed * step;
  r.t += step; r.ghostT += dt;
  if (r.ghostT >= R.ghostEvery) { r.ghostT -= R.ghostEvery; G.ghosts.push({ anim: P.anim, frame: frameOf(P.anim), x: P.x, z: P.z, facing: P.facing, t: 0 }); while (G.ghosts.length > R.ghosts) G.ghosts.shift(); }
  if (r.t >= R.time - 1e-9) { P.roll = null; P.stance = 'ready'; footDust(P.x, P.z, P.facing); }
}

// ---------- v1.3 weapon skills (STAGE1_DESIGN.md 19장): D / F per weapon
// P.skill = { id, phase, t, clip, rate, cancel, ... }. Skill time is world time (frozen by hit stop, never slowed).
// Invulnerability uses G.rollInv without P.roll, so it never triggers 완벽 회피. Skills own P.facing while they run.
const ORBIT_SPEC = { ...COMBAT.bullets.pistol, range: SKILLS.dualF.range };
const skillId = (weapon, slot) => (weapon === 'dual' ? 'dual' : 'rifle') + slot;
const inLink = () => G.time < G.link;
const easeOut = u => 1 - (1 - clamp(u, 0, 1)) ** 2;
const isTarget = e => !!e && !e.dying && targets().includes(e);
function nearestTarget(exclude) {
  let best = null, bd = Infinity;
  for (const e of targets()) { if (e === exclude) continue; const d = Math.abs(e.x - P.x); if (d < bd) { bd = d; best = e; } }
  return best;
}
// 인터셉트 target: on screen, within `range` in x (depth ignored, behind included); ties go to the smaller depth gap
function interceptTarget(range) {
  let best = null, bd = Infinity, bz = Infinity;
  for (const e of targets()) {
    const d = Math.abs(e.x - P.x), dz = Math.abs(e.z - P.z);
    if (d > range + 1e-9) continue;
    if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && dz < bz)) { best = e; bd = d; bz = dz; }
  }
  return best;
}
// HUD and input share this. Bare hands show the last weapon's skills with the reason '맨손'.
function skillInfo(slot) {
  const weapon = P.weapon === 'none' ? (P.last === 'dual' ? 'dual' : 'rifle') : P.weapon, id = skillId(weapon, slot), S = SKILLS[id];
  let reason = null;
  if (P.weapon === 'none') reason = '맨손';
  else if (reloading()) reason = '장전 중';
  else if (S.ammo && G.ammo < S.ammo && !odActive()) reason = '탄 부족';
  else if (id === 'rifleD' && G.mode === 'room' && !targets().length) reason = '대상 없음';
  else if (id === 'dualD' && G.mode === 'room' && !interceptTarget(inLink() ? S.rangeLink : S.range)) reason = '대상 없음';
  return { id, weapon, slot, name: S.name, cd: G.cd[id], max: G.cdMax[id] ?? S.cooldown, usable: G.mode === 'room' && !reason, reason };
}
const setCd = (id, v) => { G.cd[id] = v; G.cdMax[id] = v; };
function trySkillKey(slot) {
  // bare hands, reloading, drawing / holstering: ignored (no cost, not buffered)
  if (P.weapon === 'none' || reloading() || DRAW_CLIPS.has(P.action?.clip)) return;
  if (P.skill || P.action) { G.buffer = { code: slot === 'D' ? 'KeyD' : 'KeyF', t: G.time }; return; }
  const info = skillInfo(slot);
  if (!info.usable || info.cd > 0) return;
  const link = inLink();                                              // judged at the input
  if (P.roll) { P.roll = null; P.stance = 'ready'; footDust(P.x, P.z, P.facing); }   // 19.2: the roll ends on the spot (its invulnerability / cooldown stay)
  Object.assign(P, { autoFire: false, still: 0 }); G.autoOn = false; G.autoAcc = 0;
  ({ rifleD: startRifleD, rifleF: startRifleF, dualD: startDualD, dualF: startDualF })[info.id](link);
}
function endSkill() { P.skill = null; P.stance = 'aim'; P.still = 0; }
function cancelSkill() {
  const s = P.skill; if (!s) return;
  if (s.id === 'rifleD' && s.phase === 'mark') { G.slowMark = 0; G.cd.rifleD = Math.min(G.cd.rifleD, SKILLS.rifleD.cancelCd); }
  if (s.id === 'rifleD' && s.phase === 'raise' && P.action?.clip === SETS.rifle.raise) P.action = null;
  s.canceled = true; P.skill = null;
}
function pushGhost(clip, tint) {
  G.skillGhosts.push({ anim: clip, frame: frameOf(clip), x: P.x, z: P.z, facing: P.facing, t: 0, life: SKILLS.ghostLife, tint });
  while (G.skillGhosts.length > SKILLS.maxGhosts) G.skillGhosts.shift();
}
function bigFlash(x, y, dir, k) {                                     // enlarged muzzle flash (stage-fx 'flash' / 'light' items)
  fx.items.push({ type: 'flash', x, y, dir, t: 0, life: 0.07, length: 0.22 * k, width: 0.1 * k, rot: 0 });
  fx.items.push({ type: 'light', x, y, t: 0, life: 0.09, radius: 0.45 * k });
}
// stage-fx's dust has no depth (M1 is flat) and lands on the front edge; this one sits at Lian's feet
function footDust(x, z, dir) {
  const c = FX_CONFIG.dust;
  for (let i = 0; i < c.count; i++) {
    const a = (dir > 0 ? Math.PI : 0) + (fxRand() * 0.9 - 0.15) * (dir > 0 ? -1 : 1), sp = c.speed[0] + (c.speed[1] - c.speed[0]) * fxRand();
    fx.items.push({ type: 'particle', x, y: z * VIEW.depthK + 0.02, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: c.life, size: c.size, color: c.color, gravity: 0, grow: true });
  }
}
const ring = (x, z, radius, color, life = 0.22, width = 0.025) => fx.items.push({ type: 'ring', x, y: z * VIEW.depthK + 0.04, t: 0, life, radius, color, width, grow: true });
const markHeight = e => (e.type === 'boss' ? 1.0 : 0.5 * e.cfg.scale);

// 소총 D 파열 일제사격: raise if needed -> marking (world slow) -> one shot per mark at 0.06 s
function startRifleD(link) {
  const s = { id: 'rifleD', phase: 'raise', t: 0, link, cancel: true, clip: SETS.rifle.aimIdle, rate: 1 };
  P.skill = s;
  aimThen(() => beginMark(s));
}
function beginMark(s) {
  if (P.skill !== s) return;
  const S = SKILLS.rifleD, list = targets().sort((a, b) => Math.abs(a.x - P.x) - Math.abs(b.x - P.x));
  if (!list.length) { P.skill = null; return; }                      // all gone during the raise: nothing spent
  let n = s.link || G.witch > 0 ? S.marksBonus : S.marks;
  if (!list.some(e => e.type === 'boss')) n = Math.min(n, list.length * S.perEnemy);
  const count = new Map(), marks = [];
  for (let i = 0; marks.length < n; i++) {                            // round robin, nearest first, at most 3 per enemy (the boss has no cap)
    const e = list[i % list.length], c = count.get(e) ?? 0;
    if (e.type !== 'boss' && c >= S.perEnemy) continue;
    count.set(e, c + 1); marks.push({ e, slot: c, fired: false });
  }
  const markT = (s.link ? S.markLink : S.mark) * (odActive() ? S.odScale : 1);
  marks.forEach((m, i) => { m.landT = markT * (i + 1) / marks.length; m.of = count.get(m.e); });
  Object.assign(s, { phase: 'mark', t: 0, markT, marks, clip: SETS.rifle.aimIdle, rate: 1, cancel: true });
  setCd('rifleD', S.cooldown);
  G.slowMark = markT;                                                 // a separate timer: G.witch stays untouched (19.9)
}
function volleyShot(s, k) {
  const S = SKILLS.rifleD, m = s.marks[k];
  m.fired = true;
  const t = isTarget(m.e) ? m.e : nearestTarget();                    // a dead mark goes to the nearest living target (none: straight)
  if (t) P.facing = Math.sign(t.x - P.x) || P.facing;
  const mz = muzzleAt('rifle', 'rifle_full_auto', P.clock);
  fireBulletAt(COMBAT.bullets.rifleVolley, 'rifle', 'volley', t, P.facing, mz,
    { tag: 'volley', skill: s, dmgMult: s.boost ? S.witchMult : 1, hitstop: k === s.marks.length - 1 ? S.lastHitstop : undefined });
  const x = P.x + P.facing * mz.forward, y = P.z * VIEW.depthK + mz.height;
  bigFlash(x, y, P.facing, S.flash); shake(S.shake, 0.1);
  const mx = m.e.x + (m.slot - (m.of - 1) / 2) * 0.16;
  G.sfx.push({ type: 'line', x0: mx, y0: m.e.z * VIEW.depthK + markHeight(m.e), x1: x, y1: y, color: '#ffd24a', width: 0.02, t: 0, life: S.trail });
}

// 소총 F 리코일 슬라이드: recoil shot ahead, slide back 1.5 (or 0.9 in depth with ↑/↓) in 0.25 s
function startRifleF() {
  const S = SKILLS.rifleF, iz = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
  const s = { id: 'rifleF', phase: 'slide', t: 0, cancel: false, clip: SETS.rifle.single.clip, rate: S.animRate,
              dx: iz ? 0 : -P.facing, dz: iz, dist: iz ? S.depthDistance : S.distance, ghostT: 0, ghostN: 0, refunded: false };
  P.skill = s; P.stance = 'aim'; P.clock = 0;
  setCd('rifleF', S.cooldown);
  if (!odActive()) G.ammo = Math.max(0, G.ammo - S.ammo);
  G.rollInv = Math.max(G.rollInv, S.invuln);
  const m = muzzleAt('rifle', 'gunplay', 2.5 / 30);
  // pierce 1 (= 2 enemies) only during 완벽 회피 slow; otherwise the spec's 0 (= 1 enemy)
  fireBullet(COMBAT.bullets.rifleSlide, 'rifle', 'rifle', m, { tag: 'slide', skill: s, originX: P.x, pierce: G.witch > 0 ? 1 : undefined });
  bigFlash(P.x + P.facing * m.forward, P.z * VIEW.depthK + m.height, P.facing, S.flash);
  shake(S.shake, 0.18); footDust(P.x, P.z, P.facing);
  s.streak = { type: 'streak', x0: P.x, z0: P.z, x1: P.x, z1: P.z, t: 0, life: S.time + 0.35 };
  G.sfx.push(s.streak);
  popup(P.x, 1.3, S.popup, '#ffd24a');
}

// 쌍권총 D 카타 · 인터셉트: dash 0.18 s to the target (through it), then 8 shots in 0.4 s
function interceptPoint(e) {
  const S = SKILLS.dualD, { lo, hi } = playerBounds(), boss = e.type === 'boss';
  const off = boss ? S.bossOffset : S.offset, gap = boss ? S.bossGap : S.minGap;
  const side = boss ? e.facing : e.cfg.front ? -e.facing : (Math.sign(P.x - e.x) || -P.facing);   // boss: its front / brute: its back / others: Lian's side
  for (const sd of [side, -side]) { const x = e.x + sd * off; if (x >= lo - 1e-9 && x <= hi + 1e-9) return x; }
  // both sides cut by the bounds: as far as they allow, at least `gap` from the target (outside the boss's body)
  const c = [side, -side].map(sd => clamp(e.x + sd * off, lo, hi));
  return c.find(x => Math.abs(x - e.x) >= gap - 1e-9) ?? c.sort((a, b) => Math.abs(b - e.x) - Math.abs(a - e.x))[0];
}
function startDualD(link) {
  const S = SKILLS.dualD, e = interceptTarget(link ? S.rangeLink : S.range);
  if (!e) return;
  const tx = interceptPoint(e), tz = clamp(e.z, 0.02, DEPTH.max - 0.02);
  const s = { id: 'dualD', phase: 'move', t: 0, cancel: false, clip: SETS.dual.run, rate: S.runRate, target: e, x0: P.x, z0: P.z, tx, tz,
              ghostN: 1, next: 0, killRefunded: false };
  P.skill = s; P.stance = 'aim'; P.clock = 0;
  setCd('dualD', link ? S.cooldownLink : S.cooldown);
  G.rollInv = Math.max(G.rollInv, S.invuln);
  // brute: pinned from the start (not only on arrival) so it cannot turn round while Lian passes it (19.9 says on arrival)
  if (e.cfg.front && e.type !== 'boss') e.pin = Math.max(e.pin ?? 0, S.move + S.pin);
  if (Math.abs(tx - P.x) > 1e-6) P.facing = Math.sign(tx - P.x);
  pushGhost(SETS.dual.run, 'dual');                                   // the first after-image at the start point
  G.sfx.push({ type: 'line', x0: P.x, y0: P.z * VIEW.depthK + 0.55, x1: tx, y1: tz * VIEW.depthK + 0.55, color: '#6ccfff', width: 0.03, t: 0, life: S.move + S.trail, glow: true });
  popup(P.x, 1.3, S.popup, '#6ccfff');
}
function dualDShot(s, k) {
  const S = SKILLS.dualD;
  let t = isTarget(s.target) ? s.target : null;
  if (k >= S.retargetFrom) t = nearestTarget(s.target) ?? t;          // from the 4th shot: the nearest other enemy if any
  if (!t) t = nearestTarget();
  if (t && Math.abs(t.x - P.x) > 1e-6) P.facing = Math.sign(t.x - P.x);
  const side = k % 2 ? 'left' : 'right';
  fireBulletAt(COMBAT.bullets.pistol, side, 'pistol', t, P.facing, muzzleAt(side, SETS.dual.auto, P.clock), { tag: 'intercept', skill: s });
}

// 쌍권총 F 카타 · 선회 사격: 8 hits in 0.8 s, facing start / back / start / back, finisher burst on the 8th
function startDualF(link) {
  const S = SKILLS.dualF;
  const s = { id: 'dualF', phase: 'orbit', t: 0, cancel: false, clip: SETS.dual.auto, rate: S.animRate, startFacing: P.facing, next: 0 };
  P.skill = s; P.stance = 'aim'; P.clock = 0;
  setCd('dualF', S.cooldown);
  G.rollInv = Math.max(G.rollInv, link ? S.invulnLink : S.invuln);
  G.sfx.push({ type: 'arc', x: P.x, z: P.z, t: 0, life: S.time, color: '#6ccfff', dir: P.facing });
  popup(P.x, 1.3, S.popup, '#6ccfff');
}
function orbitHit(s, k) {
  const S = SKILLS.dualF;
  P.facing = s.startFacing * (Math.floor(k * S.interval / S.segment + 1e-6) % 2 ? -1 : 1);
  if (k < S.hits - 1) {
    const side = k % 2 ? 'left' : 'right', m = muzzleAt(side, SETS.dual.auto, P.clock);
    const t = pickTarget(P.x + P.facing * m.forward, P.facing, S.range, S.maxDz);
    fireBulletAt(ORBIT_SPEC, side, 'pistol', t, P.facing, m, { tag: 'orbit' });
    if (k % 2 === 0) fx.muzzle(P.x - P.facing * m.forward, P.z * VIEW.depthK + m.height, -P.facing, 'pistol');   // odd-numbered hits: a flash behind too
    return;
  }
  const F = S.finisher, hit = [];                                     // finisher: radius 1.2 around Lian (depth x1.5), front and back
  for (const e of targets()) {
    const dx = Math.max(0, Math.abs(e.x - P.x) - (e.type === 'boss' ? e.cfg.half - ENEMY.hitbox.half : 0));   // the boss counts from its wider body
    if (Math.hypot(dx, (e.z - P.z) * F.zScale) > F.radius + 1e-9) continue;
    damageTarget(e, F.damage, { dir: Math.sign(e.x - P.x) || P.facing, kind: 'orbit', knockback: F.knockback, stagger: F.stagger, explode: false });
    hit.push(e);
  }
  if (hit.length >= S.styleCount) for (const e of hit) if (e.type !== 'boss') e.slow = S.slow;   // style reward: 30 % speed for 0.8 s
  s.finisherHits = hit.length;
  for (const d of [1, -1]) fx.muzzle(P.x + d * 0.5, P.z * VIEW.depthK + 0.82, d, 'pistol');
  ring(P.x, P.z, F.radius, '#9fe6ff', 0.3, 0.035);
  shake(S.shake, 0.25); hitstop(S.hitstop);
}

function updateSkill(dt) {
  const s = P.skill; if (!s || s.phase === 'raise') return;
  const prev = s.t; s.t += dt;
  if (s.id === 'rifleD') {
    const S = SKILLS.rifleD;
    if (s.phase === 'mark' && s.t >= s.markT - 1e-9) {
      Object.assign(s, { phase: 'fire', t: s.t - s.markT, next: 0, clip: SETS.rifle.auto, rate: S.animRate, cancel: false, boost: G.witch > 0 });
      G.slowMark = 0;
      if (!odActive()) G.ammo = Math.max(0, G.ammo - S.ammo);         // always 4 rounds, whatever the number of marks
      popup(P.x, 1.3, S.popup, '#ffd24a');
    }
    if (s.phase === 'fire') {
      while (s.next < s.marks.length && s.t >= s.next * S.interval - 1e-9) volleyShot(s, s.next++);
      if (s.t >= (s.marks.length - 1) * S.interval + S.tail - 1e-9) endSkill();
    }
  } else if (s.id === 'rifleF') {
    const S = SKILLS.rifleF, du = easeOut(s.t / S.time) - easeOut(prev / S.time);
    s.streak.x1 = P.x; s.streak.z1 = P.z;
    P.x += s.dx * s.dist * du; P.z += s.dz * s.dist * du;
    s.ghostT += dt;
    if (s.ghostT >= S.ghostEvery - 1e-9 && s.ghostN < S.ghosts) { s.ghostT -= S.ghostEvery; s.ghostN++; pushGhost(s.clip, 'rifle'); footDust(P.x, P.z, P.facing); }
    if (s.t >= S.time - 1e-9) endSkill();
  } else if (s.id === 'dualD') {
    const S = SKILLS.dualD;
    if (s.phase === 'move') {
      const du = easeOut(s.t / S.move) - easeOut(prev / S.move);
      P.x += (s.tx - s.x0) * du; P.z += (s.tz - s.z0) * du;
      while (s.ghostN < S.ghosts && s.t >= s.ghostN * S.move / S.ghosts - 1e-9) { s.ghostN++; pushGhost(s.clip, 'dual'); }
      if (s.t >= S.move - 1e-9) {
        const od = odActive();
        Object.assign(s, { phase: 'fire', t: s.t - S.move, clip: SETS.dual.auto, rate: S.fireRate, cancel: true, n: od ? S.shotsOd : S.shots, interval: od ? S.intervalOd : S.interval });
        const e = isTarget(s.target) ? s.target : nearestTarget();
        if (e && Math.abs(e.x - P.x) > 1e-6) P.facing = Math.sign(e.x - P.x);
        ring(P.x, P.z, 0.75, '#6ccfff');
      }
    }
    if (s.phase === 'fire') {
      while (s.next < s.n && s.t >= s.next * s.interval - 1e-9) dualDShot(s, s.next++);
      if (s.next >= s.n && s.t >= S.burst - 1e-9) endSkill();
    }
  } else if (s.id === 'dualF') {
    const S = SKILLS.dualF;
    while (s.next < S.hits && s.t >= s.next * S.interval - 1e-9) orbitHit(s, s.next++);
    if (s.t >= S.time - 1e-9) { P.facing = s.startFacing; endSkill(); }
    else P.facing = s.startFacing * (Math.floor(s.t / S.segment + 1e-6) % 2 ? -1 : 1);
  }
}

// ---------- Lian takes a hit (or dodges it)
function hitPlayer(damage, from) {
  if (G.mode !== 'room') return false;
  if (G.rollInv > 0 || P.roll) {
    if (P.roll && G.time - P.roll.start <= PLAYER.roll.perfectWindow + 1e-9 && G.witch <= 0) perfectDodge();
    return false;
  }
  if (G.hitInv > 0) return false;
  G.run.damageTaken += Math.min(damage, G.hp); G.hp = Math.max(0, G.hp - damage);     // HP actually lost
  G.hitInv = PLAYER.hitInvuln; G.hitFlash = 0.12; G.vignette = 0.25;
  G.chain.n = 0; G.chain.t = 0;
  hitstop(COMBAT.hitstop.playerHit); shake(0.05, 0.2);
  P.knock = { dir: Math.sign(P.x - from.x) || -P.facing, t: 0, done: 0 };
  if (P.skill?.id === 'rifleD' && P.skill.phase === 'mark') cancelSkill();   // 19.1: only the marking breaks on a hit
  if (G.hp <= 0) {                                                   // the result box carries the title (no banner on top of it)
    G.mode = 'defeated'; Object.assign(P, { action: null, roll: null, knock: null, autoFire: false, vx: 0, vz: 0 }); G.deathT = 0;
    G.banner = null; G.buffer = null; G.autoOn = false; clearSkills();
  }
  return true;
}
function perfectDodge() {
  G.witch = PLAYER.roll.witchTime; G.run.perfect++;
  if (P.weapon === 'rifle') G.ammo = COMBAT.rifleMag;
  if (P.weapon === 'dual') { G.cd.dualD = 0; G.cd.dualF = 0; popup(P.x, 1.45, '카타 준비', '#6ccfff'); }   // 19.7
  popup(P.x, 1.2, '완벽 회피!', '#8fe3ff');
  hitstop(0.05);
}

// ---------- firing
function muzzleAt(side, clip, t) {
  const GUN = { rifle: 'rifle', right: 'pistol_r', left: 'pistol_l' }[side];
  const c = clip && G.muzzle?.[clip], frames = c?.frames?.[GUN];
  if (!frames?.length || !(t >= 0)) return COMBAT.muzzle[side];
  let k = Math.floor(t * c.fps + 1e-6); k = c.loop ? k % frames.length : Math.min(frames.length - 1, k);
  const f = frames[k];
  return f ? { forward: f[0], height: f[1] } : COMBAT.muzzle[side];
}
// 권고 6항: only what is on screen (camera ±(halfW + 0.3), the boss's wider body counted) can be hit or aimed at
const hittable = e => Math.abs(e.x - G.camera.x) <= G.halfW + VIEW.offscreen + (e.type === 'boss' ? e.cfg.half - ENEMY.hitbox.half : 0);
const targets = () => [...living(), ...(G.boss && !G.boss.dying && G.boss.state !== 'intro' ? [G.boss] : [])].filter(hittable);
// a bullet bends toward its target's depth and flies straight once it gets there (no overshoot, no re-aim)
const bulletZ = (b, travelled) => {
  const z = b.startZ + b.vz * Math.max(0, travelled) / b.spec.speed;
  return b.tz == null ? z : b.vz > 0 ? Math.min(b.tz, z) : Math.max(b.tz, z);
};
// aim assist: the nearest target ahead within maxDz of depth; the bullet gets the depth speed to meet it
function pickTarget(x0, dir, range, maxDz = COMBAT.assist.maxDz) {
  const A = COMBAT.assist;
  let best = null, score = Infinity;
  for (const e of targets()) {
    const dx = (e.x - x0) * dir, dz = Math.abs(e.z - P.z);
    if (dx < -0.3 || dx > range || dz > maxDz + (e.type === 'boss' ? 0.4 : 0)) continue;
    const s = Math.max(0, dx) + dz * A.zWeight;
    if (s < score) { score = s; best = e; }
  }
  return best;
}
// extra (skills): { tag, skill, originX, pierce, dmgMult, hitstop, maxDz } ride on the bullet to updateBullets
function fireBullet(spec, side, kind, m = COMBAT.muzzle[side], extra = {}) {
  const dir = P.facing, x = P.x + dir * m.forward, h = m.height;
  const t = pickTarget(x, dir, spec.range, extra.maxDz);
  const tt = t ? Math.max(0.04, Math.abs(t.x - x) / spec.speed) : 1;
  const vz = t ? clamp((t.z - P.z) / tt, -COMBAT.assist.maxVz, COMBAT.assist.maxVz) : 0;
  pushBullet(spec, side, kind, x, h, dir, vz, t && vz ? t.z : null, extra);
}
// skills: a bullet sent at a chosen target (any depth, either side). No depth speed cap; the bullet meets the target's
// depth before it reaches the near edge of its body (19.9 said max(0.12 s, distance / speed), which misses a close
// target at 1.8 depth: the bullet crosses the 0.9-wide body before the depth catches up; K4 "hits at depth 1.8" wins).
function fireBulletAt(spec, side, kind, target, dir, m = COMBAT.muzzle[side], extra = {}) {
  const x = P.x + dir * m.forward, h = m.height;
  let vz = 0, tz = null;
  if (target) {
    const half = target.type === 'boss' ? target.cfg.half : ENEMY.hitbox.half * target.cfg.scale;
    const tt = Math.max(0.015, (Math.abs(target.x - x) - half) / spec.speed);
    vz = (target.z - P.z) / tt; tz = vz ? target.z : null;
  }
  pushBullet(spec, side, kind, x, h, dir, vz, tz, extra);
}
function pushBullet(spec, side, kind, x, h, dir, vz, tz, extra) {
  G.bullets.push({ kind, side, x, z: P.z, h, vz, tz, startX: x, startZ: P.z, hitFrom: P.x, dir, spec, pierceLeft: extra.pierce ?? spec.pierce, hitIds: new Set(), fade: -1, dead: false,
                   tag: extra.tag ?? null, skill: extra.skill ?? null, originX: extra.originX ?? P.x, dmgMult: extra.dmgMult ?? 1, hitstopOverride: extra.hitstop });
  if (G.time - G.lastFlash[side] >= COMBAT.flashMinGap - 1e-9) { fx.muzzle(x, P.z * VIEW.depthK + h, dir, side === 'rifle' ? 'rifle' : 'pistol'); G.lastFlash[side] = G.time; }
  if (side === 'rifle') fx.casing(P.x + dir * 0.25, P.z * VIEW.depthK + h - 0.02, dir);
}
function shoot(weapon, side, pierce, action, m) {
  const B = COMBAT.bullets;
  if (pierce) {
    if (action && !action.wCharged) { G.cd.w = COMBAT.skills.w.cooldown; action.wCharged = true; }
    return fireBullet(weapon === 'rifle' ? B.pierceRifle : B.pierceDual, side, 'pierce', m);
  }
  if (weapon === 'rifle') {
    if (G.ammo <= 0 && !odActive()) return;
    if (!odActive()) G.ammo--;
    return fireBullet(B.rifleSingle, side, 'rifle', m);
  }
  fireBullet(B.pistol, side, 'pistol', m);
}
function actionTick(a) {
  const single = SETS[P.weapon]?.single;
  if (!single || a.clip !== single.clip) return;
  a.fired ??= [];
  COMBAT.singleShots[P.weapon].forEach((s, i) => {
    if (!a.fired[i] && a.t >= s.t - 1e-9) { a.fired[i] = true; shoot(P.weapon, s.side, a.tag === 'pierce', a, muzzleAt(s.side, a.clip, s.t)); }
  });
}
function updateAuto(dt) {
  if (!P.autoFire) { G.autoOn = false; G.autoAcc = 0; return; }
  const w = P.weapon, clip = SETS[w].auto, rate = fireRate();
  if (w === 'dual') {
    const D = COMBAT.dualAuto;
    if (!G.autoOn) { G.autoOn = true; P.clock = 0; }
    const t0 = P.clock, t1 = t0 + dt * rate;
    for (let k = Math.floor(t0 / D.loop); k * D.loop < t1; k++) for (const cue of D.cues) {
      const t = k * D.loop + cue.t;
      if (t >= t0 - 1e-9 && t < t1 - 1e-9) fireBullet(COMBAT.bullets.pistol, cue.side, 'pistol', muzzleAt(cue.side, clip, cue.t));
    }
    return;
  }
  const interval = COMBAT.autoInterval * (odActive() ? COMBAT.skills.e.intervalScale : 1);
  if (!G.autoOn) { G.autoOn = true; G.autoAcc = interval; } else G.autoAcc += dt;
  const m = muzzleAt('rifle', clip, P.clock + dt * rate);
  let n = 0;
  while (G.autoAcc >= interval - 1e-9 && n < COMBAT.maxCatchUp) {
    if (G.ammo <= 0 && !odActive()) { G.autoAcc = 0; break; }
    if (!odActive()) G.ammo--;
    fireBullet(COMBAT.bullets.rifleAuto, 'rifle', 'auto', m);
    G.autoAcc -= interval; n++;
  }
  if (G.autoAcc >= interval) G.autoAcc %= interval;
}

// ---------- damage
function damageTarget(e, amount, src) {
  if (e.dying) return;
  let mult = 1 + Math.min(COMBAT.chain.maxStacks, G.chain.n) * COMBAT.chain.step;
  if (src.kind === 'pistol' && Math.abs(P.x - e.x) <= COMBAT.pointBlank.range) mult *= COMBAT.pointBlank.mult;
  if (e.cfg.front && src.dir) mult *= src.dir === -e.facing ? (src.ignoreFront ? 1 : e.cfg.front) : e.cfg.back;     // brute: face vs back (소총 F 근접 확정 ignores the face)
  if (e.type === 'boss' && e.state === 'stunned') mult *= ENEMY.boss.charge.stunMult;
  const dmg = Math.max(1, Math.round(amount * mult));
  e.hp -= dmg; e.damaged = true; e.flash = ENEMY.flash;
  const weak = mult >= 1.45, armored = mult < 0.6;
  fx.number(e.x, e.z * VIEW.depthK + (e.type === 'boss' ? 1.4 : 0.8), dmg, armored ? '#9aa3a8' : weak ? '#ffe08a' : '#ffffff');
  if (src.hitstop) hitstop(src.hitstop);
  if (e.type !== 'boss') {
    const kb = src.knockback * (e.cfg.scale > 1.2 ? 0.4 : 1);
    if (kb && !(e.state === 'attack' && e.t < (e.cfg.windup ?? 0) && !src.stagger)) { e.kbV = (src.dir || 1) * kb / ENEMY.knockbackTime; e.kbT = ENEMY.knockbackTime; }
    if (src.stagger && !(e.cfg.front && src.dir === -e.facing && !src.ignoreFront)) {    // a hit that staggers interrupts the windup
      e.stagger = src.stagger * (e.cfg.scale > 1.2 ? 0.5 : 1);
      if (e.state === 'attack' && e.t < (e.cfg.windup ?? 0)) { e.state = 'walk'; e.cd = 0.8; }
    }
  }
  if (e.hp <= 0) {
    e.hp = 0; e.dying = e.type === 'boss' || src.explode ? 'explode' : 'death'; e.dieT = 0;
    G.run.kills++; G.chain.n++; G.chain.t = COMBAT.chain.window; G.run.bestChain = Math.max(G.run.bestChain, G.chain.n);
    hitstop(e.type === 'boss' ? 0.1 : COMBAT.hitstop.kill); shake(e.type === 'boss' ? 0.12 : 0.02, e.type === 'boss' ? 0.6 : 0.1);
    if (src.explode || e.type === 'boss') explode(e);
    if (e.type === 'boss') {                                          // 권고 10항: the brood dies with its mother
      for (const o of living()) { o.hp = 0; o.dying = 'explode'; o.dieT = 0; o.exploded = true; fx.explosion(o.x, o.z * VIEW.depthK + 0.3); }
      G.globs.length = 0;
    }
  }
}
function explode(e) {
  if (e.exploded) return; e.exploded = true;
  fx.explosion(e.x, e.z * VIEW.depthK + 0.3);
  for (const o of living()) if (o !== e && Math.hypot(o.x - e.x, (o.z - e.z) * 1.5) <= COMBAT.explodeRadius)
    damageTarget(o, COMBAT.explodeDamage, { dir: Math.sign(o.x - e.x) || 1, knockback: 0, explode: true });
}

// ---------- enemies
function updateEnemy(e, dt) {
  if (e.dying) { e.dieT += dt; e.flash = Math.max(0, e.flash - dt); return; }
  e.flash = Math.max(0, e.flash - dt); e.cd = Math.max(0, e.cd - dt);
  if (e.kbT > 0) { const s = Math.min(dt, e.kbT); e.x += e.kbV * s; e.kbT -= s; keepInRoom(e); }
  if (G.mode !== 'room') { e.state = 'walk'; return; }
  if (e.pin > 0) { e.pin -= dt; return; }                              // 인터셉트 pin (brute): facing and action held
  if (e.stagger > 0) { e.stagger -= dt; return; }
  const c = e.cfg, dx = P.x - e.x, dz = P.z - e.z;
  if (e.state === 'attack') {
    const prev = e.t; e.t += dt;
    if (c.ranged) {
      if (prev < c.windup && e.t >= c.windup) spit(e, c.glob, c.damage, [P.z]);
    } else if (prev < c.windup) {
      const move = c.lunge / c.windup * (Math.min(e.t, c.windup) - prev);
      e.x += e.facing * Math.min(move, Math.max(0, dx * e.facing - ENEMY.minGap));
      // lands once at the end of the windup, in front of the attacker (stepping behind a brute dodges it); a roll
      // through the attacker still meets it, so the roll's invulnerability blocks it (완벽 회피 possible)
      const front = (P.x - e.x) * e.facing > -ENEMY.behind || !!P.roll || G.rollInv > 0;
      if (e.t >= c.windup && Math.abs(P.x - e.x) < c.hitRange && front
          && Math.abs(P.z - e.z) < PLAYER.hitDz + 0.06 * c.scale) hitPlayer(c.damage, e);
    }
    if (e.t >= c.attackTime - 1e-9) { e.state = 'walk'; e.cd = c.cooldown * (0.8 + rand() * 0.4); e.animT = 0; }
    return;
  }
  if (dx) e.facing = dx > 0 ? 1 : -1;
  let mx = 0, mz = 0;
  if (c.ranged) {
    const d = Math.abs(dx);
    if (d < c.keep[0]) mx = -e.facing; else if (d > c.keep[1]) mx = e.facing;
    // 권고 17항: stay inside the screen so it can be shot (on-screen rules use the capped halfW)
    const off = e.x - G.camera.x, inner = G.halfW - c.stayIn;
    if (Math.abs(off) > inner) mx = -Math.sign(off);
    else if (mx && Math.abs(off + mx * c.speed * dt) > inner) mx = 0;
    if (Math.abs(dz) > 0.4) mz = Math.sign(dz) * 0.5;
    if (e.cd <= 0 && d <= c.keep[1] + 0.6 && onScreen(e)) { e.state = 'attack'; e.t = 0; return; }
  } else {
    if (Math.abs(dx) > c.range) mx = e.facing;
    if (Math.abs(dz) > 0.12) mz = Math.sign(dz);
    if (Math.abs(dx) <= c.range + 1e-9 && Math.abs(dz) <= 0.3 && e.cd <= 0) { e.state = 'attack'; e.t = 0; return; }
  }
  e.x += mx * c.speed * dt; e.z += mz * c.zSpeed * dt;
  if (mx || mz) e.animT += dt;
  e.z = clamp(e.z, 0.03, DEPTH.max - 0.03);
  keepInRoom(e);
}
const keepInRoom = e => { if (G.room) e.x = clamp(e.x, -ENEMY.outside, G.room.def.length + ENEMY.outside); };
const onScreen = e => Math.abs(e.x - G.camera.x) < G.halfW - 0.3;
function spit(e, glob, damage, zs) {
  const h = e.type === 'boss' ? 0.9 : 0.45;
  for (const tz of zs) {
    const dist = Math.max(0.5, Math.abs(P.x - e.x)), tt = dist / glob.speed;
    G.globs.push({ x: e.x + e.facing * 0.4 * (e.cfg.scale ?? 1), z: e.z, h, vx: e.facing * glob.speed, vz: (clamp(tz, 0, DEPTH.max) - e.z) / tt,
                   damage, t: 0, life: glob.life ?? 2.6, size: glob.size, from: e });
  }
}
function updateGlobs(dt) {
  for (const g of G.globs) {
    g.t += dt; g.x += g.vx * dt; g.z = clamp(g.z + g.vz * dt, 0, DEPTH.max); g.h = Math.max(0.2, g.h - dt * 0.08);
    if (Math.abs(g.x - P.x) < 0.28 && Math.abs(g.z - P.z) < 0.26 && G.mode === 'room') {
      if (hitPlayer(g.damage, g)) { g.dead = true; fx.impact(g.x, g.z * VIEW.depthK + g.h, -Math.sign(g.vx)); }
      else if (!P.roll && G.rollInv <= 0) g.dead = true;
    }
    if (g.t >= g.life) g.dead = true;
  }
  for (let i = G.globs.length - 1; i >= 0; i--) if (G.globs[i].dead) G.globs.splice(i, 1);
}
function separate() {
  const live = living();
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j], dx = b.x - a.x, dz = (b.z - a.z) * 2, d = Math.hypot(dx, dz), min = ENEMY.separation * ((a.cfg.scale + b.cfg.scale) / 2);
    if (d >= min || d === 0) continue;
    const push = (min - d) * 0.25 / d;
    a.x -= dx * push; b.x += dx * push; a.z -= dz * push / 2; b.z += dz * push / 2;
  }
}
const enemyGone = e => e.dying === 'death' ? e.dieT >= ENEMY.death.frames / ENEMY.death.fps + ENEMY.death.hold + ENEMY.death.fade
  : e.dying === 'explode' && e.dieT >= ENEMY.explode.frames / ENEMY.explode.fps;

// ---------- boss: 군집 모체 (swipe / spit fan / telegraphed charge then stunned / summons at 70 % and 40 %)
function spawnBoss() {
  const B = ENEMY.boss, L = G.room.def.length;
  G.boss = { id: nextId++, type: 'boss', cfg: B, x: G.room.lock.right - 1.5, z: DEPTH.max / 2, hp: B.hp, maxHp: B.hp, facing: -1, state: 'intro', t: 0, animT: 0,
             rest: 1.0, n: 0, flash: 0, dying: null, dieT: 0, summoned: 0, exploded: false, damaged: true };
}
function updateBoss(dt) {
  const b = G.boss; if (!b) return;
  const B = ENEMY.boss, L = G.room.def.length;
  const aL = (G.room.lock?.left ?? 0) + 1, aR = (G.room.lock?.right ?? L) - 1;   // arena bounds (boss half width 1.0)
  b.flash = Math.max(0, b.flash - dt);
  if (b.dying) { b.dieT += dt; return; }
  if (G.mode !== 'room') return;
  const phase2 = b.hp / b.maxHp < B.phase2, sp = phase2 ? B.phase2Speed : 1;
  const dx = P.x - b.x, dz = P.z - b.z;
  b.t += dt * (b.state === 'stunned' || b.state === 'charge' ? 1 : sp);
  if (b.state === 'intro') { if (b.t >= B.intro - 1e-9) { b.state = 'walk'; b.t = 0; } return; }
  if (b.state === 'walk') {
    if (dx) b.facing = dx > 0 ? 1 : -1;
    const want = Math.abs(dx) - B.keepX;
    b.x += Math.sign(want) * (Math.abs(want) > 0.3 ? 1 : 0) * b.facing * B.speed * sp * dt;
    b.z += Math.sign(dz) * (Math.abs(dz) > 0.15 ? 1 : 0) * B.zSpeed * sp * dt;
    b.animT += dt;
    b.rest -= dt * sp;
    if (b.rest <= 0) {
      b.n++; b.t = 0;
      const threshold = B.summon.at[b.summoned];
      if (threshold != null && b.hp / b.maxHp < threshold) { b.state = 'summon'; b.summoned++; }
      else if (b.n % 3 === 0) { b.state = 'charge'; b.dir = Math.sign(dx) || b.facing; b.facing = b.dir; b.dist = 0; b.hit = false; b.dashing = false; }
      else if (Math.abs(dx) <= B.swipe.range + 0.4 && Math.abs(dz) < 0.6) b.state = 'swipe';
      else b.state = 'spit';
    }
  } else if (b.state === 'swipe') {
    const S = B.swipe;
    if (!b.swung && b.t >= S.windup) {
      b.swung = true; shake(0.03);
      if (Math.abs(P.x - b.x) < S.range && Math.abs(P.z - b.z) < 0.6 && (P.x - b.x) * b.facing > -0.3) hitPlayer(S.damage, b);
    }
    if (b.t >= S.time) endBossMove(b);
  } else if (b.state === 'spit') {
    const S = B.spit;
    if (!b.spat && b.t >= S.windup) {
      b.spat = true;
      const n = phase2 ? S.count + 2 : S.count, zs = Array.from({ length: n }, (_, i) => P.z + (i - (n - 1) / 2) * S.spread);
      spit(b, { speed: S.speed, size: S.size, life: 3 }, S.damage, zs);
    }
    if (b.t >= S.time) endBossMove(b);
  } else if (b.state === 'charge') {
    const C = B.charge;
    if (b.t < C.telegraph / sp) { b.z += clamp(dz, -1, 1) * 0.25 * dt; return; }    // telegraph: drawn as a red lane
    b.dashing = true;
    const step = C.speed * dt;
    b.x += b.dir * step; b.dist += step; b.animT += dt * 3;
    // judged once, on the first overlap: a roll (or any invulnerability) uses it up
    if (!b.hit && Math.abs(P.x - b.x) < B.half && Math.abs(P.z - b.z) < C.hitDz) { b.hit = true; hitPlayer(C.damage, b); }
    const wall = b.x < aL || b.x > aR;
    if (b.dist >= C.distance || wall) {
      b.x = clamp(b.x, aL, aR); b.state = 'stunned'; b.t = 0; shake(wall ? 0.08 : 0.04, 0.3);
      popup(b.x, 2.0, '약점 노출!', '#ffe08a');
    }
  } else if (b.state === 'stunned') {
    if (b.t >= B.charge.stun) endBossMove(b);
  } else if (b.state === 'summon') {
    if (!b.called && b.t >= 0.6) {
      b.called = true; shake(0.05, 0.3);
      B.summon.list.forEach((type, i) => spawnEnemy(type, i % 2 ? 'left' : 'right', [0.2, 0.8, 0.5][i % 3]));
    }
    if (b.t >= 1.2) endBossMove(b);
  }
  b.x = clamp(b.x, aL, aR); b.z = clamp(b.z, 0.1, DEPTH.max - 0.1);
}
function endBossMove(b) { Object.assign(b, { state: 'walk', t: 0, rest: ENEMY.boss.rest, swung: false, spat: false, called: false, dashing: false }); }

// ---------- bullets: swept segment against hit boxes (x) with the bullet's depth at the entry point
function updateBullets(dt) {
  const H = ENEMY.hitbox;
  for (const b of G.bullets) {
    if (b.fade >= 0) { b.fade -= dt; if (b.fade <= 0) b.dead = true; continue; }
    const s = b.spec, travelled = (b.x - b.startX) * b.dir;
    let step = s.speed * dt, ending = false;
    if (travelled + step >= s.range) { step = Math.max(0, s.range - travelled); ending = true; }
    const owner = b.hitFrom, from = owner ?? b.x, to = b.x + b.dir * step;
    b.hitFrom = null;
    const lo = Math.min(from, to), hi = Math.max(from, to), hits = [];
    const along = x => (x - b.startX) * b.dir;                       // distance travelled at x
    for (const e of targets()) {
      const half = e.type === 'boss' ? e.cfg.half : H.half * e.cfg.scale;
      if (b.hitIds.has(e.id) || e.x + half < lo || e.x - half > hi) continue;
      if (owner != null && (e.x - owner) * b.dir < 0) continue;
      // the part of this frame's path inside the hit box; the bullet's depth changes along it, so take the first
      // point within the depth tolerance (independent of the frame rate)
      const a0 = b.dir > 0 ? Math.max(lo, e.x - half) : Math.min(hi, e.x + half), a1 = b.dir > 0 ? Math.min(hi, e.x + half) : Math.max(lo, e.x - half);
      const z0 = bulletZ(b, along(a0)), z1 = bulletZ(b, along(a1));
      const tol = e.type === 'boss' ? e.cfg.hitDz : COMBAT.hitDz * e.cfg.scale;
      const d0 = Math.abs(z0 - e.z), crosses = (z0 - e.z) * (z1 - e.z) <= 0;
      if (d0 > tol && !crosses && Math.abs(z1 - e.z) > tol) continue;
      let entry = a0;
      if (d0 > tol) { const k = (d0 - tol) / Math.max(1e-9, Math.abs(z1 - z0)); entry = a0 + (a1 - a0) * Math.min(1, k); }
      hits.push({ e, entry, zAt: bulletZ(b, along(entry)) });
    }
    hits.sort((p, q) => (p.entry - q.entry) * b.dir);
    b.x = to; b.z = clamp(bulletZ(b, along(to)), -0.2, DEPTH.max + 0.2);
    for (const { e, entry, zAt } of hits) {
      if (e.dying) continue;
      b.hitIds.add(e.id);
      const src = { dir: b.dir, kind: b.kind, knockback: s.knockback, stagger: s.stagger, explode: s.explode, hitstop: b.hitstopOverride ?? s.hitstop };
      // 소총 F 근접 확정: within 1.4 of where Lian fired, the brute's face is ignored and the F cooldown refunds 3 s (once per use)
      if (b.tag === 'slide' && Math.abs(e.x - b.originX) <= SKILLS.rifleF.close + 1e-9) {
        src.ignoreFront = true;
        if (b.skill && !b.skill.refunded) { b.skill.refunded = true; G.cd.rifleF = Math.max(0, G.cd.rifleF - SKILLS.rifleF.refund); }
      }
      damageTarget(e, s.damage * b.dmgMult, src);
      // 쌍권총 D: a kill by this use cuts the dual F cooldown by 2 s (once per use, not after a roll cancel)
      if (b.tag === 'intercept' && e.dying && b.skill && !b.skill.killRefunded && !b.skill.canceled) {
        b.skill.killRefunded = true; G.cd.dualF = Math.max(0, G.cd.dualF - SKILLS.dualD.killRefund);
      }
      fx.impact(entry, zAt * VIEW.depthK + b.h, b.dir);
      if (b.pierceLeft > 0) { b.pierceLeft--; continue; }
      b.x = entry; b.z = zAt; b.dead = true; break;
    }
    if (!b.dead && ending) b.fade = COMBAT.bullets.fadeTime;
  }
  for (let i = G.bullets.length - 1; i >= 0; i--) if (G.bullets[i].dead) G.bullets.splice(i, 1);
}

// ---------- input
const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ShiftLeft', 'ShiftRight', 'KeyS']);
const BUFFERABLE = new Set(['Digit1', 'Numpad1', 'Digit2', 'Numpad2', 'KeyX', 'KeyA', 'KeyW', 'KeyR', 'KeyD', 'KeyF']);
function onKeyDown(event) {
  const code = event.code;
  if (MOVE_KEYS.has(code) || code === 'Space' || code === 'Enter') event.preventDefault?.();
  if (MOVE_KEYS.has(code)) keys.add(code);
  if (event.repeat) return;
  if (G.mode === 'map') return mapKey(code);
  if (G.mode === 'defeated' || G.mode === 'clear') { if (code === 'Enter' || code === 'NumpadEnter') newRun(); return; }
  if (G.mode !== 'room') return;
  if (code === 'Space' || code === 'KeyQ') return tryRoll();
  if (code === 'KeyE') return tryOverdrive();
  if (code === 'KeyD' || code === 'KeyF') return trySkillKey(code === 'KeyD' ? 'D' : 'F');
  if (!BUFFERABLE.has(code)) return;
  if (P.action || P.roll || P.skill) { if (!reloading()) G.buffer = { code, t: G.time }; return; }
  if (code === 'Digit1' || code === 'Numpad1') equip('rifle');
  else if (code === 'Digit2' || code === 'Numpad2') equip('dual');
  else if (code === 'KeyX') toggle();
  else if (code === 'KeyA' && P.weapon !== 'none' && !keys.has('KeyS')) single();
  else if (code === 'KeyR') { if (P.weapon === 'rifle' && G.ammo < COMBAT.rifleMag) startReload(); }
  else if (code === 'KeyW') tryPierce();
}
function onKeyUp(event) { if (MOVE_KEYS.has(event.code)) { keys.delete(event.code); event.preventDefault?.(); } }
function mapKey(code) {
  const M = G.map, n = M.choices.length;
  if (['ArrowUp', 'ArrowLeft'].includes(code)) M.sel = (M.sel + n - 1) % n;
  else if (['ArrowDown', 'ArrowRight'].includes(code)) M.sel = (M.sel + 1) % n;
  else if (['Enter', 'NumpadEnter', 'Space', 'KeyA'].includes(code)) enterRoom(M.choices[M.sel]);
}
addEventListener('keydown', onKeyDown);
addEventListener('keyup', onKeyUp);
addEventListener('blur', () => keys.clear());

// ---------- simulation step
const idleOf = () => (P.weapon !== 'none' && P.stance === 'aim' ? SETS[P.weapon].aimIdle : SETS[P.weapon].idle);
function frameOf(anim) {
  const m = G.sprites?.[anim]?.manifest; if (!m) return 0;
  if (P.action?.clip === anim) return Math.min(m.frameCount - 1, Math.floor(P.action.t * m.fps));
  if (anim === 'walk' || anim === 'run') return Math.min(m.frameCount - 1, Math.floor(P.phase * m.frameCount));
  return Math.floor(P.clock * m.fps) % m.frameCount;
}
function updateLian(dt) {
  const set = SETS[P.weapon], armed = P.weapon !== 'none', R = G.room;
  const fireHeld = keys.has('KeyS') && !P.roll && !P.skill && G.mode === 'room';
  if (armed && fireHeld && !P.action && P.weapon === 'rifle' && G.ammo <= 0 && !odActive()) startReload();
  if (armed && fireHeld && !P.action && P.stance === 'ready') aimThen();
  const autoFire = armed && fireHeld && !P.action && P.stance === 'aim';
  P.autoFire = autoFire;
  const standing = !!P.action || autoFire || !!P.skill || G.mode !== 'room';
  const ix = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0), iz = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
  const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
  const tx = standing ? 0 : ix * (running ? PLAYER.run : PLAYER.walk), tz = standing ? 0 : iz * (running ? PLAYER.depthRun : PLAYER.depthWalk);
  const approach = (v, t) => { const rate = Math.abs(t) > Math.abs(v) ? PLAYER.accel : PLAYER.decel, d = t - v; return v + Math.sign(d) * Math.min(Math.abs(d), rate * dt); };
  if (P.roll || P.skill) { P.vx = 0; P.vz = 0; } else { P.vx = approach(P.vx, tx); P.vz = approach(P.vz, tz); }
  if (!standing && ix) P.facing = ix; else if (standing && ix && G.mode === 'room' && !P.skill) P.facing = ix;   // a skill owns the facing
  P.x += P.vx * dt; P.z += P.vz * dt;
  updateRoll(dt);
  updateSkill(dt);
  if (P.knock) {
    const k = P.knock, T = PLAYER.knockbackTime; k.t = Math.min(T, k.t + dt);
    const target = PLAYER.knockback * (1 - (1 - k.t / T) ** 2); P.x += k.dir * (target - k.done); k.done = target;
    if (k.t >= T) P.knock = null;
  }
  const { lo, hi } = playerBounds();
  P.x = clamp(P.x, lo, hi); P.z = clamp(P.z, 0.02, DEPTH.max - 0.02);

  const speed = Math.max(Math.abs(P.vx), Math.abs(P.vz) * 0.9);
  if (armed && !P.action && !P.skill && speed > PLAYER.runSwitch) P.stance = 'ready';
  if (armed && !P.action && !P.skill && !autoFire && P.stance === 'aim' && speed < 0.04) {
    P.still += dt; if (P.still >= PLAYER.aimHold) { P.still = 0; readyThen(); }
  } else if (!P.action) P.still = 0;
  let anim;
  if (P.roll) anim = set.run;
  else if (P.skill && !P.action) anim = P.skill.clip;                  // skill clips: own play rate, frames from P.clock
  else if (P.action) {
    const a = P.action; a.t += dt * a.speed; anim = a.clip;
    actionTick(a);
    if (a.t >= a.end) { P.action = null; a.done?.(); anim = P.action ? P.action.clip : idleOf(); }
  } else if (autoFire) anim = set.auto;
  else anim = speed < 0.04 ? idleOf() : speed > PLAYER.runSwitch && set.run ? set.run : (armed && P.stance === 'aim' && set.aimWalk) || set.walk;
  if (anim !== P.anim) { P.anim = anim; P.phase = 0; P.clock = 0; }
  updateAuto(dt);
  const m = G.sprites?.[anim]?.manifest;
  if (!m) return;
  if (P.roll) { if (anim === 'run') P.phase = (P.phase + PLAYER.roll.animRate * dt * m.fps / m.frameCount) % 1; else P.clock += dt * PLAYER.roll.animRate; }
  else if (anim === 'walk' || anim === 'run') P.phase = (P.phase + speed * dt / ((anim === 'run' ? PLAYER.run : PLAYER.walk) * m.frameCount / m.fps)) % 1;
  else if (anim === set.walk || anim === set.aimWalk || anim === set.run) P.clock += dt * Math.max(0.3, speed / (anim === set.run ? PLAYER.run : PLAYER.walk));
  else P.clock += dt * (P.skill && !P.action ? P.skill.rate : autoFire ? fireRate() : 1);
}
// bounds: room ends, screen lock while a group is alive, floor depth (also the 인터셉트 landing limits)
function playerBounds() {
  const R = G.room, L = R?.def.length ?? 20;
  let lo = 0.4, hi = L - 0.4;
  if (R?.lock) { lo = Math.max(lo, R.lock.left + 0.35); hi = Math.min(hi, R.lock.right - 0.35); }
  if (R && !R.cleared && !R.def.boss) hi = Math.min(hi, L - 1.0);
  return { lo, hi };
}
function updateBuffer() {
  const b = G.buffer; if (!b) return;
  if (G.time - b.t > COMBAT.inputBuffer + 1e-9) { G.buffer = null; return; }
  if (!P.action && !P.roll && !P.skill) { G.buffer = null; onKeyDown({ code: b.code, repeat: false }); }
}

function step(dt) {
  if (!G.sprites) return;
  G.banner && (G.banner.t -= dt);
  for (const p of G.popups) p.t += dt;
  G.popups = G.popups.filter(p => p.t < p.life);
  if (G.mode === 'map') { G.map.t += dt; return; }
  if (G.mode === 'defeated') G.deathT = (G.deathT ?? 0) + dt;
  G.shakeT = Math.max(0, G.shakeT - dt);
  if (G.hitstop > 0) { G.hitstop = Math.max(0, G.hitstop - dt); return; }     // hit stop: the world holds a moment
  G.time += dt;
  if (G.mode === 'room') G.run.time += dt;
  for (const k of Object.keys(G.cd)) G.cd[k] = Math.max(0, G.cd[k] - dt);
  for (const k of ['overdrive', 'hitInv', 'rollInv', 'hitFlash', 'vignette', 'witch', 'slowMark']) G[k] = Math.max(0, (G[k] ?? 0) - dt);
  G.chain.t = Math.max(0, G.chain.t - dt); if (G.chain.t <= 0) G.chain.n = 0;
  // 완벽 회피 (G.witch) or 일제사격 marking (G.slowMark): enemies, globs and the boss at 30 %, Lian and bullets not.
  // The two are separate timers and never multiply (both 0.3).
  const worldSlow = G.witch > 0 || G.slowMark > 0;
  const edt = dt * (G.witch > 0 ? PLAYER.roll.witchScale : G.slowMark > 0 ? SKILLS.slowScale : 1);
  for (const list of [G.skillGhosts, G.sfx]) for (let i = list.length - 1; i >= 0; i--) { list[i].t += dt; if (list[i].t >= list[i].life) list.splice(i, 1); }
  if (G.mode === 'room' || G.mode === 'clear') updateLian(dt);
  updateBuffer();
  for (const e of G.enemies) {                                        // 선회 style reward: per-enemy slow (not the boss), not stacked on the world slow
    const slowed = e.slow > 0 && !e.dying;
    if (e.slow > 0) e.slow = Math.max(0, e.slow - dt);
    updateEnemy(e, worldSlow ? edt : slowed ? dt * SKILLS.slowScale : dt);
  }
  separate();
  updateBoss(edt);
  updateGlobs(edt);
  updateBullets(dt);
  for (let i = G.enemies.length - 1; i >= 0; i--) if (enemyGone(G.enemies[i])) G.enemies.splice(i, 1);
  if (G.mode === 'room') updateRoom(dt);
  fx.update(dt);
  G.hpLag = G.hpLag > G.hp ? Math.max(G.hp, G.hpLag - 25 * dt) : G.hp;
  if (G.room && !G.room.lock) G.camera.x += (clampCamera(P.x) - G.camera.x) * Math.min(1, dt * 5);
}

// ---------- loop
const renderer = createRenderer({ canvas, ctx, G, P, fx, frameOf, living, odActive, reloading, bulletZ, skillInfo });
let last = null, manual = false;          // ?debug: once a test calls __s1.step, the real-time loop only draws
function tick(now) {
  const dt = last == null ? 0 : Math.min(0.05, (now - last) / 1000); last = now;
  renderer.measure(); if (!manual) step(dt); renderer.draw();
  requestAnimationFrame(tick);
}
const loaded = load().then(() => true, err => { statusEl.textContent = `불러오기 실패: ${err.message}`; console.error(err); return false; });
requestAnimationFrame(tick);

if (new URL(location.href).searchParams.has('debug')) window.__s1 = {
  G, P, keys, fx, config: { VIEW, DEPTH, PLAYER, COMBAT, ENEMY, ROOMS, MAP },
  step(dt = 1 / 30, n = 1) { manual = true; for (let i = 0; i < n; i++) { renderer.measure(); step(dt); } return G.mode; },
  resume() { manual = false; last = null; },                       // back to the real-time loop
  draw() { renderer.measure(); renderer.draw(); },
  key(code) { onKeyDown({ code, repeat: false }); }, up(code) { onKeyUp({ code }); },
  enter: id => enterRoom(id), newRun, spawn: (type, side = 'ahead', zf = 0.5) => spawnEnemy(type, side, zf), skillInfo,
  ready: loaded,                                                   // resolves when the sprites are in (also in a hidden window)
  get loaded() { return !!G.sprites && G.mode !== 'loading'; },
};
