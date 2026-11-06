import { THREE, configureAtlasTexture, createAtlasPart, createPixelCamera } from './part-mesh.js';

function requireCheck(value, message) {
  if (!value) throw new Error(message);
}

// Explicitly invoked by tools/review_plan_c.py on the existing sample page.
// This renders ONE existing body part, not a new character or animation.
export async function runBrowserProbe() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return { status: 'unsupported', reason: 'WebGL2 unavailable', three_revision: THREE.REVISION };
  const response = await fetch('/art/characters/clone_01/motion/rig_005/rig/parts.json');
  requireCheck(response.ok, 'Could not read current rig definition');
  const definition = await response.json();
  const part = definition.parts.body_core, atlas = definition.atlases[part.atlas];
  const texture = configureAtlasTexture(await new THREE.TextureLoader().loadAsync('/' + atlas.path));
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, alpha: true, antialias: false, premultipliedAlpha: false });
  // Native texel scale isolates color-space/UV correctness from the different
  // minification kernels used by Canvas2D and GPU linear texture sampling.
  const width = 768, height = 1376, partHeight = part.rect[3], left = 60, top = 24;
  renderer.setSize(width, height, false);
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(), camera = createPixelCamera(width, height);
  const mesh = createAtlasPart(definition, 'body_core', texture, { height: partHeight, pivot: [0, 0] });
  mesh.position.set(left, top, 0);
  scene.add(mesh);
  const reference = document.createElement('canvas');
  reference.width = width; reference.height = height;
  const ctx = reference.getContext('2d', { willReadFrequently: true });
  const partWidth = partHeight * part.rect[2] / part.rect[3];
  const compare = mirrored => {
    renderer.render(scene, camera);
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    requireCheck(gl.getError() === gl.NO_ERROR, 'WebGL readback error');
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (mirrored) { ctx.translate(left * 2 + partWidth, 0); ctx.scale(-1, 1); }
    ctx.drawImage(texture.image, ...part.rect, left, top, partWidth, partHeight);
    ctx.restore();
    const expected = ctx.getImageData(0, 0, width, height).data;
    let intersection = 0, union = 0, rgbError = 0, opaque = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const e = (y * width + x) * 4, a = ((height - 1 - y) * width + x) * 4;
      const actualSolid = pixels[a + 3] > 127, expectedSolid = expected[e + 3] > 127;
      if (actualSolid || expectedSolid) union++;
      if (actualSolid && expectedSolid) intersection++;
      if (pixels[a + 3] > 250 && expected[e + 3] > 250) {
        opaque++;
        for (let c = 0; c < 3; c++) rgbError += Math.abs(pixels[a + c] - expected[e + c]);
      }
    }
    const overlap = intersection / union, meanOpaqueRgbError = rgbError / (opaque * 3);
    requireCheck(opaque > 100, 'Existing body texture did not render');
    requireCheck(overlap > .98, `UV orientation or silhouette mismatch: ${overlap}`);
    requireCheck(meanOpaqueRgbError < 4, `sRGB color mismatch: ${meanOpaqueRgbError}`);
    return { silhouette_iou: overlap, mean_opaque_rgb_error_0_to_255: meanOpaqueRgbError, opaque_pixels: opaque };
  };
  let back, front;
  try {
    requireCheck(Object.values(definition.atlases).every(a => Math.max(a.width, a.height) <= renderer.capabilities.maxTextureSize), 'Atlas exceeds GPU texture limit');
    const right = compare(false), captures = [{ name: 'existing_body_right', png: canvas.toDataURL() }];
    mesh.scale.x = -1; mesh.position.x = left + partWidth;
    const leftFacing = compare(true);
    captures.push({ name: 'existing_body_left', png: canvas.toDataURL() });
    const memory = { ...renderer.info.memory };
    for (let i = 0; i < 100; i++) renderer.render(scene, camera);
    requireCheck(JSON.stringify(memory) === JSON.stringify(renderer.info.memory), 'Geometry or texture count grew across 100 renders');
    const repeatedMemory = { ...renderer.info.memory };
    const singlePartDraws = renderer.info.render.calls;
    // Conflicting Z positions must not override the deliberate 2D painter order.
    scene.remove(mesh);
    const geometry = new THREE.PlaneGeometry(100, 100);
    back = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    front = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, opacity: .5, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
    for (const m of [back, front]) { m.position.set(128, height - 128, 0); m.material.forceSinglePass = true; scene.add(m); }
    back.position.z = 2; front.position.z = -2;
    back.renderOrder = 1; front.renderOrder = 2;
    renderer.render(scene, camera);
    const readCenter = () => {
      const pixel = new Uint8Array(4);
      gl.readPixels(128, 128, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return [...pixel];
    };
    const greenOverRed = readCenter();
    requireCheck(greenOverRed[1] > 100 && greenOverRed[0] < 200, 'Transparent foreground order failed');
    back.renderOrder = 3;
    renderer.render(scene, camera);
    const redOverGreen = readCenter();
    requireCheck(redOverGreen[0] > 250 && redOverGreen[1] < 3, 'Changed painter order failed');
    return {
      status: 'passed', scope: 'Single existing atlas part and synthetic compositing; full character integration and art acceptance untested',
      comparison_scale: 'One source texel per screen pixel; minification quality untested',
      three_revision: THREE.REVISION, webgl_version: gl.getParameter(gl.VERSION),
      max_texture_size: renderer.capabilities.maxTextureSize,
      right, left: leftFacing, transparent_order: { green_over_red: greenOverRed, red_over_green: redOverGreen },
      resources_after_100_renders: repeatedMemory, single_part_draws: singlePartDraws, captures,
    };
  } finally {
    mesh.geometry.dispose(); mesh.material.dispose(); texture.dispose();
    if (back) { back.geometry.dispose(); back.material.dispose(); }
    if (front) front.material.dispose();
    renderer.dispose(); renderer.forceContextLoss();
  }
}
