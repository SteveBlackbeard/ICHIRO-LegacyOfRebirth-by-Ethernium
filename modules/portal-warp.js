// Upgraded Warp Tunnel Simulation (v214)
// High-fidelity transdimensional Hollywood-grade 3D perspective particle tunnel simulation.
// Features a physics-based Interstellar-style Black Hole Singularity & Gravitational Lensed Accretion Disk,
// volumetric particle gas coronas (no hard circles, realistic light-scattering), and tapered motion blur beams.
// Keep it cheap contract: 0 CPU overhead, 100% WebGL-bound.

export function createPortalWarp() {
  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  const proofMode = new URLSearchParams(window.location.search).get("kpr") === "e2e-proof-260";
  
  const COUNT_PARTICLES = proofMode ? 16000 : 160000;
  const COUNT_STREAKS = proofMode ? 3500 : 35000;
  const DPR = Math.min(window.devicePixelRatio || 1, 1.25);

  let canvas = null;
  let gl = null;
  
  let particleProgram = null;
  let streakProgram = null;
  
  let particleBuffer = null;
  let streakBuffer = null;
  
  let particleUniforms = null;
  let streakUniforms = null;
  
  let ready = false;
  let rafId = 0;
  let t0 = 0;
  let speed = 0;
  let targetSpeed = 0;
  let visible = false;
  let exitValue = 0;
  let targetExit = 0;
  let shockwaveVal = 0.0;

  // ── 1. Particle Shaders (5 Layers: Accretion Disk, 2 Walls, 3 Foreground streams) ────
  const PARTICLE_VERT = `
attribute vec4 aData;  // x: theta, y: radius bias, z: z0 phase, w: random (seed)
uniform float uT;
uniform float uSpeed;
uniform vec2 uRes;
uniform float uExit;
uniform float uShockwave;
varying float vA;
varying vec3 vCol;
varying float vIsDisk;

// High-amplitude 3D spline curves curving on X and Y axes
vec2 tunnelCurve(float depth, float time) {
  float straighten = 1.0 - uExit;
  float curveY = sin(depth * 2.4 - time * 0.45) * 0.38;
  float curveX = cos(depth * 3.4 + time * 0.55) * 0.34;
  return vec2(curveX, curveY) * straighten;
}

void main() {
  float seed = aData.w;
  float spd = abs(uSpeed);
  float dir = uSpeed < 0.0 ? -1.0 : 1.0;

  float near = 0.02;
  float far = 2.0;

  // Designate 5% of particles to form the exit gate rings at the far end
  float isExitGate = step(0.95, seed) * step(0.001, uExit);

  // Segment particles into 5 distinct layers:
  // - Layer 1 (Interstellar Accretion Disk): Seed 0.00 -> 0.15 (15% of particles)
  // - Layer 2 (Inner Tunnel Wall):           Seed 0.15 -> 0.50 (35% of particles)
  // - Layer 3 (Outer Tunnel Wall):           Seed 0.50 -> 0.80 (30% of particles)
  // - 3 Close Foreground Streams:
  //   - Close Inner: Seed 0.80 -> 0.86 (6.6% of particles)
  //   - Close Mid:   Seed 0.86 -> 0.93 (6.6% of particles)
  //   - Close Outer: Seed 0.93 -> 1.00 (6.6% of particles)
  float isDisk = step(seed, 0.15);
  float isWall1 = step(0.15, seed) * (1.0 - step(0.50, seed));
  float isWall2 = step(0.50, seed) * (1.0 - step(0.80, seed));
  float isClose1 = step(0.80, seed) * (1.0 - step(0.86, seed));
  float isClose2 = step(0.86, seed) * (1.0 - step(0.93, seed));
  float isClose3 = step(0.93, seed);

  vIsDisk = isDisk;

  // Z (depth) calculations with continuous travel flow
  float speedSpread = 0.015 * fract(seed * 13.82);
  float z = fract(aData.z + uT * (0.05 + spd * 0.16) * (0.55 + seed * 0.8) * -dir + speedSpread);
  float zNormal = z * z;
  
  // Relativistic Lorentz depth contraction
  float beta = clamp(spd * 0.16, 0.0, 0.85) * (1.0 - uExit);
  float aberratedZ = zNormal * (1.0 - beta) / (1.0 - beta * zNormal);
  
  // Map to physical 3D depth [near, far]
  float normalZZ = aberratedZ * (far - near) + near;
  
  // Expand exit gate rings forward during final white-out approach
  float exitZZ = mix(far * 0.95, near * 1.5, uExit);
  float z3D = mix(normalZZ, exitZZ, isExitGate);

  // Shell Rotations (Wall 1 and 2 rotate in opposite directions)
  float spinDir = mix(1.0, -1.0, isWall2);
  float spiralTwist = z3D * (1.8 * spinDir) + uT * (0.08 * dir * spinDir);
  float strandWave = sin(z3D * 5.0 - uT * 2.2 + seed * 6.28318) * 0.18 * clamp(spd * 0.4, 0.0, 1.2) * (1.0 - uExit);
  
  float numStrands = 32.0;
  float strandId = floor(fract(seed * 9.17) * numStrands);
  float baseAngle = mix(aData.x, (strandId / numStrands) * 6.2831853, step(0.15, seed));
  float ang = baseAngle + spiralTwist + strandWave;
  ang = mix(ang, aData.x, isExitGate);

  vec2 d = vec2(cos(ang), sin(ang));
  
  // Radii for the layers
  float expand = 1.0 + pow(uExit, 2.0) * 4.0;
  float rrWall1 = (0.28 + aData.y * 0.015) * expand;
  float rrWall2 = (0.44 + aData.y * 0.02) * expand;
  float rrClose1 = (0.15 + aData.y * 0.08) * expand;
  float rrClose2 = (0.52 + aData.y * 0.15) * expand;
  float rrClose3 = (0.88 + aData.y * 0.30) * expand;

  float rr = isWall1 * rrWall1 + isWall2 * rrWall2 + isClose1 * rrClose1 + isClose2 * rrClose2 + isClose3 * rrClose3;

  // Absolute 3D coordinates relative to camera
  vec3 pos3D = vec3(0.0);
  
  if (isDisk > 0.5 && isExitGate == 0.0) {
    // 3D Keplerian Accretion Disk (flat disk swirling around the event horizon)
    float diskAng = aData.x + uT * 0.8;
    float diskRR = (0.13 + aData.y * 0.16) * expand;
    vec2 diskPos = vec2(cos(diskAng), sin(diskAng)) * diskRR;
    
    pos3D.x = diskPos.x;
    pos3D.y = diskPos.y * 0.16; // Flattened to view at a cinematic angle
    pos3D.z = z3D;
    
    // Accretion disk gravitational lensing (Einstein ring light-bending)
    float distToCore = length(pos3D.xy);
    float eventHorizon = 0.09;
    if (distToCore < 0.26) {
      float lens = smoothstep(0.26, eventHorizon, distToCore);
      pos3D.y += sign(pos3D.y) * lens * 0.12 * (1.0 - uExit);
    }
  } else {
    // Standard tunnel cylinder layout
    pos3D.xy = d * rr;
    pos3D.z = z3D;
  }
  
  // Apply camera spline curve offset
  pos3D.xy += tunnelCurve(z3D, uT) - tunnelCurve(0.0, uT);

  // Gravitational Lensing around black hole core (for non-disk particles)
  if (isDisk < 0.5 && isExitGate == 0.0) {
    float dist = length(pos3D.xy);
    float lensRadius = 0.22;
    if (dist > 0.01 && dist < lensRadius) {
      float t = (lensRadius - dist) / lensRadius;
      float angleOffset = t * t * 1.5 * (1.0 - uExit);
      float c = cos(angleOffset);
      float s = sin(angleOffset);
      pos3D.xy = vec2(pos3D.x * c - pos3D.y * s, pos3D.x * s + pos3D.y * c);
    }
  }

  // Perspective projection
  float aspect = uRes.y / uRes.x;
  float fovScale = 0.38;
  float clipZ = ((far + near)/(far - near)) * pos3D.z - (2.0 * far * near / (far - near));
  
  gl_Position = vec4(pos3D.x * aspect * fovScale, pos3D.y * fovScale, clipZ, pos3D.z);

  // Spatial Chromatic Dispersion (simulates lens chromatic aberration at screen edges)
  float redShift = step(0.5, seed) * 2.0 - 1.0;
  float dispersion = 0.016 * (1.0 - uExit);
  gl_Position.xy += normalize(gl_Position.xy) * redShift * dispersion * (length(gl_Position.xy) * 0.18);

  float nearFade = smoothstep(near, near + 0.08, pos3D.z);
  float farFade = smoothstep(far, far - 0.22, pos3D.z);
  
  // AAA quality fine particle sizing
  float sizeBase = 1.0 + seed * 2.5;
  gl_PointSize = (sizeBase * uRes.y * 0.0018) / max(0.005, pos3D.z);
  
  // Accretion disk particles are slightly smaller and denser
  gl_PointSize = mix(gl_PointSize, gl_PointSize * 0.75, isDisk);
  gl_PointSize = clamp(gl_PointSize, 1.0, 24.0);

  // Fainter alphas to avoid over-illumination and preserve high contrast/definition
  float alphaDisk = nearFade * farFade * 0.28; // Accretion disk is clear
  float alphaWall = nearFade * farFade * 0.14;
  float alphaClose = nearFade * farFade * 0.16;

  vA = mix(isDisk * alphaDisk + (isWall1 + isWall2) * alphaWall + (isClose1 + isClose2 + isClose3) * alphaClose, 0.35 * nearFade * farFade, isExitGate);
  vA *= (0.2 + spd * 0.8) * (1.0 - uExit * 0.95);
  
  // Distinct color veins to highlight curves and strands
  float isGreenVein = step(0.9, sin(strandId * 1.5707963)) * (isWall1 + isWall2);

  // Layer Colors
  vec3 colDisk = vec3(1.0, 0.48, 0.10); // Hot amber accretion disk core
  vec3 colDust = mix(
    mix(vec3(1.0, 0.55, 0.12), vec3(0.68, 0.35, 1.0), step(0.5, seed)), // Amber/violet base
    vec3(0.0, 1.0, 0.55), // Emerald green vein
    isGreenVein
  );
  vec3 colRing = vec3(0.35, 1.0, 0.85); // Bright green-cyan close particles

  // Depth-level color gradient (differentiates distance tiers for depth readability)
  float normZ = clamp((z3D - near) / (far - near), 0.0, 1.0);
  vec3 colTierFar = vec3(0.12, 0.35, 1.0);
  vec3 colTierMidFar = vec3(0.0, 0.95, 0.85);
  vec3 colTierMidNear = vec3(0.85, 0.15, 1.0);
  vec3 colTierNear = vec3(1.0, 0.52, 0.08);

  vec3 depthCol = mix(
    mix(mix(colTierNear, colTierMidNear, smoothstep(0.12, 0.32, normZ)), 
        colTierMidFar, smoothstep(0.32, 0.68, normZ)),
    colTierFar, smoothstep(0.68, 0.92, normZ)
  );

  vec3 baseCol = isDisk * colDisk + (isWall1 + isWall2) * colDust + (isClose1 + isClose2 + isClose3) * colRing;
  
  // Blend base layer colors with the depth-based tiers for volumetric videogame look
  vCol = mix(baseCol, depthCol, 0.55);
  vCol = mix(vCol, vec3(1.0, 1.0, 1.0), isExitGate);
}
`;

  // Fragment shader outputs a volumetric star (hot core + soft gas corona)
  const PARTICLE_FRAG = `
precision mediump float;
varying float vA;
varying vec3 vCol;
varying float vIsDisk;

void main() {
  vec2 coords = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(coords, coords);
  if (r2 > 1.0) discard;

  // Hollywood-grade volumetric light scattering (hot core + soft nebular halo)
  float coreGlow = exp(-r2 * 8.0) * 1.5;
  float haloGlow = exp(-r2 * 1.8) * 0.45;
  float volumetric = coreGlow + haloGlow;
  
  // Accretion disk has slightly sharper/more condensed glow
  volumetric = mix(volumetric, exp(-r2 * 3.6) * 1.2, vIsDisk);

  float alpha = vA * volumetric;
  gl_FragColor = vec4(vCol * alpha, alpha);
}
`;

  // ── 2. Streak Shaders (Relativistic Speed Lines) ────────────────────────────
  const STREAK_VERT = `
attribute vec4 aData;  // x: theta, y: radius bias, z: z0 phase, w: random (seed)
attribute float aTail; // 0 = head, 1 = tail
uniform float uT;
uniform float uSpeed;
uniform vec2 uRes;
uniform float uExit;
uniform float uShockwave;
varying float vA;
varying vec3 vCol;

vec2 tunnelCurve(float depth, float time) {
  float straighten = 1.0 - uExit;
  float curveY = sin(depth * 2.4 - time * 0.45) * 0.38;
  float curveX = cos(depth * 3.4 + time * 0.55) * 0.34;
  return vec2(curveX, curveY) * straighten;
}

void main() {
  float seed = aData.w;
  float spd = abs(uSpeed);
  float dir = uSpeed < 0.0 ? -1.0 : 1.0;

  float near = 0.02;
  float far = 2.0;

  float isExitGate = step(0.95, seed) * step(0.001, uExit);

  float speedSpread = 0.015 * fract(seed * 13.82);
  float z = fract(aData.z + uT * (0.05 + spd * 0.16) * (0.55 + seed * 0.9) * -dir + speedSpread);
  
  // Non-linear depth mapping
  float zNormal = z * z;
  float normalZZ = zNormal * (far - near) + near;
  
  float shellDir = step(0.5, seed) * 2.0 - 1.0;
  float numStrands = 32.0;
  float strandId = floor(fract(seed * 7.42) * numStrands);
  float baseAngle = (strandId / numStrands) * 6.2831853;
  float spiralTwist = normalZZ * (1.8 * shellDir) + uT * (0.08 * dir * shellDir);
  float strandWave = sin(normalZZ * 5.0 - uT * 2.2 + seed * 6.28318) * 0.22 * clamp(spd * 0.4, 0.0, 1.2) * (1.0 - uExit);
  
  // Dynamic shockwave
  float waveZ = 1.2 - uShockwave * 0.55;
  float localShock = uShockwave * exp(-pow(normalZZ - waveZ, 2.0) * 16.0);
  float shockRadial = localShock * 0.42;
  
  float ang = mix(baseAngle + spiralTwist + strandWave, aData.x + aTail * (6.2831853 / 16.0), isExitGate);
  vec2 d = vec2(cos(ang), sin(ang));

  // Align speed streaks strictly along the 2 wall layers
  float isWall1 = step(seed, 0.50);
  float expand = 1.0 + pow(uExit, 2.0) * 4.0;
  float rrWall1 = (0.28 + aData.y * 0.015) * expand;
  float rrWall2 = (0.44 + aData.y * 0.02) * expand;
  
  float ringId = floor(fract(seed * 23.41) * 8.0);
  float exitRR = (0.15 + ringId * 0.065) * (1.0 + uExit * 3.0);
  float rr = mix(mix(rrWall2, rrWall1, isWall1) + shockRadial, exitRR, isExitGate);

  // Absolute 3D coordinates relative to camera (subtracting camera position tunnelCurve(0.0) for true flight path)
  vec3 pos3D = vec3(0.0);
  pos3D.xy = d * rr + tunnelCurve(normalZZ, uT) - tunnelCurve(0.0, uT);
  
  // Non-spiky straight lines aligned to the rails: Z tail offset only
  float tailLen = (0.012 + spd * 0.045) * (0.5 + seed * 0.5);
  float exitZZ = mix(far * 0.95, -0.15, uExit);
  pos3D.z = mix(normalZZ + tailLen * aTail, exitZZ, isExitGate);

  // Gravitational Lensing
  float dist = length(pos3D.xy);
  float lensRadius = 0.22;
  if (dist > 0.01 && dist < lensRadius && isExitGate == 0.0) {
    float t = (lensRadius - dist) / lensRadius;
    float angleOffset = t * t * 1.5 * (1.0 - uExit);
    float c = cos(angleOffset);
    float s = sin(angleOffset);
    pos3D.xy = vec2(pos3D.x * c - pos3D.y * s, pos3D.x * s + pos3D.y * c);
  }

  float aspect = uRes.y / uRes.x;
  float fovScale = 0.38;
  float clipZ = ((far + near)/(far - near)) * pos3D.z - (2.0 * far * near / (far - near));
  
  gl_Position = vec4(pos3D.x * aspect * fovScale, pos3D.y * fovScale, clipZ, pos3D.z);

  // Spatial Chromatic Dispersion (simulates lens chromatic aberration at screen edges)
  float redShift = step(0.5, seed) * 2.0 - 1.0;
  float dispersion = 0.016 * (1.0 - uExit);
  gl_Position.xy += normalize(gl_Position.xy) * redShift * dispersion * (length(gl_Position.xy) * 0.18);

  float nearFade = smoothstep(near, near + 0.08, pos3D.z);
  float farFade = smoothstep(far, far - 0.22, pos3D.z);
  
  // AAA Tapered Motion Blur decay: speed line fades out quadratically towards the tail
  float tailAlpha = pow(1.0 - aTail, 2.5);
  float normalA = nearFade * farFade * (0.05 + spd * 0.15) * tailAlpha * (1.0 - uExit);
  float exitA = smoothstep(0.01, 0.25, uExit) * 0.95 * tailAlpha;
  vA = mix(normalA, exitA, isExitGate);

  // Every 8th strand is a bright electric emerald-green vein
  float isGreenVein = step(0.9, sin(strandId * 1.5707963));

  // Doppler shifted color base
  vec3 colBand1 = mix(vec3(1.0, 0.42, 0.2), vec3(0.0, 1.0, 0.55), isGreenVein); // Amber base vs Emerald vein
  vec3 colBand2 = vec3(0.32, 0.95, 0.88); // Cyan
  vec3 colBand3 = vec3(0.68, 0.35, 1.0);  // Violet
  float isBand1 = 1.0 - step(0.33, seed);
  vec3 baseCol = isBand1 * colBand1 + (1.0 - isBand1) * mix(colBand2, colBand3, step(0.66, seed));

  // Depth-level color gradient (differentiates distance tiers for depth readability)
  float normZ = clamp((pos3D.z - near) / (far - near), 0.0, 1.0);
  vec3 colTierFar = vec3(0.12, 0.35, 1.0);
  vec3 colTierMidFar = vec3(0.0, 0.95, 0.85);
  vec3 colTierMidNear = vec3(0.85, 0.15, 1.0);
  vec3 colTierNear = vec3(1.0, 0.52, 0.08);

  vec3 depthCol = mix(
    mix(mix(colTierNear, colTierMidNear, smoothstep(0.12, 0.32, normZ)), 
        colTierMidFar, smoothstep(0.32, 0.68, normZ)),
    colTierFar, smoothstep(0.68, 0.92, normZ)
  );

  vec3 blendedCol = mix(baseCol, depthCol, 0.55);
  vCol = mix(blendedCol, vec3(1.0, 1.0, 1.0), isExitGate);
}
`;

  const STREAK_FRAG = `
precision mediump float;
varying float vA;
varying vec3 vCol;
void main() {
  gl_FragColor = vec4(vCol * vA, vA);
}
`;

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("portal-warp shader:", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function link(vertSrc, fragSrc) {
    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) {
      return null;
    }
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("portal-warp link:", gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  function ensure() {
    if (ready) {
      return true;
    }
    if (prefersReducedMotion) {
      return false;
    }
    canvas = document.createElement("canvas");
    canvas.id = "portal-warp";
    canvas.className = "portal-warp";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      canvas.remove();
      canvas = null;
      return false;
    }
    
    particleProgram = link(PARTICLE_VERT, PARTICLE_FRAG);
    streakProgram = link(STREAK_VERT, STREAK_FRAG);
    
    if (!particleProgram || !streakProgram) {
      return false;
    }

    // ── Build Particle Buffer ────────────────────────────────────────────────
    const pData = new Float32Array(COUNT_PARTICLES * 4);
    for (let i = 0; i < COUNT_PARTICLES; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.62);
      const z0 = Math.random();
      const rand = Math.random();
      
      const o = i * 4;
      pData[o] = theta;
      pData[o + 1] = radius;
      pData[o + 2] = z0;
      pData[o + 3] = rand;
    }
    particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pData, gl.STATIC_DRAW);

    // ── Build Streak Buffer (Relativistic lines: interleaved format) ──────────
    const sData = new Float32Array(COUNT_STREAKS * 2 * 5);
    for (let i = 0; i < COUNT_STREAKS; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.55);
      const z0 = Math.random();
      const rand = Math.random();
      
      for (let v = 0; v < 2; v += 1) {
        const o = (i * 2 + v) * 5;
        sData[o] = theta;
        sData[o + 1] = radius;
        sData[o + 2] = z0;
        sData[o + 3] = rand;
        sData[o + 4] = v; // aTail: 0 = head, 1 = tail
      }
    }
    streakBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sData, gl.STATIC_DRAW);

    particleUniforms = {
      uT: gl.getUniformLocation(particleProgram, "uT"),
      uSpeed: gl.getUniformLocation(particleProgram, "uSpeed"),
      uRes: gl.getUniformLocation(particleProgram, "uRes"),
      uExit: gl.getUniformLocation(particleProgram, "uExit"),
      uShockwave: gl.getUniformLocation(particleProgram, "uShockwave"),
    };

    streakUniforms = {
      uT: gl.getUniformLocation(streakProgram, "uT"),
      uSpeed: gl.getUniformLocation(streakProgram, "uSpeed"),
      uRes: gl.getUniformLocation(streakProgram, "uRes"),
      uExit: gl.getUniformLocation(streakProgram, "uExit"),
      uShockwave: gl.getUniformLocation(streakProgram, "uShockwave"),
    };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // Additive blending for neon star glow
    gl.clearColor(0, 0, 0, 1);
    ready = true;
    return true;
  }

  function resize() {
    const w = Math.max(1, Math.round(window.innerWidth * DPR));
    const h = Math.max(1, Math.round(window.innerHeight * DPR));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function frame(now) {
    rafId = 0;
    if (!ready) {
      return;
    }
    // Acceleration mapping
    speed += (targetSpeed - speed) * 0.032;
    exitValue += (targetExit - exitValue) * (0.038 + exitValue * 0.037);

    // Decay the shockwave pulse
    shockwaveVal += (0.0 - shockwaveVal) * 0.045;
    if (shockwaveVal < 0.001) {
      shockwaveVal = 0.0;
    }

    const settledOff = !visible && Math.abs(speed) < 0.03 && shockwaveVal < 0.01;
    if (settledOff) {
      canvas.style.display = "none";
      return;
    }
    resize();
    gl.clear(gl.COLOR_BUFFER_BIT);

    const time = (now - t0) * 0.001;

    // ── 1. Draw Volumetric Star Dust (160k Particles) ────────────────────────
    gl.useProgram(particleProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    const aDataPart = gl.getAttribLocation(particleProgram, "aData");
    gl.enableVertexAttribArray(aDataPart);
    gl.vertexAttribPointer(aDataPart, 4, gl.FLOAT, false, 0, 0);

    gl.uniform1f(particleUniforms.uT, time);
    gl.uniform1f(particleUniforms.uSpeed, speed);
    gl.uniform2f(particleUniforms.uRes, canvas.width, canvas.height);
    gl.uniform1f(particleUniforms.uExit, exitValue);
    gl.uniform1f(particleUniforms.uShockwave, shockwaveVal);
    gl.drawArrays(gl.POINTS, 0, COUNT_PARTICLES);

    // ── 2. Draw Relativistic Speed Streaks (35k Lines) ────────────────────────
    gl.useProgram(streakProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer);
    const aDataStreak = gl.getAttribLocation(streakProgram, "aData");
    const aTailStreak = gl.getAttribLocation(streakProgram, "aTail");
    gl.enableVertexAttribArray(aDataStreak);
    gl.vertexAttribPointer(aDataStreak, 4, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(aTailStreak);
    gl.vertexAttribPointer(aTailStreak, 1, gl.FLOAT, false, 20, 16);

    gl.uniform1f(streakUniforms.uT, time);
    gl.uniform1f(streakUniforms.uSpeed, speed);
    gl.uniform2f(streakUniforms.uRes, canvas.width, canvas.height);
    gl.uniform1f(streakUniforms.uExit, exitValue);
    gl.uniform1f(streakUniforms.uShockwave, shockwaveVal);
    gl.drawArrays(gl.LINES, 0, COUNT_STREAKS * 2);

    rafId = requestAnimationFrame(frame);
  }

  function wake() {
    if (!rafId && ready) {
      rafId = requestAnimationFrame(frame);
    }
  }

  return {
    engage() {
      if (!ensure()) {
        return false;
      }
      t0 = t0 || performance.now();
      canvas.style.display = "block";
      visible = true;
      targetSpeed = 3.4;
      targetExit = 0.0;
      exitValue = 0.0;
      requestAnimationFrame(() => canvas.classList.add("portal-warp--on"));
      wake();
      return true;
    },
    finalApproach() {
      if (!ensure()) {
        return;
      }
      targetSpeed = 4.1;
      targetExit = 1.0;
      wake();
    },
    engageReverse() {
      if (!ensure()) {
        return false;
      }
      t0 = t0 || performance.now();
      canvas.style.display = "block";
      visible = true;
      speed = -0.4;
      targetSpeed = -2.4;
      targetExit = 0.0;
      exitValue = 0.0;
      requestAnimationFrame(() => canvas.classList.add("portal-warp--on"));
      wake();
      return true;
    },
    release() {
      if (!ready) {
        return;
      }
      visible = false;
      targetSpeed = 0;
      targetExit = 0.0;
      exitValue = 0.0;
      canvas.classList.remove("portal-warp--on");
      wake();
    },
    freeze() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
    triggerShockwave(val = 1.0) {
      if (!ensure()) {
        return;
      }
      shockwaveVal = val;
      wake();
    },
  };
}
