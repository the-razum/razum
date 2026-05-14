# Razum AI — Architecture

```
   ┌────────────────────────────────────────────────────────────┐
   │                       USER (browser)                       │
   └──────┬────────────────┬────────────────┬──────────────────┘
          │ HTTPS          │                │
          │                │                │ JSON SDK
          ▼                ▼                ▼
   ┌──────────────────────────────────────────────────┐
   │           airazum.com (Next.js + nginx)          │
   │  ┌────────────┐  ┌─────────────┐  ┌───────────┐  │
   │  │  Web UI    │  │  /api/v1/*  │  │  /api/*   │  │
   │  │ (chat/etc) │  │ (OpenAI ✓)  │  │ (internal)│  │
   │  └────────────┘  └─────────────┘  └───────────┘  │
   │                                                   │
   │            ┌───────────────────────┐              │
   │            │  Task Coordinator     │              │
   │            │  (queue, ECDSA verify)│              │
   │            └─────────┬─────────────┘              │
   │  ┌────────────┐      │       ┌──────────────┐    │
   │  │  SQLite    │      │       │  chain RPC   │    │
   │  │ (users,    │◄─────┘       │  proxy       │    │
   │  │  chats,    │              │              │    │
   │  │  miners,   │              └──────┬───────┘    │
   │  │  agents)   │                     │            │
   │  └────────────┘                     │            │
   └────────────────┬────────────────────┼────────────┘
                    │ HTTP polling       │
                    │ (with ECDSA sigs)  │
                    ▼                    ▼
   ┌─────────────────────────────┐  ┌─────────────────────────┐
   │  Miner network (independent)│  │  razum-testnet-1 chain  │
   │                             │  │                         │
   │  ┌──────────┐ ┌──────────┐  │  │  ┌──────────────────┐   │
   │  │ Mac mini │ │ iMac (M3)│  │  │  │  CometBFT BFT    │   │
   │  │  (M4)    │ │          │  │  │  │  (5s block time) │   │
   │  └────┬─────┘ └────┬─────┘  │  │  └────────┬─────────┘   │
   │       │            │        │  │           │             │
   │       ▼            ▼        │  │           ▼             │
   │  ┌──────────────────────┐   │  │  ┌─────────────────┐    │
   │  │ Ollama (or vLLM)     │   │  │  │ Cosmos SDK +    │    │
   │  │ qwen3.5:9b / dssk:7b │   │  │  │ x/inference     │    │
   │  └──────────────────────┘   │  │  │ x/bank, staking │    │
   │                             │  │  └─────────────────┘    │
   └─────────────────────────────┘  └─────────────────────────┘
```

## Layers

### 1. Frontend (Next.js 14, App Router)
- Server components где можно, client components только для interactive (chat, forms)
- Tailwind CSS, без CSS modules
- Cookie-based auth (HttpOnly + Secure + SameSite=Strict)
- PWA с service worker и offline-fallback

### 2. API (Next.js Route Handlers)
- `/api/v1/*` — OpenAI-compatible (Bearer auth, для разработчиков)
- `/api/auth/*` — register/login/me/reset (cookie auth)
- `/api/chat` — основной чат с SSE streaming
- `/api/agents/*` — кастомные агенты
- `/api/miners/*` — приём задач/heartbeats/streams от майнеров
- `/api/chain/*` — proxy к razum-chain
- `/api/admin/*` — админ-функции (role check)

### 3. Coordinator (in-process в Next.js)
- Task queue в SQLite + in-memory streams для SSE
- Sweeper rescheduling stuck tasks (15s timeout → requeue, 90s → fail)
- Stream-chunks buffering для SSE
- Verification scheduler (раз в 5 мин — скрытые тесты для майнеров)

### 4. Storage
- **SQLite** (better-sqlite3): users, chats, miners, tasks, agents, verifications, rate_limits
- **In-memory**: task queue streams (`globalThis.__razumStreams`), chat cache LRU
- **Filesystem**: locale logs, backups

