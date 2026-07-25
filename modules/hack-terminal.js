import { randomHex } from "./helpers.js";

const intrusionLines = [
  "tls.handshake nemeth-gw-07:443 cipher=AES256-GCM",
  "acl probe kpco.blackcell.local / shadow-route",
  "syn 10.44.7.19 -> 172.18.0.4 dpt=8443",
  "jwt kid=kpco-mirror-17 sig=spoofed",
  "vault.nemeth/corpsec/containment index:partial",
  "icewall segment 04 checksum drift +0x7A",
  "route add 10.91.0.0/16 via dead-relay",
  "x509 subject=KPCO Security Body status=cloned",
  "siem event suppressed :: civilian_log=false",
  "black-cell branch discovered: nemeth/kpco/ghost",
  "decrypt block 0x7f3a9c mode=ctr residue=low",
  "kerberos tgt replay window 03 accepted",
  "ids signature NEMETH-ICE-112 muted",
  "packet loss induced to mask archive pull",
  "containment ledger hash 9f:2d:aa:71 mismatch",
  "firewall rule shadow.accept inserted ttl=04",
  "memory fragment route: LUMEN/name_signal",
  "operator badge: false positive / no alert",
  "scp archive shard 08 throttled 31kb/s",
  "root shell denied -> fallback service token",
  "policy rewrite pending: kpco security branch",
  "nemeth archive node answers in old protocol",
  "trace scrub phase=2 delta=0.018",
  "port knock 7-7-1-9 accepted",
  "correlation id burned before uplink",
  "zero-trust broker marked route internal",
  "hsm challenge bypassed with stale mirror",
  "alarm channel loops into null sink",
  "recover dossier manifest: read-only",
  "security body handshake spoof complete",
];

export function createHackTerminal({ hackRain }) {
  function makeLine(index) {
    const base = intrusionLines[Math.floor(Math.random() * intrusionLines.length)];
    const time = `00:${String(Math.floor(index / 8)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}.${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`;
    const tag = Math.random() > 0.74 ? "WARN" : Math.random() > 0.52 ? "TRACE" : "OK";
    const suffix = Math.random() > 0.62
      ? ` hash=${randomHex(8)}:${randomHex(4)}`
      : ` seq=${randomHex(4)} route=${Math.floor(Math.random() * 9) + 1}`;
    return `[${time}] ${tag} ${base}${suffix}`;
  }

  function seedRain() {
    if (!hackRain) {
      return;
    }

    hackRain.innerHTML = "";
    const columnCount = Math.min(54, Math.max(26, Math.floor(window.innerWidth / 30)));
    const palette = [
      { color: "rgba(184, 242, 161, 0.46)", glow: "rgba(184, 242, 161, 0.28)" },
      { color: "rgba(98, 228, 220, 0.38)", glow: "rgba(98, 228, 220, 0.24)" },
      { color: "rgba(215, 92, 80, 0.28)", glow: "rgba(215, 92, 80, 0.18)" },
      { color: "rgba(232, 225, 212, 0.24)", glow: "rgba(232, 225, 212, 0.12)" },
    ];

    for (let column = 0; column < columnCount; column += 1) {
      const span = document.createElement("span");
      const depth = Math.random();
      const entryCount = 14 + Math.floor(Math.random() * 18);
      const lines = [];
      for (let index = 0; index < entryCount; index += 1) {
        lines.push(makeLine(column * entryCount + index));
      }

      const paletteEntry = palette[Math.floor(Math.random() * palette.length)];
      span.textContent = lines.join("\n");
      span.style.setProperty("--x", `${(column / columnCount) * 100 + (Math.random() - 0.5) * 2.2}%`);
      span.style.setProperty("--w", `${120 + Math.random() * 180}px`);
      span.style.setProperty("--duration", `${5.8 + depth * 7.5}s`);
      span.style.setProperty("--delay", `${-Math.random() * 10}s`);
      span.style.setProperty("--size", `${7 + depth * 4.2}px`);
      span.style.setProperty("--alpha", `${0.16 + depth * 0.34}`);
      span.style.setProperty("--blur", `${depth < 0.18 ? 0.45 : 0}px`);
      span.style.setProperty("--color", paletteEntry.color);
      span.style.setProperty("--glow", paletteEntry.glow);
      hackRain.append(span);
    }
  }

  return {
    makeLine,
    seedRain,
  };
}
