<template>
  <div class="app" :data-theme="theme">
    <aside class="nav-rail">
      <button
        v-for="item in navItems"
        :key="item.key"
        :class="['rail-btn', { active: currentPage === item.key }]"
        :title="item.label"
        @click="currentPage = item.key"
      >
        <span>{{ item.icon }}</span>
      </button>
    </aside>

    <main class="main-layout">
      <header class="command-bar">
        <h1>{{ currentPageLabel }}</h1>
        <div class="search-wrap">
          <span>🔎</span>
          <input v-model="query" placeholder="搜索游戏、标签或备注" />
          <button v-if="query" class="ghost" @click="query = ''">清除</button>
        </div>
        <button class="primary">
          <span v-if="syncing">⏳</span>
          {{ currentPage === 'wishlist' ? '添加游戏' : syncing ? '同步中…' : '同步我的库' }}
        </button>
      </header>

      <section class="content">
        <div v-if="currentPage === 'sync'" class="panel">
          <h2>同步中心</h2>
          <div class="sync-item" v-for="task in syncTasks" :key="task.name">
            <div>
              <strong>{{ task.name }}</strong>
              <p>{{ task.stage }}</p>
            </div>
            <div class="progress"><div :style="{ width: task.progress + '%' }"></div></div>
            <button class="ghost">取消</button>
          </div>
        </div>

        <div v-else-if="currentPage === 'settings'" class="panel settings">
          <h2>设置</h2>
          <div class="setting-group">
            <h3>外观</h3>
            <label>主题
              <select v-model="theme">
                <option value="system">跟随系统</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
              </select>
            </label>
            <label class="switch">
              <input type="checkbox" v-model="showEnglish" /> 显示英文名（副标题）
            </label>
          </div>
        </div>

        <div v-else class="grid">
          <article v-for="game in filteredGames" :key="game.id" class="card" @click="openDrawer(game)">
            <div class="left-icon">🎮</div>
            <div class="mid">
              <h3>{{ game.zhName || game.enName }}</h3>
              <p v-if="showEnglish && game.zhName">{{ game.enName }}</p>
              <small v-if="currentPage === 'library'">游玩：{{ game.playtime }} 小时 · 最近：{{ game.lastPlayed }}</small>
            </div>
            <div class="right-ach">
              <strong>{{ game.ach?.done ?? '—' }} / {{ game.ach?.total ?? '—' }}</strong>
              <div class="progress"><div :style="{ width: (game.ach?.percent || 0) + '%' }"></div></div>
              <small>{{ game.ach ? game.ach.percent + '%' : '未同步' }}</small>
            </div>
            <div class="chips">
              <span class="chip state">{{ game.state }}</span>
              <span class="chip" v-for="tag in game.tags.slice(0, 3)" :key="tag">{{ tag }}</span>
              <span class="chip" v-if="game.tags.length > 3">+{{ game.tags.length - 3 }}</span>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div class="mask" v-if="selectedGame" @click="selectedGame = null"></div>
    <aside class="drawer" v-if="selectedGame">
      <header>
        <div>
          <h3>{{ selectedGame.zhName || selectedGame.enName }}</h3>
          <p>{{ selectedGame.ach?.done ?? '—' }} / {{ selectedGame.ach?.total ?? '—' }} · {{ selectedGame.ach?.percent ?? '—' }}%</p>
        </div>
        <button class="ghost" @click="selectedGame = null">关闭</button>
      </header>
      <nav class="segmented">
        <button :class="{ active: drawerTab === 'overview' }" @click="drawerTab = 'overview'">概览</button>
        <button :class="{ active: drawerTab === 'ach' }" @click="drawerTab = 'ach'">成就</button>
      </nav>
      <div class="drawer-content" v-if="drawerTab === 'overview'">
        <section class="panel">
          <h4>你的管理</h4>
          <label>状态
            <select v-model="selectedGame.state">
              <option>想玩</option><option>在玩</option><option>已通关</option><option>搁置</option><option>已弃坑</option>
            </select>
          </label>
          <label>标签
            <input v-model="tagDraft" placeholder="输入标签后回车" @keydown.enter.prevent="addTag" />
          </label>
          <div class="chips"><span class="chip" v-for="tag in selectedGame.tags" :key="tag">{{ tag }}</span></div>
          <label>备注
            <textarea v-model="selectedGame.note" placeholder="例如：进度、计划、易错点、刷成就思路…"></textarea>
          </label>
        </section>
      </div>
      <div class="drawer-content" v-else>
        <section class="panel">
          <h4>成就</h4>
          <div class="search-wrap"><input placeholder="搜索成就" /></div>
          <p v-if="!selectedGame.ach">成就尚未同步。点击“刷新成就”以获取该游戏的成就列表与解锁状态。</p>
          <ul v-else>
            <li v-for="n in 8" :key="n">未解锁成就 {{ n }}</li>
          </ul>
        </section>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const currentPage = ref('library')
const query = ref('')
const syncing = ref(false)
const showEnglish = ref(true)
const theme = ref('system')
const drawerTab = ref('overview')
const selectedGame = ref(null)
const tagDraft = ref('')

const navItems = [
  { key: 'library', label: '游戏库', icon: '📚' },
  { key: 'wishlist', label: '我的清单', icon: '⭐' },
  { key: 'sync', label: '同步中心', icon: '🔄' },
  { key: 'settings', label: '设置', icon: '⚙️' }
]

const games = ref([
  { id: 1, zhName: '空洞骑士', enName: 'Hollow Knight', playtime: 41, lastPlayed: '2026-05-12', state: '在玩', tags: ['高难度', '银河恶魔城'], note: '', ach: { done: 34, total: 63, percent: 54 } },
  { id: 2, zhName: '哈迪斯', enName: 'Hades', playtime: 19, lastPlayed: '2026-05-10', state: '想玩', tags: ['肉鸽', '动作'], note: '', ach: null },
  { id: 3, zhName: '', enName: 'Portal 2', playtime: 12, lastPlayed: '2026-05-01', state: '搁置', tags: ['解谜', '剧情', '合作', '经典'], note: '补双人', ach: { done: 20, total: 51, percent: 39 } }
])

const syncTasks = ref([
  { name: '哈迪斯', stage: '下载图标', progress: 35 },
  { name: '空洞骑士', stage: '写入本地数据', progress: 92 }
])

const currentPageLabel = computed(() => navItems.find((i) => i.key === currentPage.value)?.label ?? '')
const filteredGames = computed(() => games.value.filter((g) => `${g.zhName} ${g.enName} ${g.tags.join(' ')} ${g.note}`.toLowerCase().includes(query.value.toLowerCase())))

const openDrawer = (game) => {
  selectedGame.value = game
  drawerTab.value = 'overview'
}

const addTag = () => {
  const next = tagDraft.value.trim()
  if (next && selectedGame.value && !selectedGame.value.tags.includes(next)) {
    selectedGame.value.tags.push(next)
  }
  tagDraft.value = ''
}
</script>
