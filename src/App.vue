<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import SteamCard from './components/SteamCard.vue'

const steamData = ref(null)
const loading = ref(false)
const errorMsg = ref(null)
const isEmbed = ref(false)

// Config states
const inputId = ref('')
const inputGames = ref(3)
const inputSort = ref('recent')
const inputTheme = ref('dark')
const inputBgColor = ref('')
const inputTextColor = ref('')
const inputAccentColor = ref('')
const inputBorderRadius = ref(16)
const inputHideStatus = ref(false)
const inputShowId = ref(true)
const inputPlaytimeDisplay = ref('both')
const inputFont = ref('inter')

// Active states used for iframe preview/render
const currentTheme = ref('dark')

const generatedUrl = ref('')
const copiedType = ref(null)

// Custom dropdown states
const activeDropdown = ref(null) // 'playtime' | 'font' | 'bgColorPicker' | 'textColorPicker' | 'accentColorPicker'

function toggleDropdown(name, event) {
  if (event) event.stopPropagation()
  if (activeDropdown.value === name) {
    activeDropdown.value = null
  } else {
    activeDropdown.value = name
  }
}

function closeDropdowns(event) {
  if (
    event.target.closest('.premium-color-picker-trigger') || 
    event.target.closest('.color-picker-popover') ||
    event.target.closest('.glass-select-trigger') ||
    event.target.closest('.glass-select-dropdown')
  ) {
    return
  }
  activeDropdown.value = null
}

onMounted(() => {
  window.addEventListener('mousedown', closeDropdowns)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', closeDropdowns)
})

// Playtime options
const playtimeOptions = [
  { value: 'both', label: 'Both (Recent & Total)' },
  { value: 'total', label: 'Total Playtime Only' },
  { value: 'recent', label: 'Recent Playtime Only' },
  { value: 'none', label: 'Hide Playtime' }
]

const selectedPlaytimeLabel = computed(() => {
  const opt = playtimeOptions.find(o => o.value === inputPlaytimeDisplay.value)
  return opt ? opt.label : 'Both (Recent & Total)'
})

function selectPlaytime(val) {
  inputPlaytimeDisplay.value = val
  activeDropdown.value = null
}

// Font options
const fontOptions = [
  { value: 'inter', label: 'Inter (Modern Sans)' },
  { value: 'roboto', label: 'Roboto (Clean)' },
  { value: 'poppins', label: 'Poppins (Geometric)' },
  { value: 'outfit', label: 'Outfit (Premium)' },
  { value: 'mono', label: 'Fira Code (Monospace)' },
  { value: 'system', label: 'System Default' }
]

const selectedFontLabel = computed(() => {
  const opt = fontOptions.find(o => o.value === inputFont.value)
  return opt ? opt.label : 'Inter (Modern Sans)'
})

function selectFont(val) {
  inputFont.value = val
  activeDropdown.value = null
}

// Color picker helpers
const colorPresets = ['#1b2838', '#171a21', '#2a475e', '#66c0f4', '#90ba3c', '#57cbde', '#898989', '#ffffff', '#ff6b6b']

function selectPresetColor(type, color) {
  if (type === 'bg') inputBgColor.value = color
  if (type === 'text') inputTextColor.value = color
  if (type === 'accent') inputAccentColor.value = color
}

