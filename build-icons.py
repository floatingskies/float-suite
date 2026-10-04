#!/usr/bin/env python3
"""Generate the Float Suite icon set: stylised SVGs plus every raster size.

Source of truth is one SVG per app (same iconography as before, upgraded with
gradients, soft glow and cleaner geometry). PNG/ICO are rendered from those SVGs
with rsvg-convert so every platform icon stays in sync with the brand art.
"""
import os
import struct
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'favicons')
SVG_DIR = OUT

# ---------------------------------------------------------------- SVG sources

PAINT = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <!-- Paint.web: paint brush on a warm gradient tile. Same iconography as the
       original (diagonal brush, ferrule, tip, drip), drawn with depth. -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE98A"/>
      <stop offset="0.55" stop-color="#FFDE59"/>
      <stop offset="1" stop-color="#F5B921"/>
    </linearGradient>
    <linearGradient id="handle" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF6B7F"/>
      <stop offset="0.5" stop-color="#FF3355"/>
      <stop offset="1" stop-color="#C8103E"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.45" stop-color="#E8ECF2"/>
      <stop offset="1" stop-color="#A8B2C0"/>
    </linearGradient>
    <linearGradient id="bristle" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#FF6B7F"/>
      <stop offset="0.55" stop-color="#FF3355"/>
      <stop offset="1" stop-color="#A30D34"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>

  <!-- tile -->
  <rect x="10" y="12" width="108" height="108" rx="24" fill="#000" opacity="0.28" filter="url(#soft)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#bg)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#sheen)"/>
  <circle cx="44" cy="38" r="42" fill="url(#glow)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="none" stroke="#0B0B12" stroke-width="7"/>

  <!-- soft cast shadow of the brush -->
  <g transform="translate(6,7)" opacity="0.35" filter="url(#soft)" fill="#000">
    <rect x="55" y="14" width="18" height="46" rx="9" transform="rotate(-45 64 64)"/>
    <path d="M 54 76 L 74 76 C 72 92 70 100 64 108 C 58 100 56 92 54 76 Z" transform="rotate(-45 64 64)"/>
  </g>

  <!-- brush: drawn upright then rotated, so the silhouette stays clean -->
  <g transform="rotate(-45 64 64)">
    <rect x="55" y="12" width="18" height="48" rx="9" fill="url(#handle)" stroke="#0B0B12" stroke-width="7"/>
    <line x1="61" y1="20" x2="61" y2="46" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
    <rect x="51" y="58" width="26" height="19" rx="3" fill="url(#metal)" stroke="#0B0B12" stroke-width="7"/>
    <line x1="55" y1="66" x2="73" y2="66" stroke="#0B0B12" stroke-width="3.5" stroke-linecap="round" opacity="0.45"/>
    <path d="M 54 77 L 74 77 C 72 93 70 101 64 109 C 58 101 56 93 54 77 Z"
          fill="url(#bristle)" stroke="#0B0B12" stroke-width="7" stroke-linejoin="round"/>
    <path d="M 58 84 C 60 92 61 98 64 104" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.45"/>
  </g>

  <!-- paint drip that fell off the tip -->
  <circle cx="26" cy="104" r="9" fill="#0B0B12"/>
  <circle cx="24" cy="101" r="3" fill="#FFFFFF" opacity="0.35"/>

  <!-- sheen on the tile -->
  <path d="M 26 12 C 42 8 60 8 74 12" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
