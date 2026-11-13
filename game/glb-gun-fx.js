// Live muzzle effects for the shared GLB viewer. Cues use animation seconds,
// so slow motion, pause and the authored recoil stay in sync.
const SINGLE_CUES = { gunplay: [3 / 24], gunplay_auto: [2 / 24], shoot_rifle: [5 / 24] };

function randomSequence(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function softBlob(ctx, x, y, rx, ry, stops) {
  ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  ctx.fillStyle = grad; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}

// Layered gas lobes rather than a pointed polygon: white-hot core, translucent amber
// envelope and soft bloom. Four seeded variants keep successive shots from stamping.
function fireTexture(T, seed) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d'), rand = randomSequence(seed);
  ctx.globalCompositeOperation = 'lighter';
  softBlob(ctx, 220, 128, 280, 105, [[0, 'rgba(255,142,30,.23)'], [.5, 'rgba(255,105,12,.12)'], [1, 'rgba(255,90,0,0)']]);
  for (let i = 0; i < 22; i++) {
    const t = i / 21, x = 22 + t * 400, width = 16 + Math.sin(t * Math.PI) * (32 + rand() * 23);
    const y = 128 + (rand() - .5) * width * 1.1;
    softBlob(ctx, x, y, 28 + rand() * 65, width, [[0, 'rgba(255,215,112,.35)'], [.35, 'rgba(255,159,40,.25)'], [1, 'rgba(255,85,5,0)']]);
  }
  softBlob(ctx, 105, 128, 140, 45, [[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,234,.95)'], [.65, 'rgba(255,218,109,.65)'], [1, 'rgba(255,130,25,0)']]);
  softBlob(ctx, 180, 128, 210, 18, [[0, 'rgba(255,255,255,.7)'], [.55, 'rgba(255,251,201,.5)'], [1, 'rgba(255,167,40,0)']]);
  softBlob(ctx, 272, 117 + rand() * 22, 90, 39, [[0, 'rgba(255,235,160,.35)'], [.4, 'rgba(255,176,55,.2)'], [1, 'rgba(255,105,20,0)']]);
  const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

function smokeTexture(T) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d'), rand = randomSequence(191);
  for (let ribbon = 0; ribbon < 5; ribbon++) {
    const phase = rand() * 6, offset = (ribbon - 2) * 12;
    for (let i = 0; i < 18; i++) {
      const x = 10 + i * 13, y = 64 + offset + Math.sin(x * .026 + phase) * 12 + Math.sin(x * .07 + phase) * 4;
      softBlob(ctx, x, y, 10 + rand() * 13, 3 + rand() * 5,
        [[0, 'rgba(238,243,250,.16)'], [.4, 'rgba(225,231,240,.065)'], [1, 'rgba(200,210,225,0)']]);
    }
    ctx.beginPath();
    for (let i = 0; i <= 44; i++) {
      const x = 8 + i * 5.5, y = 64 + offset + Math.sin(x * .026 + phase) * 12 + Math.sin(x * .07 + phase) * 4;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    const trail = ctx.createLinearGradient(8, 0, 250, 0);
    trail.addColorStop(0, 'rgba(240,245,255,0)'); trail.addColorStop(.3, 'rgba(240,245,255,.16)'); trail.addColorStop(1, 'rgba(240,245,255,0)');
    ctx.strokeStyle = trail; ctx.lineWidth = 1.5; ctx.filter = 'blur(1px)'; ctx.stroke(); ctx.filter = 'none';
  }
  return new T.CanvasTexture(canvas);
}

export function firingCues(name, duration) {
  if (name === 'dual_fire' || name === 'dual_kneel_fire') {
    return Array.from({ length: Math.ceil((duration - .001) * 4) }, (_, i) => ({ time: i / 4, side: i % 2 ? 'left' : 'right' }));
  }
  return (SINGLE_CUES[name] ?? []).map(time => ({ time, side: 'right' }));
}

export class GlbGunFx {
  constructor(THREE, scene) {
    this.T = THREE; this.scene = scene; this.mounts = []; this.smoke = []; this.sparks = [];
    this.enabled = true;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d'), gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(.25, 'rgba(255,255,255,.7)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    this.texture = new THREE.CanvasTexture(canvas);
    this.fireTextures = [17, 73, 139, 251].map(seed => fireTexture(THREE, seed));
    this.smokeTexture = smokeTexture(THREE);
    this.flameGeometry = new THREE.PlaneGeometry(1, 1); this.flameGeometry.translate(.5, 0, 0);
    this.point = new THREE.Vector3(); this.direction = new THREE.Vector3();
    this.reset();
  }

  bind(root, armed) {
    this.unbind();
    if (!armed) return;
    const T = this.T;
    root.updateMatrixWorld(true);
    // Merged loadouts (tools/glb_retarget/merge_loadout_glbs.py) carry several weapons under distinct names;
    // update() only fires the mounts whose gun the current clip leaves visible (unused guns are keyed to scale 0).
    for (const [name, side] of [['weapon', 'right'], ['weapon_l', 'left'], ['weapon_rifle', 'right'], ['weapon_pistol_r', 'right'], ['weapon_pistol_l', 'left']]) {
      const named = root.getObjectByName(name);
      // GLTFLoader reserves the shared name for the bone and renames its mesh child.
      // Muzzle +X is the mesh's local axis, not the bone's local axis.
      const gun = named?.isBone ? named.children.find(child => !child.isBone) : named;
      if (!gun) continue;
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
      const size = Math.max(.085, Math.min(.24, length * .46));
      const orangeMat = new T.MeshBasicMaterial({ map: this.fireTextures[0], color: 0xffffff, transparent: true, opacity: .85,
        depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false });
      const coreMat = orangeMat.clone();
      const flame = new T.Mesh(this.flameGeometry, orangeMat); flame.scale.set(size, size * .95, 1); group.add(flame);
      const core = new T.Mesh(this.flameGeometry, coreMat); core.scale.set(size * .9, size * .85, 1); core.rotation.x = Math.PI / 2; group.add(core);
      const glowMat = new T.SpriteMaterial({ map: this.texture, color: 0xffc56a, transparent: true,
        depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });
      const glow = new T.Sprite(glowMat); glow.scale.setScalar(size * .75); glow.position.x = size * .12; group.add(glow);
      const baseMat = glowMat.clone(); baseMat.color.setHex(0xb3baff);
      const hotBase = new T.Sprite(baseMat); hotBase.scale.setScalar(size * .27); group.add(hotBase);
      const light = new T.PointLight(0xffc580, 0, .8, 2); light.position.x = .015; group.add(light);
      group.visible = false;
      this.mounts.push({ gun, group, muzzle, size, side, flame, core, light, materials: [orangeMat, coreMat, glowMat, baseMat] });
    }
    this.reset();
  }

  reset() {
    for (const part of this.smoke) { this.scene.remove(part.sprite); part.sprite.material.dispose(); }
    for (const part of this.sparks) { this.scene.remove(part.mesh); part.mesh.geometry.dispose(); part.mesh.material.dispose(); }
    this.smoke = []; this.sparks = []; this.seen = new Set(); this.lastTime = null; this.cycle = 0; this.clip = null;
    for (const m of this.mounts) { m.group.visible = false; m.light.intensity = 0; }
  }

  unbind() {
    this.reset();
    for (const m of this.mounts) { m.group.removeFromParent(); for (const material of m.materials) material.dispose(); }
    this.mounts = [];
  }

  emitSmoke(mount, born, seed) {
    const T = this.T;
    mount.gun.localToWorld(this.point.copy(mount.muzzle));
    this.direction.set(1, 0, 0).transformDirection(mount.gun.matrixWorld);
    const rand = randomSequence(seed), across = new T.Vector3(0, 0, 1).transformDirection(mount.gun.matrixWorld);
    for (let i = 0; i < 6; i++) {
      const material = new T.SpriteMaterial({ map: this.smokeTexture, color: 0xb5b9c0, transparent: true,
        rotation: Math.atan2(this.direction.y, Math.abs(this.direction.z)) + (rand() - .5) * .6,
        depthWrite: false, opacity: 0 });
      const sprite = new T.Sprite(material); this.scene.add(sprite);
      this.smoke.push({ sprite, born: born + i * .012, origin: this.point.clone(),
        velocity: this.direction.clone().multiplyScalar(.16 + i * .08).add(new T.Vector3(0, .12 + rand() * .12, 0)).addScaledVector(across, (rand() - .5) * .16),
        size: mount.size * (.40 + i * .06), turn: (rand() - .5) * .7, rotation: material.rotation });
    }
    // One small batch of thin gold trails per shot, released in world space.
    const positions = new Float32Array(12 * 2 * 3), colors = new Float32Array(positions.length), velocities = [], tails = [];
    const up = new T.Vector3(0, 1, 0).transformDirection(mount.gun.matrixWorld);
    for (let i = 0; i < 12; i++) {
      const angle = rand() * Math.PI * 2, spread = .12 + rand() * .35;
      velocities.push(this.direction.clone().addScaledVector(across, Math.cos(angle) * spread).addScaledVector(up, Math.sin(angle) * spread)
        .normalize().multiplyScalar((1.7 + rand() * 2.6) * Math.sqrt(mount.size / .2)));
      tails.push(.003 + rand() * .009);
      colors.set([.42, .16, .025, 1, .92, .62], i * 6);
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    const material = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, depthWrite: false,
      blending: T.AdditiveBlending, toneMapped: false });
    const mesh = new T.LineSegments(geometry, material); mesh.frustumCulled = false; this.scene.add(mesh);
    this.sparks.push({ mesh, born, origin: this.point.clone(), velocities, tails });
  }

  update(name, time, duration) {
    if (!this.enabled || !this.mounts.length) { if (this.clip !== null) this.reset(); return; }
    if (this.clip !== name) { this.reset(); this.clip = name; }
    if (this.lastTime !== null && time + 1e-5 < this.lastTime) { this.cycle++; this.seen.clear(); }
    this.lastTime = time;
    const clock = this.cycle * duration + time, cues = firingCues(name, duration);
    for (const mount of this.mounts) {
      const e = mount.gun.matrixWorld.elements;
      if (Math.abs(e[0]) + Math.abs(e[1]) + Math.abs(e[2]) < 1e-6) { mount.group.visible = false; mount.light.intensity = 0; continue; }
      let flashAge = Infinity, shotIndex = 0;
      for (let i = 0; i < cues.length; i++) {
        const cue = cues[i]; if (cue.side !== mount.side) continue;
        const age = time - cue.time, key = `${this.cycle}:${i}`;
        if (age >= 0 && age <= .55 && !this.seen.has(key)) {
          this.seen.add(key); this.emitSmoke(mount, clock - age, 173 + i * 37 + this.cycle * 101);
        }
        // Keep the very end of a flash visible when the animation wraps across its boundary.
        const since = age < 0 && this.cycle ? age + duration : age;
        if (since >= 0 && since < flashAge) { flashAge = since; shotIndex = i; }
      }
      const pulse = Math.max(0, 1 - flashAge / .085);
      mount.group.visible = pulse > 0;
      mount.light.intensity = pulse * 1.15;
      const texture = this.fireTextures[(shotIndex + this.cycle) % this.fireTextures.length];
      mount.materials[0].map = texture; mount.materials[1].map = texture;
      mount.materials[0].opacity = Math.min(1, pulse * 1.6);
      mount.materials[1].opacity = Math.min(1, pulse * 1.9);
      mount.materials[2].opacity = pulse * .28;
      mount.materials[3].opacity = pulse * .30;
      mount.flame.rotation.x = shotIndex * 2.4 + this.cycle * .9;
      mount.core.rotation.x = mount.flame.rotation.x + Math.PI / 2;
      const expansion = 1 + .2 * Math.sin(shotIndex * 7 + this.cycle * 3);
      mount.group.scale.set(expansion * (.8 + .2 * pulse), .75 + .25 * pulse, .75 + .25 * pulse);
    }
    this.smoke = this.smoke.filter(part => {
      const age = clock - part.born;
      if (age > .55) { this.scene.remove(part.sprite); part.sprite.material.dispose(); return false; }
      const t = Math.max(0, age);
      part.sprite.position.copy(part.origin).addScaledVector(part.velocity, t);
      const size = part.size * (1 + t * 3.4); part.sprite.scale.set(size * 1.35, size * .8, 1);
      part.sprite.material.rotation = part.rotation + part.turn * t;
      part.sprite.material.opacity = age < 0 ? 0 : .65 * Math.min(1, t / .03) * Math.max(0, 1 - t / .55);
      return true;
    });
    this.sparks = this.sparks.filter(part => {
      const age = clock - part.born;
      if (age > .14) { this.scene.remove(part.mesh); part.mesh.geometry.dispose(); part.mesh.material.dispose(); return false; }
      const attr = part.mesh.geometry.getAttribute('position');
      for (let i = 0; i < part.velocities.length; i++) {
        const headTime = Math.max(0, age), tailTime = Math.max(0, age - part.tails[i]);
        this.point.copy(part.origin).addScaledVector(part.velocities[i], tailTime); this.point.y -= .65 * tailTime * tailTime;
        attr.setXYZ(i * 2, this.point.x, this.point.y, this.point.z);
        this.point.copy(part.origin).addScaledVector(part.velocities[i], headTime); this.point.y -= .65 * headTime * headTime;
        attr.setXYZ(i * 2 + 1, this.point.x, this.point.y, this.point.z);
      }
      attr.needsUpdate = true; part.mesh.material.opacity = Math.max(0, 1 - age / .14);
      return true;
    });
  }
}
