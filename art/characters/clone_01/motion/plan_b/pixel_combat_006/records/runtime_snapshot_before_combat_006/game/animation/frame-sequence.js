// Model-generated PNG playback, shared with future game views.
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
    document.addEventListener('visibilitychange', () => this.schedule());
  }
  async load(manifestUrl) {
    if (this.sourceUrl === manifestUrl && this.pending) return this.pending;
    const requestId = this.requestId = (this.requestId || 0) + 1;
    this.sourceUrl = manifestUrl;
    cancelAnimationFrame(this.raf);
    this.manifest = null;
    this.atlas = null;
    this.pending = (async () => {
      const response = await fetch(manifestUrl, {cache:'no-store'});
      if (!response.ok) throw new Error('플랜 B 모션 목록을 불러오지 못했습니다.');
      const manifest = await response.json();
      const {canvas, frameCount, durationMs, spritesheet} = manifest;
      if (frameCount !== 14 || !canvas?.width || !canvas?.height || !(durationMs > 0)) throw new Error('플랜 B 모션 형식이 올바르지 않습니다.');
      const loopRange = manifest.loopRange ?? [0, frameCount - 1];
      if (!Array.isArray(loopRange) || loopRange.length !== 2 || !loopRange.every(Number.isInteger) || loopRange[0] < 0 || loopRange[1] >= frameCount || loopRange[0] >= loopRange[1]) throw new Error('플랜 B 반복 구간이 올바르지 않습니다.');
      const atlas = new Image();
      atlas.src = new URL(spritesheet, new URL(manifestUrl, location.href)).href;
      await atlas.decode();
      if (atlas.naturalWidth !== canvas.width * frameCount || atlas.naturalHeight !== canvas.height) throw new Error('플랜 B 시트 크기가 목록과 다릅니다.');
      if (requestId !== this.requestId) return false;
      this.manifest = manifest;
      this.atlas = atlas;
      this.loopRange = loopRange;
      this.index = loopRange[0];
      this.canvas.width = canvas.width;
      this.canvas.height = canvas.height;
      this.canvas.dataset.pixelArt = String(Boolean(manifest.pixelArt));
      this.context.imageSmoothingEnabled = !manifest.pixelArt;
      this.draw();
      this.schedule();
      return true;
    })();
    try { return await this.pending; } catch (error) {
      if (requestId === this.requestId) { this.pending = null; this.sourceUrl = null; }
      throw error;
    }
  }
  show(visible) { this.visible = visible; this.schedule(); }
  schedule() {
    cancelAnimationFrame(this.raf);
    this.lastTime = null;
    this.elapsed = 0;
    if (this.visible && !this.paused && !document.hidden && this.atlas?.complete && this.manifest) this.raf = requestAnimationFrame(this.tick);
  }
  tick(time) {
    if (this.lastTime !== null) this.elapsed += Math.min(time - this.lastTime, 150) * this.speed;
    this.lastTime = time;
    while (this.elapsed >= this.manifest.durationMs) {
      const [start, end] = this.loopRange;
      this.index = this.index < start || this.index >= end ? start : this.index + 1;
      this.elapsed -= this.manifest.durationMs;
    }
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  }
  seek(index) { this.index = Math.max(0, Math.min(13, index)); this.draw(); }
  pause(paused) { this.paused = paused; this.schedule(); }
  draw() {
    if (!this.manifest || !this.atlas?.complete) return;
    const {width, height} = this.manifest.canvas;
    this.context.clearRect(0, 0, width, height);
    this.context.drawImage(this.atlas, this.index * width, 0, width, height, 0, 0, width, height);
    this.onFrame(this.index);
  }
}
