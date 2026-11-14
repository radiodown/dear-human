// Lian combat stage for the movement prototype (STAGE_DESIGN.md v1).
// move.js keeps the movement / weapon / stance flow and only calls the hooks below; this file owns the stage state,
// waves, enemies, bullets, skills (Q·W·E), reload and the canvas HUD. Effects are drawn by stage-fx.js.
// The logic is deterministic: spawn order and effect randomness come from a fixed seed and only `dt` drives time,
// so `?debug` tests can step it with window.__move.stage.step(1/30).
//
// Hooks used by move.js:
//   keyDown(event) -> true if the stage consumed the key (Enter, R, Q, W, E, buffered keys, input lock)
//   locked()       -> true while dead or dashing (no movement / firing input)
//   beforeAuto()   -> S held with a weapon and no action: start an automatic reload when the rifle is empty
//   actionTick(action, prevClipTime) -> fires the single-shot / W bullets at their clip times
//   fireRate()     -> firing clip playback rate (E overdrive 1.6)
//   update(dt), drawWorld(ctx, view), drawFront(ctx, view), playerLook(view), shake()

import { createFx, drawBullet, mulberry32 } from './stage-fx.js';

export const STAGE_CONFIG = {
  seed: 20261114,
  level: { left: -12, right: 12 },
  readyTime: 2, restTime: 3, bannerTime: 1.5, restHeal: 15,
  maxAlive: 6, spawnOffset: 4.5, spawnGap: 0.9,
  // sides: 'right' = player.x + offset only, 'alternate' = right, left, right, ... per spawned enemy
  waves: [
    { normal: 4, fast: 0, interval: 1.5, batch: 1, sides: 'right' },
    { normal: 4, fast: 2, interval: 1.5, batch: 1, sides: 'alternate' },
    { normal: 5, fast: 3, interval: 1.5, batch: 1, sides: 'alternate' },
    { normal: 6, fast: 4, interval: 2.0, batch: 2, sides: 'alternate' },
    { normal: 8, fast: 6, interval: 1.2, batch: 1, sides: 'alternate' },
  ],
  player: { hp: 100, hitInvuln: 1.0, blinkHz: 10, blinkAlpha: 0.4, knockback: 0.5, knockbackTime: 0.25,
            deathFall: 0.6, deathAngle: -85, deathAlpha: 0.4, hitFlash: 0.1, vignette: 0.2, shake: 0.04, shakeTime: 0.15,
            hpLagRate: 25 },                                       // red HP trail shrinks 25 HP/s (25 % of max)
  bullets: {
    rifleSingle: { damage: 24, speed: 22, range: 6, pierce: 1, knockback: 0.2, explode: true, length: 0.35, width: 0.012, color: '#ffe9a8' },
    // pounceKnockback false (design v1.1): no knockback on an enemy in its pounce (attack start up to the hit), so
    // an enemy that started its pounce still reaches Lian under full auto; damage, flash and slow display stay.
    // walkKnockback (director, QA 1): knockback on a walking enemy (0.02, was 0.04); knockback stays for other states
    rifleAuto: { damage: 6, speed: 22, range: 6, pierce: 0, knockback: 0.04, walkKnockback: 0.02, pounceKnockback: false, explode: false, length: 0.35, width: 0.012, color: '#ffe9a8' },
    pistol: { damage: 9, speed: 18, range: 4, pierce: 0, knockback: 0.04, pounceKnockback: false, explode: false, length: 0.22, width: 0.010, color: '#a9dcff' },
    pierceRifle: { damage: 100, speed: 30, range: 9, pierce: Infinity, knockback: 0.5, explode: true, length: 1.2, width: 0.05, color: '#e8f6ff' },
    pierceDual: { damage: 55, speed: 30, range: 9, pierce: Infinity, knockback: 0.5, explode: true, length: 1.2, width: 0.05, color: '#e8f6ff' },
    fadeTime: 0.05,
  },
  fire: {
    autoInterval: { rifle: 0.08 },                                 // rifle 750 RPM (time accumulator)
    maxCatchUp: 3,                                                 // rifle shots one frame may add after a long frame
    // shot clip times = measured recoil starts (stage_measure_001), accumulated in clip time (E overdrive plays the
    // clip 1.6x, so they come sooner in real time). gunplay: sprite frame 2.5 = 0.083 s; the clip still plays 0.63 s.
    singleShots: { rifle: [{ t: 2.5 / 30, side: 'rifle' }], dual: [{ t: 0, side: 'right' }, { t: 0.25, side: 'left' }] },
    // dual full auto follows the dual_fire loop clock (30 frames = 1.0 s): one shot as the clip time passes each cue
    dualAuto: { loop: 1.0, cues: [{ t: 0, side: 'right' }, { t: 0.25, side: 'left' }, { t: 0.5, side: 'right' }, { t: 0.75, side: 'left' }] },
    flashMinGap: 0.04,
  },
  // muzzle anchors (feet origin, units, +forward = facing, +up), content measurement stage_measure_001. The bullet
  // starts at the measured muzzle of the clip frame being shot (muzzleAnchors, sprite frame = floor(clip time x fps));
  // these representative values are used for other clips or when the file does not load.
  muzzle: { rifle: { forward: 0.52, height: 0.74 }, right: { forward: 0.48, height: 0.84 }, left: { forward: 0.54, height: 0.82 } },
  muzzleAnchors: '/art/characters/clone_01/motion/glb_model_001/stage_measure_001/muzzle_anchors.json',
  rifleMag: 40,
  reloadSpeed: 1.5,
  skills: {
    q: { cooldown: 4.0, time: 0.30, speed: 6, invuln: 0.45, animRate: 2, ghostEvery: 0.06, ghosts: 3, ghostAlpha: 0.4, ghostLife: 0.18 },
    w: { cooldown: 8.0 },
    e: { cooldown: 20, time: 5, intervalScale: 0.6, playRate: 1.6 },
  },
  inputBuffer: 0.3,
  enemy: {
    base: '/art/enemies/vesper_colony_insect/motion/glb_model_001/sprite_001/',
    clips: ['walk', 'walk_fast', 'pounce', 'pounce_fast', 'death', 'explode'],
    spritePpm: 200,
    scale: 1.0,                                                    // ENEMY_SCALE (content review: 1.0)
    // walk playback rate (types may override): the feet stay planted at 3.85 (walk) / 4.06 (walk_fast); 2.5 is the
    // compromise that avoids leg jitter on the fast walk and accepts some slide (stage_measure_001, user review)
    walkAnimRate: 2.5,
    hitbox: { half: 0.45, top: 0.85 },
    hpBar: { height: 0.75, width: 0.5, thick: 0.05 },
    flash: 0.08, slowTime: 0.15, slowFactor: 0.7,
    cancelWindow: 0.4, cancelDamage: 20, cancelCooldown: 1.0,
    separation: 0.6, separationShare: 0.25,                        // each of the pair moves 25 % = 50 % of the overlap a frame
    minGap: 0.3,                                                   // a lunge stops this far from Lian
    knockbackTime: 0.1,
    explodeRadius: 0.9, explodeDamage: 20,
    death: { frames: 20, fps: 12, hold: 1.0, fade: 0.5 }, explode: { frames: 35, fps: 12 },
    fallback: { width: 1.0, height: 0.55 },
    // hitRange 1.0 (design v1.1): attack range 1.3 / 1.4 minus the lunge 0.4 / 0.5 leaves 0.9 at the hit.
    // The lunge ignores the hit slow (slowFactor) so a slowed enemy still ends its windup inside hitRange.
    types: {
      normal: { hp: 40, speed: 0.8, walk: 'walk', attack: 'pounce', attackTime: 18 / 12, range: 1.3, windup: 0.92, hitRange: 1.0,
                damage: 18, lunge: 0.4, cooldown: 1.2, walkAnimRate: 2.5, filter: '', bar: '#62d15a', label: '군집충' },
      fast: { hp: 24, speed: 1.7, walk: 'walk_fast', attack: 'pounce_fast', attackTime: 10 / 12, range: 1.4, windup: 0.50, hitRange: 1.0,
              damage: 12, lunge: 0.5, cooldown: 0.8, walkAnimRate: 2.5, filter: 'hue-rotate(28deg) saturate(1.8) brightness(1.15)', bar: '#ff9a3a', label: '돌진충' },
    },
  },
};

