const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

import { validateDossierProtocol } from "./dossier-contracts.mjs?v=kpr-dossier-contracts-256";

function shell(code, title, objective, body) {
  return `<section class="evidence-protocol" data-protocol="${code}" aria-label="${title}">
    <div class="evidence-protocol__sensor" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
    <header class="evidence-protocol__header"><div><span>// EVIDENCE PROTOCOL ${code}</span><h3>${title}</h3></div><output>INTEGRITY <b>00%</b></output></header>
    <p class="evidence-protocol__objective">${objective}</p>
    <div class="evidence-protocol__stage">${body}</div>
    <footer class="evidence-protocol__footer"><span aria-live="polite">LINK READY // AWAITING EVIDENCE</span><div><i></i></div></footer>
  </section>`;
}

function integrity(root, value) {
  const amount = clamp(Math.round(value), 0, 100);
  root.style.setProperty("--integrity-ratio", String(amount / 100));
  root.querySelector(".evidence-protocol__header output b").textContent = `${amount}%`;
  root.querySelector(".evidence-protocol__footer i").style.setProperty("--integrity", `${amount}%`);
}

function status(root, text, state = "") {
  const node = root.querySelector(".evidence-protocol__footer span");
  node.textContent = text;
  node.className = state ? `is-${state}` : "";
}

function success(root, ctx, text) {
  if (root.dataset.solved === "true") return;
  root.dataset.solved = "true";
  root.classList.remove("is-rejected");
  root.classList.add("is-solved");
  integrity(root, 100);
  status(root, text, "success");
  root.querySelectorAll("button,input").forEach((node) => { node.disabled = true; });
  ctx.tone("unlock");
  ctx.setParticlePulse(1.8);
  ctx.onSolved(ctx.file, root.dataset.protocol);
}

function reject(root, ctx, text) {
  root.classList.remove("is-rejected");
  void root.offsetWidth;
  root.classList.add("is-rejected");
  status(root, text, "error");
  ctx.tone("error");
}

function crc4(bits) {
  let register = 0;
  for (const bit of bits) {
    register = (register << 1) | bit;
    if (register & 0x10) register ^= 0x13;
  }
  return register & 15;
}

function parity(bits) {
  const channels = [0, 0, 0, 0];
  bits.forEach((bit, index) => {
    if (!bit) return;
    for (let channel = 0; channel < 4; channel += 1) if ((index + 1) & (1 << channel)) channels[channel] ^= 1;
  });
  return channels.join("");
}

function packet(container, ctx) {
  const target = [..."1011010010110110"].map(Number);
  const bits = [...target];
  [2, 7, 13].forEach((index) => { bits[index] ^= 1; });
  const targetCrc = crc4(target);
  const targetParity = parity(target);
  container.innerHTML = shell("CRC-17", "CORRUPTED MANIFEST PACKET", "Restore the payload until CRC and Hamming syndrome match the intercepted signature.", `
    <div class="packet-readout"><span>TARGET CRC <b>0x${targetCrc.toString(16).toUpperCase()}</b></span><span>TARGET SYNDROME <b>${targetParity}</b></span><span>LIVE CRC <b data-crc>--</b></span><span>LIVE SYNDROME <b data-parity>----</b></span></div>
    <div class="protocol-bitfield">${bits.map((bit, index) => `<button type="button" data-bit="${index}" aria-label="Toggle bit ${index + 1}">${bit}</button>`).join("")}</div>
    <button type="button" class="protocol-command" data-verify>VERIFY PACKET</button>`);
  const root = container.firstElementChild;
  const update = () => {
    root.querySelector("[data-crc]").textContent = `0x${crc4(bits).toString(16).toUpperCase()}`;
    root.querySelector("[data-parity]").textContent = parity(bits);
    const distance = bits.reduce((sum, bit, index) => sum + (bit !== target[index]), 0);
    integrity(root, 25 + (1 - distance / bits.length) * 65);
  };
  root.querySelectorAll("[data-bit]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.bit);
    bits[index] ^= 1;
    button.textContent = bits[index];
    button.classList.toggle("is-hot", bits[index] === 1);
    ctx.tone("move");
    update();
  }));
  root.querySelector("[data-verify]").addEventListener("click", () => {
    if (validateDossierProtocol("00", bits)) success(root, ctx, "PACKET VERIFIED // MANIFEST AUTHENTIC");
    else reject(root, ctx, "SYNDROME COLLISION // CORRUPTION REMAINS");
  });
  update();
}