// Convert HEX to HSL values for custom sliders
function hexToHsl(hex) {
  if (!hex || hex[0] !== '#') return { h: 200, s: 50, l: 50 }
  let r = parseInt(hex.substring(1, 3), 16) / 255
  let g = parseInt(hex.substring(3, 5), 16) / 255
  let b = parseInt(hex.substring(5, 7), 16) / 255

  let max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0 // achromatic
  } else {
    let d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

// Convert HSL back to Hex string
function hslToHex(h, s, l) {
  s /= 100
  l /= 100
  let c = (1 - Math.abs(2 * l - 1)) * s
  let x = c * (1 - Math.abs((h / 60) % 2 - 1))
  let m = l - c / 2
  let r = 0, g = 0, b = 0

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  let rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0')
  let gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0')
  let bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0')

  return `#${rHex}${gHex}${bHex}`
}

// Dynamic computed properties for slider inputs inside custom color pickers
const colorSliders = computed(() => {
  const bgHsl = hexToHsl(inputBgColor.value || '#1b2838')
  const textHsl = hexToHsl(inputTextColor.value || '#c7d5e0')
  const accentHsl = hexToHsl(inputAccentColor.value || '#66c0f4')

  return {
    bg: {
      h: ref(bgHsl.h), s: ref(bgHsl.s), l: ref(bgHsl.l)
    },
    text: {
      h: ref(textHsl.h), s: ref(textHsl.s), l: ref(textHsl.l)
    },
    accent: {
      h: ref(accentHsl.h), s: ref(accentHsl.s), l: ref(accentHsl.l)
    }
  }
})

// Sync sliders to actual colors
function updateColorFromHsl(type, h, s, l) {
  const hex = hslToHex(h, s, l)
  if (type === 'bg') inputBgColor.value = hex
  if (type === 'text') inputTextColor.value = hex
  if (type === 'accent') inputAccentColor.value = hex
}

// Widget base URL (auto-detect)
const baseUrl = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}`
  }
  return 'https://steamcard-vm10.pages.dev'
})

// Auto generate embed code whenever configurations change
function generateEmbedCode() {
  if (!inputId.value.trim()) {
    generatedUrl.value = ''
    return
  }
  
  const params = new URLSearchParams()
  params.set('id', inputId.value.trim())
  
  if (inputGames.value !== 3) params.set('games', inputGames.value)
  if (inputSort.value !== 'recent') params.set('sort', inputSort.value)
  if (inputTheme.value !== 'dark') params.set('theme', inputTheme.value)
  if (inputBgColor.value) params.set('bg_color', inputBgColor.value.replace('#', ''))
  if (inputTextColor.value) params.set('text_color', inputTextColor.value.replace('#', ''))
  if (inputAccentColor.value) params.set('accent_color', inputAccentColor.value.replace('#', ''))
  if (inputBorderRadius.value !== 16) params.set('border_radius', inputBorderRadius.value)
  if (inputHideStatus.value) params.set('hide_status', 'true')
  if (!inputShowId.value) params.set('show_id', 'false')
  if (inputPlaytimeDisplay.value !== 'both') params.set('playtime_display', inputPlaytimeDisplay.value)
  if (inputFont.value !== 'inter') params.set('font', inputFont.value)
  params.set('embed', 'true')
  
  generatedUrl.value = `${baseUrl.value}/?${params.toString()}`
}

// Watch configurations to auto-update generated URLs and codes
watch([
  inputId, inputGames, inputSort, inputTheme, 
  inputBgColor, inputTextColor, inputAccentColor, 
  inputBorderRadius, inputHideStatus, inputShowId, 
  inputPlaytimeDisplay, inputFont
], () => {
  generateEmbedCode()
}, { deep: true })

const iframeCode = computed(() => {
  if (!generatedUrl.value) return ''
  const h = 180 + (inputGames.value * 52) + (inputGames.value > 0 ? 30 : 0) + (inputShowId.value ? 16 : 0)
  return `<iframe src="${generatedUrl.value}" width="420" height="${h}" frameborder="0" style="border-radius: ${inputBorderRadius.value}px; overflow: hidden;"></iframe>`
})

const imgCode = computed(() => {
  if (!inputId.value.trim()) return ''
  const params = new URLSearchParams()
  params.set('id', inputId.value.trim())
  if (inputGames.value !== 3) params.set('games', inputGames.value)
  if (inputSort.value !== 'recent') params.set('sort', inputSort.value)
  if (inputTheme.value !== 'dark') params.set('theme', inputTheme.value)
  if (inputBgColor.value) params.set('bg_color', inputBgColor.value.replace('#', ''))
  if (inputTextColor.value) params.set('text_color', inputTextColor.value.replace('#', ''))
  if (inputAccentColor.value) params.set('accent_color', inputAccentColor.value.replace('#', ''))
  if (inputBorderRadius.value !== 16) params.set('border_radius', inputBorderRadius.value)
  if (inputHideStatus.value) params.set('hide_status', 'true')
  if (!inputShowId.value) params.set('show_id', 'false')
  if (inputPlaytimeDisplay.value !== 'both') params.set('playtime_display', inputPlaytimeDisplay.value)
  if (inputFont.value !== 'inter') params.set('font', inputFont.value)
  
  return `<img src="${baseUrl.value}/api/steam-svg?${params.toString()}" alt="Steam Profile" width="400" />`
})

const markdownCode = computed(() => {
  if (!inputId.value.trim()) return ''
  return `[![Steam Profile](${baseUrl.value}/api/steam-svg?${imgCode.value.split('?')[1].replace(' />', '').replace(/"/g, '')})](https://steamcommunity.com)`
})

async function copyToClipboard(text, type) {
  try {
    await navigator.clipboard.writeText(text)
    copiedType.value = type
    setTimeout(() => { copiedType.value = null }, 2000)
  } catch {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copiedType.value = type
    setTimeout(() => { copiedType.value = null }, 2000)
  }
}

async function fetchSteamData() {
  if (!inputId.value.trim()) return
  loading.value = true
  errorMsg.value = null
  
  try {
    const res = await fetch(`/api/steam?id=${encodeURIComponent(inputId.value.trim())}&games=${inputGames.value}&sort=${inputSort.value}`)
    const data = await res.json()
    
    if (data.error) throw new Error(data.error)
    steamData.value = data
  } catch (error) {
    console.error('Failed to fetch Steam data:', error)
    errorMsg.value = error.message || 'Failed to load Steam profile'
    steamData.value = null
  } finally {
    loading.value = false
  }
}

// Fetch preview data when the preview button is clicked
function handlePreview() {
  fetchSteamData()
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const steamId = params.get('id')
  isEmbed.value = params.get('embed') === 'true'
  
  // Read params
  if (steamId) inputId.value = steamId
  inputGames.value = Math.min(10, Math.max(0, parseInt(params.get('games') ?? '3', 10)))
  inputSort.value = params.get('sort') === 'playtime' ? 'playtime' : 'recent'
  inputTheme.value = params.get('theme') || 'dark'
  currentTheme.value = inputTheme.value
  
  if (params.get('bg_color')) inputBgColor.value = `#${params.get('bg_color')}`
  if (params.get('text_color')) inputTextColor.value = `#${params.get('text_color')}`
  if (params.get('accent_color')) inputAccentColor.value = `#${params.get('accent_color')}`
  inputBorderRadius.value = Math.min(40, Math.max(0, parseInt(params.get('border_radius') ?? '16', 10)))
  inputHideStatus.value = params.get('hide_status') === 'true'
  inputShowId.value = params.get('show_id') !== 'false'
  inputPlaytimeDisplay.value = params.get('playtime_display') || 'both'
  inputFont.value = params.get('font') || 'inter'
  
  if (isEmbed.value) {
    // Embed mode setups
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.margin = '0'
    document.body.style.padding = '0'
    document.body.style.background = 'transparent'
    
    const appDiv = document.getElementById('app')
    if (appDiv) {
      appDiv.style.width = '100%'
      appDiv.style.height = '100%'
    }
    
    const resizeWidget = () => {
      const wrapper = document.getElementById('widget-wrapper')
      if (wrapper) {
        const scale = Math.min(1, window.innerWidth / 450)
        wrapper.style.transform = `scale(${scale})`
      }
    }
    window.addEventListener('resize', resizeWidget)
    
    if (steamId) {
      await fetchSteamData()
    }
    
    nextTick(() => {
      const wrapper = document.getElementById('widget-wrapper')
      if (wrapper) {
        const scale = Math.min(1, window.innerWidth / 450)
        wrapper.style.transform = `scale(${scale})`
      }
    })
  } else {
    // Full Page mode
    if (steamId) {
      await fetchSteamData()
      generateEmbedCode()
    }
  }
})

// Font style getter to dynamically change preview font
const activeFontFamily = computed(() => {
  const fonts = {
    inter: "'Inter', sans-serif",
    roboto: "'Roboto', sans-serif",
    poppins: "'Poppins', sans-serif",
    outfit: "'Outfit', sans-serif",
    mono: "'Fira Code', 'Cascadia Code', monospace",
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  }
  return fonts[inputFont.value] || fonts.inter
})

const previewCardWrapperStyle = computed(() => {
  return {
    fontFamily: activeFontFamily.value
  }
})
</script>

<template>
  <!-- ============ EMBED MODE ============ -->
  <div v-if="isEmbed" class="embed-root" :style="previewCardWrapperStyle">
    <div class="scale-wrapper" id="widget-wrapper">
      <SteamCard 
        v-if="steamData" 
        :data="steamData" 
        :theme="inputTheme"
        :show-id="inputShowId"
        :hide-status="inputHideStatus"
        :bg-color="inputBgColor.replace('#', '')"
        :text-color="inputTextColor.replace('#', '')"
        :accent-color="inputAccentColor.replace('#', '')"
        :border-radius="inputBorderRadius"
        :playtime-display="inputPlaytimeDisplay"
      />
      <div v-else-if="loading" class="embed-loading">
        <div class="embed-loading__spinner"></div>
        <span>Loading Steam profile...</span>
      </div>
      <div v-else-if="errorMsg" class="embed-error">{{ errorMsg }}</div>
    </div>
  </div>

  <!-- ============ FULL PAGE MODE ============ -->
  <div v-else class="page-root">
    <!-- Aurora Background -->
    <div class="page-bg">
      <div class="aurora aurora--1"></div>
      <div class="aurora aurora--2"></div>
      <div class="aurora aurora--3"></div>
      <div class="page-bg__noise"></div>
    </div>

    <!-- Content -->
    <div class="page-content">
      <!-- Desktop Layout: Split Panel -->
      <div class="editor-layout">
        
        <!-- Left Side: Live Preview (Fixed Viewport Height) -->
        <div class="preview-panel">
          <div class="preview-panel__fixed-center">
            <h2 class="section-title">Live Preview</h2>
            
            <div class="preview-container" :style="previewCardWrapperStyle">
              <SteamCard 
                v-if="steamData" 
                :data="steamData" 
                :theme="inputTheme"
                :show-id="inputShowId"
                :hide-status="inputHideStatus"
                :bg-color="inputBgColor.replace('#', '')"
                :text-color="inputTextColor.replace('#', '')"
                :accent-color="inputAccentColor.replace('#', '')"
                :border-radius="inputBorderRadius"
                :playtime-display="inputPlaytimeDisplay"
              />
              
              <!-- Empty state / guidance -->
              <div v-else-if="!inputId" class="empty-preview glass-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--steam-text-muted)" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                </svg>
                <p>Enter a Steam ID or vanity URL in the settings panel to preview your customized widget.</p>
              </div>

              <!-- Loading Skeleton -->
              <div v-else-if="loading" class="loading-card glass-card">
                <div class="loading-card__row">
                  <div class="skeleton" style="width: 60px; height: 60px; border-radius: 50%;"></div>
                  <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
                    <div class="skeleton" style="width: 140px; height: 16px;"></div>
                    <div class="skeleton" style="width: 80px; height: 12px;"></div>
                  </div>
                </div>
                <div class="skeleton" style="width: 100%; height: 40px; margin-top: 12px;"></div>
                <div class="skeleton" style="width: 100%; height: 40px; margin-top: 6px;"></div>
                <div class="skeleton" style="width: 100%; height: 40px; margin-top: 6px;"></div>
              </div>

              <div v-else-if="errorMsg" class="error-card glass-card">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>{{ errorMsg }}</p>
              </div>
            </div>
            
            <!-- Quick Info / Help -->
            <div class="help-box glass-card" v-if="inputId">
              <h3>Tip:</h3>
              <p>Ensure your Steam Profile and Game Details visibility are set to <strong>Public</strong> in Steam privacy settings so the widget can render your activity.</p>
            </div>
          </div>
        </div>
        
        <!-- Right Side: Scrollable Customization & Controls -->
        <div class="controls-panel">
          <div class="controls-panel__scroller">
            <!-- Hero Header inside right column -->
            <header class="hero">
              <div class="hero__badge">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
                steamcard-vm10
              </div>
              <h1 class="hero__title">Steam Profile <span class="hero__title--accent">Widget</span></h1>
              <p class="hero__subtitle">
                Build a premium card for your website.
              </p>
            </header>

            <section class="generator glass-card">
              <h2 class="section-title">Widget Settings</h2>
              
              <form @submit.prevent="handlePreview" class="generator__form">
                <!-- Steam ID input -->
                <div class="generator__row">
                  <label class="generator__label">
                    <span class="generator__label-text">Steam ID / Vanity URL Name</span>
                    <div class="input-with-btn">
                      <input 
                        v-model="inputId" 
                        type="text" 
                        placeholder="e.g. 76561198355549311" 
                        class="input generator__input"
                        id="steam-id-input"
                      />
                      <button type="submit" class="btn btn--primary" id="preview-button">
                        Load Profile
                      </button>
                    </div>
                  </label>
                </div>
                
                <!-- Games count & Sort options -->
                <div class="generator__row generator__row--split">
                  <label class="generator__label">
                    <span class="generator__label-text">Recently Played (0-10)</span>
                    <div class="generator__range-wrap">
                      <input 
                        v-model.number="inputGames" 
                        type="range" 
                        min="0" max="10" 
                        class="generator__range"
                        id="games-count-input"
                      />
                      <span class="generator__range-value">{{ inputGames }}</span>
                    </div>
                  </label>
                  
                  <label class="generator__label">
                    <span class="generator__label-text">Sort Games By</span>
                    <div class="generator__pills">
                      <button 
                        v-for="s in ['recent', 'playtime']" 
                        :key="s"
                        type="button"
                        :class="['generator__pill', { 'generator__pill--active': inputSort === s }]"
                        @click="inputSort = s"
                      >
                        {{ s === 'recent' ? 'Recent' : 'Playtime' }}
                      </button>
                    </div>
                  </label>
                </div>

                <!-- Playtime display selection & Font selection (Custom Glassmorphic Dropdowns) -->
                <div class="generator__row generator__row--split">
                  <label class="generator__label">
                    <span class="generator__label-text">Playtime Display</span>
                    <div class="glass-select-wrapper">
                      <button 
                        type="button" 
                        class="glass-select-trigger" 
                        @click="toggleDropdown('playtime', $event)"
                      >
                        <span>{{ selectedPlaytimeLabel }}</span>
                        <svg class="select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor">
                          <path d="M1 1l4 4 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <div v-show="activeDropdown === 'playtime'" class="glass-select-dropdown">
                        <div 
                          v-for="opt in playtimeOptions" 
                          :key="opt.value"
                          :class="['glass-select-option', { 'glass-select-option--active': inputPlaytimeDisplay === opt.value }]"
                          @click="selectPlaytime(opt.value)"
                        >
                          {{ opt.label }}
                        </div>
                      </div>
                    </div>
                  </label>
                  
                  <label class="generator__label">
                    <span class="generator__label-text">Font Style</span>
                    <div class="glass-select-wrapper">
                      <button 
                        type="button" 
                        class="glass-select-trigger" 
                        @click="toggleDropdown('font', $event)"
                      >
                        <span>{{ selectedFontLabel }}</span>
                        <svg class="select-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor">
                          <path d="M1 1l4 4 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                      <div v-show="activeDropdown === 'font'" class="glass-select-dropdown">
                        <div 
                          v-for="opt in fontOptions" 
                          :key="opt.value"
                          :class="['glass-select-option', { 'glass-select-option--active': inputFont === opt.value }]"
                          @click="selectFont(opt.value)"
                        >
                          {{ opt.label }}
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                <!-- Custom Toggles -->
                <div class="generator__row">
                  <span class="generator__label-text">Display Options</span>
                  <div class="checkbox-grid">
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="inputShowId" class="checkbox-input" />
                      <span class="custom-checkbox">
                        <svg v-if="inputShowId" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span>Show Steam ID</span>
                    </label>
                    <label class="checkbox-label">
                      <input type="checkbox" v-model="inputHideStatus" class="checkbox-input" />
                      <span class="custom-checkbox">
                        <svg v-if="inputHideStatus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                      <span>Hide Status Indicator</span>
                    </label>
                  </div>
                </div>

                <!-- Design settings divider -->
                <div class="design-divider">Appearance Styling</div>

                <!-- Theme preset & Corner Radius -->
                <div class="generator__row generator__row--split">
                  <label class="generator__label">
                    <span class="generator__label-text">Theme Preset</span>
                    <div class="generator__pills">
                      <button 
                        v-for="t in ['dark', 'light', 'transparent']" 
                        :key="t"
                        type="button"
                        :class="['generator__pill', { 'generator__pill--active': inputTheme === t }]"
                        @click="inputTheme = t"
                      >
                        {{ t }}
                      </button>
                    </div>
                  </label>

                  <label class="generator__label">
                    <span class="generator__label-text">Corner Radius: {{ inputBorderRadius }}px</span>
                    <div class="generator__range-wrap">
                      <input 
                        v-model.number="inputBorderRadius" 
                        type="range" 
                        min="0" max="40" 
                        class="generator__range"
                      />
                    </div>
                  </label>
                </div>

                <!-- Color picker section with premium custom color popovers -->
                <div class="generator__row">
                  <span class="generator__label-text">Manual Color Overrides</span>
                  <div class="color-inputs-grid">
                    
                    <!-- Background Color Picker -->
                    <div class="color-picker-item">
                      <span class="color-picker-label">Background</span>
                      <div class="premium-color-picker-trigger-wrap" :class="{ 'is-active': activeDropdown === 'bgColorPicker' }">
                        <button 
                          type="button" 
                          class="premium-color-picker-trigger"
                          @click="toggleDropdown('bgColorPicker', $event)"
                        >
                          <span class="color-circle-preview" :style="{ background: inputBgColor || '#1b2838' }"></span>
                          <span class="color-hex-text">{{ inputBgColor || '#1b2838' }}</span>
                        </button>
                        
                        <div v-show="activeDropdown === 'bgColorPicker'" class="color-picker-popover glass-card" @click.stopPropagation>
                          <h4>Background Color Settings</h4>
                          <div class="color-preset-grid">
                            <span 
                              v-for="color in colorPresets" 
                              :key="color"
                              class="color-preset-circle"
                              :style="{ background: color }"
                              @click="selectPresetColor('bg', color)"
                            ></span>
                          </div>
                          
                          <div class="hsl-sliders">
                            <div class="slider-group">
                              <label>Hue: {{ hexToHsl(inputBgColor || '#1b2838').h }}°</label>
                              <input 
                                type="range" 
                                min="0" max="360"
                                :value="hexToHsl(inputBgColor || '#1b2838').h"
                                @input="updateColorFromHsl('bg', $event.target.value, hexToHsl(inputBgColor || '#1b2838').s, hexToHsl(inputBgColor || '#1b2838').l)"
                              />
                            </div>
                            <div class="slider-group">
                              <label>Saturation: {{ hexToHsl(inputBgColor || '#1b2838').s }}%</label>
                              <input 
                                type="range" 
                                min="0" max="100"
                                :value="hexToHsl(inputBgColor || '#1b2838').s"
                                @input="updateColorFromHsl('bg', hexToHsl(inputBgColor || '#1b2838').h, $event.target.value, hexToHsl(inputBgColor || '#1b2838').l)"
                              />
                            </div>
                            <div class="slider-group">
                              <label>Lightness: {{ hexToHsl(inputBgColor || '#1b2838').l }}%</label>
                              <input 
                                type="range" 
                                min="0" max="100"
                                :value="hexToHsl(inputBgColor || '#1b2838').l"
                                @input="updateColorFromHsl('bg', hexToHsl(inputBgColor || '#1b2838').h, hexToHsl(inputBgColor || '#1b2838').s, $event.target.value)"
                              />
                            </div>
                          </div>
                          <div class="manual-hex-input-row">
                            <span>Hex:</span>
                            <input type="text" v-model="inputBgColor" placeholder="#1b2838" class="hex-text-input" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Text Color Picker -->
                    <div class="color-picker-item">
                      <span class="color-picker-label">Text</span>
                      <div class="premium-color-picker-trigger-wrap" :class="{ 'is-active': activeDropdown === 'textColorPicker' }">
                        <button 
                          type="button" 
                          class="premium-color-picker-trigger"
                          @click="toggleDropdown('textColorPicker', $event)"
                        >
                          <span class="color-circle-preview" :style="{ background: inputTextColor || '#c7d5e0' }"></span>
                          <span class="color-hex-text">{{ inputTextColor || '#c7d5e0' }}</span>
                        </button>
                        
                        <div v-show="activeDropdown === 'textColorPicker'" class="color-picker-popover glass-card" @click.stopPropagation>
                          <h4>Text Color Settings</h4>
                          <div class="color-preset-grid">
                            <span 
                              v-for="color in colorPresets" 
                              :key="color"
                              class="color-preset-circle"
                              :style="{ background: color }"
                              @click="selectPresetColor('text', color)"
                            ></span>
                          </div>
                          
                          <div class="hsl-sliders">
                            <div class="slider-group">
                              <label>Hue: {{ hexToHsl(inputTextColor || '#c7d5e0').h }}°</label>
                              <input 
                                type="range" 
                                min="0" max="360"
                                :value="hexToHsl(inputTextColor || '#c7d5e0').h"
                                @input="updateColorFromHsl('text', $event.target.value, hexToHsl(inputTextColor || '#c7d5e0').s, hexToHsl(inputTextColor || '#c7d5e0').l)"
                              />
                            </div>
                            <div class="slider-group">
                              <label>Saturation: {{ hexToHsl(inputTextColor || '#c7d5e0').s }}%</label>
                              <input 
                                type="range" 
                                min="0" max="100"
                                :value="hexToHsl(inputTextColor || '#c7d5e0').s"
                                @input="updateColorFromHsl('text', hexToHsl(inputTextColor || '#c7d5e0').h, $event.target.value, hexToHsl(inputTextColor || '#c7d5e0').l)"
                              />
                            </div>
                            <div class="slider-group">
                              <label>Lightness: {{ hexToHsl(inputTextColor || '#c7d5e0').l }}%</label>
                              <input 
                                type="range" 
                                min="0" max="100"
                                :value="hexToHsl(inputTextColor || '#c7d5e0').l"
                                @input="updateColorFromHsl('text', hexToHsl(inputTextColor || '#c7d5e0').h, hexToHsl(inputTextColor || '#c7d5e0').s, $event.target.value)"
                              />
                            </div>
                          </div>
                          <div class="manual-hex-input-row">
                            <span>Hex:</span>
                            <input type="text" v-model="inputTextColor" placeholder="#c7d5e0" class="hex-text-input" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Accent Color Picker -->
                    <div class="color-picker-item">
                      <span class="color-picker-label">Accent</span>
                      <div class="premium-color-picker-trigger-wrap" :class="{ 'is-active': activeDropdown === 'accentColorPicker' }">
                        <button 
                          type="button" 
                          class="premium-color-picker-trigger"
                          @click="toggleDropdown('accentColorPicker', $event)"
                        >
                          <span class="color-circle-preview" :style="{ background: inputAccentColor || '#66c0f4' }"></span>
                          <span class="color-hex-text">{{ inputAccentColor || '#66c0f4' }}</span>
                        </button>
                        
                        <div v-show="activeDropdown === 'accentColorPicker'" class="color-picker-popover glass-card" @click.stopPropagation>
                          <h4>Accent Color Settings</h4>
                          <div class="color-preset-grid">
                            <span 
                              v-for="color in colorPresets" 
                              :key="color"
                              class="color-preset-circle"
                              :style="{ background: color }"
                              @click="selectPresetColor('accent', color)"
                            ></span>
                          </div>
                          
                          <div class="hsl-sliders">
                            <div class="slider-group">
                              <label>Hue: {{ hexToHsl(inputAccentColor || '#66c0f4').h }}°</label>
                              <input 
                                type="range" 
                                min="0" max="360"
                                :value="hexToHsl(inputAccentColor || '#66c0f4').h"
                                @input="updateColorFromHsl('accent', $event.target.value, hexToHsl(inputAccentColor || '#66c0f4').s, hexToHsl(inputAccentColor || '#66c0f4').l)"
                              />
                            </div>
                            <div class="slider-group">
                              <label>Saturation: {{ hexToHsl(inputAccentColor || '#66c0f4').s }}%</label>
                              <input 
                                type="range" 
                                min="0" max="100"
                                :value="hexToHsl(inputAccentColor || '#66c0f4').s"
                                @input="updateColorFromHsl('accent', hexToHsl(inputAccentColor || '#66c0f4').h, $event.target.value, hexToHsl(inputAccentColor || '#66c0f4').l)"
                              />
                            </div>
                            <div class="slider-group">
                              <label>Lightness: {{ hexToHsl(inputAccentColor || '#66c0f4').l }}%</label>
                              <input 
                                type="range" 
                                min="0" max="100"
                                :value="hexToHsl(inputAccentColor || '#66c0f4').l"
                                @input="updateColorFromHsl('accent', hexToHsl(inputAccentColor || '#66c0f4').h, hexToHsl(inputAccentColor || '#66c0f4').s, $event.target.value)"
                              />
                            </div>
                          </div>
                          <div class="manual-hex-input-row">
                            <span>Hex:</span>
                            <input type="text" v-model="inputAccentColor" placeholder="#66c0f4" class="hex-text-input" />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                  
                  <button 
                    v-if="inputBgColor || inputTextColor || inputAccentColor" 
                    type="button" 
                    @click="inputBgColor = ''; inputTextColor = ''; inputAccentColor = ''" 
                    class="btn btn--reset-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
                    </svg>
                    Reset Custom Colors
                  </button>
                </div>
              </form>
            </section>

            <!-- Embed Codes Output -->
            <section v-if="generatedUrl" class="embed-codes glass-card">
              <h2 class="section-title">Generated Codes</h2>
              
              <div class="embed-codes__block">
                <h3 class="embed-codes__subtitle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="12" x2="17" y2="12"/>
                  </svg>
                  iframe
                </h3>
                <div class="code-block">
                  <button 
                    class="code-block__copy" 
                    @click="copyToClipboard(iframeCode, 'iframe')"
                  >
                    {{ copiedType === 'iframe' ? '✓ Copied!' : 'Copy' }}
                  </button>
                  {{ iframeCode }}
                </div>
              </div>
              
              <div class="embed-codes__block">
                <h3 class="embed-codes__subtitle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                  Markdown
                </h3>
                <div class="code-block">
                  <button 
                    class="code-block__copy" 
                    @click="copyToClipboard(markdownCode, 'markdown')"
                  >
                    {{ copiedType === 'markdown' ? '✓ Copied!' : 'Copy' }}
                  </button>
                  {{ markdownCode }}
                </div>
              </div>

              <div class="embed-codes__block">
                <h3 class="embed-codes__subtitle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                  SVG Direct URL
                </h3>
                <div class="code-block">
                  <button 
                    class="code-block__copy" 
                    @click="copyToClipboard(imgCode, 'img')"
                  >
                    {{ copiedType === 'img' ? '✓ Copied!' : 'Copy' }}
                  </button>
                  {{ imgCode }}
                </div>
              </div>
            </section>

            <!-- Footer -->
            <footer class="page-footer">
              <a href="https://github.com/vermilion10/steam-widget" target="_blank" class="btn btn--ghost" id="github-link">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
                </svg>
                vermilion10 / steam-widget
              </a>
              <p class="page-footer__credit">
                Powered by 
                <a href="https://pages.cloudflare.com" target="_blank">Cloudflare Pages</a> 
                · Steam data from 
                <a href="https://developer.valvesoftware.com/wiki/Steam_Web_API" target="_blank">Steam Web API</a>
              </p>
            </footer>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============ EMBED MODE ============ */
.embed-root {
  width: 100%;
  height: 100%;
  background: transparent;
  margin: 0;
  padding: 0;
  overflow: hidden;
  position: relative;
}

.embed-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--steam-text-muted);
  font-size: 0.85rem;
  padding: 20px;
}

