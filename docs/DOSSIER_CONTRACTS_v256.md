# Dossier Contracts v256

## Result

All eleven dossier protocols now use a shared deterministic validator. The
runtime and CI therefore agree on what constitutes valid evidence.

The audit found and fixed two real soft locks:

- `COVARIANCE` compared selection booleans with evidence-description strings.
- `RUMOR-BAYES` compared trust states with provenance-description strings.

Both interfaces could previously reject the correct answer indefinitely.

## Contract

`modules/dossier-contracts.mjs` owns:

- canonical protocol IDs `00` through `10`
- one deterministic solution per protocol
- tolerances for analog controls
- route adjacency and compromised-node rules
- pure `validateDossierProtocol(id, candidate)` behavior

`modules/dossier-protocols.js` owns presentation and interaction but delegates
every success decision to that validator.

## Progression proof

`npm run test:dossiers` verifies:

- exactly eleven archive files and contracts
- each canonical solution is accepted
- a deliberate mutation is rejected
- each runtime protocol calls its shared validator
- every unlock points to an existing dossier
- no dossier unlocks itself
- all eleven dossiers are reachable from the initial unlock set

The report is written to `.artifacts/dossiers/dossier-contract-v256.json`.

The Chromium golden path additionally solves `CRC-17` through the visible UI
and proves that dossier `01` becomes available.

## Rollback

Revert the v256 commit. Persistent archive state is unchanged and requires no
migration.
