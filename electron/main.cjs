const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged
const storePath = path.join(app.getPath('userData'), 'games-store.json')

function readStore() {
  if (!fs.existsSync(storePath)) {
    return { settings: { steamApiKey: '', steamId: '' }, games: [] }
  }
  return JSON.parse(fs.readFileSync(storePath, 'utf-8'))
}
function writeStore(next) { fs.writeFileSync(storePath, JSON.stringify(next, null, 2), 'utf-8') }

async function steamGet(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Steam 请求失败: ${res.status}`)
  return res.json()
}

async function syncLibrary() {
  const store = readStore()
  const { steamApiKey, steamId } = store.settings
  if (!steamApiKey || !steamId) throw new Error('请先在设置中填写 Steam API Key 与 SteamID64')
  const owned = await steamGet(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`)
  const games = owned.response.games || []
  const mapped = games.map((g) => ({
    id: g.appid,
    appId: g.appid,
    zhName: '',
    enName: g.name,
    iconUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900.jpg`,
    playtime: Math.round((g.playtime_forever || 0) / 60),
    lastPlayed: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString().slice(0,10) : '-',
    state: store.games.find((x) => x.id === g.appid)?.state || '想玩',
    tags: store.games.find((x) => x.id === g.appid)?.tags || [],
    note: store.games.find((x) => x.id === g.appid)?.note || '',
    ach: store.games.find((x) => x.id === g.appid)?.ach || null
  }))
  store.games = mapped
  writeStore(store)
  return mapped
}

async function syncAchievements(appId) {
  const store = readStore()
  const { steamApiKey, steamId } = store.settings
  const schema = await steamGet(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}&l=schinese`)
  const player = await steamGet(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}&l=schinese`)
  const achievements = player.playerstats?.achievements || []
  const done = achievements.filter((a) => a.achieved === 1).length
  const total = achievements.length || schema.game?.availableGameStats?.achievements?.length || 0
  const percent = total ? Math.round((done / total) * 100) : 0
  const game = store.games.find((g) => g.id === appId)
  if (game) game.ach = { done, total, percent }
  writeStore(store)
  return { done, total, percent, raw: achievements }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') }
  })
  if (isDev) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '../dist/index.html'))
}

ipcMain.handle('store:get', async () => readStore())
ipcMain.handle('settings:save', async (_, settings) => { const s = readStore(); s.settings = settings; writeStore(s); return true })
ipcMain.handle('library:sync', async () => syncLibrary())
ipcMain.handle('achievement:sync', async (_, appId) => syncAchievements(appId))
ipcMain.handle('meta:save', async (_, game) => { const s = readStore(); s.games = s.games.map((g) => g.id === game.id ? { ...g, ...game } : g); writeStore(s); return true })
ipcMain.handle('open:url', async (_, url) => shell.openExternal(url))

app.whenReady().then(createWindow)
