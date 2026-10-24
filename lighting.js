(() => {
  'use strict';
  let canvas = document.querySelector('#lighting-art');
  if (!canvas) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 1, height = 1, frame = 0, previousTime = 0, phase = 0;
  let gl, program, uniforms, context, lost = false;

  const vertex = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragment = `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 pointer;
    uniform float time;
    mat2 rotate(float a) {
      return mat2(cos(a),-sin(a),sin(a),cos(a));
    }
    // A very faint domain-warped layer, inspired by Gradient Shader Flow:
    // https://tinkerfx.com/effects/gradient-shader-flow
    // Keep high precision local so the original reflection math stays intact.
    highp float flowHash(highp vec2 p) {
      return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
    }
    highp float flowNoise(highp vec2 p) {
      highp vec2 cell=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
      return mix(mix(flowHash(cell),flowHash(cell+vec2(1.0,0.0)),u.x),
        mix(flowHash(cell+vec2(0.0,1.0)),flowHash(cell+vec2(1.0)),u.x),u.y);
    }
    highp float flowFbm(highp vec2 p) {
      highp float value=0.0, weight=.5;
      for(int i=0;i<4;i++) {
        value+=flowNoise(p)*weight;
        p=p*2.03+vec2(3.1,1.7);
        weight*=.5;
      }
      return value;
    }
    vec3 prism(float t) {
      // A blue-to-red spectrum without the pink cast of a cosine palette.
      return clamp(vec3(1.5)-abs(4.0*t-vec3(3.0,2.0,1.0)),0.0,1.0);
    }
    float surface(vec2 p) {
      vec2 q = p + .38*vec2(
        sin(p.y*.91+time*.19)+.4*cos(p.x*.73-time*.13),
        cos(p.x*.81-time*.17)+.45*sin(p.y*.63+time*.16)
      );
      // Broad swells keep highlights coherent instead of splitting into fine flecks.
      return .52*sin(q.x*1.8+q.y*.82+time*.28)
        +.31*sin(q.y*2.1-q.x*.57-time*.23)
        +.10*sin(q.x*2.3+q.y*1.4+time*.21);
    }
    void main() {
      vec2 uv = gl_FragCoord.xy/resolution;
      uv.y = 1.0-uv.y;
      float aspect = resolution.x/resolution.y;
      vec2 p = (uv-.5)*vec2(aspect,1.0);
      vec3 light = vec3(0.0);
      float opacity = 0.0;
      for (int i=0;i<3;i++) {
        float seed = float(i)*2.39996;
        // Independent drifting exposures let light visit every part of the viewport.
        vec2 center = vec2(
          sin(time*.089+seed)*aspect*.47,
          cos(time*.073+seed*1.31)*.48
        ) + pointer*.025;
        vec2 q = rotate(seed+.48*sin(time*.061+seed))*(p-center);
        float exposure = smoothstep(.12,.92,.5+.5*sin(time*.19+seed+1.1));
        q += .09*vec2(sin(q.y*3.0+time*.14+seed),cos(q.x*2.5-time*.12));
        vec2 spread = vec2(.68+.08*sin(time*.13+seed),.46+.06*cos(time*.17+seed));
        float haze = exp(-dot(q/spread,q/spread)*1.5);
        // A broad exposure breathes slowly; color only peeks through near its peak.
        float glimpse = pow(.5+.5*sin(time*.24+seed+1.1),6.0);
        vec3 spectrum = mix(vec3(1.0),prism(clamp(.5+q.x*.8+seed*.06,0.0,1.0)),.55);
        float whiteAmount = exposure*haze*.24;
        float colorAmount = exposure*haze*glimpse*.26;
        float amount = whiteAmount+colorAmount;
        light += vec3(1.0)*whiteAmount+spectrum*colorAmount;
        opacity += amount;
      }
      vec3 leakColor = light/max(opacity,.001);
      float leakAlpha = min(.43,opacity);

      // Restore the independent water reflection: white glints with spectral bloom.
      vec2 water = uv*vec2(aspect,1.0)*3.0+pointer*.065;
      float h = surface(water);
      vec2 slope = vec2(surface(water+vec2(.025,0.0))-h,
        surface(water+vec2(0.0,.025))-h)/.025;
      vec2 reflection = (slope-vec2(.27,-.18)-pointer*.08)*vec2(1.0,1.15);
      float focus = dot(reflection,reflection);
      float glow = exp(-focus*2.0), glint = exp(-focus*6.0);
      float reveal = .20+.80*smoothstep(-.12,.64,
        sin(water.x*.71-water.y*.46+time*.17)+.48*cos(water.y*1.17+time*.21));
      vec3 spectrum = .5+.5*cos(6.283185*(vec3(0.0,.333,.667)
        +h*.19+reflection.x*.34+uv.y*.31+time*.012));
      vec3 reflectionColor = mix(.30+.70*spectrum,vec3(1.0),glint*.9);
      float field = smoothstep(.26,.62,uv.x);
      field *= 1.0-smoothstep(.48,1.12,length((uv-vec2(.77,.54))/vec2(.65,.83)));
      float reflectionAlpha = min(.72,glow*.20+glint*.64)*field*reveal;
      float alpha = reflectionAlpha+leakAlpha*(1.0-reflectionAlpha);
      vec3 color = (reflectionColor*reflectionAlpha
        +leakColor*leakAlpha*(1.0-reflectionAlpha))/max(alpha,.001);
      // Add beneath the existing light, with at most 2.5% opacity. Reuse its
      // spectrum rather than introduce another palette or change the glints.
      highp float flowTime=time*.12;
      highp vec2 flowP=uv*vec2(aspect,1.0)*2.15;
      highp vec2 flowWarp=vec2(flowFbm(flowP+vec2(flowTime*.1,-flowTime*.08)),
        flowFbm(flowP+vec2(5.2,1.3)+vec2(-flowTime*.12,flowTime*.09)));
      highp float flowValue=flowFbm(flowP+(flowWarp-.5)*1.5+vec2(flowTime*.15,-flowTime*.1));
      float flowAlpha=.025*field*smoothstep(.25,.65,flowValue);
      vec3 flowColor=.66+.34*spectrum;
      float combinedAlpha=alpha+flowAlpha*(1.0-alpha);
      color=(color*alpha+flowColor*flowAlpha*(1.0-alpha))/max(combinedAlpha,.001);
      alpha=combinedAlpha;
      gl_FragColor = vec4(color,alpha);
    }
  `;
  const initialize = () => {
    try {
      gl = canvas.getContext('webgl', {alpha:true,premultipliedAlpha:false,antialias:false,depth:false,powerPreference:'low-power'});
      if (!gl) return false;
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader,source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      program = gl.createProgram();
      const vs = compile(gl.VERTEX_SHADER,vertex), fs = compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program,'position');
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      uniforms = {
        resolution:gl.getUniformLocation(program,'resolution'),
        pointer:gl.getUniformLocation(program,'pointer'),
        time:gl.getUniformLocation(program,'time')
      };
      canvas.dataset.renderer = 'webgl';
      return true;
    } catch (error) {
      console.warn('Light leaks are using the canvas fallback.',error.message);
      return false;
    }
  };
  const gpu = initialize();
  if (!gpu) {
    // Soft full-screen light exposures for browsers without WebGL.
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement); canvas = replacement;
    context = canvas.getContext('2d');
    if (!context) return;
    canvas.dataset.renderer = 'canvas';
  }
  const drawFallback = () => {
    context.clearRect(0,0,width,height);
    for (let i=0;i<3;i++) {
      const seed=i*2.39996;
      const cx=width*(.5+.47*Math.sin(phase*.089+seed))+pointer.x*height*.025;
      const cy=height*(.5+.48*Math.cos(phase*.073+seed*1.31))+pointer.y*height*.025;
      const value=Math.max(0,Math.min(1,((.5+.5*Math.sin(phase*.19+seed+1.1))-.12)/.8));
      const pulse=value*value*(3-2*value);
      const length=height*(.68+.08*Math.sin(phase*.13+seed));
      context.save(); context.translate(cx,cy); context.rotate(-seed-.48*Math.sin(phase*.061+seed));
      context.save(); context.scale(1,.7);
      const haze=context.createRadialGradient(0,0,0,0,0,length);
      haze.addColorStop(0,`rgba(255,255,255,${pulse*.24})`);
      haze.addColorStop(1,'rgba(255,255,255,0)');
      context.fillStyle=haze; context.fillRect(-length,-length,length*2,length*2);
      const glimpse=Math.pow(.5+.5*Math.sin(phase*.24+seed+1.1),6);
      const tint=context.createRadialGradient(0,0,0,0,0,length);
      const colors=['180,210,255','255,228,185','195,240,218'];
      tint.addColorStop(0,`rgba(${colors[i]},${pulse*glimpse*.26})`);
      tint.addColorStop(1,`rgba(${colors[i]},0)`);
      context.fillStyle=tint; context.fillRect(-length,-length,length*2,length*2);
      context.restore(); context.restore();
    }
    // Fewer, broader reflection patches remain separate from the light leaks.
    for(let i=0;i<3;i++) {
      const seed=i*2.39996, pulse=Math.pow(Math.max(0,Math.sin(phase*.32+seed)),2);
      const cx=width*(.5+.4*(Math.sin(seed)*.5+.5))+Math.sin(phase*.19+seed)*18;
      const cy=height*(.12+.76*(Math.cos(seed*1.73)*.5+.5))+Math.cos(phase*.16+seed)*22;
      const length=Math.max(64,Math.min(width*.14,150));
      context.save(); context.translate(cx,cy); context.rotate(seed*.7+Math.sin(phase*.14+seed)*.3);
      const band=context.createLinearGradient(-length,0,length,0);
      band.addColorStop(0,'transparent');
      band.addColorStop(.32,`hsla(${i*47},85%,78%,${pulse*.26})`);
      band.addColorStop(.5,`rgba(255,255,255,${pulse*.7})`);
      band.addColorStop(.68,`hsla(${i*47+65},85%,80%,${pulse*.24})`);
      band.addColorStop(1,'transparent');
      context.strokeStyle=band; context.lineCap='round';
      context.beginPath(); context.moveTo(-length,8);
      context.bezierCurveTo(-length*.3,-20, length*.1,28+Math.sin(phase*.25+seed)*20,length,-4);
      context.lineWidth=44; context.filter='blur(16px)'; context.stroke();
      context.lineWidth=22; context.filter='blur(6px)'; context.stroke();
      context.restore();
    }
  };
  const draw = () => {
    if (lost) return;
    if (!gpu) { drawFallback(); return; }
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
    gl.uniform2f(uniforms.pointer,pointer.x,pointer.y);
    gl.uniform1f(uniforms.time,phase);
    gl.drawArrays(gl.TRIANGLES,0,6);
  };
  const animate = time => {
    const elapsed=previousTime?time-previousTime:50;
    if(elapsed>=1000/(width<600?20:30)){
      const delta=Math.min(elapsed,100); previousTime=time; phase+=delta/1000;
      const ease=1-Math.exp(-delta/450);
      pointer.x+=(pointer.targetX-pointer.x)*ease;
      pointer.y+=(pointer.targetY-pointer.y)*ease;
      draw();
    }
    frame=requestAnimationFrame(animate);
  };
  const synchronize = () => {
    cancelAnimationFrame(frame); frame=0; previousTime=0;
    if(!document.hidden&&!reducedMotion.matches&&!lost) frame=requestAnimationFrame(animate);
    else draw();
  };
  const resize = () => {
    width=document.documentElement.clientWidth; height=window.innerHeight;
    const ratio=Math.min(window.devicePixelRatio||1,1,width<600?480/width:960/width,720/height);
    canvas.width=Math.max(1,Math.round(width*ratio));
    canvas.height=Math.max(1,Math.round(height*ratio));
    if(!gpu)context.setTransform(ratio,0,0,ratio,0,0);
    draw();
  };
  window.addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||reducedMotion.matches||!finePointer.matches)return;
    pointer.targetX=Math.max(-1,Math.min(1,event.clientX/width*2-1));
    pointer.targetY=Math.max(-1,Math.min(1,event.clientY/height*2-1));
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pointer.targetX=pointer.targetY=0;});
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',synchronize);
  reducedMotion.addEventListener('change',synchronize);
  if(gpu){
    canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;synchronize();});
    canvas.addEventListener('webglcontextrestored',()=>{lost=!initialize();resize();synchronize();});
  }
  resize(); synchronize();
})();
