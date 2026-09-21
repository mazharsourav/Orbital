export type ThemeChoice = 'light' | 'dark' | 'system'
export type EffectiveTheme = 'light' | 'dark'

const STORAGE_KEY = 'orbital-theme'
const THEME_CHANGE_EVENT = 'orbital:theme-change'

function getStoredChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // localStorage unavailable — fall back to system
  }
  return 'system'
}

function saveChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // localStorage unavailable — choice just won't persist across reloads
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getEffectiveTheme(choice: ThemeChoice = getStoredChoice()): EffectiveTheme {
  if (choice === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return choice
}

function applyChoice(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', choice)
  }

  document.querySelectorAll<HTMLButtonElement>('.theme-btn').forEach((btn) => {
    const active = btn.dataset.themeChoice === choice
    btn.classList.toggle('active', active)
    btn.setAttribute('aria-pressed', String(active))
  })

  window.dispatchEvent(new CustomEvent<EffectiveTheme>(THEME_CHANGE_EVENT, { detail: getEffectiveTheme(choice) }))
}

export function onThemeChange(handler: (theme: EffectiveTheme) => void): void {
  window.addEventListener(THEME_CHANGE_EVENT, (event) => {
    handler((event as CustomEvent<EffectiveTheme>).detail)
  })
}

export function initThemeToggle(): void {
  const choice = getStoredChoice()
  applyChoice(choice)

  document.querySelectorAll<HTMLButtonElement>('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.themeChoice as ThemeChoice
      saveChoice(next)
      applyChoice(next)
    })
  })

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredChoice() === 'system') applyChoice('system')
  })
}
