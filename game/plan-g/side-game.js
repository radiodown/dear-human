function createGGame(game) {
  const panel=document.createElement('section'); panel.id='g-interface';
  panel.innerHTML=`<header><b>PLAN G <span>SALTLINE / SIDE</span></b><span id="g-state">시작 대기</span></header>
    <div class="g-readout"><span id="g-position"></span><span>PAC-9 <b id="g-ammo"></b></span></div>
    <div class="g-menu"><h1>SALTLINE<br><em>SIDE</em></h1><p>항구를 옆에서 가로지르다.</p><button id="g-start">시작</button><button id="g-reset">처음으로</button><p>A / D 이동 · Shift 달리기 · Space 점프<br>C 앉기 · J / 클릭 사격 · R 장전 · Esc 정지</p><small>횡스크롤 이동 시안 · 전신 임시 모델 · 원본 임무/적은 미연결</small></div>
    <nav><button data-g="KeyA">←</button><button data-g="KeyD">→</button><button data-g="Space">점프</button><button data-g="KeyC">앉기</button><button data-g="KeyJ">사격</button><button data-g="KeyR">장전</button><button id="g-pause">정지 / 메뉴</button></nav>`;
  document.getElementById('app').appendChild(panel);
  const menu=panel.querySelector('.g-menu');
  const api={state:'title',
    start() { api.state='playing';menu.hidden=true;game.input.clear();game.audio.unlock?.();game.audio.resume?.();game.audio.setPaused?.(false); },
    pause() { if(api.state==='playing'){api.state='paused';game.audio.setPaused?.(true);menu.hidden=false;document.getElementById('g-start').textContent='계속';game.input.clear();} },
    update() {
      if(game.input.pressed('pause')) { api.state==='playing'?api.pause():api.start();return false; }
      return api.state==='playing';
    }
  };
  document.getElementById('g-start').onclick=()=>api.start();
  document.getElementById('g-reset').onclick=()=>{game.side.reset();api.start();};
  document.getElementById('g-pause').onclick=()=>api.pause();
  for(const button of panel.querySelectorAll('[data-g]')) {
    button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);game.input.set(button.dataset.g,true);});
    for(const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type,()=>game.input.set(button.dataset.g,false));
  }
  game.side.install();game.side.reset();
  return api;
}
