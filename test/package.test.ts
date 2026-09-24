import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "bun:test";

const root = join(import.meta.dir, "..");

describe("portable Agent Plugins package", () => {
  it("points the MCP server at the bundled executable through PLUGIN_ROOT", () => {
    const plugin = JSON.parse(readFileSync(join(root, "plugin.json"), "utf8"));
    const mcp = JSON.parse(readFileSync(join(root, "mcp.json"), "utf8"));
    const marketplace = JSON.parse(readFileSync(join(root, ".agents", "plugins", "marketplace.json"), "utf8"));

    assert.equal(plugin.$schema, "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json");
    assert.equal(mcp.$schema, "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json");
    assert.deepEqual(mcp.mcpServers["jev-review"], {
      type: "stdio",
      command: "bun",
      args: ["${PLUGIN_ROOT}/dist/server.js"],
      cwd: "./"
    });
    assert.equal(existsSync(join(root, "dist", "server.js")), true);
    assert.equal(marketplace.plugins[0].source.path, "./");
    assert.equal(marketplace.plugins[0].name, plugin.name);
  });

  it("writes a provider key to PLUGIN_DATA without printing it", () => {
    const directory = mkdtempSync(join(tmpdir(), "jev-setup-"));
    try {
      const child = Bun.spawnSync({
        cmd: [process.execPath, join(root, "scripts", "configure.ts"), "--data-dir", directory, "--provider", "openrouter"],
        env: { ...process.env, OPENROUTER_API_KEY: "private-test-key" },
        stdout: "pipe",
        stderr: "pipe"
      });
      assert.equal(child.exitCode, 0, new TextDecoder().decode(child.stderr));
      assert.doesNotMatch(new TextDecoder().decode(child.stdout), /private-test-key/);
      assert.deepEqual(JSON.parse(readFileSync(join(directory, "credentials.json"), "utf8")), {
        provider: "openrouter", apiKey: "private-test-key"
      });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
