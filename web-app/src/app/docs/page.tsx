import Link from 'next/link'

export const metadata = {
  title: 'Документация — Razum AI',
  description: 'Архитектура Razum AI, как стать майнером, OpenAI-совместимый API, endpoints чейна razum-testnet-1, faucet, FAQ.',
}

const code = 'block whitespace-pre overflow-x-auto bg-black/50 border border-white/10 rounded-lg p-4 text-xs font-mono'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">Razum<span className="text-emerald-400">AI</span></Link>
          <nav className="flex gap-6 text-sm text-white/70">
            <Link href="/chat" className="hover:text-white">Чат</Link>
            <Link href="/chain" className="hover:text-white">Чейн</Link>
            <Link href="/faucet" className="hover:text-white">Faucet</Link>
            <Link href="/miner" className="hover:text-white">Майнинг</Link>
            <Link href="/docs" className="text-white">Docs</Link>
          </nav>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Документация</h1>
        <p className="text-white/60 mb-10">Технический справочник Razum AI. Последнее обновление: 6 мая 2026.</p>

        <nav className="sticky top-2 z-10 -mx-6 px-6 py-3 bg-black/80 backdrop-blur border-b border-white/10 text-xs text-white/60 mb-10 overflow-x-auto whitespace-nowrap">
          <a href="#arch" className="hover:text-white mr-4">Архитектура</a>
          <a href="#chain" className="hover:text-white mr-4">Чейн</a>
          <a href="#api" className="hover:text-white mr-4">API</a>
          <a href="#miner" className="hover:text-white mr-4">Майнер</a>
          <a href="#faucet" className="hover:text-white mr-4">Faucet</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>

        <section id="arch" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Архитектура</h2>
          <p className="text-white/80">Razum AI — децентрализованная сеть для AI-инференса. Три уровня:</p>
          <ul className="list-disc list-inside space-y-2 text-white/80 mt-3">
            <li><b>Web-app (airazum.com)</b> — Next.js 14, координатор задач, OpenAI-совместимый API, чат UI, биллинг</li>
            <li><b>Майнеры</b> — Node.js процессы на компьютерах участников. Используют Ollama / vLLM для запуска моделей. Подключаются по polling, забирают задачи, стримят результат</li>
            <li><b>razum-testnet-1</b> — публичный Cosmos SDK + CometBFT чейн. Хранит регистрации майнеров, эпохи, награды, общий supply</li>
          </ul>
          <p className="text-white/80 mt-3">Все ответы майнеров подписываются ECDSA-ключом. Координатор периодически рассылает скрытые верификационные задачи; систематически неверные ответы понижают репутацию.</p>
        </section>

        <section id="chain" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Чейн razum-testnet-1</h2>
          <ul className="text-white/80 space-y-2 text-sm">
            <li><b>Chain ID:</b> <code>razum-testnet-1</code></li>
            <li><b>Base denom:</b> <code>nrazum</code> (10⁻⁹ RZM). Шкала: nrazum (0) → urzm (3) → mrzm (6) → rzm (9)</li>
            <li><b>RPC:</b> <a href="https://airazum.com/chain-rpc/status" target="_blank" className="text-emerald-300 underline">https://airazum.com/chain-rpc/</a></li>
            <li><b>REST:</b> <a href="https://airazum.com/chain-api/cosmos/base/tendermint/v1beta1/blocks/latest" target="_blank" className="text-emerald-300 underline">https://airazum.com/chain-api/</a></li>
            <li><b>Bech32 prefix:</b> <code>razum</code> для аккаунтов, <code>razumvaloper</code> для валидаторов</li>
            <li><b>Block time:</b> ~5 секунд</li>
          </ul>
          <p className="text-white/80 mt-3">Базируется на форке Gonka / Cosmos SDK 0.53.3. Поддерживает x/staking, x/bank, x/gov, x/inference (custom).</p>
          <p className="text-white/80 mt-3">Примеры запросов:</p>
          <pre className={code}>
{`# текущая высота
curl -s https://airazum.com/chain-rpc/status | jq .result.sync_info.latest_block_height

# total supply
curl -s 'https://airazum.com/chain-api/cosmos/bank/v1beta1/supply/by_denom?denom=nrazum'

# баланс адреса
curl -s 'https://airazum.com/chain-api/cosmos/bank/v1beta1/balances/razum1...'

# активные валидаторы
curl -s 'https://airazum.com/chain-api/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED'`}
          </pre>
        </section>

        <section id="api" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">OpenAI-совместимый API</h2>
          <p className="text-white/80">Endpoint: <code>https://airazum.com/api/v1/chat/completions</code>. Совместим с openai-python и openai-node SDK.</p>
          <p className="text-white/80 mt-3">Получите API-ключ в <Link href="/account" className="text-emerald-300 underline">личном кабинете</Link>.</p>

          <h3 className="text-lg font-semibold mt-6 mb-2">curl</h3>
          <pre className={code}>
{`curl https://airazum.com/api/v1/chat/completions \\
  -H 'Authorization: Bearer rzm_YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "qwen3.5-9b",
    "messages": [{"role": "user", "content": "Привет!"}],
    "stream": true
  }'`}
          </pre>

          <h3 className="text-lg font-semibold mt-6 mb-2">Python (openai SDK)</h3>
          <pre className={code}>
{`from openai import OpenAI

client = OpenAI(
    api_key="rzm_YOUR_API_KEY",
    base_url="https://airazum.com/api/v1"
)
stream = client.chat.completions.create(
    model="qwen3.5-9b",
    messages=[{"role": "user", "content": "Привет!"}],
    stream=True,
)
for chunk in stream:
    print(chunk.choices[0].delta.content or '', end='', flush=True)`}
          </pre>

          <h3 className="text-lg font-semibold mt-6 mb-2">Доступные модели</h3>
          <ul className="list-disc list-inside text-white/80 text-sm space-y-1 mt-2">
            <li><code>qwen3.5-9b</code> — общего назначения, русский язык, web search</li>
            <li><code>deepseek-r1-7b</code> — reasoning, математика, код</li>
          </ul>
        </section>

        <section id="miner" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Стать майнером</h2>
          <p className="text-white/80">Минимальные требования:</p>
          <ul className="list-disc list-inside text-white/80 text-sm space-y-1 mt-2">
            <li>Mac с Apple Silicon (M1/M2/M3/M4), 8+ ГБ unified memory, или</li>
            <li>PC с NVIDIA GPU 8+ ГБ VRAM (RTX 3060+ или эквивалент)</li>
            <li>Стабильное интернет-соединение</li>
            <li>macOS 13+ / Linux / Windows</li>
          </ul>
          <h3 className="text-lg font-semibold mt-6 mb-2">Установка (macOS, M-серия)</h3>
          <pre className={code}>
{`# 1. Установить Ollama
brew install ollama
brew services start ollama

# 2. Скачать модели
ollama pull qwen3.5:9b
ollama pull deepseek-r1:7b

# 3. Скачать майнер
mkdir -p ~/.razum
curl -L https://airazum.com/install/miner.js -o ~/.razum/miner.js

# 4. Установить Node.js
brew install node

# 5. Запустить (создаст ECDSA-ключ, зарегистрирует майнер автоматически)
export WALLET_ADDRESS=0xYOUR_ETH_ADDRESS
export MINER_NAME=my-mac
node ~/.razum/miner.js`}
          </pre>
          <p className="text-white/80 text-sm mt-3">Подробная пошаговая инструкция со скриншотами: <Link href="/miner" className="text-emerald-300 underline">/miner</Link></p>
        </section>

        <section id="faucet" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">Faucet</h2>
          <p className="text-white/80">Раздача тестовых RZM для разработки и подключения кошельков.</p>
          <ul className="text-white/80 text-sm space-y-1 mt-2">
            <li>UI: <Link href="/faucet" className="text-emerald-300 underline">/faucet</Link></li>
            <li>Дрип: 100 RZM (= 10¹¹ nrazum)</li>
            <li>Лимит: 1 раз в час на IP и на адрес</li>
          </ul>
          <pre className={code}>
{`curl -X POST https://airazum.com/api/faucet \\
  -H 'Content-Type: application/json' \\
  -d '{"address":"razum1..."}'`}
          </pre>
        </section>

        <section id="faq" className="mb-12">
          <h2 className="text-2xl font-semibold mb-3">FAQ</h2>
          <div className="space-y-4 text-white/80 text-sm">
            <div>
              <b className="text-white">Это mainnet или testnet?</b>
              <p>razum-testnet-1 — публичная тестовая сеть. Mainnet появится после интеграции multi-validator и аудита смарт-контрактов.</p>
            </div>
            <div>
              <b className="text-white">RZM имеет реальную стоимость?</b>
              <p>На тестнете — нет. RZM testnet не является ценной бумагой, не торгуется на биржах, не конвертируется в фиат. После mainnet — будет токеномика, описанная в whitepaper.</p>
            </div>
            <div>
              <b className="text-white">Я могу хостить свой узел чейна?</b>
              <p>Да. Бинарь <code>inferenced</code> публикуется на GitHub. P2P seed: будет добавлен. Скоро откроем процедуру joining как валидатора.</p>
            </div>
            <div>
              <b className="text-white">Контакт для разработчиков и партнёров</b>
              <p><a href="mailto:dev@airazum.com" className="text-emerald-300 underline">dev@airazum.com</a> · GitHub <a href="https://github.com/the-razum" target="_blank" className="text-emerald-300 underline">@the-razum</a></p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
