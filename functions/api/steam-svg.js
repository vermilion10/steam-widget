/**
 * Steam SVG Widget — Cloudflare Pages Function
 * 
 * Generates an SVG image for embedding via <img> tag.
 * 
 * Query params:
 *   id              — Steam ID or vanity URL (required)
 *   games           — Number of games (0-10, default 3)
 *   sort            — "recent" | "playtime" (default: recent)
 *   theme           — "dark" | "light" | "transparent" (default: dark)
 *   bg_color        — Custom bg hex (without #)
 *   text_color      — Custom text hex (without #)
 *   accent_color    — Custom accent hex (without #)
 *   border_radius   — Card corner radius (default: 16)
 *   hide_status     — Hide status dot (default: false)
 *   show_id         — Show Steam ID (default: true)
 *   playtime_display — "both" | "total" | "recent" | "none" (default: both)
 *   font            — "inter" | "roboto" | "poppins" | "outfit" | "mono" | "system" (default: inter)
 *   lang            — "en" | "id" (default: en)
 *   width           — Card width 300-600 (default: 400)
 */

const STEAM_API = 'https://api.steampowered.com';

const STATUS_MAP = {
  0: 'offline', 1: 'online', 2: 'busy', 3: 'away',
  4: 'snooze', 5: 'looking-to-trade', 6: 'looking-to-play',
};

const LABELS = {
  en: {
    online: 'Online', offline: 'Offline', busy: 'Busy', away: 'Away',
    snooze: 'Snooze', 'looking-to-trade': 'Looking to Trade',
    'looking-to-play': 'Looking to Play', 'in-game': 'In-Game',
    'recently-played': 'Recently Played', total: 'total',
    'past-2-weeks': 'past 2 weeks',
  },
  id: {
    online: 'Online', offline: 'Offline', busy: 'Sibuk', away: 'Tidak Aktif',
    snooze: 'Tidur', 'looking-to-trade': 'Mencari Trade',
    'looking-to-play': 'Mencari Game', 'in-game': 'Sedang Bermain',
    'recently-played': 'Terakhir Dimainkan', total: 'total',
    'past-2-weeks': '2 minggu terakhir',
  },
};

const STATUS_COLORS = {
  online: '#57cbde', 'in-game': '#90ba3c', offline: '#898989',
  busy: '#57cbde', away: '#57cbde', snooze: '#57cbde',
  'looking-to-trade': '#57cbde', 'looking-to-play': '#57cbde',
};

const THEMES = {
  dark: { bg: '#1b2838', bgRow: '#1e3a50', text: '#c7d5e0', textMuted: '#8f98a0', textBright: '#fff', border: '#2a475e' },
  light: { bg: '#e5e5e5', bgRow: '#d8d8d8', text: '#3a3a3a', textMuted: '#6b6b6b', textBright: '#1b2838', border: '#c5c5c5' },
  transparent: { bg: 'none', bgRow: 'rgba(30,58,80,0.3)', text: '#c7d5e0', textMuted: '#8f98a0', textBright: '#fff', border: 'rgba(42,71,94,0.5)' },
};