.embed-loading__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--steam-medium-bg);
  border-top-color: var(--steam-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.embed-error {
  color: #ff6b6b;
  font-size: 0.85rem;
  padding: 20px;
}

/* ============ FULL PAGE MODE ============ */
.page-root {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background: var(--steam-darker-bg);
}

.page-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.aurora {
  position: absolute;
  border-radius: 50%;
  mix-blend-mode: screen;
  filter: blur(100px);
}

.aurora--1 {
  top: -15%;
  left: -10%;
  width: 50vw;
  height: 50vw;
  background: #1e3a5f;
  opacity: 0.5;
  animation: aurora-drift-1 18s infinite ease-in-out;
}

.aurora--2 {
  bottom: -10%;
  right: -15%;
  width: 55vw;
  height: 55vw;
  background: #2d6a8a;
  opacity: 0.35;
  animation: aurora-drift-2 22s infinite ease-in-out;
}

.aurora--3 {
  top: 35%;
  left: 25%;
  width: 40vw;
  height: 40vw;
  background: #1b3a5c;
  opacity: 0.25;
  animation: aurora-drift-3 16s infinite ease-in-out;
}

.page-bg__noise {
  position: absolute;
  inset: 0;
  opacity: 0.15;
  mix-blend-mode: overlay;
  background-image: url('https://grainy-gradients.vercel.app/noise.svg');
}

.page-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* ---------- Split Panel Layout (Desktop Fixed Viewports) ---------- */
.editor-layout {
  display: flex;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

/* Left panel: Centering with safe overflow scrolling */
.preview-panel {
  flex: 1.1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid rgba(102, 192, 244, 0.08);
  background: rgba(23, 26, 33, 0.2);
  padding: 40px 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 192, 244, 0.15) transparent;
}

.preview-panel::-webkit-scrollbar {
  width: 4px;
}
.preview-panel::-webkit-scrollbar-track {
  background: transparent;
}
.preview-panel::-webkit-scrollbar-thumb {
  background: rgba(102, 192, 244, 0.15);
  border-radius: var(--radius-full);
}

.preview-panel__fixed-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 440px;
  margin-top: auto;
  margin-bottom: auto;
  padding: 20px 0;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 280px;
}