### 5. Miner protocol
- Polling `/api/miners/task` каждую секунду
- POST с ECDSA-подписью `/api/miners/stream` для chunk streaming
- POST `/api/miners/task` с success/error/tokensUsed по завершении
- Heartbeat каждые 30s
- ECDSA secp256k1 keys, sign(timestamp + nonce + body)

### 6. razum-testnet-1 chain
- CometBFT 0.38, Cosmos SDK 0.53.3 (форк Gonka)
- Custom module `x/inference`:
  - Регистрация participants (майнеры на чейне)
  - Эпохальные награды с halving
  - On-chain inference results (планируется)
- Standard modules: bank, staking, gov, slashing, evidence
- Block time ~5s, ~17K блоков в день
- Validator: 1 на VPS, multi-validator в Q2 2026

### 7. Bridge (planned)
- RZMTokenBridge.sol на Base/Ethereum (Burn-and-Mint)
- 3-of-5 multi-sig operator signatures
- Daily mint cap, timelocked operator changes
- Pre-audit draft, не задеплоен

## Data flow: один chat-запрос

```
1. User sends POST /api/chat with {messages, model, webSearch}
2. Auth check (cookie or anon IP)
3. Rate limit check (per-user/IP/day)
4. If webSearch: query SearXNG, get results with URLs
5. Build augmented prompt (system + search results + history)
6. addTaskToQueue() — task inserted into SQLite, callback registered
7. Server holds SSE stream open
8. Miner polls GET /api/miners/task, gets task, marks 'assigned'
9. Miner runs Ollama on local hardware
10. Miner streams chunks to /api/miners/stream (serialised per-task, ECDSA-signed)
11. Server emits chunks as SSE data events
12. Miner finishes, POSTs result to /api/miners/task with signature
13. completeTask() → resolves callback → server emits [DONE] → closes stream
14. Response saved to chat_messages (if logged in)
15. recordTaskCompletion → updates miner reputation + rewards
```

## Security boundaries

- **Untrusted**: anything from miners (verify ECDSA, check signature timestamp window)
- **Untrusted**: anything from users (zod validation, rate limits, CSRF)
- **Trusted**: server-side env (.env file mode 600)
- **Sensitive**: validator keys (mode 600), GitHub PAT (mode 600), chain SECRETS.md (mode 600)

## Deployment

- **VPS** (TimeWeb, Ubuntu 22.04, 1.9GB RAM, 29GB disk): web-app + chain + nginx + certbot
- **Mac mini M4** (8GB): primary miner (Ollama qwen3.5:9b + deepseek-r1:7b)
- **iMac M3** (8GB): fallback miner (qwen2.5:7b)
- **Reverse SSH tunnels** mini→VPS:22222, iMac→VPS:22223 (для нашего admin доступа)

## Monitoring

- `/opt/razum-monitor/check.sh` через cron каждые 5 минут
- 6 проверок: health, chain RPC, chain REST, online miners, systemd razumd, pm2 razum-web
- TG alerts при OK→FAIL переходе (когда TG_BOT_TOKEN установлен)
- Log: `/var/log/razum-monitor.log` (auto-rotate 5MB)

## Backups

- Локальные: cron `0 * * * *` → /opt/razum-web/backups/razum.db.gz.\$(date) (keep 7)
- Off-site: cron `0 3 * * *` → Backblaze B2 / S3 (ждёт user-provided creds)
- Chain state: только genesis.json в off-site (полный state восстанавливается peer-sync)

## Performance

- Chat TTFB: 1.5-2s (warm), 5-15s (cold model load)
- /api/health: <100ms
- /api/chain/status: <200ms
- Static pages: <50ms (after build)
- LRU cache для частых prompts ("привет", "1+1") → instant

## Future architecture changes

- Multi-validator chain → coordinator не нужен будет, всё через chain
- vLLM узлы для крупных моделей
- IPFS для агент-описаний и истории чатов
- Cosmos IBC для cross-chain
- Bridge на Base/Ethereum
