#!/usr/bin/env python3
"""WCAG contrast for Tachka design tokens. Text needs 4.5:1, graphics 3:1."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "DESIGN.md"


def lin(hex_color: str) -> float:
    c = hex_color.lstrip("#")
    r, g, b = int(c[0:2], 16) / 255, int(c[2:4], 16) / 255, int(c[4:6], 16) / 255

    def f(u: float) -> float:
        return u / 12.92 if u <= 0.04045 else ((u + 0.055) / 1.055) ** 2.4

    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a: str, b: str) -> float:
    hi, lo = max(lin(a), lin(b)), min(lin(a), lin(b))
    return (hi + 0.05) / (lo + 0.05)


def colors() -> dict[str, str]:
    text = DESIGN.read_text()
    front = text.split("---", 2)[1]
    found: dict[str, str] = {}
    for key, value in re.findall(r"^  ([a-z0-9-]+): \"(#[0-9A-Fa-f]{6})\"", front, re.M):
        found[key] = value
    return found


def main() -> int:
    c = colors()
    ink = c["ink"]
    text = c["text"]
    chips = [c["primary"], c["chip-steel"], c["chip-copper"], c["chip-silver"]]
    cells = [c[k] for k in c if k.startswith("cell-")]
    pairs: list[tuple[str, str, str, float, str]] = [
        ("text on neutral", text, c["neutral"], 4.5, "text"),
        ("text on card", text, c["card"], 4.5, "text"),
        ("text on surface", text, c["surface"], 4.5, "text"),
        ("text on raised", text, c["raised"], 4.5, "text"),
        ("muted on card", c["secondary"], c["card"], 4.5, "text"),
        ("ink on gold", ink, c["primary"], 4.5, "text"),
        ("ink on gold-dark", ink, c["tertiary"], 4.5, "text"),
        ("gold on neutral", c["primary"], c["neutral"], 3.0, "graphic"),
        ("gold on surface", c["primary"], c["surface"], 3.0, "graphic"),
        ("broken on card", c["broken"], c["card"], 4.5, "text"),
        ("broken on raised icon", c["broken"], c["raised"], 3.0, "graphic"),
        ("ready on card", c["ready"], c["card"], 4.5, "text"),
        ("rent on card", c["rent"], c["card"], 4.5, "text"),
        ("stamp ink on paper", c["stamp-ink"], c["stamp-paper"], 4.5, "text"),
        ("glyph text on retro", text, c["cell-retro"], 4.5, "text"),
        ("retro fill on neutral", c["cell-retro"], c["neutral"], 3.0, "graphic"),
        ("retro fill on surface", c["cell-retro"], c["surface"], 3.0, "graphic"),
        ("chip stroke on retro", ink, c["cell-retro"], 3.0, "graphic"),
    ]
    for cell_name, cell in ((k, c[k]) for k in c if k.startswith("cell-")):
        pairs.append((f"chip stroke on {cell_name}", ink, cell, 3.0, "graphic"))
    failed = 0
    for name, fg, bg, need, kind in pairs:
        value = ratio(fg, bg)
        ok = value + 1e-9 >= need
        if not ok:
            failed += 1
        print(f"{'OK' if ok else 'FAIL'}  {value:5.2f}  need {need:.1f}  {kind:7}  {name}")
    # Chip fill vs cell is allowed to fail: the stroke is the graphic signal.
    worst = 99.0
    worst_name = ""
    for chip in chips:
        for cell in cells:
            value = ratio(chip, cell)
            if value < worst:
                worst = value
                worst_name = f"{chip} on {cell}"
    print(f"note  chip fill vs cell, worst {worst:.2f} ({worst_name}); stroke carries the 3:1")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
