// Thin line icons for the dossier UI. All use currentColor so plates can tint them.
const svg = (body, vb = '0 0 24 24') => `<svg class="ico" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const IC = {
  base: svg('<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 3v17"/><path d="M9 20l3-6 3 6"/>'),
  shop: svg('<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.4"/><circle cx="9" cy="18.5" r="1.4"/><circle cx="17" cy="18.5" r="1.4"/><path d="M9 10.5h9"/>'),
  goals: svg('<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4.5"/><circle cx="11" cy="13" r="1.2"/><path d="m11 13 9-9"/><path d="M17 4h3v3"/>'),
  trials: svg('<path d="M4 4l11 11"/><path d="M15 15l2.5 2.5"/><path d="M18.5 15.5l-3 3"/><path d="M20 4 9 15"/><path d="M9 15l-2.5 2.5"/><path d="M5.5 15.5l3 3"/><path d="M4 4h3M4 4v3M20 4h-3M20 4v3"/>'),
  boxes: svg('<path d="M3.5 8 12 4l8.5 4v8.5L12 20.5 3.5 16.5V8Z"/><path d="M3.5 8 12 12l8.5-4"/><path d="M12 12v8.5"/><path d="m7.8 6 8.5 4"/>'),
  gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/><circle cx="12" cy="12" r="6.6"/>'),
  trophy: svg('<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11"/><path d="M12 14v4M8.5 20.5h7M9.5 18h5"/>'),
  back: svg('<path d="M15 4 7 12l8 8"/>'),
  sole: svg('<path d="M9 3c2.5 0 3.5 2.6 3.2 6.2-.3 3.4-.2 5.6.6 8.3.8 2.6-.9 3.9-2.7 3.9-2 0-3.2-1.4-3.4-4.2C6.4 13.6 5.5 10.6 6 7.5 6.4 4.8 7.3 3 9 3Z"/><path d="M15.5 6.5c1.6 0 2.3 1.6 2.1 4-.2 2.1-.1 3.4.4 5 .5 1.7-.6 2.5-1.7 2.5"/>'),
  flint: svg('<path d="M4 17 8 6l6-2 6 7-3 8-9 1-4-3Z"/><path d="M8 6l3 6 9-1M11 12l-3 8"/>'),
  bone: svg('<path d="M7.5 16.5 16.5 7.5"/><path d="M6 14.5a2 2 0 1 0-2.6 2.9 2 2 0 1 0 3.2 2.9 2 2 0 1 0 2.9-2.6"/><path d="M18 9.5a2 2 0 1 0 2.6-2.9 2 2 0 1 0-3.2-2.9 2 2 0 1 0-2.9 2.6"/>'),
};

// Small laurel wreath for the era banner.
export const WREATH = `<svg class="wreath" viewBox="0 0 64 64" aria-hidden="true">${
  [-1, 1].map((d) => `<g transform="translate(32 0) scale(${d} 1) translate(-32 0)"><path d="M30 56C16 50 9 38 11 22" fill="none" stroke="currentColor" stroke-width="1.6"/>${
    [[11, 26, -60], [12, 34, -40], [15, 42, -25], [20, 49, -10], [26, 54, 10]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.2" transform="rotate(${r} ${x} ${y})" fill="currentColor"/>`).join('')
  }</g>`).join('')
}<circle cx="32" cy="12" r="2.4" fill="currentColor"/></svg>`;

// Radar dish silhouette for the observation feed thumbnail.
export const DISH = `<svg viewBox="0 0 80 56" aria-hidden="true"><path d="M0 56 L14 44 L26 48 L40 40 L58 46 L80 38 V56Z" fill="#2a2522"/><path d="M28 8 C40 10 50 22 50 34 L28 8Z" fill="#8b8580"/><path d="M28 8 C26 20 34 32 50 34" fill="none" stroke="#c9c2b8" stroke-width="1.5"/><path d="M39 21 L46 12" stroke="#c9c2b8" stroke-width="1.2"/><path d="M37 30 L36 46 M33 46 h8 M36 38 l-6 8 M36 38 l6 8" stroke="#8b8580" stroke-width="1.5"/></svg>`;
