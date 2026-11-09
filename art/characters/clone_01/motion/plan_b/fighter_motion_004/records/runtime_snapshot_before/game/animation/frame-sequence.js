import { SequenceFire } from './sequence-fire.js';
import { sequenceMuzzles, drawSequenceMuzzle } from './sequence-muzzle.js';

// Model-generated PNG playback, shared with future game views.
const tracks = new Map();
async function loadTrack(manifestUrl) {
  if (!tracks.has(manifestUrl)) {
    const pending = (async () => {
      const response = await fetch(manifestUrl, {cache:'no-store'});
      if (!response.ok) throw new Error('플랜 B 모션 목록을 불러오지 못했습니다.');
      const manifest = await response.json();
      const {canvas, frameCount, durationMs, spritesheet} = manifest;
      if (frameCount !== 14 || !canvas?.width || !canvas?.height || !(durationMs > 0)) throw new Error('플랜 B 모션 형식이 올바르지 않습니다.');
      const loopRange = manifest.loopRange ?? [0, frameCount - 1];
      if (!Array.isArray(loopRange) || loopRange.length !== 2 || !loopRange.every(Number.isInteger) || loopRange[0] < 0 || loopRange[1] >= frameCount || loopRange[0] >= loopRange[1]) throw new Error('플랜 B 반복 구간이 올바르지 않습니다.');
      const frameDurations = manifest.frameDurationsMs ?? Array(frameCount).fill(durationMs);
      if (!Array.isArray(frameDurations) || frameDurations.length !== frameCount || !frameDurations.every(value => Number.isFinite(value) && value > 0)) throw new Error('플랜 B 프레임 시간이 올바르지 않습니다.');
      const atlas = new Image();
      atlas.src = new URL(spritesheet, new URL(manifestUrl, location.href)).href;
      await atlas.decode();
      if (atlas.naturalWidth !== canvas.width * frameCount || atlas.naturalHeight !== canvas.height) throw new Error('플랜 B 시트 크기가 목록과 다릅니다.');
      return {manifest, atlas, loopRange, frameDurations};
    })();
    tracks.set(manifestUrl, pending);
    pending.catch(() => { if (tracks.get(manifestUrl) === pending) tracks.delete(manifestUrl); });
  }
  return tracks.get(manifestUrl);
}
export class FrameSequence {
  constructor(canvas, onFrame = () => {}) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.onFrame = onFrame;
    this.index = 0;
    this.speed = 1;
    this.paused = false;
    this.visible = false;
    this.tick = this.tick.bind(this);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancelFire(); this.schedule(); });
  }
  async load(manifestUrl, fireOptions = null) {
    const sourceKey = JSON.stringify([manifestUrl, fireOptions]);
    if (this.sourceKey === sourceKey && this.pending) return this.pending;
    const requestId = this.requestId = (this.requestId || 0) + 1;
    this.sourceUrl = manifestUrl;
    this.sourceKey = sourceKey;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.manifest = null;
    this.atlas = null;
    this.fire = null;
    this.rawPreview = false;
    this.pending = (async () => {
      const [primary, base, firing] = await Promise.all([
        loadTrack(manifestUrl), loadTrack(fireOptions?.baseUrl ?? manifestUrl),
        fireOptions ? loadTrack(fireOptions.fireUrl) : Promise.resolve(null),
      ]);
      if (requestId !== this.requestId) return false;
      const {manifest, atlas, loopRange, frameDurations} = primary;
      const {canvas} = manifest;
      if ([base, firing].filter(Boolean).some(track => track.manifest.canvas.width !== canvas.width || track.manifest.canvas.height !== canvas.height)) throw new Error('플랜 B 동작 간 캔버스 크기가 다릅니다.');
      if (firing && (!firing.manifest.shotIndices?.length || !firing.manifest.shotIndices.every(i => Number.isInteger(i) && i >= loopRange[0] && i <= loopRange[1]))) throw new Error('플랜 B 발사 포즈가 올바르지 않습니다.');
      if (firing) { sequenceMuzzles(base); sequenceMuzzles(firing); }
      this.manifest = manifest;
      this.atlas = atlas;
      this.primaryTrack = primary;
      this.baseTrack = base;
      this.fireTrack = firing;
      this.fire = firing ? new SequenceFire(fireOptions.kind, firing.manifest.shotIndices, base.loopRange) : null;
      this.loopRange = loopRange;
      this.frameDurations = frameDurations;
      this.index = this.fire?.kind === 'stationary' ? 0 : loopRange[0];
      this.canvas.width = canvas.width;
      this.canvas.height = canvas.height;
      this.canvas.dataset.pixelArt = String(Boolean(manifest.pixelArt));
      this.context.imageSmoothingEnabled = !manifest.pixelArt;
      this.draw();
      this.schedule();
      return true;
    })();
    try { return await this.pending; } catch (error) {
      if (requestId === this.requestId) { this.pending = null; this.sourceUrl = null; this.sourceKey = null; }
      throw error;
    }
  }
  show(visible) { this.visible = visible; if (!visible) this.cancelFire(); this.schedule(); }
  get timelineActive() { return !this.fire || this.rawPreview || this.fire.kind === 'walking' || this.fire.active || this.fire.held; }
  schedule() {
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastTime = null;
    this.elapsed = 0;
    if (this.visible && !this.paused && !document.hidden && this.atlas?.complete && this.manifest && this.timelineActive) this.raf = requestAnimationFrame(this.tick);
  }
  tick(time) {
    this.raf = null;
    const dt = this.lastTime === null ? 0 : Math.min(time - this.lastTime, 150) * this.speed;
    this.elapsed += dt;
    if (this.fire && !this.rawPreview) this.fire.update(dt);
    this.lastTime = time;
    const stationary = this.fire && !this.rawPreview && this.fire.kind === 'stationary';
    if (stationary) this.index = this.fire.poseFrame();
    const duration = () => stationary ? Infinity : this.fire && !this.rawPreview ? this.baseTrack.frameDurations[this.index] : this.frameDurations[this.index];
    while (this.elapsed >= duration()) {
      this.elapsed -= duration();
      const [start, end] = this.loopRange;
      this.index = this.index < start || this.index >= end ? start : this.index + 1;
    }
    this.draw();
    if (this.timelineActive) this.raf = requestAnimationFrame(this.tick);
  }
  requestFire() {
    if (!this.fire?.request()) return false;
    this.rawPreview = false;
    if (this.fire.kind === 'stationary') { this.index = this.fire.poseFrame(); this.schedule(); }
    this.draw();
    return true;
  }
  trigger(held) {
    if (!this.fire) return;
    this.fire.trigger(held);
    if (held) {
      this.rawPreview = false;
      if (this.fire.kind === 'stationary') { this.index = this.fire.poseFrame(); if (!this.raf) this.schedule(); }
    }
    this.draw();
  }
  cancelFire() { this.fire?.cancel(); this.draw(); }
  seek(index) { this.fire?.cancel(true); this.rawPreview = true; this.index = Math.max(0, Math.min(13, index)); this.draw(); }
  pause(paused) {
    this.paused = paused;
    if (paused) this.fire?.cancel();
    else if (this.rawPreview) {
      this.rawPreview = false;
      if (this.fire?.kind === 'stationary') this.index = 0;
      else if (this.index < this.loopRange[0] || this.index > this.loopRange[1]) this.index = this.loopRange[0];
    }
    this.draw(); this.schedule();
  }
  draw() {
    if (!this.manifest || !this.atlas?.complete) return;
    const {width, height} = this.manifest.canvas;
    // Use matching full-body poses; baked flash pictures stay in manual review.
    const liveFire = !this.rawPreview && this.fire;
    const useRecoil = liveFire?.active && !this.fireTrack.manifest.shotIndices.includes(this.index);
    const track = liveFire ? useRecoil ? this.fireTrack : this.baseTrack : this.primaryTrack;
    this.context.clearRect(0, 0, width, height);
    this.context.drawImage(track.atlas, this.index * width, 0, width, height, 0, 0, width, height);
    if (liveFire) drawSequenceMuzzle(this.context, track.muzzles[this.index], this.fire.age, this.fire.shotCount);
    this.onFrame(this.index, {input: Boolean(this.fire), preview: this.rawPreview, phase: this.fire?.phase, held: this.fire?.held ?? false,
      shotCount: this.fire?.shotCount ?? 0, pending: this.fire?.pending ?? false});
  }
}
