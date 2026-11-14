// Stage 1 tuning and data (STAGE1_DESIGN.md). World units: 1.0 = the character's height (~1.65 m), as the sprites.
// Positions: x along the room (0 = left end), z = depth across the floor (0 = front edge, bottom of the screen,
// DEPTH.max = back edge), h = height above the floor.

export const SPRITE_PPM = 200;                 // sprite pixels per unit (manifest_200)
export const VIEW = {
  unitsOnScreen: 3.2,                          // vertical units visible (the character is ~1/3 of the screen)
  frontY: 0.88,                                // canvas height fraction of the floor's front edge (z = 0)
  depthK: 0.42,                                // one unit of depth is drawn this many units high (flattened floor)
  halfWCap: 3.2,                               // 권고 16항: lock / spawn / on-screen rules use min(visible half width, 3.2)
  halfWFallback: 1.6 * 16 / 9,                 // used while the window reports no size (hidden window): 16:9
  offscreen: 0.3,                              // 권고 6항: targets beyond camera ±(halfW + 0.3) are not hit and not aimed at
};
export const DEPTH = { max: 1.8 };             // floor depth band (units): ~1/4 of the screen tall

const LIAN4 = '/art/characters/clone_01/motion/glb_model_001/sprite_004/';
const LIAN5 = '/art/characters/clone_01/motion/glb_model_001/sprite_005/';
const LIAN6 = '/art/characters/clone_01/motion/glb_model_001/sprite_006/';
const LIAN7 = '/art/characters/clone_01/motion/glb_model_001/sprite_007/';
const IN5 = new Set(['rifle_down_to_aim', 'rifle_aim_to_down', 'dual_ready_to_aim', 'dual_aim_to_ready', 'dual_pull_out', 'dual_put_away']);
const IN6 = new Set(['rifle_walk', 'rifle_run', 'dual_walk_basic']);
const IN7 = new Set(['dual_idle_high', 'dual_pull_out', 'dual_put_away', 'dual_ready_to_aim', 'dual_aim_to_ready']);
export const LIAN = {
  base: clip => IN7.has(clip) ? LIAN7 : IN6.has(clip) ? LIAN6 : IN5.has(clip) ? LIAN5 : LIAN4,
  clips: ['idle', 'walk', 'run', 'rifle_idle', 'rifle_aim_idle', 'shoot_rifle', 'rifle_pull_out', 'rifle_put_away', 'gunplay', 'rifle_full_auto',
    'rifle_down_to_aim', 'rifle_aim_to_down', 'dual_idle_high', 'dual_idle', 'dual_walk', 'dual_run', 'dual_fire', 'dual_pull_out', 'dual_put_away',
    'dual_ready_to_aim', 'dual_aim_to_ready', 'rifle_walk', 'rifle_run', 'dual_walk_basic', 'rifle_reload', 'rifle_reload_empty'],
  muzzleAnchors: '/art/characters/clone_01/motion/glb_model_001/stage_measure_001/muzzle_anchors.json',
};
// per weapon (same flow as the movement prototype): 기본 대기 / 사격 대기, walks, run, draw, holster, raise, lower, shots
export const SETS = {
  none: { idle: 'idle', walk: 'walk', run: 'run' },
  rifle: { idle: 'rifle_idle', aimIdle: 'rifle_aim_idle', walk: 'rifle_walk', aimWalk: 'shoot_rifle', run: 'rifle_run', draw: 'rifle_pull_out', holster: 'rifle_put_away',
           raise: 'rifle_down_to_aim', lower: 'rifle_aim_to_down', single: { clip: 'gunplay' }, auto: 'rifle_full_auto', label: 'AR-12' },
  dual: { idle: 'dual_idle_high', aimIdle: 'dual_idle', walk: 'dual_walk_basic', aimWalk: 'dual_walk', run: 'dual_run', draw: 'dual_pull_out', holster: 'dual_put_away',
          raise: 'dual_ready_to_aim', lower: 'dual_aim_to_ready', single: { clip: 'dual_fire', duration: 0.5 }, auto: 'dual_fire', label: 'HP-14T' },
};
export const TRANSITIONS = new Set(['rifle_pull_out', 'rifle_put_away', 'dual_pull_out', 'dual_put_away',
  'rifle_down_to_aim', 'rifle_aim_to_down', 'dual_ready_to_aim', 'dual_aim_to_ready']);
