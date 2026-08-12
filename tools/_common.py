"""Shared contract for tools/ scripts: emit(), fail(), log(), tmp_path(), load_env().

Import this flat, the way every tool in tools/ does:

    from _common import emit, fail, log, tmp_path, load_env

That only works when tools/ is on sys.path, which happens automatically when a
tool is run as `python tools/<name>.py` (Python puts the script's own directory
on sys.path) and is mirrored for tests by tests/conftest.py.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, NoReturn

PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
TMP_DIR: Path = PROJECT_ROOT / ".tmp"


def emit(obj: Any) -> None:
    """Print a single JSON object to stdout. This is the ONLY thing a
    successful tool run may write to stdout -- everything else (progress,
    warnings, debug info) belongs on stderr via log()."""
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()


def fail(msg: str, code: int = 1) -> NoReturn:
    """Print a human-readable reason to stderr and exit non-zero. Never let a
    tool exit 0 after a failed run -- a silent failure corrupts whatever step
    reads its (absent) JSON next."""
    sys.stderr.write(f"error: {msg}\n")
    sys.exit(code)


def log(msg: str) -> None:
    """Print a progress/diagnostic line to stderr. Never stdout -- stdout is
    reserved for the single JSON success payload."""
    sys.stderr.write(f"{msg}\n")


def tmp_path(name: str) -> Path:
    """Resolve `name` to a path under .tmp/ at the project root, creating
    any needed parent directories as it goes. Refuses any name that would
    escape .tmp/ -- absolute paths and '..' segments both fail().
    """
    if not name:
        fail("tmp_path: name must not be empty")
    if Path(name).is_absolute():
        fail(f"tmp_path: '{name}' is an absolute path; only names relative to .tmp/ are allowed")

    candidate = (TMP_DIR / name).resolve()
    tmp_root = TMP_DIR.resolve()
    if candidate != tmp_root and tmp_root not in candidate.parents:
        fail(f"tmp_path: '{name}' escapes .tmp/")

    candidate.parent.mkdir(parents=True, exist_ok=True)
    return candidate


def load_env() -> None:
    """Load .env from the project root via python-dotenv. Safe to call even
    if .env doesn't exist yet (e.g. right after cloning, before the user has
    copied .env.example) -- it's a no-op in that case, not an error."""
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env")
