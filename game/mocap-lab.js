// 100STYLE BVH 참고 모션을 2D로 투영해 현재 파츠 리그와 나란히 보는 시험 화면.
// BVH는 아직 파츠 리그에 리타겟하지 않는다. 오른쪽 화면은 기존 rig-core의 절차 보행이다.
import { facingYaw, smoothAngles, parseFrameCuts } from './animation/bvh.js';
import { motionFromBVH, motionFromFiles } from './animation/motion-import.js';
import { CharacterRig } from './animation/rig-core.js';
import { MocapRig, buildRetargetTrack, estimateProgress } from './animation/mocap-retarget.js';
import { MocapWebGLCharacter } from './animation/mocap-renderer.js';

const $ = (id) => document.getElementById(id);
// rig_002 카탈로그가 rig-lab.js 해시를 고정하므로 같은 정의·아틀라스를 여기서 읽는다(파일은 수정하지 않음).
const RIG_DEFINITION_URL = '/art/characters/clone_01/motion/rig_002/rig/parts.json';
async function loadRigAssets() {
  const response = await fetch(RIG_DEFINITION_URL);
  if (!response.ok) throw new Error('리그 정의를 읽지 못했습니다.');
  const definition = await response.json();
  const images = await Promise.all(Object.values(definition.atlases).map((atlas) => new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error(`이미지 로드 실패: ${atlas.path}`)); image.src = '/' + atlas.path;
  })));
  return { definition, images };
}
const SOURCE_DIR = '/art/characters/clone_01/motion/mocap_100style_001/source/';
const STYLE = 'Neutral';
export const MOCAP_CLIPS = { ID: '대기', FW: '전진 보행', TR1: '전환', USER: '사용자 파일' };
const CONTACT_HEIGHT = 4, CONTACT_SPEED = 40; // cm, cm/s · 추정 기준
const COLORS = { left: [143, 179, 201], right: [223, 190, 142], center: [236, 231, 216] };

function sideOf(name) { return /^Left/.test(name) ? 'left' : /^Right/.test(name) ? 'right' : 'center'; }

export class MocapLab {
  constructor() {
    this.clipKey = 'FW'; this.viewAngle = 0; this.viewPitch = 0; this.speed = 1; this.paused = false; this.time = 0;
    this.options = { align: true, rootLock: true, trim: true, contacts: true, labels: false, compare: true, footLock: true, fire: false, rigDebug: false, match: false, proportions: false, live: false, headFollow: true };
    this.rigMode = 'retarget'; this.mocapRig = new MocapRig();
    this.cache = new Map(); this.cuts = {}; this.active = false; this.status = 'idle'; this.raf = 0; this.last = 0;
    this.pendingFrame = null; this.rig = new CharacterRig(); this.rigRenderer = null;
    this.bind();
  }

  applyParams(params) {
    const pitch = Number(params.get('pitch'));
    if (params.has('pitch') && Number.isFinite(pitch)) this.setViewPitch(pitch, false);
    const angle = Number(params.get('angle'));
    if (params.has('angle') && Number.isFinite(angle)) this.setViewAngle(angle, false);
    if (params.has('live')) { this.options.live = params.get('live') === '1'; $('mocap-live').checked = this.options.live; this.mocapRig.live = this.options.live; }
    if (params.has('prop')) { this.options.proportions = params.get('prop') === '1'; $('mocap-proportions').checked = this.options.proportions; this.mocapRig.proportions = this.options.proportions; }
    if (params.has('match')) { this.options.match = params.get('match') === '1'; $('mocap-match').checked = this.options.match; this.mocapRig.match = this.options.match; }
    const clip = params.get('clip');
    if (clip && clip in MOCAP_CLIPS && clip !== 'USER') this.clipKey = clip;
    const frame = Number(params.get('frame'));
    if (params.has('frame') && Number.isInteger(frame) && frame >= 0) this.pendingFrame = frame;
    this.paused = params.get('paused') === '1';
    this.syncButtons();
    if (this.status === 'ready' || this.status === 'failed') this.selectClip(this.clipKey, false);
  }

  async init() {
    this.status = 'loading';
    try {
      const cuts = await fetch(SOURCE_DIR + 'Frame_Cuts.csv');
      if (cuts.ok) this.cuts = parseFrameCuts(await cuts.text(), STYLE);
    } catch { this.cuts = {}; }
    this.initRig();
    await this.selectClip(this.clipKey, false);
  }

