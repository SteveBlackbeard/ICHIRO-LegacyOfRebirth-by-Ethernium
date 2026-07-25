import * as THREE from "./assets/vendor/three.module.js";

const canvas = document.querySelector("#three-core");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const lowPower = (navigator.hardwareConcurrency || 4) <= 4;
const particleCount = reduceMotion ? 1600 : isMobile || lowPower ? 2800 : 5200;
const dprCap = isMobile || lowPower ? 1.35 : 1.8;

let renderer;
let scene;
let camera;
let points;
let geometry;
let material;
let positions;
let velocities;
let targets;
let colors;
let sizes;
let morph = 0;
let targetMorph = 0;
let pulse = 0;
let memoryMode = 0;
let lastTime = performance.now();

const tmp = new THREE.Vector3();
const clock = new THREE.Clock();

init();
animate();

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.2, 8.5);

  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  buildParticles();
  window.addEventListener("resize", resize);
  window.addEventListener("ichiro:auth", () => {
    targetMorph = 1;
    pulse = Math.max(pulse, 1.2);
    canvas.style.opacity = "1";
  });
  window.addEventListener("ichiro:pulse", (event) => {
    pulse = Math.max(pulse, event.detail?.intensity || 1);
    memoryMode = event.detail?.mode === "memory" ? 1 : memoryMode;
  });

  document.body.classList.add("three-ready");
}

