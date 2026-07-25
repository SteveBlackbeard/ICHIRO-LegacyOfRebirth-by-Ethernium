import * as THREE from "./assets/vendor/three.module.js";
import { GLTFLoader } from "./assets/vendor/GLTFLoader.js";

const canvas = document.querySelector("#archive-3d");
const archiveScreen = document.querySelector("#archive-screen");

// === Estado aprobado de la espada ===
const FINAL_SWORD_STATE = {
  gpx: 0.7, gpy: 0.85, gpz: 7.15,
  grx: 67, gry: -136, grz: 0,
  crx: 0, cry: 45, crz: -90,
};
const swordState = { ...FINAL_SWORD_STATE };
const params = new URLSearchParams(window.location.search);
const PERF_ADAPTIVE = params.get("perf") !== "baseline";
const yatagarasuParam = params.get("yatagarasu");
const yatagarasuVariant = yatagarasuParam === "baseline"
  ? "baseline"
  : yatagarasuParam === "budget"
    ? "budget"
    : "quant";
const LOAD_YATAGARASU_BLUEPRINT = true;
const YATAGARASU_BLUEPRINT_URL = yatagarasuVariant === "quant"
  ? "./assets/models/yatagarasu-blueprint-quant.glb"
  : yatagarasuVariant === "budget"
    ? "./assets/models/yatagarasu-blueprint-budget.glb"
    : "./assets/models/YATAGARASU BASE LOW.glb";
const swordVariant = params.get("sword");
const SWORD_MODEL_URL = swordVariant === "original"
  ? "./assets/models/blade.glb"
  : swordVariant === "clean"
    ? "./assets/models/blade-low-clean-no-decal-quant.glb"
    : "./assets/models/blade-low-source.glb";
const SWORD_MODEL_SCALE = 0.4;
const SWORD_MODEL_MIRROR_X = true;
const SWORD_DRAG_ROTATION_SPEED = 0.0125;

if (canvas && archiveScreen) {
  initArchive3D();
}

