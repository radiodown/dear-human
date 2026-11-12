// Isolate upstream global bindings and release its GPU/audio when leaving the tab.
export class PlanGLab {
  show(active) {
    const host=document.getElementById('plan-g-host');
    if(!active){host.replaceChildren();return;}
    if(host.firstChild)return;
    const frame=document.createElement('iframe');
    frame.src='./plan-g/index.html';frame.title='플랜 G · Saltline 횡스크롤';
    frame.style.cssText='width:100%;height:100%;border:0;display:block';
    host.appendChild(frame);
  }
  writeParams(params){params.set('plan','g');params.delete('motion');}
}
