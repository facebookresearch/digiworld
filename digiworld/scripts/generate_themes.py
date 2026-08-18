#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""One-shot script to generate 10 diverse, sensible themes per app.

For each app, reads the existing base theme.json (from the default profile)
to capture the exact schema, then produces 10 color-varied copies that
preserve all structural keys (typography, spacing, borderRadius, etc.).

Themes are written to state_data/{bundle_id}/.themes/.
Existing theme files in that directory are left untouched.
"""

import copy
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import digiworld

# ---------------------------------------------------------------------------
# Font families available on Android.
# spaceGrotesk is bundled via @expo-google-fonts; sans-serif is system Roboto.
# ---------------------------------------------------------------------------

FONT_FAMILIES = {
    "spaceGrotesk": {
        "light": "spaceGroteskLight",
        "normal": "spaceGroteskRegular",
        "medium": "spaceGroteskMedium",
        "semiBold": "spaceGroteskSemiBold",
        "bold": "spaceGroteskBold",
    },
    "sansSerif": {
        "light": "sans-serif-light",
        "normal": "sans-serif",
        "medium": "sans-serif-medium",
        "semiBold": "sans-serif-medium",
        "bold": "sans-serif",
    },
}

# ---------------------------------------------------------------------------
# 10 color palettes -- each is a dict defining the full color set.
# Light themes use dark neutrals for text; dark themes use light neutrals.
# "font" assigns one of the two available font families (5 each).
# ---------------------------------------------------------------------------

PALETTES = [
    {
        "key": "ocean-blue",
        "name_suffix": "Ocean Blue",
        "mode": "light",
        "font": "spaceGrotesk",
        "neutrals": {
            "100": "#FFFFFF", "200": "#F5F7FA", "300": "#E1E5EB",
            "400": "#C4CAD4", "500": "#98A1B0", "600": "#5F6B7A",
            "700": "#3D4754", "800": "#1E2733", "900": "#0A0F14",
        },
        "primary": {
            "100": "#DBEAFE", "200": "#BFDBFE", "300": "#93C5FD",
            "400": "#60A5FA", "500": "#2563EB", "600": "#1D4ED8",
        },
        "secondary": {
            "100": "#E0F2FE", "200": "#BAE6FD", "300": "#7DD3FC",
            "400": "#38BDF8", "500": "#0EA5E9",
        },
        "accent": {
            "100": "#FEF3C7", "200": "#FDE68A", "300": "#FCD34D",
            "400": "#FBBF24", "500": "#F59E0B",
        },
        "semantic_bg": "#F5F7FA",
        "semantic_text": "#1E2733",
        "semantic_text_dim": "#5F6B7A",
        "semantic_border": "#C4CAD4",
        "semantic_tint": "#2563EB",
        "semantic_tint_inactive": "#E1E5EB",
        "semantic_separator": "#E1E5EB",
    },
    {
        "key": "emerald",
        "name_suffix": "Emerald",
        "mode": "light",
        "font": "spaceGrotesk",
        "neutrals": {
            "100": "#FFFFFF", "200": "#F0FAF4", "300": "#D5EDE0",
            "400": "#AACFBA", "500": "#7DAF91", "600": "#4D7D5E",
            "700": "#355744", "800": "#1C3329", "900": "#0A1610",
        },
        "primary": {
            "100": "#D1FAE5", "200": "#A7F3D0", "300": "#6EE7B7",
            "400": "#34D399", "500": "#059669", "600": "#047857",
        },
        "secondary": {
            "100": "#CCFBF1", "200": "#99F6E4", "300": "#5EEAD4",
            "400": "#2DD4BF", "500": "#14B8A6",
        },
        "accent": {
            "100": "#FEF9C3", "200": "#FEF08A", "300": "#FDE047",
            "400": "#FACC15", "500": "#EAB308",
        },
        "semantic_bg": "#F0FAF4",
        "semantic_text": "#1C3329",
        "semantic_text_dim": "#4D7D5E",
        "semantic_border": "#AACFBA",
        "semantic_tint": "#059669",
        "semantic_tint_inactive": "#D5EDE0",
        "semantic_separator": "#D5EDE0",
    },
    {
        "key": "royal-purple",
        "name_suffix": "Royal Purple",
        "mode": "light",
        "font": "spaceGrotesk",
        "neutrals": {
            "100": "#FFFFFF", "200": "#F5F3FF", "300": "#E2DDF5",
            "400": "#C4BCe0", "500": "#9E93C4", "600": "#6B5F96",
            "700": "#4A3F6E", "800": "#2A2344", "900": "#110E1C",
        },
        "primary": {
            "100": "#EDE9FE", "200": "#DDD6FE", "300": "#C4B5FD",
            "400": "#A78BFA", "500": "#7C3AED", "600": "#6D28D9",
        },
        "secondary": {
            "100": "#FCE7F3", "200": "#FBCFE8", "300": "#F9A8D4",
            "400": "#F472B6", "500": "#EC4899",
        },
        "accent": {
            "100": "#FFF7ED", "200": "#FFEDD5", "300": "#FDBA74",
            "400": "#FB923C", "500": "#F97316",
        },
        "semantic_bg": "#F5F3FF",
        "semantic_text": "#2A2344",
        "semantic_text_dim": "#6B5F96",
        "semantic_border": "#C4BCe0",
        "semantic_tint": "#7C3AED",
        "semantic_tint_inactive": "#E2DDF5",
        "semantic_separator": "#E2DDF5",
    },
    {
        "key": "sunset-orange",
        "name_suffix": "Sunset Orange",
        "mode": "light",
        "font": "spaceGrotesk",
        "neutrals": {
            "100": "#FFFFFF", "200": "#FFF7ED", "300": "#FFE6CC",
            "400": "#DDCAB3", "500": "#B09B80", "600": "#7A6A52",
            "700": "#544736", "800": "#30281E", "900": "#14100A",
        },
        "primary": {
            "100": "#FFEDD5", "200": "#FED7AA", "300": "#FDBA74",
            "400": "#FB923C", "500": "#EA580C", "600": "#C2410C",
        },
        "secondary": {
            "100": "#FEF2F2", "200": "#FECACA", "300": "#FCA5A5",
            "400": "#F87171", "500": "#EF4444",
        },
        "accent": {
            "100": "#FEF3C7", "200": "#FDE68A", "300": "#FCD34D",
            "400": "#FBBF24", "500": "#D97706",
        },
        "semantic_bg": "#FFF7ED",
        "semantic_text": "#30281E",
        "semantic_text_dim": "#7A6A52",
        "semantic_border": "#DDCAB3",
        "semantic_tint": "#EA580C",
        "semantic_tint_inactive": "#FFE6CC",
        "semantic_separator": "#FFE6CC",
    },
    {
        "key": "rose",
        "name_suffix": "Rose",
        "mode": "light",
        "font": "sansSerif",
        "neutrals": {
            "100": "#FFFFFF", "200": "#FFF1F2", "300": "#FFE0E3",
            "400": "#E0BFC3", "500": "#B5949A", "600": "#7E6268",
            "700": "#584347", "800": "#322528", "900": "#160E10",
        },
        "primary": {
            "100": "#FCE7F3", "200": "#FBCFE8", "300": "#F9A8D4",
            "400": "#F472B6", "500": "#DB2777", "600": "#BE185D",
        },
        "secondary": {
            "100": "#FFF1F2", "200": "#FFE4E6", "300": "#FECDD3",
            "400": "#FDA4AF", "500": "#F43F5E",
        },
        "accent": {
            "100": "#FDF4FF", "200": "#FAE8FF", "300": "#F0ABFC",
            "400": "#E879F9", "500": "#C026D3",
        },
        "semantic_bg": "#FFF1F2",
        "semantic_text": "#322528",
        "semantic_text_dim": "#7E6268",
        "semantic_border": "#E0BFC3",
        "semantic_tint": "#DB2777",
        "semantic_tint_inactive": "#FFE0E3",
        "semantic_separator": "#FFE0E3",
    },
    {
        "key": "teal",
        "name_suffix": "Teal",
        "mode": "light",
        "font": "sansSerif",
        "neutrals": {
            "100": "#FFFFFF", "200": "#F0FDFA", "300": "#D4EDE8",
            "400": "#AAD1C8", "500": "#7EB0A3", "600": "#4E8577",
            "700": "#365E53", "800": "#1E3630", "900": "#0C1613",
        },
        "primary": {
            "100": "#CCFBF1", "200": "#99F6E4", "300": "#5EEAD4",
            "400": "#2DD4BF", "500": "#0D9488", "600": "#0F766E",
        },
        "secondary": {
            "100": "#CFFAFE", "200": "#A5F3FC", "300": "#67E8F9",
            "400": "#22D3EE", "500": "#06B6D4",
        },
        "accent": {
            "100": "#ECFDF5", "200": "#D1FAE5", "300": "#6EE7B7",
            "400": "#34D399", "500": "#10B981",
        },
        "semantic_bg": "#F0FDFA",
        "semantic_text": "#1E3630",
        "semantic_text_dim": "#4E8577",
        "semantic_border": "#AAD1C8",
        "semantic_tint": "#0D9488",
        "semantic_tint_inactive": "#D4EDE8",
        "semantic_separator": "#D4EDE8",
    },
    {
        "key": "warm-earth",
        "name_suffix": "Warm Earth",
        "mode": "light",
        "font": "sansSerif",
        "neutrals": {
            "100": "#FFFFFF", "200": "#FAF5F0", "300": "#E8DDD3",
            "400": "#CFC0B1", "500": "#A89888",
            "600": "#756558", "700": "#524539", "800": "#302720",
            "900": "#140F0B",
        },
        "primary": {
            "100": "#EFEBE9", "200": "#D7CCC8", "300": "#BCAAA4",
            "400": "#A1887F", "500": "#795548", "600": "#5D4037",
        },
        "secondary": {
            "100": "#FBE9E7", "200": "#FFCCBC", "300": "#FF8A65",
            "400": "#FF7043", "500": "#E64A19",
        },
        "accent": {
            "100": "#FFF8E1", "200": "#FFECB3", "300": "#FFD54F",
            "400": "#FFCA28", "500": "#FFB300",
        },
        "semantic_bg": "#FAF5F0",
        "semantic_text": "#302720",
        "semantic_text_dim": "#756558",
        "semantic_border": "#CFC0B1",
        "semantic_tint": "#795548",
        "semantic_tint_inactive": "#E8DDD3",
        "semantic_separator": "#E8DDD3",
    },
    {
        "key": "midnight",
        "name_suffix": "Midnight",
        "mode": "dark",
        "font": "spaceGrotesk",
        "neutrals": {
            "100": "#030712", "200": "#111827", "300": "#1F2937",
            "400": "#374151", "500": "#6B7280", "600": "#9CA3AF",
            "700": "#D1D5DB", "800": "#E5E7EB", "900": "#F9FAFB",
        },
        "primary": {
            "100": "#DBEAFE", "200": "#BFDBFE", "300": "#93C5FD",
            "400": "#60A5FA", "500": "#3B82F6", "600": "#2563EB",
        },
        "secondary": {
            "100": "#E0F2FE", "200": "#BAE6FD", "300": "#7DD3FC",
            "400": "#38BDF8", "500": "#0EA5E9",
        },
        "accent": {
            "100": "#ECFDF5", "200": "#D1FAE5", "300": "#6EE7B7",
            "400": "#34D399", "500": "#10B981",
        },
        "semantic_bg": "#111827",
        "semantic_text": "#F9FAFB",
        "semantic_text_dim": "#9CA3AF",
        "semantic_border": "#374151",
        "semantic_tint": "#60A5FA",
        "semantic_tint_inactive": "#6B7280",
        "semantic_separator": "#1F2937",
    },
    {
        "key": "dark-emerald",
        "name_suffix": "Dark Emerald",
        "mode": "dark",
        "font": "sansSerif",
        "neutrals": {
            "100": "#022C22", "200": "#064E3B", "300": "#14332A",
            "400": "#1E3D33", "500": "#5F8578", "600": "#8FAFA4",
            "700": "#B8CFC7", "800": "#D8E8E3", "900": "#F0FAF5",
        },
        "primary": {
            "100": "#D1FAE5", "200": "#A7F3D0", "300": "#6EE7B7",
            "400": "#34D399", "500": "#10B981", "600": "#059669",
        },
        "secondary": {
            "100": "#CCFBF1", "200": "#99F6E4", "300": "#5EEAD4",
            "400": "#2DD4BF", "500": "#14B8A6",
        },
        "accent": {
            "100": "#FEF3C7", "200": "#FDE68A", "300": "#FCD34D",
            "400": "#FBBF24", "500": "#F59E0B",
        },
        "semantic_bg": "#064E3B",
        "semantic_text": "#F0FAF5",
        "semantic_text_dim": "#8FAFA4",
        "semantic_border": "#1E3D33",
        "semantic_tint": "#34D399",
        "semantic_tint_inactive": "#5F8578",
        "semantic_separator": "#14332A",
    },
    {
        "key": "charcoal-amber",
        "name_suffix": "Charcoal Amber",
        "mode": "dark",
        "font": "sansSerif",
        "neutrals": {
            "100": "#0C0A09", "200": "#1C1917", "300": "#292524",
            "400": "#44403C", "500": "#78716C", "600": "#A8A29E",
            "700": "#D6D3D1", "800": "#E7E5E4", "900": "#FAFAF9",
        },
        "primary": {
            "100": "#FEF3C7", "200": "#FDE68A", "300": "#FCD34D",
            "400": "#FBBF24", "500": "#F59E0B", "600": "#D97706",
        },
        "secondary": {
            "100": "#FFEDD5", "200": "#FED7AA", "300": "#FDBA74",
            "400": "#FB923C", "500": "#EA580C",
        },
        "accent": {
            "100": "#FEF2F2", "200": "#FECACA", "300": "#FCA5A5",
            "400": "#F87171", "500": "#EF4444",
        },
        "semantic_bg": "#1C1917",
        "semantic_text": "#FAFAF9",
        "semantic_text_dim": "#A8A29E",
        "semantic_border": "#44403C",
        "semantic_tint": "#FBBF24",
        "semantic_tint_inactive": "#78716C",
        "semantic_separator": "#292524",
    },
]

# Stable error/success colors shared across all themes
ANGRY_LIGHT = {
    "100": "#FEF2F2", "200": "#FECACA", "300": "#F87171",
    "400": "#EF4444", "500": "#DC2626",
}
ANGRY_DARK = {
    "100": "#DC2626", "200": "#EF4444", "300": "#F87171",
    "400": "#FCA5A5", "500": "#FECACA",
}
SUCCESS_LIGHT = {
    "100": "#ECFDF5", "200": "#D1FAE5", "300": "#6EE7B7",
    "400": "#34D399", "500": "#059669",
}
SUCCESS_DARK = {
    "100": "#064E3B", "200": "#065F46", "300": "#34D399",
    "400": "#6EE7B7", "500": "#A7F3D0",
}


def _apply_palette_to_theme(base_theme: dict, palette: dict, app_name: str) -> dict:
    """Deep-copy base_theme and replace color values with the given palette."""
    theme = copy.deepcopy(base_theme)
    is_dark = palette["mode"] == "dark"

    theme["name"] = f"{app_name} {palette['name_suffix']}"
    theme["mode"] = palette["mode"]

    # Apply font family
    font_key = palette.get("font", "spaceGrotesk")
    font_family = FONT_FAMILIES[font_key]
    if "typography" in theme:
        theme["typography"]["primary"] = dict(font_family)

    angry = ANGRY_DARK if is_dark else ANGRY_LIGHT
    success = SUCCESS_DARK if is_dark else SUCCESS_LIGHT

    p = theme.get("colors", {}).get("palette", {})
    n = palette["neutrals"]
    pr = palette["primary"]
    sec = palette["secondary"]
    acc = palette["accent"]

    # Neutrals
    for level in ["100", "200", "300", "400", "500", "600", "700", "800", "900"]:
        k = f"neutral{level}"
        if k in p:
            p[k] = n[level]

    # Primary -- handle both solid hex and rgba patterns
    for level in ["100", "200", "300", "400"]:
        k = f"primary{level}"
        if k in p:
            p[k] = pr[level]
    # primary500 and primary600: some apps use rgba, preserve that pattern
    for level in ["500", "600"]:
        k = f"primary{level}"
        if k in p:
            old_val = str(p[k])
            if old_val.startswith("rgba"):
                hex_color = pr.get(level[0] + "00", pr["400"])
                r, g, b = _hex_to_rgb(pr["400"])
                opacity = 0.3 if level == "500" else 0.15
                p[k] = f"rgba({r}, {g}, {b}, {opacity})"
            else:
                p[k] = pr[level]

    # Secondary
    for level in ["100", "200", "300", "400", "500"]:
        k = f"secondary{level}"
        if k in p:
            p[k] = sec[level]

    # Accent
    for level in ["100", "200", "300", "400", "500"]:
        k = f"accent{level}"
        if k in p:
            p[k] = acc[level]

    # Angry
    for level in ["100", "200", "300", "400", "500"]:
        k = f"angry{level}"
        if k in p:
            p[k] = angry[level]

    # Success
    for level in ["100", "200", "300", "400", "500"]:
        k = f"success{level}"
        if k in p:
            p[k] = success[level]

    # Overlays
    dark_base = n["200"] if is_dark else n["800"]
    r, g, b = _hex_to_rgb(dark_base)
    if "overlay20" in p:
        p["overlay20"] = f"rgba({r}, {g}, {b}, 0.2)"
    if "overlay50" in p:
        p["overlay50"] = f"rgba({r}, {g}, {b}, 0.5)"
    if "overlay80" in p:
        p["overlay80"] = f"rgba({r}, {g}, {b}, 0.8)"

    # Extended palette keys (qwikshop has 50-900 ranges, etc.) -- skip extras
    # that don't map to our standard set; leave them from the deep copy.

    # Semantic colors
    sem = theme.get("colors", {}).get("semantic", {})
    if "text" in sem:
        sem["text"] = palette["semantic_text"]
    if "textDim" in sem:
        sem["textDim"] = palette["semantic_text_dim"]
    if "textMuted" in sem:
        sem["textMuted"] = palette["semantic_text_dim"]
    if "background" in sem:
        sem["background"] = palette["semantic_bg"]
    if "backgroundElevated" in sem:
        sem["backgroundElevated"] = n["300"] if is_dark else n["100"]
    if "backgroundSecondary" in sem:
        sem["backgroundSecondary"] = n["300"] if is_dark else n["100"]
    if "border" in sem:
        sem["border"] = palette["semantic_border"]
    if "tint" in sem:
        sem["tint"] = palette["semantic_tint"]
    if "tintInactive" in sem:
        sem["tintInactive"] = palette["semantic_tint_inactive"]
    if "separator" in sem:
        sem["separator"] = palette["semantic_separator"]
    if "error" in sem:
        sem["error"] = angry["400"]
    if "errorBackground" in sem:
        sem["errorBackground"] = angry["100"]
    if "success" in sem:
        sem["success"] = success["400"]
    if "successBackground" in sem:
        sem["successBackground"] = success["100"]

    # Extended semantic (auction glassmorphism, etc.)
    if "card" in sem:
        sem["card"] = n["100"] if not is_dark else n["300"]
    if "cardBackground" in sem:
        sem["cardBackground"] = n["100"] if not is_dark else n["300"]
    if "cardBorder" in sem:
        sem["cardBorder"] = palette["semantic_border"]
    if "surface" in sem:
        sem["surface"] = n["100"] if not is_dark else n["300"]
    if "surfaceElevated" in sem:
        sem["surfaceElevated"] = n["100"] if not is_dark else n["400"]
    for gk in ["glassBackground", "glassBorder", "glassText"]:
        if gk in sem:
            if gk == "glassBackground":
                r2, g2, b2 = _hex_to_rgb(n["100"] if not is_dark else n["300"])
                sem[gk] = f"rgba({r2}, {g2}, {b2}, 0.7)"
            elif gk == "glassBorder":
                r2, g2, b2 = _hex_to_rgb(n["100"] if not is_dark else n["400"])
                sem[gk] = f"rgba({r2}, {g2}, {b2}, 0.3)"
            elif gk == "glassText":
                sem[gk] = palette["semantic_text"]
    for gk in ["gradientStart", "gradientMiddle", "gradientEnd"]:
        if gk in sem:
            if gk == "gradientStart":
                sem[gk] = pr["500"]
            elif gk == "gradientMiddle":
                sem[gk] = pr["400"]
            elif gk == "gradientEnd":
                sem[gk] = sec["500"]
    if "pressedOverlay" in sem:
        sem["pressedOverlay"] = f"rgba({r}, {g}, {b}, 0.1)"
    if "hoverOverlay" in sem:
        sem["hoverOverlay"] = f"rgba({r}, {g}, {b}, 0.05)"

    # Shadows (shadowColor usually matches primary)
    shadows = theme.get("shadows", {})
    for shadow_key in shadows:
        if isinstance(shadows[shadow_key], dict) and "shadowColor" in shadows[shadow_key]:
            shadows[shadow_key]["shadowColor"] = pr["500"]

    # Components
    comps = theme.get("components", {})

    btn = comps.get("button", {})
    if "primaryBackground" in btn:
        btn["primaryBackground"] = pr["500"]
    if "primaryText" in btn:
        btn["primaryText"] = _text_color_for_bg(pr["500"])
    if "secondaryBackground" in btn:
        btn["secondaryBackground"] = pr["100"]
    if "secondaryText" in btn:
        btn["secondaryText"] = pr["600"]

    inp = comps.get("input", {})
    if "backgroundColor" in inp:
        inp["backgroundColor"] = n["100"] if not is_dark else n["300"]
    if "borderColor" in inp:
        inp["borderColor"] = pr["200"]
    if "focusBorderColor" in inp:
        inp["focusBorderColor"] = pr["400"]
    if "placeholderColor" in inp:
        r2, g2, b2 = _hex_to_rgb(palette["semantic_text_dim"])
        inp["placeholderColor"] = f"rgba({r2}, {g2}, {b2}, 0.6)"
    if "textColor" in inp:
        inp["textColor"] = palette["semantic_text"]

    screen = comps.get("screen", {})
    if "backgroundColor" in screen:
        screen["backgroundColor"] = palette["semantic_bg"]

    # Player component (music app)
    player = comps.get("player", {})
    if "backgroundColor" in player:
        player["backgroundColor"] = n["200"] if not is_dark else n["200"]
    if "controlsColor" in player:
        player["controlsColor"] = palette["semantic_text"]
    if "progressBarColor" in player:
        player["progressBarColor"] = pr["500"]
    if "progressBarBackground" in player:
        player["progressBarBackground"] = n["400"]

    # authSheet (qwikshop)
    auth = comps.get("authSheet", {})
    if "backgroundColor" in auth:
        auth["backgroundColor"] = n["100"] if not is_dark else n["200"]
    if "handleColor" in auth:
        auth["handleColor"] = n["400"]

    return theme


def _hex_to_rgb(hex_color: str) -> tuple:
    """Convert #RRGGBB to (R, G, B) ints."""
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _relative_luminance(hex_color: str) -> float:
    """WCAG relative luminance of a hex color."""
    r, g, b = _hex_to_rgb(hex_color)
    def linearize(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)


