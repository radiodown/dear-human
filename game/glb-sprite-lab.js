// GLB sprite tab: plays the 2D sprite sheets rendered from each page's GLB in Blender (glb_model_001/sprite_00N).
// The page only draws the saved sheets; it never renders or regenerates them.
const $ = id => document.getElementById(id);
// Per page: sprite versions (newest first) and the clips each one has. `dir`/`manifest` let one folder hold
// several resolutions side by side (manifest_200.json, manifest_100.json…); older folders use manifest.json.
export const SPRITE_MODELS = {
  clone_01: {
    base: '/art/characters/clone_01/motion/glb_model_001/', file: 'version04.glb',
    versions: {
      sprite_003: { label: '003 · 완전 우측면 · 200px/m', dir: 'sprite_003', manifest: 'manifest_200.json', clips: { walk: '걷기', run: '달리기', dive: '다이브', scared: '겁먹음' } },
      sprite_003_100: { label: '003 · 완전 우측면 · 100px/m (작게)', dir: 'sprite_003', manifest: 'manifest_100.json', clips: { walk: '걷기', run: '달리기', dive: '다이브', scared: '겁먹음' } },
      sprite_002: { label: '002 · 모든 프레임 24fps', clips: { walk: '걷기', run: '달리기' } },
      sprite_001: { label: '001 · 4프레임 간격 6fps', clips: { walk: '걷기', run: '달리기' } },
    },
    note: 'version04.glb를 Blender에서 렌더링한 스프라이트 시트를 재생합니다. 기본 003은 정사영 카메라를 정확히 오른쪽 옆에 둔 완전 우측면·제자리 렌더(tools/glb_sprites)로, 게임용으로 12fps·동작별 여백 자르기·무손실 WebP로 줄였습니다. 해상도는 기본 200px/m와 더 작은 100px/m를 버전에서 고릅니다. 002·001은 사용자가 직접 렌더링한 이전 걷기·달리기입니다.',
  },
  iren: {
    base: '/art/characters/iren/motion/glb_model_001/', file: 'iren_rig.glb',
    versions: {
      sprite_001: { label: '001 · 완전 우측면 · 200px/m', dir: 'sprite_001', manifest: 'manifest_200.json', clips: { walk: '걷기', run: '달리기', dive: '다이브', afraid: '겁먹음' } },
      sprite_001_100: { label: '001 · 완전 우측면 · 100px/m (작게)', dir: 'sprite_001', manifest: 'manifest_100.json', clips: { walk: '걷기', run: '달리기', dive: '다이브', afraid: '겁먹음' } },
    },
    note: 'iren_rig.glb를 Blender에서 정사영 완전 우측면·제자리로 렌더링한 스프라이트 시트를 재생합니다(tools/glb_sprites). 리안·몬스터와 같은 비율(기본 200px/m, 버전에서 100px/m)·12fps·동작별 여백 자르기·무손실 WebP입니다.',
  },
  moa: {
    base: '/art/characters/moa/motion/glb_model_001/', file: 'moa_rig.glb',
    versions: {
      sprite_001: { label: '001 · 완전 우측면 · 200px/m', dir: 'sprite_001', manifest: 'manifest_200.json', clips: { walk: '걷기', run: '달리기', dive: '다이브', afraid: '겁먹음' } },
      sprite_001_100: { label: '001 · 완전 우측면 · 100px/m (작게)', dir: 'sprite_001', manifest: 'manifest_100.json', clips: { walk: '걷기', run: '달리기', dive: '다이브', afraid: '겁먹음' } },
    },
    note: 'moa_rig.glb(정수리 뼈·가슴 가중치 보정본)를 Blender에서 정사영 완전 우측면·제자리로 렌더링한 스프라이트 시트를 재생합니다(tools/glb_sprites). 리안·아렌·몬스터와 같은 비율(기본 200px/m, 버전에서 100px/m)·12fps·동작별 여백 자르기·무손실 WebP입니다.',
  },
  vesper_colony_insect: {
    base: '/art/enemies/vesper_colony_insect/motion/glb_model_001/', file: 'mob.glb',
    versions: {
      sprite_001: { label: '001 · 완전 우측면 · 200px/m', dir: 'sprite_001', manifest: 'manifest_200.json', clips: { walk: '걷기', walk_fast: '빠른 걷기', pounce: '덮치기', pounce_fast: '빠른 덮치기', death: '사망', explode: '폭사' } },
      sprite_001_100: { label: '001 · 완전 우측면 · 100px/m (작게)', dir: 'sprite_001', manifest: 'manifest_100.json', clips: { walk: '걷기', walk_fast: '빠른 걷기', pounce: '덮치기', pounce_fast: '빠른 덮치기', death: '사망', explode: '폭사' } },
    },
    note: 'mob.glb를 Blender에서 정사영 완전 우측면으로 렌더링한 스프라이트 시트를 재생합니다(tools/glb_sprites). 리안과 같은 비율(기본 200px/m, 버전에서 100px/m)·12fps·동작별 여백 자르기·무손실 WebP이며 폭사만 연기가 잘리지 않게 넓은 기준 칸을 씁니다. 덮치기 두 동작은 0.5m 전진을 뺀 제자리이고, 폭사는 GLB 탭의 마지막 한 발 → 뒤집힘 → 공중 폭발 → 연기 효과를 같은 계산으로 프레임마다 그린 것입니다. 반복하지 않는 동작은 끝에서 1초 멈춘 뒤 다시 재생합니다.',
  },
};

