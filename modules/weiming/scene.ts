import * as T from 'three';
import {buildExhibit,mesh} from '../../src/world/architecture';
import {batchStatic} from '../../src/world/optimizer';
import type {SceneFactory} from '../../src/world/module-contract';
export default {version:1,create({module,region}){
 const root=buildExhibit('studio',region.color),poster=module.media.find(m=>m.kind==='video')?.thumbnail;
 let disposed=false;const texture=poster?new T.TextureLoader().load(poster,t=>{if(disposed)t.dispose();}):null;
 if(texture){
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  const placeholder=root.getObjectByName('studio-play-placeholder') as T.Mesh|undefined;
  if(placeholder){placeholder.geometry.dispose();placeholder.removeFromParent();}
  // The picture is recessed inside the solid screen housing, just ahead of its
  // front face. The existing wall and housing remain visible from the sides/back.
  const screen=mesh(root,new T.PlaneGeometry(5.8,3.2625),new T.MeshBasicMaterial({map:texture}),0,3,-1.682);screen.name='studio-mv-inset';screen.castShadow=false;
 }
 const release=batchStatic(root);return {root,dispose(){disposed=true;release();texture?.dispose();}};
}} satisfies SceneFactory;
