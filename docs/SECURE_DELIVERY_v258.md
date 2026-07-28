# Secure Delivery v258

## Objective

Deliver the approved v257 experience with predictable browser behavior,
defensive defaults and a reproducible rollback identity. This wave does not
change visuals, audio, WebGL, interaction timing, dossier content or assets.

## Browser boundary

`config/delivery-policy.v258.json` is the single policy source for:

- Content Security Policy;
- anti-framing, `nosniff`, origin isolation and referrer controls;
- disabled camera, microphone and geolocation permissions;
- HTTPS-only HSTS activation;
- document, code and asset cache classes;
- dependency licenses and blocked resolution protocols.

The CSP keeps dynamic inline styles because the approved shaders, parallax and
particle systems update CSS properties at runtime. It does not allow inline
scripts, `eval`, third-party code execution, framing or external connections.
`blob:` is allowed only for local media, workers and GLTF embedded-texture
decoding; no remote host is added to `connect-src`.

## Cache contract

- HTML uses `no-store`.
- JavaScript, MJS, CSS, JSON and authored text use `no-cache`.
- media and visual assets use one-day freshness plus stale revalidation.
- un-hashed asset names are never marked `immutable`.
- ETag and Last-Modified validators support 304 responses.
- byte-range responses remain available for video and audio.

This deliberately favors correctness over a misleading one-year immutable
cache. Content-addressed file names may be introduced only through a measured
deployment pipeline.

## Supply chain

- Direct dependencies are pinned to exact versions.
- Every transitive package must have an npm SHA-512 integrity value.
- Resolutions must use the HTTPS npm registry.
- Licenses are checked against the explicit allowlist.
- CI additionally runs `npm audit --omit=dev --audit-level=high`.

## Release identity

`tools/release-manifest.js` fingerprints runtime source and statically
referenced assets. Materialized files use content SHA-256; sparse Git blobs use
Git-index SHA-256; Git LFS pointers retain their canonical SHA-256 OID and
declared production size.

The deterministic report is written to:

`.artifacts/delivery/release-manifest-v258.json`

Running the generator twice on the same state must produce the same root
fingerprint.

## Verification

```bash
npm run test:delivery
npm run audit:dependencies
npm test
npm run test:e2e
```

CI retains delivery evidence for 30 days.

## Rollback

1. Select the last approved commit and its delivery artifact.
2. Regenerate the release manifest from that commit.
3. Require an identical root fingerprint before deployment.
4. Deploy that exact tree; no asset migration or state conversion is required.
5. Keep HTML uncached so rollback discovery is immediate.