const FONTS = {
  inter: "'Inter', sans-serif",
  roboto: "'Roboto', sans-serif",
  poppins: "'Poppins', sans-serif",
  outfit: "'Outfit', sans-serif",
  mono: "'Fira Code', 'Cascadia Code', monospace",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function trunc(s, n) { return !s ? '' : s.length <= n ? s : s.substring(0, n - 1) + '…'; }
function fmtTime(m) { if (!m) return '0m'; if (m < 60) return `${m}m`; return `${(m/60).toFixed(1)} hrs`; }
function isSteamId64(s) { return /^\d{17}$/.test(s); }

async function resolveVanity(key, name) {
  const r = await fetch(`${STEAM_API}/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(name)}`);
  if (!r.ok) return null;
  const j = await r.json();
  return j.response?.success === 1 ? j.response.steamid : null;
}

async function toBase64(url) {
  try {
    console.log("toBase64 starting fetch for:", url);
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log("toBase64 response status:", r.status, r.statusText, "for URL:", url);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    console.log("toBase64 encode success (length:", b64.length, ") for URL:", url);
    return `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${b64}`;
  } catch (err) {
    console.error("toBase64 error for URL " + url + ":", err.message || err);
    return null;
  }
}

function buildSvg(profile, games, opts) {
  const { theme, bgColor, textColor, accentColor, borderRadius, hideStatus, showId, playtimeDisplay, font, lang, width } = opts;
  const t = { ...(THEMES[theme] || THEMES.dark) };
  if (bgColor) t.bg = `#${bgColor}`;
  if (textColor) { t.text = `#${textColor}`; t.textBright = `#${textColor}`; }
  const accent = accentColor ? `#${accentColor}` : '#66c0f4';
  const l = LABELS[lang] || LABELS.en;
  const ff = FONTS[font] || FONTS.inter;

  const isInGame = !!profile.currentGame;
  const statusColor = isInGame ? STATUS_COLORS['in-game'] : (STATUS_COLORS[profile.status] || STATUS_COLORS.offline);
  const statusLabel = isInGame
    ? `${l['in-game']}: ${trunc(profile.currentGame, 28)}`
    : l[profile.status] || l.offline;

  const pad = 24, avatarSize = 64;
  const headerH = avatarSize + 16;
  const inGameH = isInGame ? 44 : 0;
  const gamesHeaderH = games.length > 0 ? 28 : 0;
  const gameRowH = 44, gameGap = 6;
  const gamesH = games.length > 0 ? gamesHeaderH + games.length * (gameRowH + gameGap) + 4 : 0;
  const totalH = pad + headerH + 8 + inGameH + gamesH + pad;

  const onlineAnim = ['online','busy','away','snooze','looking-to-trade','looking-to-play'].includes(profile.status) || isInGame;
  const dotAnim = onlineAnim ? `<animate attributeName="opacity" values="1;0.5;1" dur="2.5s" repeatCount="indefinite"/>` : '';

  // Build game rows
  let gamesSvg = '';
  if (games.length > 0) {
    const gStartY = pad + headerH + 8 + inGameH;
    gamesSvg += `<text x="${pad}" y="${gStartY + 16}" font-size="11" font-weight="700" fill="${t.textMuted}" letter-spacing="1" font-family="${ff}">${esc(l['recently-played'].toUpperCase())}</text>`;

    games.forEach((g, i) => {
      const y = gStartY + gamesHeaderH + i * (gameRowH + gameGap);
      gamesSvg += `<rect x="${pad}" y="${y}" width="${width - pad*2}" height="${gameRowH}" rx="8" fill="${t.bgRow}"/>`;
      if (g.iconB64) {
        gamesSvg += `<clipPath id="gi${i}"><rect x="${pad+8}" y="${y+6}" width="32" height="32" rx="4"/></clipPath>`;
        gamesSvg += `<image href="${g.iconB64}" x="${pad+8}" y="${y+6}" width="32" height="32" clip-path="url(#gi${i})"/>`;
      } else {
        gamesSvg += `<rect x="${pad+8}" y="${y+6}" width="32" height="32" rx="4" fill="${t.border}"/>`;
      }
      gamesSvg += `<text x="${pad+48}" y="${y+19}" font-size="12" font-weight="600" fill="${t.textBright}" font-family="${ff}">${esc(trunc(g.name, 24))}</text>`;

      // Playtime line
      let ptLine = '';
      if (playtimeDisplay === 'both') {
        ptLine = `${esc(g.pt2wFmt)} ${esc(l['past-2-weeks'])} · ${esc(g.ptFmt)} ${esc(l.total)}`;
      } else if (playtimeDisplay === 'total') {
        ptLine = `${esc(g.ptFmt)} ${esc(l.total)}`;
      } else if (playtimeDisplay === 'recent') {
        ptLine = `${esc(g.pt2wFmt)} ${esc(l['past-2-weeks'])}`;
      }
      if (ptLine) {
        gamesSvg += `<text x="${pad+48}" y="${y+34}" font-size="10" font-weight="400" fill="${t.textMuted}" font-family="${ff}">${ptLine}</text>`;
      }
    });
  }

  // In-game banner
  let inGameSvg = '';
  if (isInGame) {
    const cy = pad + headerH + 8;
    inGameSvg = `
      <rect x="${pad}" y="${cy}" width="${width-pad*2}" height="36" rx="8" fill="${STATUS_COLORS['in-game']}22" stroke="${STATUS_COLORS['in-game']}55" stroke-width="1"/>
      <circle cx="${pad+16}" cy="${cy+18}" r="4" fill="${STATUS_COLORS['in-game']}"><animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite"/></circle>
      <text x="${pad+28}" y="${cy+22}" font-size="12" font-weight="600" fill="${STATUS_COLORS['in-game']}" font-family="${ff}">${esc(l['in-game'])}: ${esc(trunc(profile.currentGame, 32))}</text>`;
  }

  // ID line
  const idLine = showId
    ? `<text x="${pad+avatarSize+14}" y="${pad+56}" font-size="10" font-weight="400" fill="${t.textMuted}" font-family="${ff}" opacity="0.7">ID: ${esc(profile.steamid)}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalH}" viewBox="0 0 ${width} ${totalH}" fill="none">
  <defs>
    <clipPath id="ac"><circle cx="${pad+avatarSize/2}" cy="${pad+avatarSize/2}" r="${avatarSize/2-2}"/></clipPath>
    <filter id="sh" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-opacity="0.3" flood-color="#000"/></filter>
  </defs>
  <rect x="0.5" y="0.5" width="${width-1}" height="${totalH-1}" rx="${borderRadius}" fill="${t.bg}" stroke="${t.border}" stroke-width="1" filter="url(#sh)"/>
  <g>
    ${profile.avatarB64
      ? `<circle cx="${pad+avatarSize/2}" cy="${pad+avatarSize/2}" r="${avatarSize/2}" fill="${t.border}" stroke="${statusColor}" stroke-width="2.5"/>
         <image href="${profile.avatarB64}" x="${pad+2}" y="${pad+2}" width="${avatarSize-4}" height="${avatarSize-4}" clip-path="url(#ac)"/>`
      : `<circle cx="${pad+avatarSize/2}" cy="${pad+avatarSize/2}" r="${avatarSize/2}" fill="${t.border}" stroke="${statusColor}" stroke-width="2.5"/>`}
    ${!hideStatus ? `<circle cx="${pad+avatarSize-6}" cy="${pad+avatarSize-6}" r="7" fill="${t.bg === 'none' ? '#1b2838' : t.bg}"/><circle cx="${pad+avatarSize-6}" cy="${pad+avatarSize-6}" r="5" fill="${statusColor}">${dotAnim}</circle>` : ''}
    <text x="${pad+avatarSize+14}" y="${pad+22}" font-size="16" font-weight="800" fill="${t.textBright}" font-family="${ff}">${esc(trunc(profile.name, 20))}</text>
    <text x="${pad+avatarSize+14}" y="${pad+40}" font-size="11" font-weight="500" fill="${statusColor}" font-family="${ff}">${esc(statusLabel)}</text>
    ${idLine}
  </g>
  <line x1="${pad}" y1="${pad+headerH+2}" x2="${width-pad}" y2="${pad+headerH+2}" stroke="${t.border}" stroke-width="0.5"/>
  ${inGameSvg}
  ${gamesSvg}
  <text x="${width-pad}" y="${totalH-10}" font-size="9" font-weight="400" fill="${t.textMuted}" text-anchor="end" font-family="${ff}" opacity="0.5">steamcard-vm10</text>
</svg>`;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  let cache = null, cacheKey = null;
  try { cache = caches.default; cacheKey = new Request(request.url, { method: 'GET' }); const c = await cache.match(cacheKey); if (c) return c; } catch { cache = null; }

  const apiKey = env.STEAM_API_KEY;
  if (!apiKey) return new Response('<!-- STEAM_API_KEY not set -->', { status: 500, headers: { 'Content-Type': 'image/svg+xml' } });

  const u = new URL(request.url);
  const rawId = u.searchParams.get('id');
  if (!rawId) return new Response('<!-- Missing id -->', { status: 400, headers: { 'Content-Type': 'image/svg+xml' } });

  const gamesCount = Math.min(10, Math.max(0, parseInt(u.searchParams.get('games') ?? '3', 10)));
  const sortMode = u.searchParams.get('sort') === 'playtime' ? 'playtime' : 'recent';
  const theme = ['dark','light','transparent'].includes(u.searchParams.get('theme')) ? u.searchParams.get('theme') : 'dark';
  const bgColor = u.searchParams.get('bg_color') || '';
  const textColor = u.searchParams.get('text_color') || '';
  const accentColor = u.searchParams.get('accent_color') || '';
  const borderRadius = Math.min(40, Math.max(0, parseInt(u.searchParams.get('border_radius') ?? '16', 10)));
  const hideStatus = u.searchParams.get('hide_status') === 'true';
  const showId = u.searchParams.get('show_id') !== 'false';
  const playtimeDisplay = ['both','total','recent','none'].includes(u.searchParams.get('playtime_display')) ? u.searchParams.get('playtime_display') : 'both';
  const font = Object.keys(FONTS).includes(u.searchParams.get('font')) ? u.searchParams.get('font') : 'inter';
  const lang = ['en','id'].includes(u.searchParams.get('lang')) ? u.searchParams.get('lang') : 'en';
  const cardWidth = Math.min(600, Math.max(300, parseInt(u.searchParams.get('width') ?? '400', 10)));

  let steamId = rawId.trim();
  if (!isSteamId64(steamId)) {
    const resolved = await resolveVanity(apiKey, steamId);
    if (!resolved) return new Response('<!-- Could not resolve vanity URL -->', { status: 404, headers: { 'Content-Type': 'image/svg+xml' } });
    steamId = resolved;
  }

  try {
    const fetchCount = sortMode === 'playtime' ? 10 : gamesCount;
    const [sRes, gRes] = await Promise.all([
      fetch(`${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`),
      fetchCount > 0 ? fetch(`${STEAM_API}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=${fetchCount}`) : null,
    ]);

    if (!sRes.ok) return new Response('<!-- Steam API error -->', { status: 502, headers: { 'Content-Type': 'image/svg+xml' } });
    const sJson = await sRes.json();
    const player = sJson.response?.players?.[0];
    if (!player) return new Response('<!-- Player not found -->', { status: 404, headers: { 'Content-Type': 'image/svg+xml' } });

    const avatarB64 = await toBase64(player.avatarfull);

    let gamesList = [];
    if (gRes?.ok) {
      const gJson = await gRes.json();
      let raw = gJson.response?.games || [];
      if (sortMode === 'playtime') raw.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
      raw = raw.slice(0, gamesCount);

      const iconPromises = raw.map(async g => {
        const iconB64 = await toBase64(`https://shared.fastly.steamstatic.com/community_assets/images/apps/${g.appid}/${g.img_icon_url}.jpg`);
        return { appid: g.appid, name: g.name, iconB64, pt2w: g.playtime_2weeks || 0, pt2wFmt: fmtTime(g.playtime_2weeks || 0), ptForever: g.playtime_forever || 0, ptFmt: fmtTime(g.playtime_forever || 0) };
      });
      gamesList = await Promise.all(iconPromises);
    }

    const profile = {
      steamid: player.steamid,
      name: player.personaname,
      avatarB64,
      status: STATUS_MAP[player.personastate] || 'offline',
      currentGame: player.gameextrainfo || null,
    };

    const svg = buildSvg(profile, gamesList, { theme, bgColor, textColor, accentColor, borderRadius, hideStatus, showId, playtimeDisplay, font, lang, width: cardWidth });

    const response = new Response(svg, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' },
    });
    if (cache && cacheKey) { try { context.waitUntil(cache.put(cacheKey, response.clone())); } catch {} }
    return response;

  } catch (err) {
    console.error('SVG error:', err.message);
    return new Response(`<!-- Error: ${err.message} -->`, { status: 500, headers: { 'Content-Type': 'image/svg+xml' } });
  }
}
