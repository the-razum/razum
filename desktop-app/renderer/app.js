// ============================================================
// Razum AI Desktop — Frontend Logic
// ============================================================

let state = {
  messages: [],
  isStreaming: false,
  models: [],
  wallet: null,
  ollamaRunning: false,
  currentModel: 'mistral:7b'
}

const AVAILABLE_MODELS = [
  { id: 'mistral:7b', name: 'Mistral 7B', size: '4 GB', ram: '8 GB+', quality: 3, desc: 'Быстрая, лёгкая' },
  { id: 'llama3:8b', name: 'Llama 3 8B', size: '5 GB', ram: '8 GB+', quality: 3, desc: 'Универсальная' },
  { id: 'gemma2:9b', name: 'Gemma 2 9B', size: '6 GB', ram: '10 GB+', quality: 4, desc: 'Высокое качество' },
  { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B', size: '4 GB', ram: '8 GB+', quality: 4, desc: 'Рассуждения' },
  { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B', size: '4 GB', ram: '8 GB+', quality: 3, desc: 'Мультиязычная' },
  { id: 'llama3:70b', name: 'Llama 3 70B', size: '40 GB', ram: '48 GB+', quality: 5, desc: 'Максимальное качество' },
  { id: 'qwen2.5:72b', name: 'Qwen 2.5 72B', size: '40 GB', ram: '48 GB+', quality: 5, desc: 'Близка к GPT-4' },
]

// ============================================================
// Навигация
// ============================================================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  document.getElementById(`page-${page}`).classList.add('active')
  document.querySelector(`[data-page="${page}"]`).classList.add('active')

  if (page === 'models') loadModels()
  if (page === 'wallet') loadWallet()
  if (page === 'mining') loadMining()
  if (page === 'settings') loadSettings()
}

// ============================================================
// Инициализация
// ============================================================
async function init() {
  const status = await window.razum.getStatus()

  state.ollamaRunning = status.ollama.running
  state.models = status.ollama.models
  state.wallet = status.config.wallet

  updateStatusBar()

  if (!status.ollama.running) {
    updateStatusBar('Запускаю Ollama...', 'yellow')
    await window.razum.startOllama()
    const s2 = await window.razum.getStatus()
    state.ollamaRunning = s2.ollama.running
    state.models = s2.ollama.models
    updateStatusBar()
  }

  if (state.models.length > 0) {
    state.currentModel = state.models[0].name
  }
}

function updateStatusBar(text, color) {
  const dot = document.getElementById('statusDot')
  const txt = document.getElementById('statusText')

  if (text) {
    txt.textContent = text
    dot.className = `status-dot ${color || 'yellow'}`
    return
  }

  if (state.ollamaRunning) {
    dot.className = 'status-dot green'
    txt.textContent = `Нода активна · ${state.models.length} модел.`
  } else {
    dot.className = 'status-dot red'
    txt.textContent = 'Ollama не запущена'
  }
}

// ============================================================
// Чат
// ============================================================
async function sendMessage() {
  const input = document.getElementById('chatInput')
  const text = input.value.trim()
  if (!text || state.isStreaming) return

  state.messages.push({ role: 'user', content: text })
  input.value = ''
  state.isStreaming = true
  renderMessages()

  // Добавляем пустое сообщение AI
  state.messages.push({ role: 'assistant', content: '' })
  renderMessages()

  try {
    // Стриминг
    let aiContent = ''
    window.razum.onChatToken((chunk) => {
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.replace('data: ', '')
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const token = json.choices?.[0]?.delta?.content || ''
          aiContent += token
          state.messages[state.messages.length - 1].content = aiContent
          renderMessages()
        } catch (e) {}
      }
    })

    window.razum.onChatDone(() => {
      state.isStreaming = false
      renderMessages()
    })

    const result = await window.razum.chatStream({
      messages: state.messages.slice(0, -1),
      model: state.currentModel
    })

    if (result?.error) {
      state.messages[state.messages.length - 1].content = 'Ошибка: ' + result.error
      state.isStreaming = false
      renderMessages()
    }
  } catch (e) {
    state.messages[state.messages.length - 1].content = 'Ошибка соединения с Ollama'
    state.isStreaming = false
    renderMessages()
  }
}

