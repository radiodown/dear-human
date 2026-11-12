// Weapon 3D tab: shows weapon GLBs (tools/weapons/build_weapon_glb.py) with Three.js — turntable, side views and the
// attachment sockets (socket_* empty nodes) used to put the gun in a character's hand.
// Three.js and procedural models are loaded only when the tab is opened; results are cached.
const $ = id => document.getElementById(id);
const THREE_URL = './vendor/three-0.187.0/build/three.module.js';
const LOADER_URL = './vendor/three-0.187.0/examples/jsm/loaders/GLTFLoader.js';
export const WEAPONS = {
  ar12_rupture_saltline: {
    label: 'AR-12 럽처 · Saltline', procedural: './weapons/ar12-rupture.js', file: 'AR-12 · 코드 모델 001', measured: true,
    note: 'Saltline의 곡면·관통 구멍·재질 분리 방식을 참고한 AR-12 럽처 코드 모델입니다. 약 0.85m, 강화 리시버·각진 핸드가드·큰 탄창·접철 힌지·각형 총구 장착물을 표현했습니다. 회전·측면·위 보기와 부착 기준점을 지원합니다. 외형·실행 검수 대기이며 기존 GLB와 캐릭터 무장은 유지합니다.',
  },
  m16_basic: {
    label: 'M16A1', url: '/art/weapons/m16_basic/model_3d_001/m16a1.glb', file: 'm16a1.glb',
    measured: true,
    note: '플랜 E sprite_007의 M16A1 형상(실제 치수: 개머리판 끝 −0.345m ~ 총구 0.645m)을 Blender 스크립트(tools/weapons/build_weapon_glb.py)로 탄창까지 붙여 독립 GLB로 내보낸 모델입니다. 리시버·수지·강철·밝은 소부품 4종 재질과 1.6mm 모서리 베벨을 씁니다. 점은 손에 붙일 기준점입니다.',
  },
  amr21_nail: { label: "AMR-21 네일", url: '/art/weapons/amr21_nail/model_3d_003/amr21_nail.glb', old001: '/art/weapons/amr21_nail/model_3d_001/amr-21.glb', file: 'amr21_nail.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 “너무 크다”는 지적에 따라 실제 크기 1.20m(이전 model_3d_002보다 축소, 검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  pdw9_wasp: { label: "PDW-9 와스프", url: '/art/weapons/pdw9_wasp/model_3d_002/pdw9_wasp.glb', old001: '/art/weapons/pdw9_wasp/model_3d_001/pdw-9.glb', file: 'pdw9_wasp.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 실제 크기 0.60m(MP7(개머리판 폄 약 0.64m), 제안·검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  hmg15_goliath: { label: "HMG-15 골리앗", url: '/art/weapons/hmg15_goliath/model_3d_003/hmg15_goliath.glb', old001: '/art/weapons/hmg15_goliath/model_3d_001/hmg-15.glb', file: 'hmg15_goliath.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 “너무 크다”는 지적에 따라 실제 크기 1.20m(이전 model_3d_002보다 축소, 검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  ml70_mule: { label: "ML-70 뮬", url: '/art/weapons/ml70_mule/model_3d_003/ml70_mule.glb', old001: '/art/weapons/ml70_mule/model_3d_001/ml-70.glb', file: 'ml70_mule.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 “크기를 줄여 달라”는 지시에 따라 실제 크기 0.70m(이전 model_3d_002의 0.85m에서 축소, 검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  ar12_rupture: { label: "AR-12 럽처", url: '/art/weapons/ar12_rupture/model_3d_003/ar12_rupture.glb', old001: '/art/weapons/ar12_rupture/model_3d_001/ar12.glb', file: 'ar12_rupture.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 “너무 크다”는 지적에 따라 실제 크기 0.85m(이전 model_3d_002보다 축소, 검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  sg23_breacher: { label: "SG-23 브리처", url: '/art/weapons/sg23_breacher/model_3d_002/sg23_breacher.glb', old001: '/art/weapons/sg23_breacher/model_3d_001/sg-23.glb', file: 'sg23_breacher.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 실제 크기 1.05m(소음기 포함 전투 산탄총, 제안·검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  hp14_bastion: { label: "HP-14 바스티온", url: '/art/weapons/hp14_bastion/model_3d_002/hp14_bastion.glb', old001: '/art/weapons/hp14_bastion/model_3d_001/hp-14.glb', file: 'hp14_bastion.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 실제 크기 0.32m(데저트 이글급 + 컴펜세이터, 제안·검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  yuna_physical_shield: { label: "유나의 물리 방패", url: '/art/weapons/yuna_physical_shield/model_3d_002/yuna_physical_shield.glb', old001: '/art/weapons/yuna_physical_shield/model_3d_001/shield.glb', file: 'yuna_physical_shield.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 실제 크기 높이 0.95m(진입용 방패, 제안·검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
  hp14t_gemini: { label: "HP-14T 제미니", url: '/art/weapons/hp14t_gemini/model_3d_002/hp14t_gemini.glb', old001: '/art/weapons/hp14t_gemini/model_3d_001/hp-14t.glb', file: 'hp14t_gemini.glb', measured: true, note: "사용자가 Tripo로 만든 모델을 실제 크기 정당 0.30m(두 정으로 분리, 제안·검수 대기)로 맞추고 손 부착 기준점을 넣은 버전입니다(tools/weapons/size_tripo_weapons.py). 원본(가장 긴 변 1m)은 model_3d_001에 보존합니다." },
};
const SOCKET_NAMES = { socket_grip: '손잡이', socket_support: '받침손(왼손)', socket_stock: '개머리판(어깨)', socket_muzzle: '총구', socket_mag: '탄창',
  socket_grip_r: '오른손 손잡이', socket_muzzle_r: '오른쪽 총구', socket_grip_l: '왼손 손잡이', socket_muzzle_l: '왼쪽 총구', socket_forearm: '팔뚝(방패)' };
const SOCKET_COLORS = { socket_grip: 0xff6b6b, socket_support: 0x4dabf7, socket_stock: 0xffd43b, socket_muzzle: 0xff922b, socket_mag: 0x69db7c,
  socket_grip_r: 0xff6b6b, socket_muzzle_r: 0xff922b, socket_grip_l: 0xf783ac, socket_muzzle_l: 0xffc078, socket_forearm: 0xb197fc };
const REAL_SCALE_SPAN = 1.7; // metres across the view when comparing real sizes (longest weapon 1.20 m)

export class WeaponModelLab {
  constructor() {
    this.active = false; this.key = Object.keys(WEAPONS)[0]; this.loaded = new Map(); this.request = 0;
    this.spin = true; this.yaw = 0.6; this.pitch = 0.18; this.showSockets = true; this.background = 'dark'; this.realScale = false;
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
    $('wpn-realscale').addEventListener('change', e => { this.realScale = e.target.checked; this.resize(); this.writeUrl(); });
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
  configure(entityId) {
    if (Object.hasOwn(WEAPONS, entityId)) this.key = entityId === 'ar12_rupture' ? 'ar12_rupture_saltline' : entityId;
  }

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

  async load(key) {
    const THREE = this.THREE, w = WEAPONS[key];
    const root = w.procedural
      ? (await import(w.procedural)).createAR12()
      : await new Promise((resolve, reject) => this.loader.load(w.url, gltf => resolve(gltf.scene), undefined, reject));
      const marks = new THREE.Group(), sockets = {};
      root.traverse(o => { if (o.name.startsWith('socket_')) sockets[o.name] = o; });
      root.updateMatrixWorld(true);
      for (const [name, o] of Object.entries(sockets)) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(.012, 16, 12), new THREE.MeshBasicMaterial({ color: SOCKET_COLORS[name] ?? 0xffffff, depthTest: false }));
        m.renderOrder = 5; o.getWorldPosition(m.position); marks.add(m);
      }
      const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
      let tris = 0; root.traverse(o => { if (o.isMesh) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
      const group = new THREE.Group(); group.add(root, marks);
      return { key, group, marks, sockets: Object.keys(sockets), size, center, tris: Math.round(tris) };
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
      if (request !== this.request) return;
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
    const s = this.current?.size, aspect = width / height;
    // real-size mode: the same view for every weapon so their lengths compare; otherwise fit the weapon
    const span = this.realScale ? REAL_SCALE_SPAN : s ? Math.max(s.x, s.y, s.z) * 1.15 : 1.2;
    const half = this.realScale ? Math.max(span / 2 / aspect, .55) : Math.max(span / 2 / aspect, s ? s.y * 0.7 : .2), halfW = half * aspect;
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
    if (params.get('real') === '1') { this.realScale = true; $('wpn-realscale').checked = true; }
  }
  writeParams(params) {
    params.set('plan', 'weapon-3d'); params.set('weapon3d', this.key);
    for (const k of ['motion', 'weapon']) params.delete(k);
    if (!this.showSockets) params.set('sockets', '0'); else params.delete('sockets');
    if (!this.spin) params.set('spin', '0'); else params.delete('spin');
    if (this.background === 'light') params.set('bg', 'light'); else params.delete('bg');
    if (this.realScale) params.set('real', '1'); else params.delete('real');
  }
  writeUrl() {
    if (!this.active) return;
    const [route, query] = location.hash.split('?'); const params = new URLSearchParams(query || '');
    this.writeParams(params); history.replaceState(null, '', `${location.pathname}${location.search}${route}?${params}`);
  }
}