.section-title {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--steam-blue);
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-bottom: 0;
  opacity: 0.9;
  text-shadow: 0 0 10px rgba(102, 192, 244, 0.2);
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  gap: 16px;
  color: var(--steam-text-muted);
  font-size: 0.85rem;
  width: 100%;
}

.empty-preview p {
  line-height: 1.6;
}

.help-box {
  padding: 16px 20px;
  font-size: 0.78rem;
  line-height: 1.6;
  border-radius: var(--radius-lg);
  width: 100%;
}

.help-box h3 {
  color: var(--steam-blue);
  font-size: 0.82rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.help-box p {
  color: var(--steam-text-muted);
  margin: 0;
}

.loading-card {
  width: 100%;
  padding: 24px;
}

.loading-card__row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.error-card {
  width: 100%;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ff6b6b;
  font-size: 0.85rem;
}

/* Right panel: Scrollable tuning configurations */
.controls-panel {
  flex: 1.9;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.controls-panel__scroller {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  scrollbar-width: thin;
  scrollbar-color: rgba(102, 192, 244, 0.2) transparent;
}

/* Custom scrollbars for WebKit */
.controls-panel__scroller::-webkit-scrollbar {
  width: 6px;
}
.controls-panel__scroller::-webkit-scrollbar-track {
  background: transparent;
}
.controls-panel__scroller::-webkit-scrollbar-thumb {
  background: rgba(102, 192, 244, 0.2);
  border-radius: var(--radius-full);
}
.controls-panel__scroller::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 192, 244, 0.4);
}

