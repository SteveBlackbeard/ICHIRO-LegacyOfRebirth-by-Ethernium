// Secret Konami / Ichiro Code Protocol (v226)
// Listens globally for key sequences to reveal classified Yatagarasu databases.

export function initSecretProtocol(showCursorBubble) {
  const KONAMI_SEQ = [
    "ArrowUp", "ArrowUp", 
    "ArrowDown", "ArrowDown", 
    "ArrowLeft", "ArrowRight", 
    "ArrowLeft", "ArrowRight", 
    "b", "a"
  ];
  const ICHIRO_SEQ = ["i", "c", "h", "i", "r", "o"];

  let inputSequence = [];
  let isTriggered = false;
  let container = null;

  function createOverlay() {
    container = document.createElement("div");
    container.className = "secret-protocol-overlay";
    container.setAttribute("aria-hidden", "true");
    container.innerHTML = `
      <div class="secret-protocol-bg-lines"></div>
      <div class="secret-protocol-content">
        <header class="secret-protocol-header">
          <span class="warning-tag">!! CLASSIFIED CODENAME ACCESS !!</span>
          <h2>YATAGARASU DEEP ARCHIVE</h2>
        </header>
        <div class="secret-protocol-body">
          <p class="blink-text">// ESTABLISHING ULTRA-CLEARANCE SECURE LINK...</p>
          <div class="classified-lore-log">
            [SYS_LOG: 2026.07.21-00.41]<br/>
            // KEEPER ID: #2390 - CLASS: BLADEWALKER<br/>
            // STATUS: REBORN FROM THE ETHERNIUM COLD STORAGE FLUIDS.<br/><br/>
            
            <em>"Order cannot live without chaos. Balance would not exist."</em><br/><br/>
            
            Ichiro was not simply rebuilt; he was synthesized directly from the remains of the old Haven core under code name Keigami. The Yatagarasu crew kept him in state-gated stasis, balancing his cybernetic wounds against raw kinetic energy. 
            The energy blade remains his only anchor to the active timeline. Any deviation from the core balance limits his timeline survival threshold to less than 11%.
          </div>
          <button class="secret-protocol-close-btn" type="button">CLOSE SECURE CONNECTION</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    
    container.querySelector(".secret-protocol-close-btn").addEventListener("click", () => {
      deactivate();
    });
  }

  function activate() {
    if (isTriggered) return;
    isTriggered = true;

    if (!container) createOverlay();
    
    container.classList.add("is-active");
    document.body.classList.add("secret-protocol-active");

    if (showCursorBubble) {
      showCursorBubble("ACCESSING SECURE CHANNELS...", 3000);
    }

    // Play code success beep if Web Audio is available
    playBeep();
  }

  function deactivate() {
    if (!isTriggered) return;
    isTriggered = false;

    if (container) {
      container.classList.remove("is-active");
    }
    document.body.classList.remove("secret-protocol-active");
  }

  function playBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }

  function checkSequence() {
    // 1. Check Konami Code
    const lenK = KONAMI_SEQ.length;
    const recentK = inputSequence.slice(-lenK).map(k => k.toLowerCase());
    const matchK = KONAMI_SEQ.every((val, idx) => val.toLowerCase() === recentK[idx]);

    // 2. Check "ichiro"
    const lenI = ICHIRO_SEQ.length;
    const recentI = inputSequence.slice(-lenI).map(k => k.toLowerCase());
    const matchI = ICHIRO_SEQ.every((val, idx) => val.toLowerCase() === recentI[idx]);

    if (matchK || matchI) {
      activate();
      inputSequence = []; // clear
    }
  }

  window.addEventListener("keydown", (e) => {
    if (isTriggered) {
      if (e.key === "Escape") {
        deactivate();
      }
      return;
    }

    inputSequence.push(e.key);
    if (inputSequence.length > 20) {
      inputSequence.shift();
    }

    checkSequence();
  });
}
