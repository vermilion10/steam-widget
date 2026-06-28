# steamcard-vm10

A free, customizable Steam profile widget showing realtime online status, active games, and recently played games.

## Features

- **Realtime Status** — Online, Offline, Away, In-Game with Steam-accurate colors.
- **Currently Playing** — Animated banner showing active games.
- **Recently Played** — Configurable games list (0-10) with custom sorting.
- **Dual Embed Modes** — `<iframe>` for personal sites, `<img>` (SVG) for GitHub READMEs.
- **Rich Customization** — Custom themes, manual hex colors, border-radius, font styles, show/hide ID, and playtime display formats.
- **Vanity URL Support** — Use a custom Steam URL or 64-bit Steam ID.
- **Cached** — High-performance edge caching on Cloudflare CDN.

##  Quick Start

Replace `YOUR_STEAM_ID` with your actual 64-bit Steam ID or vanity URL.

### iframe Embed (Websites)

```html
<iframe 
  src="https://steamcard-vm10.pages.dev/?id=YOUR_STEAM_ID&games=3&embed=true"
  width="420" height="380" frameborder="0"
  style="border-radius: 16px; overflow: hidden;">
</iframe>
```

### Image Embed (GitHub Profile README)

```markdown
[![Steam Profile](https://steamcard-vm10.pages.dev/api/steam-svg?id=YOUR_STEAM_ID&games=3)](https://steamcommunity.com)
```

## URL Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `id` | string | *required* | Steam ID 64-bit or vanity URL name |
| `games` | number | `3` | Number of recently played games (0-10) |
| `sort` | string | `recent` | Sort games: `recent` or `playtime` (by total playtime) |
| `theme` | string | `dark` | Widget theme: `dark` / `light` / `transparent` |
| `font` | string | `inter` | Font style: `inter`, `roboto`, `poppins`, `outfit`, `mono`, `system` |
| `playtime_display` | string | `both` | Playtime format: `both`, `total` (forever), `recent` (2 weeks), `none` |
| `show_id` | boolean | `true` | Show or hide Steam profile ID line |
| `hide_status` | boolean | `false` | Hide status ring & dot indicator |
| `lang` | string | `en` | Language: `en` (English) or `id` (Indonesian) |
| `bg_color` | string | — | Custom background color (hex code without `#`) |
| `text_color` | string | — | Custom text color (hex code without `#`) |
| `accent_color` | string | — | Custom accent color (hex code without `#`) |
| `border_radius` | number | `16` | Card corner radius in px |
| `width` | number | `400` | SVG image width in px (300 to 600) |

## License

MIT — Created by [vermilion10](https://github.com/vermilion10).
