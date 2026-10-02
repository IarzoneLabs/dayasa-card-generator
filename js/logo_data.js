// Ultra-Lightweight HD DayasaPaper Logo Config (Taint-Free Vector SVG Data URI)
(function() {
  const dayasaSvgStr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 52" width="240" height="52">
    <g transform="translate(2, 3)">
      <!-- Cyan Ribbon Leaf -->
      <path d="M 12 8 C 4 8 0 16 2 24 C 4 32 14 34 22 28 C 28 22 26 12 18 8 Z" fill="#00a3e0"/>
      <!-- Green Ribbon Leaf -->
      <path d="M 18 20 C 12 24 10 32 16 38 C 22 44 32 40 34 30 C 34 20 24 16 18 20 Z" fill="#00a651"/>
      <!-- Overlap Accent -->
      <path d="M 15 18 C 18 15 22 18 20 22 C 17 25 13 22 15 18 Z" fill="#ffffff" opacity="0.3"/>
    </g>
    <!-- Text DayasaPaper -->
    <text x="44" y="27" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="22" fill="#004b87" letter-spacing="-0.5">DayasaPaper</text>
    <!-- Subtext member of SCGP -->
    <text x="45" y="42" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="600" font-size="9.5" fill="#555555" letter-spacing="0.2">member of <tspan fill="#e11d48" font-weight="700">SCGP</tspan></text>
  </svg>`;

  window.DEFAULT_LOGO_IMAGE = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(dayasaSvgStr);
})();