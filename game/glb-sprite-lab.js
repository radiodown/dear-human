// GLB sprite tab: plays the 2D sprite sheets rendered from version04.glb in Blender (glb_model_001/sprite_001).
// The page only draws the saved sheets; it never renders or regenerates them.
const $ = id => document.getElementById(id);
const ROOT = '/art/characters/clone_01/motion/glb_model_001/sprite_001/';
const CLIPS = { walk: '걷기', run: '달리기' };

export class GlbSpriteLab {
  constructor() {
    this.active = false; this.clipId = 'walk'; this.sprite = null; this.cache = new Map(); this.request = 0;
    this.frame = 0; this.time = 0; this.paused = false; this.speed = 1; this.facing = 1; this.background = 'dark';
    this.raf = 0; this.last = null; this.tick = this.tick.bind(this);
    this.context = $('glbs-canvas').getContext('2d');
    $('glbs-clips').replaceChildren(...Object.entries(CLIPS).map(([id, label]) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: label, title: `sprite_001/${id}` });
      button.dataset.clip = id;
      button.addEventListener('click', () => this.setClip(id));
      return button;
    }));
    $('glbs-pause').addEventListener('click', () => this.pause(!this.paused));
    $('glbs-prev').addEventListener('click', () => this.step(-1));
    $('glbs-next').addEventListener('click', () => this.step(1));
    $('glbs-restart').addEventListener('click', () => { this.frame = 0; this.time = 0; this.draw(); });
    $('glbs-speed').addEventListener('change', event => { this.speed = Number(event.target.value); this.writeUrl(); });
    $('glbs-turn').addEventListener('click', () => { this.facing *= -1; this.draw(); this.writeUrl(); });
    $('glbs-background').addEventListener('change', event => { this.background = event.target.value; this.applyBackground(); });
    $('glbs-stage').addEventListener('keydown', event => {
      if (!this.active || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); this.pause(!this.paused); }
      if (['ArrowLeft', 'ArrowRight'].includes(event.code)) { event.preventDefault(); this.step(event.code === 'ArrowLeft' ? -1 : 1); }
    });
    window.addEventListener('resize', () => { if (this.active) this.draw(); });
    document.addEventListener('visibilitychange', () => { this.last = null; });
    this.applyBackground();
  }

  show(active) {
    this.active = active;
    if (!active) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    this.last = null;
    this.setClip(this.clipId, false);
    this.schedule();
  }

  async setClip(id, update = true) {
    if (!Object.hasOwn(CLIPS, id)) id = 'walk';
    this.clipId = id;
    for (const button of $('glbs-clips').children) button.setAttribute('aria-pressed', String(button.dataset.clip === id));
    const request = ++this.request;
    if (!this.cache.has(id)) this.cache.set(id, (async () => {
      const response = await fetch(`${ROOT}${id}/manifest.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error('스프라이트 목록을 불러오지 못했습니다.');
      const manifest = await response.json();
      const image = new Image(); image.src = `${ROOT}${id}/${manifest.spritesheet}`; await image.decode();
      return { manifest, image };
    })());
    $('glbs-loading').hidden = false; $('glbs-loading').textContent = '스프라이트를 불러오는 중…';
    try {
      const sprite = await this.cache.get(id);
      if (request !== this.request) return;
      this.sprite = sprite; this.frame = 0; this.time = 0;
      $('glbs-loading').hidden = true;
      $('glbs-caption').textContent = `sprite_001 · ${CLIPS[id]} · Blender 렌더 PNG ${sprite.manifest.frameCount}장 · ${sprite.manifest.canvas.width}×${sprite.manifest.canvas.height} · 기본 ${sprite.manifest.fps}fps`;
      this.draw();
    } catch (error) {
      this.cache.delete(id);
      $('glbs-loading').textContent = `스프라이트를 불러오지 못했습니다: ${error.message}`;
    }
    if (update) this.writeUrl();
  }

  step(delta) {
    if (!this.sprite) return;
    const count = this.sprite.manifest.frameCount;
    this.frame = (this.frame + delta + count) % count; this.time = 0;
    this.pause(true); this.draw();
  }

  pause(paused) {
    this.paused = paused; $('glbs-pause').textContent = paused ? '재생' : '일시정지';
    this.last = null; this.writeUrl();
  }

  applyBackground() {
    $('glbs-stage').classList.toggle('bg-dark', this.background === 'dark');
    $('glbs-stage').classList.toggle('bg-light', this.background !== 'dark');
    $('glbs-background').value = this.background;
  }

  draw() {
    if (!this.sprite) return;
    const { manifest, image } = this.sprite, width = manifest.canvas.width, height = manifest.canvas.height;
    const canvas = $('glbs-canvas');
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const side = Math.max(240, Math.min(560, $('glbs-stage').clientWidth - 24));
    canvas.style.width = `${side}px`; canvas.style.height = `${side * height / width}px`;
    const context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, width, height);
    if (this.facing < 0) context.setTransform(-1, 0, 0, 1, width, 0);
    context.drawImage(image, this.frame * width, 0, width, height, 0, 0, width, height);
    $('glbs-counter').textContent = `${this.frame + 1} / ${manifest.frameCount}장`;
  }

  schedule() { if (!this.raf && this.active) this.raf = requestAnimationFrame(this.tick); }

  tick(now) {
    this.raf = 0;
    if (!this.active) return;
    const dt = this.last == null ? 0 : Math.min(.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && this.sprite) {
      const { fps, frameCount } = this.sprite.manifest;
      this.time += dt * this.speed;
      const steps = Math.floor(this.time * fps);
      if (steps) { this.time -= steps / fps; this.frame = (this.frame + steps) % frameCount; this.draw(); }
    }
    this.schedule();
  }

  restoreParams(params) {
    if (Object.hasOwn(CLIPS, params.get('clip'))) this.clipId = params.get('clip');
    const speed = Number(params.get('speed')); if ([.25, .5, 1].includes(speed)) { this.speed = speed; $('glbs-speed').value = String(speed); }
    if (params.get('face') === 'left') this.facing = -1;
    if (params.get('paused') === '1') this.pause(true);
  }

  writeParams(params) {
    for (const key of ['frame', 'fps', 'loop', 'viewPitch', 'scale', 'version', 'motion', 'study', 'pixelView', 'inPlace']) params.delete(key);
    params.set('plan', 'glb-sprite');
    params.set('clip', this.clipId);
    if (this.speed !== 1) params.set('speed', String(this.speed)); else params.delete('speed');
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