function renderMessages() {
  const container = document.getElementById('chatMessages')

  if (state.messages.length === 0) {
    container.innerHTML = `
      <div class="chat-empty">
        <div class="logo">R</div>
        <p style="font-size:16px;margin-bottom:4px">Напишите что-нибудь</p>
        <p style="font-size:13px">Razum AI ответит, используя ${state.currentModel}</p>
      </div>`
    return
  }

  container.innerHTML = state.messages.map((msg, i) => {
    if (msg.role === 'user') {
      return `<div class="msg msg-user"><div class="bubble">${escapeHtml(msg.content)}</div></div>`
    } else {
      const content = msg.content || (state.isStreaming && i === state.messages.length - 1 ? '...' : '')
      return `<div class="msg msg-ai">
        <div class="avatar">R</div>
        <div class="content">${escapeHtml(content)}</div>
      </div>`
    }
  }).join('')

  container.scrollTop = container.scrollHeight
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}

// Enter для отправки
document.getElementById('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
})

// ============================================================
// Модели
// ============================================================
async function loadModels() {
  const models = await window.razum.getModels()
  state.models = models

  const installed = document.getElementById('installedModels')
  if (models.length === 0) {
    installed.innerHTML = '<p style="color:var(--text2);font-size:13px">Нет установленных моделей</p>'
  } else {
    installed.innerHTML = models.map(m => {
      const sizeGB = (m.size / 1e9).toFixed(1)
      return `<div class="model-card">
        <div class="name">${m.name}</div>
        <div class="meta">${sizeGB} GB · ${m.details?.parameter_size || ''} · ${m.details?.quantization_level || ''}</div>
        <div class="actions">
          <button class="btn btn-sm btn-accent" onclick="selectModel('${m.name}')">Использовать</button>
          <button class="btn btn-sm btn-red" onclick="removeModel('${m.name}')">Удалить</button>
        </div>
      </div>`
    }).join('')
  }

  const installedNames = models.map(m => m.name)
  const available = AVAILABLE_MODELS.filter(m => !installedNames.includes(m.id))
  document.getElementById('availableModels').innerHTML = available.map(m => {
    const stars = '★'.repeat(m.quality) + '☆'.repeat(5 - m.quality)
    return `<div class="model-card">
      <div class="name">${m.name}</div>
      <div class="meta">${m.size} · RAM ${m.ram} · ${stars}</div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:8px">${m.desc}</div>
      <button class="btn btn-sm btn-accent" onclick="pullModel('${m.id}')">Скачать</button>
    </div>`
  }).join('')
}

async function pullModel(name) {
  updateStatusBar(`Скачиваю ${name}...`, 'yellow')
  try {
    await window.razum.pullModel(name)
    updateStatusBar()
    loadModels()
  } catch (e) {
    updateStatusBar('Ошибка скачивания', 'red')
  }
}

async function removeModel(name) {
  if (!confirm(`Удалить модель ${name}?`)) return
  try {
    await window.razum.removeModel(name)
    loadModels()
    const s = await window.razum.getStatus()
    state.models = s.ollama.models
    updateStatusBar()
  } catch (e) {}
}

function selectModel(name) {
  state.currentModel = name
  showPage('chat')
  document.getElementById('chatModelInfo').textContent = `Razum AI ответит, используя ${name}`
}