/* ---------- Hero Banner ---------- */
.hero {
  text-align: left;
  margin-bottom: 8px;
  max-width: 700px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(102, 192, 244, 0.08);
  border: 1px solid rgba(102, 192, 244, 0.15);
  border-radius: var(--radius-full);
  padding: 6px 16px;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--steam-blue);
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.hero__title {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--steam-text-bright);
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
}

.hero__title--accent {
  background: linear-gradient(135deg, var(--steam-blue), #a8e6cf);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero__subtitle {
  font-size: 0.9rem;
  color: var(--steam-text-muted);
  margin-top: 10px;
  line-height: 1.5;
}

/* ---------- Tuning Controls ---------- */
.generator {
  padding: 28px;
  max-width: 700px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.generator__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.generator__row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.generator__row--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.generator__label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.generator__label-text {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--steam-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-with-btn {
  display: flex;
  gap: 8px;
}

.input-with-btn .input {
  flex: 1;
}

.generator__range-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 38px;
}

.generator__range {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--steam-medium-bg);
  border-radius: 2px;
  outline: none;
}

.generator__range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--steam-blue);
  cursor: pointer;
  box-shadow: 0 0 8px rgba(102, 192, 244, 0.4);
}

.generator__range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--steam-blue);
  cursor: pointer;
  border: none;
}