export const TRANSITION_SPEED = 4;             // connecting clips 4x (user request 2026-11-13)

export const PLAYER = {
  hp: 100,
  walk: 0.69, run: 2.25,                       // ground speeds measured from the bare clips (feet stay planted)
  depthWalk: 0.75, depthRun: 1.35,             // speed across the floor depth
  accel: 6, decel: 9, runSwitch: 1.3,
  aimHold: 5,                                  // s still in 사격 대기 before lowering to 기본 대기
  hitInvuln: 0.8, knockback: 0.35, knockbackTime: 0.2, hitDz: 0.32,
  roll: { time: 0.30, speed: 5.4, invuln: 0.34, cooldown: 0.55, animRate: 2.2, ghostEvery: 0.05, ghosts: 4, ghostLife: 0.18,
          perfectWindow: 0.25, witchTime: 1.4, witchScale: 0.3 },   // 완벽 회피: enemies at 30 % speed for 1.4 s, rifle refilled
};

export const COMBAT = {
  seed: 20261114,
  rifleMag: 40, reloadSpeed: 1.5,
  // aim assist: a shot bends toward the nearest enemy ahead within maxDz of depth (score = dx + dz x zWeight)
  assist: { maxDz: 0.85, zWeight: 3, maxVz: 12 },
  bullets: {
    rifleSingle: { damage: 26, speed: 22, range: 7, pierce: 1, knockback: 0.25, stagger: 0.35, explode: true, hitstop: 0.035, length: 0.35, width: 0.012, color: '#ffe9a8' },
    rifleAuto: { damage: 6, speed: 22, range: 6.5, pierce: 0, knockback: 0.02, stagger: 0, explode: false, hitstop: 0, length: 0.35, width: 0.012, color: '#ffe9a8' },
    pistol: { damage: 9, speed: 18, range: 4.5, pierce: 0, knockback: 0.05, stagger: 0.12, explode: false, hitstop: 0, length: 0.22, width: 0.010, color: '#a9dcff' },
    pierceRifle: { damage: 110, speed: 30, range: 10, pierce: Infinity, knockback: 0.6, stagger: 0.6, explode: true, hitstop: 0.06, length: 1.2, width: 0.05, color: '#e8f6ff' },
    pierceDual: { damage: 60, speed: 30, range: 10, pierce: Infinity, knockback: 0.6, stagger: 0.6, explode: true, hitstop: 0.06, length: 1.2, width: 0.05, color: '#e8f6ff' },
    // v1.3 무기 스킬 (19.8). Note: `pierce` here counts the enemies a bullet passes THROUGH (0 = stops at the first hit,
    // 1 = hits 2). The design's "pierce 1" means "hits 1 enemy", so it is written as 0 here; the slide shot gets
    // pierce 1 (= 2 enemies) only while 완벽 회피 slow is on (game.js).
    rifleVolley: { damage: 40, speed: 30, range: 12, pierce: 0, knockback: 0.25, stagger: 0.35, explode: true, hitstop: 0, length: 0.5, width: 0.016, color: '#ffd24a' },
    rifleSlide: { damage: 40, speed: 26, range: 7, pierce: 0, knockback: 0.9, stagger: 0.6, explode: true, hitstop: 0.035, length: 0.45, width: 0.02, color: '#ffe08a' },
    fadeTime: 0.05,
  },
  hitDz: 0.3,                                  // bullet vs enemy depth tolerance (scaled by the enemy's size)
  pointBlank: { range: 1.4, mult: 1.8 },       // 쌍권총 근접 사격 보너스: pushes the pistols toward close range
  autoInterval: 0.08, maxCatchUp: 3,           // rifle 750 RPM
  singleShots: { rifle: [{ t: 2.5 / 30, side: 'rifle' }], dual: [{ t: 0, side: 'right' }, { t: 0.25, side: 'left' }] },
  dualAuto: { loop: 1.0, cues: [{ t: 0, side: 'right' }, { t: 0.25, side: 'left' }, { t: 0.5, side: 'right' }, { t: 0.75, side: 'left' }] },
  muzzle: { rifle: { forward: 0.52, height: 0.74 }, right: { forward: 0.48, height: 0.84 }, left: { forward: 0.54, height: 0.82 } },
  flashMinGap: 0.04,
  chain: { window: 3.0, step: 0.05, maxStacks: 10 },   // 연속 처치: +5 % damage per kill within 3 s, up to +50 %, reset when hit
  hitstop: { kill: 0.045, playerHit: 0.08, max: 0.1 },
  skills: { w: { cooldown: 8 }, e: { cooldown: 20, time: 5, intervalScale: 0.6, playRate: 1.6 } },
  explodeRadius: 0.9, explodeDamage: 20,
  inputBuffer: 0.3,
  roomHeal: 20,
  roomRefill: true,                            // rifle magazine refilled on entering a room (권고 11항)
};

