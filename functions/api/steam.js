/**
 * Steam API Proxy — Cloudflare Pages Function
 * 
 * Fetches player summary + recently played games from Steam Web API.
 * Hides the API key server-side and caches responses at the edge.
 * 
 * Query params:
 *   id     — Steam ID 64-bit or vanity URL name (required)
 *   games  — Number of recently played games to return (0-10, default 3)
 *   sort   — Sort order: "recent" (default) or "playtime"
 */

const STATUS_MAP = {
  0: 'offline',
  1: 'online',
  2: 'busy',
  3: 'away',
  4: 'snooze',
  5: 'looking-to-trade',
  6: 'looking-to-play',
};

const STEAM_API = 'https://api.steampowered.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200, cacheSeconds = 180) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${cacheSeconds}`,
      'Vary': 'Accept-Encoding',
      ...CORS_HEADERS,
    },
  });
}

async function resolveVanityURL(apiKey, vanityName) {
  const res = await fetch(
    `${STEAM_API}/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(vanityName)}`
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.response?.success === 1 ? json.response.steamid : null;
}

function isSteamId64(str) {
  return /^\d{17}$/.test(str);
}

function formatPlaytime(minutes) {
  if (!minutes || minutes === 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = (minutes / 60).toFixed(1);
  return `${hours} hrs`;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Cache (may not be available locally)
  let cache = null, cacheKey = null;
  try {
    cache = caches.default;
    cacheKey = new Request(request.url, { method: 'GET' });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch { cache = null; }

  const apiKey = env.STEAM_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: 'STEAM_API_KEY not configured.' }, 500);
  }

  const url = new URL(request.url);
  const rawId = url.searchParams.get('id');
  const gamesCount = Math.min(10, Math.max(0, parseInt(url.searchParams.get('games') ?? '3', 10)));
  const sortMode = url.searchParams.get('sort') === 'playtime' ? 'playtime' : 'recent';

  if (!rawId) {
    return jsonResponse({ error: 'Missing required parameter: id' }, 400);
  }

  let steamId = rawId.trim();
  if (!isSteamId64(steamId)) {
    const resolved = await resolveVanityURL(apiKey, steamId);
    if (!resolved) {
      return jsonResponse({ error: `Could not resolve vanity URL: ${steamId}` }, 404);
    }
    steamId = resolved;
  }

  try {
    // Fetch both endpoints in parallel — request up to 10 for sorting flexibility
    const fetchCount = sortMode === 'playtime' ? 10 : gamesCount;
    const [summaryRes, gamesRes] = await Promise.all([
      fetch(`${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`),
      fetchCount > 0
        ? fetch(`${STEAM_API}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${apiKey}&steamid=${steamId}&count=${fetchCount}`)
        : Promise.resolve(null),
    ]);

    if (!summaryRes.ok) {
      const body = await summaryRes.text();
      return jsonResponse({ error: `Steam API ${summaryRes.status}`, detail: body.substring(0, 200) }, summaryRes.status);
    }

    const summaryJson = await summaryRes.json();
    const players = summaryJson.response?.players;
    if (!players?.length) {
      return jsonResponse({ error: 'Player not found or profile is private.' }, 404);
    }

    const player = players[0];

    let recentGames = [];
    if (gamesRes?.ok) {
      const gamesJson = await gamesRes.json();
      let games = gamesJson.response?.games || [];

      // Sort
      if (sortMode === 'playtime') {
        games.sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0));
      }
      // Trim to requested count
      games = games.slice(0, gamesCount);

      recentGames = games.map(g => ({
        appid: g.appid,
        name: g.name,
        iconUrl: `https://shared.fastly.steamstatic.com/community_assets/images/apps/${g.appid}/${g.img_icon_url}.jpg`,
        headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        playtime2Weeks: g.playtime_2weeks || 0,
        playtime2WeeksFormatted: formatPlaytime(g.playtime_2weeks || 0),
        playtimeForever: g.playtime_forever || 0,
        playtimeForeverFormatted: formatPlaytime(g.playtime_forever || 0),
      }));
    }

    const data = {
      profile: {
        steamid: player.steamid,
        name: player.personaname,
        avatar: player.avatarfull,
        profileUrl: player.profileurl,
        status: STATUS_MAP[player.personastate] || 'offline',
        statusCode: player.personastate,
        currentGame: player.gameextrainfo || null,
        currentGameId: player.gameid || null,
      },
      recentGames,
    };

    const finalResponse = jsonResponse(data, 200, 180);
    if (cache && cacheKey) {
      try { context.waitUntil(cache.put(cacheKey, finalResponse.clone())); } catch {}
    }
    return finalResponse;

  } catch (error) {
    console.error('Steam API error:', error.message);
    return jsonResponse({ error: 'Internal error', detail: error.message }, 500);
  }
}
