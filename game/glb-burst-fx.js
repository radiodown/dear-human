// Burst FX for the GLB preview tab ('폭사'): green ichor hit splashes, then a swell-and-pop that dissolves the model into green smoke.
// Preview-only Three.js sprites built from canvas gradients (no image files). The 2D game sprite version is not made yet.
const ICHOR = [0x9be34a, 0x6fc72e, 0x4f9e1f]; // bright → dark green
const SMOKE = [0x7f9a6a, 0x5f7a52, 0x93a985];

function gradientTexture(THREE, stops) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class BurstFx {
  constructor(THREE, scene) {
    this.THREE = THREE; this.scene = scene; this.parts = [];
    this.textures = {
      soft: gradientTexture(THREE, [[0, 'rgba(255,255,255,1)'], [.45, 'rgba(255,255,255,.55)'], [1, 'rgba(255,255,255,0)']]),
      drop: gradientTexture(THREE, [[0, 'rgba(255,255,255,1)'], [.55, 'rgba(255,255,255,.9)'], [.75, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]),
    };
  }

  spawn({ pos, vel, color, size, grow = 0, life, gravity = 0, drag = 0, alpha = 1, fadeIn = 0, additive = false, texture = 'drop', ground = false, rise = 0 }) {
    const THREE = this.THREE;
    const material = new THREE.SpriteMaterial({ map: this.textures[texture], color, transparent: true, depthWrite: false, opacity: 0,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const sprite = new THREE.Sprite(material); sprite.position.copy(pos); sprite.scale.setScalar(size); sprite.renderOrder = additive ? 3 : 2;
    this.scene.add(sprite);
    this.parts.push({ sprite, vel: vel.clone(), size, grow, life, age: 0, gravity, drag, alpha, fadeIn, ground, rise, landed: false });
  }

  rand(a, b) { return a + Math.random() * (b - a); }
  pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  // One bullet hit: white-yellow flash, a few sparks, green ichor spraying back toward the shooter and dripping down.
  hit(point, toward) {
    const V = this.THREE.Vector3;
    this.spawn({ pos: point, vel: new V(), color: 0xfff2b0, size: .12, grow: .5, life: .08, additive: true, texture: 'soft' });
    for (let i = 0; i < 6; i++) this.spawn({ pos: point, vel: new V(toward.x * this.rand(.6, 1.6), this.rand(-.2, 1.2), this.rand(-1, 1)), color: 0xffe38a,
      size: .012, life: this.rand(.08, .16), drag: 4, additive: true });
    for (let i = 0; i < 18; i++) this.spawn({ pos: point, vel: new V(toward.x * this.rand(.3, 1.1), this.rand(.1, 1.1), this.rand(-.7, .7)), color: this.pick(ICHOR),
      size: this.rand(.022, .045), life: this.rand(.5, .9), gravity: 3.2, drag: .6, ground: true });
    this.spawn({ pos: point, vel: new V(toward.x * .1, .08, 0), color: this.pick(ICHOR), size: .08, grow: 1.4, life: .3, alpha: .7, texture: 'soft' });
  }

  // Final pop: green flash, ichor flung in every direction, and a smoke cloud that swells, drifts up and fades out.
  burst(center) {
    const V = this.THREE.Vector3;
    this.spawn({ pos: center, vel: new V(), color: 0xd8ff9a, size: .35, grow: 2.2, life: .16, additive: true, texture: 'soft' });
    for (let i = 0; i < 70; i++) {
      const dir = new V(this.rand(-1, 1), this.rand(-.2, 1), this.rand(-1, 1)).normalize();
      this.spawn({ pos: center.clone().addScaledVector(dir, .05), vel: dir.multiplyScalar(this.rand(.8, 2.4)), color: this.pick(ICHOR),
        size: this.rand(.025, .06), life: this.rand(.6, 1.2), gravity: 3.2, drag: .5, ground: true });
    }
    for (let i = 0; i < 28; i++) {
      const offset = new V(this.rand(-.25, .25), this.rand(-.08, .12), this.rand(-.45, .4));
      this.spawn({ pos: center.clone().add(offset), vel: offset.clone().multiplyScalar(this.rand(.6, 1.4)).add(new V(0, this.rand(.05, .2), 0)),
        color: this.pick(SMOKE), size: this.rand(.12, .22), grow: this.rand(1.2, 2.2), life: this.rand(1.2, 2.0), alpha: this.rand(.55, .8),
        fadeIn: .12, drag: 1.6, rise: .12, texture: 'soft' });
    }
  }

  get busy() { return this.parts.length > 0; }

  update(dt) {
    for (const p of this.parts) {
      p.age += dt;
      const s = p.sprite, t = p.age / p.life;
      if (!p.landed) {
        p.vel.y += (p.rise - p.gravity) * dt;
        p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        s.position.addScaledVector(p.vel, dt);
        if (p.ground && s.position.y <= .004) { s.position.y = .004; p.landed = true; p.life = p.age + 1.4; } // splat: rest on the ground, then fade
      }
      s.scale.setScalar(p.size * (1 + p.grow * Math.min(t, 1)) * (p.landed ? 1.3 : 1));
      const fadeIn = p.fadeIn ? Math.min(1, p.age / p.fadeIn) : 1;
      s.material.opacity = p.alpha * fadeIn * Math.max(0, 1 - Math.max(0, (p.age / p.life - .55) / .45));
    }
    this.parts = this.parts.filter(p => {
      if (p.age < p.life) return true;
      this.scene.remove(p.sprite); p.sprite.material.dispose(); return false;
    });
  }

  clear() { for (const p of this.parts) { this.scene.remove(p.sprite); p.sprite.material.dispose(); } this.parts = []; }
}
