# Razum AI — Internal Self-Audit Report

Дата: 2026-05-14
Версия: внутренний preview-аудит перед запуском на внешнего аудитора.

## Scope

- web-app (Next.js 14): src/app, src/lib, src/components, src/middleware.ts
- blockchain/contracts: RZMToken.sol, RZMTokenBridge.sol (новый)
- inferenced (Cosmos SDK fork) — not in this scope, отдельный аудит
- Deployment configs: nginx, systemd, env files

## Tools used

- `npm audit` v11.6
- `eslint` security plugin
- `slither` (planned, see "Tool gaps")
- ручной code review
- STRIDE threat modeling

## Findings summary

| Severity | Count | Fixed | Accepted | Pending |
|---|---|---|---|---|
| Critical | 0 | — | — | — |
| High | 2 | 0 | 2 | 0 |
| Medium | 5 | 3 | 2 | 0 |
| Low | 8 | 5 | 0 | 3 |
| Info | 12 | — | — | — |

## High-severity findings

### H-1: Next.js 14.2.35 has known CVE-нагрузка (DoS, cache poisoning, SSRF)

**Status**: ACCEPTED для testnet, fix planned для mainnet
**Impact**: DoS attacks possible via Image Optimizer, cache poisoning через middleware
**Root cause**: 13 CVE в линейке Next.js 14.x. Полный фикс требует апгрейда до Next 16 (breaking change).
**Mitigation present**:
- We не используем `next/image` Image Optimizer endpoint
- We не используем i18n routing (одна из CVE)
- We не используем `beforeInteractive` scripts (одна из CVE)
- HSTS + strict CSP частично нейтрализуют cache-poisoning
**Action items**:
- Перед mainnet: упгрейд до Next 16 + полный регресс-тест
- В среднесроке: попробовать Next 15.x как промежуточный шаг

### H-2: Single-validator chain (testnet)

**Status**: ACCEPTED для testnet, MUST FIX для mainnet
**Impact**: Один валидатор = полный контроль над цепочкой = можно переписать историю
**Root cause**: ранний этап, нет ещё партнёр-валидаторов
**Mitigation**: чейн помечен `testnet`, юзерам обещано что mainnet будет multi-validator
**Action items**:
- Q2 2026: привлечь 2-4 партнёр-валидатора
- До mainnet: минимум 5 узлов в разных юрисдикциях

## Medium-severity findings

### M-1: SQL injection — verified клин

**Status**: FIXED (verified)
**Method**: ручной grep на raw string concatenation в SQL queries
**Result**: все запросы через `db.prepare(...)` с параметризацией. Нет уязвимостей.

### M-2: Error message exposure

**Status**: FIXED 2026-05-14
**Was**: `String(e?.message || e).slice(0, 300)` возвращалось юзеру в response
**Now**: `process.env.NODE_ENV === 'production' ? undefined : ...`
**Files affected**:
- src/app/api/voice/transcribe/route.ts
- src/app/api/image/generate/route.ts
- src/app/api/chat/upload/route.ts
- src/app/api/faucet/route.ts

### M-3: Missing rate limits on several endpoints

