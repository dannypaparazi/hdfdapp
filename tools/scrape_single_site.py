"""Fetch a single web page and extract the links on it.

Usage:
    python tools/scrape_single_site.py --url https://example.com --max-links 20

This is the reference tool for the WAT tool contract: named flags via argparse,
--help for discovery, a pure extract() split from the thin fetch() I/O shell,
a single JSON object on stdout on success, fail() on error, and .tmp/ as the
only place it ever writes.
"""
from __future__ import annotations

import argparse
import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from _common import PROJECT_ROOT, emit, fail, load_env, log, tmp_path

DEFAULT_MAX_LINKS = 20
DEFAULT_TIMEOUT = 10
USER_AGENT = "wat-framework-scraper/1.0"


def extract(html: str, base_url: str, max_links: int | None = DEFAULT_MAX_LINKS) -> dict:
    """Pure transform: HTML string -> {"url", "count", "links"}.

    - Resolves relative hrefs against base_url.
    - Keeps only http(s) links.
    - Dedupes while preserving first-seen order.
    - Caps the result at max_links when given (None means unlimited).
    """
    soup = BeautifulSoup(html, "html.parser")
    seen: set[str] = set()
    links: list[str] = []

    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        if not href:
            continue
        resolved = urljoin(base_url, href)
        if urlparse(resolved).scheme not in ("http", "https"):
            continue
        if resolved in seen:
            continue
        seen.add(resolved)
        links.append(resolved)
        if max_links is not None and len(links) >= max_links:
            break

    return {"url": base_url, "count": len(links), "links": links}


def fetch(url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    """Thin I/O shell: GET url, return response text. Raises on network/HTTP
    errors so main() can turn them into a single fail() call."""
    response = requests.get(url, timeout=timeout, headers={"User-Agent": USER_AGENT})
    response.raise_for_status()
    return response.text


def _slug(url: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", url).strip("_")[:80] or "page"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Fetch a single web page and extract its links as JSON.",
    )
    parser.add_argument("--url", required=True, help="Page to fetch, e.g. https://example.com")
    parser.add_argument(
        "--max-links",
        type=int,
        default=DEFAULT_MAX_LINKS,
        help=f"Cap on links returned (default {DEFAULT_MAX_LINKS}; 0 means unlimited).",
    )
    parser.add_argument(
        "--save-html",
        action="store_true",
        help="Also save the fetched HTML under .tmp/ for debugging.",
    )
    return parser


def main() -> None:
    load_env()
    args = build_parser().parse_args()

    max_links = None if args.max_links == 0 else args.max_links
    if max_links is not None and max_links < 0:
        fail("--max-links must be >= 0")

    log(f"fetching {args.url}")
    try:
        html = fetch(args.url)
    except requests.RequestException as exc:
        fail(f"failed to fetch {args.url}: {exc}")

    result = extract(html, args.url, max_links)

    if args.save_html:
        path = tmp_path(f"scrape_{_slug(args.url)}.html")
        path.write_text(html, encoding="utf-8")
        result["saved_html"] = str(path.relative_to(PROJECT_ROOT))
        log(f"saved html to {path}")

    emit(result)


if __name__ == "__main__":
    main()
