// Hand-authored top-down SVG sprites. Everything faces +x (right) so it can be rotated to a heading.
// Rasterised at TEX_SCALE x at boot (see textures.js) so the art stays crisp when the canvas is upscaled.

const wrap = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `<defs><filter id="b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1"/></filter>` +
  `<filter id="b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>` +
  `<filter id="b4" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4"/></filter>${defs}</defs>${body}</svg>`;

const shadow = (cx, cy, rx, ry, op = 0.45) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${op}" filter="url(#b2)"/>`;

// ----------------------------------------------------------------------------------------- posts
const plinth = (inner, defs = '') => wrap(64, 64, shadow(32, 34, 29, 29, 0.55) + inner, defs);

const POST_BASES = {
  sixgun: plinth(`
    <circle cx="32" cy="32" r="28" fill="url(#st)" stroke="#2a211a" stroke-width="2"/>
    <circle cx="32" cy="32" r="23" fill="none" stroke="#8a5a3a" stroke-width="3"/>
    <circle cx="32" cy="32" r="19" fill="#3a2e24"/>
    ${[0, 60, 120, 180, 240, 300].map(a => `<circle cx="${32 + 25.5 * Math.cos((a * Math.PI) / 180)}" cy="${32 + 25.5 * Math.sin((a * Math.PI) / 180)}" r="1.8" fill="#d6b25e"/>`).join('')}
    <circle cx="32" cy="32" r="28" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"/>`,
  `<radialGradient id="st" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#8d8272"/><stop offset="1" stop-color="#4d453b"/></radialGradient>`),

  sigul: plinth(`
    <polygon points="32,3 53,11 61,32 53,53 32,61 11,53 3,32 11,11" fill="url(#st)" stroke="#1d2629" stroke-width="2"/>
    <polygon points="32,10 49,15 54,32 49,49 32,54 15,49 10,32 15,15" fill="#1b2326"/>
    <g stroke="#5be3c8" stroke-width="2.4" fill="none" stroke-linecap="round" filter="url(#b1)" opacity=".9">
      <circle cx="32" cy="32" r="14"/><path d="M32 18v-8M20 39l-7 4M44 39l7 4"/></g>
    <g stroke="#c9fff3" stroke-width="1.1" fill="none" stroke-linecap="round">
      <circle cx="32" cy="32" r="14"/><path d="M32 18v-8M20 39l-7 4M44 39l7 4"/></g>`,
  `<linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6f7a7d"/><stop offset="1" stop-color="#363f42"/></linearGradient>`),

  scattergun: plinth(`
    <rect x="4" y="4" width="56" height="56" rx="9" fill="url(#st)" stroke="#1b1b1e" stroke-width="2"/>
    <rect x="9" y="9" width="46" height="46" rx="5" fill="#2c2e33"/>
    ${[[9, 9], [55, 9], [9, 55], [55, 55]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#b9bcc2"/><circle cx="${x - 0.6}" cy="${y - 0.6}" r="0.9" fill="#fff" opacity=".7"/>`).join('')}
    <path d="M9 32h46M32 9v46" stroke="#1a1b1e" stroke-width="1.2" opacity=".6"/>`,
  `<linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7b7f88"/><stop offset="1" stop-color="#40434a"/></linearGradient>`),

  mortar: plinth(`
    <circle cx="32" cy="32" r="27" fill="#6a4a2d" stroke="#2b1d10" stroke-width="2"/>
    ${[...Array(5)].map((_, i) => `<rect x="${12 + i * 8}" y="8" width="1.4" height="48" fill="#2b1d10" opacity=".55" transform="rotate(20 32 32)"/>`).join('')}
    ${[...Array(12)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return `<ellipse cx="${32 + 27 * Math.cos(a)}" cy="${32 + 27 * Math.sin(a)}" rx="5.5" ry="3.6" transform="rotate(${(a * 180) / Math.PI + 90} ${32 + 27 * Math.cos(a)} ${32 + 27 * Math.sin(a)})" fill="#a98f62" stroke="#5b4a2e" stroke-width="1"/>`; }).join('')}`),

  beam: plinth(`
    <polygon points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5" fill="url(#st)" stroke="#0c1116" stroke-width="2"/>
    <polygon points="32,11 50,21.5 50,42.5 32,53 14,42.5 14,21.5" fill="#0b1015"/>
    <g stroke="#8ff3ff" stroke-width="2" fill="none" filter="url(#b1)"><path d="M32 11v10M50 21.5l-9 5.2M50 42.5l-9-5.2M32 53V43M14 42.5l9-5.2M14 21.5l9 5.2"/></g>
    <g stroke="#e8ffff" stroke-width=".9" fill="none"><path d="M32 11v10M50 21.5l-9 5.2M50 42.5l-9-5.2M32 53V43M14 42.5l9-5.2M14 21.5l9 5.2"/></g>`,
  `<linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#46525e"/><stop offset="1" stop-color="#1c232b"/></linearGradient>`),

  fire: plinth(`
    <circle cx="32" cy="32" r="26" fill="#1d1612"/>
    <circle cx="32" cy="32" r="21" fill="#2a2018"/>
    ${[...Array(11)].map((_, i) => { const a = (i / 11) * Math.PI * 2 + 0.2; const r = 3.8 + (i % 3) * 1.2; return `<circle cx="${32 + 25 * Math.cos(a)}" cy="${32 + 25 * Math.sin(a)}" r="${r}" fill="${['#7c776d', '#8d8678', '#645f56'][i % 3]}" stroke="#2c2924" stroke-width="1"/>`; }).join('')}
    ${[...Array(9)].map((_, i) => `<circle cx="${32 + 12 * Math.cos(i * 2.1)}" cy="${32 + 12 * Math.sin(i * 1.7)}" r="1" fill="#ff7a2c" opacity=".7"/>`).join('')}`),

  orb: plinth(`
    <circle cx="32" cy="32" r="26" fill="#241a2d" stroke="#0e0912" stroke-width="2"/>
    ${[0, 120, 240].map(a => `<g transform="rotate(${a} 32 32)"><path d="M32 6 C 46 10 50 22 44 28 C 40 22 36 20 32 20 C 28 20 24 22 20 28 C 14 22 18 10 32 6 Z" fill="url(#st)" stroke="#0e0912" stroke-width="1.5"/></g>`).join('')}
    <circle cx="32" cy="32" r="10" fill="#120b18"/>`,
  `<linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c6a8f"/><stop offset="1" stop-color="#3b2e48"/></linearGradient>`),

  glass: plinth(`
    <circle cx="32" cy="32" r="28" fill="#0b0912" stroke="#c9a24a" stroke-width="2.4"/>
    <circle cx="32" cy="32" r="22" fill="none" stroke="#c9a24a" stroke-width=".8" opacity=".7"/>
    ${[...Array(12)].map((_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${32 + 22 * Math.cos(a)}" y1="${32 + 22 * Math.sin(a)}" x2="${32 + 26 * Math.cos(a)}" y2="${32 + 26 * Math.sin(a)}" stroke="#e8c874" stroke-width="${i % 3 === 0 ? 2.2 : 1}"/>`; }).join('')}
    <circle cx="32" cy="32" r="12" fill="#1a1426"/>`)
};

const POST_HEADS = {
  sixgun: wrap(64, 64, `
    ${shadow(30, 36, 16, 20, 0.4)}
    <ellipse cx="29" cy="32" rx="13" ry="19" fill="url(#coat)" stroke="#241608" stroke-width="1.4"/>
    <path d="M36 22 L56 21 M36 42 L56 43" stroke="#3a2815" stroke-width="5" stroke-linecap="round"/>
    <path d="M36 22 L56 21 M36 42 L56 43" stroke="#7a5a37" stroke-width="2.4" stroke-linecap="round"/>
    <g><rect x="48" y="18.6" width="12" height="4.2" rx="1.2" fill="#a4acb6" stroke="#2a2d33" stroke-width=".8"/><rect x="42" y="18" width="7" height="5.4" rx="1.6" fill="#8a5a3a" stroke="#2a1c10" stroke-width=".8"/>
    <rect x="48" y="41.2" width="12" height="4.2" rx="1.2" fill="#a4acb6" stroke="#2a2d33" stroke-width=".8"/><rect x="42" y="40.6" width="7" height="5.4" rx="1.6" fill="#8a5a3a" stroke="#2a1c10" stroke-width=".8"/></g>
    <circle cx="27" cy="32" r="12.5" fill="#2b1f15" stroke="#120c07" stroke-width="1.4"/>
    <circle cx="27" cy="32" r="9.5" fill="none" stroke="#4a3623" stroke-width="1"/>
    <circle cx="27" cy="32" r="6.2" fill="url(#hat)" stroke="#120c07" stroke-width="1"/>
    <path d="M21 32a6.2 6.2 0 0 1 12.4 0" fill="none" stroke="#d6b25e" stroke-width="1.2" opacity=".85"/>`,
  `<radialGradient id="coat" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#8a6a45"/><stop offset="1" stop-color="#4a3420"/></radialGradient>
   <radialGradient id="hat" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#5a4430"/><stop offset="1" stop-color="#241810"/></radialGradient>`),

  sigul: wrap(64, 64, `
    <g stroke="#5be3c8" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="url(#b2)" opacity=".95">
      <path d="M32 8 L50 20 L50 44 L32 56 L14 44 L14 20 Z"/><path d="M32 8 V56 M14 20 L50 44 M50 20 L14 44"/></g>
    <g stroke="#e9fffb" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 8 L50 20 L50 44 L32 56 L14 44 L14 20 Z"/><path d="M32 8 V56 M14 20 L50 44 M50 20 L14 44"/></g>
    <circle cx="32" cy="32" r="3.2" fill="#fff"/>`),

  scattergun: wrap(64, 64, `
    ${shadow(30, 36, 16, 20, 0.4)}
    <ellipse cx="28" cy="32" rx="13" ry="19" fill="url(#coat)" stroke="#1b1b1e" stroke-width="1.4"/>
    <path d="M34 28 L58 29.5 M34 36 L58 34.5" stroke="#1d1d21" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M36 28.4 L62 29.6 M36 35.6 L62 34.4" stroke="#8b9099" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="30" y="26" width="12" height="12" rx="3" fill="#6a4a2d" stroke="#2b1d10" stroke-width="1"/>
    <circle cx="25" cy="32" r="12" fill="#2b2f33" stroke="#0c0d0f" stroke-width="1.4"/>
    <circle cx="25" cy="32" r="8" fill="none" stroke="#454b52" stroke-width="1"/>
    <circle cx="25" cy="32" r="5.4" fill="url(#hat)" stroke="#0c0d0f" stroke-width="1"/>`,
  `<radialGradient id="coat" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#7a7a82"/><stop offset="1" stop-color="#3a3a42"/></radialGradient>
   <radialGradient id="hat" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#4c5560"/><stop offset="1" stop-color="#1b1f24"/></radialGradient>`),

  mortar: wrap(64, 64, `
    ${shadow(34, 36, 22, 12, 0.45)}
    <rect x="12" y="23" width="38" height="18" rx="4" fill="url(#brass)" stroke="#3a2a0e" stroke-width="1.6"/>
    <rect x="22" y="22" width="3.4" height="20" fill="#6e5518"/><rect x="36" y="22" width="3.4" height="20" fill="#6e5518"/>
    <rect x="47" y="20" width="8" height="24" rx="3" fill="#5c4614" stroke="#2f2209" stroke-width="1.4"/>
    <ellipse cx="53.5" cy="32" rx="2.6" ry="8" fill="#0a0806"/>
    <circle cx="14" cy="32" r="7" fill="#4d3d17" stroke="#2b2008" stroke-width="1.2"/><circle cx="14" cy="32" r="2.2" fill="#d9bd6a"/>
    <path d="M10 16 q3 -5 6 0" stroke="#ffb347" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="16" cy="16" r="1.8" fill="#ffdc7a" filter="url(#b1)"/>`,
  `<linearGradient id="brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3c46a"/><stop offset=".5" stop-color="#b08a2c"/><stop offset="1" stop-color="#6f5416"/></linearGradient>`),

  beam: wrap(64, 64, `
    <circle cx="32" cy="32" r="16" fill="#8ff3ff" opacity=".35" filter="url(#b4)"/>
    <polygon points="32,12 49,22 49,42 32,52 15,42 15,22" fill="url(#cr)" stroke="#d9ffff" stroke-width="1.2"/>
    <polygon points="32,20 43,26.5 43,37.5 32,44 21,37.5 21,26.5" fill="#e6ffff" opacity=".8"/>
    <path d="M32 12 L32 52 M15 22 L49 42 M49 22 L15 42" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/>
    <path d="M44 28 L60 31 L60 33 L44 36 Z" fill="#fff" stroke="#8ff3ff" stroke-width="1.2"/>
    <circle cx="60" cy="32" r="3" fill="#fff" filter="url(#b1)"/>`,
  `<linearGradient id="cr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9fbff"/><stop offset=".5" stop-color="#4fc8e0"/><stop offset="1" stop-color="#1b7690"/></linearGradient>`),

  fire: wrap(64, 64, `
    <g stroke="#2a1608" stroke-width="1.6"><rect x="14" y="26" width="36" height="7" rx="3.4" fill="#5a3517" transform="rotate(-24 32 32)"/>
    <rect x="14" y="30" width="36" height="7" rx="3.4" fill="#6b4220" transform="rotate(30 32 32)"/>
    <rect x="14" y="28" width="36" height="7" rx="3.4" fill="#4a2c12" transform="rotate(88 32 32)"/></g>
    <circle cx="32" cy="32" r="14" fill="#ff7a1a" opacity=".5" filter="url(#b4)"/>
    <path d="M32 12 C 42 22 44 28 40 36 C 38 42 34 44 32 46 C 30 44 26 42 24 36 C 20 28 22 22 32 12 Z" fill="url(#fl)"/>
    <path d="M32 24 C 37 30 38 34 35 39 C 34 41 33 42 32 43 C 31 42 30 41 29 39 C 26 34 27 30 32 24 Z" fill="#fff3b0"/>`,
  `<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd24a"/><stop offset=".5" stop-color="#ff8a1c"/><stop offset="1" stop-color="#c9300a"/></linearGradient>`),

  orb: wrap(64, 64, `
    <circle cx="32" cy="32" r="22" fill="#ff6fd8" opacity=".35" filter="url(#b4)"/>
    <circle cx="32" cy="32" r="15" fill="url(#pk)" stroke="#fff0fb" stroke-width="1" stroke-opacity=".6"/>
    <path d="M22 30 q6 -8 14 -2 q6 6 -2 12 q-8 4 -12 -4 q-2 -3 0 -6" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"/>
    <ellipse cx="26.5" cy="25" rx="5" ry="3" fill="#fff" opacity=".8" transform="rotate(-30 26.5 25)"/>`,
  `<radialGradient id="pk" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#ffd6f6"/><stop offset=".45" stop-color="#ff62d0"/><stop offset="1" stop-color="#7a1c6e"/></radialGradient>`),

  glass: wrap(64, 64, `
    <circle cx="32" cy="32" r="20" fill="#7a5cff" opacity=".25" filter="url(#b4)"/>
    <circle cx="32" cy="32" r="15" fill="url(#gl)" stroke="#e8c874" stroke-width="1.6"/>
    <path d="M22 36 q4 -12 16 -6" stroke="#9f8bff" stroke-width="1.2" fill="none" opacity=".8"/>
    <path d="M26 41 q10 4 14 -6" stroke="#6f5cd6" stroke-width="1" fill="none" opacity=".8"/>
    <ellipse cx="26.5" cy="25" rx="6" ry="3.2" fill="#fff" opacity=".7" transform="rotate(-32 26.5 25)"/>
    <circle cx="36" cy="36" r="1.2" fill="#fff" opacity=".8"/>`,
  `<radialGradient id="gl" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#3a2e66"/><stop offset=".6" stop-color="#120c26"/><stop offset="1" stop-color="#05030c"/></radialGradient>`)
};