function interference(container, ctx) {
  container.innerHTML = shell("BIO-WAVE", "SAIKON RESONANCE CANCELLATION", "Counter the filament harmonic without flattening the subject's living carrier wave.", `
    <canvas class="protocol-oscilloscope" width="720" height="220"></canvas>
    <div class="protocol-controls"><label>COUNTER GAIN <output data-gain>0.20</output><input data-gain-input type="range" min="0" max="100" value="20"></label><label>PHASE OFFSET <output data-phase>035°</output><input data-phase-input type="range" min="0" max="360" value="35"></label></div>
    <button type="button" class="protocol-command" data-lock>LOCK NULL</button>`);
  const root = container.firstElementChild;
  const canvas = root.querySelector("canvas");
  const paint = canvas.getContext("2d");
  const gain = root.querySelector("[data-gain-input]");
  const phase = root.querySelector("[data-phase-input]");
  const draw = () => {
    const g = Number(gain.value) / 100;
    const p = Number(phase.value) * Math.PI / 180;
    root.querySelector("[data-gain]").textContent = g.toFixed(2);
    root.querySelector("[data-phase]").textContent = `${String(phase.value).padStart(3, "0")}°`;
    paint.clearRect(0, 0, canvas.width, canvas.height);
    paint.strokeStyle = "rgba(95,255,224,.18)";
    for (let y = 20; y < canvas.height; y += 30) { paint.beginPath(); paint.moveTo(0, y); paint.lineTo(canvas.width, y); paint.stroke(); }
    const trace = (color, fn, width) => {
      paint.beginPath();
      for (let x = 0; x <= canvas.width; x += 2) {
        const t = x / canvas.width * Math.PI * 7;
        const y = canvas.height * .5 + fn(t) * canvas.height * .28;
        if (!x) paint.moveTo(x, y); else paint.lineTo(x, y);
      }
      paint.strokeStyle = color; paint.lineWidth = width; paint.stroke();
    };
    trace("rgba(91,255,225,.4)", (t) => Math.sin(t), 1);
    trace("rgba(255,188,93,.95)", (t) => Math.sin(t) + .64 * Math.sin(t * 2 + .4) + g * Math.sin(t * 2 + .4 + p), 2);
    integrity(root, 100 - (Math.abs(.64 - g) + Math.abs(Math.PI - p) / Math.PI * .7) * 78);
  };
  [gain, phase].forEach((input) => input.addEventListener("input", draw));
  root.querySelector("[data-lock]").addEventListener("click", () => {
    if (validateDossierProtocol("01", { gain: Number(gain.value) / 100, phase: Number(phase.value) })) success(root, ctx, "RESONANCE NULL // LIVING CARRIER PRESERVED");
    else reject(root, ctx, "PHASE REFLECTION // FILAMENT AMPLIFIED");
  });
  draw();
}