  async initRig() {
    try {
      const { definition, images } = await loadRigAssets();
      this.rigRenderer = new MocapWebGLCharacter($('mocap-rig-canvas'), images[0], images[1], definition);
      $('mocap-rig-loading').hidden = true; this.syncRigMode(); this.render();
    } catch (error) { $('mocap-rig-loading').textContent = `비교 리그를 불러오지 못했습니다: ${error.message}`; }
  }

  async loadClip(key) {
    if (key === 'USER') { if (!this.userData) throw new Error('먼저 BVH·GLB·glTF 파일을 열어 주세요.'); return this.userData; }
    if (this.cache.has(key)) return this.cache.get(key);
    const promise = (async () => {
      const response = await fetch(`${SOURCE_DIR}${STYLE}_${key}.bvh`);
      if (!response.ok) throw new Error(`BVH를 읽지 못했습니다: ${STYLE}_${key}.bvh`);
      const clip = motionFromBVH(await response.text());
      return this.analyze(clip);
    })();
    this.cache.set(key, promise);
    promise.catch(() => this.cache.delete(key));
    return promise;
  }

  analyze(clip) {
    const P = clip.positions, J = clip.joints.length, stride = J * 3, n = clip.frameCount, I = clip.index;
    for (const name of ['Hips', 'LeftHip', 'RightHip', 'LeftAnkle', 'RightAnkle', 'LeftToe_End', 'RightToe_End']) if (!(name in I)) throw new Error(`필수 관절이 없습니다: ${name}`);
    const rawYaw = new Float32Array(n);
    for (let f = 0; f < n; f++) rawYaw[f] = facingYaw(P, f * stride, I.LeftHip, I.RightHip);
    const yaw = smoothAngles(rawYaw, 30);
    const { progress, inPlace } = estimateProgress(clip, P, yaw);
    let ground = Infinity;
    const ankleHeights = [];
    for (let f = 0; f < n; f++) {
      ground = Math.min(ground, P[f * stride + I.LeftToe_End * 3 + 1], P[f * stride + I.RightToe_End * 3 + 1]);
      ankleHeights.push(P[f * stride + I.LeftAnkle * 3 + 1], P[f * stride + I.RightAnkle * 3 + 1]);
    }
    ankleHeights.sort((a, b) => a - b);
    const ankleGround = ankleHeights[Math.floor(ankleHeights.length * 0.05)];
    const contacts = new Uint8Array(n * 2), fps = 1 / clip.frameTime;
    const point = (f, j) => [P[f * stride + j * 3], P[f * stride + j * 3 + 1], P[f * stride + j * 3 + 2]];
    ['Left', 'Right'].forEach((side, s) => {
      for (const [joint, base] of [[I[`${side}Toe_End`], ground], [I[`${side}Ankle`], ankleGround]]) {
        for (let f = 0; f < n; f++) {
          const a = point(Math.max(0, f - 1), joint), b = point(Math.min(n - 1, f + 1), joint);
          const speed = Math.hypot(b[0] - a[0], b[2] - a[2]) * fps / 2;
          if (point(f, joint)[1] - base < CONTACT_HEIGHT && speed < CONTACT_SPEED) contacts[f * 2 + s] = 1;
        }
      }
    });
    const bones = clip.joints.map((j, k) => j.parent >= 0 ? [j.parent, k] : null).filter(Boolean);
    const track = buildRetargetTrack(clip, P, yaw, progress, { viewAngle: this.viewAngle, viewPitch: this.viewPitch });
    return { clip, P, stride, yaw, progress, inPlace, ground, contacts, bones, track, sides: clip.joints.map((j) => sideOf(j.end ? clip.joints[j.parent].name : j.name)) };
  }

