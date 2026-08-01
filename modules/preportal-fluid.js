const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform vec2 u_pointerVelocity;
uniform float u_time;
uniform float u_progress;
uniform float u_quality;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + 13.17;
    amplitude *= 0.49;
  }
  return value;
}

vec3 thinFilm(float phase, float intensity) {
  vec3 wavelengths = vec3(0.0, 2.094, 4.188);
  vec3 spectral = 0.5 + 0.5 * cos(phase + wavelengths);
  vec3 pearl = mix(vec3(0.06, 0.025, 0.13), vec3(0.64, 0.98, 1.0), spectral);
  return pearl * intensity;
}

void main() {
  vec2 uv = v_uv;
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  vec2 p = (uv - 0.5) * aspect;
  vec2 pointer = (u_pointer - 0.5) * aspect;
  float time = u_time;
  float velocity = min(1.0, length(u_pointerVelocity) * 2.8);

  float radius = length(p);
  float angle = atan(p.y, p.x);
  float inward = 1.0 - smoothstep(0.10, 0.88, u_progress);
  float twist = 1.45 + u_progress * 4.8;
  vec2 flow = p;
  flow += vec2(cos(angle * 3.0 - time * 0.34), sin(angle * 2.0 + time * 0.29)) * 0.035;
  flow += normalize(p - pointer + 0.001) * exp(-length(p - pointer) * 6.0) * (0.035 + velocity * 0.07);

  float n1 = fbm(flow * 3.0 + vec2(time * 0.11, -time * 0.08));
  float n2 = fbm(flow.yx * 5.2 + vec2(-time * 0.16, time * 0.12) + n1 * 1.7);
  float displacement = (n1 - 0.5) * 0.16 + (n2 - 0.5) * 0.075;
  float spiral = sin(angle * (4.0 + u_progress * 2.0) - radius * 24.0 + time * twist + n2 * 6.0);
  float membraneRadius = mix(0.48, 0.16, smoothstep(0.0, 0.82, u_progress));
  float edgeWarp = displacement + spiral * 0.018 + (n2 - 0.5) * 0.022;
  float signedEdge = radius - membraneRadius - edgeWarp;
  float membrane = smoothstep(0.08, -0.04, signedEdge);
  float rimWide = exp(-abs(signedEdge) * 23.0);
  float rimFine = exp(-abs(signedEdge + (n1 - 0.5) * 0.012) * 92.0);
  float edgeBreakup = smoothstep(0.16, 0.88, noise(vec2(angle * 3.6, time * 0.34 + n2 * 2.0)));
  float rim = rimWide * 0.48 + rimFine * (0.64 + edgeBreakup * 0.54);
  float caustic = pow(max(0.0, sin((n1 - n2) * 16.0 + angle * 3.0 - time * 0.7)), 7.0);
  float veins = pow(max(0.0, 1.0 - abs(spiral)), 8.0) * membrane;

  float interference = signedEdge * 118.0 + angle * 1.7 - n1 * 15.0 + n2 * 8.0 - time * 1.5;
  vec3 film = thinFilm(interference, 0.42 + rimFine * 1.34 + caustic * 0.68);
  vec3 violet = vec3(0.28, 0.025, 0.72);
  vec3 cyan = vec3(0.02, 0.82, 0.92);
  vec3 magenta = vec3(0.94, 0.04, 0.56);
  vec3 color = mix(violet, cyan, clamp(n1 * 1.18, 0.0, 1.0));
  color = mix(color, magenta, clamp(n2 * 0.72 + spiral * 0.13, 0.0, 0.72));
  color += film;
  vec3 rimSpectrum = thinFilm(interference + signedEdge * 76.0, 1.0);
  color += rimSpectrum * rimFine * (0.82 + edgeBreakup * 0.52);
  color += vec3(0.66, 0.78, 1.0) * rimWide * 0.24;
  color += vec3(1.0, 0.45, 0.13) * veins * 0.20;
  color += vec3(0.75, 0.94, 1.0) * caustic * (0.35 + u_quality * 0.25);

  float pointerWake = exp(-length(p - pointer) * 8.0) * velocity;
  color += vec3(0.18, 0.72, 1.0) * pointerWake * 0.55;
  float core = exp(-radius * mix(7.0, 18.0, u_progress));
  float collapse = smoothstep(0.54, 0.88, u_progress);
  vec3 coreSpectrum = thinFilm(angle * 2.0 + n1 * 4.0 - time, 1.0);
  color += mix(vec3(0.72, 0.86, 1.0), coreSpectrum, collapse * 0.72) * core * collapse * 1.08;

  float grain = (hash21(gl_FragCoord.xy + floor(time * 24.0)) - 0.5) * 0.035;
  color += grain;
  color = pow(max(color, 0.0), vec3(0.88));

  float edgeFade = smoothstep(0.82, 0.28, radius);
  float alpha = max(membrane * 0.70, max(rimWide * 0.58, rimFine * 0.94)) * edgeFade * inward;
  alpha *= smoothstep(0.0, 0.12, u_progress) * (1.0 - smoothstep(0.72, 0.94, u_progress));
  outColor = vec4(color * alpha, alpha);
}`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

export function initPreportalFluid({ getMotionQuality = () => "high" } = {}) {
  const canvas = document.querySelector("#preportal-fluid-canvas");
  const shell = canvas?.closest(".preportal-fluid-entry");
  if (!canvas || !shell) return { destroy() {} };

  function createFallback() {
    shell.classList.add("preportal-fluid-entry--fallback");
    const update = (event) => {
      const value = Math.max(0, Math.min(1, Number(event?.detail?.map || 0)));
      const enter = Math.min(1, value / 0.18);
      const exit = 1 - Math.min(1, Math.max(0, (value - 0.58) / 0.28));
      const alpha = enter * enter * (3 - 2 * enter) * exit * exit * (3 - 2 * exit);
      shell.style.setProperty("--preportal-fluid-alpha", alpha.toFixed(4));
    };
    document.addEventListener("kpr-archive-fold-progress", update);
    update({ detail: window.__kprArchiveFold || {} });
    return {
      destroy() {
        document.removeEventListener("kpr-archive-fold-progress", update);
      },
    };
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "high-performance",
  });
  if (!gl) {
    return createFallback();
  }

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Shader link failed");
    }
  } catch (error) {
    console.warn("KPR preportal fluid fallback", error);
    return createFallback();
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    pointer: gl.getUniformLocation(program, "u_pointer"),
    pointerVelocity: gl.getUniformLocation(program, "u_pointerVelocity"),
    time: gl.getUniformLocation(program, "u_time"),
    progress: gl.getUniformLocation(program, "u_progress"),
    quality: gl.getUniformLocation(program, "u_quality"),
  };

  let progress = Number(window.__kprArchiveFold?.map || 0);
  let raf = 0;
  let lastFrame = 0;
  let dirty = true;
  let destroyed = false;
  let contextLost = false;
  const pointer = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0 };

  const qualityValue = () => {
    const quality = getMotionQuality();
    return quality === "high" ? 1 : quality === "balanced" ? 0.72 : 0.5;
  };

  function resize() {
    const rect = shell.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const maxDpr = qualityValue() >= 1 ? 1.65 : qualityValue() >= 0.7 ? 1.35 : 1;
    const dpr = Math.min(devicePixelRatio || 1, maxDpr);
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function envelope(value) {
    const enter = Math.min(1, Math.max(0, value / 0.18));
    const exit = 1 - Math.min(1, Math.max(0, (value - 0.58) / 0.28));
    return enter * enter * (3 - 2 * enter) * exit * exit * (3 - 2 * exit);
  }

  function render(now) {
    raf = 0;
    if (destroyed || contextLost || document.hidden) return;
    const alpha = envelope(progress);
    shell.style.setProperty("--preportal-fluid-alpha", alpha.toFixed(4));
    shell.dataset.fluidPhase = progress < 0.2 ? "coalescing" : progress < 0.58 ? "shearing" : "collapsing";
    if (alpha <= 0.002) return;

    const quality = qualityValue();
    const frameBudget = quality >= 1 ? 8.2 : quality >= 0.7 ? 16.2 : 24;
    if (lastFrame && now - lastFrame < frameBudget && !dirty) {
      raf = requestAnimationFrame(render);
      return;
    }
    lastFrame = now;
    dirty = false;
    resize();
    pointer.vx += ((pointer.x - pointer.px) - pointer.vx) * 0.16;
    pointer.vy += ((pointer.y - pointer.py) - pointer.vy) * 0.16;
    pointer.px += (pointer.x - pointer.px) * 0.12;
    pointer.py += (pointer.y - pointer.py) * 0.12;

    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.pointer, pointer.px, 1 - pointer.py);
    gl.uniform2f(uniforms.pointerVelocity, pointer.vx, -pointer.vy);
    gl.uniform1f(uniforms.time, reducedMotion.matches ? 0 : now * 0.001);
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.quality, quality);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    canvas.dataset.fluidQuality = quality >= 1 ? "ultra" : quality >= 0.7 ? "high" : "balanced";
    if (!reducedMotion.matches) raf = requestAnimationFrame(render);
  }

  function schedule() {
    dirty = true;
    if (!raf && envelope(progress) > 0.002 && !document.hidden) {
      raf = requestAnimationFrame(render);
    }
  }

  function onProgress(event) {
    progress = Math.max(0, Math.min(1, Number(event?.detail?.map || 0)));
    if (contextLost) {
      shell.style.setProperty("--preportal-fluid-alpha", envelope(progress).toFixed(4));
      shell.dataset.fluidPhase = progress < 0.2 ? "coalescing" : progress < 0.58 ? "shearing" : "collapsing";
    }
    schedule();
  }

  function onPointer(event) {
    if (envelope(progress) <= 0.002) return;
    const rect = shell.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    pointer.y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    schedule();
  }

  function onVisibility() {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      schedule();
    }
  }

  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    shell.classList.add("preportal-fluid-entry--fallback");
    shell.dataset.fluidQuality = "fallback-context-loss";
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    schedule();
  });
  resizeObserver.observe(shell);
  document.addEventListener("kpr-archive-fold-progress", onProgress);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pointermove", onPointer, { passive: true });
  canvas.addEventListener("webglcontextlost", onContextLost, false);
  reducedMotion.addEventListener?.("change", schedule);
  resize();
  schedule();

  return {
    destroy() {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      document.removeEventListener("kpr-archive-fold-progress", onProgress);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      reducedMotion.removeEventListener?.("change", schedule);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