</svg>
'''

INKLING = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <!-- Inkling: the Blooper-style squid from the original icon, now with a
       glossy mantle, gradient eyes and a soft halo behind it. -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFC2EC"/>
      <stop offset="0.55" stop-color="#FF90E8"/>
      <stop offset="1" stop-color="#E847B4"/>
    </linearGradient>
    <linearGradient id="body" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0" stop-color="#4A4A5C"/>
      <stop offset="0.45" stop-color="#17171F"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="eye" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.6" stop-color="#F2F2F7"/>
      <stop offset="1" stop-color="#C9C9D6"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.5">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>

  <rect x="10" y="12" width="108" height="108" rx="24" fill="#000" opacity="0.28" filter="url(#soft)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#bg)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#sheen)"/>
  <circle cx="64" cy="56" r="46" fill="url(#glow)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="none" stroke="#0B0B12" stroke-width="7"/>

  <!-- soft shadow -->
  <g transform="translate(6,7)" opacity="0.3" filter="url(#soft)">
    <path d="M 64 16 C 88 16 96 36 96 56 C 96 68 92 76 92 80 L 92 84
             C 92 84 100 88 100 96 C 100 104 94 106 88 100 C 86 104 82 104 80 100
             C 78 105 72 105 70 102 C 68 105 62 105 60 102 C 58 105 52 104 50 100
             C 44 104 36 102 36 96 C 36 88 44 84 44 84 L 44 80
             C 44 76 40 68 40 56 C 40 36 40 16 64 16 Z" fill="#000"/>
  </g>

  <!-- squid: pointed mantle, rounded body, six wavy tentacles (same path family as the original) -->
  <path d="M 64 16
           C 88 16 96 36 96 56
           C 96 68 92 76 92 80
           L 92 84
           C 92 84 100 88 100 96
           C 100 104 94 106 88 100
           C 86 104 82 104 80 100
           C 78 105 72 105 70 102
           C 68 105 62 105 60 102
           C 58 105 52 104 50 100
           C 44 104 36 102 36 96
           C 36 88 44 84 44 84
           L 44 80
           C 44 76 40 68 40 56
           C 40 36 40 16 64 16 Z"
        fill="url(#body)" stroke="#0B0B12" stroke-width="7" stroke-linejoin="round"/>

  <!-- eyes -->
  <circle cx="52" cy="46" r="11" fill="url(#eye)" stroke="#0B0B12" stroke-width="5"/>
  <circle cx="76" cy="46" r="11" fill="url(#eye)" stroke="#0B0B12" stroke-width="5"/>
  <circle cx="54" cy="49" r="4.6" fill="#0B0B12"/>
  <circle cx="78" cy="49" r="4.6" fill="#0B0B12"/>
  <circle cx="50" cy="42" r="2.6" fill="#FFFFFF" opacity="0.9"/>
  <circle cx="72" cy="42" r="2.6" fill="#FFFFFF" opacity="0.9"/>

  <!-- highlights -->
  <path d="M 52 28 C 60 24 70 24 76 28" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.45"/>
  <path d="M 24 14 C 40 9 58 9 72 13" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
</svg>
'''