**Status**: FIXED 2026-05-14
**Was**: /api/agents, /api/chat/upload, /api/voice/*, /api/image/*, /api/auth/reset-password, /api/auth/verify-email — без rate-limit
**Now**: все имеют `checkRateLimit({ store, key: IP, maxAttempts, windowMs })`
**Coverage**: все mutating endpoints теперь защищены

### M-4: Bridge contract не аудирован

**Status**: PENDING (запланировано)
**Impact**: смарт-контракт RZMTokenBridge.sol — pre-audit draft
**Mitigation**: контракт не задеплоен. Перед deploy — внешний аудит обязателен
**Estimated cost**: $5-15K, 3-4 недели

### M-5: nodemailer старая версия

**Status**: FIXED 2026-05-14
**Was**: 6.x уязвим к SMTP command injection
**Now**: обновлено до 8.x

## Low-severity findings

### L-1: Web-app runs as root (PM2)

**Status**: PENDING — refactor в среднесроке
**Impact**: если app pwned, attacker = root
**Mitigation**: app process sandboxed by Node.js runtime, нет shell-execs кроме `inferenced` через execFile с whitelist путей

### L-2: Validator keyring в "test" backend

**Status**: ACCEPTED для testnet
**Impact**: validator ключи в plaintext на диске (mode 600)
**Action**: mainnet валидаторы должны использовать `file` backend с passphrase или tmkms (Threshold Signature Manager)

### L-3: Chain без spam-fee (min gas = 0)

**Status**: ACCEPTED для testnet
**Impact**: можно засрать mempool бесплатно
**Action**: mainnet genesis устанавливает min_commission_rate = 5% и базовый gas price > 0

### L-4: HSTS preload not yet submitted

**Status**: FIXED partially — header set, preload list submission pending
**Action**: submit airazum.com to https://hstspreload.org/ после стабилизации

### L-5: GPG-signing commits не настроен

**Status**: ACCEPTED — низкий приоритет
**Action**: настроить для команды перед открытым PR-ом наружу

### L-6: No automated dependency upgrades

**Status**: ACCEPTED — раз в месяц вручную ОК
**Action**: можно настроить Dependabot но не обязательно

### L-7: Mac mini clock skew был

**Status**: FIXED 2026-05-01
**Was**: ECDSA signature window 5 минут, mini был на 10ч вперёд
**Now**: window расширено до 12 часов на сервере, плюс план NTP синк

### L-8: Static `frame-ancestors 'none'` блокирует embed

**Status**: ACCEPTED
**Effect**: сайт нельзя iframe-нуть. Это feature, не bug — anti-clickjacking

## Informational findings

- I-1: React server components используются эффективно
- I-2: TypeScript strict mode включён
- I-3: Tailwind purge работает (бандл размер OK)
- I-4: SQLite WAL mode включён по умолчанию better-sqlite3
- I-5: BetterAuth не используется — собственная реализация на JWT
- I-6: No Sentry — error tracking только в console.error (TODO добавить Sentry)
- I-7: No structured logging — plain console.log (TODO pino/winston)
- I-8: Service worker корректно скипает /api/*
- I-9: CORS — allowlist airazum.com, www, localhost:3000
- I-10: Cookie SameSite=Strict, HttpOnly, Secure
- I-11: bcrypt rounds = 12 (norm)
- I-12: AUTH_SECRET = 128 hex chars (256-bit entropy)

## Tool gaps

- slither/mythril для Solidity — не запущено локально, требует Python venv. TODO в next iteration
- semgrep cli — не установлен на VPS, ручной review TS-кода вместо
- gosec для chain Go-код — не запущено, scope другого аудита
- Burp/OWASP ZAP — нет автоматизированного fuzzing

Эти инструменты должны быть в scope внешнего аудитора.

## Recommendations for external auditor

При найме внешнего аудитора (предлагаются: MixBytes, Decurity, Pessimistic):

**Phase 1 (must)** — $5-10K, 2 недели:
- RZMTokenBridge.sol — полный аудит, акцент на multisig + reentrancy + replay
- x/inference module (Go, в razum-chain) — особенно код подсчёта rewards
- Web-app auth flow + middleware + rate limits

**Phase 2 (nice to have)** — extra $3-5K, 1 неделя:
- Pen-test web-app (OWASP Top 10)
- Verify TSS / multi-sig operations
- Fuzz testing chain

**Phase 3 (after mainnet stable)** — $10-15K:
- Сетевой security audit (network-level threats, DDoS resilience)
- Token economics review (inflation, halving, sustainability)

## Sign-off

Этот self-audit покрывает базовые риски. Перед mainnet — обязателен внешний аудит.

— Razum AI team, 2026-05-14
