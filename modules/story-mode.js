// THE CROSSING engine (v209): portal click -> anticipation -> white-out crossing ->
// branching story stage -> reverse crossing back to the map.
// Frugality contract: the warp is state-gated CSS (no new canvas, no new RAF loop);
// the stage is plain DOM; the only timer is one typewriter interval while text prints;
// sound reuses the synthesized v207 bed/whooshes through the callbacks passed in.
import { storyNodes, storyStart } from "./story-data.js?v=kpr-domain-core-229";
import { createStoryScenes } from "./story-scenes.js?v=kpr-portal-iris-211";
import { createPortalWarp } from "./portal-warp.js?v=kpr-v251-adaptive-warp";

export function createStoryMode({
  audioSystem,
  recordArchiveLeads,
  showCursorBubble,
} = {}) {
  const enterButton = document.getElementById("portal-enter");
  const flash = document.getElementById("portal-crossing-flash");
  const stage = document.getElementById("story-stage");
  const titleEl = document.getElementById("story-title");
  const statusEl = document.getElementById("story-status");
  const textEl = document.getElementById("story-text");
  const choicesEl = document.getElementById("story-choices");
  const root = document.documentElement;
  const transitionVideo = document.getElementById("portal-warp-transition-video");
  const transitionViewport = document.getElementById("portal-warp-transition-viewport");

  if (!enterButton || !flash || !stage || !textEl || !choicesEl) {
    return { active: () => false };
  }

  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

  const scenes = createStoryScenes(document.getElementById("story-scene"));
  const warp = createPortalWarp();
  window.__ichiroWarp = warp;

  // Keep initial loading light, then warm the crossing asset while the user is
  // already approaching the portal. This removes the click-time decode stall.
  const primeTransition = (event) => {
    if (!transitionVideo || Number(event.detail?.map || 0) < 0.52) {
      return;
    }
    transitionVideo.preload = "auto";
    if (transitionVideo.readyState === HTMLMediaElement.HAVE_NOTHING) {
      transitionVideo.load();
    }
    document.removeEventListener("kpr-archive-fold-progress", primeTransition);
  };
  document.addEventListener("kpr-archive-fold-progress", primeTransition);

  // Crossing choreography (v213): anticipation dive -> tunnel flying through
  // S-curves -> final straight where the exit light grows until it swallows the
  // screen -> white pulse at the crossing -> story frame spins in 360deg while
  // the tunnel decelerates behind. `approach` marks the start of the final straight.
  const T = prefersReducedMotion
    ? { antic: 60, approach: 280, tunnel: 520, settle: 420, exitHide: 120, exitBurst: 200, exitDone: 700 }
    : { antic: 380, approach: 3600, tunnel: 6600, settle: 1550, exitHide: 700, exitBurst: 1250, exitDone: 2600 };

  let storyActive = false;
  let crossing = false;
  let typeTimer = 0;
  let currentNode = null;
  const flags = new Set();
  const leadsThisRun = [];

  function whoosh(strength) {
    try {
      audioSystem?.playCinemaWhoosh?.(strength);
    } catch {}
  }

  function bed(intensity) {
    try {
      audioSystem?.setCinemaBedIntensity?.(intensity);
    } catch {}
  }

  // Button click audio: the global pointerdown handler in app-events already plays
  // the UI click for every <button>, so this module must NOT play it again (v213
  // fix for duplicated button sound).

  function stopTypewriter() {
    if (typeTimer) {
      window.clearInterval(typeTimer);
      typeTimer = 0;
    }
  }

  function renderChoices(node) {
    choicesEl.innerHTML = "";
    node.choices.forEach((choice) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story-choice";
      button.textContent = choice.label;
      button.addEventListener("click", () => {
        if (choice.flag) {
          flags.add(choice.flag);
        }
        if (Array.isArray(choice.leads) && choice.leads.length) {
          const fresh = recordArchiveLeads ? recordArchiveLeads(choice.leads) : [];
          for (const id of fresh || []) {
            leadsThisRun.push(id);
          }
        }
        if (choice.to === "__exit__") {
          exitStory();
        } else {
          whoosh(0.6);
          showNode(choice.to);
        }
      });
      choicesEl.append(button);
    });
    stage.classList.add("story-stage--choices-ready");
  }

  function showNode(nodeId) {
    const node = storyNodes[nodeId];
    if (!node) {
      exitStory();
      return;
    }
    currentNode = node;
    stopTypewriter();
    scenes.play(nodeId);
    stage.classList.remove("story-stage--choices-ready");
    titleEl.textContent = node.title;
    statusEl.textContent = node.status || "";
    choicesEl.innerHTML = "";
    const fullText = node.text;

    if (prefersReducedMotion) {
      textEl.textContent = fullText;
      renderChoices(node);
      return;
    }

    textEl.textContent = "";
    let index = 0;
    // One interval, 3 chars per tick: reads as typed, finishes long nodes quickly.
    typeTimer = window.setInterval(() => {
      index = Math.min(fullText.length, index + 3);
      textEl.textContent = fullText.slice(0, index);
      if (index >= fullText.length) {
        stopTypewriter();
        renderChoices(node);
      }
    }, 24);
  }

  function skipTypewriter() {
    if (!typeTimer || !currentNode) {
      return;
    }
    stopTypewriter();
    textEl.textContent = currentNode.text;
    renderChoices(currentNode);
  }

  function beginCrossing() {
    if (crossing || storyActive) {
      return;
    }
    crossing = true;
    enterButton.classList.add("portal-enter--engaged");
    bed(0.06); // anticipation: the bed almost dies before the jump
    whoosh(0.7);
    root.classList.add("kpr-warp-dive"); // the map starts falling into the portal
    root.classList.add("kpr-portal-entering"); // grow light from the center of the portal
    window.setTimeout(() => {
      whoosh(1.35);
      bed(0.95);
      root.classList.remove("kpr-portal-entering"); // remove entrance flash
      
      if (transitionVideo) {
        if (transitionViewport) {
          transitionViewport.classList.add("portal-warp-transition-viewport--active");
        }
        transitionVideo.currentTime = 0;
        transitionVideo.play().catch((err) => {
          console.warn("Transition video unavailable; engaging the live WebGL crossing.", err);
          transitionViewport?.classList.add("portal-warp-transition-viewport--fallback");
          warp.engage();
          window.setTimeout(() => warp.finalApproach(), 1900);
          window.setTimeout(() => root.classList.add("kpr-portal-crossing", "kpr-redirect-fade"), 4100);
          window.setTimeout(() => { window.location.href = "https://neweden.fun"; }, 5000);
        });
        
        // 3D Parallax Tilt & Unified Next-Gen Game Loop (v215)
        let targetMouseX = 0;
        let targetMouseY = 0;
        let smoothMouseX = 0;
        let smoothMouseY = 0;

        const onMouseMove = (e) => {
          // Normalize coordinates to -1..1 range
          targetMouseX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
          targetMouseY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
        };
        window.addEventListener("mousemove", onMouseMove);

        // Real-time HUD coordinate updates setup
        const coordXSpan = document.getElementById("hud-coord-x");
        const coordYSpan = document.getElementById("hud-coord-y");
        const container = document.getElementById("portal-warp-transition-container");
        const panel = document.querySelector(".portal-warp-overlay-panel");
        const percentSpan = document.querySelector(".portal-warp-transition-overlay .loading-percent");
        const progressBar = document.querySelector(".portal-warp-transition-overlay .progress-bar-fill");
        const logContainer = document.querySelector(".portal-warp-overlay-log");
        const baseCoordX = 45.228;
        const baseCoordY = 12.004;
        let hudFrameCount = 0;

        // Canvas Particle Speedlines Setup
        const canvas = document.getElementById("portal-warp-speedlines-canvas");
        const ctx = canvas ? canvas.getContext("2d") : null;
        let speedlineWidth = 0;
        let speedlineHeight = 0;
        let speedlineDpr = 1;

        const resizeCanvas = () => {
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            speedlineWidth = Math.max(1, rect.width);
            speedlineHeight = Math.max(1, rect.height);
            speedlineDpr = Math.min(window.devicePixelRatio || 1, 1.75);
            canvas.width = Math.round(speedlineWidth * speedlineDpr);
            canvas.height = Math.round(speedlineHeight * speedlineDpr);
            ctx?.setTransform(speedlineDpr, 0, 0, speedlineDpr, 0, 0);
          }
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const particles = [];
        const maxParticles = prefersReducedMotion ? 0 : 85;
        for (let i = 0; i < maxParticles; i++) {
          particles.push({
            angle: Math.random() * Math.PI * 2,
            distance: Math.random() * 600 + 20,
            speed: Math.random() * 12 + 6,
            length: Math.random() * 45 + 15,
            width: Math.random() * 1.6 + 0.6,
            colorOpacity: Math.random() * 0.45 + 0.25
          });
          const particle = particles[particles.length - 1];
          particle.cosA = Math.cos(particle.angle);
          particle.sinA = Math.sin(particle.angle);
        }

        let isTransitioning = true;
        let animationFrameId = null;
        let glitchTimer = 0;
        let glitchBlur = 0;
        let glitchSat = 1;

        const draw = () => {
          if (!isTransitioning) return;

          // Ultra-smooth physics lerp mouse parallax for cinematic visor motion
          smoothMouseX += (targetMouseX - smoothMouseX) * 0.045;
          smoothMouseY += (targetMouseY - smoothMouseY) * 0.045;

          // Get current progress
          const duration = transitionVideo.duration || 12.04;
          const progress = Math.min(100, Math.floor((transitionVideo.currentTime / duration) * 100));

          // 1. Camera Shake (Rumble)
          let shakeIntensity = 0;
          if (progress > 15 && progress <= 85) {
            shakeIntensity = (progress - 15) / 70; // 0 to 1
          } else if (progress > 85 && progress <= 95) {
            shakeIntensity = 1.0 + (progress - 85) / 10 * 0.6; // 1 to 1.6
          } else if (progress > 95) {
            shakeIntensity = Math.max(0, 1.6 - (progress - 95) / 5 * 1.6); // fade to 0
          }

          const maxShake = 7.5; // max pixels offset
          // Layered harmonic shake keeps physical continuity between frames.
          // Random-per-frame jitter read as a cheap glitch and shimmered on 120 Hz displays.
          const shakeTime = performance.now() * 0.001;
          const shakeX = (Math.sin(shakeTime * 31.0) * 0.62 + Math.sin(shakeTime * 53.0 + 1.7) * 0.38) * maxShake * 0.5 * shakeIntensity;
          const shakeY = (Math.sin(shakeTime * 27.0 + 0.8) * 0.58 + Math.sin(shakeTime * 47.0 + 2.2) * 0.42) * maxShake * 0.5 * shakeIntensity;
          const shakeRot = (Math.sin(shakeTime * 19.0 + 0.35) * 0.7 + Math.sin(shakeTime * 37.0) * 0.3) * 1.25 * shakeIntensity;

          // 2. Parallax calculations
          if (container) {
            const xAxisBg = -smoothMouseX * 15; 
            const yAxisBg = -smoothMouseY * 15;
            const transX = -smoothMouseX * 30;
            const transY = -smoothMouseY * 30;
            container.style.transform = `translateX(${transX + shakeX}px) translateY(${transY + shakeY}px) rotateY(${xAxisBg}deg) rotateX(${-yAxisBg}deg) rotateZ(${shakeRot}deg) scale(1.02)`;
          }

          if (panel) {
            const xAxisPanel = -smoothMouseX * 28; 
            const yAxisPanel = -smoothMouseY * 28;
            const panelTransX = -smoothMouseX * 42; 
            const panelTransY = -smoothMouseY * 42;
            
            // Text chromatic aberration based on mouse speed
            const aberr = Math.max(0, Math.min(8.5, Math.hypot(smoothMouseX - targetMouseX, smoothMouseY - targetMouseY) * 26));
            panel.style.transform = `translateX(${panelTransX}px) translateY(${panelTransY}px) rotateY(${xAxisPanel}deg) rotateX(${-yAxisPanel}deg) translateZ(40px)`;
            panel.style.setProperty("--aberration", aberr.toFixed(2));

            // Dynamic panel glitch updates
            if (progress > 25 && Math.random() < 0.038 && glitchTimer <= 0) {
              glitchTimer = Math.floor(Math.random() * 7) + 2; // frames
              glitchBlur = Math.random() * 3.8 + 0.6;
              glitchSat = Math.random() < 0.55 ? 0.08 : 2.6;
            }

            if (glitchTimer > 0) {
              glitchTimer--;
              panel.style.setProperty("--hud-glitch-blur", `${glitchBlur}px`);
              panel.style.setProperty("--hud-glitch-sat", glitchSat);
            } else {
              panel.style.setProperty("--hud-glitch-blur", "0px");
              panel.style.setProperty("--hud-glitch-sat", "1");
            }
          }

          // 3. Coordinate updates
          hudFrameCount++;
          if (hudFrameCount >= 8) {
            hudFrameCount = 0;
            if (coordXSpan && coordYSpan) {
              const jitterX = (Math.random() - 0.5) * 0.04;
              const jitterY = (Math.random() - 0.5) * 0.03;
              coordXSpan.textContent = (baseCoordX + jitterX).toFixed(3);
              coordYSpan.textContent = (baseCoordY + jitterY).toFixed(3);
            }
          }

          // 4. Canvas Speedlines Particles
          if (canvas && ctx) {
            ctx.setTransform(speedlineDpr, 0, 0, speedlineDpr, 0, 0);
            ctx.clearRect(0, 0, speedlineWidth, speedlineHeight);

            // Warp center bends based on mouse smooth parallax
            const centerX = speedlineWidth / 2 - smoothMouseX * 110;
            const centerY = speedlineHeight / 2 - smoothMouseY * 55;
            const speedFactor = 1.0 + (progress / 100) * 3.6;
            const speedlineColors = ["rgb(180, 74, 255)", "rgb(54, 224, 239)", "rgb(239, 72, 201)"];
            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";

            for (let i = 0; i < particles.length; i++) {
              const p = particles[i];
              p.distance += p.speed * speedFactor;

              if (p.distance > Math.max(speedlineWidth, speedlineHeight)) {
                p.distance = Math.random() * 40 + 10;
                p.angle = Math.random() * Math.PI * 2;
                p.cosA = Math.cos(p.angle);
                p.sinA = Math.sin(p.angle);
                p.speed = Math.random() * 12 + 6;
              }

              const cosA = p.cosA;
              const sinA = p.sinA;
              const xStart = centerX + cosA * p.distance;
              const yStart = centerY + sinA * p.distance;
              const xEnd = centerX + cosA * (p.distance + p.length * speedFactor);
              const yEnd = centerY + sinA * (p.distance + p.length * speedFactor);

              ctx.beginPath();
              ctx.moveTo(xStart, yStart);
              ctx.lineTo(xEnd, yEnd);
              
              // Allocation-free spectral streaks. The old implementation created
              // one CanvasGradient per particle per frame (10k+/s at 120 Hz).
              const opacity = p.colorOpacity * Math.min(1.0, p.distance / 110);
              ctx.globalAlpha = opacity;
              ctx.strokeStyle = speedlineColors[i % speedlineColors.length];
              ctx.shadowColor = speedlineColors[(i + 1) % speedlineColors.length];
              ctx.shadowBlur = 3 + speedFactor * 0.9;
              ctx.lineWidth = p.width * (0.95 + (progress / 100) * 0.95);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = "source-over";
          }

          animationFrameId = requestAnimationFrame(draw);
        };
        animationFrameId = requestAnimationFrame(draw);

        const logLinesList = [
          "INITIALIZING WARP CONNECTIVITY...",
          "STATUS: WARP DRIVE CAPACITY AT 100%",
          "CALIBRATING STELLAR CHROMA LENS...",
          "WARPING COORD GRID PERIMETER...",
          "HIGH REFRACTION DETECTED... INJECTING VEIL SHIELD",
          "SYNCING QUANTUM DECRYPTION CODES...",
          "CROSSING TIME-SPACE COGNITIVE BOUNDARIES...",
          "AUTO-NAV CONNECTED: TARGET REACHED",
          "DECRUNCHING NEW EDEN SECTOR SIGNAL...",
          "TRANSFERRING PERMIT STATE...",
          "SECURE ARCHIVE OVERLAY ENABLED",
          "TRAVELING TO NEW EDEN..."
        ];

        const soundMilestones = [20, 40, 55, 68, 78, 85, 90, 93, 96];
        const triggeredMilestones = new Set();
        let lastLogCount = -1;
        
        const onTimeUpdate = () => {
          const duration = transitionVideo.duration || 12.04;
          const progress = Math.min(100, Math.floor((transitionVideo.currentTime / duration) * 100));
          
          if (percentSpan) {
            percentSpan.textContent = progress;
          }
          if (progressBar) {
            progressBar.style.width = `${progress}%`;
          }

          // Dynamic whoosh acceleration sound triggers
          for (const milestone of soundMilestones) {
            if (progress >= milestone && !triggeredMilestones.has(milestone)) {
              triggeredMilestones.add(milestone);
              const sStrength = 0.55 + (milestone / 100) * 0.85;
              whoosh(sStrength);
            }
          }

          // Dynamic logging simulation
          if (logContainer) {
            const totalLinesToShow = Math.min(logLinesList.length, Math.floor((progress / 100) * logLinesList.length) + 1);
            if (totalLinesToShow !== lastLogCount) {
              lastLogCount = totalLinesToShow;
              let logHtml = "";
              for (let i = 0; i < totalLinesToShow; i++) {
                const prefix = i === totalLinesToShow - 1 ? "> " : "  ";
                logHtml += `<div class="log-line" style="--line-idx: ${i}">${prefix}${logLinesList[i]}</div>`;
              }
              logContainer.innerHTML = logHtml;
            }
          }

          if (transitionVideo.duration && transitionVideo.currentTime >= transitionVideo.duration - 1.4) {
            transitionViewport?.classList.add("portal-warp-transition-expanding");
          }

          if (transitionVideo.duration && transitionVideo.currentTime >= transitionVideo.duration - 0.6) {
            root.classList.add("kpr-portal-crossing", "kpr-redirect-fade");
            transitionVideo.removeEventListener("timeupdate", onTimeUpdate);
          }
        };
        transitionVideo.addEventListener("timeupdate", onTimeUpdate);
        
        transitionVideo.addEventListener("ended", () => {
          isTransitioning = false;
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("resize", resizeCanvas);
          window.location.href = "https://neweden.fun";
        }, { once: true });
      } else {
        window.location.href = "https://neweden.fun";
      }
    }, T.antic);
  }

  function exitStory() {
    if (!storyActive) {
      return;
    }
    stopTypewriter();
    scenes.stop();
    whoosh(1.2);
    // Reverse: the panel spins down to a point, the tunnel runs backwards
    // (falling home through the portal), then a white return pulse.
    stage.classList.add("story-stage--spin-out");
    root.classList.add("kpr-cinema-move");
    window.setTimeout(() => {
      warp.engageReverse();
      bed(0.7);
      stage.classList.add("hidden");
      stage.classList.remove("story-stage--spin-out");
      storyActive = false;
    }, T.exitHide);
    window.setTimeout(() => {
      root.classList.add("kpr-portal-crossing");
      warp.release();
      bed(0);
      if (leadsThisRun.length && showCursorBubble) {
        showCursorBubble(
          `Signal home! ${leadsThisRun.length} archive lead${leadsThisRun.length > 1 ? "s" : ""} identified. Verify the evidence protocols to recover access.`,
          3600
        );
      }
    }, T.exitHide + T.exitBurst);
    window.setTimeout(() => {
      root.classList.remove("kpr-portal-crossing", "kpr-cinema-move");
      enterButton.classList.remove("portal-enter--engaged");
    }, T.exitDone);
  }

  enterButton.addEventListener("click", (event) => {
    event.stopPropagation();
    beginCrossing();
  });

  // Click anywhere on printing text completes it instead of forcing the wait.
  stage.addEventListener("click", (event) => {
    if (event.target.closest(".story-choice")) {
      return;
    }
    skipTypewriter();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && storyActive && !crossing) {
      exitStory();
    }
  });

  window.addEventListener("pageshow", () => {
    crossing = false;
    storyActive = false;
    transitionVideo?.pause();
    if (transitionVideo) transitionVideo.currentTime = 0;
    transitionViewport?.classList.remove(
      "portal-warp-transition-viewport--active",
      "portal-warp-transition-viewport--fallback",
      "portal-warp-transition-expanding"
    );
    root.classList.remove(
      "kpr-warp-dive",
      "kpr-portal-entering",
      "kpr-cinema-move",
      "kpr-portal-crossing",
      "kpr-redirect-fade"
    );
    enterButton.classList.remove("portal-enter--engaged");
    warp.release();
    bed(0);
  });

  return {
    active: () => storyActive || crossing,
  };
}