.generator__range-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--steam-blue);
  min-width: 24px;
  text-align: center;
}

.generator__pills {
  display: flex;
  gap: 4px;
  background: rgba(27, 40, 56, 0.6);
  border: 1px solid rgba(102, 192, 244, 0.15);
  border-radius: var(--radius-full);
  padding: 3px;
  height: 38px;
}

.generator__pill {
  flex: 1;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-full);
  font-size: 0.72rem;
  font-weight: 700;
  font-family: var(--font-family);
  color: var(--steam-text-muted);
  background: transparent;
  cursor: pointer;
  transition: var(--transition-fast);
  text-transform: capitalize;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generator__pill--active {
  background: var(--steam-blue);
  color: var(--steam-darker-bg);
  box-shadow: 0 2px 8px rgba(102, 192, 244, 0.3);
}

.generator__pill:hover:not(.generator__pill--active) {
  color: var(--steam-text);
  background: rgba(255, 255, 255, 0.05);
}

/* Glassmorphic Dropdown Styling */
.glass-select-wrapper {
  position: relative;
  width: 100%;
}

.glass-select-trigger {
  width: 100%;
  height: 38px;
  background: rgba(20, 32, 45, 0.7);
  border: 1px solid rgba(102, 192, 244, 0.15);
  border-radius: var(--radius-full);
  padding: 0 16px;
  color: var(--steam-text-bright);
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
  transition: var(--transition-normal);
  font-family: var(--font-family);
}

