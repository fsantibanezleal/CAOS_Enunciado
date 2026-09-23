#!/usr/bin/env python
"""The `docs/` wiki is present, complete, and its internal links resolve.

ADR-0056 makes the wiki binding, and a binding thing with no check is a wish. Documentation rots in
two specific ways that a machine can catch: a theme folder loses the landing page that indexes it,
and a link points at a file that was renamed or never written. Both look fine in a diff.

What this cannot check is whether the prose is any good, so it does not pretend to. It checks
structure and links, and it refuses to guess about anything else.

Stdlib only, so it runs as an ordinary CI step with no install.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

#: Each theme folder carries a same-named landing markdown (ADR-0056). `design` is the SDD's folder
#: and is named by ADR-0075 instead, so it declares its own entry point.
THEMES = {
    "architecture": "architecture.md",
    "frameworks": "frameworks.md",
    "methodologies": "methodologies.md",
    "guides": "guides.md",
    "use-cases": "use-cases.md",
    "data-contract": "data-contract.md",
    "design": "SDD.md",
}

#: A markdown link that points at a path rather than at a URL or an anchor.
LINK = re.compile(r"\[[^\]]*\]\((?!https?://|#)([^)\s]+)\)")


def main() -> int:
    problems: list[str] = []

    if not DOCS.is_dir():
        print("docs/ does not exist", file=sys.stderr)
        return 1

    index = DOCS / "README.md"
    if not index.is_file():
        problems.append("docs/README.md is missing; the wiki needs an index")

    for folder, landing in THEMES.items():
        directory = DOCS / folder
        if not directory.is_dir():
            problems.append(f"docs/{folder}/ is missing")
            continue
        if not (directory / landing).is_file():
            problems.append(f"docs/{folder}/{landing} is missing; a theme folder needs its landing page")
        pages = sorted(p.name for p in directory.glob("*.md"))
        if len(pages) < 2 and folder != "design":
            problems.append(
                f"docs/{folder}/ holds only {pages}; a theme with no deep page is a heading"
            )

    # Every relative link in every markdown under docs/, plus the two root files that point into it.
    targets = list(DOCS.rglob("*.md")) + [ROOT / "README.md", ROOT / "CHANGELOG.md"]
    for page in targets:
        if not page.is_file():
            continue
        for link in LINK.findall(page.read_text(encoding="utf-8")):
            path = link.split("#", 1)[0]
            if not path:
                continue
            resolved = (page.parent / path).resolve()
            if not resolved.exists():
                problems.append(f"{page.relative_to(ROOT)}: link to {link!r} does not resolve")

    if problems:
        print("the docs wiki is incomplete:", file=sys.stderr)
        for problem in problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    pages = sorted(DOCS.rglob("*.md"))
    print(f"docs ok: {len(pages)} page(s) across {len(THEMES)} themes, every link resolves")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
