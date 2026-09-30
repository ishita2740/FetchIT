#!/usr/bin/env node
const { readFileSync } = require("fs");
const { resolve } = require("path");
const { spawnSync } = require("child_process");

const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");
const envContent = readFileSync(envPath, "utf8");
const extraEnv = {};

for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  extraEnv[key] = val;
}

const env = { ...process.env, ...extraEnv };

const result = spawnSync(
  "npx",
  ["tsx", resolve(root, "scripts", "test-e2e-qa.ts")],
  { env, stdio: "inherit", cwd: root, shell: true }
);

process.exit(result.status ?? 1);
