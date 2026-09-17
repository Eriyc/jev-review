import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { reviewInputSchema } from "../evaluation/input.js";
import { reviewWithJev } from "../evaluation/review.js";
import { evaluationSchema, type Evaluation } from "../evaluation/types.js";

const SERVER_INSTRUCTIONS = [
  "Use jev_review frequently throughout nontrivial coding work: after each coherent implementation slice, after review-driven changes, and before final handoff.",
  "Prefer several focused review loops over one large end-of-task review, and pass previousEvaluation on follow-up calls.",
  "Interim reviews may run before the full test suite; the final review should follow normal project checks.",
  "Do not repeat identical calls or review formatting-only or context-free changes.",
  "Send only the task, diff, files, and repository context needed to assess the change.",
  "Treat its dimensions as review evidence, not targets to game; correctness and user requirements come first.",
  "The coding agent remains responsible for deciding which feedback is justified and for modifying code."
].join(" ");

export type ReviewHandler = (input: z.infer<typeof reviewInputSchema>) => Promise<Evaluation>;

export function createMcpServer(review: ReviewHandler = reviewWithJev): McpServer {
  const server = new McpServer(
    { name: "jev-review", version: "0.1.0" },
    { instructions: SERVER_INSTRUCTIONS }
  );

  server.registerTool(
    "jev_review",
    {
      title: "Jev software-quality review",
      description:
        "Evaluate a focused implementation slice with Jev across independent engineering dimensions. Use repeatedly during nontrivial work and pass previousEvaluation after material changes. Provide only relevant task, diff, file, and repository context; do not send the whole repository by default.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true
      },
      inputSchema: reviewInputSchema,
      outputSchema: evaluationSchema
    },
    async (input) => {
      try {
        const evaluation = await review(input);
        return {
          content: [{ type: "text", text: JSON.stringify(evaluation) }],
          structuredContent: evaluation
        };  
      } catch (error) {
        const message = error instanceof Error ? error.message : "Jev Review failed unexpectedly.";
        return {
          isError: true,
          content: [{ type: "text", text: message }]
        };
      }
    }
  );

  return server;
}

export async function runStdioServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await createMcpServer().connect(transport);
}
