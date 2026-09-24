import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
function option(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const provider = option("--provider");
const directory = option("--data-dir") ?? process.env.PLUGIN_DATA;
if ((provider !== "typesafe" && provider !== "openrouter") || !directory) {
  throw new Error("Usage: bun scripts/configure.ts --data-dir <PLUGIN_DATA path> --provider typesafe|openrouter");
}

const keyName = provider === "openrouter" ? "OPENROUTER_API_KEY" : "JEV_API_KEY";
const apiKey = process.env[keyName]?.trim();
if (!apiKey) throw new Error(`${keyName} must be set in this shell. No credentials were written.`);

const target = join(resolve(directory), "credentials.json");
mkdirSync(resolve(directory), { recursive: true });
writeFileSync(target, JSON.stringify({ provider, apiKey, ...(process.env.JEV_MODEL?.trim() ? { model: process.env.JEV_MODEL.trim() } : {}) }), { encoding: "utf8", mode: 0o600 });
chmodSync(target, 0o600);
process.stdout.write(`Jev ${provider} credentials saved to PLUGIN_DATA.\n`);