const BUFFERABLE = new Set(['Digit1', 'Numpad1', 'Digit2', 'Numpad2', 'KeyX', 'KeyA', 'KeyW', 'KeyR']);
const STAGE_KEYS = new Set([...BUFFERABLE, 'KeyQ', 'KeyE', 'Enter', 'NumpadEnter']);
const DRAW_HOLSTER = new Set(['rifle_pull_out', 'rifle_put_away', 'dual_pull_out', 'dual_put_away']);
const RELOADS = new Set(['rifle_reload', 'rifle_reload_empty']);
const WEAPON_HUD = { rifle: 'AR-12', dual: 'HP-14T' };

// deps from move.js: { enabled, player, keys, camera, sets, play, aimThen, onKeyDown, update, frameInfo }
export function createStage(deps) {
  const C = STAGE_CONFIG, E = C.enemy;
  const { player, keys, camera } = deps;
  const fx = createFx(C.seed);
  const enemies = [], bullets = [], ghosts = [], explodeQueue = [];
  const S = {};
  let active = false, rand = mulberry32(C.seed), nextId = 1;
  const enemySprites = {}, failedClips = new Set();
  let enemyLoad = null, muzzleLoad = null, muzzleClips = null;
  const restartButton = document.getElementById('stage-restart');
  restartButton?.addEventListener('click', () => { restart(); restartButton.blur(); });

  const clampX = x => Math.min(C.level.right, Math.max(C.level.left, x));
  const living = () => enemies.filter(e => !e.dying);
  const reloading = () => RELOADS.has(player.action?.clip);
  const odActive = () => S.overdrive > 0;
  const skillPhaseOk = () => active && !S.dead && S.phase !== 'ready' && S.phase !== 'clear' && S.phase !== 'defeated';

  function loadEnemySprites() {
    if (enemyLoad) return enemyLoad;
    enemyLoad = Promise.all(E.clips.map(async clip => {
      try {
        const res = await fetch(`${E.base}${clip}/manifest_200.json`);
        if (!res.ok) throw new Error(`${res.status}`);
        const manifest = await res.json();
        const image = new Image(); image.src = `${E.base}${clip}/${manifest.spritesheet ?? 'spritesheet_200.webp'}`;
        await image.decode();
        enemySprites[clip] = { manifest, image };
      } catch (err) { failedClips.add(clip); console.warn(`적 스프라이트 ${clip} 불러오기 실패, 도형으로 대체`, err); }
    }));
    return enemyLoad;
  }

  // per-frame muzzle positions measured from the GLBs (stage_measure_001); the representative C.muzzle is the fallback
  function loadMuzzleAnchors() {
    muzzleLoad ??= fetch(C.muzzleAnchors).then(res => { if (!res.ok) throw new Error(`${res.status}`); return res.json(); })
      .then(json => { muzzleClips = json.clips ?? null; })
      .catch(err => console.warn('총구 앵커 불러오기 실패, 대표값 사용', err));
    return muzzleLoad;
  }
  const MUZZLE_GUN = { rifle: 'rifle', right: 'pistol_r', left: 'pistol_l' };
  // muzzle of `side` in sprite frame floor(t x fps) of `clip` (the frame on screen at clip time t)
  function muzzleAt(side, clip, t) {
    const c = clip && muzzleClips?.[clip], frames = c?.frames?.[MUZZLE_GUN[side]];
    if (!frames?.length || !(t >= 0)) return { ...C.muzzle[side], src: 'fallback' };
    const n = frames.length;
    let k = Math.floor(t * c.fps + 1e-6);
    k = c.loop ? k % n : Math.min(n - 1, k);
    const f = frames[k];
    return f ? { forward: f[0], height: f[1], src: `${clip}#${k}` } : { ...C.muzzle[side], src: 'fallback' };
  }

  function reset() {
    rand = mulberry32(C.seed); nextId = 1;
    enemies.length = 0; bullets.length = 0; ghosts.length = 0; explodeQueue.length = 0;
    fx.reset(C.seed);
    Object.assign(S, {
      phase: 'ready', phaseT: 0, time: 0, runTime: 0, wave: 0, banner: { text: 'READY', t: C.readyTime },
      hp: C.player.hp, hpLag: C.player.hp, hitInv: 0, dashInv: 0, hitFlash: 0, vignette: 0, shakeT: 0, knock: null,
      dead: false, deathT: 0, ammo: { rifle: C.rifleMag }, cd: { q: 0, w: 0, e: 0 }, overdrive: 0,
      autoOn: false, autoAcc: 0, lastFlash: { rifle: -1, right: -1, left: -1 },
      kills: 0, damageTaken: 0, spawned: 0, spawnedByWave: [], shots: 0, queue: [], spawnTimer: 0, due: 0, sideNext: 1,
      buffer: null, dash: null, holdSpawns: false, hits: 0,
    });
    Object.assign(player, { x: 0, vx: 0, facing: 1, weapon: 'rifle', last: 'rifle', stance: 'ready', action: null, anim: 'rifle_idle',
                            phase: 0, clock: 0, still: 0, dash: null, frozen: false, autoFire: false });
    camera.x = 0;
  }

  function start() {
    if (!deps.enabled) return;
    active = true; loadEnemySprites(); loadMuzzleAnchors(); reset();
  }
  function stop() {
    active = false;
    enemies.length = 0; bullets.length = 0; ghosts.length = 0; explodeQueue.length = 0; fx.reset(C.seed);
    Object.assign(player, { dash: null, frozen: false, autoFire: false });
    if (restartButton) restartButton.hidden = true;
  }
  function restart() { if (active) reset(); }

  // ---- waves
  function shuffled(list) {
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  function startWave(n) {
    const w = C.waves[n - 1];
    Object.assign(S, { phase: 'wave', phaseT: 0, wave: n, spawnTimer: 0, due: 0, sideNext: 1, banner: { text: `WAVE ${n}`, t: C.bannerTime } });
    S.queue = shuffled([...Array(w.normal).fill('normal'), ...Array(w.fast).fill('fast')]);
    S.spawnedByWave[n - 1] = { normal: 0, fast: 0, right: 0, left: 0 };
  }
  // try one side: player.x ± offset, then step outward until 0.9 from every living enemy
  function placeOn(side) {
    let x = player.x + side * C.spawnOffset;
    if (x < C.level.left || x > C.level.right) return null;
    for (let guard = 0; guard < 40; guard++) {
      const blocker = living().find(e => Math.abs(e.x - x) < C.spawnGap - 1e-9);
      if (!blocker) return x;
      x = blocker.x + side * C.spawnGap;
      if (x < C.level.left || x > C.level.right) return null;
    }
    return null;
  }
  function spawnEnemy(type, side) {
    const x = placeOn(side) ?? placeOn(-side) ?? clampX(player.x + side * C.spawnOffset);
    const cfg = E.types[type];
    const e = { id: nextId++, type, cfg, x, hp: cfg.hp, maxHp: cfg.hp, facing: player.x >= x ? 1 : -1, state: 'walk', t: 0, animT: 0,
                cd: 0, flash: 0, slow: 0, damaged: false, kbV: 0, kbT: 0, dying: null, dieT: 0, exploded: false, spawnX: x };
    enemies.push(e);
    S.spawned++;
    const rec = S.spawnedByWave[S.wave - 1];
    if (rec) { rec[type]++; rec[x >= player.x ? 'right' : 'left']++; }
    return e;
  }
  function updateWaves(dt) {
    S.phaseT += dt;
    if (S.phase === 'wave' || S.phase === 'rest') S.runTime += dt;
    if (S.phase === 'ready' && S.phaseT >= C.readyTime - 1e-9) startWave(1);
    else if (S.phase === 'rest' && S.phaseT >= C.restTime - 1e-9) startWave(S.wave + 1);
    else if (S.phase === 'wave') {
      const w = C.waves[S.wave - 1];
      if (!S.holdSpawns) {
        if (S.due === 0 && S.queue.length && S.spawnTimer <= 1e-9) { S.due = Math.min(w.batch, S.queue.length); S.spawnTimer += w.interval; }
        while (S.due > 0 && S.queue.length && living().length < C.maxAlive) {
          const side = w.sides === 'right' ? 1 : S.sideNext;
          if (w.sides !== 'right') S.sideNext = -S.sideNext;
          spawnEnemy(S.queue.shift(), side); S.due--;
        }
        if (!S.queue.length) S.due = 0;
        if (S.due === 0) S.spawnTimer -= dt;     // the interval waits while a backlog is held by the 6-alive cap
      }
      if (!S.queue.length && living().length === 0) {
        if (S.wave < C.waves.length) { S.phase = 'rest'; S.phaseT = 0; S.hp = Math.min(C.player.hp, S.hp + C.restHeal); }
        else { S.phase = 'clear'; S.phaseT = 0; S.banner = { text: 'STAGE CLEAR', t: Infinity }; }
      }
    }
  }
  const remaining = () => S.queue.length + living().length;

  // ---- Lian
  function hitPlayer(e) {
    if (S.dead || S.hitInv > 0 || S.dashInv > 0) return false;
    const P = C.player, dmg = e.cfg.damage;
    S.hp = Math.max(0, S.hp - dmg); S.damageTaken += dmg; S.hits++;
    S.hitInv = P.hitInvuln; S.hitFlash = P.hitFlash; S.vignette = P.vignette; S.shakeT = P.shakeTime;
    S.knock = { dir: Math.sign(player.x - e.x) || e.facing, t: 0, done: 0 };
    if (S.hp <= 0) die();
    return true;
  }
  function die() {
    Object.assign(S, { dead: true, phase: 'defeated', phaseT: 0, deathT: 0, dash: null, buffer: null, banner: { text: 'DEFEATED', t: Infinity } });
    Object.assign(player, { action: null, dash: null, frozen: true, vx: 0, autoFire: false });
  }
  function updateKnock(dt) {
    const k = S.knock; if (!k) return;
    const T = C.player.knockbackTime;
    k.t = Math.min(T, k.t + dt);
    const target = C.player.knockback * (1 - (1 - k.t / T) ** 2);   // decelerating
    player.x = clampX(player.x + k.dir * (target - k.done)); k.done = target;
    if (k.t >= T) S.knock = null;
  }

  // ---- firing
  // muzzle: where the shot leaves (muzzleAt for the clip / frame being shot)
  function fireBullet(spec, side, kind, muzzle = C.muzzle[side]) {
    const m = muzzle, dir = player.facing;
    const x = player.x + dir * m.forward, y = m.height;
    bullets.push({ kind, side, x, y, startX: x, startY: y, hitFrom: player.x, dir, speed: spec.speed, range: spec.range, damage: spec.damage,
                   pierceLeft: spec.pierce, knockback: spec.knockback, walkKnockback: spec.walkKnockback ?? spec.knockback,
                   pounceKnockback: spec.pounceKnockback !== false,
                   explode: spec.explode, length: spec.length, width: spec.width, muzzleSrc: m.src,
                   color: spec.color, hitIds: new Set(), fade: -1, dead: false, born: S.time });
    S.shots++;
    if (S.time - S.lastFlash[side] >= C.fire.flashMinGap - 1e-9) { fx.muzzle(x, y, dir, side === 'rifle' ? 'rifle' : 'pistol'); S.lastFlash[side] = S.time; }
    if (side === 'rifle') fx.casing(player.x + dir * 0.25, y - 0.02, dir);
  }
  function shoot(weapon, side, pierce, action, muzzle) {
    if (pierce) {
      if (action && !action.wCharged) { S.cd.w = C.skills.w.cooldown; action.wCharged = true; }   // cooldown from the first W shot
      return fireBullet(weapon === 'rifle' ? C.bullets.pierceRifle : C.bullets.pierceDual, side, 'pierce', muzzle);
    }
    if (weapon === 'rifle') {
      if (S.ammo.rifle <= 0 && !odActive()) return;
      if (!odActive()) S.ammo.rifle--;
      return fireBullet(C.bullets.rifleSingle, side, 'rifle', muzzle);
    }
    fireBullet(C.bullets.pistol, side, 'pistol', muzzle);
  }
  function actionTick(a, prev) {
    if (!active || S.dead) return;
    const single = deps.sets[player.weapon]?.single;
    if (!single || a.clip !== single.clip) return;
    a.fired ??= [];
    C.fire.singleShots[player.weapon].forEach((s, i) => {
      if (!a.fired[i] && a.t >= s.t - 1e-9) { a.fired[i] = true; shoot(player.weapon, s.side, a.tag === 'pierce', a, muzzleAt(s.side, a.clip, s.t)); }
    });
  }
  // full auto. The firing loop clip is drawn from player.clock, which move.js advances by dt x fireRate() right after
  // this update, so this frame covers loop time [clock, clock + dt x fireRate()).
  function updateAuto(dt) {
    if (!player.autoFire || S.dead) { S.autoOn = false; S.autoAcc = 0; return; }
    const w = player.weapon, clip = deps.sets[w].auto, rate = fireRate();
    if (w === 'dual') {                                    // shots at the dual_fire recoil starts, alternating right-left
      const D = C.fire.dualAuto;
      if (!S.autoOn) { S.autoOn = true; player.clock = 0; }   // the loop starts at the first right shot
      const t0 = player.clock, t1 = t0 + dt * rate;
      for (let k = Math.floor(t0 / D.loop); k * D.loop < t1; k++) for (const cue of D.cues) {
        const t = k * D.loop + cue.t;
        if (t >= t0 - 1e-9 && t < t1 - 1e-9) fireBullet(C.bullets.pistol, cue.side, 'pistol', muzzleAt(cue.side, clip, cue.t));
      }
      return;
    }
    const interval = C.fire.autoInterval[w] * (odActive() ? C.skills.e.intervalScale : 1);
    if (!S.autoOn) { S.autoOn = true; S.autoAcc = interval; }   // the first shot leaves right away
    else S.autoAcc += dt;
    const muzzle = muzzleAt('rifle', clip, player.clock + dt * rate);   // the frame shown after this update
    let n = 0;
    while (S.autoAcc >= interval - 1e-9 && n < C.fire.maxCatchUp) {
      if (S.ammo.rifle <= 0 && !odActive()) { S.autoAcc = 0; break; }
      if (!odActive()) S.ammo.rifle--;
      fireBullet(C.bullets.rifleAuto, 'rifle', 'auto', muzzle);
      S.autoAcc -= interval; n++;
    }
    if (S.autoAcc >= interval) S.autoAcc %= interval;   // drop what a very long frame could not catch up
  }
  function startReload() {
    const clip = S.ammo.rifle > 0 ? 'rifle_reload' : 'rifle_reload_empty';
    deps.play(clip, () => { S.ammo.rifle = C.rifleMag; player.stance = 'aim'; player.still = 0; }, undefined, C.reloadSpeed);
    player.action.tag = 'reload';
    S.buffer = null; S.autoOn = false; S.autoAcc = 0;
  }
  function beforeAuto() {
    if (!active || S.dead) return;
    if (player.weapon === 'rifle' && S.ammo.rifle <= 0 && !odActive()) startReload();
  }

  // ---- skills
  function tryDash() {
    if (!skillPhaseOk() || S.cd.q > 0 || S.dash) return;
    const a = player.action;
    if (a && (RELOADS.has(a.clip) || DRAW_HOLSTER.has(a.clip))) return;
    const Q = C.skills.q;
    const input = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
    const dir = input || player.facing;
    // cancels raise / lower / firing without calling their completion; the weapon stays, the stance ends as 기본 대기
    Object.assign(player, { facing: dir, action: null, stance: 'ready', still: 0, vx: 0, autoFire: false });
    S.dash = { dir, t: 0, ghostT: 0, animRate: Q.animRate };
    player.dash = S.dash;
    S.dashInv = Q.invuln; S.cd.q = Q.cooldown; S.buffer = null;
    fx.dust(player.x, dir);
  }
  function updateDash(dt) {
    const Q = C.skills.q;
    for (let i = ghosts.length - 1; i >= 0; i--) { ghosts[i].t += dt; if (ghosts[i].t >= Q.ghostLife) ghosts.splice(i, 1); }
    const d = S.dash; if (!d) return;
    const step = Math.min(dt, Q.time - d.t);
    player.x = clampX(player.x + d.dir * Q.speed * step);
    d.t += step; d.ghostT += dt;
    if (d.ghostT >= Q.ghostEvery - 1e-9) {
      d.ghostT -= Q.ghostEvery;
      const f = deps.frameInfo();
      if (f) { ghosts.push({ ...f, x: player.x, facing: player.facing, t: 0 }); while (ghosts.length > Q.ghosts) ghosts.shift(); }
    }
    if (d.t >= Q.time - 1e-9) {
      S.dash = null; Object.assign(player, { dash: null, vx: 0, stance: 'ready', still: 0 });
      fx.dust(player.x, -d.dir);
    }
  }
  function tryPierce() {
    if (!skillPhaseOk() || player.weapon === 'none' || S.cd.w > 0 || S.dash || player.action) return;
    const single = deps.sets[player.weapon].single;
    deps.aimThen(() => {
      deps.play(single.clip, () => { player.still = 0; }, single.duration, fireRate());
      player.action.tag = 'pierce';
    });
  }
  function tryOverdrive() {
    if (!skillPhaseOk() || player.weapon === 'none' || S.cd.e > 0 || reloading()) return;
    S.overdrive = C.skills.e.time; S.cd.e = C.skills.e.cooldown;
  }
  function tryReload() {
    if (player.weapon !== 'rifle' || S.ammo.rifle >= C.rifleMag || S.dead || S.dash || player.action) return;
    startReload();
  }
  const fireRate = () => (active && odActive() ? C.skills.e.playRate : 1);

  // ---- input
  function keyDown(event) {
    if (!active || !STAGE_KEYS.has(event.code)) return false;
    if (event.repeat) return true;
    const code = event.code;
    if (code === 'Enter' || code === 'NumpadEnter') { restart(); return true; }
    if (S.dead || S.dash) return true;                                    // input lock
    if (code === 'KeyQ') { tryDash(); return true; }
    if (code === 'KeyE') { tryOverdrive(); return true; }
    if (player.action) {
      if (!reloading()) S.buffer = { code, t: S.time };                   // buffered 0.3 s, never during a reload
      return true;
    }
    if (code === 'KeyR') { tryReload(); return true; }
    if (code === 'KeyW') { tryPierce(); return true; }
    if (code === 'KeyA' && player.weapon === 'rifle' && S.ammo.rifle <= 0 && !odActive() && !keys.has('KeyS')) { startReload(); return true; }
    return false;                                                         // 1 / 2 / X / A: move.js handles them
  }
  function updateBuffer() {
    const b = S.buffer; if (!b) return;
    if (S.time - b.t > C.inputBuffer + 1e-9) { S.buffer = null; return; }
    if (!player.action && !S.dash && !S.dead) { S.buffer = null; deps.onKeyDown({ code: b.code, repeat: false, preventDefault() {} }); }
  }

  // ---- enemies
  function startAttack(e) { e.state = 'attack'; e.t = 0; e.facing = player.x >= e.x ? 1 : -1; if (e.kbSoft) e.kbT = 0; }
  const inPounce = e => e.state === 'attack' && e.t < e.cfg.windup;   // attack start up to the hit
  function updateEnemy(e, dt) {
    if (e.dying) { e.dieT += dt; e.flash = Math.max(0, e.flash - dt); return; }   // the killing hit's flash ends too
    e.flash = Math.max(0, e.flash - dt); e.slow = Math.max(0, e.slow - dt); e.cd = Math.max(0, e.cd - dt);
    if (e.kbT > 0) { const step = Math.min(dt, e.kbT); e.x += e.kbV * step; e.kbT -= step; }
    if (S.dead) { if (e.state === 'attack') { e.state = 'walk'; e.animT = 0; } return; }   // stands in its walk pose
    const cfg = e.cfg, slowMul = e.slow > 0 ? E.slowFactor : 1;
    if (e.state === 'attack') {
      const prev = e.t; e.t += dt;
      if (prev < cfg.windup) {                                            // lunge during the windup, never past Lian
        const move = cfg.lunge / cfg.windup * (Math.min(e.t, cfg.windup) - prev);   // the hit slow does not shorten it
        const allowed = Math.max(0, (player.x - e.x) * e.facing - E.minGap);
        e.x += e.facing * Math.min(move, allowed);
        if (e.t >= cfg.windup && Math.abs(player.x - e.x) < cfg.hitRange) hitPlayer(e);
      }
      if (e.t >= cfg.attackTime - 1e-9) { e.state = 'walk'; e.cd = cfg.cooldown; e.animT = 0; }
      return;
    }
    const dx = player.x - e.x;
    if (dx !== 0) e.facing = dx > 0 ? 1 : -1;
    if (Math.abs(dx) > cfg.range + 1e-9) { e.x += e.facing * Math.min(cfg.speed * slowMul * dt, Math.abs(dx) - cfg.range); e.animT += dt; }   // stops at the attack range
    // in range (also when it got there this frame, so the next knockback cannot hold it just outside): attack, or wait
    // out the cooldown
    if (Math.abs(player.x - e.x) <= cfg.range + 1e-9 && e.cd <= 0) startAttack(e);
  }
  function separate() {
    const live = living().sort((a, b) => a.x - b.x || a.id - b.id);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j], gap = b.x - a.x;
      if (gap >= E.separation) break;
      const push = (E.separation - gap) * E.separationShare;
      a.x -= push; b.x += push;
    }
  }
  function damageEnemy(e, amount, src) {
    if (e.dying) return;
    e.hp -= amount; e.damaged = true; e.flash = E.flash; e.slow = E.slowTime;
    fx.number(e.x, E.hpBar.height + 0.05, amount, amount >= E.cancelDamage ? '#ffe08a' : '#ffffff');
    const kb = e.state === 'walk' && src.walkKnockback != null ? src.walkKnockback : src.knockback;
    if (kb && (src.pounceKnockback !== false || !inPounce(e))) {
      e.kbV = src.dir * kb / E.knockbackTime; e.kbT = E.knockbackTime; e.kbSoft = src.pounceKnockback === false;
    }
    if (e.state === 'attack' && amount >= E.cancelDamage && e.t <= e.cfg.windup * E.cancelWindow + 1e-9) {
      e.state = 'walk'; e.cd = E.cancelCooldown; e.animT = 0; e.cancelled = (e.cancelled ?? 0) + 1;
    }
    if (e.hp <= 0) {
      e.hp = 0; e.dying = src.explode ? 'explode' : 'death'; e.dieT = 0; S.kills++;
      if (src.explode) explodeQueue.push(e);
    }
  }
  function processExplosions() {
    while (explodeQueue.length) {                                        // queue, not recursion: each enemy explodes once
      const e = explodeQueue.shift();
      if (e.exploded) continue;
      e.exploded = true;
      fx.explosion(e.x, 0.3);
      for (const o of living()) if (o !== e && Math.abs(o.x - e.x) <= E.explodeRadius + 1e-9)
        damageEnemy(o, E.explodeDamage, { dir: Math.sign(o.x - e.x) || 1, knockback: 0, explode: true });
    }
  }
  const enemyGone = e => e.dying === 'death' ? e.dieT >= E.death.frames / E.death.fps + E.death.hold + E.death.fade
    : e.dying === 'explode' && e.dieT >= E.explode.frames / E.explode.fps;

  // ---- bullets: segment previous -> current position against the hit boxes, so fast bullets never tunnel
  function updateBullets(dt) {
    const H = E.hitbox;
    for (const b of bullets) {
      if (b.fade >= 0) { b.fade -= dt; if (b.fade <= 0) b.dead = true; continue; }
      const travelled = (b.x - b.startX) * b.dir;
      let step = b.speed * dt, ending = false;
      if (travelled + step >= b.range) { step = Math.max(0, b.range - travelled); ending = true; }
      // first frame: the segment starts at Lian (player.x) so an enemy standing between Lian and the muzzle is hit,
      // but only enemies whose centre is on the facing side; one behind Lian whose hit box reaches past her is not
      const owner = b.hitFrom, from = owner ?? b.x, to = b.x + b.dir * step;
      b.hitFrom = null;
      const lo = Math.min(from, to), hi = Math.max(from, to);
      const hits = [];
      if (b.y >= 0 && b.y <= H.top) for (const e of enemies) {
        if (e.dying || b.hitIds.has(e.id) || e.x + H.half < lo || e.x - H.half > hi) continue;
        if (owner != null && (e.x - owner) * b.dir < 0) continue;
        hits.push({ e, entry: b.dir > 0 ? Math.max(lo, e.x - H.half) : Math.min(hi, e.x + H.half) });
      }
      hits.sort((p, q) => (p.entry - q.entry) * b.dir);                 // nearest along the bullet first
      b.x = to;
      for (const { e, entry } of hits) {
        if (e.dying) continue;
        b.hitIds.add(e.id);
        damageEnemy(e, b.damage, { dir: b.dir, knockback: b.knockback, walkKnockback: b.walkKnockback, pounceKnockback: b.pounceKnockback, explode: b.explode });
        fx.impact(entry, b.y, b.dir);
        if (b.pierceLeft > 0) { b.pierceLeft--; continue; }
        b.x = entry; b.dead = true; break;
      }
      if (!b.dead && ending) b.fade = C.bullets.fadeTime;
    }
    processExplosions();
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].dead) bullets.splice(i, 1);
  }

  // ---- update
  function update(dt) {
    if (!active) return;
    S.time += dt;
    for (const k of ['q', 'w', 'e']) S.cd[k] = Math.max(0, S.cd[k] - dt);
    for (const k of ['overdrive', 'hitInv', 'dashInv', 'hitFlash', 'vignette', 'shakeT']) S[k] = Math.max(0, S[k] - dt);
    S.banner.t -= dt;
    if (S.dead) S.deathT += dt;
    updateDash(dt);
    updateKnock(dt);
    updateAuto(dt);
    updateBuffer();
    for (const e of enemies) updateEnemy(e, dt);
    separate();
    for (const e of living()) e.x = clampX(e.x);
    updateBullets(dt);
    for (let i = enemies.length - 1; i >= 0; i--) if (enemyGone(enemies[i])) enemies.splice(i, 1);
    if (!S.dead) updateWaves(dt);
    fx.update(dt);
    S.hpLag = S.hpLag > S.hp ? Math.max(S.hp, S.hpLag - C.player.hpLagRate * dt) : S.hp;
    if (restartButton) restartButton.hidden = !(S.phase === 'clear' || S.phase === 'defeated');
  }

  // ---- drawing
  function drawEnemy(ctx, view, e) {
    const cfg = e.cfg, sx = view.sx(e.x), gy = view.groundY;
    let clipName, frame, alpha = 1;
    if (e.dying === 'death') {
      clipName = 'death'; frame = Math.min(E.death.frames - 1, Math.floor(e.dieT * E.death.fps));
      const fadeStart = E.death.frames / E.death.fps + E.death.hold;
      if (e.dieT > fadeStart) alpha = Math.max(0, 1 - (e.dieT - fadeStart) / E.death.fade);
    } else if (e.dying === 'explode') { clipName = 'explode'; frame = Math.min(E.explode.frames - 1, Math.floor(e.dieT * E.explode.fps)); }
    else if (e.state === 'attack') { clipName = cfg.attack; frame = Math.floor(e.t * 12); }
    else { clipName = cfg.walk; frame = Math.floor(e.animT * 12 * (cfg.walkAnimRate ?? E.walkAnimRate)); }
    ctx.save();
    ctx.globalAlpha = alpha;
    if (!e.dying || e.dying === 'death') {                               // shadow
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath(); ctx.ellipse(sx, gy, view.ppu * 0.42 * E.scale, view.ppu * 0.04, 0, 0, Math.PI * 2); ctx.fill();
    }
    const filter = [cfg.filter, e.flash > 0 ? 'brightness(3.2)' : ''].filter(Boolean).join(' ');
    if (filter) ctx.filter = filter;
    const clip = enemySprites[clipName];
    if (clip) {
      const m = clip.manifest, n = m.frameCount;
      frame = m.loop ? ((frame % n) + n) % n : Math.min(n - 1, frame);
      const cols = m.columns, cw = m.crop.width, ch = m.crop.height, s = view.ppu / E.spritePpm * E.scale;
      ctx.setTransform(e.facing * s, 0, 0, s, sx, gy);
      ctx.drawImage(clip.image, (frame % cols) * cw, Math.floor(frame / cols) * ch, cw, ch, m.crop.x - m.originX, m.crop.y - m.groundY, cw, ch);
    } else {                                                             // missing clip: plain shape so the stage still plays
      const F = E.fallback, w = F.width * view.ppu * E.scale, h = F.height * view.ppu * E.scale * (e.dying ? 0.4 : 1);
      ctx.fillStyle = e.type === 'fast' ? '#b8642e' : '#7a4a3c';
      ctx.fillRect(sx - w / 2, gy - h, w, h);
    }
    ctx.restore();
  }
  function drawWorld(ctx, view) {
    if (!active) return;
    for (const e of enemies) if (e.dying) drawEnemy(ctx, view, e);      // corpses behind the living
    for (const e of enemies) if (!e.dying) drawEnemy(ctx, view, e);
  }
  function drawFront(ctx, view) {
    if (!active) return;
    for (const b of bullets) drawBullet(ctx, view, b);
    fx.draw(ctx, view);
    const B = E.hpBar;                                                   // enemy HP bars after the first damage
    for (const e of enemies) {
      if (e.dying || !e.damaged) continue;
      const w = B.width * view.ppu, h = Math.max(3, B.thick * view.ppu), x = view.sx(e.x) - w / 2, y = view.groundY - B.height * view.ppu;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = e.cfg.bar; ctx.fillRect(x, y, w * e.hp / e.maxHp, h);
    }
    if (S.vignette > 0) {
      const a = 0.45 * S.vignette / C.player.vignette, W = view.W, H = view.H;
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, 'rgba(200,20,20,0)'); g.addColorStop(1, `rgba(200,20,20,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    drawHud(ctx, view);
  }

  function text(ctx, str, x, y, size, color, align = 'left', weight = 600) {
    ctx.font = `${weight} ${size}px system-ui, "Malgun Gothic", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.strokeText(str, x, y);
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }
  function drawHud(ctx, view) {
    const d = view.dpr, W = view.W, H = view.H, P = C.player;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    // HP bar (16, 110) 260 x 18 CSS px, under the DOM HUD lines (lower when a narrow window wraps the help line)
    const domHud = document.querySelector('.hud')?.getBoundingClientRect();
    const hx = 16 * d, hy = Math.max(110, domHud ? domHud.bottom + 8 : 0) * d, hw = 260 * d, hh = 18 * d;
    const low = S.hp <= P.hp * 0.25 && !S.dead && Math.floor(S.time * 4) % 2 === 0;
    ctx.fillStyle = 'rgba(10,14,16,.75)'; ctx.fillRect(hx - 2 * d, hy - 2 * d, hw + 4 * d, hh + 4 * d);
    ctx.fillStyle = '#a3302a'; ctx.fillRect(hx, hy, hw * S.hpLag / P.hp, hh);
    ctx.fillStyle = low ? '#f0e6c8' : S.hp <= P.hp * 0.25 ? '#e0523f' : '#5fc46b'; ctx.fillRect(hx, hy, hw * S.hp / P.hp, hh);
    text(ctx, `HP ${Math.ceil(S.hp)}/${P.hp}`, hx + 8 * d, hy + hh / 2, 12 * d, '#ffffff');
    // weapon / ammo, reload bar, overdrive bar
    let y = hy + hh + 14 * d;
    const wpn = player.weapon === 'none' ? '맨손' : player.weapon === 'rifle' ? `${WEAPON_HUD.rifle} ${S.ammo.rifle}/${C.rifleMag}` : `${WEAPON_HUD.dual} ∞`;
    text(ctx, wpn + (odActive() && player.weapon === 'rifle' ? '  (각성: 탄 소모 없음)' : ''), hx, y, 13 * d,
      player.weapon === 'rifle' && S.ammo.rifle === 0 ? '#ff8b6b' : '#e8e3cf');
    if (reloading()) {
      const a = player.action; y += 14 * d;
      ctx.fillStyle = 'rgba(10,14,16,.75)'; ctx.fillRect(hx, y - 4 * d, 160 * d, 8 * d);
      ctx.fillStyle = '#f0d29c'; ctx.fillRect(hx, y - 4 * d, 160 * d * Math.min(1, a.t / a.end), 8 * d);
      text(ctx, '장전', hx + 168 * d, y, 11 * d, '#f0d29c');
    }
    if (odActive()) {
      y += 14 * d;
      ctx.fillStyle = 'rgba(10,14,16,.75)'; ctx.fillRect(hx, y - 4 * d, 160 * d, 8 * d);
      ctx.fillStyle = '#ff9a2a'; ctx.fillRect(hx, y - 4 * d, 160 * d * S.overdrive / C.skills.e.time, 8 * d);
      text(ctx, `각성 ${S.overdrive.toFixed(1)}초`, hx + 168 * d, y, 11 * d, '#ffb45a');
    }
    // wave line, top centre
    const top = S.phase === 'ready' ? `READY · ${Math.max(0, C.readyTime - S.phaseT).toFixed(1)}초`
      : S.phase === 'rest' ? `WAVE ${S.wave}/${C.waves.length} 클리어 · 다음 웨이브 ${Math.max(0, C.restTime - S.phaseT).toFixed(1)}초`
      : S.phase === 'wave' ? `WAVE ${S.wave}/${C.waves.length} · 남은 적 ${remaining()}`
      : S.phase === 'clear' ? 'STAGE CLEAR' : 'DEFEATED';
    text(ctx, top, W / 2, 24 * d, 15 * d, '#f0d29c', 'center', 700);
    drawSkills(ctx, d, H);
    // centre banner and results
    const banner = S.phase === 'ready' ? { text: 'READY', a: 1 } : S.banner.t > 0 && S.banner.text.startsWith('WAVE') ? { text: S.banner.text, a: Math.min(1, S.banner.t / 0.3) } : null;
    if (banner) { ctx.globalAlpha = banner.a; text(ctx, banner.text, W / 2, H * 0.32, 44 * d, '#f6e6c0', 'center', 800); ctx.globalAlpha = 1; }
    if (S.phase === 'clear' || S.phase === 'defeated') {
      const cx = W / 2, cy = H * 0.36, bw = 340 * d, bh = 130 * d;
      ctx.fillStyle = 'rgba(12,16,18,.82)'; ctx.fillRect(cx - bw / 2, cy - bh / 2, bw, bh);
      ctx.strokeStyle = S.phase === 'clear' ? '#f0d29c' : '#c0503f'; ctx.lineWidth = 2 * d; ctx.strokeRect(cx - bw / 2, cy - bh / 2, bw, bh);
      text(ctx, S.phase === 'clear' ? 'STAGE CLEAR' : 'DEFEATED', cx, cy - 34 * d, 30 * d, S.phase === 'clear' ? '#f6e6c0' : '#ff8070', 'center', 800);
      const m = Math.floor(S.runTime / 60), s = (S.runTime % 60).toFixed(1).padStart(4, '0');
      text(ctx, `시간 ${m}:${s} · 처치 ${S.kills} · 받은 피해 ${S.damageTaken}`, cx, cy + 6 * d, 14 * d, '#e8e3cf', 'center');
      text(ctx, 'Enter로 재시작', cx, cy + 34 * d, 13 * d, '#a9b8b6', 'center');
    }
    ctx.restore();
  }
  function drawSkills(ctx, d, H) {
    const size = 56 * d, gap = 10 * d, x0 = 16 * d, y0 = H - 16 * d - size - 10 * d;
    const a = player.action, busy = DRAW_HOLSTER.has(a?.clip) || reloading();
    const slots = [
      { key: 'Q', name: '스텝', cd: S.cd.q, max: C.skills.q.cooldown, usable: skillPhaseOk() && !S.dash && !busy },
      { key: 'W', name: '관통탄', cd: S.cd.w, max: C.skills.w.cooldown, usable: skillPhaseOk() && !S.dash && player.weapon !== 'none' && !reloading() },
      { key: 'E', name: '각성', cd: S.cd.e, max: C.skills.e.cooldown, usable: skillPhaseOk() && player.weapon !== 'none' && !reloading(), buff: S.overdrive / C.skills.e.time },
    ];
    slots.forEach((s, i) => {
      const x = x0 + i * (size + gap), y = y0, cx = x + size / 2, cy = y + size / 2;
      ctx.fillStyle = 'rgba(18,24,28,.85)'; ctx.fillRect(x, y, size, size);
      if (s.cd <= 0) text(ctx, s.key, cx, cy - 6 * d, 20 * d, '#f6e6c0', 'center', 800);
      text(ctx, s.name, cx, cy + 17 * d, 10 * d, '#c9cfc4', 'center');
      if (s.cd > 0) {                                                    // clockwise dark cover over the remaining part
        const frac = s.cd / s.max, start = -Math.PI / 2 + Math.PI * 2 * (1 - frac);
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
        ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, size, start, -Math.PI / 2 + Math.PI * 2); ctx.closePath(); ctx.fill();
        ctx.restore();
        text(ctx, s.key, x + 9 * d, y + 10 * d, 11 * d, '#f6e6c0', 'center', 800);
        text(ctx, s.cd.toFixed(1), cx, cy - 4 * d, 16 * d, '#ffffff', 'center', 800);
      } else if (!s.usable) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x, y, size, size); }
      ctx.strokeStyle = s.cd <= 0 && s.usable ? '#ffd27a' : '#3a4850'; ctx.lineWidth = (s.cd <= 0 && s.usable ? 2 : 1) * d;
      ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      if (s.buff > 0) { ctx.fillStyle = '#ff9a2a'; ctx.fillRect(x, y + size + 3 * d, size * s.buff, 4 * d); }
    });
  }

  function playerLook(view) {
    if (!active) return null;
    const P = C.player, Q = C.skills.q;
    let alpha = 1, rot = 0;
    if (S.dead) {
      const k = Math.min(1, S.deathT / P.deathFall);
      rot = P.deathAngle * Math.PI / 180 * (1 - (1 - k) ** 2);           // falls backward around the feet
      alpha = 1 - (1 - P.deathAlpha) * k;
    } else if (S.hitInv > 0 && Math.floor(S.hitInv * P.blinkHz * 2) % 2 === 1) alpha = P.blinkAlpha;
    const filter = [S.hitFlash > 0 ? 'sepia(1) saturate(7) hue-rotate(-50deg) brightness(1.05)' : '',
      odActive() ? `drop-shadow(0 0 ${3 * view.dpr}px #ff9a2a) drop-shadow(0 0 ${6 * view.dpr}px rgba(255,140,40,.8))` : ''].filter(Boolean).join(' ');
    return { alpha, rot, filter, ghosts: ghosts.map(g => ({ ...g, alpha: Q.ghostAlpha * (1 - g.t / Q.ghostLife) })) };
  }
  function shake() {
    if (!active || S.shakeT <= 0) return { x: 0, y: 0 };
    const a = C.player.shake * S.shakeT / C.player.shakeTime;
    return { x: Math.sin(S.time * 93) * a, y: Math.cos(S.time * 71) * a * 0.6 };
  }

  return {
    config: C,
    get active() { return active; },
    get state() { return S; },
    enemies, bullets, ghosts,
    get fx() { return fx.items; },
    get enemySpritesLoaded() { return Object.keys(enemySprites); },
    get failedClips() { return [...failedClips]; },
    get muzzleLoaded() { return !!muzzleClips; },
    muzzleAt,
    remaining,
    start, stop, restart,
    // full frame step (movement + weapons + stage), for ?debug tests without requestAnimationFrame
    step(dt = 1 / 30, frames = 1) { for (let i = 0; i < frames; i++) deps.update(dt); return S; },
    keyDown, locked: () => active && (S.dead || !!S.dash), beforeAuto, actionTick, fireRate,
    update, drawWorld, drawFront, playerLook, shake,
    debug: {
      spawn: (type = 'normal', x = player.x + 2) => { const e = spawnEnemy(type, 1); e.x = x; e.spawnX = x; e.facing = player.x >= x ? 1 : -1; return e; },
      holdSpawns: (on = true) => { S.holdSpawns = on; },
      clearEnemies: () => { enemies.length = 0; },
      startWave: n => startWave(n),
      setHp: hp => { S.hp = hp; S.hpLag = hp; },
    },
  };
}
