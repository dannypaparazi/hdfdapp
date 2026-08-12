from __future__ import annotations

from scrape_single_site import extract, fetch

SAMPLE_HTML = """
<html><body>
  <a href="https://example.com/a">A</a>
  <a href="/b">B (relative)</a>
  <a href="https://example.com/a">A again (dupe)</a>
  <a href="/c">C (relative)</a>
  <a href="mailto:someone@example.com">mail (ignored)</a>
  <a href="javascript:void(0)">js (ignored)</a>
  <a href="/d">D (relative)</a>
</body></html>
"""
BASE_URL = "https://example.com"


def test_extract_resolves_and_dedupes_links():
    result = extract(SAMPLE_HTML, BASE_URL, max_links=None)
    assert result["url"] == BASE_URL
    assert result["links"] == [
        "https://example.com/a",
        "https://example.com/b",
        "https://example.com/c",
        "https://example.com/d",
    ]
    assert result["count"] == 4


def test_extract_ignores_non_http_schemes():
    result = extract(SAMPLE_HTML, BASE_URL, max_links=None)
    assert not any("mailto" in link or "javascript" in link for link in result["links"])


def test_extract_respects_max_links():
    result = extract(SAMPLE_HTML, BASE_URL, max_links=2)
    assert result["count"] == 2
    assert result["links"] == ["https://example.com/a", "https://example.com/b"]


def test_extract_handles_no_links():
    result = extract("<html><body>no links here</body></html>", BASE_URL)
    assert result == {"url": BASE_URL, "count": 0, "links": []}


def test_fetch_uses_requests_get(monkeypatch):
    calls = {}

    class FakeResponse:
        text = "<html></html>"

        def raise_for_status(self):
            return None

    def fake_get(url, timeout, headers):
        calls["url"] = url
        calls["timeout"] = timeout
        calls["headers"] = headers
        return FakeResponse()

    monkeypatch.setattr("scrape_single_site.requests.get", fake_get)

    result = fetch(BASE_URL)

    assert result == "<html></html>"
    assert calls["url"] == BASE_URL