function evidenceChain(container, ctx) {
  const groups = [
    ["kai", "CONTROLLED KAI EXPOSURE", "INDUSTRIAL FATIGUE", "CIVILIAN TRIAGE"],
    ["preserve", "PRESERVE COMMAND RETENTION", "TERMINATE ALL SUBJECTS", "VOLUNTARY RECOVERY"],
    ["accident", "RECODE AS INDUSTRIAL ACCIDENT", "PUBLISH CLINICAL RESULTS", "CONTACT RELATIVES"],
  ];
  container.innerHTML = shell("CAUSAL-3", "NEMETH CONTRADICTION GRAPH", "Build one defensible chain from operation to policy to public concealment.", `
    <div class="protocol-chain">${groups.map((group, stage) => `<fieldset data-stage="${stage}"><legend>${["OPERATION", "POLICY", "COVER STORY"][stage]}</legend>${group.slice(1).map((label, index) => `<button type="button" data-choice="${index === 0 ? group[0] : `decoy-${stage}-${index}`}">${label}</button>`).join("")}</fieldset>`).join("")}</div>
    <div class="protocol-chain__bridge"><i></i><i></i></div><button type="button" class="protocol-command" data-prove>COMMIT EVIDENCE CHAIN</button>`);
  const root = container.firstElementChild;
  const selected = new Map();
  root.querySelectorAll("fieldset button").forEach((button) => button.addEventListener("click", () => {
    const fieldset = button.closest("fieldset");
    fieldset.querySelectorAll("button").forEach((item) => item.classList.remove("is-selected"));
    button.classList.add("is-selected");
    selected.set(Number(fieldset.dataset.stage), button.dataset.choice);
    integrity(root, 18 + selected.size * 23);
    ctx.tone("move");
  }));
  root.querySelector("[data-prove]").addEventListener("click", () => {
    if (validateDossierProtocol("02", [0, 1, 2].map((index) => selected.get(index)))) success(root, ctx, "CONTRADICTION PROVEN // PUBLIC RECORD COMPROMISED");
    else reject(root, ctx, "CAUSAL GAP // CLAIM DOES NOT SURVIVE REVIEW");
  });
}

function timeline(container, ctx) {
  const targets = [-18, 24, -7];
  const readings = [
    ["VOICE CLOCK", "43:18.000", "43:00.000"],
    ["ENTRY 44", "42:36.000", "43:00.000"],
    ["TRANSFER MARK", "43:07.000", "43:00.000"],
  ];
  container.innerHTML = shell("DRIFT-43", "KEIGAMI TEMPORAL SIGNATURE", "Derive and apply the correction for each recovered clock. All three must collapse onto the same reference pulse.", `
    <div class="protocol-timeline">${readings.map(([label, observed, reference], index) => `<label><span>${label}</span><span class="clock-evidence"><small>OBSERVED ${observed}</small><small>REFERENCE ${reference}</small></span><output data-offset="${index}">+00s</output><input data-drift="${index}" type="range" min="-30" max="30" value="0"></label>`).join("")}</div>
    <div class="protocol-clock"><span>REFERENCE PULSE</span><b>43:00.000</b><i></i></div><button type="button" class="protocol-command" data-normalize>NORMALIZE TIMELINE</button>`);
  const root = container.firstElementChild;
  const inputs = [...root.querySelectorAll("[data-drift]")];
  const update = () => {
    let error = 0;
    inputs.forEach((input, index) => {
      const value = Number(input.value);
      error += Math.abs(value - targets[index]);
      root.querySelector(`[data-offset="${index}"]`).textContent = `${value >= 0 ? "+" : ""}${value}s`;
    });
    integrity(root, 100 - error * 1.45);
  };
  inputs.forEach((input) => input.addEventListener("input", update));
  root.querySelector("[data-normalize]").addEventListener("click", () => {
    if (validateDossierProtocol("03", inputs.map((input) => Number(input.value)))) success(root, ctx, "TIMELINE NORMALIZED // ENTRY 43 PRECEDES DISAPPEARANCE");
    else reject(root, ctx, "CLOCK DRIFT UNRESOLVED // SIGNATURE REMAINS IMPOSSIBLE");
  });
  update();
}