function buildParticles() {
  geometry = new THREE.BufferGeometry();
  positions = new Float32Array(particleCount * 3);
  velocities = new Float32Array(particleCount * 3);
  targets = new Float32Array(particleCount * 3);
  colors = new Float32Array(particleCount * 3);
  sizes = new Float32Array(particleCount);

  for (let index = 0; index < particleCount; index += 1) {
    const i3 = index * 3;
    const target = sampleHumanoid(index / particleCount);
    const cloud = sampleCloud();

    positions[i3] = cloud.x;
    positions[i3 + 1] = cloud.y;
    positions[i3 + 2] = cloud.z;
    targets[i3] = target.x;
    targets[i3 + 1] = target.y;
    targets[i3 + 2] = target.z;

    velocities[i3] = (Math.random() - 0.5) * 0.02;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;

    const amber = Math.random() > 0.74;
    colors[i3] = amber ? 1.0 : 0.72 + Math.random() * 0.22;
    colors[i3 + 1] = amber ? 0.46 + Math.random() * 0.22 : 0.88 + Math.random() * 0.1;
    colors[i3 + 2] = amber ? 0.12 : 0.92 + Math.random() * 0.08;
    sizes[index] = 7 + Math.random() * (isMobile ? 8 : 12);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, dprCap) },
      uPulse: { value: 0 },
      uOpacity: { value: 0.82 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      varying vec3 vColor;
      varying float vDepth;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uPulse;

      void main() {
        vColor = aColor;
        vec3 p = position;
        p.x += sin(uTime * 0.9 + position.y * 2.4) * 0.012;
        p.y += sin(uTime * 1.7 + position.x * 1.7) * 0.012;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        vDepth = clamp(1.0 - abs(mvPosition.z) / 10.0, 0.18, 1.0);
        gl_PointSize = (aSize + uPulse * 12.0) * uPixelRatio * (4.4 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vDepth;
      uniform float uOpacity;
      uniform float uPulse;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        float core = smoothstep(0.5, 0.02, dist);
        float halo = smoothstep(0.5, 0.18, dist) * 0.34;
        float alpha = (core + halo + uPulse * 0.08) * uOpacity * vDepth;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(vColor * (1.0 + uPulse * 0.32), alpha);
      }
    `,
  });

  points = new THREE.Points(geometry, material);
  points.rotation.y = -0.22;
  scene.add(points);
}

function sampleHumanoid(seed) {
  const r = Math.random();
  if (r < 0.16) {
    return sampleEllipse(0, 1.28, 0, 0.33, 0.42, 0.2);
  }
  if (r < 0.46) {
    return sampleEllipse(0, 0.36, 0, 0.48, 1.0, 0.28);
  }
  if (r < 0.58) {
    return sampleSegment(-0.38, 0.72, 0, -1.05, -0.1, 0.05, 0.12);
  }
  if (r < 0.7) {
    return sampleSegment(0.38, 0.72, 0, 1.05, -0.1, 0.05, 0.12);
  }
  if (r < 0.84) {
    return sampleSegment(-0.22, -0.45, 0, -0.58, -1.82, 0.05, 0.14);
  }
  if (r < 0.98) {
    return sampleSegment(0.22, -0.45, 0, 0.58, -1.82, 0.05, 0.14);
  }

  const angle = seed * Math.PI * 2 * 9;
  return new THREE.Vector3(Math.cos(angle) * 1.6, Math.sin(seed * Math.PI * 2) * 2.0, Math.sin(angle) * 0.55);
}

function sampleEllipse(cx, cy, cz, rx, ry, rz) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random());
  return new THREE.Vector3(
    cx + Math.cos(angle) * rx * radius,
    cy + Math.sin(angle) * ry * radius,
    cz + (Math.random() - 0.5) * rz
  );
}

function sampleSegment(x1, y1, z1, x2, y2, z2, width) {
  const t = Math.random();
  return new THREE.Vector3(
    x1 + (x2 - x1) * t + (Math.random() - 0.5) * width,
    y1 + (y2 - y1) * t + (Math.random() - 0.5) * width,
    z1 + (z2 - z1) * t + (Math.random() - 0.5) * width
  );
}

function sampleCloud() {
  const radius = 4.2 + Math.random() * 2.8;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta) * 0.72,
    radius * Math.cos(phi) * 0.55
  );
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  const time = clock.getElapsedTime();
  morph += (targetMorph - morph) * (reduceMotion ? 0.018 : 0.035);
  pulse = Math.max(0, pulse - delta * 0.72);
  memoryMode = Math.max(0, memoryMode - delta * 0.16);

  updatePhysics(delta, time);

  points.rotation.y += delta * (0.12 + memoryMode * 0.18);
  points.rotation.x = Math.sin(time * 0.35) * 0.035;
  camera.position.x = Math.sin(time * 0.22) * 0.24;
  camera.position.y = 0.18 + Math.sin(time * 0.31) * 0.08;
  camera.lookAt(0, -0.06, 0);

  material.uniforms.uTime.value = time;
  material.uniforms.uPulse.value = pulse;
  material.uniforms.uOpacity.value = 0.58 + morph * 0.32;
  renderer.render(scene, camera);
}

function updatePhysics(delta, time) {
  const stiffness = reduceMotion ? 0.7 : 1.25;
  const damping = reduceMotion ? 0.88 : 0.84;
  const swirl = 0.24 + pulse * 0.34 + memoryMode * 0.26;

  for (let index = 0; index < particleCount; index += 1) {
    const i3 = index * 3;
    tmp.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);

    const tx = targets[i3];
    const ty = targets[i3 + 1] + Math.sin(time * 1.5 + tx * 2.0) * 0.018;
    const tz = targets[i3 + 2];

    const cloudOrbit = Math.sin(time * 0.32 + index * 0.013) * (1 - morph) * 0.18;
    const pullX = (tx - tmp.x) * stiffness * morph + cloudOrbit;
    const pullY = (ty - tmp.y) * stiffness * morph;
    const pullZ = (tz - tmp.z) * stiffness * morph;

    velocities[i3] = (velocities[i3] + pullX * delta + -tmp.z * swirl * delta * 0.08) * damping;
    velocities[i3 + 1] = (velocities[i3 + 1] + pullY * delta + Math.sin(time + index) * 0.003) * damping;
    velocities[i3 + 2] = (velocities[i3 + 2] + pullZ * delta + tmp.x * swirl * delta * 0.08) * damping;

    if (pulse > 0.01) {
      const burst = pulse * delta * 0.55;
      velocities[i3] += tmp.x * burst;
      velocities[i3 + 1] += tmp.y * burst * 0.8;
      velocities[i3 + 2] += tmp.z * burst;
    }

    positions[i3] += velocities[i3];
    positions[i3 + 1] += velocities[i3 + 1];
    positions[i3 + 2] += velocities[i3 + 2];
  }

  geometry.attributes.position.needsUpdate = true;
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, dprCap);
}
