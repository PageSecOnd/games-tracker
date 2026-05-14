const hasDesktop = () => typeof window !== 'undefined' && window.desktopApi

const demoStore = {
  settings: { steamApiKey: '', steamId: '' },
  games: []
}

export async function loadStore() {
  if (hasDesktop()) return window.desktopApi.getStore()
  return demoStore
}

export async function saveSettings(settings) {
  if (hasDesktop()) return window.desktopApi.saveSettings(settings)
  demoStore.settings = settings
  return true
}

export async function syncLibrary() {
  if (hasDesktop()) return window.desktopApi.syncLibrary()
  return []
}

export async function syncAchievements(appId) {
  if (hasDesktop()) return window.desktopApi.syncAchievements(appId)
  return { done: 0, total: 0, percent: 0 }
}

export async function saveMeta(game) {
  if (hasDesktop()) return window.desktopApi.saveMeta(game)
  return true
}

export async function openStorePage(appId) {
  const url = `https://store.steampowered.com/app/${appId}`
  if (hasDesktop()) return window.desktopApi.openUrl(url)
  window.open(url, '_blank')
}
