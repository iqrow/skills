// Cover art for the six genre items, plus fore-edge and audiobook player screens.
import { SANS, SERIF, svg, T, rng, r4 } from './lib.mjs'

const stars = (seed, n, x0, x1, y0, y1) => {
  const r = rng(seed)
  let s = ''
  for (let i = 0; i < n; i++) s += `<circle cx="${r4(x0 + r() * (x1 - x0))}" cy="${r4(y0 + r() * (y1 - y0))}" r="${r4(0.7 + r() * 1.2)}" fill="#ffffff" opacity="${r4(0.45 + r() * 0.5)}"/>`
  return s
}
const grad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`

export const COVER = { W: 400, H: 612 }

export const thriller = svg(400, 612, `<defs>${grad('g', [[0, '#090c14'], [0.6, '#1b2538'], [1, '#3d1015']])}</defs>
<rect width="400" height="612" fill="url(#g)"/>
<circle cx="250" cy="300" r="112" fill="#b3261e"/>
<path d="M0 612V450H28V414H52V466H70V380H100V440H120V396H148V470H170V356H200V448H222V392H248V458H272V420H302V468H328V388H356V430H380V400H400V612Z" fill="#05070b"/>
${[[76, 392], [88, 392], [76, 406], [176, 368], [188, 368], [176, 384], [188, 400], [334, 400], [344, 414], [228, 404], [280, 436], [126, 410]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="7" fill="#f2c14e" opacity="0.85"/>`).join('')}
<circle cx="250" cy="262" r="15" fill="#06070b"/>
<path d="M233 280 Q250 272 267 280 L281 392 L219 392 Z M229 390h13v70h-13z M258 390h13v70h-13z" fill="#06070b"/>
${T(200, 44, 'ONE NIGHT. ONE LIST. NO WAY OUT.', { size: 13, fill: '#cfc8bd', anchor: 'middle', ls: 2.5 })}
${T(200, 108, 'THE LAST', { size: 58, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 2 })}
${T(200, 180, 'HOUR', { size: 80, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 4 })}
${T(200, 588, 'J. R. HALE', { size: 26, weight: 700, fill: '#e8e1d5', anchor: 'middle', ls: 8 })}`)

export const romance = svg(400, 612, `<defs>${grad('g', [[0, '#ffe5c9'], [0.55, '#f9b9bb'], [1, '#e79fb6']])}</defs>
<rect width="400" height="612" fill="url(#g)"/>
<circle cx="250" cy="330" r="92" fill="#fff2d8" opacity="0.85"/>
<path d="M0 474 Q100 462 200 474 T400 474 V612 H0 Z" fill="#86bccc"/>
<path d="M30 500 q15 -6 30 0 M120 522 q15 -6 30 0 M260 506 q15 -6 30 0 M330 532 q15 -6 30 0 M60 552 q15 -6 30 0" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7"/>
<path d="M170 476 Q290 418 400 440 V478 H170 Z" fill="#9cc08f"/>
<rect x="262" y="424" width="26" height="22" fill="#fff8ee"/><path d="M258 426 L275 408 L292 426 Z" fill="#c8505a"/>
<rect x="300" y="416" width="30" height="26" fill="#fff8ee"/><path d="M296 418 L315 398 L334 418 Z" fill="#d26a5a"/>
<rect x="344" y="424" width="24" height="20" fill="#fff8ee"/><path d="M340 426 L356 410 L372 426 Z" fill="#c8505a"/>
<rect x="270" y="430" width="6" height="6" fill="#f2c14e"/><rect x="310" y="424" width="6" height="7" fill="#f2c14e"/><rect x="352" y="430" width="6" height="6" fill="#f2c14e"/>
<path d="M251 226 c-8 -10 -22 -2 -14 10 l14 14 l14 -14 c8 -12 -6 -20 -14 -10 Z" fill="#e2456c"/>
<circle cx="236" cy="268" r="13" fill="#7a2d4d"/>
<path d="M223 268 Q224 250 238 252 Q252 254 249 270 Q246 264 236 264 Q228 264 223 276 Z" fill="#5a2238"/>
<path d="M226 282 Q236 276 246 282 L264 400 L206 400 Z" fill="#7a2d4d"/>
<circle cx="266" cy="260" r="14" fill="#6a2442"/>
<path d="M251 276 Q266 270 281 276 L286 400 L250 400 Z" fill="#6a2442"/>
${T(200, 44, 'She came back for the house. She stayed for him.', { size: 14, font: SERIF, style: 'italic', fill: '#8a2f50', anchor: 'middle' })}
${T(200, 112, 'Summer at', { size: 44, font: SERIF, style: 'italic', fill: '#8c1f4a', anchor: 'middle' })}
${T(200, 180, 'Larkspur', { size: 68, font: SERIF, style: 'italic', weight: 700, fill: '#8c1f4a', anchor: 'middle' })}
${T(200, 588, 'ELLIE MARSH', { size: 22, weight: 700, fill: '#ffffff', anchor: 'middle', ls: 6 })}`)

export const fantasy = svg(400, 612, `<defs>${grad('g', [[0, '#0f1330'], [0.55, '#23375e'], [1, '#2f5866']])}</defs>
<rect width="400" height="612" fill="url(#g)"/>
${stars(7, 34, 0, 400, 196, 430)}
<circle cx="322" cy="226" r="30" fill="#f3e8c6"/><circle cx="358" cy="266" r="11" fill="#c9b8ea"/>
<path d="M0 612V474L56 424L104 456L168 386L226 462L292 404L334 436L372 382L400 410V612Z" fill="#0b0f22"/>
<path d="M152 392V352H164V392Z M176 392V344H188V392Z M150 392V374H190V392Z M150 352 L158 334 L166 352Z M174 344 L182 324 L190 344Z" fill="#0b0f22"/>
<rect x="180" y="356" width="4" height="7" fill="#ffb347"/>
<path d="M250 254 Q268 258 271 282 L292 456 L208 456 L229 282 Q232 258 250 254 Z" fill="#070914"/>
<ellipse cx="250" cy="278" rx="9" ry="11" fill="#000000"/>
<line x1="292" y1="246" x2="302" y2="458" stroke="#070914" stroke-width="5" stroke-linecap="round"/>
<circle cx="291" cy="242" r="20" fill="#ff8c3a" opacity="0.35"/><circle cx="291" cy="242" r="7" fill="#ffc56b"/>
${T(200, 44, 'The throne remembers every lie.', { size: 15, font: SERIF, style: 'italic', fill: '#e7d6a8', anchor: 'middle' })}
${T(200, 108, 'THE EMBER', { size: 42, font: SERIF, fill: '#e9c46a', anchor: 'middle', ls: 6 })}
${T(200, 180, 'CROWN', { size: 74, font: SERIF, weight: 700, fill: '#f2d27e', anchor: 'middle', ls: 10 })}
${T(200, 588, 'A. L. VARN', { size: 24, font: SERIF, fill: '#e9c46a', anchor: 'middle', ls: 8 })}`)

export const mystery = svg(400, 612, `<defs>${grad('g', [[0, '#172420'], [0.6, '#2f4238'], [1, '#0f1613']])}</defs>
<rect width="400" height="612" fill="url(#g)"/>
<circle cx="322" cy="214" r="30" fill="#efe3b0"/><circle cx="334" cy="206" r="27" fill="#243530"/>
<path d="M70 474 L80 300" stroke="#070b09" stroke-width="9" stroke-linecap="round"/>
<path d="M80 372 L40 330 M80 340 L120 296 M80 306 L58 262 M80 306 L100 256 M120 296 L140 288 M40 330 L28 312" stroke="#070b09" stroke-width="5" stroke-linecap="round" fill="none"/>
<rect x="0" y="470" width="400" height="142" fill="#0b100e"/>
<path d="M214 474 V412 L252 372 L290 412 H300 L345 364 L390 412 V474 Z M240 382 V356 H250 V372 Z M356 380 V350 H366 V376 Z" fill="#070b09"/>
<rect x="334" y="424" width="12" height="16" fill="#f4c95d"/><rect x="250" y="430" width="10" height="14" fill="#f4c95d" opacity="0.55"/>
<circle cx="236" cy="300" r="13" fill="#050807"/>
<path d="M223 314 Q236 308 249 314 L260 456 L212 456 Z" fill="#050807"/>
<line x1="248" y1="330" x2="266" y2="380" stroke="#050807" stroke-width="6" stroke-linecap="round"/>
<circle cx="270" cy="394" r="22" fill="#f4c95d" opacity="0.3"/><rect x="264" y="386" width="12" height="16" rx="3" fill="#f4c95d"/>
${T(200, 44, 'Seven guests. One locked room.', { size: 15, font: SERIF, style: 'italic', fill: '#e8dcb5', anchor: 'middle' })}
${T(200, 106, 'Death at', { size: 42, font: SERIF, style: 'italic', fill: '#efe3c2', anchor: 'middle' })}
${T(200, 164, 'HOLLOW MANOR', { size: 40, font: SERIF, weight: 700, fill: '#f4d77a', anchor: 'middle', ls: 3 })}
${T(200, 588, 'MARGARET QUILL', { size: 22, font: SERIF, fill: '#efe3c2', anchor: 'middle', ls: 5 })}`)

export const literary = svg(400, 612, `<rect width="400" height="612" fill="#eee7d6"/>
<circle cx="250" cy="340" r="86" fill="#d57a50" opacity="0.92"/>
<rect x="0" y="436" width="400" height="176" fill="#7f9ba6"/>
<line x1="0" y1="436" x2="400" y2="436" stroke="#6c8893" stroke-width="2"/>
<path d="M222 450 H278 M230 462 H270 M236 474 H264 M242 486 H258" stroke="#e9a27c" stroke-width="3" opacity="0.8"/>
<circle cx="250" cy="372" r="8" fill="#2b2723"/>
<path d="M243 382 Q250 378 257 382 L260 420 L240 420 Z M243 418 h5 v18 h-5z M252 418 h5 v18 h-5z" fill="#2b2723"/>
<path d="M108 236 q8 -8 16 0 q8 -8 16 0" stroke="#2b2723" stroke-width="2" fill="none"/>
<path d="M150 214 q6 -6 12 0 q6 -6 12 0" stroke="#2b2723" stroke-width="1.6" fill="none"/>
${T(200, 44, '“Luminous and devastating.” — The Review', { size: 14, font: SERIF, style: 'italic', fill: '#5e544a', anchor: 'middle' })}
${T(200, 110, 'The Salt', { size: 52, font: SERIF, fill: '#2b2723', anchor: 'middle' })}
${T(200, 172, 'Orchard', { size: 60, font: SERIF, style: 'italic', fill: '#2b2723', anchor: 'middle' })}
${T(200, 204, 'A NOVEL', { size: 11, fill: '#6b6157', anchor: 'middle', ls: 5 })}
${T(200, 588, 'Nora Ellery', { size: 26, font: SERIF, fill: '#f7f2e7', anchor: 'middle' })}`)

export const scifi = svg(400, 612, `<defs>${grad('g', [[0, '#02030a'], [0.6, '#0a1035'], [1, '#1b0f30']])}<radialGradient id="p" cx="0.35" cy="0.35" r="0.75"><stop offset="0" stop-color="#f0a060"/><stop offset="1" stop-color="#7a3d24"/></radialGradient></defs>
<rect width="400" height="612" fill="url(#g)"/>
${stars(11, 60, 0, 400, 0, 480)}
<circle cx="318" cy="240" r="56" fill="url(#p)"/>
<ellipse cx="318" cy="240" rx="90" ry="18" fill="none" stroke="#f0c88a" stroke-width="4" opacity="0.9" transform="rotate(-18 318 240)"/>
<path d="M0 612V482Q200 436 400 482V612Z" fill="#20263d"/>
<path d="M268 472a24 24 0 0 1 48 0z M322 470a14 14 0 0 1 28 0z" fill="#3b4466"/>
<circle cx="292" cy="462" r="2.5" fill="#7fe3f0"/><circle cx="336" cy="464" r="2" fill="#7fe3f0"/>
<rect x="230" y="300" width="40" height="56" rx="6" fill="#aab2c0"/>
<path d="M228 306 Q250 298 272 306 L278 396 L222 396 Z" fill="#d8dde6"/>
<rect x="226" y="394" width="20" height="58" rx="4" fill="#c9ced8"/><rect x="254" y="394" width="20" height="58" rx="4" fill="#c9ced8"/>
<circle cx="250" cy="282" r="23" fill="#e6e9f0"/>
<ellipse cx="252" cy="284" rx="15" ry="11" fill="#1aa5b8"/><ellipse cx="246" cy="279" rx="5" ry="3" fill="#bff4fb" opacity="0.8"/>
${T(200, 44, 'Eighty years from Earth. One message back.', { size: 13, fill: '#9fe6f0', anchor: 'middle', ls: 1.5 })}
${T(200, 112, 'DEEP', { size: 66, weight: 700, fill: '#e8f6ff', anchor: 'middle', ls: 20 })}
${T(200, 174, 'STATION', { size: 50, weight: 700, fill: '#7fe3f0', anchor: 'middle', ls: 10 })}
${T(200, 588, 'R. K. OKAFOR', { size: 22, weight: 700, fill: '#e8f6ff', anchor: 'middle', ls: 8 })}`)

// Cover position helper: a point on the cover art (vx, vy) to plane coordinates for a plane w wide
export const coverPt = (vx, vy, w) => [r4((vx / 400 - 0.5) * w), r4((0.5 - vy / 612) * (w * 612 / 400))]

// Page edges seen on the fore-edge or top of the block
export function pageEdge(w, h) {
  const W = 40, H = Math.max(40, Math.round((40 * h) / w))
  let lines = ''
  for (let x = 1.5; x < W; x += 2.4) lines += `M${r4(x)} 0V${H}`
  return svg(W, H, `<rect width="${W}" height="${H}" fill="#eee3cb"/><path d="${lines}" stroke="#d3c4a4" stroke-width="0.7"/>`)
}

// Audiobook player screen (370 x 780), cover art sits on top of it in its own plane
export const player = svg(370, 780, `<rect width="370" height="780" rx="34" fill="#0f1015"/>
${T(30, 36, '9:41', { size: 16, weight: 700, fill: '#ffffff' })}
<rect x="306" y="24" width="34" height="15" rx="4" fill="none" stroke="#ffffff" stroke-width="1.6"/><rect x="309" y="27" width="22" height="9" rx="2" fill="#ffffff"/>
${T(185, 482, 'Chapter 12', { size: 22, weight: 700, fill: '#ffffff', anchor: 'middle' })}
${T(185, 510, '2 h 41 min left', { size: 15, fill: '#9a9aa8', anchor: 'middle' })}
<line x1="40" y1="552" x2="330" y2="552" stroke="#3a3b45" stroke-width="6" stroke-linecap="round"/>
<line x1="40" y1="552" x2="172" y2="552" stroke="#f0b44c" stroke-width="6" stroke-linecap="round"/>
<circle cx="172" cy="552" r="10" fill="#ffffff"/>
${T(40, 580, '3:12:40', { size: 13, fill: '#9a9aa8' })}${T(330, 580, '-2:41:07', { size: 13, fill: '#9a9aa8', anchor: 'end' })}
<circle cx="185" cy="650" r="38" fill="#ffffff"/><rect x="171" y="632" width="9" height="36" rx="2" fill="#0f1015"/><rect x="190" y="632" width="9" height="36" rx="2" fill="#0f1015"/>
<path d="M98 632 a20 20 0 1 0 20 0" fill="none" stroke="#ffffff" stroke-width="3"/><path d="M118 624 l0 14 l-10 -6 z" fill="#ffffff"/>${T(103, 656, '30', { size: 12, weight: 700, fill: '#ffffff', anchor: 'middle' })}
<path d="M272 632 a20 20 0 1 1 -20 0" fill="none" stroke="#ffffff" stroke-width="3"/><path d="M252 624 l0 14 l10 -6 z" fill="#ffffff"/>${T(267, 656, '30', { size: 12, weight: 700, fill: '#ffffff', anchor: 'middle' })}
${T(80, 736, '1.2×', { size: 17, weight: 700, fill: '#ffffff', anchor: 'middle' })}
<path d="M185 722 a14 14 0 1 0 12 20 a11 11 0 1 1 -12 -20z" fill="#ffffff"/>
<path d="M276 724 h24 M276 732 h24 M276 740 h24" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`)

export const genres = { thriller, romance, fantasy, mystery, literary, scifi }