export class GlbSpriteLab {
  constructor() {
    this.active = false; this.modelKey = 'clone_01'; this.version = this.latest; this.clipId = 'walk'; this.held = 0; this.sprite = null; this.cache = new Map(); this.request = 0;
    this.frame = 0; this.time = 0; this.paused = false; this.speed = 1; this.facing = 1; this.background = 'dark';
    this.raf = 0; this.last = null; this.tick = this.tick.bind(this);
    this.context = $('glbs-canvas').getContext('2d');
    this.buildControls();
    $('glbs-version').addEventListener('change', event => this.setVersion(event.target.value));
    $('glbs-pause').addEventListener('click', () => this.pause(!this.paused));
    $('glbs-prev').addEventListener('click', () => this.step(-1));
    $('glbs-next').addEventListener('click', () => this.step(1));
    $('glbs-restart').addEventListener('click', () => { this.frame = 0; this.time = 0; this.held = 0; this.draw(); });
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

  get model() { return SPRITE_MODELS[this.modelKey]; }
  get latest() { return Object.keys(SPRITE_MODELS[this.modelKey ?? 'clone_01'].versions)[0]; }
  get clips() { return this.model.versions[this.version].clips; }

  // Called on route change, before restoreParams/show.
  configure(key) {
    key = Object.hasOwn(SPRITE_MODELS, key) ? key : 'clone_01';
    if (key === this.modelKey) return;
    this.modelKey = key; this.version = this.latest; this.clipId = Object.keys(this.clips)[0]; this.sprite = null; this.request++;
    this.buildControls();
  }

  buildControls() {
    $('glbs-version').replaceChildren(...Object.entries(this.model.versions).map(([value, version]) => Object.assign(document.createElement('option'), { value, textContent: version.label })));
    $('glbs-version').value = this.version;
    this.buildTabs();
  }

  buildTabs() {
    $('glbs-clips').replaceChildren(...Object.entries(this.clips).map(([id, label]) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', textContent: label, title: id });
      button.dataset.clip = id;
      button.addEventListener('click', () => this.setClip(id));
      return button;
    }));
  }

  show(active) {
    this.active = active;
    if (!active) { cancelAnimationFrame(this.raf); this.raf = 0; return; }
    this.last = null;
    $('glbs-note').textContent = this.model.note;
    this.setClip(this.clipId, false);
    this.schedule();
  }

  setVersion(version, update = true) {
    if (!Object.hasOwn(this.model.versions, version)) return;
    this.version = version; $('glbs-version').value = version; this.buildTabs();
    if (this.active) this.setClip(this.clipId, update); else if (update) this.writeUrl();
  }

