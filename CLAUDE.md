# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Agent Instructions

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution. That separation is what makes this system reliable.

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases
- Written in plain language, the same way you'd brief someone on your team

**Layer 2: Agents (The Decision-Maker)**
- This is your role. You're responsible for intelligent coordination.
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed
- You connect intent to execution without trying to do everything yourself
- Example: If you need to pull data from a website, don't attempt it directly. Read `workflows/scrape_website.md`, figure out the required inputs, then execute `tools/scrape_single_site.py`

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual work
- API calls, data transformations, file operations, database queries
- Credentials and API keys are stored in `.env`
- These scripts are consistent, testable, and fast

**Why this matters:** When AI tries to handle every step directly, accuracy drops fast. If each step is 90% accurate, you're down to 59% success after just five steps. By offloading execution to deterministic scripts, you stay focused on orchestration and decision-making where you excel.

## Tool Contract

Every script in `tools/` follows the same interface. This is what makes "call the tool" a reliable step instead of a guess — without it, each tool needs its source read before use, which reintroduces the per-step error rate the architecture exists to eliminate.

- **Invocation:** `python tools/<name>.py --flag value`, always run from the project root. Named flags only, no positional arguments.
- **Discovery:** every tool implements `--help`, listing required and optional inputs. Survey `tools/` with `--help` before reading any source.
- **Success output:** a single JSON object on stdout. Nothing else goes to stdout — logs, progress, and warnings go to stderr so stdout stays parseable.
- **Failure:** non-zero exit code, human-readable reason on stderr. Never exit 0 on a failed run; silent failure is worse than a crash because it corrupts downstream steps.
- **Side effects:** a tool writes files only under `.tmp/` or pushes to a cloud service. It never writes elsewhere in the repo.
- **Scope:** one tool, one job. Chaining is the agent's responsibility, not the script's.

`tools/_common.py` implements the contract — `emit()`, `fail()`, `log()`, `tmp_path()`,
`load_env()`. Use it rather than reimplementing; `tmp_path()` in particular refuses paths
that escape `.tmp/`. Tools run as `python tools/<name>.py`, which puts `tools/` on
`sys.path`, so they import each other flatly (`from _common import ...`). `tests/conftest.py`
mirrors that path setup, and Ruff's `src` setting keeps import sorting aware of it.

Split each tool into a pure transform plus a thin I/O shell, as `scrape_single_site.py`
does with `extract()` and `fetch()`. That's what makes the logic testable without a network.

## Commands

Run everything from the project root. `.venv/bin/…` avoids needing the venv activated.

```bash
.venv/bin/pip install -r requirements.txt   # setup / after adding a dependency
.venv/bin/python -m pytest                  # full suite
.venv/bin/python -m pytest tests/test_scrape_single_site.py::test_extract_respects_max_links
.venv/bin/python -m pytest -k links         # by name substring
.venv/bin/ruff check .                      # lint
.venv/bin/ruff check --fix .                # lint, autofixing what it can
```

Tests are offline by design — the network layer (`fetch`) is monkeypatched, and parsing
lives in a pure `extract()` function. Keep it that way: a test that hits the network is
a flaky test.

## Environment

- Python at `.venv/` in the project root. Never install globally, never conda.
- **Interpreter is macOS system Python 3.9.6** — no Homebrew Python is installed. Code
  must stay 3.9-compatible; `from __future__ import annotations` is what lets tools use
  `list[str] | None` in signatures. Ruff's `target-version` is pinned to `py39` to catch
  violations.
- 3.9 links LibreSSL 2.8.3, so urllib3 v2 prints a `NotOpenSSLWarning` on every run. It
  is noise on stderr, not a failure — HTTPS works, verified end-to-end. Don't suppress it
  and don't "fix" it by downgrading urllib3; the real fix is a newer Python, which is a
  decision to raise rather than make.
- Tools read config through `python-dotenv` loading `.env` from the project root. Copy
  `.env.example` to get started. Never hardcode a key, never read a secret from elsewhere.
- Google OAuth uses `credentials.json` (the OAuth client) and `token.json` (the cached
  grant). An expired or revoked `token.json` is a recurring failure mode: delete it and
  re-run the tool to trigger the browser consent flow again. `credentials.json` is not
  regenerable this way — it comes from the Google Cloud console.

## Workflow Template

Workflows use a consistent heading order so they stay skimmable and so required inputs are never buried:

```markdown
# <Workflow Name>

## Objective
What this accomplishes, and when to reach for it.

## Inputs
Each required input, its format, and where it comes from.

## Steps
Ordered. Name the exact tool and flags for each step.

## Output
What gets produced and where it lands (cloud destination, not a local path).

## Edge Cases
Known failure modes and the handling for each. This section grows over time.
```

## How to Operate

**1. Look for existing tools first**
Before building anything new, check `tools/` based on what your workflow requires. Only create new scripts when nothing exists for that task.

**2. Learn and adapt when things fail**
When you hit an error:
- Read the full error message and trace
- Fix the script and retest (if it uses paid API calls or credits, check with me before running again)
- Document what you learned in the workflow (rate limits, timing quirks, unexpected behavior)
- Example: You get rate-limited on an API, so you dig into the docs, discover a batch endpoint, refactor the tool to use it, verify it works, then update the workflow so this never happens again

**3. Keep workflows current**
Workflows should evolve as you learn. When you find better methods, discover constraints, or encounter recurring issues, update the workflow. That said, don't create or overwrite workflows without asking unless I explicitly tell you to. These are your instructions and need to be preserved and refined, not tossed after one use.

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:
1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
5. Move on with a more robust system

This loop is how the framework improves over time.

## File Structure

**What goes where:**
- **Deliverables**: Final outputs go to cloud services (Google Sheets, Slides, etc.) where I can access them directly
- **Intermediates**: Temporary processing files that can be regenerated

**Directory layout:**
```
.tmp/           # Temporary files (scraped data, intermediate exports). Regenerated as needed.
tools/          # Python scripts for deterministic execution; _common.py holds the contract
workflows/      # Markdown SOPs defining what to do and how
tests/          # pytest, offline only; conftest.py puts tools/ on sys.path
.venv/          # Project virtualenv
.env            # API keys and environment variables (NEVER store secrets anywhere else)
pyproject.toml  # pytest + ruff config
credentials.json, token.json  # Google OAuth (gitignored)
```

Reference pair to copy when adding capability: `workflows/scrape_website.md` and
`tools/scrape_single_site.py`.

**Core principle:** Local files are just for processing. Anything I need to see or use lives in cloud services. Everything in `.tmp/` is disposable.

## Bottom Line

You sit between what I want (workflows) and what actually gets done (tools). Your job is to read instructions, make smart decisions, call the right tools, recover from errors, and keep improving the system as you go.

Stay pragmatic. Stay reliable. Keep learning.