// ============================================================
// Кошелёк
// ============================================================
async function loadWallet() {
  const wallet = await window.razum.getWallet()
  state.wallet = wallet

  const el = document.getElementById('walletContent')
  if (!wallet) {
    el.innerHTML = `
      <div style="text-align:center;padding:60px 0">
        <div style="font-size:48px;opacity:0.15;margin-bottom:16px">💎</div>
        <h3 style="margin-bottom:8px">Кошелёк не создан</h3>
        <p style="color:var(--text2);font-size:14px;margin-bottom:20px">Создайте кошелёк для получения токенов RZM за майнинг</p>
        <button class="btn btn-accent" onclick="createWallet()">Создать кошелёк</button>
      </div>`
  } else {
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Баланс</div>
          <div class="stat-value green">0.00 RZM</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Стейк</div>
          <div class="stat-value">0.00 RZM</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Заработок</div>
          <div class="stat-value">0.00 RZM</div>
        </div>
      </div>
      <div class="card">
        <h3>Адрес кошелька</h3>
        <div style="font-family:monospace;font-size:13px;background:var(--bg);padding:10px;border-radius:6px;word-break:break-all;margin-top:8px">${wallet.address}</div>
        <div style="font-size:12px;color:var(--text2);margin-top:8px">Сеть: ${wallet.network} · Создан: ${new Date(wallet.created).toLocaleDateString('ru')}</div>
      </div>
      <p style="color:var(--yellow);font-size:13px">⚠ Тестнет — токены скоро будут доступны</p>`
  }
}

async function createWallet() {
  const wallet = await window.razum.createWallet()
  state.wallet = wallet
  loadWallet()
}

// ============================================================
// Майнинг
// ============================================================
async function loadMining() {
  const status = await window.razum.getStatus()
  const el = document.getElementById('miningContent')

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Статус</div>
        <div class="stat-value" style="font-size:16px"><span class="status-dot ${status.ollama.running ? 'green' : 'red'}"></span>${status.ollama.running ? 'Нода активна' : 'Нода выключена'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Железо</div>
        <div class="stat-value" style="font-size:14px">${status.system.cpus}<br>${status.system.ram} GB RAM</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Модели</div>
        <div class="stat-value" style="font-size:14px">${status.ollama.models.map(m => m.name).join(', ') || 'Нет'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Обработано запросов</div>
        <div class="stat-value green">0</div>
      </div>
    </div>

    <div class="card">
      <h3>Управление нодой</h3>
      <div style="display:flex;gap:12px;margin-top:12px">
        <button class="btn btn-accent" onclick="runBenchmark()">Запустить бенчмарк</button>
        <button class="btn" onclick="registerAsProvider()">Стать провайдером</button>
      </div>
      <div id="benchResult" style="margin-top:16px"></div>
    </div>

    <div class="card">
      <h3>Как работает майнинг</h3>
      <div style="font-size:13px;color:var(--text2);line-height:1.6;margin-top:8px">
        1. Ваш компьютер обрабатывает AI-запросы пользователей сети Razum<br>
        2. Блокчейн проверяет качество ответов (Proof-of-Useful-Compute)<br>
        3. За каждый обработанный запрос вы получаете токены RZM<br>
        4. Чем мощнее GPU и больше моделей — тем больше заработок
      </div>
    </div>`
}

async function runBenchmark() {
  const el = document.getElementById('benchResult')
  el.innerHTML = '<span style="color:var(--text2)">Тестирую inference...</span>'

  const result = await window.razum.benchmark()
  if (result.error) {
    el.innerHTML = `<span style="color:var(--red)">Ошибка: ${result.error}</span>`
  } else {
    el.innerHTML = `
      <div style="font-size:13px">
        ✓ Ответ за <strong>${result.elapsed}ms</strong> ·
        ${result.tokens} токенов ·
        <strong style="color:var(--accent)">${result.tps} tok/s</strong>
      </div>`
  }
}

async function registerAsProvider() {
  const provider = await window.razum.registerProvider()
  alert(`Провайдер зарегистрирован!\nGPU: ${provider.gpu}\nRAM: ${provider.ram} GB`)
}

// ============================================================
// Настройки
// ============================================================
function loadSettings() {
  const el = document.getElementById('settingsContent')
  el.innerHTML = `
    <div class="card">
      <h3>О приложении</h3>
      <div class="label">Версия</div>
      <div class="value">Razum AI Desktop v0.1.0</div>
      <div class="label">Сеть</div>
      <div class="value">razum-testnet-1</div>
      <div class="label">GitHub</div>
      <div class="value"><a href="#" style="color:var(--accent)" onclick="require('electron').shell.openExternal('https://github.com/the-razum')">github.com/the-razum</a></div>
    </div>
    <div class="card">
      <h3>Расположение данных</h3>
      <div style="font-family:monospace;font-size:12px;color:var(--text2)">~/.razum/</div>
    </div>
    <div class="card">
      <h3>Новый чат</h3>
      <button class="btn" onclick="state.messages=[];renderMessages();showPage('chat')">Очистить историю чата</button>
    </div>`
}

// ============================================================
// Запуск
// ============================================================
init()