function initArchive3D() {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  let lastRenderTime = 0;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    console.warn("WebGL context lost. Restoring scene...");
  }, false);

  canvas.addEventListener("webglcontextrestored", () => {
    console.info("WebGL context restored. Re-initialising renderer dimensions...");
    renderer.setSize(state.width, state.height);
  }, false);

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
  renderer.autoClear = false;
  if ("outputColorSpace" in renderer && THREE.SRGBColorSpace) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  if ("toneMapping" in renderer && THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
  }
  const maxTextureAnisotropy = renderer.capabilities?.getMaxAnisotropy?.() || 1;

  const scene = new THREE.Scene();
  const swordScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
  camera.position.set(0, 3.5, 12);
  camera.lookAt(0, -0.5, 0);

  const state = {
    raw: 0,
    fold: 0,
    video: 0,
    lore: 0,
    map: 0,
    visible: false,
    running: false,
    width: 0,
    height: 0,
    caseOpenProgress: 0,
    mouseX: 0,
    mouseY: 0,
    mouseRotX: 0,
    mouseRotY: 0,
    mousePosX: 0,
    mousePosY: 0,
    swordDragActive: false,
    swordDragStartY: 0,
    swordDragStartRotZ: 0,
    swordDragRotZ: 0,
    lastRaw: 0,
    lastPointerMoveAt: 0,
    camBaseZ: 12,
    camDolly: 0,
    camRise: 0,
    camLookY: 0,
  };

  const glbMaterials = [];
  let currentBlueprintOpacity = 0;
  let lumenMovingGroup = new THREE.Group();
  let lumenOriginalLoaded = false;
  let texturedLumen = null;
  const movingLumenMaterials = [];
  let lumenWarmLight = null;

  // Rejilla de proyección de radar y estado de hover
  let radarGrid = null;
  let wasLumenHovered = false;
  let lumenAppearance = 0;

  // Generar textura para la rejilla circular de proyección (Radar)
  function createRadarGridTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 1024, 1024);
    
    const cx = 512;
    const cy = 512;
    
    // Sombra luminosa (bloom/glow vector)
    ctx.shadowBlur = 24;
    
    // 1. Anillo Exterior 1 (Glow Naranja Fuerte)
    ctx.shadowColor = "rgba(255, 110, 0, 0.9)";
    ctx.strokeStyle = "rgba(255, 130, 20, 0.95)"; 
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.arc(cx, cy, 470, 0, Math.PI * 2);
    ctx.stroke();
    
    // 2. Anillo Exterior 2 (Glow Cian para contraste tecnológico)
    ctx.shadowColor = "rgba(0, 240, 255, 0.85)";
    ctx.strokeStyle = "rgba(0, 250, 255, 0.8)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(cx, cy, 452, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Marcas de dial cian
    ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
    ctx.lineWidth = 1.5;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 45) {
      const isMajor = (a % (Math.PI / 9) < 0.01);
      const x1 = cx + Math.cos(a) * 452;
      const y1 = cy + Math.sin(a) * 452;
      const x2 = cx + Math.cos(a) * (isMajor ? 425 : 440);
      const y2 = cy + Math.sin(a) * (isMajor ? 425 : 440);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // 4. Texto/Runa Telemetría circular (Naranja)
    ctx.shadowColor = "rgba(255, 110, 0, 0.8)";
    ctx.fillStyle = "rgba(255, 130, 10, 0.9)";
    ctx.font = "bold 15px monospace";
    ctx.textAlign = "center";
    const textData = "LUMEN ACTIVATION CORE // DATA RECORD // CLASSIFIED INTEL // STATUS ONLINE // SYSTEM LOAD 100% // FRACTAL GEOMETRY // SOLOMON SIGN // KPCO TERMINAL";
    const words = textData.split(" // ");
    const numWords = words.length;
    for (let i = 0; i < numWords; i++) {
      const angle = (i * 2 * Math.PI / numWords) - Math.PI / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * 410, cy + Math.sin(angle) * 410);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(words[i], 0, 0);
      ctx.restore();
    }

    // 5. Geometría Media Compleja: Estrella de Salomón doble (Dodecagrama)
    ctx.shadowColor = "rgba(255, 110, 0, 0.85)";
    ctx.strokeStyle = "rgba(255, 120, 20, 0.8)";
    ctx.lineWidth = 2.5;
    for (let offset = 0; offset < 2; offset++) {
      const startAngle = (offset * Math.PI / 6);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = startAngle + (i * 2 * Math.PI / 3) - Math.PI / 2;
        const x = cx + Math.cos(a) * 340;
        const y = cy + Math.sin(a) * 340;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = startAngle + (i * 2 * Math.PI / 3) + Math.PI / 2;
        const x = cx + Math.cos(a) * 340;
        const y = cy + Math.sin(a) * 340;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 6. Círculo de línea discontinua (Magenta Glow)
    ctx.shadowColor = "rgba(255, 30, 180, 0.85)";
    ctx.strokeStyle = "rgba(255, 40, 190, 0.8)";
    ctx.lineWidth = 3.0;
    ctx.setLineDash([15, 20]);
    ctx.beginPath();
    ctx.arc(cx, cy, 260, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); 

    // 7. Cuadrados entrelazados fractales (Cian Glow)
    ctx.shadowColor = "rgba(0, 240, 255, 0.9)";
    ctx.strokeStyle = "rgba(0, 250, 255, 0.85)";
    ctx.lineWidth = 2.0;
    for (let offset = 0; offset < 3; offset++) {
      const startAngle = (offset * Math.PI / 6);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = startAngle + (i * Math.PI / 2);
        const x = cx + Math.cos(a) * 190;
        const y = cy + Math.sin(a) * 190;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 8. Nodos en vértices con núcleo caliente
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI / 6) - Math.PI / 2;
      const x = cx + Math.cos(angle) * 340;
      const y = cy + Math.sin(angle) * 340;
      
      ctx.shadowColor = "rgba(255, 110, 0, 0.9)";
      ctx.fillStyle = "rgba(255, 130, 15, 0.95)";
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowColor = "rgba(255, 255, 255, 1.0)";
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = "rgba(255, 110, 0, 0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // 9. Anillo de núcleo cian y centro blanco caliente
    ctx.shadowColor = "rgba(0, 240, 255, 0.9)";
    ctx.strokeStyle = "rgba(0, 250, 255, 0.85)";
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(cx, cy, 100, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = "rgba(255, 110, 0, 0.95)";
    ctx.fillStyle = "rgba(255, 120, 20, 0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "rgba(255, 255, 255, 1.0)";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  function createRadarRingTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 1024, 1024);
    
    const cx = 512;
    const cy = 512;
    
    ctx.shadowBlur = 28;
    ctx.shadowColor = "rgba(0, 240, 255, 0.85)";
    
    // Anillo cian exterior fino
    ctx.strokeStyle = "rgba(0, 250, 255, 0.9)";
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.arc(cx, cy, 460, 0, Math.PI * 2);
    ctx.stroke();

    // Concentric micro-ticks
    ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
    ctx.lineWidth = 1.0;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 180) {
      const isMajor = (a % (Math.PI / 18) < 0.01);
      const len = isMajor ? 15 : 6;
      const x1 = cx + Math.cos(a) * 460;
      const y1 = cy + Math.sin(a) * 460;
      const x2 = cx + Math.cos(a) * (460 - len);
      const y2 = cy + Math.sin(a) * (460 - len);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Binary concentric data ring
    ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    const binaryData = "01001001 01000011 01001000 01001001 01010010 01001111 // 01001011 01010000 01010010 // 01010011 01011001 01010011 // 01001100 01010101 01001100 01000101 01001110";
    const chunks = binaryData.split(" // ");
    const numChunks = chunks.length;
    for (let i = 0; i < numChunks; i++) {
      const angle = (i * 2 * Math.PI / numChunks);
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * 435, cy + Math.sin(angle) * 435);
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillText(chunks[i], 0, 0);
      ctx.restore();
    }

    // Concentric dashed ring (Magenta)
    ctx.shadowColor = "rgba(255, 30, 180, 0.85)";
    ctx.strokeStyle = "rgba(255, 40, 190, 0.8)";
    ctx.lineWidth = 2.0;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(cx, cy, 380, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Telemetry markings (arcs)
    ctx.lineWidth = 4.0;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(cx, cy, 320, 0, Math.PI / 3);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(cx, cy, 320, Math.PI, Math.PI * 1.33);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  function createRadarCoreTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 1024, 1024);
    
    const cx = 512;
    const cy = 512;
    
    ctx.shadowBlur = 32;
    ctx.shadowColor = "rgba(255, 110, 0, 0.95)";
    
    // Core circle
    ctx.fillStyle = "rgba(255, 130, 20, 0.95)";
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    // Hot white center node
    ctx.shadowColor = "rgba(255, 255, 255, 1.0)";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Triple-triangle solar cross
    ctx.shadowColor = "rgba(255, 110, 0, 0.9)";
    ctx.strokeStyle = "rgba(255, 120, 20, 0.95)";
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 3; i++) {
      const baseAngle = (i * Math.PI / 3);
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        const a = baseAngle + (j * 2 * Math.PI / 3) - Math.PI / 2;
        const x = cx + Math.cos(a) * 120;
        const y = cy + Math.sin(a) * 120;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Outer core ring
    ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
    ctx.shadowColor = "rgba(0, 240, 255, 0.85)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(cx, cy, 150, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair lines
    ctx.strokeStyle = "rgba(255, 110, 0, 0.7)";
    ctx.shadowColor = "rgba(255, 110, 0, 0.7)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 40, cy + Math.sin(a) * 40);
      ctx.lineTo(cx + Math.cos(a) * 148, cy + Math.sin(a) * 148);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  // Helper para leer los píxeles de una imagen de textura y permitir muestreo de color
  function getTextureData(image) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      return ctx.getImageData(0, 0, image.width, image.height);
    } catch (e) {
      console.warn("No se pudo extraer los datos de la textura:", e);
      return null;
    }
  }

  function createVolumetricGlowTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    // Top is transparent, bottom is glowing cyan/blue
    grad.addColorStop(0.0, "rgba(0, 240, 255, 0.0)");
    grad.addColorStop(0.5, "rgba(0, 180, 255, 0.12)");
    grad.addColorStop(0.85, "rgba(0, 120, 255, 0.38)");
    grad.addColorStop(1.0, "rgba(0, 240, 255, 0.65)");
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 256);
    
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  // Crear la rejilla del radar 3D plano (más grande y con geometría fractal de invocación)
  // Ahora es un grupo de 4 capas concéntricas girando en direcciones alternas para un efecto de ciencia ficción AAA
  radarGrid = new THREE.Group();

  const gridGeo = new THREE.PlaneGeometry(1.6, 1.6);
  
  const baseMat = new THREE.MeshBasicMaterial({
    map: createRadarGridTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true
  });
  const radarBaseMesh = new THREE.Mesh(gridGeo, baseMat);
  radarBaseMesh.rotation.x = -Math.PI / 2;
  radarGrid.add(radarBaseMesh);

  const ringMat = new THREE.MeshBasicMaterial({
    map: createRadarRingTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true
  });
  const radarRingMesh = new THREE.Mesh(gridGeo, ringMat);
  radarRingMesh.rotation.x = -Math.PI / 2;
  radarRingMesh.position.y = 0.015;
  radarGrid.add(radarRingMesh);

  const coreMat = new THREE.MeshBasicMaterial({
    map: createRadarCoreTexture(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true
  });
  const radarCoreMesh = new THREE.Mesh(gridGeo, coreMat);
  radarCoreMesh.rotation.x = -Math.PI / 2;
  radarCoreMesh.position.y = 0.03;
  radarGrid.add(radarCoreMesh);

  const glowTex = createVolumetricGlowTexture();
  const glowGeo = new THREE.CylinderGeometry(0.72, 0.62, 1.4, 32, 1, true);
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true
  });
  const radarGlowMesh = new THREE.Mesh(glowGeo, glowMat);
  radarGlowMesh.position.y = 0.7; // Aligns bottom at floor level
  radarGrid.add(radarGlowMesh);

  const caseViewer = document.querySelector("#case-viewer");

  const root = new THREE.Group();
  const hologram = createYatagarasuHologram();
  const sword = createEnergyBlade();
  root.add(hologram.group);
  scene.add(root);
  swordScene.add(sword.group);
  swordScene.add(lumenMovingGroup);
  swordScene.add(radarGrid);

  // IluminaciÃ³n neutral para la escena
  const ambient = new THREE.AmbientLight(0xffffff, 0.58);
  swordScene.add(ambient);

  const roomAmbient = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(roomAmbient);

  const roomDirLight = new THREE.DirectionalLight(0xffffff, 0.95);
  roomDirLight.position.set(-2, 5, 4);
  scene.add(roomDirLight);

  const roomPurpleLight = new THREE.DirectionalLight(0xff6fd4, 0.55);
  roomPurpleLight.position.set(-4, 3, -6);
  scene.add(roomPurpleLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.95);
  dirLight.position.set(5, 8, 6);
  swordScene.add(dirLight);

  // Luz puntual naranja para iluminar la espada con su textura real
  const swordLight = new THREE.PointLight(0xff8a24, 2.7, 24);
  swordLight.position.set(1.2, 1.4, 6.2);
  swordScene.add(swordLight);

  const swordRedLight = new THREE.PointLight(0xff2430, 1.55, 16);
  swordRedLight.position.set(0.2, 0.4, 6.9);
  swordScene.add(swordRedLight);

  const swordRimLight = new THREE.DirectionalLight(0xffd0a0, 0.72);
  swordRimLight.position.set(-4, 2.4, 7.5);
  swordScene.add(swordRimLight);

  lumenWarmLight = new THREE.PointLight(0xff7700, 0, 10);
  swordScene.add(lumenWarmLight);

  // Cargador de Modelos GLB
  const loader = new GLTFLoader();
  let yatagarasuLoadStarted = false;
  let yatagarasuLoadDeferredId = null;
  let yatagarasuLoadDeferredIsIdle = false;

  // 1. Cargar la Espada de EnergÃ­a (blade.glb)
  loader.load(
    SWORD_MODEL_URL,
    (gltf) => {
      const glbSword = gltf.scene;

      // Calcular lÃ­mites para el escalado automÃ¡tico proporcional de la espada
      glbSword.scale.set(
        SWORD_MODEL_MIRROR_X ? -SWORD_MODEL_SCALE : SWORD_MODEL_SCALE,
        SWORD_MODEL_SCALE,
        SWORD_MODEL_SCALE
      );

      // Centrar el modelo completo usando su bounding box original escalado
      glbSword.position.set(0, 0, 0);

      // Conservar la textura real del modelo; la opacidad se controla durante la materializacion.
      glbSword.traverse((child) => {
        if (child.isMesh && child.material) {
          child.visible = false;
          child.renderOrder = 80;
          applyToMaterials(child.material, (material) => {
            const materialName = `${material.name || ""}`.toLowerCase();
            const preservesAlpha =
              material.transparent === true
              || material.alphaTest > 0
              || material.opacity < 1
              || materialName.includes("011");
            material.userData.kprPreserveAlpha = preservesAlpha;
            material.transparent = true;
            material.opacity = 0.0;
            material.depthWrite = false;
            material.depthTest = true;
            material.side = THREE.DoubleSide;
            material.metalness = material.metalness ?? 0.28;
            material.roughness = Math.min(material.roughness ?? 0.42, 0.36);
            ["map", "emissiveMap", "normalMap", "roughnessMap", "metalnessMap"].forEach((key) => {
              if (material[key]) {
                material[key].anisotropy = Math.min(maxTextureAnisotropy, 8);
                material[key].needsUpdate = true;
              }
            });
            if (material.map && "colorSpace" in material.map && THREE.SRGBColorSpace) {
              material.map.colorSpace = THREE.SRGBColorSpace;
            }
            const emissive = material.emissive;
            const red = emissive ? emissive.r : 0;
            const green = emissive ? emissive.g : 0;
            const blue = emissive ? emissive.b : 0;
            material.userData.kprBladeGlow =
              materialName.includes("010") || (red > 0.6 && green > 0.24) ? "orange" :
              materialName.includes("007") || red > 0.6 ? "red" :
              materialName.includes("002") || red + green + blue > 1.6 ? "white" : "dark";
            if (material.emissive) {
              if (material.userData.kprBladeGlow === "red") {
                material.emissive.set(0xff1f2a);
              } else if (material.userData.kprBladeGlow === "orange") {
                material.emissive.set(0xff6a18);
              }
            }
            material.userData.kprBaseEmissiveIntensity = material.emissiveIntensity || 0;
          });
        }
      });
      // Ocultar mallas procedimentales y partÃ­culas de la espada
      setProceduralSwordVisible(sword, false);

      // Crear un pivote real en el centro del asset completo: mantiene el GLB ensamblado
      // y evita que el giro interactivo orbite desde un lado.
      const swordBounds = new THREE.Box3().setFromObject(glbSword);
      const swordCenter = swordBounds.getCenter(new THREE.Vector3());
      const glbBasePivot = new THREE.Group();
      const glbCenterPivot = new THREE.Group();
      glbCenterPivot.position.copy(swordCenter);
      glbSword.position.copy(swordCenter).multiplyScalar(-1);
      glbCenterPivot.add(glbSword);
      glbBasePivot.add(glbCenterPivot);

      // Guardar referencias: la pose base vive en glbChild y el giro 360 en dragPivot.
      sword.glbChild = glbBasePivot;
      sword.dragPivot = glbCenterPivot;

      // AÃ±adir la espada GLB con pivote centrado: conserva el montaje original del asset.
      sword.group.add(glbBasePivot);
      requestFrame();
    },
    undefined,
    (err) => {
      console.error("Error loading sword GLB:", err);
    }
  );

  // Helper para convertir coordenadas de pantalla NDC a world space a una Z determinada
  function getWorldPositionFromScreen(ndcX, ndcY, targetZ = 6.8) {
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const t = (targetZ - camera.position.z) / dir.z;
    return camera.position.clone().add(dir.multiplyScalar(t));
  }

  function checkLumenReady() {
    if (lumenOriginalLoaded) {
      requestFrame();
    }
  }

  // 1. Cargar Lumen original texturizado
  loader.load(
    "./assets/models/lumen-original.glb",
    (lumenGltf) => {
      const glbLumen = lumenGltf.scene;
      const lumenBox = new THREE.Box3().setFromObject(glbLumen);
      const lumenCenter = lumenBox.getCenter(new THREE.Vector3());
      const lumenSize = lumenBox.getSize(new THREE.Vector3());
      const lumenMaxDim = Math.max(lumenSize.x, lumenSize.y, lumenSize.z) || 1;
      
      const targetLumenSize = 2.4;
      const scaleFactor = targetLumenSize / lumenMaxDim;
      glbLumen.scale.setScalar(scaleFactor);
      glbLumen.position.copy(lumenCenter).multiplyScalar(-scaleFactor);
      
      // Crear versión con textura original
      texturedLumen = new THREE.Group();
      texturedLumen.add(glbLumen);
      
      const meshesToProcess = [];
      glbLumen.traverse((c) => {
        if (c.isMesh) {
          meshesToProcess.push(c);
        }
      });

      meshesToProcess.forEach((c) => {
        if (c.material) {
          c.material.side = THREE.DoubleSide;
          c.material.transparent = true;
          c.material.opacity = 0.0;
          
          // Guardar valores originales de emisión para el efecto hover glitch
          if (c.material.emissive) {
            c.userData.originalEmissiveHex = c.material.emissive.getHex();
            c.userData.originalEmissiveIntensity = c.material.emissiveIntensity || 0;
          }
          
          movingLumenMaterials.push(c.material);
          if (c.material.map) {
            c.material.map.anisotropy = Math.min(maxTextureAnisotropy, 8);
            c.material.map.needsUpdate = true;
            
            // Preparar el muestreo de textura cuando esté disponible
            const img = c.material.map.image;
            if (img && img.width > 0) {
              try {
                c.userData.imgData = getTextureData(img);
              } catch (err) {
                console.warn("No se pudo obtener la textura inmediatamente:", err);
              }
            }
          }
        }
      });
      
      lumenMovingGroup.add(texturedLumen);
      lumenOriginalLoaded = true;
      checkLumenReady();
    },
    undefined,
    (err) => console.warn("Error loading lumen-original.glb:", err)
  );

  // 2. Blueprint YATAGARASU: asset original aprobado, tratado como wireframe blanco.
  function loadYatagarasuModel() {
    if (!LOAD_YATAGARASU_BLUEPRINT || yatagarasuLoadStarted) {
      return;
    }
    yatagarasuLoadDeferredId = null;
    yatagarasuLoadStarted = true;
    loader.load(
      YATAGARASU_BLUEPRINT_URL,
      (gltf) => {
        const glbHologram = gltf.scene;

        // Calcular límites para escalado en el fondo
        const box = new THREE.Box3().setFromObject(glbHologram);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 16.0;
        const scale = targetSize / maxDim;
        glbHologram.scale.setScalar(scale);

        // Centrado y cerca del espectador
        glbHologram.position.set(1.5, 0, 9.0);

        // Convertir el modelo en blueprint blanco con máscara de profundidad,
        // excepto el mecha de la izquierda que se procesará como blueprint violeta que se materializa.
        const meshesToProcess = [];
        glbHologram.traverse((child) => {
          if (child.isMesh) {
            const vertCount = child.geometry?.attributes?.position?.count || 0;
            const isMecha = child.name.includes("942") || child.name.includes("944") || 
                            (vertCount > 5000 && child.position.x < -1.0 && child.position.y > 1.5);
            
            if (isMecha) {
              child.visible = false;
            } else {
              meshesToProcess.push(child);
            }
          }
        });

        meshesToProcess.forEach((mesh) => {
          // Material del wireframe exterior
          const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0, // Controlado en render() según el scroll de vídeo
            wireframe: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false, // Evita que las líneas del wireframe se oculten a sí mismas
            depthTest: true,
            side: THREE.DoubleSide
          });
          mesh.material = mat;
          glbMaterials.push(mat);
          mesh.renderOrder = 2;

          // Crear clon para máscara de profundidad (hace que no se transparenten las partes traseras)
          const maskMesh = mesh.clone();
          maskMesh.material = new THREE.MeshBasicMaterial({
            colorWrite: false, // No dibuja color, solo escribe en el buffer de profundidad
            depthWrite: true,
            depthTest: true,
            transparent: false,
            side: THREE.DoubleSide
          });
          maskMesh.renderOrder = 1;
          mesh.parent.add(maskMesh);
        });

        // Ocultar TODOS los elementos procedimentales del holograma
        hologram.rings.forEach((ring) => {
          ring.visible = false;
        });
        hologram.spokes.visible = false;
        hologram.core.visible = false;
        hologram.grid.visible = false;
        hologram.points.visible = false;

        // Añadir el entorno al grupo holograma
        hologram.group.add(glbHologram);
        requestFrame();
      },
      undefined,
      (err) => {
        console.error("Error loading environment GLB:", err);
      }
    );
  }

  function scheduleYatagarasuModelLoad(delay = 1000) {
    if (!LOAD_YATAGARASU_BLUEPRINT || yatagarasuLoadStarted) {
      return;
    }
    if (yatagarasuLoadDeferredId !== null && delay <= 0) {
      if (yatagarasuLoadDeferredIsIdle && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(yatagarasuLoadDeferredId);
      } else {
        window.clearTimeout(yatagarasuLoadDeferredId);
      }
      yatagarasuLoadDeferredId = null;
    }
    if (yatagarasuLoadDeferredId !== null) {
      return;
    }
    const startLoad = () => {
      yatagarasuLoadDeferredId = null;
      yatagarasuLoadDeferredIsIdle = false;
      if (delay <= 0 || state.visible || state.fold > 0.03 || state.video > 0.02) {
        loadYatagarasuModel();
      }
    };
    if ("requestIdleCallback" in window && delay > 0) {
      yatagarasuLoadDeferredIsIdle = true;
      yatagarasuLoadDeferredId = window.requestIdleCallback(startLoad, { timeout: delay + 900 });
      return;
    }
    yatagarasuLoadDeferredIsIdle = false;
    yatagarasuLoadDeferredId = window.setTimeout(startLoad, delay);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (width === state.width && height === state.height) {
      return;
    }
    state.width = width;
    state.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    state.camBaseZ = width < 900 ? 13.8 : 12;
    camera.position.z = state.camBaseZ + state.camDolly;
    camera.updateProjectionMatrix();
  }

  function updateFromDetail(detail = {}) {
    state.raw = Number(detail.raw || 0);
    state.fold = clamp(Number(detail.fold || 0));
    state.video = clamp(Number(detail.video || 0));
    state.lore = clamp(Number(detail.lore || 0));
    state.map = clamp(Number(detail.map || 0));
    
    // Si fold > 0.01, situamos el canvas 3D por delante de la ficha del personaje
    if (state.fold > 0.01) {
      canvas.style.zIndex = "10";
    } else {
      canvas.style.zIndex = "1";
    }
    
    if (state.fold > 0.035 || state.video > 0.02 || state.map > 0.02) {
      scheduleYatagarasuModelLoad(0);
    }
    requestFrame();
  }

  function updateVisibility() {
    state.visible = !archiveScreen.classList.contains("hidden");
    if (state.visible) {
      scheduleYatagarasuModelLoad(0);
    }
    resize();
    requestFrame();
  }

  function requestFrame() {
    state.lastPointerMoveAt = performance.now();
    if (!state.running) {
      state.running = true;
      requestAnimationFrame(render);
    }
  }

  function shouldWakeForPointerFrame() {
    if (!PERF_ADAPTIVE) {
      return true;
    }
    return state.visible || state.fold > 0.03 || state.video > 0.02 || state.swordDragActive;
  }

  function render(now = 0) {
    state.running = false;
    // Optimización: resize() se ha movido fuera del bucle de animación (ya se maneja de forma eficiente por ResizeObserver y eventos)

    const active = state.visible && !prefersReducedMotion;
    const time = now * 0.001;
    const swordProgress = smoothstep(0.12, 0.88, state.fold); // No se apaga con el vÃ­deo
    const backgroundAlpha = active ? 0.22 + (1 - state.video) * 0.26 : 0;

    const targetBlueprintOpacity = active ? 0.14 : 0;
    const blueprintDiff = Math.abs(targetBlueprintOpacity - currentBlueprintOpacity);
    if (blueprintDiff > 0.001) {
      currentBlueprintOpacity += (targetBlueprintOpacity - currentBlueprintOpacity) * 0.12;
    } else {
      currentBlueprintOpacity = targetBlueprintOpacity;
    }
    glbMaterials.forEach((mat) => {
      mat.opacity = currentBlueprintOpacity;
    });

    // Actualizar la animación del modelo de Lumen móvil y sus partículas
    const dt = lastRenderTime === 0 ? 0.016 : Math.min(0.1, time - lastRenderTime);
    lastRenderTime = time;
    if (active) {
      let isHovered = false;
      if (lumenOriginalLoaded && lumenMovingGroup.visible) {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(state.mouseX, state.mouseY);
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(lumenMovingGroup.children, true);
        isHovered = intersects.length > 0;
      }
      updateMovingLumen(time, dt, state.fold, isHovered);
    } else {
      lumenMovingGroup.visible = false;
    }

    // Control de visibilidad
    hologram.group.visible = active && currentBlueprintOpacity > 0.005;
    sword.group.visible = active && swordProgress > 0.005;

    // --- PARALLAX INTERACTIVO CON RATÃ“N ---
    // Se activa siempre, incluso con las ventanas cerradas
    const parallaxGate = 1.0;

    // Targets con gate: si los paneles no estÃ¡n totalmente abiertos, el target es 0 (sin movimiento)
    const targetRotY = state.mouseX * 0.14 * parallaxGate;
    const targetRotX = -state.mouseY * 0.09 * parallaxGate;
    const targetPosX = state.mouseX * 0.22 * parallaxGate;
    const targetPosY = -state.mouseY * 0.16 * parallaxGate;

    // InterpolaciÃ³n exponencial suave (LERP bajo = mÃ¡s fluido y natural, como inercia)
    const lerpSpeed = 0.035;
    state.mouseRotX += (targetRotX - state.mouseRotX) * lerpSpeed;
    state.mouseRotY += (targetRotY - state.mouseRotY) * lerpSpeed;
    state.mousePosX += (targetPosX - state.mousePosX) * lerpSpeed;
    state.mousePosY += (targetPosY - state.mousePosY) * lerpSpeed;

    // Umbral de movimiento mÃ­nimo para evitar micro-jitter
    if (Math.abs(state.mouseRotX) < 0.0001) state.mouseRotX = 0;
    if (Math.abs(state.mouseRotY) < 0.0001) state.mouseRotY = 0;
    if (Math.abs(state.mousePosX) < 0.0001) state.mousePosX = 0;
    if (Math.abs(state.mousePosY) < 0.0001) state.mousePosY = 0;

    // --- DIRECTOR DE CÁMARA CINEMATOGRÁFICO (v202) ---
    // Dolly/grúa por fase: puro LERP matemático dentro del loop existente, sin drift en reposo
    // para que el render bajo demanda pueda dormirse cuando la cámara asienta.
    const foldEase = smoothstep(0, 1, state.fold);
    const camDollyTarget = -0.55 * foldEase + 0.5 * state.video + 0.8 * state.map;
    const camRiseTarget = -0.28 * state.video;
    const camLookYTarget = 0.18 * state.video - 0.06 * foldEase;
    const camLerp = 0.022; // más lento que el parallax: easing largo de grúa
    state.camDolly += (camDollyTarget - state.camDolly) * camLerp;
    state.camRise += (camRiseTarget - state.camRise) * camLerp;
    state.camLookY += (camLookYTarget - state.camLookY) * camLerp;
    if (Math.abs(camDollyTarget - state.camDolly) < 0.0004) state.camDolly = camDollyTarget;
    if (Math.abs(camRiseTarget - state.camRise) < 0.0004) state.camRise = camRiseTarget;
    if (Math.abs(camLookYTarget - state.camLookY) < 0.0004) state.camLookY = camLookYTarget;
    camera.position.z = state.camBaseZ + state.camDolly;
    camera.position.y = 3.5 + state.camRise;
    camera.lookAt(0, -0.5 + state.camLookY, 0);

    updateYatagarasuHologram(hologram, time, backgroundAlpha, state);
    updateEnergyBlade(sword, time, swordProgress, state);

    if (active) {
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      if (sword.group.visible || lumenMovingGroup.visible) {
        renderer.clearDepth();
        renderer.render(swordScene, camera);
      }
    } else {
      renderer.clear(true, true, true);
    }

    const targetRotYDiff = Math.abs(targetRotY - state.mouseRotY);
    const targetRotXDiff = Math.abs(targetRotX - state.mouseRotX);
    const targetPosXDiff = Math.abs(targetPosX - state.mousePosX);
    const targetPosYDiff = Math.abs(targetPosY - state.mousePosY);
    const cameraSettling =
      Math.abs(camDollyTarget - state.camDolly) > 0.0004 ||
      Math.abs(camRiseTarget - state.camRise) > 0.0004 ||
      Math.abs(camLookYTarget - state.camLookY) > 0.0004;
    const settling =
      targetRotYDiff > 0.0005 ||
      targetRotXDiff > 0.0005 ||
      targetPosXDiff > 0.0005 ||
      targetPosYDiff > 0.0005 ||
      cameraSettling;
    const recentlyMoved = performance.now() - state.lastPointerMoveAt < 260;
    const transitionMoving = Math.abs(state.raw - state.lastRaw) > 0.0005;
    state.lastRaw = state.raw;
    const keepAnimating = active && state.visible && (state.swordDragActive || settling || recentlyMoved || transitionMoving || state.fold > 0.001 || blueprintDiff > 0.001);

    if (keepAnimating) {
      state.running = true;
      requestAnimationFrame(render);
    }
  }
  function updateMovingLumen(time, dt, fold, isHovered) {
    if (!lumenOriginalLoaded || !lumenMovingGroup) return;

    // Actualizar el estado de aparición de Lumen (comienza a aparecer cuando las ventanas se abren y antes de que la espada esté lista)
    const shouldShowLumen = fold > 0.45;
    const isScrolledAway = state.video > 0.28 || state.map > 0.01;

    if (shouldShowLumen && !isScrolledAway) {
      lumenAppearance = Math.min(1.0, lumenAppearance + dt * 1.8);
    } else {
      lumenAppearance = Math.max(0.0, lumenAppearance - dt * 2.5);
    }

    const isGlitching = state.video > 0.28 && state.video < 0.38;
    const isFullyHidden = state.video >= 0.38 || fold <= 0.001 || lumenAppearance <= 0.001;

    if (isFullyHidden) {
      lumenMovingGroup.visible = false;
      if (lumenWarmLight) {
        lumenWarmLight.intensity = 0;
      }
      if (radarGrid) {
        radarGrid.visible = false;
        radarGrid.children.forEach(child => {
          if (child.material) child.material.opacity = 0;
        });
      }
      
      const tag = document.querySelector("#lumen-tech-tag");
      if (tag) {
        tag.style.display = "none";
      }
      return;
    }

    lumenMovingGroup.visible = true;

    const targetBox = document.querySelector("#archive-lumen-target");
    if (!targetBox) return;

    const targetRect = targetBox.getBoundingClientRect();
    const currentX = targetRect.left + targetRect.width / 2;
    const currentY = targetRect.top + targetRect.height / 2;

    const ndcX = (currentX / window.innerWidth) * 2 - 1;
    const ndcY = -(currentY / window.innerHeight) * 2 + 1;

    const slideInOffset = (1.0 - easeOutCubic(lumenAppearance)) * -1.5; // Desplazamiento automático fluido

    // Lumen se queda en su lugar (no va hacia abajo con la espada) y realiza una aberración cromática/glitch
    const targetZ = 6.8;
    const worldPos = getWorldPositionFromScreen(ndcX, ndcY, targetZ);
    worldPos.x += slideInOffset - 0.70; // Desplazamiento horizontal base (más a la izquierda)
    worldPos.y += 0.40;                 // Desplazamiento vertical base (más arriba)

    if (isGlitching) {
      // Jitter espacial de alta frecuencia (sacudida en el sitio)
      worldPos.x += (Math.sin(time * 120) * 0.05) + (Math.cos(time * 93) * 0.02);
      worldPos.y += (Math.sin(time * 88) * 0.05) + (Math.cos(time * 115) * 0.02);
    }

    lumenMovingGroup.position.copy(worldPos);

    const currentScale = 0.32; // Escala base
    const exitScale = Math.max(0.0, 1.0 - (state.video / 0.35));
    const finalScale = currentScale * easeOutCubic(lumenAppearance) * (isScrolledAway ? exitScale : 1.0);

    lumenMovingGroup.scale.setScalar(finalScale);

    // Actualizar materiales de Lumen (opacidad y destellos de color de aberración cromática)
    movingLumenMaterials.forEach((mat) => {
      if (mat.emissive) {
        if (isGlitching) {
          // Destello cíclico rápido entre cian, magenta y color base
          const cycle = Math.floor(time * 60) % 3;
          mat.emissive.setHex(cycle === 1 ? 0xff0055 : (cycle === 2 ? 0x00ffff : mat.userData.originalEmissiveHex || 0x000000));
          mat.emissiveIntensity = 3.5;
        } else {
          mat.emissive.setHex(mat.userData.originalEmissiveHex || 0x000000);
          mat.emissiveIntensity = mat.userData.originalEmissiveIntensity || 0;
        }
      }
      const targetOpacity = lumenAppearance * (isScrolledAway ? exitScale : 1.0);
      mat.opacity = targetOpacity;
      mat.transparent = targetOpacity < 0.99;
      mat.depthWrite = targetOpacity >= 0.99;
    });

    // Reacción Interactiva al Hover (Control de Eventos para el Cursor Bubble)
    if (isHovered && fold > 0.1 && !isScrolledAway && lumenAppearance > 0.8) {
      if (!wasLumenHovered) {
        document.dispatchEvent(new CustomEvent("kpr-lumen-hover", { detail: { hovered: true } }));
      }
    } else {
      if (wasLumenHovered) {
        document.dispatchEvent(new CustomEvent("kpr-lumen-hover", { detail: { hovered: false } }));
      }
    }
    wasLumenHovered = isHovered;

    // Girar 160 grados en Y de inicio y seguir girando 360 grados en bucle continuo, e inclinar -0.48 en X para compensar perspectiva
    lumenMovingGroup.rotation.set(-0.48, (160 * Math.PI / 180) + (time * 0.45), 0.0);

    // Actualizar la rejilla circular de proyección (Radar)
    if (radarGrid) {
      const gridScale = easeOutCubic(lumenAppearance) * (isScrolledAway ? exitScale : 1.0);
      radarGrid.position.copy(worldPos);
      radarGrid.position.y -= 0.48 * gridScale; // Pegado a la base
      radarGrid.scale.setScalar(gridScale);
      
      // Capa 1: Base Mandala gira en sentido antihorario
      if (radarGrid.children[0]) {
        radarGrid.children[0].rotation.z = -time * 0.16;
        radarGrid.children[0].material.opacity = 0.68 * gridScale;
      }
      // Capa 2: Anillo de telemetría y binario gira en sentido horario
      if (radarGrid.children[1]) {
        radarGrid.children[1].rotation.z = time * 0.28;
        radarGrid.children[1].material.opacity = 0.85 * gridScale;
      }
      // Capa 3: Núcleo rápido gira en sentido antihorario
      if (radarGrid.children[2]) {
        radarGrid.children[2].rotation.z = -time * 0.62;
        radarGrid.children[2].material.opacity = 0.95 * gridScale;
      }
      // Capa 4: Volumetric Glow Cylinder
      if (radarGrid.children[3]) {
        radarGrid.children[3].rotation.y = time * 0.18;
        const pulse = 1.0 + Math.sin(time * 4.5) * 0.08;
        radarGrid.children[3].material.opacity = 0.55 * gridScale * pulse;
      }
      
      radarGrid.visible = gridScale > 0.01;
    }

    // Iluminación cálida sincronizada con la posición de Lumen
    if (lumenWarmLight) {
      const lightFactor = isScrolledAway ? exitScale : 1.0;
      lumenWarmLight.position.copy(worldPos);
      lumenWarmLight.position.y += 0.8 * lightFactor;
      lumenWarmLight.intensity = 2.2 * easeOutCubic(lumenAppearance) * lightFactor;
    }

    // Actualizar Tech Tag en 2D proyectando la coordenada 3D
    const tag = document.querySelector("#lumen-tech-tag");
    if (tag) {
      if (fold > 0.001 && !isScrolledAway && lumenAppearance > 0.1) {
        const pos = worldPos.clone();
        const factor = easeOutCubic(lumenAppearance);
        pos.x += 0.45 * factor; // Desplazamiento derecho ajustado
        pos.y += 0.35 * factor; // Desplazamiento superior ajustado
        pos.project(camera);
        
        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        
        tag.style.transform = `translate(${x}px, ${y}px)`;
        tag.style.opacity = factor;
        tag.style.display = "block";
      } else {
        tag.style.display = "none";
      }
    }
  }

  document.addEventListener("kpr-archive-fold-progress", (event) => {
    updateFromDetail(event.detail);
  });

  window.addEventListener("ichiro:auth-start", () => {
    scheduleYatagarasuModelLoad(0);
  });

  window.addEventListener("ichiro:auth", () => {
    scheduleYatagarasuModelLoad(0);
  });

  document.addEventListener("visibilitychange", requestFrame);
  window.addEventListener("resize", requestFrame, { passive: true });

  const observer = new MutationObserver(updateVisibility);
  observer.observe(archiveScreen, { attributes: true, attributeFilter: ["class"] });

  const caseObserver = new MutationObserver(requestFrame);
  if (caseViewer) {
    caseObserver.observe(caseViewer, { attributes: true, attributeFilter: ["class"] });
  }

  const resizeObserver = new ResizeObserver(() => {
    resize();
    requestFrame();
  });
  resizeObserver.observe(archiveScreen);

  window.addEventListener("pointermove", (event) => {
    state.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    if (state.swordDragActive) {
      const deltaY = event.clientY - state.swordDragStartY;
      state.swordDragRotZ = state.swordDragStartRotZ + deltaY * SWORD_DRAG_ROTATION_SPEED;
    }
    if (shouldWakeForPointerFrame()) {
      requestFrame();
    }
  }, { passive: true });

  window.addEventListener("pointerdown", (event) => {
    if (!canDragSword(state) || event.button !== 0 || !sword.glbChild) {
      return;
    }
    if (!isPointerInSwordDragZone(event)) {
      return;
    }
    state.swordDragActive = true;
    state.swordDragStartY = event.clientY;
    state.swordDragStartRotZ = state.swordDragRotZ;
    canvas.classList.add("archive-3d--dragging-sword");
    window.getSelection?.()?.removeAllRanges?.();
    requestFrame();
  }, { passive: true });

  window.addEventListener("pointerup", () => {
    state.swordDragActive = false;
    canvas.classList.remove("archive-3d--dragging-sword");
  }, { passive: true });

  window.addEventListener("pointercancel", () => {
    state.swordDragActive = false;
    canvas.classList.remove("archive-3d--dragging-sword");
  }, { passive: true });

  function canDragSword(currentState) {
    const videoSettle = smoothstep(0.08, 0.96, currentState.video || 0);
    return currentState.visible && currentState.fold > 0.72 && videoSettle < 0.42;
  }

  function isPointerInSwordDragZone(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return false;
    }
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return x > 0.18 && x < 0.82 && y > 0.16 && y < 0.84;
  }

  updateFromDetail(window.__kprArchiveFold || {});
  updateVisibility();
  window.setTimeout(requestFrame, 120);
}