  // 사용자 파일은 브라우저 메모리에서만 읽는다(업로드·저장 없음).
  async openFiles(files, animation = 0) {
    const info = $('mocap-file-info');
    info.textContent = '파일을 읽는 중…';
    try {
      const entries = await Promise.all(files.map(async (file) => ({ name: file.name, data: await file.arrayBuffer() })));
      const result = await motionFromFiles(entries, { animation });
      const data = this.analyze(result.clip);
      const anim = result.animations[animation];
      this.userFiles = files;
      this.userFile = { name: result.name, kind: result.kind, animation: anim?.name || '', joints: result.clip.joints.length, unit: result.clip.unit, renamed: result.clip.renamed };
      this.userData = Promise.resolve(data);
      const select = $('mocap-anim');
      select.hidden = result.animations.length < 2;
      select.replaceChildren(...result.animations.map((a) => Object.assign(document.createElement('option'), { value: String(a.index), textContent: `${a.name} · ${a.duration.toFixed(1)}초`, selected: a.index === animation })));
      const synthetic = result.clip.joints.filter((j) => j.synthetic).map((j) => j.name);
      info.textContent = `${result.name} · 관절 ${result.clip.joints.length}개 · ${result.clip.frameCount}프레임(${Math.round(1 / result.clip.frameTime)}fps) · 원본 단위 ${result.clip.unit}${result.clip.renamed ? ' · 관절 이름 자동 대응' : ''}${synthetic.length ? ` · 보충: ${synthetic.join(', ')}` : ''}`;
      $('mocap-user-clip').hidden = false;
      await this.selectClip('USER');
    } catch (error) { info.textContent = `읽기 실패: ${error.message}`; }
  }

  range(data = this.data) {
    if (!data) return [0, 0];
    const last = data.clip.frameCount - 1, cut = this.cuts[this.clipKey];
    if (!this.options.trim || !cut) return [0, last];
    return [Math.min(Math.max(0, cut[0]), last), Math.min(Math.max(0, cut[1]), last)];
  }

  frame() {
    const [a, b] = this.range(), len = b - a + 1;
    return a + (Math.floor(this.time / this.data.clip.frameTime + 1e-6) % len + len) % len;
  }

  setFrame(frame) {
    const [a, b] = this.range();
    this.time = (Math.min(b, Math.max(a, frame)) - a) * this.data.clip.frameTime;
  }

  async selectClip(key, updateUrl = true) {
    if (!(key in MOCAP_CLIPS)) return;
    this.clipKey = key; this.syncButtons(); this.syncRigMode();
    $('mocap-loading').hidden = false; $('mocap-loading').textContent = `${key === 'USER' ? this.userFile?.name : `${STYLE}_${key}.bvh`} 읽는 중…`;
    try {
      const data = await this.loadClip(key);
      if (this.clipKey !== key) return;
      this.data = data; this.status = 'ready'; this.time = 0; this.mocapRig.setTrack(data.track);
      if (this.pendingFrame !== null) { this.setFrame(this.pendingFrame); this.pendingFrame = null; }
      $('mocap-loading').hidden = true;
      $('mocap-source-link').hidden = key === 'USER';
      if (key !== 'USER') $('mocap-source-link').href = `${SOURCE_DIR}${STYLE}_${key}.bvh`;
      $('mocap-source-label').textContent = key === 'USER' ? `MOCAP / 사용자 파일 · ${this.userFile.kind.toUpperCase()}` : 'MOCAP / 100STYLE NEUTRAL · BVH';
      this.syncSlider(); this.render(); this.schedule();
      if (updateUrl) this.syncUrl();
    } catch (error) { this.status = 'failed'; $('mocap-loading').hidden = false; $('mocap-loading').textContent = error.message; }
  }

