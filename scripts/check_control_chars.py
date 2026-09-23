#!/usr/bin/env python
"""No tracked text file carries a control character that is really a lost backslash.

Writing `\\text`, `\\bigl`, `\\approx` or `.\\run.ps1` through an inline Python heredoc drops one
backslash level, and the escape lands as a control character: `\\t` a tab, `\\b` a backspace, `\\a`
a bell, `\\r` a carriage return. Nothing fails. KaTeX reads a tab as a space and typesets
"ext{a sampled item is wrong}" as italic letters with no braces, so the gate's check for the text
"ext{" saw nothing; a README showed `.` and a line break where `.\\run.ps1` belonged. Two equations
on the Experiments page and every run command in the README shipped that way.

So the check is on the bytes, where the defect is certain: any C0 control character other than a
line feed, and a carriage return only as half of a CRLF pair, fails. Tabs are included, because this
repository indents with spaces and every tab it ever held was a lost `\\t`.

Stdlib only, so it runs as an ordinary CI step with no install.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

#: Binary formats, where control bytes are content.
BINARY = (".png", ".jpg", ".jpeg", ".gif", ".ico", ".wasm", ".woff", ".woff2", ".ttf", ".pdf")

#: Any C0 control except LF, and a CR not followed by LF.
BAD = re.compile(r"[\x00-\x09\x0b\x0c\x0e-\x1f\x7f]|\r(?!\n)")

NAMES = {0x09: "tab", 0x08: "backspace", 0x07: "bell", 0x0C: "form feed", 0x0B: "vertical tab", 0x0D: "carriage return"}


def main() -> int:
    tracked = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, check=True
    ).stdout.decode("utf-8").split("\0")
    findings: list[str] = []
    for name in filter(None, tracked):
        if name.lower().endswith(BINARY):
            continue
        path = ROOT / name
        if not path.is_file():
            continue
        text = path.read_bytes().decode("utf-8", errors="replace")
        for match in BAD.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            code = ord(match.group()[0])
            context = text[max(0, match.start() - 24) : match.start()].split("\n")[-1]
            findings.append(f"{name}:{line}: {NAMES.get(code, hex(code))} after {context!r}")

    if findings:
        print("control characters in tracked text, each most likely a lost backslash:", file=sys.stderr)
        for finding in findings[:40]:
            print(f"  {finding}", file=sys.stderr)
        if len(findings) > 40:
            print(f"  ... and {len(findings) - 40} more", file=sys.stderr)
        return 1
    print(f"control characters: none in {len([t for t in tracked if t])} tracked files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
