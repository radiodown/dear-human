// Plan E: sprites rendered offline from the 3D model (tools/plan_e/render_sprites.py).
// The page only plays the saved PNG sheets; it never renders or regenerates them.
const $ = id => document.getElementById(id);
const base = '/art/characters/clone_01/motion/plan_e/';
const versions = {sprite_006: '006 · 측면 9개 동작', sprite_005: '005 · 손가락·머리카락·조준 걷기', sprite_004: '004 · 팔다리 분리·망토 흔들림', sprite_003: '003 · 원화 투영 모델', sprite_002: '002 · M16·망토/머리 흔들림', sprite_001: '001 · 임시 상자 M16'};
const latest = 'sprite_006';
const scales = [2, 3, 4];
const fpsChoices = [6, 12, 15, 24];

async function json(path) {
  const response = await fetch(path, {cache: 'no-store'});
  if (!response.ok) throw new Error('플랜 E 스프라이트 목록을 불러오지 못했습니다.');
  return response.json();
}

export class PlanELab {
  constructor() {
    this.active = false; this.status = 'idle'; this.clipId = 'idle'; this.index = 0;
    this.paused = false; this.loop = true; this.fps = null; this.scale = 3; this.background = 'light';
    this.version = latest;
    this.cache = new Map(); this.request = 0; this.raf = 0; this.last = null; this.elapsed = 0;
    this.context = $('plan-e-canvas').getContext('2d');
    this.tick = this.tick.bind(this);
    $('plan-e-pause').addEventListener('click', () => this.pause(!this.paused));
    $('plan-e-prev').addEventListener('click', () => this.step(-1));
    $('plan-e-next').addEventListener('click', () => this.step(1));
    $('plan-e-frame').addEventListener('input', event => this.seek(Number(event.target.value)));
    $('plan-e-fps').addEventListener('change', event => { this.fps = Number(event.target.value) || null; this.elapsed = 0; this.sync(); this.writeUrl(); });
    $('plan-e-loop').addEventListener('change', event => { this.loop = event.target.checked; this.writeUrl(); });
    $('plan-e-scale').addEventListener('change', event => { this.scale = Number(event.target.value); this.render(); this.writeUrl(); });
    $('plan-e-version').replaceChildren(...Object.entries(versions).map(([value, label]) => Object.assign(document.createElement('option'), {value, textContent: label})));
    $('plan-e-version').addEventListener('change', event => this.setVersion(event.target.value));
    $('plan-e-background').addEventListener('change', event => { this.background = event.target.value; this.render(); });
    $('plan-e-stage').addEventListener('keydown', event => {
      if (!this.active || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); this.pause(!this.paused); }
      if (['ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); this.step(event.code === 'ArrowLeft' ? -1 : 1); }
    });
    document.addEventListener('visibilitychange', () => { this.last = null; this.schedule(); });
  }

  get root() { return `${base}${this.version}/`; }

  setVersion(version, update = true) {
    if (!Object.hasOwn(versions, version) || version === this.version) return;
    this.version = version; this.clipIndex = null; this.initializing = null; this.pendingFrame = this.index;
    this.syncLinks();
    if (this.active) this.init();
    if (update) this.writeUrl();
  }

  syncLinks() {
    $('plan-e-version').value = this.version;
    $('plan-e-readme').href = `${this.root}README.md`;
    $('plan-e-reload-sheet').href = `${this.root}output/reload/spritesheet.png`;
    $('plan-e-turn-sheet').href = `${this.root}output/${this.version >= 'sprite_006' ? 'walk' : 'turnaround'}/spritesheet.png`;
  }

  get clip() { return this.loaded?.manifest ?? null; }
  get frameFps() { return this.fps ?? this.clip?.fps ?? 12; }

  async init() {
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      this.clipIndex = await json(this.root + 'output/clips.json');
      $('plan-e-clips').replaceChildren(...this.clipIndex.clips.map(clip => {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = clip.title; button.dataset.planEClip = clip.id;
        button.addEventListener('click', () => this.setClip(clip.id));
        return button;
      }));
      await this.loadClip(this.clipId, this.pendingFrame ?? 0);
    })().catch(error => { this.status = 'failed'; this.message(error.message); this.initializing = null; });
    return this.initializing;
  }

  message(text) { $('plan-e-loading').textContent = text; $('plan-e-loading').hidden = false; }

  async loadClip(id, index = 0) {
    const request = ++this.request; this.cancel(); this.status = 'loading'; this.loaded = null;
    this.message('플랜 E 스프라이트를 불러오는 중…'); this.sync();
    try {
      // Older versions have other clips (e.g. 001~005 have no idle): fall back to the first one.
      let entry = this.clipIndex.clips.find(clip => clip.id === id);
      if (!entry && this.clipIndex.clips.length) { entry = this.clipIndex.clips[0]; id = this.clipId = entry.id; }
      if (!entry) throw new Error('준비되지 않은 동작입니다.');
      const key = `${this.version}/${id}`;
      if (!this.cache.has(key)) {
        const pending = (async () => {
          const url = this.root + entry.path, manifest = await json(url);
          const sheet = new Image();
          sheet.src = new URL(manifest.spritesheet, new URL(url, location.href)).href;
          await sheet.decode();
          const {width, height} = manifest.canvas;
          if (sheet.naturalWidth !== width * manifest.frameCount || sheet.naturalHeight !== height) throw new Error('플랜 E 시트 크기가 목록과 다릅니다.');
          return {manifest, sheet};
        })();
        this.cache.set(key, pending);
        pending.catch(() => { if (this.cache.get(key) === pending) this.cache.delete(key); });
      }
      const loaded = await this.cache.get(key);
      if (request !== this.request || id !== this.clipId) return;
      this.loaded = loaded; this.status = 'ready'; this.pendingFrame = null;
      this.index = Math.min(Math.max(0, index), loaded.manifest.frameCount - 1);
      this.loop = loaded.manifest.loop || this.loopOverride !== false;
      $('plan-e-loading').hidden = true;
      this.render(); this.sync(); this.schedule();
    } catch (error) {
      if (request === this.request) { this.status = 'failed'; this.message(error.message); this.sync(); }
    }
  }

  setClip(id) {
    this.clipId = id; this.index = 0; this.elapsed = 0;
    if (this.clipIndex) this.loadClip(id);
    this.sync(); this.writeUrl();
  }

  restoreParams(params) {
    this.clipId = params.get('clip') || 'idle';
    const version = params.get('version');
    if (Object.hasOwn(versions, version) && version !== this.version) { this.version = version; this.clipIndex = null; this.initializing = null; }
    this.syncLinks();
    const frame = Number(params.get('frame'));
    this.pendingFrame = Number.isFinite(frame) ? Math.max(0, Math.trunc(frame)) : 0;
    this.paused = params.get('paused') === '1';
    this.loopOverride = params.get('loop') === '0' ? false : undefined;
    const fps = Number(params.get('fps')); this.fps = fpsChoices.includes(fps) ? fps : null;
    const scale = Number(params.get('scale')); this.scale = scales.includes(scale) ? scale : 3;
    if (this.clipIndex) this.loadClip(this.clipId, this.pendingFrame);
    this.sync();
  }

  writeParams(params) {
    for (const key of ['study', 'pixelView', 'motion', 'face', 'viewPitch', 'time', 'weapon', 'debug', 'mesh'])params.delete(key);
    params.set('plan', 'e'); params.set('clip', this.clipId);
    if (this.version !== latest) params.set('version', this.version); else params.delete('version');
    const frame = this.pendingFrame ?? this.index;
    if (frame) params.set('frame', String(frame)); else params.delete('frame');
    if (this.paused) params.set('paused', '1'); else params.delete('paused');
    if (this.fps) params.set('fps', String(this.fps)); else params.delete('fps');
    if (!this.loop) params.set('loop', '0'); else params.delete('loop');
    if (this.scale !== 3) params.set('scale', String(this.scale)); else params.delete('scale');
  }

  writeUrl() {
    if (!this.active) return;
    const [route, query] = location.hash.split('?'), params = new URLSearchParams(query || '');
    this.writeParams(params);
    history.replaceState(null, '', `${location.pathname}${location.search}${route}?${params}`);
  }

  show(active) {
    this.active = active; this.last = null; this.cancel();
    if (!active) return;
    if (!this.clipIndex) this.init(); else { this.render(); this.schedule(); }
  }

  pause(paused) {
    if (!paused && !this.loop && this.clip && this.index >= this.clip.frameCount - 1) this.index = 0;
    this.paused = paused; this.last = null; this.elapsed = 0; this.sync(); this.writeUrl(); this.schedule();
  }
  seek(index) { this.paused = true; this.index = index; this.elapsed = 0; this.render(); this.sync(); this.writeUrl(); this.schedule(); }
  step(direction) {
    if (!this.clip) return;
    const n = this.clip.frameCount;
    this.paused = true; this.index = (this.index + direction + n) % n; this.elapsed = 0;
    this.render(); this.sync(); this.writeUrl(); this.schedule();
  }

  cancel() { cancelAnimationFrame(this.raf); this.raf = 0; }
  schedule() {
    this.cancel();
    if (this.active && this.status === 'ready' && !this.paused && !document.hidden) this.raf = requestAnimationFrame(this.tick);
  }
  tick(now) {
    this.raf = 0;
    const delta = this.last === null ? 0 : Math.min(now - this.last, 250); this.last = now;
    this.elapsed += delta;
    const frameMs = 1000 / this.frameFps, n = this.clip.frameCount;
    let changed = false;
    while (this.elapsed >= frameMs) {
      this.elapsed -= frameMs;
      if (this.index < n - 1) this.index += 1;
      else if (this.loop) this.index = 0;
      else { this.paused = true; this.elapsed = 0; this.writeUrl(); break; }
      changed = true;
    }
    if (changed || this.paused) { this.render(); this.sync(); }
    this.schedule();
  }

  render() {
    if (!this.active || this.status !== 'ready') return;
    const {manifest, sheet} = this.loaded, {width, height} = manifest.canvas, canvas = $('plan-e-canvas');
    canvas.width = width * this.scale; canvas.height = height * this.scale;
    const ctx = this.context;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sheet, this.index * width, 0, width, height, 0, 0, canvas.width, canvas.height);
    $('plan-e-stage').className = `plan-e-stage bg-${this.background}`;
  }

  sync() {
    const ready = this.status === 'ready', n = this.clip?.frameCount ?? 0;
    document.querySelectorAll('[data-plan-e-clip]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.planEClip === this.clipId)));
    for (const id of ['plan-e-prev', 'plan-e-next', 'plan-e-pause', 'plan-e-frame']) $(id).disabled = !ready;
    $('plan-e-pause').textContent = this.paused ? '재생' : '일시정지';
    $('plan-e-loop').checked = this.loop;
    $('plan-e-fps').value = this.fps ?? 'default';
    $('plan-e-scale').value = String(this.scale);
    $('plan-e-frame').max = Math.max(0, n - 1); $('plan-e-frame').value = this.index;
    $('plan-e-counter').textContent = n ? `${String(this.index + 1).padStart(2, '0')} / ${n}` : '—';
    const label = this.clip?.frames?.[this.index]?.label;
    $('plan-e-caption').textContent = ready
      ? `${this.clip.title} · ${n}프레임 · ${this.frameFps}fps · ${this.clip.canvas.width}×${this.clip.canvas.height}px${label ? ` · ${label}` : ''}${this.paused ? ' · 정지' : ''}`
      : '스프라이트를 준비하는 중입니다.';
  }
}