function memoryChain(container, ctx) {
  const target = ["count", "shake", "cloth", "steps", "blame"];
  const nodes = [
    ["steps", "FOOTSTEPS PASS THE DOOR"], ["ration", "RATION TABLET SPLIT"],
    ["count", "HANGYAKU MISSES THE COUNT"], ["cloth", "AIRA STEALS MEDICAL CLOTH"],
    ["blame", "AIRA CLAIMS THE FAILURE"], ["shake", "FINGERS BEGIN TO SHAKE"],
  ];
  container.innerHTML = shell("MNEMOSYNE", "CHILD MEMORY CAUSAL TRACE", "Recover the pressure chain. One detail belongs to a different memory branch.", `
    <div class="memory-chain__source">${nodes.map(([id, label]) => `<button type="button" data-memory="${id}"><span>${label}</span><small>FRAGMENT ${id.toUpperCase()}</small></button>`).join("")}</div>
    <ol class="memory-chain__result"></ol><div class="protocol-actions"><button type="button" class="protocol-command protocol-command--quiet" data-undo>UNDO LAST</button><button type="button" class="protocol-command" data-reconstruct>RECONSTRUCT</button></div>`);
  const root = container.firstElementChild;
  const chain = [];
  const render = () => {
    root.querySelector(".memory-chain__result").innerHTML = chain.map((id, index) => `<li><b>${String(index + 1).padStart(2, "0")}</b><span>${nodes.find((node) => node[0] === id)[1]}</span></li>`).join("");
    root.querySelectorAll("[data-memory]").forEach((button) => button.classList.toggle("is-selected", chain.includes(button.dataset.memory)));
    integrity(root, 12 + chain.length * 15);
  };
  root.querySelectorAll("[data-memory]").forEach((button) => button.addEventListener("click", () => {
    if (!chain.includes(button.dataset.memory) && chain.length < 5) chain.push(button.dataset.memory);
    ctx.tone("move"); render();
  }));
  root.querySelector("[data-undo]").addEventListener("click", () => { chain.pop(); render(); });
  root.querySelector("[data-reconstruct]").addEventListener("click", () => {
    if (validateDossierProtocol("04", chain)) success(root, ctx, "MEMORY STABILIZED // PROTECTIVE PATTERN CONFIRMED");
    else reject(root, ctx, "FALSE CONTINUITY // MEMORY BRANCH COLLAPSED");
  });
  render();
}

function spectral(container, ctx) {
  const targets = [31, 67, 84];
  const spectrum = Array.from({ length: 51 }, (_, index) => {
    const x = index * 2;
    const peak = Math.max(...targets.map((target) => Math.exp(-Math.pow((x - target) / 4.2, 2))));
    const noise = (Math.sin(index * 2.17) + 1) * .08;
    return Math.round(12 + (peak * .8 + noise) * 82);
  });
  container.innerHTML = shell("LUMEN-FFT", "ZERO-SPEAKER SIGNAL LOCK", "Recover the three silent carriers encoded below the audible archive channel.", `
    <div class="spectral-waterfall" aria-label="Recovered silent-carrier spectrum">${spectrum.map((height) => `<i style="--spectrum:${height}%"></i>`).join("")}<span data-band-cursor="0"></span><span data-band-cursor="1"></span><span data-band-cursor="2"></span></div>
    <div class="spectral-lock">${targets.map((_, index) => `<label><span>BIN ${index + 1}</span><input data-band="${index}" type="range" min="0" max="100" value="50"><output>050</output></label>`).join("")}</div>
    <div class="spectral-bars">${Array.from({ length: 24 }, (_, index) => `<i style="--bar:${18 + ((index * 37) % 74)}%"></i>`).join("")}</div><button type="button" class="protocol-command" data-capture>CAPTURE SILENT FRAME</button>`);
  const root = container.firstElementChild;
  const inputs = [...root.querySelectorAll("[data-band]")];
  const update = () => {
    let error = 0;
    inputs.forEach((input, index) => {
      const value = Number(input.value);
      error += Math.abs(value - targets[index]);
      input.nextElementSibling.textContent = String(value).padStart(3, "0");
      root.querySelector(`[data-band-cursor="${index}"]`).style.left = `${value}%`;
    });
    integrity(root, 100 - error * .75);
  };
  inputs.forEach((input) => input.addEventListener("input", update));
  root.querySelector("[data-capture]").addEventListener("click", () => {
    if (validateDossierProtocol("05", inputs.map((input) => Number(input.value)))) success(root, ctx, "SILENT FRAME CAPTURED // LUMEN VOICEPRINT RESTORED");
    else reject(root, ctx, "SPECTRAL LEAK // CARRIER PHASE LOST");
  });
  update();
}

