// GLB model tab: plays the animations stored in a rigged .glb with Three.js, seen from the character's right side.
// Three.js is imported only when the tab is opened, so the other tabs never load it.
// The 2D sprites rendered from this model have their own tab (glb-sprite-lab.js).
const $ = id => document.getElementById(id);
const MODEL_URL = '/art/characters/clone_01/motion/glb_model_001/source/version04.glb';
const THREE_URL = './vendor/three-0.187.0/build/three.module.js';
const LOADER_URL = './vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js';
const LABELS = { 'walk.001': '걷기', 'run.001': '달리기', 'dive.001': '다이브', 'scared_01.001': '겁먹음' };
// Clips kept in the GLB but hidden from the tab by user request (2026-11-09).
const HIDDEN = new Set(['캐릭터가 뛰게 해줘.001', '계속 반복해서 빠르게 달리는 동작.001']);
const ORDER = Object.keys(LABELS);
const VIEW_HEIGHT = 1.3; // world units shown vertically; the model is about 1.0 tall

export class GlbModelLab {
  constructor() {
    this.active = false; this.loading = null; this.clipName = null; this.paused = false;
    this.speed = 1; this.inPlace = true; this.facing = 1; this.background = 'dark';
    this.raf = 0; this.tick = this.tick.bind(this);
    $('glb-pause').addEventListener('click', () => this.pause(!this.paused));
    $('glb-restart').addEventListener('click', () => { if (this.action) { this.action.time = 0; this.render(); } });
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

  show(active) {
    this.active = active;
    if (!active) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    this.init().then(() => { if (this.active) { this.resize(); this.last = null; this.schedule(); } }).catch(() => {});
  }

  init() {
    this.loading ??= this.load().catch(error => {
      $('glb-loading').hidden = false; $('glb-loading').textContent = `GLB 모델을 불러오지 못했습니다: ${error.message}`;
      this.loading = null; throw error;
    });
    return this.loading;
  }

  async load() {
    $('glb-loading').hidden = false; $('glb-loading').textContent = 'GLB 모델을 불러오는 중…';
    const THREE = this.THREE = await import(THREE_URL);
    const { GLTFLoader } = await import(LOADER_URL);
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    const canvas = $('glb-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f44, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 1.5); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, .8); rim.position.set(2, 2, -2); this.scene.add(rim);
    this.model = gltf.scene; this.scene.add(this.model);
    this.model.traverse(object => { if (object.isMesh) object.frustumCulled = false; });
    this.hips = this.model.getObjectByName('mixamorigHips') ?? this.model.getObjectByName('mixamorig:Hips');
    if (this.hips) this.hipsRest = this.hips.position.clone();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 20);
    this.placeCamera();
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = gltf.animations.filter(clip => !HIDDEN.has(clip.name)).sort((a, b) => rank(a.name) - rank(b.name));
    this.buildTabs();
    this.setClip(this.clips.some(clip => clip.name === this.clipName) ? this.clipName : this.clips[0]?.name, false);
    this.applyBackground();
    $('glb-loading').hidden = true;
    $('glb-caption').textContent = `version04.glb · 애니메이션 ${this.clips.length}개 · 정사영 우측면`;
  }

  buildTabs() {
    $('glb-clips').replaceChildren(...this.clips.map(clip => {
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: LABELS[clip.name] ?? clip.name.replace(/\.\d+$/, ''), title: clip.name });
      button.dataset.clip = clip.name;
      button.addEventListener('click', () => this.setClip(clip.name));
      return button;
    }));
  }

  setClip(name, update = true) {
    if (!this.mixer) { this.clipName = name; return; }
    const clip = this.clips.find(item => item.name === name);
    if (!clip) return;
    this.mixer.stopAllAction();
    if (this.hips && this.hipsRest) this.hips.position.copy(this.hipsRest);
    this.clipName = name;
    this.action = this.mixer.clipAction(clip); this.action.reset().play();
    for (const button of $('glb-clips').children) button.setAttribute('aria-pressed', String(button.dataset.clip === name));
    this.render();
    if (update) this.writeUrl();
  }

  placeCamera() {
    if (!this.camera) return;
    // The model faces +Z. A camera on -X sees the character's right side with the character facing screen right.
    this.camera.position.set(-5 * this.facing, .5, 0);
    this.camera.lookAt(0, .5, 0);
    this.resize();
  }

  resize() {
    if (!this.renderer) return;
    const stage = $('glb-stage');
    const width = Math.max(240, stage.clientWidth - 24), height = Math.round(Math.min(560, Math.max(320, width * .75)));
    this.renderer.setSize(width, height, false);
    const canvas = $('glb-canvas'); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    const aspect = width / height, half = VIEW_HEIGHT / 2;
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
    if (!this.paused && this.mixer) this.mixer.update(dt * this.speed);
    this.render();
    this.schedule();
  }

  render() {
    if (!this.renderer) return;
    if (this.inPlace && this.hips && this.hipsRest) { this.hips.position.x = this.hipsRest.x; this.hips.position.z = this.hipsRest.z; }
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

function rank(name) { const index = ORDER.indexOf(name); return index < 0 ? ORDER.length : index; }
