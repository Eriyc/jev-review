import { readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";

const [goalArg, command, argument] = process.argv.slice(2);
if (!goalArg || !command) throw new Error("usage: beads.ts <goal-directory> ready|task|headings|read|slice <argument>");
const goal = resolve(goalArg);
const limit = command === "task" ? 8192 : command === "ready" || command === "receipt" ? 2048 : 4096;

function bounded(value: unknown): void {
  const output = JSON.stringify(value);
  if (Buffer.byteLength(output) > limit) throw new Error(`bounded context exceeds ${limit} bytes`);
  console.log(output);
}

function bead(args: string[]): any {
  const child = Bun.spawnSync(["bd", "--directory", goal, ...args, "--json"], { stdout: "pipe", stderr: "pipe" });
  if (child.exitCode !== 0) throw new Error(child.stderr.toString());
  return JSON.parse(child.stdout.toString());
}

if (command === "ready") {
  const rows = bead(["ready", "--brief", "--limit", "100"]);
  bounded(rows.map((row: any) => ({ id: row.id, title: row.title, status: row.status, writable_paths: row.metadata?.writable_paths ?? [] })));
} else if (command === "task") {
  if (!argument || !/^[-\w.]+$/.test(argument)) throw new Error("task requires an issue id");
  const [row] = bead(["show", argument, "--brief-deps"]);
  if (!row) throw new Error("issue not found");
  bounded({ id: row.id, title: row.title, description: row.description, acceptance_criteria: row.acceptance_criteria, status: row.status, metadata: row.metadata, dependencies: row.dependencies?.map((d: any) => ({ id: d.id, status: d.status, dependency_type: d.dependency_type })), revision: row.revision });
} else if (command === "receipt") {
  if (!argument) throw new Error("receipt requires a JSON file");
  const receipt = JSON.parse(readFileSync(resolve(argument), "utf8"));
  const keys = ["task_id", "status", "base_sha", "changed_paths", "checks", "open_findings", "next_action"];
  if (keys.some((key) => !(key in receipt)) || Object.keys(receipt).some((key) => !keys.includes(key))) throw new Error("invalid receipt fields");
  if (!/^[0-9a-f]{40}$/.test(receipt.base_sha) || !Array.isArray(receipt.changed_paths) || !Array.isArray(receipt.checks)) throw new Error("invalid receipt values");
  bounded(receipt);
} else if (["headings", "read", "slice", "repo-headings", "repo-read", "repo-slice"].includes(command)) {
  if (!argument) throw new Error("document command requires a path");
  const root = resolve(command.startsWith("repo-") ? "." : goal);
  const file = resolve(root, argument);
  if (isAbsolute(argument) || relative(root, file).startsWith("..")) throw new Error("path escapes document root");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  if (command.endsWith("headings")) {
    bounded(lines.flatMap((line, index) => /^#{1,6} /.test(line) ? [{ line: index + 1, heading: line }] : []));
  } else if (command.endsWith("slice")) {
    const start = Number(process.argv[5]);
    const count = Number(process.argv[6] ?? 20);
    if (!Number.isInteger(start) || start < 1 || !Number.isInteger(count) || count < 1 || count > 100) throw new Error("slice requires start and count <=100");
    bounded(lines.slice(start - 1, start - 1 + count).map((line, index) => `${start + index}: ${line}`));
  } else {
    const heading = process.argv[5];
    if (!heading) throw new Error("read requires heading text");
    const start = lines.findIndex((line) => line.trim() === heading.trim());
    if (start < 0) throw new Error("heading not found");
    const depth = lines[start].match(/^#+/)?.[0].length ?? 0;
    let end = start + 1;
    while (end < lines.length && !new RegExp(`^#{1,${depth}} `).test(lines[end])) end++;
    bounded(lines.slice(start, end).map((line, index) => `${start + index + 1}: ${line}`));
  }
} else {
  throw new Error(`unknown command: ${command}`);
}
