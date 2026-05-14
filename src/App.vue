<template>
  <div class="app">
    <aside class="nav-rail">
      <button v-for="item in navItems" :key="item.key" :class="['rail-btn',{active:currentPage===item.key}]" @click="currentPage=item.key">{{ item.icon }}</button>
    </aside>
    <main class="main-layout">
      <header class="command-bar">
        <h1>{{ currentPageLabel }}</h1>
        <div class="search-wrap"><input v-model="query" placeholder="搜索游戏、标签或备注"/></div>
        <button class="primary" @click="handlePrimaryAction" :disabled="syncing">{{ syncing ? '同步中…' : currentPage==='wishlist' ? '添加游戏' : '同步我的库' }}</button>
      </header>
      <section class="content" v-if="currentPage==='settings'">
        <div class="panel settings">
          <h3>账号</h3>
          <label>Steam API Key<input v-model="settings.steamApiKey" placeholder="填写从 Steam 申请的 Web API Key"/></label>
          <label>SteamID64<input v-model="settings.steamId" placeholder="例如 7656119xxxxxxxxxx"/></label>
          <button class="primary" @click="saveSettingAction">保存并测试连接</button>
          <p>说明：先在 https://steamcommunity.com/dev/apikey 申请 Key，再填写你的 SteamID64。</p>
        </div>
      </section>

      <section class="content" v-else>
        <div class="grid">
          <article v-for="game in filteredGames" :key="game.id" class="card" @click="openDrawer(game)">
            <div class="left-icon">🎮</div>
            <div class="mid">
              <h3>{{ game.zhName || game.enName }}</h3>
              <small>游玩：{{ game.playtime }} 小时 · 最近：{{ game.lastPlayed }}</small>
            </div>
            <div class="right-ach">
              <strong>{{ game.ach?.done ?? '—' }} / {{ game.ach?.total ?? '—' }}</strong>
              <div class="progress"><div :style="{ width: (game.ach?.percent || 0) + '%' }"></div></div>
              <small>{{ game.ach?.percent ?? '未同步' }}</small>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div class="mask" v-if="selectedGame" @click="selectedGame=null"></div>
    <aside class="drawer" v-if="selectedGame">
      <h3>{{ selectedGame.zhName || selectedGame.enName }}</h3>
      <p>{{ selectedGame.ach?.done ?? '—' }} / {{ selectedGame.ach?.total ?? '—' }}</p>
      <label>状态<select v-model="selectedGame.state" @change="persistSelected"><option>想玩</option><option>在玩</option><option>已通关</option><option>搁置</option><option>已弃坑</option></select></label>
      <label>标签<input v-model="tagDraft" @keydown.enter.prevent="addTag" placeholder="输入标签后回车"/></label>
      <div class="chips"><span class="chip" v-for="tag in selectedGame.tags" :key="tag">{{tag}}</span></div>
      <label>备注<textarea v-model="selectedGame.note" @blur="persistSelected"/></label>
      <button class="primary" @click="refreshAchievement">刷新成就</button>
      <button class="ghost" @click="openStore">打开 Steam 商店页</button>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { loadStore, openStorePage, saveMeta, saveSettings, syncAchievements, syncLibrary } from './services'

const navItems = [{ key:'library',icon:'📚'},{key:'wishlist',icon:'⭐'},{key:'sync',icon:'🔄'},{key:'settings',icon:'⚙️'}]
const currentPage = ref('library')
const query = ref('')
const syncing = ref(false)
const games = ref([])
const selectedGame = ref(null)
const settings = ref({ steamApiKey:'', steamId:'' })
const tagDraft = ref('')

const currentPageLabel = computed(() => ({library:'游戏库',wishlist:'我的清单',sync:'同步中心',settings:'设置'})[currentPage.value])
const filteredGames = computed(() => games.value.filter((g) => `${g.zhName} ${g.enName} ${g.tags?.join(' ')} ${g.note}`.toLowerCase().includes(query.value.toLowerCase())))

const hydrate = async () => {
  const store = await loadStore()
  games.value = store.games || []
  settings.value = store.settings || settings.value
}

const handlePrimaryAction = async () => {
  if (currentPage.value === 'wishlist') return
  syncing.value = true
  await syncLibrary()
  await hydrate()
  syncing.value = false
}
const saveSettingAction = async () => { await saveSettings(settings.value); await hydrate(); alert('设置已保存') }
const openDrawer = (g) => { selectedGame.value = structuredClone(g); tagDraft.value='' }
const persistSelected = async () => { await saveMeta(selectedGame.value); await hydrate() }
const addTag = async () => { const t = tagDraft.value.trim(); if (t && !selectedGame.value.tags.includes(t)) selectedGame.value.tags.push(t); tagDraft.value=''; await persistSelected() }
const refreshAchievement = async () => { syncing.value = true; await syncAchievements(selectedGame.value.id); await hydrate(); selectedGame.value = games.value.find((g) => g.id===selectedGame.value.id); syncing.value=false }
const openStore = async () => openStorePage(selectedGame.value.appId)

onMounted(hydrate)
</script>