function route(container, ctx) {
  const graph = { S: ["A", "B"], A: ["D", "C"], B: ["C", "E"], C: ["F"], D: ["F"], E: ["F"], F: [] };
  const compromised = new Set(["A", "C"]);
  const path = ["S"];
  container.innerHTML = shell("YATA-PATH", "BLIND COURIER ROUTE", "Reach F without crossing telemetry nodes already mirrored by Nemeth.", `
    <div class="route-graph"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M11 50L33 21M11 50L33 76M33 21L56 13M33 21L55 47M33 76L55 47M33 76L56 82M55 47L90 50M56 13L90 50M56 82L90 50"/></svg>${Object.keys(graph).map((id) => `<button type="button" data-node="${id}" class="route-node--${id.toLowerCase()}">${id}<small>${compromised.has(id) ? "MIRRORED" : "CLEAN"}</small></button>`).join("")}</div>
    <output class="route-readout">S</output><div class="protocol-actions"><button type="button" class="protocol-command protocol-command--quiet" data-reset>RESET</button><button type="button" class="protocol-command" data-commit>COMMIT ROUTE</button></div>`);
  const root = container.firstElementChild;
  const readout = root.querySelector(".route-readout");
  root.querySelectorAll("[data-node]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.node;
    if (graph[path[path.length - 1]]?.includes(id)) { path.push(id); button.classList.add("is-selected"); readout.textContent = path.join(" → "); ctx.tone("move"); }
    else reject(root, ctx, "ROUTE DISCONTINUITY // NODE NOT ADJACENT");
    integrity(root, 20 + path.length * 11);
  }));
  root.querySelector("[data-reset]").addEventListener("click", () => { path.splice(1); root.querySelectorAll("[data-node]").forEach((node) => node.classList.remove("is-selected")); readout.textContent = "S"; integrity(root, 20); });
  root.querySelector("[data-commit]").addEventListener("click", () => {
    if (validateDossierProtocol("06", path)) success(root, ctx, "ROUTE SEALED // ZERO NEMETH TELEMETRY");
    else reject(root, ctx, path.some((node) => compromised.has(node)) ? "MIRROR DETECTED // COURIER EXPOSED" : "ROUTE INCOMPLETE // EXIT NOT REACHED");
  });
  integrity(root, 20);
}

function witness(container, ctx) {
  const rows = [
    ["KIRA", "AIRA TOOK THE BLAME", "VOICEPRINT + MEDICAL LOG", true],
    ["KPCO", "NO CHILDREN WERE PRESENT", "DERIVED FROM NEMETH MEMO", false],
    ["ICHIR0", "CLOTH FROM MEDICAL CABINET", "CABINET HASH + KIRA AUDIO", true],
    ["NEMETH", "TRAINING WAS VOLUNTARY", "SINGLE CORPORATE ORIGIN", false],
  ];
  container.innerHTML = shell("COVARIANCE", "WITNESS RELIABILITY MATRIX", "Promote only claims independently supported by a separate archive channel.", `
    <div class="witness-matrix">${rows.map(([source, claim, evidence], index) => `<button type="button" data-witness="${index}"><b>${source}</b><span>${claim}</span><small>${evidence}</small><i>UNWEIGHTED</i></button>`).join("")}</div><button type="button" class="protocol-command" data-audit>AUDIT COVARIANCE</button>`);
  const root = container.firstElementChild;
  root.querySelectorAll("[data-witness]").forEach((button) => button.addEventListener("click", () => {
    button.classList.toggle("is-selected");
    button.querySelector("i").textContent = button.classList.contains("is-selected") ? "PROMOTED" : "UNWEIGHTED";
    integrity(root, 30 + root.querySelectorAll(".is-selected").length * 18); ctx.tone("move");
  }));
  root.querySelector("[data-audit]").addEventListener("click", () => {
    const exact = validateDossierProtocol("07", [...root.querySelectorAll("[data-witness]")].map((button) => button.classList.contains("is-selected")));
    if (exact) success(root, ctx, "COVARIANCE PASSED // TESTIMONY CORROBORATED");
    else reject(root, ctx, "SOURCE CONTAMINATION // CORPORATE CLAIM PROMOTED");
  });
}

