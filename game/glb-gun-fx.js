// Live muzzle effects for the shared GLB viewer. Cues use animation seconds,
// so slow motion, pause and the authored recoil stay in sync.
const SINGLE_CUES = { gunplay: [3 / 24], gunplay_auto: [2 / 24], shoot_rifle: [5 / 24] };

export function firingCues(name, duration) {
  if (name === 'dual_fire' || name === 'dual_kneel_fire') {
    return Array.from({ length: Math.ceil((duration - .001) * 4) }, (_, i) => ({ time: i / 4, side: i % 2 ? 'left' : 'right' }));
  }
  return (SINGLE_CUES[name] ?? []).map(time => ({ time, side: 'right' }));
}

export class GlbGunFx {
  constructor(THREE, scene) {
    this.T = THREE; this.scene = scene; this.mounts = []; this.smoke = [];
    this.enabled = true;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(.25, 'rgba(255,255,255,.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    this.texture = new THREE.CanvasTexture(canvas);
    this.cone = new THREE.ConeGeometry(1, 1, 5); this.cone.rotateZ(-Math.PI / 2); this.cone.translate(.5, 0, 0);
    this.point = new THREE.Vector3(); this.direction = new THREE.Vector3();
    this.reset();
  }

  bind(root, armed) {
    this.unbind();
    if (!armed) return;
    const T = this.T;
    root.updateMatrixWorld(true);
    for (const [name, side] of [['weapon', 'right'], ['weapon_l', 'left']]) {
      const gun = root.getObjectByName(name);
      if (!gun || gun.isBone) continue;
      const inverse = gun.matrixWorld.clone().invert(), positions = [], point = new T.Vector3();
      gun.traverse(mesh => {
        // Reload magazines are separate meshes below the weapon node; don't use them to locate its muzzle.
        if (!mesh.isMesh || /magazine/.test(mesh.name) || /magazine/.test(mesh.parent?.name ?? '')) return;
        const attr = mesh.geometry.getAttribute('position'), transform = inverse.clone().multiply(mesh.matrixWorld);
        for (let i = 0; i < attr.count; i++) positions.push(point.fromBufferAttribute(attr, i).applyMatrix4(transform).clone());
      });
      if (!positions.length) continue;
      const box = new T.Box3().setFromPoints(positions), length = box.max.x - box.min.x;
      const tip = new T.Box3().setFromPoints(positions.filter(p => p.x > box.max.x - length * .018));
      const muzzle = tip.getCenter(new T.Vector3()); muzzle.x = box.max.x + .002;
      const group = new T.Group(); group.name = `muzzle_fx_${side}`; group.position.copy(muzzle); gun.add(group);
      const size = Math.max(.045, Math.min(.115, length * .22));
      const orangeMat = new T.MeshBasicMaterial({ color: 0xff9b24, transparent: true, opacity: .85,
        depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
      const coreMat = orangeMat.clone(); coreMat.color.setHex(0xfff7d8);
      const flame = new T.Mesh(this.cone, orangeMat); flame.scale.set(size, size * .22, size * .22); group.add(flame);
      const core = new T.Mesh(this.cone, coreMat); core.scale.set(size * .68, size * .10, size * .10); group.add(core);
      const glowMat = new T.SpriteMaterial({ map: this.texture, color: 0xffc56a, transparent: true,
        depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
      const glow = new T.Sprite(glowMat); glow.scale.setScalar(size * .85); group.add(glow);
      const light = new T.PointLight(0xffc580, 0, .65, 2); light.position.x = .015; group.add(light);
      group.visible = false;
      this.mounts.push({ gun, group, muzzle, size, side, flame, core, light, materials: [orangeMat, coreMat, glowMat] });
    }
    this.reset();
  }

  reset() {
    for (const part of this.smoke) { this.scene.remove(part.sprite); part.sprite.material.dispose(); }
    this.smoke = []; this.seen = new Set(); this.lastTime = null; this.cycle = 0; this.clip = null;
    for (const m of this.mounts) { m.group.visible = false; m.light.intensity = 0; }
  }

  unbind() {
    this.reset();
    for (const m of this.mounts) { m.group.removeFromParent(); for (const material of m.materials) material.dispose(); }
    this.mounts = [];
  }

  emitSmoke(mount, born) {
    const T = this.T;
    mount.gun.localToWorld(this.point.copy(mount.muzzle));
    this.direction.set(1, 0, 0).transformDirection(mount.gun.matrixWorld);
    for (let i = 0; i < 3; i++) {
      const material = new T.SpriteMaterial({ map: this.texture, color: 0xa2a6ac, transparent: true,
        depthWrite: false, opacity: 0 });
      const sprite = new T.Sprite(material); this.scene.add(sprite);
      this.smoke.push({ sprite, born: born + i * .018, origin: this.point.clone(),
        velocity: this.direction.clone().multiplyScalar(.11 + i * .05).add(new T.Vector3(0, .10 + i * .025, 0)), size: mount.size * (.28 + i * .08) });
    }
  }

  update(name, time, duration) {
    if (!this.enabled || !this.mounts.length) { if (this.clip !== null) this.reset(); return; }
    if (this.clip !== name) { this.reset(); this.clip = name; }
    if (this.lastTime !== null && time + 1e-5 < this.lastTime) { this.cycle++; this.seen.clear(); }
    this.lastTime = time;
    const clock = this.cycle * duration + time, cues = firingCues(name, duration);
    for (const mount of this.mounts) {
      let flashAge = Infinity, shotIndex = 0;
      for (let i = 0; i < cues.length; i++) {
        const cue = cues[i]; if (cue.side !== mount.side) continue;
        const age = time - cue.time, key = `${this.cycle}:${i}`;
        if (age >= 0 && age <= .4 && !this.seen.has(key)) {
          this.seen.add(key); this.emitSmoke(mount, clock - age);
        }
        // Keep the very end of a flash visible when the animation wraps across its boundary.
        const since = age < 0 && this.cycle ? age + duration : age;
        if (since >= 0 && since < flashAge) { flashAge = since; shotIndex = i; }
      }
      const pulse = Math.max(0, 1 - flashAge / .065);
      mount.group.visible = pulse > 0;
      mount.light.intensity = pulse * .7;
      mount.materials[0].opacity = pulse * .85;
      mount.materials[1].opacity = Math.min(1, pulse * 1.8);
      mount.materials[2].opacity = pulse * .5;
      mount.flame.rotation.x = shotIndex * 2.4 + this.cycle * .9;
      mount.group.scale.set(1 + .18 * Math.sin(shotIndex * 7 + this.cycle * 3), 1, 1);
    }
    this.smoke = this.smoke.filter(part => {
      const age = clock - part.born;
      if (age > .4) { this.scene.remove(part.sprite); part.sprite.material.dispose(); return false; }
      const t = Math.max(0, age);
      part.sprite.position.copy(part.origin).addScaledVector(part.velocity, t);
      part.sprite.scale.setScalar(part.size * (1 + t * 4));
      part.sprite.material.opacity = age < 0 ? 0 : .23 * Math.min(1, t / .025) * Math.max(0, 1 - t / .4);
      return true;
    });
  }
}