  async setClip(id, update = true) {
    if (!Object.hasOwn(this.clips, id)) id = Object.keys(this.clips)[0];
    this.clipId = id;
    for (const button of $('glbs-clips').children) button.setAttribute('aria-pressed', String(button.dataset.clip === id));
    const info = this.model.versions[this.version];
    const request = ++this.request, root = `${this.model.base}${info.dir ?? this.version}/`, key = `${this.modelKey}/${this.version}/${id}`;
    if (!this.cache.has(key)) this.cache.set(key, (async () => {
      const response = await fetch(`${root}${id}/${info.manifest ?? 'manifest.json'}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('스프라이트 목록을 불러오지 못했습니다.');
      const manifest = await response.json();
      const image = new Image(); image.src = `${root}${id}/${manifest.spritesheet}`; await image.decode();
      return { manifest, image };
    })());
    $('glbs-loading').hidden = false; $('glbs-loading').textContent = '스프라이트를 불러오는 중…';
    try {
      const sprite = await this.cache.get(key);
      if (request !== this.request) return;
      this.sprite = sprite; this.frame = 0; this.time = 0; this.held = 0;
      $('glbs-loading').hidden = true;
      $('glbs-caption').textContent = `${this.model.file} · ${this.version} · ${this.clips[id]} · Blender 렌더 ${sprite.manifest.frameCount}장 · ${sprite.manifest.crop ? `프레임 ${sprite.manifest.crop.width}×${sprite.manifest.crop.height} (기준 ${sprite.manifest.canvas.width}×${sprite.manifest.canvas.height}, ${sprite.manifest.pixelsPerMeter}px/m)` : `${sprite.manifest.canvas.width}×${sprite.manifest.canvas.height}`} · 기본 ${sprite.manifest.fps}fps${sprite.manifest.loop === false ? ' · 한 번 재생' : ''}`;
      this.draw();
    } catch (error) {
      this.cache.delete(key);
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
    const room = Math.max(240, $('glbs-stage').clientWidth - 24), side = Math.max(240, Math.min(560, room));
    // schema 2 (game-size sprites): every clip of a model shares one px/m scale, so size the canvas by the
    // model's base canvas; a wider clip (explode) then shows bigger instead of shrinking the monster.
    const scale = manifest.modelCanvas ? Math.min(side / manifest.modelCanvas, room / width) : side / width;
    canvas.style.width = `${width * scale}px`; canvas.style.height = `${height * scale}px`;
    const context = this.context;
    context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, width, height);
    if (this.facing < 0) context.setTransform(-1, 0, 0, 1, width, 0);
    const columns = manifest.columns ?? manifest.frameCount; // sprite_001 sheets are one horizontal row
    // cropped frames sit at manifest.crop inside the logical canvas; older sheets fill the canvas
    const crop = manifest.crop ?? { x: 0, y: 0, width, height };
    const sx = (this.frame % columns) * crop.width, sy = Math.floor(this.frame / columns) * crop.height;
    context.drawImage(image, sx, sy, crop.width, crop.height, crop.x, crop.y, crop.width, crop.height);
    $('glbs-counter').textContent = `${this.frame + 1} / ${manifest.frameCount}장`;
  }

  schedule() { if (!this.raf && this.active) this.raf = requestAnimationFrame(this.tick); }

  tick(now) {
    this.raf = 0;
    if (!this.active) return;
    const dt = this.last == null ? 0 : Math.min(.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && this.sprite) {
      const { fps, frameCount, loop } = this.sprite.manifest;
      if (loop === false && this.frame === frameCount - 1) {
        // one-shot clips (pounce, death, explode): hold the last frame for 1 s, then play again
        this.held += dt * this.speed;
        if (this.held >= 1) { this.held = 0; this.time = 0; this.frame = 0; this.draw(); }
      } else {
        this.time += dt * this.speed;
        const steps = Math.floor(this.time * fps);
        if (steps) {
          this.time -= steps / fps;
          this.frame = loop === false ? Math.min(frameCount - 1, this.frame + steps) : (this.frame + steps) % frameCount;
          this.draw();
        }
      }
    }
    this.schedule();
  }

  restoreParams(params) {
    if (Object.hasOwn(this.model.versions, params.get('version'))) { this.version = params.get('version'); $('glbs-version').value = this.version; this.buildTabs(); }
    if (Object.hasOwn(this.clips, params.get('clip'))) this.clipId = params.get('clip');
    const speed = Number(params.get('speed')); if ([.25, .5, 1].includes(speed)) { this.speed = speed; $('glbs-speed').value = String(speed); }
    if (params.get('face') === 'left') this.facing = -1;
    if (params.get('paused') === '1') this.pause(true);
  }

  writeParams(params) {
    for (const key of ['frame', 'fps', 'loop', 'viewPitch', 'scale', 'motion', 'study', 'pixelView', 'inPlace']) params.delete(key);
    if (this.version !== this.latest) params.set('version', this.version); else params.delete('version');
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