  syncButtons() {
    document.querySelectorAll('[data-clip]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.clip === this.clipKey)));
    $('mocap-pause').textContent = this.paused ? '재생' : '일시정지';
  }

  syncRigMode() {
    this.rig.setWalking(this.clipKey !== 'ID');
    this.rig.trigger = this.mocapRig.trigger = this.options.fire;
    this.mocapRig.footLock = this.options.footLock;
    this.mocapRig.match = this.options.match;
    this.mocapRig.proportions = this.options.proportions;
    this.mocapRig.live = this.options.live;
    this.mocapRig.headFollow = this.options.headFollow;
    $('mocap-rig-label').textContent = this.rigMode === 'retarget' ? 'RETARGET / RIG_002 · BVH 하체 + 무기 IK 상체' : 'CURRENT RIG / RIG_002 · 절차 보행';
  }
  activeRig() { return this.rigMode === 'retarget' ? this.mocapRig : this.rig; }

  syncSlider() {
    const [a, b] = this.range(), slider = $('mocap-frame');
    slider.min = String(a); slider.max = String(b);
  }

  syncUrl() {
    if (!this.active) return;
    const [route, query] = location.hash.split('?'), params = new URLSearchParams(query || '');
    params.delete('motion'); params.set('view', 'mocap'); params.set('clip', this.clipKey);
    if (this.viewAngle) params.set('angle', String(this.viewAngle)); else params.delete('angle');
    if (this.viewPitch) params.set('pitch', String(this.viewPitch)); else params.delete('pitch');
    if (this.options.match) params.set('match', '1'); else params.delete('match');
    if (this.options.proportions) params.set('prop', '1'); else params.delete('prop');
    if (this.options.live) params.set('live', '1'); else params.delete('live');
    if (this.paused && this.data) { params.set('frame', String(this.frame())); params.set('paused', '1'); } else { params.delete('frame'); params.delete('paused'); }
    history.replaceState(null, '', `${location.pathname}${location.search}${route}?${params}`);
  }

  setPaused(paused) { this.paused = paused; this.last = 0; this.syncButtons(); this.syncUrl(); this.render(); }

  step(delta) {
    if (!this.data) return;
    this.paused = true; this.setFrame(this.frame() + delta);
    if (this.rigRenderer && this.options.compare && delta > 0) this.activeRig().advance(this.data.clip.frameTime);
    this.syncButtons(); this.syncUrl(); this.render();
  }

  bind() {
    document.querySelectorAll('[data-clip]').forEach((b) => b.addEventListener('click', () => this.selectClip(b.dataset.clip)));
    $('mocap-file').addEventListener('change', (e) => { const files = [...e.target.files]; e.target.value = ''; if (files.length) this.openFiles(files); });
    $('mocap-anim').addEventListener('change', (e) => this.openFiles(this.userFiles, Number(e.target.value)));
    $('mocap-view-select').addEventListener('change', (e) => { if (e.target.value !== '') this.setViewAngle(Number(e.target.value)); });
    $('mocap-view-angle').addEventListener('input', (e) => this.setViewAngle(Number(e.target.value)));
    $('mocap-view-pitch').addEventListener('input', (e) => this.setViewPitch(Number(e.target.value)));
    $('mocap-view-pitch-reset').addEventListener('click', () => this.setViewPitch(0));
    $('mocap-pause').addEventListener('click', () => this.setPaused(!this.paused));
    $('mocap-prev').addEventListener('click', () => this.step(-1));
    $('mocap-next').addEventListener('click', () => this.step(1));
    $('mocap-speed').addEventListener('change', (e) => { this.speed = Number(e.target.value); });
    $('mocap-frame').addEventListener('input', (e) => { if (!this.data) return; this.paused = true; this.setFrame(Number(e.target.value)); this.syncButtons(); this.render(); });
    $('mocap-frame').addEventListener('change', () => this.syncUrl());
    $('mocap-rig-mode').addEventListener('change', (e) => { this.rigMode = e.target.value; this.syncRigMode(); this.render(); });
    for (const key of ['align', 'rootLock', 'trim', 'contacts', 'labels', 'compare', 'footLock', 'fire', 'rigDebug', 'match', 'proportions', 'live', 'headFollow']) {
      $(`mocap-${key}`).addEventListener('change', (e) => {
        const frame = this.data ? this.frame() : 0;
        this.options[key] = e.target.checked;
        if (key === 'trim' && this.data) { this.syncSlider(); this.setFrame(frame); }
        if (key === 'compare') $('mocap-stages').classList.toggle('single', !e.target.checked);
        if (key === 'footLock' || key === 'fire' || key === 'match' || key === 'proportions' || key === 'live' || key === 'headFollow') this.syncRigMode();
        if (key === 'live' && e.target.checked && !this.options.proportions) { this.options.proportions = true; $('mocap-proportions').checked = true; this.syncRigMode(); }
        if (key === 'match' || key === 'proportions' || key === 'live') this.syncUrl();
        this.render();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (!this.active || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) || e.repeat && e.code === 'Space') return;
      if (e.code === 'Space') { e.preventDefault(); this.setPaused(!this.paused); }
      if (e.code === 'ArrowLeft' || e.code === 'Comma') { e.preventDefault(); this.step(-1); }
      if (e.code === 'ArrowRight' || e.code === 'Period') { e.preventDefault(); this.step(1); }
    });
    document.addEventListener('visibilitychange', () => { this.last = 0; });
    new ResizeObserver(() => { if (this.active) this.render(); }).observe($('mocap-stages'));
  }

  show(active) {
    this.active = active; this.last = 0;
    if (active) { this.render(); this.schedule(); } else { cancelAnimationFrame(this.raf); this.raf = 0; }
  }

  schedule() {
    if (this.raf || !this.active || this.status !== 'ready') return;
    this.raf = requestAnimationFrame((now) => { this.raf = 0; this.tick(now); });
  }

  tick(now) {
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0; this.last = now;
    if (!document.hidden && !this.paused) {
      this.time += dt * this.speed;
      if (this.rigRenderer && this.options.compare) this.activeRig().advance(dt * this.speed);
    }
    this.render(); this.schedule();
  }

  /** 시점 각도(0=측면, 90=정면)를 바꾸고, 같은 각도로 리타겟 트랙을 다시 만든다. */
  setViewAngle(degrees, updateUrl = true) {
    this.viewAngle = Math.round(Math.min(90, Math.max(0, degrees)));
    $('mocap-view-angle').value = String(this.viewAngle);
    $('mocap-view-angle-label').value = `${this.viewAngle}°`;
    const preset = [...$('mocap-view-select').options].find((o) => Number(o.value) === this.viewAngle && o.value !== '');
    $('mocap-view-select').value = preset ? preset.value : '';
    if (this.data) { this.data.track = buildRetargetTrack(this.data.clip, this.data.P, this.data.yaw, this.data.progress, { viewAngle: this.viewAngle, viewPitch: this.viewPitch }); this.mocapRig.setTrack(this.data.track); }
    if (updateUrl) this.syncUrl();
    this.render();
  }

  /** 상하 각도(+ 위에서 내려다봄, − 아래에서 올려다봄, −60~60°)를 바꾸고 리타겟 트랙을 다시 만든다. */
  setViewPitch(degrees, updateUrl = true) {
    this.viewPitch = Math.round(Math.min(60, Math.max(-60, degrees)));
    $('mocap-view-pitch').value = String(this.viewPitch);
    $('mocap-view-pitch-label').value = `${this.viewPitch > 0 ? '+' : ''}${this.viewPitch}°`;
    if (this.data) { this.data.track = buildRetargetTrack(this.data.clip, this.data.P, this.data.yaw, this.data.progress, { viewAngle: this.viewAngle, viewPitch: this.viewPitch }); this.mocapRig.setTrack(this.data.track); }
    if (updateUrl) this.syncUrl();
    this.render();
  }

  // 한 프레임의 관절을 화면 좌표로 바꾼다. 0°: 정면 방향이 화면 오른쪽(인물 오른쪽에서 봄), 90°: 인물 왼쪽이 화면 오른쪽.
  project(frame) {
    const d = this.data, { P, stride } = d, [start] = this.range();
    const h = this.options.align ? d.yaw[frame] : d.yaw[start];
    const F = [Math.sin(h), Math.cos(h)], L = [Math.cos(h), -Math.sin(h)];
    const vc = Math.cos(this.viewAngle * Math.PI / 180), vs = Math.sin(this.viewAngle * Math.PI / 180);
    const pc = Math.cos(this.viewPitch * Math.PI / 180), ps = Math.sin(this.viewPitch * Math.PI / 180);
    const originFrame = this.options.rootLock ? frame : start;
    const ox = P[originFrame * stride], oz = P[originFrame * stride + 2];
    const J = d.clip.joints.length, out = new Array(J);
    for (let j = 0; j < J; j++) {
      const x = P[frame * stride + j * 3] - ox, y = P[frame * stride + j * 3 + 1] - d.ground, z = P[frame * stride + j * 3 + 2] - oz;
      const forward = x * F[0] + z * F[1], left = x * L[0] + z * L[1];
      const depth = forward * vs - left * vc;
      out[j] = { x: forward * vc + left * vs, y: y * pc - depth * ps, depth: depth * pc + y * ps };
    }
    return out;
  }

  render() {
    if (!this.active) return;
    this.renderMocap();
    if (this.rigRenderer && this.options.compare) {
      if (this.data) this.mocapRig.setFrame(this.frame());
      this.rigRenderer.render(this.activeRig(), { size: 300, debug: this.options.rigDebug });
    }
  }

  renderMocap() {
    const canvas = $('mocap-canvas'), box = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(box.width * dpr)), hgt = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== w || canvas.height !== hgt) { canvas.width = w; canvas.height = hgt; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, hgt);
    if (!this.data) return;
    const d = this.data, frame = this.frame(), pts = this.project(frame), I = d.clip.index;
    const scale = Math.min((hgt - 110 * dpr) / 185, w / 210), groundY = hgt - 56 * dpr;
    let camX = 0;
    if (!this.options.rootLock) { const hip = pts[I.Hips].x * scale; camX = Math.floor((hip + w * 0.35) / (w * 0.7)) * w * 0.7; }
    const sx = (p) => w / 2 + p.x * scale - camX, sy = (p) => groundY - p.y * scale;

