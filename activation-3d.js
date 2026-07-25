import * as THREE from "./assets/vendor/three.module.js";

const canvas = document.querySelector("#activation-3d");

const state = {
  progress: 0,
  target: 0,
  ready: false,
  backsideVisible: false,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp(value), 3);
}

function roundedOctagonPath(ctx, width, height, cornerRadius = 72) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.452;
  const points = [];
  for (let index = 0; index < 8; index += 1) {
    const angle = Math.PI / 8 + index * (Math.PI * 2 / 8);
    points.push({
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    });
  }

  ctx.beginPath();
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const toPrevious = Math.hypot(current.x - previous.x, current.y - previous.y);
    const toNext = Math.hypot(current.x - next.x, current.y - next.y);
    const previousRatio = Math.min(cornerRadius / toPrevious, 0.36);
    const nextRatio = Math.min(cornerRadius / toNext, 0.36);
    const start = {
      x: current.x + (previous.x - current.x) * previousRatio,
      y: current.y + (previous.y - current.y) * previousRatio,
    };
    const end = {
      x: current.x + (next.x - current.x) * nextRatio,
      y: current.y + (next.y - current.y) * nextRatio,
    };
    if (index === 0) {
      ctx.moveTo(start.x, start.y);
    } else {
      ctx.lineTo(start.x, start.y);
    }
    ctx.quadraticCurveTo(current.x, current.y, end.x, end.y);
  }
  ctx.closePath();
}

function applyRoundedOctagonMask(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  roundedOctagonPath(ctx, ctx.canvas.width, ctx.canvas.height, 72);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
}

