<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Object, required: true },
  showId: { type: Boolean, default: true },
  hideStatus: { type: Boolean, default: false },
  bgColor: { type: String, default: '' },
  textColor: { type: String, default: '' },
  accentColor: { type: String, default: '' },
  borderRadius: { type: Number, default: 20 },
  playtimeDisplay: { type: String, default: 'both' }, // both | total | recent | none
})

const profile = computed(() => props.data?.profile || {})
const games = computed(() => props.data?.recentGames || [])
const isInGame = computed(() => !!profile.value.currentGame)

const statusClass = computed(() => {
  if (isInGame.value) return 'status-dot--in-game'
  const s = profile.value.status
  if (['online', 'busy', 'looking-to-trade', 'looking-to-play'].includes(s)) return 'status-dot--online'
  if (['away', 'snooze'].includes(s)) return 'status-dot--away'
  return 'status-dot--offline'
})

const statusColor = computed(() => {
  if (isInGame.value) return 'var(--status-in-game)'
  const s = profile.value.status
  if (['online', 'busy', 'looking-to-trade', 'looking-to-play'].includes(s)) return 'var(--status-online)'
  if (['away', 'snooze'].includes(s)) return 'var(--status-online)'
  return 'var(--status-offline)'
})

const statusLabel = computed(() => {
  if (isInGame.value) return `In-Game: ${profile.value.currentGame}`
  const map = {
    online: 'Online', offline: 'Offline', busy: 'Busy', away: 'Away',
    snooze: 'Snooze', 'looking-to-trade': 'Looking to Trade', 'looking-to-play': 'Looking to Play',
  }
  return map[profile.value.status] || 'Offline'
})

const cardStyle = computed(() => {
  const s = {}
  if (props.bgColor) s.background = `#${props.bgColor}`
  if (props.borderRadius !== 20) s.borderRadius = `${props.borderRadius}px`
  return s
})

const textStyle = computed(() => props.textColor ? { color: `#${props.textColor}` } : {})
const nameStyle = computed(() => props.textColor ? { color: `#${props.textColor}` } : {})

function fmtTime(m) {
  if (!m || m === 0) return '0m'
  if (m < 60) return `${m}m`
  return `${(m / 60).toFixed(1)} hrs`
}

function playtimeText(game) {
  const d = props.playtimeDisplay
  if (d === 'none') return ''
  if (d === 'total') return `${fmtTime(game.playtimeForever)} total`
  if (d === 'recent') return `${fmtTime(game.playtime2Weeks)} past 2 weeks`
  return `${fmtTime(game.playtime2Weeks)} past 2 weeks · ${fmtTime(game.playtimeForever)} total`
}
</script>

<template>
  <a
    :href="profile.profileUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="steam-card glass-card"
    :style="cardStyle"
  >
    <svg class="steam-card__link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>

    <!-- Profile Header -->
    <div class="steam-card__header">
      <div class="steam-card__avatar-wrapper">
        <img
          :src="profile.avatar"
          :alt="profile.name"
          class="steam-card__avatar"
          :style="{ borderColor: statusColor }"
          loading="lazy"
        />
        <span
          v-if="!hideStatus"
          class="status-dot steam-card__status-dot"
          :class="statusClass"
        ></span>
      </div>
      <div class="steam-card__info">
        <h2 class="steam-card__name" :style="nameStyle">{{ profile.name }}</h2>
        <p class="steam-card__status" :style="{ color: statusColor }">{{ statusLabel }}</p>
        <p v-if="showId" class="steam-card__id" :style="textStyle">ID: {{ profile.steamid }}</p>
      </div>
    </div>

    <!-- Currently Playing -->
    <div v-if="isInGame" class="steam-card__now-playing">
      <span class="status-dot status-dot--in-game steam-card__np-dot"></span>
      <span class="steam-card__np-text">Playing <strong>{{ profile.currentGame }}</strong></span>
    </div>

    <!-- Recently Played Games -->
    <div v-if="games.length > 0" class="steam-card__games">
      <h3 class="steam-card__games-title" :style="textStyle">RECENTLY PLAYED</h3>
      <div v-for="game in games" :key="game.appid" class="steam-card__game-row">
        <img
          :src="game.iconUrl"
          :alt="game.name"
          class="steam-card__game-icon"
          loading="lazy"
          @error="$event.target.style.display = 'none'"
        />
        <div class="steam-card__game-info">
          <span class="steam-card__game-name" :style="nameStyle">{{ game.name }}</span>
          <span v-if="playtimeDisplay !== 'none'" class="steam-card__game-time" :style="textStyle">
            {{ playtimeText(game) }}
          </span>
        </div>
      </div>
    </div>

    <div class="steam-card__footer"><span>steamcard-vm10</span></div>
  </a>
</template>

<style scoped>
.steam-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  padding: 24px;
  position: relative;
  cursor: pointer;
  color: var(--steam-text);
}

.steam-card__link-icon {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 14px;
  height: 14px;
  color: var(--steam-text-muted);
  opacity: 0.5;
  transition: var(--transition-normal);
}
.steam-card:hover .steam-card__link-icon {
  color: var(--steam-blue);
  opacity: 1;
  transform: translate(2px, -2px);
}

.steam-card__header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.steam-card__avatar-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
}

.steam-card__avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2.5px solid var(--status-offline);
  transition: var(--transition-normal);
}
.steam-card:hover .steam-card__avatar {
  transform: scale(1.05);
}

.steam-card__status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 14px;
  height: 14px;
  border: 2.5px solid var(--steam-dark-bg);
}

.steam-card__info { min-width: 0; flex: 1; }

.steam-card__name {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--steam-text-bright);
  letter-spacing: 0.02em;
  margin: 0;
  line-height: 1.3;
  transition: var(--transition-normal);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.steam-card:hover .steam-card__name { color: var(--steam-blue); }

.steam-card__status {
  font-size: 0.8rem;
  font-weight: 600;
  margin: 2px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.steam-card__id {
  font-size: 0.7rem;
  color: var(--steam-text-muted);
  margin: 2px 0 0;
  opacity: 0.7;
}

.steam-card__now-playing {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 14px;
  background: rgba(144, 186, 60, 0.08);
  border: 1px solid rgba(144, 186, 60, 0.2);
  border-radius: var(--radius-md);
  animation: fade-in 0.4s ease;
}

.steam-card__np-dot { width: 8px; height: 8px; flex-shrink: 0; }
.steam-card__np-text {
  font-size: 0.78rem;
  color: var(--status-in-game);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.steam-card__np-text strong { font-weight: 700; }

.steam-card__games { margin-top: 4px; }
.steam-card__games-title {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--steam-text-muted);
  letter-spacing: 1.2px;
  margin-bottom: 8px;
}

.steam-card__game-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(30, 58, 80, 0.35);
  border-radius: var(--radius-sm);
  margin-bottom: 5px;
  transition: var(--transition-fast);
}
.steam-card__game-row:hover { background: rgba(30, 58, 80, 0.55); }

.steam-card__game-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--steam-medium-bg);
}

.steam-card__game-info { display: flex; flex-direction: column; min-width: 0; gap: 1px; }
.steam-card__game-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--steam-text-bright);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.steam-card__game-time {
  font-size: 0.68rem;
  color: var(--steam-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.steam-card__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  font-size: 0.6rem;
  color: var(--steam-text-muted);
  opacity: 0.4;
}
</style>
