// Weapon 3D tab: shows weapon GLBs (tools/weapons/build_weapon_glb.py) with Three.js — turntable, side views and the
// attachment sockets (socket_* empty nodes) used to put the gun in a character's hand.
// Three.js is imported only when the tab is opened. The page never builds or renders models.
const $ = id => document.getElementById(id);
const THREE_URL = './vendor/three-0.187.0/build/three.module.js';
const LOADER_URL = './vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js';
export const WEAPONS = {
  m16_basic: {
    label: 'M16A1', url: '/art/weapons/m16_basic/model_3d_001/m16a1.glb', file: 'm16a1.glb',
    measured: true,
    note: '플랜 E sprite_007의 M16A1 형상(실제 치수: 개머리판 끝 −0.345m ~ 총구 0.645m)을 Blender 스크립트(tools/weapons/build_weapon_glb.py)로 탄창까지 붙여 독립 GLB로 내보낸 모델입니다. 리시버·수지·강철·밝은 소부품 4종 재질과 1.6mm 모서리 베벨을 씁니다. 점은 손에 붙일 기준점입니다.',
  },
  amr21_nail: { label: "AMR-21 네일", url: '/art/weapons/amr21_nail/model_3d_001/amr-21.glb', file: 'amr-21.glb', note: "세나의 Mk21 계열 디자인을 계승한 대전차급 대갑주 저격총. 사용자가 Tripo로 만든 3D 모델(shoot/gun/amr-21.glb)과 위키 원화. 사용 대원 세나. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  pdw9_wasp: { label: "PDW-9 와스프", url: '/art/weapons/pdw9_wasp/model_3d_001/pdw-9.glb', file: 'pdw-9.glb', note: "세나의 부무장인 짧고 두꺼운 고속연사 기관단총. 사용자가 Tripo로 만든 3D 모델(shoot/gun/pdw-9.glb)과 위키 원화. 사용 대원 세나. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  hmg15_goliath: { label: "HMG-15 골리앗", url: '/art/weapons/hmg15_goliath/model_3d_001/hmg-15.glb', file: 'hmg-15.glb', note: "모아가 휴대하는 길고 거대한 대구경 지원기관총. 사용자가 Tripo로 만든 3D 모델(shoot/gun/hmg-15.glb)과 위키 원화. 사용 대원 모아. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  ml70_mule: { label: "ML-70 뮬", url: '/art/weapons/ml70_mule/model_3d_001/ml-70.glb', file: 'ml-70.glb', note: "모아의 부무장인 다목적 유탄발사기형 런처. 사용자가 Tripo로 만든 3D 모델(shoot/gun/ml-70.glb)과 위키 원화. 사용 대원 모아. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  ar12_rupture: { label: "AR-12 럽처", url: '/art/weapons/ar12_rupture/model_3d_001/ar12.glb', file: 'ar12.glb', note: "아렌과 리안의 무장 기본안인 대구경 파열탄 돌격소총. 사용자가 Tripo로 만든 3D 모델(shoot/gun/ar12.glb)과 위키 원화. 사용 대원 아렌·리안. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  sg23_breacher: { label: "SG-23 브리처", url: '/art/weapons/sg23_breacher/model_3d_001/sg-23.glb', file: 'sg-23.glb', note: "분대장 아렌의 부무장으로 제안한 대구경 전투 산탄총. 사용자가 Tripo로 만든 3D 모델(shoot/gun/sg-23.glb)과 위키 원화. 사용 대원 아렌. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  hp14_bastion: { label: "HP-14 바스티온", url: '/art/weapons/hp14_bastion/model_3d_001/hp-14.glb', file: 'hp-14.glb', note: "유나가 물리적 방패와 함께 사용하는 대구경 권총. 사용자가 Tripo로 만든 3D 모델(shoot/gun/hp-14.glb)과 위키 원화. 사용 대원 유나. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  yuna_physical_shield: { label: "유나의 물리 방패", url: '/art/weapons/yuna_physical_shield/model_3d_001/shield.glb', file: 'shield.glb', note: "유나가 방패·진입 역할에 쓰는 물리 방패. 유나 일러스트 속 디자인(상단 손잡이·관측창·각형 흑색 장갑판·금색 세로선·금색 날개 문장)을 따른다. 사용자가 Tripo로 만든 3D 모델(shoot/gun/shield.glb)과 위키 원화. 사용 대원 유나. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
  hp14t_gemini: { label: "HP-14T 제미니", url: '/art/weapons/hp14t_gemini/model_3d_001/hp-14t.glb', file: 'hp-14t.glb', note: "리안의 부무장인 대구경 쌍권총과 건카타 운용. 사용자가 Tripo로 만든 3D 모델(shoot/gun/hp-14t.glb)과 위키 원화. 사용 대원 리안. Tripo가 가장 긴 변을 1m로 맞춘 크기라 실제 축척은 아직 정하지 않았고 손 부착 기준점도 없습니다." },
};
const SOCKET_NAMES = { socket_grip: '손잡이(오른손)', socket_support: '받침손(왼손)', socket_stock: '개머리판(어깨)', socket_muzzle: '총구', socket_mag: '탄창' };
const SOCKET_COLORS = { socket_grip: 0xff6b6b, socket_support: 0x4dabf7, socket_stock: 0xffd43b, socket_muzzle: 0xff922b, socket_mag: 0x69db7c };

export class WeaponModelLab {
  constructor() {
    this.active = false; this.key = Object.keys(WEAPONS)[0]; this.loaded = new Map(); this.request = 0;
    this.spin = true; this.yaw = 0.6; this.pitch = 0.18; this.showSockets = true; this.background = 'dark';
    this.raf = 0; this.last = null; this.tick = this.tick.bind(this); this.drag = null;
    $('wpn-list').replaceChildren(...Object.entries(WEAPONS).map(([key, w]) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: w.label, title: w.file });
      b.dataset.key = key; b.addEventListener('click', () => this.select(key)); return b;
    }));
    $('wpn-spin').addEventListener('click', () => this.setSpin(!this.spin));
    $('wpn-right').addEventListener('click', () => this.setView(0, 0));          // side view, muzzle to screen right
    $('wpn-left').addEventListener('click', () => this.setView(Math.PI, 0));
    $('wpn-top').addEventListener('click', () => this.setView(0, Math.PI / 2 - 0.001));
    $('wpn-sockets').addEventListener('change', e => { this.showSockets = e.target.checked; if (this.current) this.current.marks.visible = this.showSockets; this.render(); this.writeUrl(); });
    $('wpn-background').addEventListener('change', e => { this.background = e.target.value; this.applyBackground(); this.writeUrl(); });
    const canvas = $('wpn-canvas');
    canvas.addEventListener('pointerdown', e => { this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, pitch: this.pitch }; canvas.setPointerCapture(e.pointerId); this.setSpin(false); });
    canvas.addEventListener('pointermove', e => {
      if (!this.drag) return;
      this.yaw = this.drag.yaw - (e.clientX - this.drag.x) * 0.01;
      this.pitch = Math.max(-1.4, Math.min(1.4, this.drag.pitch + (e.clientY - this.drag.y) * 0.01));
      this.placeCamera(); this.render();
    });
    canvas.addEventListener('pointerup', () => { this.drag = null; });
    window.addEventListener('resize', () => { if (this.active) this.resize(); });
    this.applyBackground();
  }

  // weapon pages open their own model first (m16_basic page -> M16A1)
  configure(entityId) { if (Object.hasOwn(WEAPONS, entityId)) this.key = entityId; }

  show(active) {
    this.active = active;
    if (!active) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    this.init().then(() => { if (this.active) { this.resize(); this.last = null; this.schedule(); } }).catch(() => {});
  }

  async init() {
    if (!this.renderer) await this.setup();
    return this.select(this.key, false);
  }

  async setup() {
    const THREE = this.THREE = await import(THREE_URL);
    const { GLTFLoader } = await import(LOADER_URL);
    this.loader = new GLTFLoader();
    this.renderer = new THREE.WebGLRenderer({ canvas: $('wpn-canvas'), antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f44, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-1.5, 3, 2); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.0); rim.position.set(2, 1.5, -2); this.scene.add(rim);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 20);
  }

  load(key) {
    const THREE = this.THREE, w = WEAPONS[key];
    return new Promise((resolve, reject) => this.loader.load(w.url, gltf => {
      const root = gltf.scene, marks = new THREE.Group(), sockets = {};
      root.traverse(o => { if (o.name.startsWith('socket_')) sockets[o.name] = o; });
      root.updateMatrixWorld(true);
      for (const [name, o] of Object.entries(sockets)) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(.012, 16, 12), new THREE.MeshBasicMaterial({ color: SOCKET_COLORS[name] ?? 0xffffff, depthTest: false }));
        m.renderOrder = 5; o.getWorldPosition(m.position); marks.add(m);
      }
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
      let tris = 0; root.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
      const group = new THREE.Group(); group.add(root, marks);
      resolve({ key, group, marks, sockets: Object.keys(sockets), size, center, tris: Math.round(tris) });
    }, undefined, reject));
  }

  select(key, update = true) {
    if (!Object.hasOwn(WEAPONS, key)) key = Object.keys(WEAPONS)[0];
    this.key = key;
    for (const b of $('wpn-list').children) b.setAttribute('aria-pressed', String(b.dataset.key === key));
    $('wpn-note').textContent = WEAPONS[key].note;
    if (update) this.writeUrl();
    if (!this.renderer) return Promise.resolve();
    const request = ++this.request;
    if (!this.loaded.has(key)) this.loaded.set(key, this.load(key));
    $('wpn-loading').hidden = false; $('wpn-loading').textContent = '무기 모델을 불러오는 중…';
    return this.loaded.get(key).then(model => {
      if (request !== this.request) return;
      if (this.current) this.scene.remove(this.current.group);
      this.current = model; this.scene.add(model.group); model.marks.visible = this.showSockets;
      $('wpn-loading').hidden = true;
      const s = model.size;
      const dims = `${s.x.toFixed(3)} × ${s.y.toFixed(3)} × ${s.z.toFixed(3)}m${WEAPONS[key].measured ? '' : ' (Tripo 정규화 크기)'}`;
      $('wpn-caption').textContent = `${WEAPONS[key].file} · ${dims} · 삼각형 ${model.tris.toLocaleString()}개 · 기준점 ${model.sockets.length ? model.sockets.map(n => SOCKET_NAMES[n] ?? n).join(', ') : '없음'}`;
      $('wpn-legend').replaceChildren(...model.sockets.map(n => {
        const span = document.createElement('span'); span.className = 'wpn-legend-item';
        const dot = document.createElement('i'); dot.style.background = `#${(SOCKET_COLORS[n] ?? 0xffffff).toString(16).padStart(6, '0')}`;
        span.append(dot, SOCKET_NAMES[n] ?? n); return span;
      }));
      this.resize();
    }, error => {
      this.loaded.delete(key);
      $('wpn-loading').hidden = false; $('wpn-loading').textContent = `무기 모델을 불러오지 못했습니다: ${error.message}`;
    });
  }

  setSpin(spin) { this.spin = spin; $('wpn-spin').textContent = spin ? '회전 멈춤' : '돌려 보기'; this.last = null; this.writeUrl(); }
  setView(yaw, pitch) { this.setSpin(false); this.yaw = yaw; this.pitch = pitch; this.placeCamera(); this.render(); }

  applyBackground() {
    $('wpn-stage').classList.toggle('bg-dark', this.background === 'dark');
    $('wpn-stage').classList.toggle('bg-light', this.background !== 'dark');
    $('wpn-background').value = this.background;
  }

  placeCamera() {
    if (!this.current) return;
    const c = this.current.center, r = 3;
    // yaw 0 = camera on +Z: glTF +Z is Blender -Y, the rifle's left side (bolt catch, selector) — the side the sprite
    // camera sees — and the muzzle (+X) points to screen right
    this.camera.position.set(c.x + r * Math.sin(this.yaw) * Math.cos(this.pitch), c.y + r * Math.sin(this.pitch), c.z + r * Math.cos(this.yaw) * Math.cos(this.pitch));
    this.camera.up.set(0, 1, 0); this.camera.lookAt(c);
  }

  resize() {
    if (!this.renderer) return;
    const stage = $('wpn-stage');
    const width = Math.max(240, stage.clientWidth - 24), height = Math.round(Math.min(480, Math.max(260, width * .55)));
    this.renderer.setSize(width, height, false);
    const canvas = $('wpn-canvas'); canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    // fit the longest side (whatever the turntable angle) with 15% margin; keep the height visible too
    const s = this.current?.size, span = s ? Math.max(s.x, s.y, s.z) * 1.15 : 1.2, aspect = width / height;
    const half = Math.max(span / 2 / aspect, s ? s.y * 0.7 : .2), halfW = half * aspect;
    Object.assign(this.camera, { left: -halfW, right: halfW, top: half, bottom: -half });
    this.camera.updateProjectionMatrix(); this.placeCamera(); this.render();
  }

  render() { if (this.renderer && this.current) this.renderer.render(this.scene, this.camera); }
  schedule() { if (!this.raf && this.active) this.raf = requestAnimationFrame(this.tick); }
  tick(now) {
    this.raf = 0; if (!this.active) return;
    const dt = this.last == null ? 0 : Math.min(.1, (now - this.last) / 1000); this.last = now;
    if (this.spin && this.current) { this.yaw += dt * 0.6; this.placeCamera(); this.render(); }
    this.schedule();
  }

  restoreParams(params) {
    if (Object.hasOwn(WEAPONS, params.get('weapon3d'))) this.key = params.get('weapon3d');
    if (params.get('sockets') === '0') { this.showSockets = false; $('wpn-sockets').checked = false; }
    if (params.get('spin') === '0') this.spin = false;
    if (params.get('bg') === 'light') { this.background = 'light'; this.applyBackground(); }
  }
  writeParams(params) {
    params.set('plan', 'weapon-3d'); params.set('weapon3d', this.key);
    for (const k of ['motion', 'weapon']) params.delete(k);
    if (!this.showSockets) params.set('sockets', '0'); else params.delete('sockets');
    if (!this.spin) params.set('spin', '0'); else params.delete('spin');
    if (this.background === 'light') params.set('bg', 'light'); else params.delete('bg');
  }
  writeUrl() {
    if (!this.active) return;
    const [route, query] = location.hash.split('?'); const params = new URLSearchParams(query || '');
    this.writeParams(params); history.replaceState(null, '', `${location.pathname}${location.search}${route}?${params}`);
  }
}
