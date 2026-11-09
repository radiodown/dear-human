// GLB model tab: plays the animations stored in a rigged .glb with Three.js, seen from the model's right side.
// Three.js is imported only when the tab is opened, so the other tabs never load it.
// Each sample page picks its own model (MODELS); the 2D sprites rendered from version04 have their own tab (glb-sprite-lab.js).
const $ = id => document.getElementById(id);
const THREE_URL = './vendor/three-0.187.0/build/three.module.js';
const LOADER_URL = './vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js';
export const MODELS = {
  clone_01: {
    url: '/art/characters/clone_01/motion/glb_model_001/source/version04.glb',
    file: 'version04.glb',
    labels: { 'walk.001': '걷기', 'run.001': '달리기', 'dive.001': '다이브', 'scared_01.001': '겁먹음' },
    // Clips kept in the GLB but hidden from the tab by user request (2026-11-09).
    hidden: ['캐릭터가 뛰게 해줘.001', '계속 반복해서 빠르게 달리는 동작.001'],
    hips: ['mixamorigHips', 'mixamorig:Hips'],
    target: .5, viewHeight: 1.3, // the model is about 1.0 tall
    note: '상위 폴더의 version04.glb를 복사해 Three.js로 그대로 재생합니다. 모델에 들어 있는 애니메이션을 탭으로 고르고, 카메라는 캐릭터의 오른쪽 옆에서 정사영으로 봅니다. ‘제자리’는 골반의 앞뒤·좌우 이동을 고정하고 위아래 움직임은 유지합니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
  vesper_colony_insect: {
    url: '/art/enemies/vesper_colony_insect/motion/glb_model_001/source/mob.glb',
    file: 'mob.glb',
    labels: { walk: '걷기', walk_fast: '빠른 걷기', pounce: '덮치기', pounce_fast: '빠른 덮치기' },
    hidden: [],
    hips: [],
    target: .27, viewHeight: .9, // about 0.6 tall and 1.0 long
    // Both pounces keep their 0.5 m root motion, so widen the view and centre it ahead of the start point.
    clipView: { pounce: { viewHeight: 1.3, ahead: .3 }, pounce_fast: { viewHeight: 1.3, ahead: .3 } },
    note: '사용자가 리깅한 mob 모델(mob.glb)을 복사해 Three.js로 재생합니다. 걷기(1초 주기)·빠른 걷기(0.5초 주기)는 Blender에서 발끝 IK로 만든 뒤 회전 키프레임으로 구운 제자리 클립이고, 덮치기(1.42초)·빠른 덮치기(0.71초)는 앞다리를 들고 0.5m 앞으로 뛰어 내리찍는 같은 동작의 두 속도로 실제 전진을 포함해 끝나면 처음 자리로 돌아가 반복합니다. 카메라는 오른쪽 옆에서 정사영으로 봅니다. 페이지를 열 때 렌더나 변환을 따로 실행하지 않습니다.',
  },
};

export class GlbModelLab {
  constructor() {
    this.active = false; this.modelKey = 'clone_01'; this.loaded = new Map(); this.request = 0;
    this.clipName = null; this.paused = false;
    this.speed = 1; this.inPlace = true; this.facing = 1; this.background = 'dark';
    this.raf = 0; this.tick = this.tick.bind(this);
    $('glb-pause').addEventListener('click', () => this.pause(!this.paused));
    // mixer.update(0) re-evaluates the pose so a paused restart shows the first frame too.
    $('glb-restart').addEventListener('click', () => { if (this.action) { this.action.time = 0; this.current.mixer.update(0); this.render(); } });
    $('glb-speed').addEventListener('change', event => { this.speed = Number(event.target.value); this.writeUrl(); });
    $('glb-inplace').addEventListener('change', event => { this.inPlace = event.target.checked; this.writeUrl(); });
    $('glb-turn').addEventListener('click', () => { this.facing *= -1; this.placeCamera(); this.writeUrl(); });
    $('glb-background').addEventListener('change', event => { this.background = event.target.value; this.applyBackground(); });
    $('glb-stage').addEventListener('keydown', event => {
      if (!this.active || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); this.pause(!this.paused); }
    });
    window.addEventListener('resize', () => { if (this.active) this.resize(); });
    document.addEventListener('visibilitychange', () => { this.last = null; });
  }

  get config() { return MODELS[this.modelKey]; }
  get view() { return this.config.clipView?.[this.clipName] ?? {}; }

  // Called on route change, before restoreParams/show. Unknown pages fall back to clone_01.
  configure(key) {
    key = Object.hasOwn(MODELS, key) ? key : 'clone_01';
    if (key === this.modelKey) return;
    this.modelKey = key; this.clipName = null; this.current = null; this.action = null;
  }

  show(active) {
    this.active = active;
    if (!active) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    $('glb-note').textContent = this.config.note;
    $('glb-canvas').setAttribute('aria-label', `${this.config.file} 모델의 우측면 애니메이션`);
    $('glb-inplace').closest('label').hidden = !this.config.hips.length;
    this.init().then(() => { if (this.active) { this.resize(); this.last = null; this.schedule(); } }).catch(() => {});
  }

  init() {
    const key = this.modelKey, request = ++this.request;
    if (!this.loaded.has(key)) this.loaded.set(key, this.load(key));
    $('glb-loading').hidden = false; $('glb-loading').textContent = 'GLB 모델을 불러오는 중…';
    return this.loaded.get(key).then(model => {
      if (request !== this.request || key !== this.modelKey) return;
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
  }

  async load(key) {
    this.ready ??= this.setup();
    await this.ready;
    const config = MODELS[key], THREE = this.THREE;
    const gltf = await this.loader.loadAsync(config.url);
    const root = gltf.scene;
    root.traverse(object => { if (object.isMesh) object.frustumCulled = false; });
    const hips = config.hips.map(name => root.getObjectByName(name)).find(Boolean) ?? null;
    const order = Object.keys(config.labels), rank = name => { const index = order.indexOf(name); return index < 0 ? order.length : index; };
    const clips = gltf.animations.filter(clip => !config.hidden.includes(clip.name)).sort((a, b) => rank(a.name) - rank(b.name));
    return { key, root, hips, hipsRest: hips?.position.clone() ?? null, clips, mixer: new THREE.AnimationMixer(root) };
  }

  attach(model) {
    if (this.current !== model) {
      if (this.current) { this.current.mixer.stopAllAction(); this.scene.remove(this.current.root); }
      this.current = model; this.scene.add(model.root);
      this.buildTabs();
      this.setClip(model.clips.some(clip => clip.name === this.clipName) ? this.clipName : model.clips[0]?.name, false);
    }
    this.placeCamera();
    this.applyBackground();
    $('glb-loading').hidden = true;
    $('glb-caption').textContent = `${this.config.file} · 애니메이션 ${model.clips.length}개 · 정사영 우측면`;
  }

  buildTabs() {
    const labels = this.config.labels;
    $('glb-clips').replaceChildren(...this.current.clips.map(clip => {
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: labels[clip.name] ?? clip.name.replace(/\.\d+$/, ''), title: clip.name });
      button.dataset.clip = clip.name;
      button.addEventListener('click', () => this.setClip(clip.name));
      return button;
    }));
  }

  setClip(name, update = true) {
    const model = this.current;
    if (!model) { this.clipName = name; return; }
    const clip = model.clips.find(item => item.name === name);
    if (!clip) return;
    model.mixer.stopAllAction();
    if (model.hips && model.hipsRest) model.hips.position.copy(model.hipsRest);
    this.clipName = name;
    this.action = model.mixer.clipAction(clip); this.action.reset().play();
    this.placeCamera();
    for (const button of $('glb-clips').children) button.setAttribute('aria-pressed', String(button.dataset.clip === name));
    this.render();
    if (update) this.writeUrl();
  }

  placeCamera() {
    if (!this.camera) return;
    // Models face +Z. A camera on -X sees the right side with the model facing screen right.
    const target = this.config.target, ahead = this.view.ahead ?? 0;
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
    if (!this.paused && this.current) this.current.mixer.update(dt * this.speed);
    this.render();
    this.schedule();
  }

  render() {
    if (!this.renderer || !this.current) return;
    const { hips, hipsRest } = this.current;
    if (this.inPlace && hips && hipsRest) { hips.position.x = hipsRest.x; hips.position.z = hipsRest.z; }
    this.renderer.render(this.scene, this.camera);
    if (this.action) $('glb-counter').textContent = `${this.action.time.toFixed(2)} / ${this.action.getClip().duration.toFixed(2)}초`;
  }

  restoreParams(params) {
    if (params.get('clip')) this.clipName = params.get('clip');
    const speed = Number(params.get('speed')); if ([.25, .5, 1].includes(speed)) { this.speed = speed; $('glb-speed').value = String(speed); }
    if (params.get('inPlace') === '0') { this.inPlace = false; $('glb-inplace').checked = false; }
    if (params.get('face') === 'left') this.facing = -1;
    if (params.get('paused') === '1') this.pause(true);
  }

  writeParams(params) {
    for (const key of ['frame', 'fps', 'loop', 'viewPitch', 'scale', 'version', 'motion', 'study', 'pixelView']) params.delete(key);
    params.set('plan', 'glb');
    if (this.clipName) params.set('clip', this.clipName); else params.delete('clip');
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
