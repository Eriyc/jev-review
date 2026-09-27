# Work ledger execution

Beads in each goal directory owns live issue state, dependencies, claims, and writable paths. Use `bun scripts/agent-context/beads.ts <goal-directory> ready` and `task <issue-id>` for bounded issue context. The coordinator alone mutates Beads, stages, and commits.

Worker receipts are at most 2 KiB and contain `task_id`, `status`, full `base_sha`, `changed_paths`, `checks` (command, status, environment, evidence), `open_findings`, and `next_action`. Workers edit only their issue's `metadata.writable_paths` and do not change Beads, ledger documents, the Git index, or commits.