.glass-select-trigger:focus,
.glass-select-trigger:hover {
  border-color: rgba(102, 192, 244, 0.4);
  background: rgba(20, 32, 45, 0.85);
}

.select-chevron {
  color: var(--steam-blue);
  transition: transform var(--transition-fast);
}

.glass-select-wrapper:focus-within .select-chevron {
  transform: rotate(180deg);
}

.glass-select-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 100%;
  background: rgba(23, 26, 33, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(102, 192, 244, 0.25);
  border-radius: var(--radius-lg);
  padding: 6px;
  z-index: 100;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.glass-select-option {
  padding: 10px 14px;
  color: var(--steam-text);
  font-size: 0.8rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-fast);
  text-align: left;
}

.glass-select-option:hover {
  background: rgba(102, 192, 244, 0.1);
  color: var(--steam-blue);
}

.glass-select-option--active {
  background: rgba(102, 192, 244, 0.15);
  color: var(--steam-blue);
  font-weight: 600;
}

/* Custom Checkbox Grid */
.checkbox-grid {
  display: flex;
  gap: 24px;
  padding: 4px 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--steam-text);
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.custom-checkbox {
  width: 18px;
  height: 18px;
  background: rgba(20, 32, 45, 0.7);
  border: 1px solid rgba(102, 192, 244, 0.15);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--steam-blue);
  transition: var(--transition-normal);
  flex-shrink: 0;
}

