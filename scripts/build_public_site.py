#!/usr/bin/env python3
"""Build the public static site into ./dist, omitting internal documents."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from public_surface import DIST, build_public_site


def main() -> int:
    written = build_public_site()
    print(f"wrote {len(written)} files to {DIST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
