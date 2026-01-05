---
description: Iterative development loop that continues until all completion criteria are met
---

# Ralph Loop — Iterative Development

When the user invokes `/ralph-loop`, follow this iterative methodology:

## Step 1: Parse the Task

The user will provide a task in this format:

```markdown
## Task
[Description of what to build, fix, or implement]

## Completion Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Max Iterations
[Number, e.g., 15]
```

## Step 2: Initialize State

Create `.ralph/loop-state.md` in the current workspace:

```yaml
---
iteration: 0
status: active
started_at: [current timestamp]
max_iterations: [from user input]
---

## Task
[Copy from user input]

## Completion Criteria
[Copy checkboxes from user input]

## Progress Log
```

## Step 3: Execute Loop

For each iteration:

1. **Increment** iteration counter in state file
2. **Work** on the next uncompleted criterion
3. **Log** what was done in the Progress Log section
4. **Self-assess** — evaluate which criteria are now genuinely complete
5. **Update** checkboxes in state file (only mark `[x]` if truly verified)
6. **Check exit conditions**:
   - If ALL criteria are `[x]` → Exit with success
   - If iteration >= max_iterations → Exit with timeout
   - If blocked for 5+ iterations on same criterion → Exit with blocked status

## Step 4: Exit Conditions

### Success
```
✅ All completion criteria met!
<promise>COMPLETE</promise>
```

### Timeout
```
⏱️ Max iterations reached. Progress saved in .ralph/loop-state.md
<promise>TIMEOUT</promise>
```

### Blocked
```
⚠️ Blocked after multiple attempts. See .ralph/loop-state.md for details.
<promise>BLOCKED</promise>
```

## Rules

1. **One criterion at a time** — Focus on completing one before moving to the next
2. **Verify before checking** — Only mark `[x]` if you've confirmed it works (run tests, check output)
3. **Incremental progress** — Small steps are better than big leaps that might fail
4. **Log everything** — Each iteration should have a clear log entry
5. **No false completions** — If unsure, leave unchecked and iterate again

## Verification Commands

When criteria include testable commands, run them:
- `npm test` — Run and check output
- `npm run build` — Verify build succeeds
- `curl` commands — Execute and verify response
- Manual checks — Describe what you observed

## Example Iteration Log Entry

```markdown
### Iteration 3
- Implemented POST /todos endpoint
- Added validation for title (required, max 100 chars)
- Ran `npm test` — 2 passing, 1 failing (PUT test)
- Marked POST criterion as complete
- Next: Fix PUT endpoint
```
