import { MUZZLE_LIGHT } from './muzzle-light.js';

// Read the rifle tip from the opaque upper-right silhouette, once per atlas.
// Live playback excludes baked flash frames, so a flash cannot become a socket.
export function sequenceMuzzles(track) {
  if (track.muzzles) return track.muzzles;
  const {width, height} = track.manifest.canvas;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  const bottom = Math.floor(height * .72);
  track.muzzles = Array.from({length: track.manifest.frameCount}, (_, index) => {
    context.clearRect(0, 0, width, height);
    context.drawImage(track.atlas, index * width, 0, width, height, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, bottom).data;
    for (let x = width - 1; x >= Math.floor(width * .5); x--) {
      let sum = 0, count = 0;
      for (let y = 0; y < bottom; y++) {
        if (pixels[(y * width + x) * 4 + 3] > 128) { sum += y; count++; }
      }
      if (count) return {x: x + 1, y: Math.round(sum / count)};
    }
    throw new Error('플랜 B 총구 위치를 읽지 못했습니다.');
  });
  return track.muzzles;
}

// Canvas-native pixel flash using the shared game's flash dimensions/color/time.
export function drawSequenceMuzzle(context, position, ageMs, shotCount) {
  if (ageMs >= MUZZLE_LIGHT.duration * 1000) return;
  const envelope = Math.pow(Math.max(0, 1 - ageMs / (MUZZLE_LIGHT.duration * 1000)), MUZZLE_LIGHT.decay);
  const variation = .94 + .06 * Math.sin(shotCount * 2.39996323);
  const length = Math.round(MUZZLE_LIGHT.jetLength * variation), half = MUZZLE_LIGHT.jetHalfHeight;
  const polygon = points => {
    context.beginPath();
    points.forEach(([x,y], index) => index ? context.lineTo(x,y) : context.moveTo(x,y));
    context.closePath(); context.fill();
  };
  context.save(); context.translate(Math.round(position.x), Math.round(position.y));
  context.globalAlpha = .18 * envelope;
  context.fillStyle = '#ff9a30'; context.fillRect(-4, -half, 12, half * 2);
  context.globalAlpha = envelope;
  context.fillStyle = `rgb(${MUZZLE_LIGHT.color.map(channel => Math.round(channel * 255)).join(',')})`;
  polygon([[-2,-3],[5,-4],[9,-half],[10,-3],[length,0],[10,3],[9,half],[5,4],[-2,3]]);
  context.fillStyle = '#fff5c7'; polygon([[-1,-2],[7,-2],[Math.round(length*.75),0],[7,2],[-1,2]]);
  context.restore();
}