THESIS = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <!-- Thesis: the open book from the original icon, now with curved pages,
       a gold ribbon and a deep blue gradient tile. -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6BA6F5"/>
      <stop offset="0.55" stop-color="#2D7DD2"/>
      <stop offset="1" stop-color="#14448A"/>
    </linearGradient>
    <linearGradient id="pageL" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#DDE3EC"/>
    </linearGradient>
    <linearGradient id="pageR" x1="1" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#D3DAE6"/>
    </linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE066"/>
      <stop offset="1" stop-color="#F0A500"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.4" r="0.55">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>

  <rect x="10" y="12" width="108" height="108" rx="24" fill="#000" opacity="0.32" filter="url(#soft)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#bg)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#sheen)"/>
  <circle cx="64" cy="50" r="46" fill="url(#glow)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="none" stroke="#0B0B12" stroke-width="7"/>

  <!-- shadow -->
  <g transform="translate(6,7)" opacity="0.32" filter="url(#soft)">
    <path d="M 16 40 C 30 34 48 36 62 44 L 62 96 C 48 88 30 86 16 92 Z" fill="#000"/>
    <path d="M 112 40 C 98 34 80 36 66 44 L 66 96 C 80 88 98 86 112 92 Z" fill="#000"/>
  </g>

  <!-- pages -->
  <path d="M 16 40 C 30 34 48 36 62 44 L 62 96 C 48 88 30 86 16 92 Z"
        fill="url(#pageL)" stroke="#0B0B12" stroke-width="7" stroke-linejoin="round"/>
  <path d="M 112 40 C 98 34 80 36 66 44 L 66 96 C 80 88 98 86 112 92 Z"
        fill="url(#pageR)" stroke="#0B0B12" stroke-width="7" stroke-linejoin="round"/>
  <!-- spine -->
  <path d="M 62 44 L 66 44 L 66 96 L 62 96 Z" fill="#0B0B12" opacity="0.85"/>

  <!-- text lines -->
  <g stroke="#0B0B12" stroke-width="5" stroke-linecap="round" opacity="0.85">
    <line x1="26" y1="54" x2="52" y2="59"/>
    <line x1="26" y1="66" x2="52" y2="71"/>
    <line x1="26" y1="78" x2="44" y2="82"/>
    <line x1="76" y1="59" x2="102" y2="54"/>
    <line x1="76" y1="71" x2="102" y2="66"/>
    <line x1="76" y1="82" x2="94" y2="78"/>
  </g>

  <!-- ribbon -->
  <path d="M 84 32 L 94 30 L 94 60 L 89 55 L 84 60 Z"
        fill="url(#ribbon)" stroke="#0B0B12" stroke-width="6" stroke-linejoin="round"/>

  <path d="M 26 14 C 42 9 60 9 74 13" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.4"/>
</svg>
'''

NOTES = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <!-- Notebase: the open notebook from the original icon, with stacked pages
       behind it, a rose ribbon and a violet gradient tile. -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#B79BFF"/>
      <stop offset="0.55" stop-color="#9966FF"/>
      <stop offset="1" stop-color="#5B21B6"/>
    </linearGradient>
    <linearGradient id="pageL" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#E4E1F5"/>
    </linearGradient>
    <linearGradient id="pageR" x1="1" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#DCD8F2"/>
    </linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FF7A9C"/>
      <stop offset="1" stop-color="#E11D48"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.55">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>

  <rect x="10" y="12" width="108" height="108" rx="24" fill="#000" opacity="0.32" filter="url(#soft)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#bg)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#sheen)"/>
  <circle cx="64" cy="52" r="46" fill="url(#glow)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="none" stroke="#0B0B12" stroke-width="7"/>

  <!-- stacked pages behind -->
  <g opacity="0.4" fill="#0B0B12">
    <path d="M 20 52 C 34 46 50 48 62 55 L 62 90 C 50 83 34 81 20 86 Z"/>
    <path d="M 108 52 C 94 46 78 48 66 55 L 66 90 C 78 83 94 81 108 86 Z"/>
  </g>
  <!-- shadow -->
  <g transform="translate(6,7)" opacity="0.3" filter="url(#soft)">
    <path d="M 18 44 C 32 38 48 40 62 48 L 62 94 C 48 87 32 85 18 90 Z" fill="#000"/>
    <path d="M 110 44 C 96 38 80 40 66 48 L 66 94 C 80 87 96 85 110 90 Z" fill="#000"/>
  </g>

  <!-- pages -->
  <path d="M 18 44 C 32 38 48 40 62 48 L 62 94 C 48 87 32 85 18 90 Z"
        fill="url(#pageL)" stroke="#0B0B12" stroke-width="7" stroke-linejoin="round"/>
  <path d="M 110 44 C 96 38 80 40 66 48 L 66 94 C 80 87 96 85 110 90 Z"
        fill="url(#pageR)" stroke="#0B0B12" stroke-width="7" stroke-linejoin="round"/>
  <path d="M 62 48 L 66 48 L 66 94 L 62 94 Z" fill="#0B0B12" opacity="0.85"/>

  <!-- markdown-ish marks: heading bar + bullet lines -->
  <g stroke="#0B0B12" stroke-width="5" stroke-linecap="round" opacity="0.85">
    <line x1="27" y1="57" x2="53" y2="61"/>
    <line x1="27" y1="72" x2="45" y2="75"/>
    <line x1="75" y1="61" x2="101" y2="57"/>
    <line x1="83" y1="75" x2="101" y2="72"/>
  </g>

  <!-- ribbon -->
  <path d="M 56 86 L 68 86 L 68 118 L 62 111 L 56 118 Z"
        fill="url(#ribbon)" stroke="#0B0B12" stroke-width="6" stroke-linejoin="round"/>

  <path d="M 26 14 C 42 9 60 9 74 13" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.4"/>
</svg>
'''

