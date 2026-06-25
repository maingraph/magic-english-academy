import { spawn } from "node:child_process";

const commands = [
  ["npm", ["run", "dev:web"]],
  ["npm", ["run", "dev:api"]]
];
const children = commands.map(([command, args]) =>
  spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  })
);
let stopping = false;

function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code && code !== 0) {
      stop();
      process.exitCode = code;
    }
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
