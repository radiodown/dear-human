// Temporary port breacher body; gun, gloves and reload are the upstream meshes.
function createGActor(game) {
  const T = game.THREE, root = new T.Group();
  root.name = 'plan-g-port-breacher'; game.scene.add(root);
  const armor = new T.MeshStandardMaterial({ color: 0x354147, roughness: .72, metalness: .35 });
  const cloth = new T.MeshStandardMaterial({ color: 0x182225, roughness: .95 });
  const visor = new T.MeshStandardMaterial({ color: 0xc18b48, roughness: .24, metalness: .65 });
  function part(parent, size, pos, material) {
    const mesh = new T.Mesh(new T.BoxGeometry(...size), material);
    mesh.position.set(...pos); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const torso = new T.Group(); root.add(torso);
  part(torso, [.43,.49,.28], [0,1.22,0], armor);
  part(torso, [.33,.2,.25], [0,.91,0], cloth);
  part(torso, [.29,.29,.3], [0,1.66,0], armor);
  part(torso, [.25,.09,.025], [0,1.67,-.16], visor);
  part(torso, [.3,.35,.16], [0,1.25,.2], cloth);
  const legs = [-1,1].map(sign => {
    const hip = new T.Group(); hip.position.set(sign*.13,.89,0); root.add(hip);
    part(hip,[.18,.4,.2],[0,-.2,0],cloth);
    const knee = new T.Group(); knee.position.y=-.4; hip.add(knee);
    part(knee,[.16,.37,.19],[0,-.185,0],armor);
    part(knee,[.19,.12,.33],[0,-.43,-.07],cloth);
    return {hip,knee,sign};
  });
  let phase = 0;
  return { root, update(dt, facing) {
    const p = game.player, crouch = p.crouching ? 1 : 0;
    phase += dt * p.speed * 2.4;
    root.position.copy(p.pos); root.rotation.y = -facing * Math.PI/2;
    torso.position.y = -crouch*.3;
    const stride = p.onGround ? Math.min(1,p.speed/4) : .35;
    for (const leg of legs) {
      leg.hip.position.y = .89-crouch*.3;
      leg.hip.rotation.x = Math.sin(phase + (leg.sign>0?Math.PI:0))*.65*stride - crouch*.8;
      leg.knee.rotation.x = Math.max(0,-Math.sin(phase+(leg.sign>0?Math.PI:0)))*.8*stride+crouch*1.25;
    }
  }};
}