// v1.3 무기 스킬 (STAGE1_DESIGN.md 19장). Times are world time (frozen by hit stop, not slowed by the slow motion).
export const SKILLS = {
  link: 0.70,                                  // 구르기 연계 창: roll start + 0.30 (roll) + 0.4
  slowScale: 0.3,                              // world slow while marking (same scale as 완벽 회피, never multiplied)
  ghostLife: 0.3, maxGhosts: 6,                // skill after-images (separate pool from the roll's)
  rifleD: { name: '일제사격', popup: 'VOLLEY', cooldown: 12, ammo: 4, mark: 0.6, markLink: 0.35, odScale: 0.6, marks: 4, marksBonus: 6, perEnemy: 3,
            interval: 0.06, tail: 0.12, witchMult: 1.25, cancelCd: 6, lastHitstop: 0.05, shake: 0.02, animRate: 1.6, trail: 0.15, flash: 1.9 },
  rifleF: { name: '슬라이드', popup: 'SLIDE', cooldown: 6, ammo: 2, distance: 1.5, depthDistance: 0.9, time: 0.25, invuln: 0.2, close: 1.4, refund: 3,
            animRate: 1.6, shake: 0.04, ghostEvery: 0.05, ghosts: 4, flash: 1.9 },
  dualD: { name: '인터셉트', popup: 'INTERCEPT', cooldown: 7, cooldownLink: 5, range: 3.5, rangeLink: 5.0, move: 0.18, invuln: 0.25, offset: 0.7,
           bossOffset: 1.2, minGap: 0.5, bossGap: 1.05, pin: 0.45, shots: 8, shotsOd: 12, burst: 0.4, interval: 0.05, intervalOd: 0.033,
           retargetFrom: 3, killRefund: 2, runRate: 3, fireRate: 2, ghosts: 6, trail: 0.25 },   // retargetFrom: 0-based shot index (= the 4th shot)
  dualF: { name: '선회', popup: 'ORBIT', cooldown: 10, time: 0.8, invuln: 0.3, invulnLink: 0.6, hits: 8, interval: 0.1, segment: 0.2, range: 3.0, maxDz: 0.9,
           finisher: { damage: 30, radius: 1.2, zScale: 1.5, knockback: 0.5, stagger: 0.5 }, styleCount: 3, slow: 0.8, animRate: 1.6, shake: 0.05, hitstop: 0.04 },
};