function rotor(container, ctx) {
  const target = [7, 2, 9];
  const values = [0, 0, 0];
  container.innerHTML = shell("ATRA-ROTOR", "ADAPTIVE NAME-SIGNAL ROTORS", "Phase the non-linear rotors until the intercepted output resolves to ATRA.", `
    <div class="rotor-constraints"><span>R1 + R2 ≡ 9</span><span>R2 + R3 ≡ 1</span><span>3R1 + 2R2 + R3 ≡ 4</span><span>R2 // EVEN PHASE</span></div>
    <div class="rotor-bank">${values.map((_, index) => `<button type="button" data-rotor="${index}"><small>ROTOR ${index + 1}</small><b>0</b><span>↻</span></button>`).join("")}</div><output class="rotor-output">OUTPUT // XQ-NULL</output><button type="button" class="protocol-command" data-decode>DECODE NAME SIGNAL</button>`);
  const root = container.firstElementChild;
  const update = () => {
    const distance = values.reduce((sum, value, index) => sum + Math.min(Math.abs(value - target[index]), 10 - Math.abs(value - target[index])), 0);
    root.querySelector(".rotor-output").textContent = distance === 0 ? "OUTPUT // ATRA" : `OUTPUT // ${["XQ", "L7", "NEM", "KAI"][distance % 4]}-${String(distance).padStart(2, "0")}`;
    integrity(root, 100 - distance * 6);
  };
  root.querySelectorAll("[data-rotor]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.rotor); values[index] = (values[index] + 1) % 10; button.querySelector("b").textContent = values[index]; ctx.tone("move"); update();
  }));
  root.querySelector("[data-decode]").addEventListener("click", () => {
    if (validateDossierProtocol("08", values)) success(root, ctx, "NAME SIGNAL RESOLVED // ATRA CHANNEL OPEN");
    else reject(root, ctx, "ROTOR COLLISION // FALSE IDENTITY GENERATED");
  });
  update();
}

function triangulation(container, ctx) {
  const target = { x: 62, y: 43 };
  let point = { x: 50, y: 50 };
  container.innerHTML = shell("BLAST-TRI", "SYNTOS EVENT TRIANGULATION", "Place the origin marker where all three recovered pressure fronts converge.", `
    <div class="triangulation-map" role="application"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><circle cx="15" cy="24" r="47.8"/><circle cx="82" cy="30" r="25.5"/><circle cx="31" cy="79" r="47.4"/></svg><i class="beacon beacon--a">A</i><i class="beacon beacon--b">B</i><i class="beacon beacon--c">C</i><button type="button" class="impact-marker" aria-label="Estimated impact origin"></button></div><output class="triangulation-readout">RESIDUAL // --</output><button type="button" class="protocol-command" data-triangulate>TRIANGULATE EVENT</button>`);
  const root = container.firstElementChild;
  const map = root.querySelector(".triangulation-map");
  const marker = root.querySelector(".impact-marker");
  map.addEventListener("pointerdown", (event) => {
    const rect = map.getBoundingClientRect();
    point = { x: clamp((event.clientX - rect.left) / rect.width * 100, 0, 100), y: clamp((event.clientY - rect.top) / rect.height * 100, 0, 100) };
    marker.style.left = `${point.x}%`; marker.style.top = `${point.y}%`;
    const residual = Math.hypot(point.x - target.x, point.y - target.y);
    root.querySelector(".triangulation-readout").textContent = `RESIDUAL // ${residual.toFixed(2)} km`;
    integrity(root, 100 - residual * 2.1); ctx.tone("move");
  });
  root.querySelector("[data-triangulate]").addEventListener("click", () => {
    if (validateDossierProtocol("09", point)) success(root, ctx, "ORIGIN CONFIRMED // OFFICIAL EPICENTER FALSIFIED");
    else reject(root, ctx, "PRESSURE FRONTS DIVERGE // RECALIBRATE ORIGIN");
  });
}

