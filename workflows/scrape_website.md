# Scrape a Website

## Objective
Pull the outbound links from a single web page. Reach for this when you need a
quick inventory of what a page links to -- competitor sites, a resource list,
a sitemap-adjacent page -- without writing one-off scraping code.

## Inputs
- **url** (string, required): the page to fetch, including scheme, e.g.
  `https://example.com/blog`. Comes from the user or from a previous step's
  output.
- **max_links** (integer, optional, default 20): cap on how many links to
  return. Use `0` for unlimited when the user explicitly wants everything on
  the page.

## Steps
1. Run the tool from the project root:
   `python tools/scrape_single_site.py --url <url> --max-links <max_links>`
2. Read the single JSON object on stdout: `{"url": ..., "count": ..., "links": [...]}`.
3. If the tool exits non-zero, read the reason on stderr and decide whether to
   retry (e.g. transient network error), ask the user for a corrected URL, or
   stop and report the failure -- do not re-run blindly.
4. Hand the `links` list to whatever the user actually asked for next (e.g.
   summarize them, filter by pattern, or pass them to a downstream tool). This
   workflow only covers the fetch-and-extract step.

## Output
A JSON object with the page URL, the link count, and the deduped, absolute
link list -- returned to the agent on stdout, not written to a file unless
`--save-html` was passed (in which case the raw HTML also lands under
`.tmp/`, which is a debugging aid, not a deliverable).

## Edge Cases
- **Non-200 response / connection error**: `fetch()` raises, the tool calls
  `fail()` and exits non-zero with the reason on stderr. Do not treat this as
  "zero links" -- it's a failed run, not an empty result.
- **Page has zero links**: a valid, successful result -- `count` is `0` and
  `links` is `[]`. This is not a failure.
- **Relative links**: resolved against `url` automatically; the tool never
  returns a bare relative href.
- **Non-http(s) links** (`mailto:`, `javascript:`, `tel:`, anchors like `#`):
  silently excluded -- they aren't scrapeable pages.
- **Duplicate links** (e.g. same href repeated in nav and footer): deduped,
  keeping the first occurrence's order.
- **`NotOpenSSLWarning` on stderr**: expected noise from Python 3.9 + LibreSSL
  (see CLAUDE.md -> Environment). Not a failure signal.
- **`max_links` of `0`**: means unlimited, not zero results -- don't confuse
  this with "return nothing."