FLOAT = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <!-- Float Suite: the same 2x2 grid of app marks as the original, unified on a
       neutral gradient tile with one shared highlight. -->
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FBFAF7"/>
      <stop offset="0.5" stop-color="#F1F0EC"/>
      <stop offset="1" stop-color="#DEDDD6"/>
    </linearGradient>
    <linearGradient id="paint" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE98A"/><stop offset="1" stop-color="#F5B921"/>
    </linearGradient>
    <linearGradient id="inkling" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFC2EC"/><stop offset="1" stop-color="#E847B4"/>
    </linearGradient>
    <linearGradient id="thesis" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6BA6F5"/><stop offset="1" stop-color="#14448A"/>
    </linearGradient>
    <linearGradient id="mark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3A3A46"/><stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.35" r="0.6">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.75"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.6"/>
      <stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>

  <rect x="10" y="12" width="108" height="108" rx="24" fill="#000" opacity="0.25" filter="url(#soft)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#bg)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="url(#sheen)"/>
  <circle cx="64" cy="44" r="52" fill="url(#glow)"/>
  <rect x="6" y="6" width="116" height="116" rx="24" fill="none" stroke="#0B0B12" stroke-width="7"/>

  <!-- tile shadows -->
  <g opacity="0.22" filter="url(#soft)" fill="#000">
    <rect x="22" y="26" width="42" height="42" rx="10" transform="translate(4,4)"/>
    <rect x="70" y="26" width="42" height="42" rx="10" transform="translate(4,4)"/>
    <rect x="22" y="74" width="42" height="42" rx="10" transform="translate(4,4)"/>
    <rect x="70" y="74" width="42" height="42" rx="10" transform="translate(4,4)"/>
  </g>

  <!-- Paint -->
  <rect x="20" y="22" width="42" height="42" rx="10" fill="url(#paint)" stroke="#0B0B12" stroke-width="5"/>
  <g transform="rotate(-45 41 43)">
    <rect x="38" y="28" width="6" height="14" rx="3" fill="#0B0B12"/>
    <rect x="35.5" y="41" width="11" height="7" rx="1.5" fill="#FFFFFF" stroke="#0B0B12" stroke-width="2.5"/>
    <path d="M 36.5 48 L 45.5 48 C 45 53 44.5 55 41 58 C 37.5 55 37 53 36.5 48 Z" fill="#FF3355" stroke="#0B0B12" stroke-width="2.5" stroke-linejoin="round"/>
  </g>

  <!-- Inkling -->
  <rect x="68" y="22" width="42" height="42" rx="10" fill="url(#inkling)" stroke="#0B0B12" stroke-width="5"/>
  <path d="M 89 30 C 96 30 99 36 99 43 C 99 47 97 49 97 51 C 97 51 99 53 99 56
           C 99 59 96 59 94 57 C 93 59 91 59 90 57 C 88 59 85 59 84 56
           C 83 59 80 58 80 56 C 80 53 82 51 82 51 C 82 49 81 47 81 43
           C 81 36 82 30 89 30 Z" fill="#0B0B12"/>
  <circle cx="86" cy="41" r="2.4" fill="#FFC2EC"/>
  <circle cx="93" cy="41" r="2.4" fill="#FFC2EC"/>

  <!-- Thesis -->
  <rect x="20" y="70" width="42" height="42" rx="10" fill="url(#thesis)" stroke="#0B0B12" stroke-width="5"/>
  <path d="M 27 80 L 41 82 L 41 102 L 27 100 Z" fill="#FFFFFF" stroke="#0B0B12" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M 55 80 L 41 82 L 41 102 L 55 100 Z" fill="#EAF1FB" stroke="#0B0B12" stroke-width="3.5" stroke-linejoin="round"/>
  <line x1="30" y1="87" x2="38" y2="88.5" stroke="#0B0B12" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="30" y1="93" x2="38" y2="94.5" stroke="#0B0B12" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="44" y1="88.5" x2="52" y2="87" stroke="#0B0B12" stroke-width="2.6" stroke-linecap="round"/>
  <line x1="44" y1="94.5" x2="52" y2="93" stroke="#0B0B12" stroke-width="2.6" stroke-linecap="round"/>

  <!-- F mark -->
  <rect x="68" y="70" width="42" height="42" rx="10" fill="url(#mark)" stroke="#0B0B12" stroke-width="5"/>
  <text x="89" y="103" font-family="Arial Black, DejaVu Sans, sans-serif" font-size="30" font-weight="900" fill="#FFDE59" text-anchor="middle">F</text>

  <path d="M 26 14 C 42 9 60 9 74 13" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.55"/>
</svg>
'''

SOURCES = {
    'paint': PAINT,
    'inkling': INKLING,
    'thesis': THESIS,
    'notes': NOTES,
    'float': FLOAT,
}

SIZES = [16, 32, 48, 180, 256, 512]


def write_ico(pngs, dest):
    """Pack PNGs into a Windows .ico (PNG-compressed entries, Vista+)."""
    entries = []
    for size, data in pngs:
        entries.append(struct.pack(
            '<BBBBHHII',
            0 if size >= 256 else size,
            0 if size >= 256 else size,
            0, 0, 1, 32, len(data), 6 + 16 * len(pngs) + sum(len(d) for _, d in pngs)
        ))
        entries.append(data)
    offset = 6 + 16 * len(pngs)
    out = [struct.pack('<HHH', 0, 1, len(pngs))]
    for i, (size, data) in enumerate(pngs):
        head = struct.pack(
            '<BBBBHHII',
            0 if size >= 256 else size,
            0 if size >= 256 else size,
            0, 0, 1, 32, len(data), offset
        )
        out.append(head)
        offset += len(data)
    for _, data in pngs:
        out.append(data)
    with open(dest, 'wb') as f:
        f.write(b''.join(out))


def main():
    os.makedirs(SVG_DIR, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)

    for name, svg in SOURCES.items():
        svg_path = os.path.join(SVG_DIR, name + '.svg')
        with open(svg_path, 'w') as f:
            f.write(svg)
        # the published favicon copy used by the pages
        with open(os.path.join(OUT, name + '.svg'), 'w') as f:
            f.write(svg)

        for size in SIZES:
            dest = os.path.join(OUT, '%s-%d.png' % (name, size))
            subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size),
                            '-b', 'none', svg_path, '-o', dest], check=True)
        # apple touch / generic icon copy
        import shutil
        shutil.copyfile(os.path.join(OUT, '%s-180.png' % name),
                        os.path.join(OUT, '%s-apple-touch.png' % name))
        shutil.copyfile(os.path.join(OUT, '%s-512.png' % name),
                        os.path.join(OUT, '%s-icon.png' % name))

        ico_sizes = [16, 32, 48, 256]
        pngs = [(s, open(os.path.join(OUT, '%s-%d.png' % (name, s)), 'rb').read()) for s in ico_sizes]
        write_ico(pngs, os.path.join(OUT, name + '.ico'))
        print('rendered', name)


if __name__ == '__main__':
    main()