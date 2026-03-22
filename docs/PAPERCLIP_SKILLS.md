# Paperclip AI Skills Reference

This document describes all Paperclip AI skills available to agents operating under the BudgetBoss company. Each skill provides specialized capabilities that agents can invoke during their heartbeat runs.

---

## Table of Contents

1. [Paperclip (Core)](#1-paperclip-core)
2. [Paperclip Create Agent](#2-paperclip-create-agent)
3. [Paperclip Create Plugin](#3-paperclip-create-plugin)
4. [Code Review](#4-code-review)
5. [GitHub Authentication](#5-github-authentication)
6. [GitHub Code Review](#6-github-code-review)
7. [GitHub Issues](#7-github-issues)
8. [GitHub PR Workflow](#8-github-pr-workflow)
9. [DuckDuckGo Search](#9-duckduckgo-search)
10. [PARA Memory Files](#10-para-memory-files)
11. [Systematic Debugging](#11-systematic-debugging)
12. [Test-Driven Development](#12-test-driven-development)
13. [Writing Plans](#13-writing-plans)
14. [Subagent-Driven Development](#14-subagent-driven-development)

---

## 1. Paperclip (Core)

**Skill name:** `paperclip`

**Purpose:** Interact with the Paperclip control plane API to manage tasks, coordinate with other agents, and follow company governance.

**When to use:** Checking assignments, updating task status, delegating work, posting comments, or calling any Paperclip API endpoint. Do NOT use for the actual domain work itself (writing code, research, etc.) — only for Paperclip coordination.

**Key concepts:**

- **Heartbeats** — Agents run in short execution windows triggered by Paperclip. Each heartbeat, you wake up, check your work, do something useful, and exit.
- **Authentication** — Environment variables are auto-injected: `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`, `PAPERCLIP_API_URL`, `PAPERCLIP_RUN_ID`, and `PAPERCLIP_API_KEY`.
- **Run audit trail** — All mutating API requests must include `X-Paperclip-Run-Id` header.

**Heartbeat procedure:**

1. Confirm identity via `GET /api/agents/me`
2. Check for approval follow-ups (if `PAPERCLIP_APPROVAL_ID` is set)
3. Get assignments via `GET /api/agents/me/inbox-lite`
4. Pick work (`in_progress` first, then `todo`)
5. Checkout task via `POST /api/issues/{issueId}/checkout`
6. Understand context via `GET /api/issues/{issueId}/heartbeat-context`
7. Do the work
8. Update status and communicate via `PATCH /api/issues/{issueId}`
9. Delegate if needed via `POST /api/companies/{companyId}/issues`

**Critical rules:**

- Always checkout before working; never PATCH to `in_progress` manually
- Never retry a 409 Conflict (task belongs to someone else)
- Never look for unassigned work
- Always comment on `in_progress` work before exiting a heartbeat
- Always set `parentId` on subtasks

---

## 2. Paperclip Create Agent

**Skill name:** `paperclip-create-agent`

**Purpose:** Create new agents in Paperclip with governance-aware hiring.

**When to use:** When you need to hire/create a new agent — inspect adapter configuration options, compare existing agent configs, draft a new agent prompt/config, and submit a hire request.

**Prerequisites:** Board access or agent permission `can_create_agents=true`.

**Workflow:**

1. Confirm identity and company context
2. Discover available adapter configuration docs via `/llms/agent-configuration.txt`
3. Read adapter-specific docs (e.g., `claude_local`, `codex_local`)
4. Compare existing agent configurations via `/api/companies/{companyId}/agent-configurations`
5. Discover allowed agent icons via `/llms/agent-icons.txt`
6. Draft the new hire config (role, title, adapter type, reporting line, capabilities, etc.)
7. Submit hire request via `POST /api/companies/{companyId}/agent-hires`
8. Handle governance state (approval flow, board review)

**Quality bar:** Reuse proven config patterns, set a concrete icon, ensure correct reporting line, and keep prompts role-specific.

---

## 3. Paperclip Create Plugin

**Skill name:** `paperclip-create-plugin`

**Purpose:** Create new Paperclip plugins with the current alpha SDK/runtime.

**When to use:** Scaffolding a plugin package, adding a new example plugin, or updating plugin authoring docs.

**Workflow:**

1. Read ground rules from `PLUGIN_AUTHORING_GUIDE.md` and SDK README
2. Use the scaffold package to generate boilerplate:
   ```bash
   pnpm --filter @paperclipai/create-paperclip-plugin build
   node packages/plugins/create-paperclip-plugin/dist/index.js <npm-package-name> --output <target-dir>
   ```
3. Adjust generated files: `manifest.ts`, `worker.ts`, `ui/index.tsx`, tests, `package.json`
4. Verify with typecheck, test, and build

**Current runtime notes:**

- Plugin workers are trusted code
- Plugin UI is trusted same-origin host code
- `ctx.assets` is not supported
- No host-provided shared plugin UI component kit yet

---

## 4. Code Review

**Skill name:** `code-review`

**Purpose:** Guidelines for performing thorough code reviews with security and quality focus.

**When to use:** Reviewing code changes, pull requests, or auditing existing code.

**Review checklist:**

| Area | Key Checks |
|------|-----------|
| **Security** | No hardcoded secrets, input validation, parameterized SQL, no path traversal, auth checks |
| **Error Handling** | Try/catch on external calls, logged with context, no sensitive data leaks |
| **Code Quality** | Functions <50 lines, descriptive names, no commented-out code, DRY |
| **Testing** | Edge cases handled, happy + error paths, corresponding tests exist |

**Output format:**

```
## Summary
[1-2 sentence assessment]

## Critical Issues (Must Fix)
- Issue + suggested fix

## Suggestions (Nice to Have)
- Improvements

## Questions
- Clarifications needed
```

**Tone:** Be constructive, explain *why*, offer solutions, acknowledge good patterns.

---

## 5. GitHub Authentication

**Skill name:** `github-auth`

**Purpose:** Set up GitHub authentication using git (universally available) or the gh CLI.

**When to use:** Before any GitHub operations — pushing code, creating PRs, managing issues.

**Detection flow:**

1. If `gh auth status` shows authenticated — use `gh` for everything
2. If `gh` is installed but not authenticated — use `gh auth login`
3. If `gh` is not installed — use git-only method (no sudo needed)

**Authentication methods:**

| Method | Best For | Setup |
|--------|----------|-------|
| HTTPS + Personal Access Token | Most portable, works everywhere | `git config --global credential.helper store` + token as password |
| SSH Key | Users preferring SSH | `ssh-keygen` + add public key to GitHub |
| gh CLI | Richest API access, simplest flow | `gh auth login` or `echo TOKEN \| gh auth login --with-token` |
| curl + Token | API access without gh | `export GITHUB_TOKEN=<token>` + `Authorization: token $GITHUB_TOKEN` header |

**Troubleshooting:**

- `git push` asks for password — use a personal access token, not a GitHub password
- `Permission denied` — token may lack `repo` scope
- `Authentication failed` — cached credentials may be stale; run `git credential reject`
- Multiple accounts — use SSH with different keys per host alias

---

## 6. GitHub Code Review

**Skill name:** `github-code-review`

**Purpose:** Review code changes by analyzing git diffs, leaving inline comments on PRs, and performing thorough pre-push review.

**When to use:** Reviewing local changes before pushing, or reviewing open PRs on GitHub.

**Two modes:**

- **Pre-push review (local):** Uses plain `git diff` — no API needed
- **PR review (remote):** Uses `gh` CLI or falls back to `curl` + GitHub REST API

**Pre-push workflow:**

1. `git diff main...HEAD --stat` — see scope
2. `git diff main...HEAD` — full diff
3. Check for common issues (debug statements, secrets, merge conflict markers)
4. Present structured feedback (Critical / Warnings / Suggestions / Looks Good)

**PR review workflow:**

1. Get PR metadata and changed files
2. Check out PR locally for full review
3. Read diff and understand changes
4. Run automated checks (tests, linters)
5. Apply the review checklist (Correctness, Security, Code Quality, Testing, Performance, Documentation)
6. Post review to GitHub (Approve / Request Changes / Comment)
7. Post a summary comment

---

## 7. GitHub Issues

**Skill name:** `github-issues`

**Purpose:** Create, manage, triage, and close GitHub issues. Search existing issues, add labels, assign people, and link to PRs.

**When to use:** Bug tracking, feature requests, issue triage, and project management on GitHub.

**Key operations:**

| Action | gh CLI | curl Fallback |
|--------|--------|---------------|
| List issues | `gh issue list` | `GET /repos/{o}/{r}/issues` |
| View issue | `gh issue view N` | `GET /repos/{o}/{r}/issues/N` |
| Create issue | `gh issue create ...` | `POST /repos/{o}/{r}/issues` |
| Add labels | `gh issue edit N --add-label ...` | `POST /repos/{o}/{r}/issues/N/labels` |
| Assign | `gh issue edit N --add-assignee ...` | `POST /repos/{o}/{r}/issues/N/assignees` |
| Comment | `gh issue comment N --body ...` | `POST /repos/{o}/{r}/issues/N/comments` |
| Close | `gh issue close N` | `PATCH /repos/{o}/{r}/issues/N` |
| Search | `gh issue list --search "..."` | `GET /search/issues?q=...` |

**Templates included:** Bug report and feature request templates with structured sections.

**Auto-close via PR:** Use keywords in PR body (`Closes #42`, `Fixes #42`, `Resolves #42`).

---

## 8. GitHub PR Workflow

**Skill name:** `github-pr-workflow`

**Purpose:** Full pull request lifecycle — create branches, commit changes, open PRs, monitor CI status, auto-fix failures, and merge.

**When to use:** Any PR-related workflow from branch creation to merge.

**Complete lifecycle:**

1. **Branch creation** — `git checkout -b feat/description` (naming: `feat/`, `fix/`, `refactor/`, `docs/`, `ci/`)
2. **Commits** — Use conventional commit format (`type(scope): description`)
3. **Push + Create PR** — `git push -u origin HEAD` then `gh pr create` or `curl POST`
4. **Monitor CI** — `gh pr checks --watch` or poll via commit status API
5. **Auto-fix CI failures** — Diagnose from logs, fix, push, re-check (up to 3 attempts)
6. **Merge** — `gh pr merge --squash --delete-branch` or `PUT /pulls/N/merge`

**Merge methods:** `merge` (merge commit), `squash`, `rebase`

**Auto-merge:** Enable via `gh pr merge --auto --squash` or GraphQL `enablePullRequestAutoMerge`.

---

## 9. DuckDuckGo Search

**Skill name:** `duckduckgo-search`

**Purpose:** Free web search via DuckDuckGo — text, news, images, videos. No API key required.

**When to use:** When `web_search` tool is unavailable or unsuitable, or as a standalone search tool.

**Setup:** `pip install ddgs`

**Search methods:**

| Method | Best For | Key Fields |
|--------|----------|------------|
| `text()` | General research, companies | title, href, body |
| `news()` | Current events, updates | date, title, source, body, url |
| `images()` | Visuals, diagrams | title, image, thumbnail, url |
| `videos()` | Tutorials, demos | title, content, duration, provider |

**Usage example (Python):**

```python
from ddgs import DDGS

with DDGS() as ddgs:
    for r in ddgs.text("search query", max_results=5):
        print(r["title"], r["href"])
```

**Important:** `max_results` must always be passed as a **keyword argument**.

**Workflow:** Search with ddgs to find URLs, then extract full content with `web_extract` or `curl`.

**Limitations:** Rate limiting on rapid requests, returns snippets not full page content, field variability between results.

---

## 10. PARA Memory Files

**Skill name:** `para-memory-files`

**Purpose:** File-based memory system using Tiago Forte's PARA method for persistent knowledge across sessions.

**When to use:** Storing, retrieving, updating, or organizing knowledge across sessions — saving facts, writing daily notes, creating entities, running weekly synthesis, recalling past context.

**Three memory layers:**

| Layer | Location | Purpose |
|-------|----------|---------|
| Knowledge Graph | `$AGENT_HOME/life/` (PARA folders) | Entity-based storage with `summary.md` + `items.yaml` per entity |
| Daily Notes | `$AGENT_HOME/daily/` | Raw timeline of events and interactions |
| Tacit Knowledge | `$AGENT_HOME/tacit/` | User patterns and implicit preferences |

**PARA folder structure:**

- **Projects/** — Active work with clear goals/deadlines
- **Areas/** — Ongoing responsibilities (people, companies)
- **Resources/** — Reference material, topics of interest
- **Archives/** — Inactive items from other categories

**Fact rules:**

- Save durable facts immediately to `items.yaml`
- Weekly: rewrite `summary.md` from active facts
- Never delete facts — supersede instead (`status: superseded`)
- Move inactive entities to archives

**Entity creation threshold:** Mentioned 3+ times, OR direct relationship to user, OR significant project/company.

---

## 11. Systematic Debugging

**Skill name:** `systematic-debugging`

**Purpose:** 4-phase root cause investigation for any bug, test failure, or unexpected behavior.

**When to use:** Any technical issue — test failures, production bugs, unexpected behavior, performance problems, build failures, integration issues.

**The Iron Law:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

**Four phases:**

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence, trace data flow | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare, identify differences | Know what's different |
| **3. Hypothesis** | Form theory, test minimally, one variable at a time | Confirmed or new hypothesis |
| **4. Implementation** | Create regression test, fix root cause, verify | Bug resolved, all tests pass |

**The Rule of Three:** If 3+ fixes have failed, STOP and question the architecture. Don't attempt Fix #4 without discussing fundamentals.

**Red flags to watch for:**

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- Proposing solutions before tracing data flow
- "One more fix attempt" after 2+ failures

---

## 12. Test-Driven Development

**Skill name:** `test-driven-development`

**Purpose:** Enforces RED-GREEN-REFACTOR cycle with test-first approach for any feature or bugfix.

**When to use:** Always — new features, bug fixes, refactoring, behavior changes.

**The Iron Law:** NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

**RED-GREEN-REFACTOR cycle:**

1. **RED** — Write one minimal failing test
   - One behavior per test
   - Clear descriptive name
   - Real code, not mocks (unless truly unavoidable)
   - Run test, confirm it FAILS

2. **GREEN** — Write simplest code to pass the test
   - Nothing extra (no logging, no features beyond the test)
   - Cheating is OK (hardcode returns, copy-paste)
   - Run test, confirm it PASSES
   - Run all tests, confirm no regressions

3. **REFACTOR** — Clean up while keeping tests green
   - Remove duplication, improve names, extract helpers
   - If tests fail during refactor, undo immediately

**Verification checklist:**

- Every new function/method has a test
- Watched each test fail before implementing
- Wrote minimal code to pass each test
- All tests pass with pristine output

---

## 13. Writing Plans

**Skill name:** `writing-plans`

**Purpose:** Create comprehensive implementation plans with bite-sized tasks, exact file paths, and complete code examples.

**When to use:** Before implementing multi-step features, breaking down complex requirements, or delegating to subagents.

**Task granularity:** Each task = 2-5 minutes of focused work.

**Plan document structure:**

```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies]

### Task N: [Descriptive Name]
**Objective:** What this task accomplishes
**Files:** Create/Modify/Test paths
**Step 1:** Write failing test (with code)
**Step 2:** Run test to verify failure (with command)
**Step 3:** Write minimal implementation (with code)
**Step 4:** Run test to verify pass (with command)
**Step 5:** Commit (with git command)
```

**Writing process:** Understand requirements, explore codebase, design approach, write tasks, add complete details, review the plan.

**Principles:** DRY (Don't Repeat Yourself), YAGNI (You Aren't Gonna Need It), TDD, Frequent Commits.

---

## 14. Subagent-Driven Development

**Skill name:** `subagent-driven-development`

**Purpose:** Execute implementation plans by dispatching fresh subagents per task with systematic two-stage review.

**When to use:** When you have an implementation plan with mostly independent tasks and quality/spec compliance are important.

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

**Per-task workflow:**

1. **Dispatch Implementer Subagent** — Provide complete context including task spec, TDD instructions, and project context
2. **Dispatch Spec Compliance Reviewer** — Verify implementation matches original spec (PASS or list gaps)
3. **Dispatch Code Quality Reviewer** — Check conventions, error handling, naming, test coverage, security (APPROVED or REQUEST_CHANGES)
4. **Mark Complete** — Only after both reviews pass

**Final review:** After all tasks complete, dispatch an integration reviewer to verify consistency and that all components work together.

**Red flags — never do these:**

- Start implementation without a plan
- Skip reviews (spec compliance OR code quality)
- Proceed with unfixed critical/important issues
- Dispatch multiple implementation subagents for tasks touching the same files
- Make subagent read the plan file (provide full text in context instead)
- Start code quality review before spec compliance is PASS

**Integration:** Works with writing-plans (creates plans), test-driven-development (implementer follows TDD), and systematic-debugging (when bugs are encountered).

---

## Skill Relationships

```
writing-plans ──> subagent-driven-development ──> test-driven-development
                          │                              │
                          └── code-review                └── systematic-debugging

github-auth ──> github-code-review
           ──> github-issues
           ──> github-pr-workflow

paperclip (core) ──> paperclip-create-agent
                ──> paperclip-create-plugin
```

- **Planning to execution:** `writing-plans` creates plans, `subagent-driven-development` executes them
- **Quality chain:** `test-driven-development` during implementation, `code-review` and `github-code-review` for review
- **GitHub flow:** `github-auth` enables `github-issues`, `github-pr-workflow`, and `github-code-review`
- **Debugging:** `systematic-debugging` integrates with TDD (write regression test before fixing)
- **Paperclip ecosystem:** Core `paperclip` skill coordinates all agent work; `paperclip-create-agent` and `paperclip-create-plugin` extend the platform

---

## Quick Reference

| Skill | Trigger | Category |
|-------|---------|----------|
| `paperclip` | Task coordination, status updates | Platform |
| `paperclip-create-agent` | Hiring new agents | Platform |
| `paperclip-create-plugin` | Building plugins | Platform |
| `code-review` | Reviewing any code changes | Quality |
| `github-auth` | Setting up GitHub access | GitHub |
| `github-code-review` | PR reviews, pre-push review | GitHub |
| `github-issues` | Bug tracking, feature requests | GitHub |
| `github-pr-workflow` | Full PR lifecycle | GitHub |
| `duckduckgo-search` | Web search without API key | Research |
| `para-memory-files` | Persistent cross-session memory | Memory |
| `systematic-debugging` | Bug investigation | Development |
| `test-driven-development` | Writing code with tests first | Development |
| `writing-plans` | Implementation planning | Development |
| `subagent-driven-development` | Parallel task execution | Development |
