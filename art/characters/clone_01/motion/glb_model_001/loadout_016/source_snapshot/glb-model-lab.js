// GLB model tab: plays the animations stored in a rigged .glb with Three.js, seen from the model's right side.
// Three.js is imported only when the tab is opened, so the other tabs never load it.
// Each sample page picks its own model (MODELS); the 2D sprites rendered from version04 have their own tab (glb-sprite-lab.js).
import { GlbGunFx, firingCues } from './glb-gun-fx.js';
const $ = id => document.getElementById(id);
const THREE_URL = './vendor/three-0.187.0/build/three.module.js';
const LOADER_URL = './vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js';
const FX_URL = './glb-burst-fx.js';
export const MODELS = {
  clone_01: {
    // weapon loadouts (tools/glb_retarget/attach_weapon.py, loadout_002): stock on the shoulder pocket, both hands IK-baked onto grip/support, gun clips only
    loadouts: { ar12_rupture: { label: 'AR-12 럽처', url: '/art/characters/clone_01/motion/glb_model_001/loadout_016/clone_01_ar12_rupture.glb', file: 'clone_01_ar12_rupture.glb' }, hp14t_gemini: { label: 'HP-14T 제미니 (쌍권총)', url: '/art/characters/clone_01/motion/glb_model_001/loadout_011/clone_01_hp14t_gemini.glb', file: 'clone_01_hp14t_gemini.glb' } },
    url: '/art/characters/clone_01/motion/glb_model_001/source/version04.glb',
    file: 'version04.glb',
    labels: { rifle_full_auto: '풀오토 · 빠른 연사 (750 RPM)', rifle_reload: '소총 장전 · 탄창 교체', 'walk.001': '걷기', 'run.001': '달리기', 'dive.001': '다이브', 'scared_01.001': '겁먹음', 'idle.001': '대기 1', 'wait.001': '대기 2', peek_aim: '엄폐 조준', gunplay: '조준 사격', gunplay_auto: '연사', shoot_rifle: '이동 사격', rifle_idle: '소총 대기', rifle_aim_idle: '소총 조준 대기', pistol_idle2: '권총 대기', pistol_kneel_idle: '권총 앉아 대기', pistol_walk: '권총 걷기', pistol_run: '권총 달리기', dual_idle: '쌍권총 대기', dual_idle_high: '쌍권총 대기 2 · 총구 위로', dual_fire: '쌍권총 사격', dual_kneel_fire: '쌍권총 앉아 사격', dual_walk: '쌍권총 걷기', dual_run: '쌍권총 달리기', rifle_pull_out: '총 꺼내기', rifle_put_away: '총 집어넣기', rifle_aim_to_down: '조준 → 내림', rifle_walk_to_stop: '걷다 멈춤', stand_to_crouch: '서기 → 웅크리기', crouch_to_stand: '웅크리기 → 서기', rifle_stand_to_kneel: '서기 → 무릎', rifle_kneel_idle: '무릎 대기', rifle_kneel_to_stand: '무릎 → 서기', crouch_to_prone: '웅크리기 → 엎드리기', prone_fire: '엎드려 쏴', prone_to_crouch: '엎드리기 → 웅크리기' },
    once: { rifle_reload: .65 },
    // Clips kept in the GLB but hidden from the tab by user request (2026-11-09).
    hidden: ['캐릭터가 뛰게 해줘.001', '계속 반복해서 빠르게 달리는 동작.001'],
    hips: ['mixamorigHips', 'mixamorig:Hips'],
    target: .5, viewHeight: 1.3, // the model is about 1.0 tall
    note: '상위 폴더의 version04.glb를 복사해 Three.js로 그대로 재생합니다. 모델에 들어 있는 애니메이션을 탭으로 고르고, 카메라는 캐릭터의 오른쪽 옆에서 정사영으로 봅니다. ‘제자리’는 골반의 앞뒤·좌우 이동을 고정하고 위아래 움직임은 유지합니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
  iren: {
    // weapon loadouts (tools/glb_retarget/attach_weapon.py, loadout_002): stock on the shoulder pocket, both hands IK-baked onto grip/support, gun clips only
    loadouts: { ar12_rupture: { label: 'AR-12 럽처', url: '/art/characters/iren/motion/glb_model_001/loadout_007/iren_ar12_rupture.glb', file: 'iren_ar12_rupture.glb' }, sg23_breacher: { label: 'SG-23 브리처', url: '/art/characters/iren/motion/glb_model_001/loadout_007/iren_sg23_breacher.glb', file: 'iren_sg23_breacher.glb' } },
    url: '/art/characters/iren/motion/glb_model_001/source/iren_rig.glb',
    file: 'iren_rig.glb',
    labels: { 'walk.001': '걷기', 'run.001': '달리기', 'dive.001': '다이브', 'afraid.001': '겁먹음', 'idle.001': '대기 1', 'wait.001': '대기 2', peek_aim: '엄폐 조준', gunplay: '조준 사격', gunplay_auto: '연사', shoot_rifle: '이동 사격', rifle_idle: '소총 대기', rifle_aim_idle: '소총 조준 대기', pistol_idle2: '권총 대기', pistol_kneel_idle: '권총 앉아 대기', pistol_walk: '권총 걷기', pistol_run: '권총 달리기', rifle_pull_out: '총 꺼내기', rifle_put_away: '총 집어넣기', rifle_aim_to_down: '조준 → 내림', rifle_walk_to_stop: '걷다 멈춤', stand_to_crouch: '서기 → 웅크리기', crouch_to_stand: '웅크리기 → 서기', rifle_stand_to_kneel: '서기 → 무릎', rifle_kneel_idle: '무릎 대기', rifle_kneel_to_stand: '무릎 → 서기', crouch_to_prone: '웅크리기 → 엎드리기', prone_fire: '엎드려 쏴', prone_to_crouch: '엎드리기 → 웅크리기' },
    hidden: [],
    hips: ['mixamorigHips', 'mixamorig:Hips'],
    target: .5, viewHeight: 1.3, // about 1.0 tall, same scale as Lian
    note: '사용자가 리깅한 이렌 모델(iren_rig.glb, 정수리 뼈를 머리 안으로 줄인 보정본)을 복사해 Three.js로 그대로 재생합니다. 모델에 들어 있는 걷기·달리기·다이브·겁먹음을 탭으로 고르고, 카메라는 캐릭터의 오른쪽 옆에서 정사영으로 봅니다. ‘제자리’는 골반의 앞뒤·좌우 이동을 고정하고 위아래 움직임은 유지합니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
  moa: {
    // weapon loadouts (tools/glb_retarget/attach_weapon.py, loadout_002): stock on the shoulder pocket, both hands IK-baked onto grip/support, gun clips only
    loadouts: { hmg15_goliath: { label: 'HMG-15 골리앗', url: '/art/characters/moa/motion/glb_model_001/loadout_007/moa_hmg15_goliath.glb', file: 'moa_hmg15_goliath.glb' }, ml70_mule: { label: 'ML-70 뮬', url: '/art/characters/moa/motion/glb_model_001/loadout_007/moa_ml70_mule.glb', file: 'moa_ml70_mule.glb' } },
    url: '/art/characters/moa/motion/glb_model_001/source/moa_rig.glb',
    file: 'moa_rig.glb',
    labels: { 'walk.001': '걷기', 'run.001': '달리기', 'dive.001': '다이브', 'afraid.001': '겁먹음', 'idle.001': '대기 1', 'wait.001': '대기 2', peek_aim: '엄폐 조준', gunplay: '조준 사격', gunplay_auto: '연사', shoot_rifle: '이동 사격', rifle_idle: '소총 대기', rifle_aim_idle: '소총 조준 대기', pistol_idle2: '권총 대기', pistol_kneel_idle: '권총 앉아 대기', pistol_walk: '권총 걷기', pistol_run: '권총 달리기', rifle_pull_out: '총 꺼내기', rifle_put_away: '총 집어넣기', rifle_aim_to_down: '조준 → 내림', rifle_walk_to_stop: '걷다 멈춤', stand_to_crouch: '서기 → 웅크리기', crouch_to_stand: '웅크리기 → 서기', rifle_stand_to_kneel: '서기 → 무릎', rifle_kneel_idle: '무릎 대기', rifle_kneel_to_stand: '무릎 → 서기', crouch_to_prone: '웅크리기 → 엎드리기', prone_fire: '엎드려 쏴', prone_to_crouch: '엎드리기 → 웅크리기' },
    hidden: [],
    hips: ['mixamorigHips', 'mixamorig:Hips'],
    target: .5, viewHeight: 1.3, // about 1.0 tall, same scale as Lian
    note: '사용자가 리깅한 모아 모델(moa_rig.glb)에서 정수리 뼈를 머리 안으로 줄이고 가슴판이 흉곽을 따르도록 가중치를 고친 보정본을 복사해 Three.js로 그대로 재생합니다. 걷기·달리기·다이브·겁먹음을 탭으로 고르고, 카메라는 캐릭터의 오른쪽 옆에서 정사영으로 봅니다. ‘제자리’는 골반의 앞뒤·좌우 이동을 고정하고 위아래 움직임은 유지합니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
  yuna: {
    // weapon loadouts (tools/glb_retarget/attach_weapon.py, loadout_002): stock on the shoulder pocket, both hands IK-baked onto grip/support, gun clips only
    loadouts: { hp14_bastion: { label: 'HP-14 바스티온', url: '/art/characters/yuna/motion/glb_model_001/loadout_006/yuna_hp14_bastion.glb', file: 'yuna_hp14_bastion.glb' } },
    url: '/art/characters/yuna/motion/glb_model_001/source/yuna_rig.glb',
    file: 'yuna_rig.glb',
    labels: { 'walk.001': '걷기', 'run.001': '달리기', 'dive.001': '다이브', 'afraid.001': '겁먹음', 'idle.001': '대기 1', 'wait.001': '대기 2', peek_aim: '엄폐 조준', gunplay: '조준 사격', gunplay_auto: '연사', shoot_rifle: '이동 사격', rifle_idle: '소총 대기', rifle_aim_idle: '소총 조준 대기', pistol_idle2: '권총 대기', pistol_kneel_idle: '권총 앉아 대기', pistol_walk: '권총 걷기', pistol_run: '권총 달리기', rifle_pull_out: '총 꺼내기', rifle_put_away: '총 집어넣기', rifle_aim_to_down: '조준 → 내림', rifle_walk_to_stop: '걷다 멈춤', stand_to_crouch: '서기 → 웅크리기', crouch_to_stand: '웅크리기 → 서기', rifle_stand_to_kneel: '서기 → 무릎', rifle_kneel_idle: '무릎 대기', rifle_kneel_to_stand: '무릎 → 서기', crouch_to_prone: '웅크리기 → 엎드리기', prone_fire: '엎드려 쏴', prone_to_crouch: '엎드리기 → 웅크리기' },
    hidden: [],
    hips: ['mixamorigHips', 'mixamorig:Hips'],
    target: .5, viewHeight: 1.3, // about 1.0 tall, same scale as Lian
    note: '사용자가 리깅한 유나 모델(yuna_rig.glb)에서 정수리 뼈를 머리 안으로 줄이고, 손에 끌려가던 양쪽 엉덩이 장비(오른쪽 총·홀스터, 벨트 파우치)를 다리·골반에 고정한 보정본을 복사해 Three.js로 그대로 재생합니다. 걷기·달리기·다이브·겁먹음을 탭으로 고르고, 카메라는 캐릭터의 오른쪽 옆에서 정사영으로 봅니다. ‘제자리’는 골반의 앞뒤·좌우 이동을 고정하고 위아래 움직임은 유지합니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
  sena: {
    // weapon loadouts (tools/glb_retarget/attach_weapon.py, loadout_002): stock on the shoulder pocket, both hands IK-baked onto grip/support, gun clips only
    loadouts: { amr21_nail: { label: 'AMR-21 네일', url: '/art/characters/sena/motion/glb_model_001/loadout_007/sena_amr21_nail.glb', file: 'sena_amr21_nail.glb' }, pdw9_wasp: { label: 'PDW-9 와스프', url: '/art/characters/sena/motion/glb_model_001/loadout_007/sena_pdw9_wasp.glb', file: 'sena_pdw9_wasp.glb' } },
    url: '/art/characters/sena/motion/glb_model_001/source/sena_rig.glb',
    file: 'sena_rig.glb',
    labels: { 'walk.001': '걷기', 'run.001': '달리기', 'dive.001': '다이브', 'afraid.001': '겁먹음', 'idle.001': '대기 1', 'wait.001': '대기 2', peek_aim: '엄폐 조준', gunplay: '조준 사격', gunplay_auto: '연사', shoot_rifle: '이동 사격', rifle_idle: '소총 대기', rifle_aim_idle: '소총 조준 대기', pistol_idle2: '권총 대기', pistol_kneel_idle: '권총 앉아 대기', pistol_walk: '권총 걷기', pistol_run: '권총 달리기', rifle_pull_out: '총 꺼내기', rifle_put_away: '총 집어넣기', rifle_aim_to_down: '조준 → 내림', rifle_walk_to_stop: '걷다 멈춤', stand_to_crouch: '서기 → 웅크리기', crouch_to_stand: '웅크리기 → 서기', rifle_stand_to_kneel: '서기 → 무릎', rifle_kneel_idle: '무릎 대기', rifle_kneel_to_stand: '무릎 → 서기', crouch_to_prone: '웅크리기 → 엎드리기', prone_fire: '엎드려 쏴', prone_to_crouch: '엎드리기 → 웅크리기' },
    hidden: [],
    hips: ['mixamorigHips', 'mixamorig:Hips'],
    target: .5, viewHeight: 1.3, // about 1.0 tall, same scale as Lian
    note: '사용자가 리깅한 세나 모델(sena_rig.glb)에서 정수리 뼈를 머리 안으로 줄인 뒤, 사용자가 Blender에서 앞머리·뺨 텍스처를 덧칠한 파일을 복사해 Three.js로 그대로 재생합니다. 걷기·달리기·다이브·겁먹음을 탭으로 고르고, 카메라는 캐릭터의 오른쪽 옆에서 정사영으로 봅니다. ‘제자리’는 골반의 앞뒤·좌우 이동을 고정하고 위아래 움직임은 유지합니다. 텍스처가 PNG라 파일이 커서(약 18MB) 처음 불러올 때 시간이 걸릴 수 있습니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
  vesper_colony_insect: {
    url: '/art/enemies/vesper_colony_insect/motion/glb_model_001/source/mob.glb',
    file: 'mob.glb',
    labels: { walk: '걷기', walk_fast: '빠른 걷기', pounce: '덮치기', pounce_fast: '빠른 덮치기', death: '사망' },
    hidden: [],
    hips: [],
    target: .27, viewHeight: .9, // about 0.6 tall and 1.0 long
    // Both pounces keep their 0.5 m root motion, so widen the view and centre it ahead of the start point.
    clipView: { pounce: { viewHeight: 1.3, ahead: .3 }, pounce_fast: { viewHeight: 1.3, ahead: .3 }, explode: { viewHeight: 1.5, target: .5 } },
    // Non-looping clips: play once, hold the last pose for this many seconds, then start over.
    once: { death: 1 },
    // Tab-only modes that are not GLB clips. explode: shoot it `shots` times, it swells, pops in green ichor and fades out as smoke.
    extras: { explode: { label: '폭사', base: 'walk', shots: 5, center: [0, .3, .05], hitZ: [-.25, .4], hitY: [.24, .42], side: .17 } },
    note: '사용자가 리깅한 mob 모델(mob.glb)을 복사해 Three.js로 재생합니다. 걷기(1초 주기)·빠른 걷기(0.5초 주기)는 Blender에서 발끝 IK로 만든 뒤 회전 키프레임으로 구운 제자리 클립이고, 덮치기(1.42초)·빠른 덮치기(0.71초)는 앞다리를 들고 0.5m 앞으로 뛰어 내리찍는 같은 동작의 두 속도로 실제 전진을 포함해 끝나면 처음 자리로 돌아가 반복합니다. 사망(1.54초)은 맞고 휘청이다 주저앉아 다리를 오그리는 한 번 재생 클립으로, 마지막 자세에서 1초 멈춘 뒤 다시 시작합니다. 폭사는 걷는 몬스터를 화면 클릭·F·사격 버튼으로 쏘면 맞은 자리에 초록 체액이 튀고, 5발째에 크게 뒤로 뒤집히며 공중에서 터져 초록 연기로 사라진 뒤 다시 나타납니다(미리보기용 Three.js 효과). 카메라는 오른쪽 옆에서 정사영으로 봅니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
};

export class GlbModelLab {
  constructor() {
    this.active = false; this.modelKey = 'clone_01'; this.loadout = ''; this.loaded = new Map(); this.request = 0;
    this.clipName = null; this.paused = false;
    this.speed = 1; this.inPlace = true; this.facing = 1; this.background = 'dark'; this.gunEffects = true;
    this.raf = 0; this.tick = this.tick.bind(this);
    $('glb-pause').addEventListener('click', () => this.pause(!this.paused));
    // mixer.update(0) re-evaluates the pose so a paused restart shows the first frame too.
    $('glb-restart').addEventListener('click', () => { if (this.action) { this.held = 0; this.gunFx?.reset(); this.action.reset().play(); this.current.mixer.update(0); this.render(); } });
    $('glb-gun-effects').addEventListener('change', event => { this.gunEffects = event.target.checked; this.gunFx?.reset(); this.render(); this.writeUrl(); });
    $('glb-speed').addEventListener('change', event => { this.speed = Number(event.target.value); this.writeUrl(); });
    $('glb-inplace').addEventListener('change', event => { this.inPlace = event.target.checked; this.writeUrl(); });
    $('glb-turn').addEventListener('click', () => { this.facing *= -1; this.placeCamera(); this.writeUrl(); });
    $('glb-background').addEventListener('change', event => { this.background = event.target.value; this.applyBackground(); });
    $('glb-stage').addEventListener('keydown', event => {
      if (!this.active || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); this.pause(!this.paused); }
      if (event.code === 'KeyF' && this.explode) { event.preventDefault(); this.shoot(); }
    });
    $('glb-canvas').addEventListener('click', () => { if (this.explode) this.shoot(); });
    $('glb-shoot').addEventListener('click', () => this.shoot());
    $('glb-revive').addEventListener('click', () => this.revive());
    window.addEventListener('resize', () => { if (this.active) this.resize(); });
    document.addEventListener('visibilitychange', () => { this.last = null; });
  }

  get config() { return MODELS[this.modelKey]; }
  // the GLB file for the current loadout ('' = the base model with every clip)
  get source() { return (this.loadout && this.config.loadouts?.[this.loadout]) || this.config; }
  get view() { return this.config.clipView?.[this.clipName] ?? {}; }
  get extra() { return this.config.extras?.[this.clipName] ?? null; }

  // Called on route change, before restoreParams/show. Unknown pages fall back to clone_01.
  configure(key) {
    key = Object.hasOwn(MODELS, key) ? key : 'clone_01';
    if (key === this.modelKey) return;
    this.gunFx?.unbind();
    this.revive();
    // Take the previous page's model out of the scene now; attach() only removes this.current, which is cleared here.
    if (this.current) { this.current.mixer.stopAllAction(); this.scene?.remove(this.current.root); }
    this.modelKey = key; this.loadout = ''; this.clipName = null; this.current = null; this.action = null; this.explode = null;
  }

  buildLoadouts() {
    const loadouts = this.config.loadouts ?? {};
    $('glb-loadouts').hidden = !Object.keys(loadouts).length;
    $('glb-loadouts').replaceChildren(...[['', '맨손 · 모든 동작'], ...Object.entries(loadouts).map(([value, l]) => [value, `${l.label} · 사격 동작`])].map(([value, label]) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: label });
      button.dataset.loadout = value;
      button.addEventListener('click', () => this.setLoadout(value));
      return button;
    }));
    if (!Object.hasOwn(loadouts, this.loadout)) this.loadout = '';
    this.markLoadout();
  }

  markLoadout() {
    for (const button of $('glb-loadouts').children) button.setAttribute('aria-pressed', String(button.dataset.loadout === this.loadout));
  }

  setLoadout(value) {
    if (!Object.hasOwn(this.config.loadouts ?? {}, value)) value = '';
    if (value === this.loadout) return;
    this.gunFx?.unbind();
    if (this.current) { this.current.mixer.stopAllAction(); this.scene.remove(this.current.root); }
    this.revive(); this.loadout = value; this.current = null; this.action = null; this.explode = null;
    this.markLoadout();
    this.writeUrl();
    if (this.active) this.init().then(() => this.resize()).catch(() => {});
  }

  show(active) {
    this.active = active;
    if (!active) { cancelAnimationFrame(this.raf); this.raf = 0; this.gunFx?.reset(); return; }
    this.buildLoadouts();
    $('glb-note').textContent = this.config.note + (this.loadout ? ` 무장: ${this.source.label} — 무기를 캐릭터 크기(키 1.0≈1.65m)로 줄이고, 긴 총은 소총 대기를 뺀 동작에서 개머리판을 오른쪽 어깨 앞면에 붙이고 양손을 손잡이·받침점에 IK로 맞췄으며, 권총은 손에 붙였습니다(쌍권총은 양손에 한 자루씩 들고, 양팔을 새로 만든 쌍권총 전용 대기 2종·사격·앉아 사격·걷기·달리기 동작입니다). 해당 무기의 동작만 들어 있습니다.` : '');
    $('glb-canvas').setAttribute('aria-label', `${this.config.file} 모델의 우측면 애니메이션`);
    $('glb-inplace').closest('label').hidden = !this.config.hips.length;
    this.init().then(() => { if (this.active) { this.resize(); this.last = null; this.schedule(); } }).catch(() => {});
  }

  init() {
    const key = `${this.modelKey}|${this.loadout}`, request = ++this.request;
    if (!this.loaded.has(key)) this.loaded.set(key, this.load(key));
    $('glb-loading').hidden = false; $('glb-loading').textContent = 'GLB 모델을 불러오는 중…';
    return this.loaded.get(key).then(model => {
      if (request !== this.request || key !== `${this.modelKey}|${this.loadout}`) return;
      this.attach(model);
    }, error => {
      this.loaded.delete(key);
      $('glb-loading').hidden = false; $('glb-loading').textContent = `GLB 모델을 불러오지 못했습니다: ${error.message}`;
      throw error;
    });
  }

  async setup() {
    const THREE = this.THREE = await import(THREE_URL);
    const { GLTFLoader } = await import(LOADER_URL);
    this.loader = new GLTFLoader();
    this.renderer = new THREE.WebGLRenderer({ canvas: $('glb-canvas'), antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f44, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 1.5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, .8); rim.position.set(2, 2, -2); this.scene.add(rim);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 20);
    const { BurstFx } = await import(FX_URL);
    this.fx = new BurstFx(THREE, this.scene);
    this.gunFx = new GlbGunFx(THREE, this.scene);
  }

  async load(key) {
    this.ready ??= this.setup();
    await this.ready;
    const [modelKey, loadout] = key.split('|'), config = MODELS[modelKey], THREE = this.THREE;
    const gltf = await this.loader.loadAsync((loadout && config.loadouts?.[loadout]?.url) || config.url);
    const root = gltf.scene;
    root.traverse(object => { if (object.isMesh) object.frustumCulled = false; });
    const hips = config.hips.map(name => root.getObjectByName(name)).find(Boolean) ?? null;
    const order = Object.keys(config.labels), rank = name => { const index = order.indexOf(name); return index < 0 ? order.length : index; };
    const clips = gltf.animations.filter(clip => !config.hidden.includes(clip.name)).sort((a, b) => rank(a.name) - rank(b.name));
    const materials = [];
    root.traverse(object => { if (object.isMesh) for (const m of [object.material].flat()) if (!materials.includes(m)) materials.push(m); });
    return { key, root, hips, hipsRest: hips?.position.clone() ?? null, clips, materials, mixer: new THREE.AnimationMixer(root) };
  }

  attach(model) {
    if (this.current !== model) {
      if (this.current) { this.current.mixer.stopAllAction(); this.scene.remove(this.current.root); }
      this.current = model; this.scene.add(model.root);
      this.gunFx.bind(model.root, Boolean(this.loadout));
      $('glb-gun-effects-control').hidden = !this.loadout || !model.clips.some(clip => firingCues(clip.name, clip.duration).length);
      this.buildTabs();
      const known = model.clips.some(clip => clip.name === this.clipName) || Object.hasOwn(this.config.extras ?? {}, this.clipName ?? '');
      this.setClip(known ? this.clipName : this.orderedClips()[0]?.name, !known && this.clipName != null);
    }
    this.placeCamera();
    this.applyBackground();
    $('glb-loading').hidden = true;
    $('glb-caption').textContent = `${this.source.file} · 애니메이션 ${model.clips.length}개 · 정사영 우측면`;
  }

  // weapon loadouts open on the aiming idle (user request); other clips keep the GLB order
  orderedClips() {
    const clips = [...this.current.clips];
    if (!this.loadout) return clips;
    const first = ['rifle_aim_idle', 'pistol_idle2', 'dual_idle'];
    return clips.sort((a, b) => (first.includes(b.name) ? 1 : 0) - (first.includes(a.name) ? 1 : 0));
  }

  buildTabs() {
    const labels = this.config.labels;
    const entries = [...this.orderedClips().map(clip => [clip.name, labels[clip.name] ?? clip.name.replace(/\.\d+$/, '')]),
      ...Object.entries(this.config.extras ?? {}).map(([name, extra]) => [name, extra.label])];
    $('glb-clips').replaceChildren(...entries.map(([name, label]) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: label, title: name });
      button.dataset.clip = name;
      button.addEventListener('click', () => this.setClip(name));
      return button;
    }));
  }

  setClip(name, update = true) {
    const model = this.current;
    if (!model) { this.clipName = name; return; }
    const extra = this.config.extras?.[name];
    const clip = model.clips.find(item => item.name === (extra ? extra.base : name));
    if (!clip) return;
    model.mixer.stopAllAction();
    this.gunFx?.reset();
    if (model.hips && model.hipsRest) model.hips.position.copy(model.hipsRest);
    this.revive();
    this.clipName = name;
    this.explode = extra ? { shots: 0, phase: 'alive', t: 0, flinch: 0 } : null;
    $('glb-fx').hidden = !extra; $('glb-stage').classList.toggle('glb-aim', Boolean(extra));
    this.updateHp();
    this.action = model.mixer.clipAction(clip);
    this.holdFor = this.config.once?.[name] ?? null; this.held = 0;
    this.action.setLoop(this.holdFor == null ? this.THREE.LoopRepeat : this.THREE.LoopOnce, Infinity);
    this.action.clampWhenFinished = this.holdFor != null;
    this.action.reset().play();
    model.mixer.update(0);
    this.placeCamera();
    for (const button of $('glb-clips').children) button.setAttribute('aria-pressed', String(button.dataset.clip === name));
    this.render();
    if (update) this.writeUrl();
  }

  updateHp() {
    const extra = this.extra, state = this.explode;
    if (!extra || !state) return;
    $('glb-hp').textContent = state.phase === 'alive' ? `남은 체력 ${extra.shots - state.shots} / ${extra.shots}발` : '폭사';
    $('glb-shoot').disabled = state.phase !== 'alive';
  }

  shoot() {
    const extra = this.extra, state = this.explode, model = this.current;
    if (!extra || !state || state.phase !== 'alive' || !model || !this.fx) return;
    const V = this.THREE.Vector3, r = (a, b) => a + Math.random() * (b - a);
    const point = new V(-extra.side * this.facing, r(...extra.hitY), r(...extra.hitZ)).add(model.root.position);
    this.fx.hit(point, new V(-this.facing, 0, 0));
    state.shots += 1; state.flinch = 1;
    if (state.shots >= extra.shots) { state.phase = 'flip'; state.t = 0; }
    this.updateHp();
    if (this.paused) this.pause(false);
  }

  // Restore the model after a burst (also used when leaving the mode).
  revive() {
    const model = this.current;
    if (model) {
      model.root.visible = true; model.root.scale.setScalar(1); model.root.position.set(0, 0, 0); model.root.rotation.set(0, 0, 0);
      for (const m of model.materials) { m.transparent = false; m.opacity = 1; m.depthWrite = true; m.needsUpdate = true; }
    }
    this.fx?.clear();
    if (this.explode) { this.explode = { shots: 0, phase: 'alive', t: 0, flinch: 0 }; this.updateHp(); }
  }

  stepExplode(dt) {
    const state = this.explode, extra = this.extra, model = this.current;
    if (!state || !model) return;
    const THREE = this.THREE, root = model.root;
    const ease = u => { u = Math.min(Math.max(u, 0), 1); return u * u * (3 - 2 * u); }, easeOut = u => 1 - (1 - Math.min(Math.max(u, 0), 1)) ** 2;
    state.t += dt; state.flinch = Math.max(0, state.flinch - dt / .18);
    const f = state.flinch * state.flinch;
    // Rotate about the body centre (not the feet): position = lift + c - R*S*c.
    const center = new THREE.Vector3(...extra.center);
    const place = (pitch, lift, back, scale) => {
      root.rotation.set(pitch, 0, -.07 * f * this.facing); root.scale.setScalar(scale);
      const turned = center.clone().multiplyScalar(scale).applyEuler(root.rotation);
      root.position.copy(center).sub(turned).add(new THREE.Vector3(.02 * f * this.facing, lift, -back));
    };
    if (state.phase === 'alive' || state.phase === 'gone') place(0, 0, 0, 1);
    if (state.phase === 'flip') {               // 0.42 s: the last hit throws it up and over backwards, swelling as it turns belly-up
      const u = state.t / .42;
      place(-Math.PI * .85 * easeOut(u), .3 * Math.sin(Math.PI / 2 * Math.min(u, 1)), .14 * u, 1 + .14 * ease(u) ** 2);
      root.position.x += (Math.random() - .5) * .01 * ease(u);
      if (state.t >= .42) {
        state.phase = 'fade'; state.t = 0;
        root.updateMatrixWorld(true);
        this.fx.burst(root.localToWorld(center.clone()));
        for (const m of model.materials) { m.transparent = true; m.depthWrite = false; m.needsUpdate = true; }
      }
    } else if (state.phase === 'fade') {        // 0.35 s: keeps turning and starts to fall while it dissolves into the smoke
      const u = state.t / .35;
      place(-Math.PI * (.85 + .25 * u), .3 - .06 * u * u, .14 + .05 * u, 1.14 + .22 * ease(u));
      for (const m of model.materials) m.opacity = 1 - ease(u);
      if (state.t >= .35) { root.visible = false; state.phase = 'gone'; state.t = 0; this.updateHp(); }
    } else if (state.phase === 'gone' && state.t > 1 && !this.fx.busy) {
      this.revive();
    }
  }

  placeCamera() {
    if (!this.camera) return;
    // Models face +Z. A camera on -X sees the right side with the model facing screen right.
    const target = this.view.target ?? this.config.target, ahead = this.view.ahead ?? 0;
    this.camera.position.set(-5 * this.facing, target, ahead);
    this.camera.lookAt(0, target, ahead);
    this.resize();
  }

  resize() {
    if (!this.renderer) return;
    const stage = $('glb-stage');
    const width = Math.max(240, stage.clientWidth - 24), height = Math.round(Math.min(560, Math.max(320, width * .75)));
    this.renderer.setSize(width, height, false);
    const canvas = $('glb-canvas'); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    const aspect = width / height, half = (this.view.viewHeight ?? this.config.viewHeight) / 2;
    Object.assign(this.camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
    this.camera.updateProjectionMatrix();
    this.render();
  }

  applyBackground() {
    $('glb-stage').classList.toggle('bg-dark', this.background === 'dark');
    $('glb-stage').classList.toggle('bg-light', this.background !== 'dark');
    $('glb-background').value = this.background;
  }

  pause(paused) {
    this.paused = paused; $('glb-pause').textContent = paused ? '재생' : '일시정지';
    this.last = null; this.writeUrl();
  }

  schedule() { if (!this.raf && this.active) this.raf = requestAnimationFrame(this.tick); }

  tick(now) {
    this.raf = 0;
    if (!this.active) return;
    const dt = this.last == null ? 0 : Math.min(.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && this.current) {
      this.current.mixer.update(dt * this.speed);
      this.stepExplode(dt * this.speed);
      this.fx?.update(dt * this.speed);
      if (this.holdFor != null && this.action && this.action.time >= this.action.getClip().duration - 1e-4) {
        this.held += dt * this.speed;
        if (this.held >= this.holdFor) { this.held = 0; this.action.reset().play(); }
      }
    }
    this.render();
    this.schedule();
  }

  render() {
    if (!this.renderer || !this.current) return;
    const { hips, hipsRest } = this.current;
    if (this.inPlace && hips && hipsRest) { hips.position.x = hipsRest.x; hips.position.z = hipsRest.z; }
    if (this.gunFx && this.action) {
      this.current.root.updateMatrixWorld(true);
      this.gunFx.enabled = this.gunEffects;
      this.gunFx.update(this.clipName, this.action.time, this.action.getClip().duration);
    }
    this.renderer.render(this.scene, this.camera);
    if (this.action) $('glb-counter').textContent = `${this.action.time.toFixed(2)} / ${this.action.getClip().duration.toFixed(2)}초`;
  }

  restoreParams(params) {
    this.gunEffects = params.get('gunFx') !== '0'; $('glb-gun-effects').checked = this.gunEffects;
    if (params.get('clip')) this.clipName = params.get('clip');
    if (Object.hasOwn(this.config.loadouts ?? {}, params.get('loadout') ?? '')) this.loadout = params.get('loadout');
    const speed = Number(params.get('speed')); if ([.25, .5, 1].includes(speed)) { this.speed = speed; $('glb-speed').value = String(speed); }
    if (params.get('inPlace') === '0') { this.inPlace = false; $('glb-inplace').checked = false; }
    if (params.get('face') === 'left') this.facing = -1;
    if (params.get('paused') === '1') this.pause(true);
  }

  writeParams(params) {
    for (const key of ['frame', 'fps', 'loop', 'viewPitch', 'scale', 'version', 'motion', 'study', 'pixelView']) params.delete(key);
    params.set('plan', 'glb');
    if (!this.gunEffects) params.set('gunFx', '0'); else params.delete('gunFx');
    if (this.clipName) params.set('clip', this.clipName); else params.delete('clip');
    if (this.loadout) params.set('loadout', this.loadout); else params.delete('loadout');
    if (this.speed !== 1) params.set('speed', String(this.speed)); else params.delete('speed');
    if (!this.inPlace) params.set('inPlace', '0'); else params.delete('inPlace');
    if (this.facing < 0) params.set('face', 'left'); else params.delete('face');
    if (this.paused) params.set('paused', '1'); else params.delete('paused');
  }

  writeUrl() {
    if (!this.active) return;
    const [route, query] = location.hash.split('?');
    const params = new URLSearchParams(query || '');
    this.writeParams(params);
    history.replaceState(null, '', `${location.pathname}${location.search}${route}?${params}`);
  }
}
