const { app, BrowserWindow, ipcMain, Tray, Menu, shell, dialog } = require('electron')
const path = require('path')
const { exec, spawn } = require('child_process')
const fs = require('fs')
const os = require('os')

// ============================================================
// Конфигурация
// ============================================================
const RAZUM_DIR = path.join(os.homedir(), '.razum')
const CONFIG_FILE = path.join(RAZUM_DIR, 'config.json')
const OLLAMA_API = 'http://localhost:11434'

let mainWindow = null
let tray = null
let ollamaProcess = null

// ============================================================
// Хранение настроек
// ============================================================
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    }
  } catch (e) {}
  return {
    firstRun: true,
    wallet: null,
    provider: null,
    selectedModel: 'mistral:7b',
    miningEnabled: false
  }
}

function saveConfig(config) {
  fs.mkdirSync(RAZUM_DIR, { recursive: true })
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// ============================================================
// Ollama управление
// ============================================================
async function checkOllama() {
  try {
    const response = await fetch(`${OLLAMA_API}/api/tags`)
    const data = await response.json()
    return { running: true, models: data.models || [] }
  } catch (e) {
    return { running: false, models: [] }
  }
}

async function startOllama() {
  const status = await checkOllama()
  if (status.running) return true

  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      // macOS — попробовать открыть приложение
      exec('open /Applications/Ollama.app', (err) => {
        if (err) {
          // Попробовать serve
          ollamaProcess = spawn('ollama', ['serve'], {
            detached: true,
            stdio: 'ignore'
          })
          ollamaProcess.unref()
        }
        // Подождать запуска
        setTimeout(async () => {
          const s = await checkOllama()
          resolve(s.running)
        }, 3000)
      })
    } else {
      // Linux/Windows
      ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
      })
      ollamaProcess.unref()
      setTimeout(async () => {
        const s = await checkOllama()
        resolve(s.running)
      }, 3000)
    }
  })
}

async function installOllama() {
  return new Promise((resolve, reject) => {
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const child = exec('curl -fsSL https://ollama.com/install.sh | sh', (err) => {
        if (err) reject(err)
        else resolve(true)
      })
      child.stdout?.on('data', (data) => {
        mainWindow?.webContents.send('install-progress', data.toString())
      })
    } else {
      // Windows — открыть страницу загрузки
      shell.openExternal('https://ollama.com/download')
      resolve(false)
    }
  })
}

// ============================================================
// API для рендерера
// ============================================================

// Статус системы
ipcMain.handle('get-status', async () => {
  const ollama = await checkOllama()
  const config = loadConfig()
  const sysInfo = {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus()[0]?.model || 'unknown',
    ram: Math.round(os.totalmem() / 1073741824)
  }
  return { ollama, config, system: sysInfo }
})

// Запустить Ollama
ipcMain.handle('start-ollama', async () => {
  return await startOllama()
})

// Установить Ollama
ipcMain.handle('install-ollama', async () => {
  return await installOllama()
})

// Список моделей
ipcMain.handle('get-models', async () => {
  try {
    const res = await fetch(`${OLLAMA_API}/api/tags`)
    const data = await res.json()
    return data.models || []
  } catch (e) {
    return []
  }
})

// Скачать модель
ipcMain.handle('pull-model', async (event, modelName) => {
  return new Promise((resolve, reject) => {
    const child = exec(`ollama pull ${modelName}`, (err) => {
      if (err) reject(err.message)
      else resolve(true)
    })
    child.stdout?.on('data', (data) => {
      mainWindow?.webContents.send('pull-progress', { model: modelName, data: data.toString() })
    })
    child.stderr?.on('data', (data) => {
      mainWindow?.webContents.send('pull-progress', { model: modelName, data: data.toString() })
    })
  })
})

// Удалить модель
ipcMain.handle('remove-model', async (event, modelName) => {
  return new Promise((resolve, reject) => {
    exec(`ollama rm ${modelName}`, (err) => {
      if (err) reject(err.message)
      else resolve(true)
    })
  })
})

// Чат с моделью
ipcMain.handle('chat', async (event, { messages, model }) => {
  try {
    const res = await fetch(`${OLLAMA_API}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'mistral:7b',
        messages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.7
      })
    })
    const data = await res.json()
    return data
  } catch (e) {
    return { error: e.message }
  }
})

// Стриминг чата
ipcMain.handle('chat-stream', async (event, { messages, model }) => {
  try {
    const res = await fetch(`${OLLAMA_API}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'mistral:7b',
        messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7
      })
    })

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value)
      mainWindow?.webContents.send('chat-token', chunk)
    }
    mainWindow?.webContents.send('chat-done')
    return true
  } catch (e) {
    return { error: e.message }
  }
})

// Кошелёк
ipcMain.handle('create-wallet', async () => {
  const config = loadConfig()
  if (config.wallet) return config.wallet

  const address = 'razum1' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
  const wallet = {
    address,
    created: new Date().toISOString(),
    network: 'razum-testnet-1',
    balance: 0
  }
  config.wallet = wallet
  config.firstRun = false
  saveConfig(config)
  return wallet
})

ipcMain.handle('get-wallet', async () => {
  const config = loadConfig()
  return config.wallet
})

// Провайдер
ipcMain.handle('register-provider', async () => {
  const config = loadConfig()
  const ollama = await checkOllama()
  const models = ollama.models.map(m => m.name).join(', ')

  const provider = {
    gpu: os.cpus()[0]?.model || 'unknown',
    ram: Math.round(os.totalmem() / 1073741824),
    models,
    registered: new Date().toISOString(),
    status: 'active'
  }
  config.provider = provider
  saveConfig(config)
  return provider
})

// Бенчмарк
ipcMain.handle('benchmark', async () => {
  const start = Date.now()
  try {
    const res = await fetch(`${OLLAMA_API}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral:7b',
        messages: [{ role: 'user', content: 'Write a haiku about AI' }],
        stream: false,
        max_tokens: 50
      })
    })
    const data = await res.json()
    const elapsed = Date.now() - start
    const tokens = data.usage?.total_tokens || 0
    return {
      elapsed,
      tokens,
      tps: tokens > 0 ? Math.round(tokens * 1000 / elapsed) : 0
    }
  } catch (e) {
    return { error: e.message }
  }
})

// Сохранить настройки
ipcMain.handle('save-config', async (event, updates) => {
  const config = loadConfig()
  Object.assign(config, updates)
  saveConfig(config)
  return config
})

// ============================================================
// Окно приложения
// ============================================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#06080d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.loadFile('renderer/index.html')

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ============================================================
// Трей (менюбар)
// ============================================================
function createTray() {
  // В проде здесь будет иконка
  tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'))

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Razum AI', enabled: false },
    { type: 'separator' },
    { label: 'Открыть', click: () => { mainWindow ? mainWindow.show() : createWindow() } },
    { label: 'Статус ноды', click: () => { mainWindow?.webContents.send('navigate', 'status') } },
    { type: 'separator' },
    { label: 'Выход', click: () => { app.quit() } }
  ])

  tray.setToolTip('Razum AI — Нода работает')
  tray.setContextMenu(contextMenu)
}

// ============================================================
// App lifecycle
// ============================================================
app.whenReady().then(async () => {
  createWindow()
  // createTray() // Раскомментировать когда будет иконка

  // Автозапуск Ollama
  await startOllama()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

app.on('before-quit', () => {
  if (ollamaProcess) {
    ollamaProcess.kill()
  }
})
