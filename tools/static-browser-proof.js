const { resolve } = require("node:path");

const root = resolve(__dirname, "..");
process.env.KPR_E2E_SERVER_ROOT = resolve(root, ".artifacts", "site");
process.env.KPR_E2E_ARTIFACTS = ".artifacts/e2e-static";
process.env.KPR_E2E_PORT = process.env.KPR_E2E_PORT || "4174";

require("./e2e-proof.js");