function drawMaskedLogoFill(ctx, logoImage, paint) {
  ctx.save();
  paint();
  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(logoImage, 0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  applyRoundedOctagonMask(ctx);
}

function makeFrontTexture(logoImage) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 1024;
  const ctx = textureCanvas.getContext("2d");
  ctx.drawImage(logoImage, 0, 0, textureCanvas.width, textureCanvas.height);
  applyRoundedOctagonMask(ctx);

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeSolidTexture(logoImage) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 1024;
  const ctx = textureCanvas.getContext("2d");

  ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  drawMaskedLogoFill(ctx, logoImage, () => {
    const gradient = ctx.createLinearGradient(120, 0, 904, 1024);
    gradient.addColorStop(0, "#180000");
    gradient.addColorStop(0.3, "#8d0608");
    gradient.addColorStop(0.52, "#310001");
    gradient.addColorStop(1, "#0a0000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255, 96, 76, 0.18)";
    ctx.fillRect(120, 110, 740, 80);
  });

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makeHologramTexture(logoImage) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 1024;
  const ctx = textureCanvas.getContext("2d");

  ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
  drawMaskedLogoFill(ctx, logoImage, () => {
    const gradient = ctx.createLinearGradient(80, 120, 944, 904);
    gradient.addColorStop(0, "rgba(95, 238, 255, 0.12)");
    gradient.addColorStop(0.32, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(0.5, "rgba(218, 173, 84, 0.16)");
    gradient.addColorStop(0.72, "rgba(114, 246, 232, 0.28)");
    gradient.addColorStop(1, "rgba(110, 150, 255, 0.12)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    ctx.globalCompositeOperation = "screen";
    for (let y = 0; y < textureCanvas.height; y += 8) {
      ctx.fillStyle = y % 24 === 0 ? "rgba(255,255,255,0.28)" : "rgba(98,228,220,0.13)";
      ctx.fillRect(0, y, textureCanvas.width, 1);
    }

    for (let index = 0; index < 90; index += 1) {
      const x = Math.random() * textureCanvas.width;
      const y = Math.random() * textureCanvas.height;
      const w = 10 + Math.random() * 72;
      ctx.fillStyle = `rgba(255,255,255,${0.018 + Math.random() * 0.05})`;
      ctx.fillRect(x, y, w, 1);
    }
  });

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  lines.forEach((entry, index) => ctx.fillText(entry, x, y + index * lineHeight));
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawFittedEngravedText(ctx, text, x, y, maxWidth) {
  const value = text.trim().replace(/\s+/g, " ").toUpperCase();
  let display = value || "________";
  let fontSize = value ? 30 : 28;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  while (fontSize > 18) {
    ctx.font = `800 ${fontSize}px 'Cascadia Mono', Consolas, monospace`;
    if (ctx.measureText(display).width <= maxWidth) {
      break;
    }
    fontSize -= 1;
  }

  if (ctx.measureText(display).width > maxWidth) {
    while (display.length > 1 && ctx.measureText(`${display}...`).width > maxWidth) {
      display = display.slice(0, -1);
    }
    display = `${display}...`;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - 22, maxWidth, 44);
  ctx.clip();
  ctx.fillText(display, x, y);
  ctx.restore();
  ctx.textAlign = "center";
}

function makeThanksTexture(logoImage) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 1024;
  textureCanvas.height = 1024;
  const ctx = textureCanvas.getContext("2d");
  let chosenText = "";
  let submitHover = false;

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  function draw() {
    ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);
    drawMaskedLogoFill(ctx, logoImage, () => {
      const gradient = ctx.createRadialGradient(512, 452, 40, 512, 512, 560);
      gradient.addColorStop(0, "#1d170d");
      gradient.addColorStop(0.42, "#050505");
      gradient.addColorStop(1, "#000000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let index = 0; index < 28; index += 1) {
        const y = 120 + index * 26;
        ctx.strokeStyle = `rgba(218, 173, 84, ${0.025 + (index % 5) * 0.004})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(160, y);
        ctx.lineTo(864, y + Math.sin(index) * 5);
        ctx.stroke();
      }
      ctx.restore();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 25px 'Cascadia Mono', Consolas, monospace";
      ctx.fillStyle = "rgba(218, 173, 84, 0.88)";
      ctx.shadowColor = "rgba(218, 173, 84, 0.34)";
      ctx.shadowBlur = 18;
      wrapCanvasText(ctx, "FOR YOU. FOR EVERY WARRIOR BUILDING A MORE BALANCED, JUST AND PROSPEROUS WORLD.", 512, 318, 620, 38);

      ctx.font = "800 118px 'Cascadia Mono', Consolas, monospace";
      ctx.shadowColor = "rgba(218, 173, 84, 0.88)";
      ctx.shadowBlur = 36;
      ctx.fillStyle = "#ddb45f";
      ctx.fillText("THANKS", 512, 500);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 225, 158, 0.42)";
      ctx.lineWidth = 2;
      ctx.strokeText("THANKS", 512, 500);

      roundRect(ctx, 318, 622, 388, 84, 18);
      ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
      ctx.fill();
      ctx.strokeStyle = "rgba(218, 173, 84, 0.64)";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = submitHover ? "rgba(255, 226, 165, 0.62)" : "rgba(218, 173, 84, 0.34)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(640, 628);
      ctx.lineTo(640, 700);
      ctx.stroke();
      roundRect(ctx, 650, 642, 42, 42, 10);
      ctx.fillStyle = submitHover ? "rgba(218, 173, 84, 0.28)" : "rgba(218, 173, 84, 0.1)";
      ctx.fill();
      ctx.shadowColor = submitHover ? "rgba(218, 173, 84, 0.82)" : "transparent";
      ctx.shadowBlur = submitHover ? 22 : 0;
      ctx.strokeStyle = submitHover ? "rgba(255, 226, 165, 0.92)" : "rgba(255, 226, 165, 0.52)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(664, 663);
      ctx.lineTo(678, 663);
      ctx.moveTo(673, 657);
      ctx.lineTo(680, 663);
      ctx.lineTo(673, 669);
      ctx.strokeStyle = submitHover ? "rgba(255, 238, 192, 1)" : "rgba(255, 226, 165, 0.86)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();

      ctx.font = "700 20px 'Cascadia Mono', Consolas, monospace";
      ctx.fillStyle = "rgba(218, 173, 84, 0.86)";
      ctx.shadowColor = "rgba(218, 173, 84, 0.28)";
      ctx.shadowBlur = 12;
      ctx.fillText("INTRODUCE YOUR X", 512, 642);

      ctx.font = "800 30px 'Cascadia Mono', Consolas, monospace";
      ctx.fillStyle = chosenText ? "rgba(255, 226, 165, 0.96)" : "rgba(255, 226, 165, 0.18)";
      drawFittedEngravedText(ctx, chosenText, 350, 678, 272);

      ctx.font = "italic 18px 'Cascadia Mono', Consolas, monospace";
      ctx.fillStyle = "rgba(218, 173, 84, 0.82)";
      ctx.shadowBlur = 9;
      ctx.fillText("\"TO KEEP IN MIND.\"", 512, 754);

      ctx.font = "800 24px 'Cascadia Mono', Consolas, monospace";
      ctx.fillStyle = "rgba(255, 226, 165, 0.92)";
      ctx.fillText("ENJOY IT", 512, 790);
    });
    texture.needsUpdate = true;
  }

  draw();
  return {
    texture,
    setChosenText(value) {
      chosenText = value.trim().replace(/\s+/g, " ").slice(0, 32).toUpperCase();
      draw();
    },
    setSubmitHover(value) {
      submitHover = Boolean(value);
      draw();
    },
  };
}

function initActivationLogo() {
  if (!canvas) {
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.sortObjects = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.05, 7.2);

  const group = new THREE.Group();
  group.rotation.x = -0.08;
  scene.add(group);

  const logoGeometry = new THREE.PlaneGeometry(4.05, 4.05);
  const logoImage = new Image();
  const sideLayers = [];
  const hologramLayers = [];

  logoImage.onload = () => {
    const frontTexture = makeFrontTexture(logoImage);

    const solidTexture = makeSolidTexture(logoImage);
    const hologramTexture = makeHologramTexture(logoImage);
    const backTexture = makeThanksTexture(logoImage);

    for (let index = 0; index < 5; index += 1) {
      const depth = index / 4;
      const side = new THREE.Mesh(
        logoGeometry,
        new THREE.MeshStandardMaterial({
          map: solidTexture,
          color: 0xffffff,
          roughness: 0.3,
          metalness: 0.76,
          emissive: 0x0a5c63,
          emissiveIntensity: 0.28,
          transparent: true,
          opacity: 0.36,
          alphaTest: 0.03,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      side.position.z = -0.08 + depth * 0.16;
      side.scale.setScalar(1.02 - depth * 0.006);
      side.renderOrder = 1;
      sideLayers.push(side);
      group.add(side);
    }

    const front = new THREE.Mesh(
      logoGeometry,
      new THREE.MeshBasicMaterial({
        map: frontTexture,
        transparent: true,
        opacity: 0.74,
        alphaTest: 0.03,
        side: THREE.FrontSide,
      }),
    );
    front.position.z = 0.105;
    front.renderOrder = 4;
    group.add(front);

    const frontHologram = new THREE.Mesh(
      logoGeometry,
      new THREE.MeshBasicMaterial({
        map: hologramTexture,
        transparent: true,
        opacity: 0.42,
        alphaTest: 0.03,
        side: THREE.FrontSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    frontHologram.position.z = 0.13;
    frontHologram.renderOrder = 6;
    hologramLayers.push(frontHologram);
    group.add(frontHologram);

    const back = new THREE.Mesh(
      logoGeometry,
      new THREE.MeshStandardMaterial({
        map: backTexture.texture,
        color: 0xffffff,
        roughness: 0.16,
        metalness: 0.58,
        transparent: true,
        opacity: 0.92,
        alphaTest: 0.03,
        side: THREE.FrontSide,
      }),
    );
    back.position.z = -0.105;
    back.rotation.y = Math.PI;
    back.renderOrder = 5;
    group.add(back);

    const backHologram = new THREE.Mesh(
      logoGeometry,
      new THREE.MeshBasicMaterial({
        map: hologramTexture,
        transparent: true,
        opacity: 0.52,
        alphaTest: 0.03,
        side: THREE.FrontSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    backHologram.position.z = -0.13;
    backHologram.rotation.y = Math.PI;
    backHologram.renderOrder = 7;
    hologramLayers.push(backHologram);
    group.add(backHologram);

    window.kprActivationLogoBack = backTexture;
    state.ready = true;
    document.body.classList.add("activation-3d-ready");
  };
  logoImage.src = "assets/brand/hack-activation-logo.png";

  const redCore = new THREE.PointLight(0x62e4dc, 18, 7);
  redCore.position.set(0, 0, 2.2);
  scene.add(redCore);

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
  keyLight.position.set(1.4, 2.2, 4);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x8ffcff, 1.7);
  rimLight.position.set(-2.5, 0.8, 2);
  scene.add(rimLight);

  // ── Web Audio Sonar Ping Sound ─────────────────────────────────────────────────
  let sonarPingPlayed = false;
  let sonarAudioCtx = null;

  function playSonarPingSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!sonarAudioCtx) sonarAudioCtx = new AudioCtx();
      if (sonarAudioCtx.state === "suspended") sonarAudioCtx.resume().catch(() => {});

      const now = sonarAudioCtx.currentTime;
      const osc = sonarAudioCtx.createOscillator();
      const gain = sonarAudioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1750, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.38);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

      osc.connect(gain);
      gain.connect(sonarAudioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.60);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function updateBacksideState(value) {
    const visible = value > 0.82;
    if (visible === state.backsideVisible) {
      return;
    }
    state.backsideVisible = visible;
    document.body.classList.toggle("activation-backside", visible);
  }

  function render(time) {
    if (!document.body.classList.contains("prelaunch")) {
      renderer.clear();
      return;
    }
    state.progress += (state.target - state.progress) * 0.11;
    const eased = easeOutCubic(state.progress);

    // ── Mouse Wheel Rotation: 180° Flip on Wheel Scroll ──
    group.rotation.y = eased * Math.PI;

    // ── 3D Z-Retreat, Snap Launch & Deceleration Physics ──
    // When scrolling or turning (eased > 0.02), smoothly dampen Z-retreat so the logo aligns cleanly for flip
    const retreatDampen = 1 - Math.min(1, eased * 1.6);
    const cycleDuration = 3600; // 3.6 second loop
    const phase = (time % cycleDuration) / cycleDuration;
    let zDepth = 0;
    let zScaleScalar = 1.0;

    if (phase < 0.78) {
      const p = phase / 0.78;
      zDepth = -2.2 * Math.sin(p * Math.PI * 0.5) * retreatDampen;
      zScaleScalar = 1.0 - 0.54 * Math.sin(p * Math.PI * 0.5) * retreatDampen;
    } else if (phase < 0.90) {
      const p = (phase - 0.78) / 0.12;
      const easeSnap = p * p * p;
      zDepth = -2.2 * (1 - easeSnap) * retreatDampen;
      zScaleScalar = (0.46 + 0.54 * easeSnap) * retreatDampen + (1 - retreatDampen);
    } else {
      const p = (phase - 0.90) / 0.10;
      zDepth = 0.25 * Math.sin(p * Math.PI) * (1 - p) * retreatDampen;
      zScaleScalar = 1.0 + 0.08 * Math.sin(p * Math.PI) * (1 - p) * retreatDampen;
    }

    group.position.z = zDepth;
    group.scale.setScalar(zScaleScalar * (1 + Math.sin(time * 0.0009) * 0.008));

    // ── Progressive Red Glow as Logo Shrinks & Sonar Ping at Max Depth ──
    let redRatio = 0;
    if (phase < 0.78) {
      redRatio = Math.sin((phase / 0.78) * Math.PI * 0.5) * retreatDampen;
      if (phase >= 0.72 && !sonarPingPlayed && retreatDampen > 0.4) {
        sonarPingPlayed = true;
        playSonarPingSound();
      }
    } else if (phase < 0.90) {
      const p = (phase - 0.78) / 0.12;
      redRatio = (1.0 - p) * retreatDampen; // Rapidly flash back to bright gold/cyan as it grows large
      sonarPingPlayed = false;
    } else {
      redRatio = 0;
      sonarPingPlayed = false;
    }

    // Apply color interpolation: 0x62e4dc (Cyan/Gold) -> 0xff2a4b (Neon Red Sonar)
    const curColor = new THREE.Color().lerpColors(
      new THREE.Color(0x62e4dc),
      new THREE.Color(0xff2a4b),
      redRatio * 0.92
    );
    redCore.color.copy(curColor);
    redCore.intensity = 18 + redRatio * 32;

    for (const layer of sideLayers) {
      layer.material.emissive.copy(curColor);
      layer.material.emissiveIntensity = 0.24 + redRatio * 0.55 + Math.sin(time * 0.004) * 0.04;
      layer.material.opacity = 0.32 + redRatio * 0.28 + Math.sin(time * 0.003 + layer.position.z * 12) * 0.05;
    }
    for (const [index, layer] of hologramLayers.entries()) {
      layer.material.opacity = (index === 0 ? 0.36 : 0.48) + Math.sin(time * 0.005 + index) * 0.08;
      layer.position.x = Math.sin(time * 0.0027 + index) * 0.006;
      layer.position.y = Math.cos(time * 0.0022 + index) * 0.004;
    }
    updateBacksideState(state.progress);
    renderer.render(scene, camera);
    window.requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize);
  window.requestAnimationFrame(render);

  window.kprActivationLogo = {
    setProgress(value) {
      state.target = clamp(value);
    },
    setChosenText(value) {
      window.kprActivationLogoBack?.setChosenText(value);
    },
    setSubmitHover(value) {
      window.kprActivationLogoBack?.setSubmitHover(value);
    },
    getProgress() {
      return state.target;
    },
    reset() {
      state.target = 0;
      document.body.classList.remove("activation-backside");
    },
  };
  window.__kprActivationLogoProgress = 0;
  state.target = 0;
  state.progress = 0;

  document.addEventListener("kpr-activation-logo-progress", (event) => {
    state.target = clamp(event.detail || 0);
  });
}

initActivationLogo();
