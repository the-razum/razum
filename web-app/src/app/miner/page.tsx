'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const EARNINGS_TABLE = [
  { device: 'MacBook Air M1 (8 ГБ)', type: 'apple', rzm: '25-40', usd: '$1-2' },
  { device: 'MacBook Pro M2/M3 (16 ГБ)', type: 'apple', rzm: '50-80', usd: '$2-4' },
  { device: 'Mac Mini M4 Pro (24 ГБ)', type: 'apple', rzm: '80-130', usd: '$4-7' },
  { device: 'Mac Studio M2 Ultra', type: 'apple', rzm: '170-250', usd: '$8-13' },
  { device: 'RTX 3060 (12 ГБ)', type: 'nvidia', rzm: '50-80', usd: '$2-4' },
  { device: 'RTX 4070 (12 ГБ)', type: 'nvidia', rzm: '130-200', usd: '$7-10' },
  { device: 'RTX 4090 (24 ГБ)', type: 'nvidia', rzm: '250-350', usd: '$12-18' },
]

export default function MinerPage() {
  const [stats, setStats] = useState({ totalMiners: 0, onlineMiners: 0, totalRewardsDistributed: 0 })
  const [copied, setCopied] = useState<string | null>(null)
  const [tab, setTab] = useState<'mac' | 'linux'>('mac')

  useEffect(() => {
    fetch('/api/network')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
  }, [])

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2500)
    })
  }

  const CopyBtn = ({ id, text, label }: { id: string; text: string; label?: string }) => (
    <button
      onClick={() => copyText(id, text)}
      className={`text-xs transition px-3 py-1.5 rounded-lg font-medium ${
        copied === id
          ? 'bg-accent/20 text-accent'
          : 'bg-surface2 text-text2 hover:text-accent hover:bg-accent/10'
      }`}
    >
      {copied === id ? 'Скопировано!' : (label || 'Копировать')}
    </button>
  )

  return (
    <div className="min-h-screen bg-bg">
      <nav className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Razum AI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/chat" className="text-sm text-text2 hover:text-text transition">Чат</Link>
            <Link href="/pricing" className="text-sm text-text2 hover:text-text transition">Тарифы</Link>
          </div>
        </div>
      </nav>

      {/* ===== Testnet banner ===== */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-400/10 to-transparent border-b border-emerald-400/20">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap gap-4 items-center text-sm">
          <span className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <strong>razum-testnet-1</strong> live
          </span>
          <Link href="/chain" className="text-emerald-300 hover:underline">статус чейна →</Link>
          <Link href="/раздача RZM" className="text-emerald-300 hover:underline">взять 100 RZM →</Link>
          <span className="text-text2 ml-auto hidden md:inline">RPC: airazum.com/chain-rpc/</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* ===== HERO ===== */}
        <div className="text-center mb-16">
          <div className="inline-block px-3 py-1 mb-4 text-xs font-medium rounded-full bg-accent/10 text-accent border border-accent/20">
            Ранняя стадия — максимальные награды
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Зарабатывайте на своём компьютере
          </h1>
          <p className="text-text2 text-lg max-w-2xl mx-auto mb-8">
            Есть MacBook, iMac или PC с видеокартой? Подключите его к сети Razum AI — ваш компьютер обрабатывает AI-запросы, а вы получаете токены RZM.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border">MacBook M1/M2/M3/M4</span>
            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border">iMac / Mac Mini / Mac Studio</span>
            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border">PC с NVIDIA GPU</span>
          </div>
        </div>

        {/* ===== EARLY STAGE ===== */}
        <div className="mb-16 p-8 rounded-2xl border border-accent/20 bg-accent/5">
          <h2 className="text-2xl font-bold mb-6 text-center">Почему сейчас лучшее время?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">x10</div>
              <div className="font-medium mb-1">Ранние награды</div>
              <div className="text-text2 text-sm">Первые майнеры получают в 10 раз больше токенов. Чем раньше — тем больше.</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">0 ₽</div>
              <div className="font-medium mb-1">Бесплатно</div>
              <div className="text-text2 text-sm">Не нужно ничего покупать. Используйте свой компьютер. Платите только за свет.</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">24/7</div>
              <div className="font-medium mb-1">Пассивный доход</div>
              <div className="text-text2 text-sm">Запустили и забыли. Можно пользоваться компьютером как обычно.</div>
            </div>
          </div>
        </div>

        {/* ===== HOW IT WORKS — simple ===== */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Как это работает?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-border bg-surface text-center">
              <div className="text-3xl mb-3">1</div>
              <div className="font-medium mb-1">Пользователь пишет</div>
              <div className="text-text2 text-sm">Кто-то задаёт вопрос AI на нашем сайте.</div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface text-center">
              <div className="text-3xl mb-3">2</div>
              <div className="font-medium mb-1">Ваш компьютер отвечает</div>
              <div className="text-text2 text-sm">Запрос приходит на ваш Mac или PC, AI-модель генерирует ответ.</div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface text-center">
              <div className="text-3xl mb-3">3</div>
              <div className="font-medium mb-1">Вы получаете RZM</div>
              <div className="text-text2 text-sm">За каждый обработанный запрос вам начисляются токены.</div>
            </div>
          </div>
        </div>

        {/* ===== REQUIREMENTS ===== */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Что нужно?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-accent/20 bg-accent/5">
              <div className="text-lg font-bold mb-3">Mac (с чипом Apple M1, M2, M3, M4)</div>
              <div className="text-text2 text-sm space-y-1.5">
                <div>Любой Mac с чипом M1 и новее:</div>
                <div>MacBook Air, MacBook Pro, iMac, Mac Mini, Mac Studio, Mac Pro</div>
                <div className="text-accent font-medium pt-1">8 ГБ памяти — уже достаточно!</div>
              </div>
            </div>
            <div className="p-5 rounded-xl border border-border bg-surface">
              <div className="text-lg font-bold mb-3">ПК с видеокартой NVIDIA</div>
              <div className="text-text2 text-sm space-y-1.5">
                <div>Видеокарта RTX 3060 и выше</div>
                <div>Операционная система Linux (Ubuntu)</div>
                <div>16 ГБ оперативной памяти</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== STEP BY STEP — TABS ===== */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Пошаговая инструкция</h2>
          <p className="text-text2 mb-6">Справится любой. Даже если вы никогда не открывали терминал.</p>

          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setTab('mac')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === 'mac' ? 'bg-accent text-bg' : 'bg-surface border border-border text-text2 hover:text-text'
              }`}
            >
              У меня Mac
            </button>
            <button
              onClick={() => setTab('linux')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === 'linux' ? 'bg-accent text-bg' : 'bg-surface border border-border text-text2 hover:text-text'
              }`}
            >
              У меня PC с NVIDIA
            </button>
          </div>

          {tab === 'mac' ? (
            <div className="space-y-8">

              {/* ===== MAC STEP 1 ===== */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center font-bold">1</span>
                  <div>
                    <div className="text-lg font-bold">Скачайте программу Ollama</div>
                    <div className="text-text2 text-sm">Это бесплатная программа для запуска AI. Как обычное приложение.</div>
                  </div>
                </div>

                <div className="space-y-4 pl-[52px]">
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">a.</span>
                    <div>
                      <div className="text-sm mb-2">Нажмите на кнопку ниже — откроется сайт загрузки:</div>
                      <a
                        href="https://ollama.com/download/mac"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-5 py-2.5 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent/90 transition"
                      >
                        Скачать Ollama для Mac
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">b.</span>
                    <div className="text-sm text-text2">
                      Скачается файл <span className="text-text font-medium">Ollama-darwin.zip</span>. Откройте его (двойной клик).
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">c.</span>
                    <div className="text-sm text-text2">
                      Появится иконка Ollama. Перетащите её в папку <span className="text-text font-medium">Программы (Applications)</span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">d.</span>
                    <div className="text-sm text-text2">
                      Откройте Ollama из папки Программы. Если спросит разрешение — нажмите <span className="text-text font-medium">«Открыть»</span>. В строке меню (вверху экрана) появится иконка ламы — значит работает!
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== MAC STEP 2 ===== */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center font-bold">2</span>
                  <div>
                    <div className="text-lg font-bold">Скачайте AI-модель</div>
                    <div className="text-text2 text-sm">Одна команда — подождать 5 минут, пока скачается.</div>
                  </div>
                </div>

                <div className="space-y-4 pl-[52px]">
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">a.</span>
                    <div className="text-sm">
                      <span className="text-text2">Откройте </span>
                      <span className="text-text font-medium">Терминал</span>
                      <span className="text-text2">. Как найти: нажмите </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface2 rounded text-xs font-mono">Cmd + Пробел</span>
                      <span className="text-text2">, напечатайте </span>
                      <span className="text-text font-medium">Terminal</span>
                      <span className="text-text2"> и нажмите Enter.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">b.</span>
                    <div className="text-sm text-text2 w-full">
                      <div className="mb-2">Скопируйте эту команду и вставьте в Терминал (Cmd+V), потом нажмите Enter:</div>
                      <div className="flex items-center gap-2 bg-bg rounded-lg px-4 py-3 font-mono text-text border border-border">
                        <span className="flex-1 overflow-x-auto">ollama pull qwen3.5:9b</span>
                        <CopyBtn id="mac-model" text="ollama pull qwen3.5:9b" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">c.</span>
                    <div className="text-sm text-text2">
                      Подождите пока скачается (~9 ГБ, 3-10 минут). Когда увидите <span className="text-text font-medium">success</span> — готово!
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-bg border border-border text-xs text-text2">
                    <span className="text-accent font-medium">Мало памяти (8 ГБ)?</span> Используйте модель поменьше: <code className="bg-surface2 px-1 rounded">ollama pull qwen3.5:9b</code>
                  </div>
                </div>
              </div>

              {/* ===== MAC STEP 3 ===== */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center font-bold">3</span>
                  <div>
                    <div className="text-lg font-bold">Запустите майнер</div>
                    <div className="text-text2 text-sm">Ещё одна команда — и всё готово.</div>
                  </div>
                </div>

                <div className="space-y-4 pl-[52px]">
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">a.</span>
                    <div className="text-sm text-text2 w-full">
                      <div className="mb-2">В том же Терминале вставьте эту команду и нажмите Enter:</div>
                      <div className="bg-bg rounded-lg px-4 py-3 font-mono text-sm text-text border border-border">
                        <div className="flex items-start justify-between gap-2">
                          <pre className="flex-1 overflow-x-auto whitespace-pre leading-relaxed">{`curl -fsSL https://airazum.com/install.sh | bash`}</pre>
                          <CopyBtn id="mac-run" text="curl -fsSL https://airazum.com/install.sh | bash" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">b.</span>
                    <div className="text-sm text-text2">
                      Скрипт задаст пару вопросов (имя ноды, кошелёк). Если не знаете — просто нажимайте Enter, всё можно настроить потом.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">c.</span>
                    <div className="text-sm text-text2">
                      Увидите надпись <span className="text-accent font-medium">Razum Miner started!</span> — поздравляем, вы майните! Токены уже начисляются.
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== MAC DONE ===== */}
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
                <div className="text-2xl mb-2">Готово!</div>
                <div className="text-text2 text-sm mb-4">Можете закрыть Терминал — майнер работает в фоне. Компьютером можно пользоваться как обычно.</div>
                <div className="text-text2 text-xs">Чтобы остановить майнер, откройте Терминал и напишите: <code className="bg-bg px-1.5 py-0.5 rounded font-mono">razum-miner stop</code></div>
              </div>

              {/* ===== MetaMask guide ===== */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="text-lg font-bold mb-3">Как создать кошелёк для получения токенов?</div>
                <div className="text-text2 text-sm mb-4">Кошелёк не обязателен прямо сейчас — токены будут копиться. Но лучше настроить сразу:</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold">1.</span>
                    <div className="text-text2">Откройте <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-accent underline">metamask.io</a> и нажмите <span className="text-text font-medium">«Download»</span>.</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold">2.</span>
                    <div className="text-text2">Установите расширение для браузера (Chrome, Firefox, Safari).</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold">3.</span>
                    <div className="text-text2">Нажмите <span className="text-text font-medium">«Create a new wallet»</span>, придумайте пароль.</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold">4.</span>
                    <div className="text-text2"><span className="text-orange-400 font-medium">Запишите 12 секретных слов на бумагу!</span> Это единственный способ восстановить кошелёк.</div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold">5.</span>
                    <div className="text-text2">Скопируйте адрес кошелька (начинается на <code className="bg-surface2 px-1 rounded">0x...</code>) — это ваш адрес для RZM.</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">

              {/* ===== LINUX STEP 1 ===== */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center font-bold">1</span>
                  <div>
                    <div className="text-lg font-bold">Установите Docker</div>
                    <div className="text-text2 text-sm">Docker — это программа для запуска контейнеров. Одна команда.</div>
                  </div>
                </div>

                <div className="space-y-4 pl-[52px]">
                  <div className="flex items-start gap-3">
                    <span className="text-accent font-bold mt-0.5">a.</span>
                    <div className="text-sm text-text2">Откройте терминал и выполните:</div>
                  </div>
                  <div className="bg-bg rounded-lg px-4 py-3 font-mono text-sm text-text border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <pre className="flex-1 overflow-x-auto whitespace-pre leading-relaxed">{`curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER`}</pre>
                      <CopyBtn id="linux-docker" text={`curl -fsSL https://get.docker.com | sh\nsudo usermod -aG docker $USER`} />
                    </div>
                  </div>
                  <div className="text-xs text-text2">После установки выполните <code className="bg-surface2 px-1 rounded">newgrp docker</code> или перезайдите в терминал.</div>
                </div>
              </div>

              {/* ===== LINUX STEP 2 ===== */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center font-bold">2</span>
                  <div>
                    <div className="text-lg font-bold">Установите NVIDIA Container Toolkit</div>
                    <div className="text-text2 text-sm">Нужно чтобы Docker видел видеокарту.</div>
                  </div>
                </div>

                <div className="space-y-4 pl-[52px]">
                  <div className="bg-bg rounded-lg px-4 py-3 font-mono text-sm text-text border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <pre className="flex-1 overflow-x-auto whitespace-pre leading-relaxed">{`curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \\
  | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-ct.gpg

echo "deb [signed-by=/usr/share/keyrings/nvidia-ct.gpg] \\
  https://nvidia.github.io/libnvidia-container/stable/deb/amd64 /" \\
  | sudo tee /etc/apt/sources.list.d/nvidia-ct.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker`}</pre>
                      <CopyBtn id="linux-nvidia" text={`curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-ct.gpg\necho "deb [signed-by=/usr/share/keyrings/nvidia-ct.gpg] https://nvidia.github.io/libnvidia-container/stable/deb/amd64 /" | sudo tee /etc/apt/sources.list.d/nvidia-ct.list\nsudo apt-get update\nsudo apt-get install -y nvidia-container-toolkit\nsudo nvidia-ctk runtime configure --runtime=docker\nsudo systemctl restart docker`} />
                    </div>
                  </div>
                  <div className="text-xs text-text2">Проверьте что видеокарта видна: <code className="bg-surface2 px-1 rounded">docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi</code></div>
                </div>
              </div>

              {/* ===== LINUX STEP 3 ===== */}
              <div className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-full bg-accent text-bg flex items-center justify-center font-bold">3</span>
                  <div>
                    <div className="text-lg font-bold">Запустите майнер</div>
                    <div className="text-text2 text-sm">Одна команда — автоустановщик сделает всё сам.</div>
                  </div>
                </div>

                <div className="space-y-4 pl-[52px]">
                  <div className="text-sm text-text2 mb-2">Скрипт скачает Ollama + модель + настроит и запустит майнер:</div>
                  <div className="bg-bg rounded-lg px-4 py-3 font-mono text-sm text-text border border-border">
                    <div className="flex items-start justify-between gap-2">
                      <pre className="flex-1 overflow-x-auto whitespace-pre leading-relaxed">{`curl -fsSL https://airazum.com/docker-install.sh | bash`}</pre>
                      <CopyBtn id="linux-run" text="curl -fsSL https://airazum.com/docker-install.sh | bash" />
                    </div>
                  </div>
                  <div className="text-xs text-text2">Скрипт задаст 3 вопроса: кошелёк, модель, имя ноды. Автоматически определит GPU и настроит docker-compose.</div>
                </div>
              </div>

              {/* ===== LINUX DONE ===== */}
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
                <div className="text-2xl mb-2">Готово!</div>
                <div className="text-text2 text-sm mb-4">Майнер + Ollama работают в Docker. Полезные команды:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto text-left">
                  <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 font-mono text-xs border border-border">
                    <span className="flex-1">docker compose logs -f miner</span>
                    <CopyBtn id="linux-logs" text="cd ~/razum-miner && docker compose logs -f miner" />
                  </div>
                  <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 font-mono text-xs border border-border">
                    <span className="flex-1">docker compose ps</span>
                    <CopyBtn id="linux-ps" text="cd ~/razum-miner && docker compose ps" />
                  </div>
                  <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 font-mono text-xs border border-border">
                    <span className="flex-1">docker compose down</span>
                    <CopyBtn id="linux-stop" text="cd ~/razum-miner && docker compose down" />
                  </div>
                  <div className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 font-mono text-xs border border-border">
                    <span className="flex-1">docker compose up -d</span>
                    <CopyBtn id="linux-start" text="cd ~/razum-miner && docker compose up -d" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== MODEL GUIDE ===== */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Какую модель выбрать?</h2>
          <p className="text-text2 text-sm mb-6">Зависит от памяти вашего устройства. Посмотрите свою память и выберите модель из таблицы.</p>

          {/* How to check */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="font-medium text-sm mb-2">Как узнать память на Mac?</div>
              <div className="text-text2 text-xs space-y-1">
                <div>1. Нажмите на яблочко в левом верхнем углу экрана</div>
                <div>2. Выберите <span className="text-text font-medium">«Об этом Mac»</span></div>
                <div>3. Посмотрите строку <span className="text-text font-medium">«Память»</span> — там будет 8, 16, 24 или больше ГБ</div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface">
              <div className="font-medium text-sm mb-2">Как узнать видеопамять на PC?</div>
              <div className="text-text2 text-xs space-y-1">
                <div>1. Откройте терминал</div>
                <div>2. Введите <code className="bg-surface2 px-1 rounded">nvidia-smi</code></div>
                <div>3. В таблице найдите столбец <span className="text-text font-medium">Memory</span> — это ваша VRAM</div>
              </div>
            </div>
          </div>

          {/* Model table */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text2">
                  <th className="px-5 py-3 text-left font-medium">Ваша память</th>
                  <th className="px-5 py-3 text-left font-medium">Команда для скачивания</th>
                  <th className="px-5 py-3 text-left font-medium">Размер</th>
                  <th className="px-5 py-3 text-left font-medium">Качество</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-surface2/50 transition">
                  <td className="px-5 py-3 font-medium">8 ГБ</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-bg px-2 py-0.5 rounded text-xs font-mono">ollama pull qwen3.5:9b</code>
                      <CopyBtn id="m-7b" text="ollama pull qwen3.5:9b" />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text2">4.1 ГБ</td>
                  <td className="px-5 py-3"><span className="text-yellow-400">Хорошо</span></td>
                </tr>
                <tr className="hover:bg-surface2/50 transition bg-accent/5">
                  <td className="px-5 py-3 font-medium">16 ГБ <span className="text-accent text-xs ml-1">рекомендуем</span></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-bg px-2 py-0.5 rounded text-xs font-mono">ollama pull qwen3.5:9b</code>
                      <CopyBtn id="m-14b" text="ollama pull qwen3.5:9b" />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text2">9 ГБ</td>
                  <td className="px-5 py-3"><span className="text-accent">Отлично</span></td>
                </tr>
                <tr className="hover:bg-surface2/50 transition">
                  <td className="px-5 py-3 font-medium">24 ГБ</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-bg px-2 py-0.5 rounded text-xs font-mono">ollama pull qwen3.5:9b</code>
                      <CopyBtn id="m-32b" text="ollama pull qwen3.5:9b" />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text2">19 ГБ</td>
                  <td className="px-5 py-3"><span className="text-accent">Отлично+</span></td>
                </tr>
                <tr className="hover:bg-surface2/50 transition">
                  <td className="px-5 py-3 font-medium">48+ ГБ</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <code className="bg-bg px-2 py-0.5 rounded text-xs font-mono">ollama pull qwen3.5:9b</code>
                      <CopyBtn id="m-70b" text="ollama pull qwen3.5:9b" />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text2">40 ГБ</td>
                  <td className="px-5 py-3"><span className="text-purple-400">Максимум</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-border bg-surface text-sm">
              <span className="text-accent font-medium">Сейчас сеть использует одну модель — qwen3.5:9b</span>
              <span className="text-text2">. Она универсальна, работает с русским и кодом. Размер ~5 ГБ, требуется около 8 ГБ свободной памяти.</span>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface text-sm">
              <span className="text-accent font-medium">Совет:</span>
              <span className="text-text2"> установите <code className="bg-surface2 px-1 rounded">ollama pull qwen3.5:9b</code> — это всё, что нужно для запуска майнинга.</span>
            </div>
          </div>
        </div>

        {/* ===== EARNINGS ===== */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-2">Сколько можно заработать?</h2>
          <p className="text-text2 text-sm mb-6">Оценка при работе 24/7. Сейчас ранняя стадия — награды увеличены x10.</p>
          <div className="rounded-xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text2">
                  <th className="px-5 py-3 text-left font-medium">Ваше устройство</th>
                  <th className="px-5 py-3 text-left font-medium">RZM / день</th>
                  <th className="px-5 py-3 text-left font-medium">~ USD / день</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {EARNINGS_TABLE.map(row => (
                  <tr key={row.device} className="hover:bg-surface2/50 transition">
                    <td className="px-5 py-3 font-medium">{row.device}</td>
                    <td className="px-5 py-3 text-accent font-medium">{row.rzm}</td>
                    <td className="px-5 py-3 text-text2">{row.usd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-text2 text-xs mt-3">
            * Оценочные данные. Зависит от загрузки сети и цены токена.
          </p>
        </div>

        {/* ===== ROADMAP ===== */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Что дальше с токеном RZM?</h2>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
              <div>
                <div className="font-medium">Сейчас — накапливайте</div>
                <div className="text-text2 text-sm">Токены начисляются за каждый обработанный запрос. Чем раньше начнёте — тем больше накопите.</div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-text2 mt-2 flex-shrink-0" />
              <div>
                <div className="font-medium">Через 1-2 месяца — вывод на кошелёк</div>
                <div className="text-text2 text-sm">Смарт-контракт RZM (ERC-20). Токены можно будет вывести на ваш MetaMask кошелёк.</div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-text2 mt-2 flex-shrink-0" />
              <div>
                <div className="font-medium">Далее — торговля</div>
                <div className="text-text2 text-sm">Листинг на DEX (Uniswap). Обмен RZM на ETH, USDT и другие криптовалюты.</div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-2 h-2 rounded-full bg-text2 mt-2 flex-shrink-0" />
              <div>
                <div className="font-medium">Стейкинг — ещё больше наград</div>
                <div className="text-text2 text-sm">Заморозьте часть RZM на время — получайте повышенные награды за обработку запросов.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== FAQ ===== */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Частые вопросы</h2>
          <div className="space-y-3">
            {[
              {
                q: 'Мой компьютер будет тормозить?',
                a: 'Нет. AI-модель работает только когда приходит запрос (обычно 5-30 секунд). В остальное время компьютер свободен. Если задачи нет — нагрузка нулевая.',
              },
              {
                q: 'Сколько электричества это тратит?',
                a: 'MacBook: ~30-60 Вт = примерно 50-100 ₽/мес. PC с видеокартой: 150-350 Вт = 250-600 ₽/мес. Доход от майнинга в разы выше.',
              },
              {
                q: 'Безопасно ли это для моего компьютера?',
                a: 'Абсолютно. Майнер только обрабатывает текстовые запросы. Он не имеет доступа к вашим файлам, фото, паролям или любым личным данным.',
              },
              {
                q: 'Мне нужен ETH-кошелёк прямо сейчас?',
                a: 'Нет, можно начать без кошелька. Токены будут копиться. Кошелёк (MetaMask) понадобится когда захотите вывести заработанное.',
              },
              {
                q: 'Можно ли майнить на нескольких компьютерах?',
                a: 'Да! Можно подключить сколько угодно устройств к одному кошельку. Больше устройств = больше заработок.',
              },
              {
                q: 'Что если мой Mac / PC выключится?',
                a: 'Ничего страшного. Майнер автоматически перезапустится при включении компьютера. Вы ничего не теряете — просто пропускаете задачи пока комп выключен.',
              },
              {
                q: 'Это легально?',
                a: 'Да. Вы предоставляете вычислительные ресурсы — это полностью законно. Как аренда мощности в облаке, только наоборот.',
              },
            ].map(item => (
              <details key={item.q} className="group rounded-xl border border-border bg-surface overflow-hidden">
                <summary className="px-5 py-4 cursor-pointer font-medium text-sm flex items-center justify-between hover:bg-surface2/50 transition list-none">
                  {item.q}
                  <svg className="w-4 h-4 text-text2 transform group-open:rotate-180 transition flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 text-text2 text-sm">{item.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* ===== CTA ===== */}
        <div className="text-center p-10 rounded-2xl border border-accent/20 bg-accent/5">
          <h2 className="text-2xl font-bold mb-3">Готовы начать?</h2>
          <p className="text-text2 mb-6 max-w-lg mx-auto">
            3 шага, 5 минут, и ваш компьютер начнёт зарабатывать. Первые майнеры получают максимальные награды.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg bg-accent text-bg font-medium hover:bg-accent/90 transition"
            >
              Шаг 1: Скачать Ollama
            </a>
            <a
              href="https://t.me/razum_miners"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-lg border border-border text-text font-medium hover:bg-surface2 transition"
            >
              Telegram для помощи
            </a>
          </div>
        </div>

        {/* ===== SUPPORT ===== */}
        <div className="mt-10 text-center text-text2 text-sm">
          Не получается? Не стесняйтесь — пишите в{' '}
          <a href="https://t.me/razum_miners" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
            @razum_miners
          </a>
          {' '}— поможем настроить пошагово.
        </div>
      </div>
    </div>
  )
}
