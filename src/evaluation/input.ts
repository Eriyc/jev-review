import { z } from "zod";

import { evaluationSchema } from "./types.js";

export const reviewFileSchema = z
  .object({
    path: z.string().min(1),
    content: z.string()
  })
  .strict();

export const reviewInputSchema = z
  .object({
    task: z.string().min(1).optional(),
    diff: z.string().min(1).optional(),
    files: z.array(reviewFileSchema).optional(),
    repositoryContext: z.string().min(1).optional(),
    previousEvaluation: evaluationSchema.optional()
  })
  .strict()
  .superRefine((input, context) => {
    const hasContext = Boolean(
      input.task || input.diff || input.repositoryContext || input.files?.length
    );
    if (!hasContext) {
      context.addIssue({
        code: "custom",
        message: "Provide at least one of task, diff, files, or repositoryContext"
      });
    }
  });

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export type JevReviewState = {
  task?: string;
  diff?: string;
  files?: Array<{ path: string; content: string }>;
  repositoryContext?: string;
};

export function toJevState(input: ReviewInput): JevReviewState {
  const state: JevReviewState = {};
  if (input.task !== undefined) state.task = input.task;
  if (input.diff !== undefined) state.diff = input.diff;
  if (input.files !== undefined) state.files = input.files;
  if (input.repositoryContext !== undefined) state.repositoryContext = input.repositoryContext;
  return state;
}