function consensus(container, ctx) {
  const sources = [
    ["DOCK CAMERA", "RAW FRAME / INDEPENDENT", 2],
    ["KPCO RELEASE", "NEMETH-DERIVED / EDITED", 0],
    ["LUMEN CACHE", "SILENT CARRIER / INDEPENDENT", 2],
    ["ANONYMOUS FORUM", "DOCK-DERIVED / LOW METADATA", 1],
    ["NEMETH MEMO", "ORIGIN CLAIM / CONFLICTED", 0],
  ];
  const states = Array(sources.length).fill(1);
  const names = ["SUPPRESS", "WEAK", "CORROBORATED"];
  container.innerHTML = shell("RUMOR-BAYES", "PUBLIC RUMOR CONSENSUS", "Assign each source a trust state: suppress, weak, or corroborated.", `
    <div class="consensus-board">${sources.map(([name, provenance], index) => `<button type="button" data-source="${index}"><b>${name}</b><small>${provenance}</small><span>WEAK</span></button>`).join("")}</div><div class="consensus-key"><span>0 SUPPRESS</span><span>1 WEAK</span><span>2 CORROBORATED</span></div><button type="button" class="protocol-command" data-consensus>CALCULATE CONSENSUS</button>`);
  const root = container.firstElementChild;
  root.querySelectorAll("[data-source]").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.source); states[index] = (states[index] + 1) % 3; button.querySelector("span").textContent = names[states[index]]; button.dataset.trust = states[index];
    integrity(root, 25 + states.filter((state, i) => state === sources[i][2]).length * 14); ctx.tone("move");
  }));
  root.querySelector("[data-consensus]").addEventListener("click", () => {
    if (validateDossierProtocol("10", states)) success(root, ctx, "CONSENSUS STABLE // CORPORATE NOISE REMOVED");
    else reject(root, ctx, "POSTERIOR UNSTABLE // SOURCE BIAS REMAINS");
  });
}

const builders = { "00": packet, "01": interference, "02": evidenceChain, "03": timeline, "04": memoryChain, "05": spectral, "06": route, "07": witness, "08": rotor, "09": triangulation, "10": consensus };

export function createDossierProtocolRunner({ onSolved, isSolved, tone, setParticlePulse }) {
  function mount(file, container) {
    if (!container || !file) return;
    container.classList.remove("hidden");
    (builders[file.id] || packet)(container, { file, onSolved, tone, setParticlePulse });
    const root = container.firstElementChild;
    root.addEventListener("pointermove", (event) => {
      const rect = root.getBoundingClientRect();
      root.style.setProperty("--protocol-pointer-x", `${((event.clientX - rect.left) / Math.max(1, rect.width) * 100).toFixed(1)}%`);
      root.style.setProperty("--protocol-pointer-y", `${((event.clientY - rect.top) / Math.max(1, rect.height) * 100).toFixed(1)}%`);
    }, { passive: true });
    if (isSolved(file.id)) {
      root.dataset.solved = "true";
      root.classList.add("is-solved");
      integrity(root, 100);
      status(root, "PROTOCOL PREVIOUSLY VERIFIED // EVIDENCE TRUSTED", "success");
      root.querySelectorAll("button,input").forEach((node) => { node.disabled = true; });
    }
  }
  return Object.freeze({ mount });
}
