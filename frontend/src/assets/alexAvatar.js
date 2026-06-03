// Alex interviewer avatar — inline SVG as a data URL
// Replace this with: import alexImg from './alex.png'; once you copy the photo
// Photo location: C:\Users\harsh\.gemini\antigravity-ide\brain\631065c5-f6ea-4e89-98a9-7ba346e291f9\alex_interviewer_1780507548519.png
// Copy it to: frontend\src\assets\alex.png

// For now using a professional SVG placeholder
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#0d1b2e"/>
    </radialGradient>
    <radialGradient id="skin" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#d4956a"/>
      <stop offset="100%" stop-color="#b5703e"/>
    </radialGradient>
    <radialGradient id="skin2" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#c8845a"/>
      <stop offset="100%" stop-color="#a06035"/>
    </radialGradient>
    <linearGradient id="blazer" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1a2744"/>
      <stop offset="100%" stop-color="#0f1a33"/>
    </linearGradient>
    <linearGradient id="shirt" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f8f8f8"/>
      <stop offset="100%" stop-color="#e8e8e8"/>
    </linearGradient>
    <filter id="blur-bg">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background: blurred office -->
  <rect width="400" height="500" fill="url(#bg)"/>
  <rect x="0" y="200" width="400" height="300" fill="#0f2035" opacity="0.6"/>
  <!-- Office blur shapes -->
  <rect x="40" y="180" width="60" height="100" rx="4" fill="#2a4a6e" opacity="0.4" filter="url(#blur-bg)"/>
  <rect x="280" y="160" width="80" height="120" rx="4" fill="#1e3a5a" opacity="0.5" filter="url(#blur-bg)"/>
  <circle cx="320" cy="280" r="25" fill="#2d5a3d" opacity="0.4" filter="url(#blur-bg)"/>
  <circle cx="60" cy="300" r="20" fill="#2d5a3d" opacity="0.3" filter="url(#blur-bg)"/>

  <!-- Shoulders / Blazer -->
  <ellipse cx="200" cy="520" rx="195" ry="100" fill="url(#blazer)"/>
  <path d="M 5 500 Q 60 420 110 400 L 200 440 L 290 400 Q 340 420 395 500 Z" fill="#1a2744"/>

  <!-- White shirt / collar -->
  <path d="M 155 395 L 200 440 L 245 395 L 240 420 L 200 460 L 160 420 Z" fill="url(#shirt)"/>

  <!-- Neck -->
  <rect x="172" y="340" width="56" height="70" rx="12" fill="url(#skin)"/>

  <!-- Head -->
  <ellipse cx="200" cy="230" rx="105" ry="125" fill="url(#skin)"/>

  <!-- Hair — dark, slightly wavy -->
  <path d="M 100 190 Q 110 100 200 95 Q 290 100 300 190 Q 295 145 280 130 Q 250 110 200 108 Q 150 110 120 130 Q 105 145 100 190 Z" fill="#2a1a0a"/>
  <path d="M 100 195 Q 98 170 105 155 Q 120 125 155 115 Q 200 108 200 108 Q 165 115 145 130 Q 118 150 110 175 Q 105 185 100 195 Z" fill="#1a0f05"/>
  <path d="M 300 195 Q 302 170 295 155 Q 280 125 245 115 Q 200 108 200 108 Q 235 115 255 130 Q 282 150 290 175 Q 295 185 300 195 Z" fill="#1a0f05"/>

  <!-- Ears -->
  <ellipse cx="97" cy="238" rx="15" ry="20" fill="url(#skin2)"/>
  <ellipse cx="303" cy="238" rx="15" ry="20" fill="url(#skin2)"/>
  <ellipse cx="98" cy="238" rx="10" ry="14" fill="#c07050"/>

  <!-- Eyebrows -->
  <path d="M 145 185 Q 162 178 180 182" stroke="#2a1a0a" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M 220 182 Q 238 178 255 185" stroke="#2a1a0a" stroke-width="4.5" fill="none" stroke-linecap="round"/>

  <!-- Eyes -->
  <!-- Left eye -->
  <ellipse cx="163" cy="207" rx="20" ry="14" fill="white"/>
  <ellipse cx="163" cy="209" rx="12" ry="12" fill="#3d2010"/>
  <ellipse cx="163" cy="209" rx="7" ry="7" fill="#1a0808"/>
  <circle cx="167" cy="205" r="2.5" fill="white"/>
  <path d="M 143 207 Q 163 196 183 207" stroke="#2a1a0a" stroke-width="2" fill="none"/>
  <path d="M 143 207 Q 163 218 183 207" stroke="#8a5535" stroke-width="1.5" fill="none"/>
  <!-- Right eye -->
  <ellipse cx="237" cy="207" rx="20" ry="14" fill="white"/>
  <ellipse cx="237" cy="209" rx="12" ry="12" fill="#3d2010"/>
  <ellipse cx="237" cy="209" rx="7" ry="7" fill="#1a0808"/>
  <circle cx="241" cy="205" r="2.5" fill="white"/>
  <path d="M 217 207 Q 237 196 257 207" stroke="#2a1a0a" stroke-width="2" fill="none"/>
  <path d="M 217 207 Q 237 218 257 207" stroke="#8a5535" stroke-width="1.5" fill="none"/>

  <!-- Nose -->
  <path d="M 200 210 L 193 250 Q 195 258 200 260 Q 205 258 207 250 Z" fill="#b07048" opacity="0.6"/>
  <ellipse cx="188" cy="256" rx="10" ry="7" fill="#a06040" opacity="0.5"/>
  <ellipse cx="212" cy="256" rx="10" ry="7" fill="#a06040" opacity="0.5"/>

  <!-- Beard / stubble -->
  <ellipse cx="200" cy="300" rx="72" ry="42" fill="#2a1a0a" opacity="0.35"/>
  <ellipse cx="200" cy="320" rx="65" ry="30" fill="#2a1a0a" opacity="0.25"/>

  <!-- Mouth / Smile -->
  <path d="M 168 288 Q 200 308 232 288" stroke="#7a3a20" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M 172 290 Q 200 305 228 290 Q 220 298 200 300 Q 180 298 172 290 Z" fill="#8a3a20" opacity="0.6"/>

  <!-- Subtle cheek warmth -->
  <ellipse cx="145" cy="258" rx="25" ry="16" fill="#c87050" opacity="0.12"/>
  <ellipse cx="255" cy="258" rx="25" ry="16" fill="#c87050" opacity="0.12"/>
</svg>`;

export const ALEX_B64 = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
export default ALEX_B64;
