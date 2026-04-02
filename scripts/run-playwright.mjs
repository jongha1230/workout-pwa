import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const rawArgs = process.argv.slice(2);
const forwardedArgs = [];
const require = createRequire(import.meta.url);

let productionMode = true;

for (const arg of rawArgs) {
  if (arg === "--production") {
    productionMode = true;
    continue;
  }

  if (arg === "--dev") {
    productionMode = false;
    continue;
  }

  forwardedArgs.push(arg);
}

const env = {
  ...process.env,
};

if (productionMode) {
  delete env.PLAYWRIGHT_USE_DEV_SERVER;
} else {
  env.PLAYWRIGHT_USE_DEV_SERVER = "true";
}

const playwrightPackagePath = require.resolve("playwright/package.json");
const playwrightCliPath = path.join(
  path.dirname(playwrightPackagePath),
  "cli.js",
);
const child = spawn(
  process.execPath,
  [playwrightCliPath, "test", ...forwardedArgs],
  {
    env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error("Failed to launch Playwright.", error);
  process.exit(1);
});