    // 지면과 50cm 눈금. 제자리 모드의 측면에서는 진행량만큼 눈금이 흐르므로 발 미끄러짐을 비교할 수 있다.
    ctx.strokeStyle = 'rgba(185,198,201,.45)'; ctx.lineWidth = 1 * dpr;
    ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(w, groundY); ctx.stroke();
    if (this.viewAngle < 80) {
      const [start] = this.range();
      const shift = this.options.rootLock ? -(d.progress[frame] - d.progress[start]) * Math.cos(this.viewAngle * Math.PI / 180) : 0;
      const step = 50 * scale, first = ((w / 2 + shift * scale - camX) % step + step) % step;
      ctx.fillStyle = 'rgba(185,198,201,.5)';
      for (let x = first; x < w; x += step) ctx.fillRect(Math.round(x), groundY, Math.max(1, dpr), 7 * dpr);
    }

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath(); ctx.ellipse(sx({ x: pts[I.Hips].x, y: 0 }), groundY, 34 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.fill();

    // 뼈: 먼 쪽부터 그린다.
    const depths = pts.map((p) => p.depth), dMin = Math.min(...depths), dMax = Math.max(...depths), span = Math.max(1, dMax - dMin);
    const bones = d.bones.map(([a, b]) => ({ a, b, depth: (pts[a].depth + pts[b].depth) / 2 })).sort((u, v) => u.depth - v.depth);
    ctx.lineCap = 'round';
    for (const bone of bones) {
      const near = (bone.depth - dMin) / span, [r, g, b] = COLORS[d.sides[bone.b]];
      ctx.strokeStyle = `rgba(${r},${g},${b},${(0.4 + near * 0.6).toFixed(3)})`;
      ctx.lineWidth = (2.2 + near * 2.2) * dpr;
      ctx.beginPath(); ctx.moveTo(sx(pts[bone.a]), sy(pts[bone.a])); ctx.lineTo(sx(pts[bone.b]), sy(pts[bone.b])); ctx.stroke();
    }
    ctx.fillStyle = '#f2efe4';
    pts.forEach((p, j) => { if (!d.clip.joints[j].end) { ctx.beginPath(); ctx.arc(sx(p), sy(p), 2.2 * dpr, 0, Math.PI * 2); ctx.fill(); } });
    const head = pts[I.Head], top = pts[I.Head_End];
    if (head && top) {
      const cx = (sx(head) + sx(top)) / 2, cy = (sy(head) + sy(top)) / 2, radius = Math.max(4 * dpr, Math.hypot(sx(top) - sx(head), sy(top) - sy(head)) * 0.6);
      ctx.strokeStyle = 'rgba(236,231,216,.8)'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
    }

    // 접지 추정
    const contact = [d.contacts[frame * 2], d.contacts[frame * 2 + 1]];
    if (this.options.contacts) {
      ['Left', 'Right'].forEach((side, s) => {
        if (!contact[s]) return;
        const toe = pts[I[`${side}Toe_End`]], ankle = pts[I[`${side}Ankle`]];
        ctx.strokeStyle = 'rgba(143,209,158,.95)'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.moveTo(sx(ankle), groundY + 3 * dpr); ctx.lineTo(sx(toe), groundY + 3 * dpr); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx(toe), groundY, 4 * dpr, 0, Math.PI * 2); ctx.stroke();
      });
    }
    if (this.options.labels) {
      ctx.font = `${9 * dpr}px system-ui, sans-serif`; ctx.fillStyle = 'rgba(215,224,226,.85)';
      pts.forEach((p, j) => { const joint = d.clip.joints[j]; if (!joint.end) ctx.fillText(joint.name, sx(p) + 5 * dpr, sy(p) - 4 * dpr); });
    }

