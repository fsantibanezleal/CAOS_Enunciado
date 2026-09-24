#!/usr/bin/env python
"""The VERSION file and the version the site shows a reader must be the same string.

They drifted the first time the product was versioned after its first release: `VERSION` said
0.02.000 and the footer of every page said 0.01.000, because the footer's constant lives in the
frontend and nothing compared the two. A version a reader can see is a claim about what they are
looking at, and a wrong one is worse than none, because it makes a bug report point at the wrong
build.

The frontend manifest is compared too, in its semver form (0.06.000 is 0.6.0 there, because semver
forbids leading zeros). It sat at the 0.1.0 scaffold through five releases, which ADR-0068 names as
the most common drift, and nothing looked at it.

Stdlib only, so it runs as an ordinary CI step with no install.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT / "VERSION"
APP = ROOT / "frontend" / "src" / "App.tsx"
MANIFEST = ROOT / "frontend" / "package.json"

#: `X.XX.XXX`, the house format. Two digits of minor and three of patch, zero padded.
FORMAT = re.compile(r"^\d+\.\d{2}\.\d{3}$")


def main() -> int:
    if not VERSION_FILE.exists():
        print(f"{VERSION_FILE} is missing", file=sys.stderr)
        return 1

    declared = VERSION_FILE.read_text(encoding="utf-8").strip()
    if not FORMAT.match(declared):
        print(
            f"VERSION is {declared!r}, which is not X.XX.XXX (for example 0.02.000)",
            file=sys.stderr,
        )
        return 1

    source = APP.read_text(encoding="utf-8")
    found = re.search(r'const VERSION = "([^"]+)"', source)
    if not found:
        print(f"no `const VERSION = \"...\"` in {APP}", file=sys.stderr)
        return 1

    shown = found.group(1)
    if shown != declared:
        print(
            f"VERSION says {declared} and the site footer shows {shown}. "
            "A reader is being told which build they are looking at, so the two must agree.",
            file=sys.stderr,
        )
        return 1

    semver = ".".join(str(int(part)) for part in declared.split("."))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")).get("version")
    if manifest != semver:
        print(
            f"VERSION says {declared}, so frontend/package.json should say {semver}, and it says "
            f"{manifest}. Set it with: npm version {semver} --no-git-tag-version (in frontend/)",
            file=sys.stderr,
        )
        return 1

    print(f"version ok: {declared}; the footer shows the same, and the manifest {semver}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
