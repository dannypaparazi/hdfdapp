"""Mirrors the sys.path setup tools/ gets when run as `python tools/<name>.py`,
so tests can `from _common import ...` / `from scrape_single_site import ...`
the same flat way the tools do."""
from __future__ import annotations

import sys
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent.parent / "tools"
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))
