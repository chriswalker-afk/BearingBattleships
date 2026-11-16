/* Camera-only scene zoom. All game objects, bearings, ranges, hitboxes,
   measuring instruments and pointer positions remain in world coordinates. */
(function () {
  'use strict';
  const MIN=1, MAX=2, STEP=.25;
  const levels=Object.freeze([1,1.25,1.5,1.75,2]);

  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  function normalise(value) {
    const safe=Number.isFinite(value)?value:MIN;
    const closest=Math.round((safe-MIN)/STEP)*STEP+MIN;
    return clamp(closest,MIN,MAX);
  }
  function cameraFor(target, zoom, width, height) {
    const z=normalise(zoom), halfWidth=width/(2*z), halfHeight=height/(2*z);
    return {
      x: clamp(target.x, halfWidth, width-halfWidth),
      y: clamp(target.y, halfHeight, height-halfHeight)
    };
  }
  function worldToCanvas(point, camera, zoom, width, height) {
    const z=normalise(zoom);
    return {
      x: (point.x-camera.x)*z+width/2,
      y: (point.y-camera.y)*z+height/2
    };
  }
  function canvasToWorld(point, camera, zoom, width, height) {
    const z=normalise(zoom);
    return {
      x: camera.x+(point.x-width/2)/z,
      y: camera.y+(point.y-height/2)/z
    };
  }
  function apply(ctx, camera, zoom, width, height) {
    const z=normalise(zoom);
    ctx.translate(width/2,height/2);
    ctx.scale(z,z);
    ctx.translate(-camera.x,-camera.y);
  }
  window.BloopZoom=Object.freeze({
    MIN,MAX,STEP,levels,normalise,cameraFor,worldToCanvas,canvasToWorld,apply
  });
})();