function createYatagarasuHologram() {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);
  group.rotation.x = 0;

  const cyan = new THREE.MeshBasicMaterial({
    color: 0x62e4dc,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const violet = new THREE.MeshBasicMaterial({
    color: 0x976eff,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xdffefa,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const rings = [];
  [2.3, 3.35, 4.55].forEach((radius, index) => {
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.011 + index * 0.004, 8, 96),
      index === 1 ? violet.clone() : cyan.clone(),
    );
    torus.rotation.x = Math.PI / 2;
    torus.rotation.z = index * 0.4;
    group.add(torus);
    rings.push(torus);
  });

  const spokes = new THREE.Group();
  const spokeGeometry = new THREE.BoxGeometry(0.035, 2.85, 0.015);
  for (let index = 0; index < 8; index += 1) {
    const spoke = new THREE.Mesh(spokeGeometry, cyan.clone());
    spoke.position.y = 1.43;
    const pivot = new THREE.Group();
    pivot.rotation.z = index * Math.PI / 4;
    pivot.add(spoke);
    spokes.add(pivot);
  }
  group.add(spokes);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.58, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.11,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  group.add(core);

  const grid = new THREE.GridHelper(10, 24, 0x62e4dc, 0x62e4dc);
  grid.material.transparent = true;
  grid.material.opacity = 0.045;
  grid.material.depthWrite = false;
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -0.45;
  group.add(grid);

  const pointsGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(180 * 3);
  const seeds = [];
  for (let index = 0; index < 180; index += 1) {
    const radius = 1.4 + Math.random() * 4.8;
    const angle = Math.random() * Math.PI * 2;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = Math.sin(angle) * radius * 0.62;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 1.2;
    seeds.push({ radius, angle, drift: 0.25 + Math.random() * 0.7 });
  }
  pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({
    color: 0xb8fff8,
    size: 0.035,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  group.add(points);

  return { group, rings, spokes, core, grid, points, seeds, positions, cyan, violet, lineMat };
}

function updateYatagarasuHologram(hologram, time, alpha, state) {
  // Movimiento controlado por el parallax del ratÃ³n + pequeÃ±a flotaciÃ³n senoidal sutil
  hologram.group.position.set(state.mousePosX, state.mousePosY + Math.sin(time * 0.5) * 0.06, 0);
  hologram.group.rotation.set(state.mouseRotX + Math.sin(time * 0.3) * 0.008, state.mouseRotY, 0);
  hologram.group.scale.setScalar(1);

  hologram.rings.forEach((ring, index) => {
    ring.rotation.z = time * (0.08 + index * 0.035) * (index % 2 ? -1 : 1);
    ring.material.opacity = alpha * (0.3 - index * 0.045);
  });
  hologram.spokes.rotation.z = -time * 0.06;
  hologram.spokes.children.forEach((pivot, index) => {
    pivot.children[0].material.opacity = alpha * (0.15 + Math.sin(time * 1.2 + index) * 0.025);
  });
  hologram.core.rotation.x = time * 0.28;
  hologram.core.rotation.y = time * 0.22;
  hologram.core.material.opacity = alpha * 0.24;
  hologram.grid.material.opacity = alpha * 0.08;
  hologram.points.material.opacity = alpha * 0.48;

  const position = hologram.points.geometry.attributes.position;
  for (let index = 0; index < hologram.seeds.length; index += 1) {
    const seed = hologram.seeds[index];
    const angle = seed.angle + time * seed.drift * 0.1;
    position.array[index * 3] = Math.cos(angle) * seed.radius;
    position.array[index * 3 + 1] = Math.sin(angle) * seed.radius * 0.62;
  }
  position.needsUpdate = true;
}

function createEnergyBlade() {
  const group = new THREE.Group();
  group.position.set(0, 1.7, 6.8); /* Centrada en pantalla, mÃ¡s cerca de la cÃ¡mara (Z=6.8) */
  group.scale.set(0.88, 0.88, 0.88);

  const bladeMat = new THREE.MeshBasicMaterial({
    color: 0xff7a1f,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff3c00,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

  const rightBlade = new THREE.Mesh(makeBladeShape(4.4, 0.26), bladeMat);
  const leftBlade = new THREE.Mesh(makeBladeShape(4.4, 0.26), bladeMat.clone());
  leftBlade.scale.x = -1;

  const rightCore = new THREE.Mesh(makeBladeShape(4.15, 0.08), coreMat);
  const leftCore = new THREE.Mesh(makeBladeShape(4.15, 0.08), coreMat.clone());
  leftCore.scale.x = -1;

  const rightGlow = new THREE.Mesh(makeBladeShape(4.7, 0.48), glowMat);
  const leftGlow = new THREE.Mesh(makeBladeShape(4.7, 0.48), glowMat.clone());
  leftGlow.scale.x = -1;

  const hilt = new THREE.Group();
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.72, 0.08),
    new THREE.MeshBasicMaterial({
      color: 0x0a0a0b,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
  );
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.12, 0.07),
    new THREE.MeshBasicMaterial({
      color: 0xff9d37,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  hilt.add(grip, guard);

  const particlesGeometry = new THREE.BufferGeometry();
  const particles = new Float32Array(90 * 3);
  const particleSeeds = [];
  for (let index = 0; index < 90; index += 1) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = side * (0.1 + Math.random() * 4.5);
    const y = (Math.random() - 0.5) * 0.72;
    const z = (Math.random() - 0.5) * 0.32;
    particles[index * 3] = x;
    particles[index * 3 + 1] = y;
    particles[index * 3 + 2] = z;
    particleSeeds.push({ x, y, z, side, speed: 0.4 + Math.random() * 1.4 });
  }
  particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particles, 3));
  const particleCloud = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({
    color: 0xffc37a,
    size: 0.045,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));

  // El GLB real es la unica espada visible. Las piezas procedimentales quedan fuera de escena
  // para evitar marcas o fragmentos moviendose alrededor del modelo.
  const proceduralParts = [leftGlow, rightGlow, leftBlade, rightBlade, leftCore, rightCore, hilt, particleCloud];
  proceduralParts.forEach((part) => {
    part.visible = false;
  });

  return {
    group,
    leftGlow,
    rightGlow,
    leftBlade,
    rightBlade,
    leftCore,
    rightCore,
    hilt,
    particleCloud,
    particleSeeds,
    proceduralParts,
    glbChild: null,
    dragPivot: null,
  };
}

function setProceduralSwordVisible(sword, visible) {
  sword.proceduralParts?.forEach((part) => {
    part.visible = visible;
  });
}

function applyToMaterials(materialOrMaterials, callback) {
  const materials = Array.isArray(materialOrMaterials) ? materialOrMaterials : [materialOrMaterials];
  materials.forEach((material) => {
    if (material) {
      callback(material);
    }
  });
}

function updateEnergyBlade(sword, time, progress, state) {
  const eased = easeOutCubic(progress);
  const opacity = Math.min(0.98, smoothstep(0.02, 0.92, progress) * 0.98); // Opaca al final, materializandose con la apertura.
  const bladeScale = Math.max(0.001, eased);
  const flicker = 0.86 + Math.sin(time * 18) * 0.07 + Math.sin(time * 41) * 0.025;
  const videoSettle = smoothstep(0.08, 0.96, state.video || 0);
  const settledScale = 1 + videoSettle * 0.18;
  const settledDrop = videoSettle * 1.82;
  const settledLeft = videoSettle * 0.42;
  const mapSettle = smoothstep(0.0, 1.0, state.map || 0);
  const mapDrop = mapSettle * 6.0;
  const dragGate = smoothstep(0.76, 0.94, state.fold) * (1 - smoothstep(0.14, 0.34, state.video || 0)) * (1 - mapSettle);
  if (!state.swordDragActive && dragGate < 0.01 && Math.abs(state.swordDragRotZ) > 0.0001) {
    state.swordDragRotZ += (0 - state.swordDragRotZ) * 0.06;
  }

  sword.group.position.set(swordState.gpx - settledLeft, swordState.gpy - settledDrop - mapDrop, swordState.gpz);
  sword.group.rotation.set(
    swordState.grx * Math.PI / 180,
    swordState.gry * Math.PI / 180,
    swordState.grz * Math.PI / 180
  );
  if (sword.glbChild) {
    sword.glbChild.rotation.set(
      swordState.crx * Math.PI / 180,
      swordState.cry * Math.PI / 180,
      swordState.crz * Math.PI / 180
    );
  }
  if (sword.dragPivot) {
    sword.dragPivot.rotation.set(0, 0, state.swordDragRotZ * dragGate);
  }
  sword.group.scale.setScalar((0.16 + eased * 0.78) * settledScale);

  // Actualizar la opacidad de los materiales del GLB de la espada (textura real visible)
  const swordVisible = progress > 0.025;
  sword.group.traverse((child) => {
    if (child.isMesh && child.material) {
      child.visible = swordVisible;
      applyToMaterials(child.material, (material) => {
        const emissive = material.emissive;
        const kind = material.userData.kprBladeGlow || "dark";
        const preserveAlpha = material.userData.kprPreserveAlpha === true;
        material.transparent = preserveAlpha;
        material.opacity = preserveAlpha ? Math.min(1, opacity) : 1;
        material.alphaTest = preserveAlpha ? 0.03 : 0;
        material.blending = preserveAlpha ? THREE.NormalBlending : THREE.NormalBlending;
        material.depthWrite = !preserveAlpha;
        material.depthTest = true;
        if ("emissiveIntensity" in material) {
          const base = material.userData.kprBaseEmissiveIntensity || 0;
          const pulse = Math.max(0, Math.sin(time * 3.4)) * 0.08;
          if (kind === "orange") {
            material.emissiveIntensity = 2.55 + pulse;
          } else if (kind === "red") {
            material.emissiveIntensity = 1.9 + pulse * 0.7;
          } else if (kind === "white") {
            material.emissiveIntensity = 1.15 + pulse * 0.5;
          } else {
            material.emissiveIntensity = base;
          }
        }
        material.needsUpdate = true;
      });
    }
  });

  // No se anima ninguna pieza auxiliar: el asset real debe comportarse como una sola espada rigida.
}

function makeBladeShape(length, width) {
  const shape = new THREE.Shape();
  shape.moveTo(0, width * 0.22);
  shape.lineTo(length * 0.82, width);
  shape.lineTo(length, 0);
  shape.lineTo(length * 0.82, -width);
  shape.lineTo(0, -width * 0.22);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - clamp(value), 3);
}