export const ENEMY = {
  base: '/art/enemies/vesper_colony_insect/motion/glb_model_001/sprite_001/',
  clips: ['walk', 'walk_fast', 'pounce', 'pounce_fast', 'death', 'explode'],
  hitbox: { half: 0.45, top: 0.85 },
  flash: 0.08, separation: 0.55, minGap: 0.3, knockbackTime: 0.1, walkAnimRate: 2.5,
  outside: 0.8,                                // enemies stay within x -0.8 .. length + 0.8 (they walk in from behind the end walls)
  behind: 0.3,                                 // a pounce only lands on Lian in front of the attacker (or up to 0.3 behind its centre)
  death: { frames: 20, fps: 12, hold: 0.8, fade: 0.5 }, explode: { frames: 35, fps: 12 },
  telegraph: '#ff5a3c',
  types: {
    // pounce: walks into range (x and depth), windup with a lunge, the hit lands at `windup`
    normal: { label: '군집충', hp: 40, speed: 0.8, zSpeed: 0.5, walk: 'walk', attack: 'pounce', attackTime: 18 / 12, range: 1.3, windup: 0.92,
              hitRange: 1.0, damage: 14, lunge: 0.4, cooldown: 1.2, scale: 1, filter: '', bar: '#62d15a' },
    fast: { label: '돌진충', hp: 24, speed: 1.7, zSpeed: 0.9, walk: 'walk_fast', attack: 'pounce_fast', attackTime: 10 / 12, range: 1.4, windup: 0.5,
            hitRange: 1.0, damage: 10, lunge: 0.5, cooldown: 0.8, scale: 1, filter: 'hue-rotate(28deg) saturate(1.8) brightness(1.15)', bar: '#ff9a3a' },
    // spitter: keeps its distance, rears up and spits an acid glob aimed at Lian's depth
    // 권고 17항: keeps 2.0-3.2 away and stays inside the screen (camera ±(halfW - stayIn)) so it can always be shot
    spitter: { label: '산성충', hp: 30, speed: 0.7, zSpeed: 0.6, walk: 'walk', attack: 'pounce', attackTime: 1.0, windup: 0.6, keep: [2.0, 3.2], stayIn: 0.5,
               damage: 10, cooldown: 2.2, glob: { speed: 3.4, life: 2.2, size: 0.07 }, scale: 0.9,
               filter: 'hue-rotate(230deg) saturate(1.7) brightness(1.1)', bar: '#c58cff', ranged: true },
    // brute: hard front carapace (front hits x0.35), soft back (x1.5): roll behind it
    brute: { label: '갑각충', hp: 150, speed: 0.55, zSpeed: 0.4, walk: 'walk', attack: 'pounce', attackTime: 18 / 12, range: 1.5, windup: 1.0,
             hitRange: 1.25, damage: 22, lunge: 0.5, cooldown: 1.6, scale: 1.4, front: 0.35, back: 1.5,
             filter: 'grayscale(.5) brightness(.75) contrast(1.4)', bar: '#c9c2a8' },
  },
  boss: {
    label: '군집 모체', hp: 1100, scale: 2.3, speed: 0.45, zSpeed: 0.35, half: 1.0, top: 1.6, hitDz: 0.6,
    filter: 'hue-rotate(-38deg) saturate(1.5) brightness(.85) contrast(1.15)', bar: '#e2563f',
    keepX: 3.0,
    swipe: { range: 2.0, windup: 0.75, time: 1.3, damage: 20 },
    spit: { windup: 0.7, time: 1.2, count: 3, spread: 0.75, speed: 3.6, damage: 12, size: 0.11 },
    charge: { telegraph: 0.9, speed: 7.5, distance: 6, damage: 24, stun: 1.4, stunMult: 1.6, hitDz: 0.55 },
    summon: { at: [0.7, 0.4], list: ['fast', 'fast', 'spitter'] },
    rest: 0.9, phase2: 0.5, phase2Speed: 1.35, intro: 2.2, clearDelay: 2.2,
  },
};

