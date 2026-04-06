const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('razum', {
  // Система
  getStatus: () => ipcRenderer.invoke('get-status'),
  startOllama: () => ipcRenderer.invoke('start-ollama'),
  installOllama: () => ipcRenderer.invoke('install-ollama'),

  // Модели
  getModels: () => ipcRenderer.invoke('get-models'),
  pullModel: (name) => ipcRenderer.invoke('pull-model', name),
  removeModel: (name) => ipcRenderer.invoke('remove-model', name),

  // Чат
  chat: (data) => ipcRenderer.invoke('chat', data),
  chatStream: (data) => ipcRenderer.invoke('chat-stream', data),
  onChatToken: (cb) => ipcRenderer.on('chat-token', (_, data) => cb(data)),
  onChatDone: (cb) => ipcRenderer.on('chat-done', () => cb()),

  // Кошелёк
  createWallet: () => ipcRenderer.invoke('create-wallet'),
  getWallet: () => ipcRenderer.invoke('get-wallet'),

  // Провайдер
  registerProvider: () => ipcRenderer.invoke('register-provider'),

  // Бенчмарк
  benchmark: () => ipcRenderer.invoke('benchmark'),

  // Настройки
  saveConfig: (data) => ipcRenderer.invoke('save-config', data),

  // События
  onNavigate: (cb) => ipcRenderer.on('navigate', (_, page) => cb(page)),
  onInstallProgress: (cb) => ipcRenderer.on('install-progress', (_, data) => cb(data)),
  onPullProgress: (cb) => ipcRenderer.on('pull-progress', (_, data) => cb(data)),
})
