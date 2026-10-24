(() => {
  'use strict';
  const canvas = document.querySelector('#generative-art');
  const context = canvas?.getContext('2d', { alpha: true });
  if (!context) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 0;
  let height = 0;
  let frameId = 0;
  let previousTime = 0;

  const noise = (x, y) => {
    const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const resize = () => {
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    pointer.x = pointer.targetX = 0;
    pointer.y = pointer.targetY = 0;
    draw();
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    const compact = width < 600;
    const shiftX = pointer.x * 6;
    const shiftY = pointer.y * 6;
    const patches = compact
      ? [{x:.1,y:.44,w:width*1.25,h:height*.7},{x:.92,y:.86,w:width*1.2,h:height*.65}]
      : [{x:.15,y:.5,w:width*.72,h:height*.95},{x:.85,y:.75,w:width*.78,h:height*.85},{x:.62,y:.05,w:width*.42,h:height*.55}];
    const step = compact ? 18 : 20;
    patches.forEach((patch,index) => {
      for(let x=-patch.w/2;x<patch.w/2;x+=step){
        for(let y=-patch.h/2;y<patch.h/2;y+=step){
          const fade=Math.max(0,1-Math.hypot(x/(patch.w*.55),y/(patch.h*.55)));
          if(!fade || noise(x+index*71,y+37)<.12) continue;
          context.fillStyle=`rgba(0,0,0,${fade*.3})`;
          context.beginPath();
          context.arc(width*patch.x+x+shiftX,height*patch.y+y+shiftY,.72,0,Math.PI*2);
          context.fill();
        }
      }
    });
    const gridStep=compact?21:28;
    const grids=compact
      ? [{x:.78,y:.25,w:width*.92,h:height*.52},{x:.18,y:.85,w:width*.9,h:height*.4}]
      : [{x:.76,y:.28,w:width*.64,h:height*.72},{x:.13,y:.84,w:width*.49,h:height*.48}];
    context.lineWidth=.55;
    for(const grid of grids){
      const left=width*grid.x-grid.w/2-shiftX*.5;
      const top=height*grid.y-grid.h/2-shiftY*.5;
      for(let x=0;x<=grid.w;x+=gridStep){
        const fade=Math.sin(x/grid.w*Math.PI)*.085;
        const gradient=context.createLinearGradient(0,top,0,top+grid.h);
        gradient.addColorStop(0,'rgba(0,0,0,0)');
        gradient.addColorStop(.5,`rgba(0,0,0,${fade})`);
        gradient.addColorStop(1,'rgba(0,0,0,0)');
        context.strokeStyle=gradient;
        context.beginPath();context.moveTo(left+x,top);context.lineTo(left+x,top+grid.h);context.stroke();
      }
      for(let y=0;y<=grid.h;y+=gridStep){
        const fade=Math.sin(y/grid.h*Math.PI)*.085;
        const gradient=context.createLinearGradient(left,0,left+grid.w,0);
        gradient.addColorStop(0,'rgba(0,0,0,0)');
        gradient.addColorStop(.5,`rgba(0,0,0,${fade})`);
        gradient.addColorStop(1,'rgba(0,0,0,0)');
        context.strokeStyle=gradient;
        context.beginPath();context.moveTo(left,top+y);context.lineTo(left+grid.w,top+y);context.stroke();
      }
    }
    context.strokeStyle='rgba(0,0,0,.22)';context.lineWidth=.65;
    for(const [x,y] of [[width*.4,height*.79],[width*.9,height*.49]]){
      context.beginPath();context.moveTo(x-4,y);context.lineTo(x+4,y);context.moveTo(x,y-4);context.lineTo(x,y+4);context.stroke();
    }
  };

  const animate = (time) => {
    const elapsed = previousTime ? Math.min(time - previousTime, 50) : 16.67;
    previousTime = time;
    // Frame-rate independent easing. Patterns stay aligned and never repel.
    const ease = 1 - Math.exp(-elapsed / 140);
    pointer.x += (pointer.targetX - pointer.x) * ease;
    pointer.y += (pointer.targetY - pointer.y) * ease;
    const settled = Math.abs(pointer.targetX - pointer.x) + Math.abs(pointer.targetY - pointer.y) < .001;
    if (settled) { pointer.x = pointer.targetX; pointer.y = pointer.targetY; }
    draw();
    frameId = settled ? 0 : requestAnimationFrame(animate);
    if (settled) previousTime = 0;
  };
  const requestDraw = () => {
    if (!frameId && !document.hidden && !reducedMotion.matches && finePointer.matches) {
      previousTime = 0;
      frameId = requestAnimationFrame(animate);
    }
  };
  const returnToCenter = () => {
    pointer.targetX = pointer.targetY = 0;
    requestDraw();
  };
  const synchronize = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    previousTime = 0;
    pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
    draw();
  };
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reducedMotion.matches || !finePointer.matches) return;
    pointer.targetX = Math.max(-1, Math.min(1, event.clientX / width * 2 - 1));
    pointer.targetY = Math.max(-1, Math.min(1, event.clientY / height * 2 - 1));
    requestDraw();
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', returnToCenter);
  window.addEventListener('blur', returnToCenter);
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', synchronize);
  reducedMotion.addEventListener('change', synchronize);
  finePointer.addEventListener('change', synchronize);
  resize();
})();
