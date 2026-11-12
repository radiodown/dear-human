function createGContext(game) {
  const T = game.THREE, aim = new T.PerspectiveCamera(70,1,.01,400);
  game.scene.add(aim);
  // Keep FPS weapon calculations in their own frame, independent of the viewing camera.
  const context = new Proxy(game, { get(target, key) { return (key === 'camera' || key === 'viewCamera') ? aim : target[key]; } });
  const lane = 36, start = -32, end = 26;
  let facing = 1, actor;
  const follow = new T.Vector3(start,1.2,lane);
  return { context, lane, start, end,
    install() {
      game.physics.bounds.min.x = start-1; game.physics.bounds.max.x=end+1;
      game.physics.bounds.max.z = lane+1;
      game.physics.addBox(new T.Vector3(start-2,-.5,lane-2),new T.Vector3(end+2,0,lane+2),{surface:'concrete',noNav:true});
      game.physics.build();
      const floor = new T.Mesh(new T.BoxGeometry(end-start+4,.5,4),game.mats.get('concrete'));
      floor.position.set((start+end)/2,-.25,lane); floor.receiveShadow=true; game.scene.add(floor);
      actor = createGActor(game);
      game.weapon.root.traverse(object => { object.layers.set(0); if(object.isMesh) object.castShadow = true; });
      const originalUpdate = game.player.update;
      game.player.update = dt => {
        if(game.input.axis) facing = Math.sign(game.input.axis);
        game.player.yaw = -facing*Math.PI/2; game.player.pitch=0;
        game.player.pos.z=lane; game.player.vel.z=0;
        originalUpdate(dt);
        game.player.pos.x = T.MathUtils.clamp(game.player.pos.x,start,end);
        game.player.pos.z=lane; game.player.vel.z=0;
        // Recoil remains on the gun; the aim frame stays horizontal in the movement plane.
        aim.position.set(game.player.pos.x,game.player.pos.y+(game.player.crouching?1.25:1.65),lane);
        aim.rotation.set(0,-facing*Math.PI/2,0,'YXZ');
        game.player.eye.copy(aim.position); game.player.forward.set(facing,0,0);
        aim.updateMatrixWorld(true);
        actor.update(dt,facing);
      };
      game.camera.fov=42; game.camera.updateProjectionMatrix();
      game.renderer.shadowMap.autoUpdate=true;
    },
    reset() {
      facing=1; game.player.reset({pos:new T.Vector3(start,0,lane),yaw:-Math.PI/2});
      game.weapon.reset(); game.input.clear(); game.player.update(0);
      follow.set(start,1.2,lane);
    },
    frame(dt) {
      if(!actor) return;
      const p=game.player;
      follow.lerp(new T.Vector3(p.pos.x+facing*1.4,p.pos.y+1.2,lane),1-Math.exp(-dt*5));
      const distance=Math.max(11,7/Math.max(.5,game.camera.aspect));
      game.camera.position.set(follow.x,follow.y+2.2,lane+distance);
      game.camera.lookAt(follow); game.camera.updateMatrixWorld(true);
      document.getElementById('g-ammo').textContent=`${game.weapon.ammo} / ${game.weapon.reserve}`;
      document.getElementById('g-position').textContent=`${(p.pos.x-start).toFixed(1)} m / ${end-start} m`;
      document.getElementById('g-state').textContent=game.game.state==='paused'?'일시정지':game.game.state==='title'?'시작 대기':game.weapon.state==='reloading'?'장전 중':p.pos.x>=end-.1?'구간 끝':p.crouching?'앉기':p.speed>.2?'이동':'대기';
    }
  };
}
