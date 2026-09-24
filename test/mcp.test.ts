import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { createMcpServer } from "../src/mcp/server.js";
import { fakeEvaluation } from "./helpers.js";

describe("MCP server", () => {
  it("starts the bundled stdio server under Bun and inherits provider environment", async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["dist/server.js"],
      cwd: process.cwd(),
      env: { ...process.env, JEV_PROVIDER: "openrouter", OPENROUTER_API_KEY: "" }
    });
    const client = new Client({ name: "bun-stdio-test", version: "1.0.0" });
    await client.connect(transport);
    try {
      const listed = await client.listTools();
      assert.deepEqual(listed.tools.map((tool) => tool.name), ["jev_review"]);
      const result = await client.callTool({ name: "jev_review", arguments: { task: "Check environment" } });
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result.content), /OPENROUTER_API_KEY is not set/);
    } finally {
      await client.close();
    }
  });

  it("exposes one machine-readable jev_review tool", async () => {
    const expected = fakeEvaluation();
    const server = createMcpServer(async () => expected);
    const client = new Client({ name: "jev-review-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const listed = await client.listTools();
      assert.deepEqual(listed.tools.map((tool) => tool.name), ["jev_review"]);

      const result = await client.callTool({
        name: "jev_review",
        arguments: { task: "Test the MCP boundary", diff: "+ safe change" }
      });
      assert.equal(result.isError, undefined);
      assert.deepEqual(result.structuredContent, expected);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