// Rooms: x 0..length. Groups trigger when Lian passes `at`; the screen locks until the group is cleared.
// spawn: [type, side ('right' = off the right screen edge, 'left', 'ahead' = inside the screen ahead of Lian), depth z (0..1 of the band)]
export const ROOMS = {
  landing: { name: '수송선 착륙지', goal: '소탕', length: 20, theme: 'hangar', groups: [
    { at: 3, spawn: [['normal', 'right', 0.3], ['normal', 'right', 0.7], ['normal', 'right', 0.5]] },
    { at: 10, spawn: [['normal', 'right', 0.2], ['fast', 'right', 0.8], ['normal', 'left', 0.5], ['fast', 'right', 0.5]] },
    { at: 15, spawn: [['spitter', 'right', 0.8], ['normal', 'right', 0.3], ['normal', 'right', 0.6]] },
  ] },
  canal: { name: '외곽 농장 수로', goal: '소탕', tag: '적 다수', length: 24, theme: 'farm', groups: [
    { at: 3, spawn: [['normal', 'right', 0.2], ['normal', 'right', 0.5], ['normal', 'right', 0.8], ['fast', 'left', 0.5]] },
    { at: 10, spawn: [['fast', 'right', 0.3], ['fast', 'right', 0.7], ['normal', 'left', 0.2], ['normal', 'left', 0.8], ['spitter', 'right', 0.5]] },
    { at: 17, spawn: [['brute', 'right', 0.5], ['normal', 'right', 0.2], ['normal', 'right', 0.8], ['fast', 'left', 0.5]] },
  ] },
  refinery: { name: '정제소 배관 구역', goal: '소탕', tag: '원거리 위주', length: 22, theme: 'refinery', groups: [
    { at: 3, spawn: [['spitter', 'right', 0.2], ['spitter', 'right', 0.8], ['normal', 'right', 0.5]] },
    { at: 10, spawn: [['spitter', 'right', 0.5], ['normal', 'left', 0.3], ['normal', 'left', 0.7], ['fast', 'right', 0.2]] },
    { at: 16, spawn: [['spitter', 'right', 0.15], ['spitter', 'right', 0.85], ['brute', 'right', 0.5]] },
  ] },
  tunnel: { name: '군집 통로', goal: '소탕', length: 26, theme: 'hive', groups: [
    { at: 3, spawn: [['fast', 'right', 0.2], ['fast', 'right', 0.5], ['fast', 'right', 0.8]] },
    { at: 9, spawn: [['brute', 'right', 0.5], ['spitter', 'right', 0.15], ['normal', 'left', 0.5]] },
    { at: 16, spawn: [['normal', 'right', 0.3], ['normal', 'right', 0.7], ['fast', 'left', 0.2], ['fast', 'left', 0.8], ['spitter', 'right', 0.5]] },
    { at: 22, spawn: [['brute', 'left', 0.5], ['fast', 'right', 0.5]] },
  ] },
  warehouse: { name: '붕괴한 창고', goal: '소탕', tag: '돌진충 무리', length: 22, theme: 'hangar', groups: [
    { at: 3, spawn: [['fast', 'right', 0.2], ['fast', 'right', 0.5], ['fast', 'left', 0.8], ['fast', 'right', 0.8]] },
    { at: 10, spawn: [['fast', 'right', 0.3], ['fast', 'right', 0.7], ['fast', 'left', 0.3], ['fast', 'left', 0.7], ['normal', 'right', 0.5]] },
    { at: 16, spawn: [['brute', 'right', 0.5], ['fast', 'left', 0.2], ['fast', 'left', 0.8]] },
  ] },
  acid: { name: '산성 웅덩이 지대', goal: '소탕', tag: '갑각충', length: 22, theme: 'refinery', groups: [
    { at: 3, spawn: [['brute', 'right', 0.5], ['spitter', 'right', 0.2]] },
    { at: 11, spawn: [['brute', 'right', 0.3], ['normal', 'left', 0.7], ['spitter', 'right', 0.85]] },
    { at: 16, spawn: [['fast', 'right', 0.25], ['fast', 'left', 0.75], ['spitter', 'right', 0.5]] },
  ] },
  nest: { name: '군집 모체의 둥지', goal: '보스', length: 16, theme: 'hive', boss: true, groups: [] },
};

// Branching map (tactical view from the transport): columns left to right, pick one of the linked rooms each step.
export const MAP = {
  nodes: {
    landing: { col: 0, row: 0, next: ['canal', 'refinery'] },
    canal: { col: 1, row: -1, next: ['tunnel'] },
    refinery: { col: 1, row: 1, next: ['tunnel'] },
    tunnel: { col: 2, row: 0, next: ['warehouse', 'acid'] },
    warehouse: { col: 3, row: -1, next: ['nest'] },
    acid: { col: 3, row: 1, next: ['nest'] },
    nest: { col: 4, row: 0, next: [] },
  },
  start: 'landing',
};