// --------------------------------------------------------------------------------------- enemies
const ENEMY_SVG = {
  cantoi: wrap(32, 32, `
    ${shadow(15, 17, 11, 9, 0.5)}
    <path d="M8 22 q-3 -6 0 -12 q6 -3 12 0 q4 6 0 12 q-6 3 -12 0z" fill="url(#co)" stroke="#1d0f0a" stroke-width="1.2"/>
    <path d="M18 11 L27 9 M18 21 L27 23" stroke="#5a3a28" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M26 8 l4 -1 M26 24 l4 1" stroke="#cfcfd6" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="20" cy="16" r="5.4" fill="#d9c7a8" stroke="#3a2a1c" stroke-width="1.1"/>
    <circle cx="22.4" cy="14.2" r="1.1" fill="#d6203a"/><circle cx="22.4" cy="17.8" r="1.1" fill="#d6203a"/>
    <path d="M7 12 l-4 4 l4 4" fill="none" stroke="#2a1812" stroke-width="1.6" stroke-linecap="round"/>`,
  `<radialGradient id="co" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#8a4a3a"/><stop offset="1" stop-color="#43211a"/></radialGradient>`),

  hound: wrap(40, 28, `
    ${shadow(20, 15, 15, 7, 0.5)}
    <path d="M4 14 C 6 8 14 7 22 9 L 30 11 L 37 14 L 30 17 L 22 19 C 14 21 6 20 4 14 Z" fill="url(#hd)" stroke="#12161a" stroke-width="1.2"/>
    <path d="M30 11 L 38 14 L 30 17 L 27 14 Z" fill="#2a3138"/>
    <path d="M24 8 L 28 3 L 28 9 M24 20 L 28 25 L 28 19" fill="#3b444c" stroke="#12161a" stroke-width="1"/>
    <path d="M9 9 l-3 -3 M9 19 l-3 3 M15 8 l-2 -4 M15 20 l-2 4" stroke="#1a2026" stroke-width="2" stroke-linecap="round"/>
    <path d="M5 14 q-4 -2 -3 -7" stroke="#3b444c" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="32" cy="12.2" r="1.3" fill="#7dfbe0"/><circle cx="32" cy="15.8" r="1.3" fill="#7dfbe0"/>
    <path d="M8 14h20" stroke="#7dfbe0" stroke-opacity=".25" stroke-width="1"/>`,
  `<linearGradient id="hd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a7680"/><stop offset="1" stop-color="#2d353c"/></linearGradient>`),

  lowman: wrap(40, 40, `
    ${shadow(20, 22, 15, 15, 0.5)}
    <ellipse cx="20" cy="20" rx="12" ry="16" fill="url(#cy)" stroke="#5a4510" stroke-width="1.4"/>
    <path d="M20 6 V34" stroke="#8a6c14" stroke-width="1" opacity=".7"/>
    <path d="M27 12 L36 14 M27 28 L36 26" stroke="#c9a52a" stroke-width="5" stroke-linecap="round"/>
    <path d="M27 12 L36 14 M27 28 L36 26" stroke="#e7cf72" stroke-width="2" stroke-linecap="round"/>
    <circle cx="36.4" cy="14" r="2" fill="#e8d7b8"/><circle cx="36.4" cy="26" r="2" fill="#e8d7b8"/>
    <circle cx="19" cy="20" r="9.6" fill="#161214" stroke="#050304" stroke-width="1.2"/>
    <circle cx="19" cy="20" r="6.4" fill="#231d20"/><circle cx="19" cy="20" r="4.4" fill="none" stroke="#6a1a22" stroke-width="1.3"/>`,
  `<radialGradient id="cy" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#f1d460"/><stop offset="1" stop-color="#a47f12"/></radialGradient>`),

  swarm: wrap(22, 14, `
    ${shadow(11, 8, 8, 4, 0.5)}
    <path d="M3 7 q-3 -3 -2 -6" stroke="#3a2a22" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="9" cy="7" rx="6.5" ry="4" fill="#5a4535" stroke="#1d130d" stroke-width=".9"/>
    <path d="M13 7 L19 7 L15 5.2 Z" fill="#6a5242" stroke="#1d130d" stroke-width=".8"/>
    <circle cx="14.6" cy="5" r="1.3" fill="#6a5242"/><circle cx="14.6" cy="9" r="1.3" fill="#6a5242"/>
    <circle cx="16.8" cy="6.2" r=".7" fill="#ff4466"/><circle cx="16.8" cy="7.8" r=".7" fill="#ff4466"/>`),

  crow: wrap(48, 44, `
    <path d="M18 22 C 8 12 4 6 2 2 C 12 3 18 8 24 16 Z" fill="url(#cw)" stroke="#0a0a10" stroke-width="1"/>
    <path d="M18 22 C 8 32 4 38 2 42 C 12 41 18 36 24 28 Z" fill="url(#cw)" stroke="#0a0a10" stroke-width="1"/>
    <path d="M24 16 C 20 8 16 4 14 0 M24 28 C 20 36 16 40 14 44" stroke="#242636" stroke-width="1.6" fill="none"/>
    <ellipse cx="26" cy="22" rx="10" ry="6" fill="url(#cw)" stroke="#0a0a10" stroke-width="1"/>
    <path d="M32 22 L 44 22 L 34 19 Z" fill="#b8b4a8" stroke="#2a2823" stroke-width=".8"/>
    <path d="M32 22 L 44 22 L 34 25 Z" fill="#8f8b80" stroke="#2a2823" stroke-width=".8"/>
    <circle cx="33.4" cy="19.4" r="1.4" fill="#ff3a4a"/><circle cx="33.4" cy="24.6" r="1.4" fill="#ff3a4a"/>`,
  `<linearGradient id="cw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b3f58"/><stop offset="1" stop-color="#0e0f18"/></linearGradient>`),

  breaker: wrap(40, 40, `
    ${shadow(20, 22, 14, 14, 0.5)}
    <circle cx="20" cy="20" r="14" fill="#8ec5ff" opacity=".15" filter="url(#b4)"/>
    <ellipse cx="19" cy="20" rx="11" ry="15" fill="url(#rb)" stroke="#161a2a" stroke-width="1.3"/>
    <path d="M27 11 q6 -2 9 3 M27 29 q6 2 9 -3" stroke="#6a78a8" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    <path d="M34 8 q4 6 0 10 M34 32 q4 -6 0 -10" stroke="#a9d8ff" stroke-width="1.2" fill="none" opacity=".8"/>
    <circle cx="21" cy="20" r="8" fill="#242a45" stroke="#10131f" stroke-width="1.2"/>
    <circle cx="25.6" cy="20" r="2.6" fill="#b6e6ff" filter="url(#b1)"/><circle cx="25.6" cy="20" r="1.3" fill="#fff"/>`,
  `<radialGradient id="rb" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#5a6a98"/><stop offset="1" stop-color="#232a48"/></radialGradient>`),

  brute: wrap(60, 52, `
    ${shadow(26, 29, 21, 21, 0.55)}
    <ellipse cx="25" cy="26" rx="16" ry="22" fill="url(#bb)" stroke="#161a14" stroke-width="1.6"/>
    <path d="M14 14 q-4 12 0 24 M26 8 q4 18 0 36" stroke="#2f3a2c" stroke-width="1.2" fill="none" opacity=".6"/>
    <path d="M32 12 q10 -3 16 4 M32 40 q10 3 16 -4" stroke="#5f7258" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="48" cy="17" r="5.4" fill="#6f8566" stroke="#161a14" stroke-width="1.2"/><circle cx="48" cy="35" r="5.4" fill="#6f8566" stroke="#161a14" stroke-width="1.2"/>
    <circle cx="30" cy="26" r="8" fill="#7d9374" stroke="#161a14" stroke-width="1.4"/>
    <circle cx="33" cy="23.4" r="1.4" fill="#ffcf4a"/><circle cx="33" cy="28.6" r="1.4" fill="#ffcf4a"/>
    <path d="M22 18 a9 9 0 0 0 0 16" stroke="#8a8f96" stroke-width="2.4" fill="none"/>
    ${[[16, 14], [14, 26], [16, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#bfc3c8"/>`).join('')}`,
  `<radialGradient id="bb" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#7d9374"/><stop offset="1" stop-color="#3c4a38"/></radialGradient>`),

  bear: wrap(96, 96, `
    ${shadow(48, 54, 40, 38, 0.6)}
    <ellipse cx="44" cy="48" rx="34" ry="36" fill="url(#ib)" stroke="#14110e" stroke-width="2.4"/>
    <circle cx="14" cy="26" r="9" fill="#5c564d" stroke="#14110e" stroke-width="2"/><circle cx="14" cy="70" r="9" fill="#5c564d" stroke="#14110e" stroke-width="2"/>
    <path d="M52 18 q22 -4 36 8 M52 78 q22 4 36 -8" stroke="#6b645a" stroke-width="15" fill="none" stroke-linecap="round"/>
    <path d="M52 18 q22 -4 36 8 M52 78 q22 4 36 -8" stroke="#14110e" stroke-width="1.6" fill="none"/>
    <path d="M80 22 l10 3 M80 74 l10 -3" stroke="#e8e0cc" stroke-width="3.4" stroke-linecap="round"/>
    <ellipse cx="68" cy="48" rx="15" ry="12.5" fill="#6d665c" stroke="#14110e" stroke-width="2"/>
    <circle cx="56" cy="38" r="4" fill="#6d665c" stroke="#14110e" stroke-width="1.6"/><circle cx="56" cy="58" r="4" fill="#6d665c" stroke="#14110e" stroke-width="1.6"/>
    <circle cx="74" cy="43" r="2.6" fill="#ff3340" filter="url(#b1)"/><circle cx="74" cy="53" r="2.6" fill="#ff3340" filter="url(#b1)"/>
    <path d="M78 48 h8" stroke="#14110e" stroke-width="4" stroke-linecap="round"/>
    <circle cx="36" cy="48" r="10" fill="#ff5d3a" opacity=".6" filter="url(#b4)"/>
    <circle cx="36" cy="48" r="7.4" fill="#120a08" stroke="#2c1a12" stroke-width="2"/><circle cx="36" cy="48" r="3.6" fill="#ff8a4c"/>
    ${[[24, 28], [20, 48], [24, 68], [38, 20], [38, 76], [48, 32], [48, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#8d867a" stroke="#14110e" stroke-width=".8"/>`).join('')}
    <path d="M26 30 q-8 18 0 36 M46 16 q18 32 0 64" stroke="#2a251f" stroke-width="1.6" fill="none"/>`,
  `<radialGradient id="ib" cx=".4" cy=".3" r=".95"><stop offset="0" stop-color="#8b8478"/><stop offset=".6" stop-color="#58524a"/><stop offset="1" stop-color="#2e2a25"/></radialGradient>`),

  ashe: wrap(56, 56, `
    ${shadow(27, 31, 20, 20, 0.5)}
    <circle cx="26" cy="28" r="20" fill="#9a9aa4" opacity=".12" filter="url(#b4)"/>
    <ellipse cx="25" cy="28" rx="14" ry="21" fill="url(#ac)" stroke="#16161c" stroke-width="1.6"/>
    <path d="M12 16 q-6 8 -4 16 M12 40 q-6 -8 -4 -16" stroke="#3a3a44" stroke-width="2.4" fill="none"/>
    <path d="M33 20 L50 19 M33 36 L50 37" stroke="#2b2b34" stroke-width="5.4" stroke-linecap="round"/>
    <path d="M33 20 L50 19 M33 36 L50 37" stroke="#6a6a76" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="46" y="16.6" width="9" height="4" rx="1.2" fill="#c7ccd4" stroke="#1a1b20" stroke-width=".8"/>
    <rect x="46" y="35" width="9" height="4" rx="1.2" fill="#c7ccd4" stroke="#1a1b20" stroke-width=".8"/>
    <circle cx="24" cy="28" r="12" fill="#26262e" stroke="#0a0a0e" stroke-width="1.5"/>
    <circle cx="24" cy="28" r="9" fill="none" stroke="#44444f" stroke-width="1"/>
    <circle cx="24" cy="28" r="6" fill="#16161c" stroke="#7a1a24" stroke-width="1.2"/>
    <circle cx="31" cy="25" r="1.8" fill="#ff2a3a" filter="url(#b1)"/><circle cx="31" cy="31" r="1.8" fill="#ff2a3a" filter="url(#b1)"/>
    ${[[6, 10], [4, 30], [8, 48], [12, 4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#8a8a92" opacity=".7"/>`).join('')}`,
  `<radialGradient id="ac" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#8a8a96"/><stop offset="1" stop-color="#3a3a44"/></radialGradient>`)
};

// ----------------------------------------------------------------------------------- misc sprites
const MISC = {
  shard: wrap(28, 28, `
    <circle cx="14" cy="14" r="12" fill="#8ff3ff" opacity=".5" filter="url(#b4)"/>
    <polygon points="14,1.5 23.5,8 23.5,20 14,26.5 4.5,20 4.5,8" fill="url(#sh)" stroke="#e8ffff" stroke-width="1"/>
    <polygon points="14,1.5 23.5,8 14,14 4.5,8" fill="#fff" opacity=".55"/>
    <polygon points="14,14 23.5,8 23.5,20 14,26.5" fill="#1b7690" opacity=".45"/>
    <path d="M14 1.5 V14 M4.5 8 L14 14 L23.5 8" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>`,
  `<linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dffcff"/><stop offset=".55" stop-color="#58d2ea"/><stop offset="1" stop-color="#ffe9a0"/></linearGradient>`),

  rock1: wrap(64, 64, `
    ${shadow(34, 40, 26, 22, 0.55)}
    <path d="M10 38 L14 18 L30 8 L50 14 L58 32 L50 52 L28 58 L12 52 Z" fill="url(#rk)" stroke="#1c1612" stroke-width="2"/>
    <path d="M14 18 L30 8 L34 26 L22 34 Z" fill="#a89476" opacity=".7"/>
    <path d="M30 8 L50 14 L44 28 L34 26 Z" fill="#c4ad88" opacity=".6"/>
    <path d="M22 34 L34 26 L44 28 L58 32 L50 52 L36 44 Z" fill="#4a3c2e" opacity=".7"/>
    <path d="M12 52 L28 58 L36 44 L22 34 L10 38 Z" fill="#3a2e22" opacity=".75"/>`,
  `<linearGradient id="rk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a8466"/><stop offset="1" stop-color="#4a3b2c"/></linearGradient>`),

  rock2: wrap(64, 64, `
    ${shadow(34, 38, 25, 22, 0.55)}
    <path d="M8 30 L20 10 L44 6 L58 22 L54 46 L36 58 L14 50 Z" fill="url(#rk)" stroke="#1c1612" stroke-width="2"/>
    <path d="M20 10 L44 6 L40 24 L26 26 Z" fill="#b8a27c" opacity=".7"/>
    <path d="M44 6 L58 22 L40 24 Z" fill="#d1ba92" opacity=".55"/>
    <path d="M8 30 L26 26 L40 24 L54 46 L36 58 L24 42 Z" fill="#3c3024" opacity=".65"/>`,
  `<linearGradient id="rk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8f7a5d"/><stop offset="1" stop-color="#43362a"/></linearGradient>`),

  ruin: wrap(64, 64, `
    ${shadow(34, 38, 27, 24, 0.55)}
    <rect x="6" y="8" width="52" height="46" rx="3" fill="#6a5e50" stroke="#1d1813" stroke-width="2"/>
    <path d="M6 22 H58 M6 36 H58 M22 8 V22 M42 22 V36 M18 36 V54 M38 36 V54" stroke="#1d1813" stroke-width="1.6" opacity=".7"/>
    <path d="M6 8 H58 V12 H6 Z" fill="#9a8c78" opacity=".7"/>
    <path d="M30 54 L34 40 L44 36 L48 54 Z" fill="#241d17" opacity=".8"/>
    <rect x="12" y="14" width="6" height="5" fill="#241d17" opacity=".7"/><rect x="46" y="26" width="7" height="6" fill="#241d17" opacity=".7"/>`),

  dust: wrap(16, 16, `<circle cx="8" cy="8" r="7" fill="#fff" opacity=".9"/>`),
  casing: wrap(6, 3, `<rect x="0" y="0" width="6" height="3" rx="1" fill="#e0b84a" stroke="#7a5a12" stroke-width=".6"/>`),
  tracer: wrap(24, 6, `<defs></defs><path d="M0 3 L24 3" stroke="#ffe39a" stroke-width="2.4" stroke-linecap="round" opacity=".9"/><path d="M4 3 L24 3" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>`),
  shell: wrap(14, 14, `<circle cx="7" cy="7" r="5" fill="#2b2418" stroke="#8a6a2a" stroke-width="1.4"/><circle cx="7" cy="7" r="2" fill="#ff9a2c"/><path d="M7 2 q2 -2 4 0" stroke="#ffd36a" stroke-width="1.2" fill="none"/>`),
  ring: wrap(128, 128, `<circle cx="64" cy="64" r="60" fill="none" stroke="#fff" stroke-width="4" opacity=".9"/><circle cx="64" cy="64" r="60" fill="none" stroke="#fff" stroke-width="10" opacity=".25" filter="url(#b4)"/>`),
  vignetteHole: wrap(8, 8, `<rect width="8" height="8" fill="#fff"/>`)
};

export function buildSvgs() {
  const out = [];
  for (const [k, s] of Object.entries(POST_BASES)) out.push({ key: `post_${k}_base`, w: 64, h: 64, svg: s });
  for (const [k, s] of Object.entries(POST_HEADS)) out.push({ key: `post_${k}_head`, w: 64, h: 64, svg: s });
  const sizes = { cantoi: [32, 32], hound: [40, 28], lowman: [40, 40], swarm: [22, 14], crow: [48, 44], breaker: [40, 40], brute: [60, 52], bear: [96, 96], ashe: [56, 56] };
  for (const [k, s] of Object.entries(ENEMY_SVG)) out.push({ key: `enemy_${k}`, w: sizes[k][0], h: sizes[k][1], svg: s });
  const msizes = { shard: [28, 28], rock1: [64, 64], rock2: [64, 64], ruin: [64, 64], dust: [16, 16], casing: [6, 3], tracer: [24, 6], shell: [14, 14], ring: [128, 128] };
  for (const [k, s] of Object.entries(MISC)) {
    if (k === 'vignetteHole') continue;
    out.push({ key: k, w: msizes[k][0], h: msizes[k][1], svg: s });
  }
  return out;
}