    const [a, b] = this.range(), fps = 1 / d.clip.frameTime;
    $('mocap-frame').value = String(frame);
    $('mocap-frame-label').textContent = String(frame).padStart(4, '0');
    $('mocap-time').value = `${((frame - a) / fps).toFixed(2)} / ${((b - a) / fps).toFixed(2)}초`;
    $('mocap-state').textContent = `${this.clipKey === 'USER' ? `${this.userFile.name}${this.userFile.animation ? ` · ${this.userFile.animation}` : ''}` : `${STYLE}_${this.clipKey} · ${MOCAP_CLIPS[this.clipKey]}`} · ${this.paused ? '일시정지' : `${this.speed}×`}`;
    const prev = Math.max(a, frame - 6), next = Math.min(b, frame + 6);
    const speed = next > prev ? (d.progress[next] - d.progress[prev]) * fps / (next - prev) : 0;
    const hipY = d.P[frame * d.stride + I.Hips * 3 + 1] - d.ground;
    $('mocap-metrics').textContent = `프레임 ${frame} (${a}–${b}, ${Math.round(fps)}fps) · 골반 높이 ${hipY.toFixed(1)}cm · 진행 속도 ${(Math.abs(speed) < 0.5 ? 0 : speed).toFixed(0)}cm/s · 접지 추정 L ${contact[0] ? '●' : '○'} R ${contact[1] ? '●' : '○'} · 정면 ${(d.yaw[frame] * 180 / Math.PI).toFixed(0)}°${d.inPlace ? ' · 제자리 클립 → 디딤발로 진행량 추정' : ''}`;
    if (this.rigMode === 'retarget' && this.options.compare) {
      const pose = this.mocapRig.pose(), err = Math.max(...pose.legs.map((l) => l.error));
      $('mocap-retarget').textContent = `리타겟 · 배율 ${d.track.scale.toFixed(3)}px/cm · 골반 ${pose.pelvis.y.toFixed(1)}px · 몸통 ${(pose.torso.a * 180 / Math.PI).toFixed(1)}° · 다리 IK 오차 ${err.toFixed(2)}px · 손잡이 오차 ${pose.gripError.toFixed(2)}px · 발 고정 L ${pose.legs[0].foot.locked ? '●' : '○'} R ${pose.legs[1].foot.locked ? '●' : '○'} · 바닥 IK 가중 L ${pose.legs[0].weight.toFixed(2)} R ${pose.legs[1].weight.toFixed(2)} (0=모캡 각도) ${pose.spineBend ? ` · 척추 휨 ${Math.max(...pose.spineBend.map(Math.abs)).toFixed(1)}px` : ''} · 고개 ${pose.headTilt === null ? '스프링만' : `${(pose.headTilt * 180 / Math.PI).toFixed(1)}°`} · 마디 ${(() => { const L = this.mocapRig.lens(); return `허벅지/정강이 ${L.thigh.toFixed(0)}/${L.shin.toFixed(0)} · 위팔/아래팔 ${L.upperArm.toFixed(0)}/${L.forearm.toFixed(0)}px · 그림 배율 몸통 ×${L.torso.toFixed(2)} 머리 ×${L.head.toFixed(2)} 부츠 ${pose.partScale ? pose.partScale.foot.map((v) => `×${v.toFixed(2)}`).join("/") : `×${L.foot.toFixed(2)}`}${this.options.match ? " (발끝 맞춤)" : ""}`; })()}`;
    } else $('mocap-retarget').textContent = '';
  }

  snapshot() {
    return { status: this.status, active: this.active, clip: this.clipKey, viewAngle: this.viewAngle, viewPitch: this.viewPitch, paused: this.paused, frame: this.data ? this.frame() : null, range: this.range(), options: { ...this.options }, joints: this.data?.clip.joints.length ?? null };
  }
}
