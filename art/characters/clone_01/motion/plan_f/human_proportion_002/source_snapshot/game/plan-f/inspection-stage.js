import * as T from '../vendor/three-0.187.0/build/three.module.js';

export function createInspectionStage(scene){
  const originals=scene.children.map(object=>({object,visible:object.visible}));
  const background=scene.background,fog=scene.fog,environment=scene.environment;
  const group=new T.Group();group.visible=false;scene.add(group);
  group.add(new T.HemisphereLight('#ffffff','#727783',2.1));
  const key=new T.DirectionalLight('#ffffff',2.8);key.position.set(3,5,4);group.add(key);
  const fill=new T.DirectionalLight('#ffffff',1.2);fill.position.set(-4,2,-3);group.add(fill);
  const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:'#85888c',roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.008;group.add(floor);
  const grey=new T.Color('#a8aaad');
  return {set(enabled){
    for(const {object,visible} of originals)object.visible=enabled?false:visible;
    group.visible=enabled;scene.background=enabled?grey:background;scene.fog=enabled?null:fog;
    scene.environment=enabled?null:environment;
  }};
}
