// PORTAL GPU v210 — next-generation accretion layer for the Eden portal.
// A raw WebGL point-sprite engine: every particle lives statelessly in the vertex
// shader (position = f(seed, time)), so tens of thousands of live particles cost the
// CPU only a handful of uniform uploads per frame. The approved v201 2D dust ring
// stays untouched underneath as the base; this layer adds the living accretion disk.
// Frugality contract: renders only while the map phase is active and the tab is
// visible; sleeps to zero cost otherwise; adaptive draw budget; DPR capped at 1.25;
// no per-frame allocations; survives WebGL context loss.
export function initPortalGpu() {
  const gpuCanvas = document.getElementById("eden-portal-gpu");
  const baseCanvas = document.getElementById("eden-portal-canvas");
  const archiveScreen = document.getElementById("archive-screen");
  const viewport = document.querySelector(".eden-map-viewport");
  if (!gpuCanvas || !baseCanvas || !archiveScreen) {
    return;
  }
  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  if (prefersReducedMotion) {
    return; // the static 2D ring remains the reduced-motion presentation
  }

  const gl = gpuCanvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    premultipliedAlpha: true,
  });
  if (!gl) {
    return;
  }

  const COUNT_HIGH = 22000;
  const COUNT_MED = 13000;
  const COUNT_LOW = 7000;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.25);

  const VERT = `
attribute vec4 aSeed;  // x: radial bias 0..1 gaussian, y: initial angle, z: depth -1..1, w: random
attribute vec2 aKind;  // x: point size px, y: color selector 0..1
uniform vec2 uRes;
uniform float uTime;
uniform float uOpen;
uniform float uEnergy;
uniform float uSurge;
uniform float uBreathe;
uniform vec2 uCursor;      // pixels, canvas space
uniform float uCursorStr;  // 0..1
uniform float uImpulse;
uniform float uCoherent;
varying float vAlpha;
varying vec3 vColor;
varying float vStretch;
varying float vAngle;

void main() {
  float maxR = min(uRes.x, uRes.y) * 0.5;
  float fieldR = maxR * uOpen * 0.94;

  // Accretion population: 82% live on the horizon band, 18% spiral inside it.
  float inner = step(0.82, aSeed.w);
  float bandR = fieldR * (1.0 + (aSeed.x - 0.5) * 0.16);
  float diskR = fieldR * (0.38 + 0.5 * aSeed.x);
  float r = mix(bandR, diskR, inner);

  // Keplerian differential rotation: closer orbits move faster (r^-1.5).
  float rn = max(0.14, r / max(1.0, fieldR));
  float angVel = 0.16 / (rn * sqrt(rn));
  float dir = mix(1.0, -1.0, step(0.5, fract(aSeed.w * 7.31)));
  float angle = aSeed.y + uTime * angVel * dir;

  // Coherent mode gives the event horizon one continuous, low-frequency
  // silhouette. Harmonics deform the field itself instead of adding another ring.
  float boundaryNoise =
    sin(angle * 3.0 + uTime * 0.23) * 0.010 +
    sin(angle * 7.0 - uTime * 0.17) * 0.006 +
    cos(angle * 13.0 + uTime * 0.11) * 0.003;
  r *= 1.0 + boundaryNoise * uCoherent;

  // Shared energy director: breathing and nine-second surges push the field.
  r += uBreathe * maxR * 0.012 + uSurge * maxR * 0.03 * (0.4 + aSeed.w);
  r += uImpulse * uCoherent * maxR * 0.022 * (0.25 + aSeed.w);

  vec2 pos = vec2(cos(angle), sin(angle)) * r + uRes * 0.5;

  // Cursor gravity: nearby particles are deflected outward and brighten.
  vec2 toCursor = pos - uCursor;
  float cd = length(toCursor);
  float pull = uCursorStr * smoothstep(maxR * 0.5, 0.0, cd);
  pos += normalize(toCursor + vec2(0.0001)) * pull * 14.0;

  vec2 clip = (pos / uRes) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);

  float twinkle = 0.72 + 0.28 * sin(uTime * (1.3 + aSeed.w * 2.4) + aSeed.y * 5.0);
  float depthFade = 0.55 + 0.45 * aSeed.z;
  float doppler = 0.72 + 0.28 * (0.5 + 0.5 * cos(angle - 0.42));
  vAlpha = twinkle * depthFade * (0.5 + uEnergy * 0.45) * (0.55 + pull * 2.2);
  vAlpha *= mix(1.0, doppler, uCoherent);
  vAlpha *= mix(1.0, 0.62, inner);

  float photonBand = 1.0 - inner;
  vStretch = mix(1.0, 2.2 + uEnergy * 1.45 + uSurge * 2.2 + pull * 1.4, uCoherent * photonBand);
  vAngle = angle + 1.5707963;
  gl_PointSize = aKind.x * (0.8 + uEnergy * 0.5 + pull * 1.6) * (0.7 + 0.3 * aSeed.z) * sqrt(vStretch);

  // Visual genetics: cyan lineage, violet recessive, warm-white core, rare orange flare.
  vec3 cyan = vec3(0.38, 0.9, 0.86);
  vec3 violet = vec3(0.66, 0.42, 1.0);
  vec3 hot = vec3(1.0, 0.94, 0.85);
  vec3 orange = vec3(1.0, 0.45, 0.1);
  vec3 col = mix(cyan, violet, smoothstep(0.3, 0.7, aKind.y));
  col = mix(col, hot, step(0.93, aKind.y));
  col = mix(col, orange, step(0.985, aKind.y) * (0.6 + uSurge * 0.4));
  vColor = col;
}
`;

  const FRAG = `
precision mediump float;
varying float vAlpha;
varying vec3 vColor;
varying float vStretch;
varying float vAngle;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float c = cos(vAngle);
  float s = sin(vAngle);
  vec2 local = vec2(c * uv.x + s * uv.y, -s * uv.x + c * uv.y);
  local.y *= vStretch;
  float d = length(local);
  float a = smoothstep(0.5, 0.06, d);
  a *= a;
  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
}
`;

  let program = null;
  let buffer = null;
  let uniforms = {};
  let drawCount = COUNT_HIGH;
  let contextLost = false;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("portal-gpu shader:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function buildAttributes() {
    // Interleaved: aSeed(4) + aKind(2) = 6 floats per particle, generated once.
    const data = new Float32Array(COUNT_HIGH * 6);
    for (let i = 0; i < COUNT_HIGH; i += 1) {
      const o = i * 6;
      // Approximate gaussian from three uniforms (central limit): tight horizon band.
      const gauss = (Math.random() + Math.random() + Math.random()) / 3;
      data[o] = gauss;
      data[o + 1] = Math.random() * Math.PI * 2;
      data[o + 2] = Math.random() * 2 - 1;
      data[o + 3] = Math.random();
      const rare = Math.random();
      data[o + 4] = rare > 0.985 ? 2.6 + Math.random() * 2.2 : 0.9 + Math.random() * 1.7;
      data[o + 5] = rare;
    }
    return data;
  }

  function initGl() {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      return false;
    }
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("portal-gpu link:", gl.getProgramInfoLog(program));
      return false;
    }
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, buildAttributes(), gl.STATIC_DRAW);
    const aSeed = gl.getAttribLocation(program, "aSeed");
    const aKind = gl.getAttribLocation(program, "aKind");
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(aKind);
    gl.vertexAttribPointer(aKind, 2, gl.FLOAT, false, 24, 16);
    uniforms = {
      uRes: gl.getUniformLocation(program, "uRes"),
      uTime: gl.getUniformLocation(program, "uTime"),
      uOpen: gl.getUniformLocation(program, "uOpen"),
      uEnergy: gl.getUniformLocation(program, "uEnergy"),
      uSurge: gl.getUniformLocation(program, "uSurge"),
      uBreathe: gl.getUniformLocation(program, "uBreathe"),
      uCursor: gl.getUniformLocation(program, "uCursor"),
      uCursorStr: gl.getUniformLocation(program, "uCursorStr"),
      uImpulse: gl.getUniformLocation(program, "uImpulse"),
      uCoherent: gl.getUniformLocation(program, "uCoherent"),
    };
    gl.enable(gl.BLEND);
    // Premultiplied additive: light accumulates like exposure, no gray fringes.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    return true;
  }

  if (!initGl()) {
    return;
  }

  let mapProgress = 0;
  let running = false;
  let cursorX = -9999;
  let cursorY = -9999;
  let cursorStrength = 0;
  let lastGeom = "";
  let frameEma = 8;
  let lastFrameAt = 0;

  function syncGeometry() {
    const geom = `${baseCanvas.style.left}|${baseCanvas.style.top}|${baseCanvas.style.width}|${baseCanvas.style.height}`;
    if (geom === lastGeom) {
      return;
    }
    lastGeom = geom;
    gpuCanvas.style.left = baseCanvas.style.left;
    gpuCanvas.style.top = baseCanvas.style.top;
    gpuCanvas.style.width = baseCanvas.style.width;
    gpuCanvas.style.height = baseCanvas.style.height;
    const w = Math.max(1, Math.round(parseFloat(baseCanvas.style.width || "0") * DPR));
    const h = Math.max(1, Math.round(parseFloat(baseCanvas.style.height || "0") * DPR));
    if (gpuCanvas.width !== w || gpuCanvas.height !== h) {
      gpuCanvas.width = w;
      gpuCanvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  let lastRenderTick = 0;

  function render(now) {
    running = false;
    lastRenderTick = performance.now();
    if (contextLost || mapProgress <= 0.01 || document.hidden) {
      return;
    }
    syncGeometry();
    const time = now * 0.001;
    const sharedDirector = window.__kprPortalEnergy;
    const coherent = sharedDirector?.mode === "coherent" && typeof sharedDirector.read === "function";
    const shared = coherent ? sharedDirector.read(now) : null;

    // Same director formulas as the approved v201 ring, driven by the same clock,
    // so the GPU disk and the 2D dust breathe and surge together without coupling.
    const phase = time * ((2 * Math.PI) / 7.5);
    const breathe = coherent ? shared.breathe : Math.sin(phase);
    const surgeTime = time % 9;
    const surge = coherent ? shared.surge : Math.max(0, 1 - Math.abs(surgeTime - 4.5) / 0.72);
    const energy = coherent ? shared.energy : Math.min(1.35, 0.72 + surge * 0.22 + cursorStrength * 0.28);
    const impulse = coherent ? shared.impulse : 0;
    const activeCursorStrength = coherent ? Math.max(cursorStrength, shared.pointer.strength) : cursorStrength;

    cursorStrength *= 0.96;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uniforms.uRes, gpuCanvas.width, gpuCanvas.height);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uOpen, Math.min(1, mapProgress));
    gl.uniform1f(uniforms.uEnergy, energy);
    gl.uniform1f(uniforms.uSurge, surge);
    gl.uniform1f(uniforms.uBreathe, breathe);
    gl.uniform2f(uniforms.uCursor, cursorX * DPR, cursorY * DPR);
    gl.uniform1f(uniforms.uCursorStr, activeCursorStrength);
    gl.uniform1f(uniforms.uImpulse, impulse);
    gl.uniform1f(uniforms.uCoherent, coherent ? 1 : 0);
    gl.drawArrays(gl.POINTS, 0, drawCount);

    // Adaptive budget from main-thread frame cadence (EMA), floor at COUNT_LOW.
    if (lastFrameAt) {
      frameEma = frameEma * 0.92 + (now - lastFrameAt) * 0.08;
      if (frameEma > 24 && drawCount > COUNT_LOW) {
        drawCount = drawCount === COUNT_HIGH ? COUNT_MED : COUNT_LOW;
        frameEma = 12;
      }
    }
    lastFrameAt = now;

    running = true;
    requestAnimationFrame(render);
  }

  function wake() {
    if (!running && !contextLost && mapProgress > 0.01 && !document.hidden) {
      running = true;
      lastFrameAt = 0;
      requestAnimationFrame(render);
    }
  }

  document.addEventListener("kpr-archive-fold-progress", (event) => {
    mapProgress = Number(event?.detail?.map || 0);
    if (mapProgress > 0.01) {
      // Watchdog: a rAF scheduled while the tab was hidden can be silently lost,
      // leaving `running` stuck true. If no frame ticked recently, distrust the flag.
      if (performance.now() - lastRenderTick > 400) {
        running = false;
      }
      wake();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      wake();
    }
  });

  viewport?.addEventListener(
    "pointermove",
    (event) => {
      const rect = gpuCanvas.getBoundingClientRect();
      cursorX = event.clientX - rect.left;
      cursorY = event.clientY - rect.top;
      cursorStrength = Math.min(1, cursorStrength + 0.3);
    },
    { passive: true }
  );

  gpuCanvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
  });

  gpuCanvas.addEventListener("webglcontextrestored", () => {
    contextLost = false;
    lastGeom = "";
    if (initGl()) {
      wake();
    }
  });
}
