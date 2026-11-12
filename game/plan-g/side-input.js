// Screen-relative controls. No pointer lock or FPS look input.
function createGInput(game) {
  const held = new Set(), edges = new Set();
  const actions = { Space: 'jump', KeyR: 'reload', Escape: 'pause', KeyC: 'crouch' };
  const input = {
    move: { x: 0, y: 0 }, look: { dx: 0, dy: 0 }, fire: false,
    ads: false, sprint: false, crouch: false, locked: true, touch: false,
    down: action => held.has(action), pressed: action => edges.has(action),
    requestLock() {}, exitLock() {},
    set(code, active) {
      if (active && !held.has(code)) edges.add(actions[code] || code);
      active ? held.add(code) : held.delete(code);
    },
    clear() { held.clear(); edges.clear(); input.fire = false; input.move.x = input.move.y = 0; },
    update() {
      input.axis = Number(held.has('KeyD') || held.has('ArrowRight')) - Number(held.has('KeyA') || held.has('ArrowLeft'));
      input.fire = held.has('KeyJ') || held.has('Mouse');
      input.sprint = held.has('ShiftLeft') || held.has('ShiftRight');
      input.crouch = held.has('KeyC') || held.has('ArrowDown');
      input.ads = false;
      input.move.x = 0; input.move.y = Math.abs(input.axis);
    },
    endFrame() { edges.clear(); }
  };
  const codes = new Set(['KeyA','KeyD','ArrowLeft','ArrowRight','ArrowDown','KeyJ','KeyC','KeyR','Space','Escape','ShiftLeft','ShiftRight']);
  addEventListener('keydown', event => {
    if (!codes.has(event.code) || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
    event.preventDefault(); input.set(event.code, true);
  });
  addEventListener('keyup', event => input.set(event.code, false));
  const canvas = document.getElementById('view');
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId); input.set('Mouse', true);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, () => input.set('Mouse', false));
  addEventListener('blur', () => { input.clear(); game.game?.pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { input.clear(); game.game?.pause(); } });
  return input;
}