def _text_color_for_bg(bg_hex: str) -> str:
    """Return black or white depending on which gives better WCAG contrast.

    The crossover luminance where black and white produce equal contrast
    ratios against the background is ~0.179.
    """
    return "#000000" if _relative_luminance(bg_hex) > 0.179 else "#FFFFFF"


def _find_base_theme(app_dir: Path) -> dict:
    """Read the theme.json from the first profile that has one."""
    for profile_dir in sorted(app_dir.iterdir()):
        if not profile_dir.is_dir() or profile_dir.name == ".themes":
            continue
        theme_file = profile_dir / "theme.json"
        if theme_file.exists():
            with open(theme_file) as f:
                return json.load(f)
    raise FileNotFoundError(f"No theme.json found in any profile under {app_dir}")


# Map bundle_id -> human-friendly app name for theme naming
APP_DISPLAY_NAMES = {
    "com.andojoauction.sbx": "Auction",
    "com.andojobank.sbx": "Banking",
    "com.andojoeats.sbx": "Eats",
    "com.andojofly.sbx": "Fly",
    "com.andojomail.sbx": "Email",
    "com.andojomessage.sbx": "Message",
    "com.andojomusic.sbx": "Music",
    "com.andojopark.sbx": "Parking",
    "com.andojopay.sbx": "Payment",
    "com.andojoqwikshop.sbx": "Qwikshop",
    "com.andojoryde.sbx": "Ryde",
    "com.andojoshop.sbx": "Shop",
    "com.andojosmarthome.sbx": "SmartHome",
    "com.andojotransit.sbx": "Transit",
    "com.andojovideo.sbx": "Video",
}


def main():
    state_data = Path(digiworld.get_state_data_path().rstrip("/"))

    total_created = 0
    total_skipped = 0

    for app_dir in sorted(state_data.iterdir()):
        if not app_dir.is_dir():
            continue
        bundle_id = app_dir.name
        app_name = APP_DISPLAY_NAMES.get(bundle_id, bundle_id)

        base_theme = _find_base_theme(app_dir)
        themes_dir = app_dir / ".themes"
        themes_dir.mkdir(exist_ok=True)

        for palette in PALETTES:
            filename = f"{palette['key']}.json"
            out_path = themes_dir / filename

            if out_path.exists():
                total_skipped += 1
                continue

            themed = _apply_palette_to_theme(base_theme, palette, app_name)
            with open(out_path, "w") as f:
                json.dump(themed, f, indent=2)
                f.write("\n")

            total_created += 1
            print(f"  {bundle_id}/.themes/{filename}")

    print(f"\nDone. Created {total_created} theme files, skipped {total_skipped} existing.")


if __name__ == "__main__":
    main()