.checkbox-label:hover .custom-checkbox {
  border-color: rgba(102, 192, 244, 0.4);
  background: rgba(20, 32, 45, 0.9);
}

.checkbox-input:checked ~ .custom-checkbox {
  border-color: var(--steam-blue);
  background: rgba(102, 192, 244, 0.1);
  box-shadow: 0 0 8px rgba(102, 192, 244, 0.25);
}

.custom-checkbox svg {
  width: 12px;
  height: 12px;
}

.design-divider {
  border-top: 1px solid rgba(102, 192, 244, 0.12);
  padding-top: 18px;
  margin-top: 8px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--steam-blue);
}

/* Custom Premium Styled Color Picker Dropdowns */
.color-inputs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 4px;
}

.color-picker-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.color-picker-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--steam-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
}

.premium-color-picker-trigger-wrap {
  position: relative;
  width: 100%;
}

.premium-color-picker-trigger-wrap.is-active {
  z-index: 100;
}

.premium-color-picker-trigger {
  width: 100%;
  height: 38px;
  background: rgba(20, 32, 45, 0.7);
  border: 1px solid rgba(102, 192, 244, 0.15);
  border-radius: var(--radius-full);
  padding: 0 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: var(--transition-normal);
}

.premium-color-picker-trigger:hover {
  border-color: rgba(102, 192, 244, 0.4);
  background: rgba(20, 32, 45, 0.85);
}

.color-circle-preview {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.color-hex-text {
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.72rem;
  color: var(--steam-text-bright);
}

.color-picker-popover {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 230px;
  background: rgba(23, 26, 33, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(102, 192, 244, 0.25);
  border-radius: var(--radius-lg);
  padding: 16px;
  z-index: 101;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: none !important;
}

.color-picker-popover:hover {
  transform: translateX(-50%) !important;
  background: rgba(23, 26, 33, 0.96) !important;
  border-color: rgba(102, 192, 244, 0.25) !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6) !important;
}

.color-picker-popover h4 {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--steam-blue);
  letter-spacing: 0.5px;
  margin: 0;
  text-align: left;
}

.color-preset-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.color-preset-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  transition: transform var(--transition-fast);
}

.color-preset-circle:hover {
  transform: scale(1.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.hsl-sliders {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 8px 0;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.slider-group label {
  font-size: 0.65rem;
  color: var(--steam-text-muted);
}

.slider-group input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  background: var(--steam-medium-bg);
  border-radius: 2px;
  outline: none;
}

.slider-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--steam-blue);
  cursor: pointer;
}

.manual-hex-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
}

.manual-hex-input-row span {
  color: var(--steam-text-muted);
  font-weight: 600;
}

.hex-text-input {
  flex: 1;
  height: 26px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(102, 192, 244, 0.15);
  border-radius: var(--radius-sm);
  color: var(--steam-text-bright);
  font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.72rem;
  padding: 0 8px;
  outline: none;
}

.hex-text-input:focus {
  border-color: rgba(102, 192, 244, 0.35);
}

.btn--reset-colors {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(255, 68, 68, 0.05);
  border: 1px dashed rgba(255, 68, 68, 0.25);
  color: #ff6b6b;
  border-radius: var(--radius-full);
  cursor: pointer;
  align-self: flex-start;
  transition: var(--transition-normal);
}

.btn--reset-colors:hover {
  background: rgba(255, 68, 68, 0.12);
  border-color: rgba(255, 68, 68, 0.4);
}

/* ---------- Embed Codes Output ---------- */
.embed-codes {
  padding: 28px;
  max-width: 700px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.embed-codes__block {
  margin-bottom: 20px;
}

.embed-codes__block:last-child {
  margin-bottom: 0;
}

.embed-codes__subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--steam-text-muted);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ---------- Footer ---------- */
.page-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  max-width: 700px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

.page-footer__credit {
  font-size: 0.72rem;
  color: var(--steam-text-muted);
  opacity: 0.6;
  text-align: center;
}

.page-footer__credit a {
  color: var(--steam-blue);
  opacity: 0.8;
  transition: var(--transition-fast);
}

.page-footer__credit a:hover {
  opacity: 1;
}

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .page-root {
    height: auto;
    overflow-y: auto;
  }
  
  .editor-layout {
    flex-direction: column;
    height: auto;
  }
  
  .preview-panel {
    height: auto;
    padding: 32px 16px;
    border-right: none;
    border-bottom: 1px solid rgba(102, 192, 244, 0.08);
  }
  
  .preview-panel__fixed-center {
    position: static;
  }
  
  .controls-panel {
    height: auto;
    overflow: visible;
  }
  
  .controls-panel__scroller {
    position: static;
    padding: 32px 16px;
    overflow-y: visible;
  }
}

@media (max-width: 480px) {
  .hero__title {
    font-size: 1.8rem;
  }
  
  .generator__row--split {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .checkbox-grid {
    flex-direction: column;
    gap: 10px;
  }
  
  .color-inputs-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>

