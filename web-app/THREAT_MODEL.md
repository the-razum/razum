# Razum AI — Threat Model

STRIDE-анализ для каждого компонента. Подготовка к внешнему аудиту.

Last updated: 2026-05-14
Reviewed by: внутренняя команда (внешний аудит — Q3 2026)

## Scope

- **In scope**: web-app, miner protocol, razum-testnet-1 chain, bridge contracts (pre-deploy), DB, deployment infra
- **Out of scope**: third-party services (Robokassa, Resend, Cloudflare, GitHub, OpenAI/Anthropic — мы их не используем кроме как зависимости)

## Trust boundaries

1. **User ↔ Web-app**: HTTPS, untrusted user input
2. **Web-app ↔ Miner**: HTTP polling + ECDSA signatures, untrusted miner
3. **Web-app ↔ Chain**: local socket / loopback HTTP, trusted (same host)
4. **Web-app ↔ DB**: filesystem, trusted (root-owned)
5. **Bridge ETH ↔ Razum-chain**: untrusted both sides, multi-sig consensus
6. **Admin ↔ VPS**: SSH key auth, trusted

## STRIDE-анализ компонентов

### 1. Web-app

| Threat | Vector | Mitigation | Residual risk |
|---|---|---|---|
| **S**poofing | Login bypass | bcrypt + JWT, no SQL inject (prepared statements), HttpOnly+Secure cookies | Low — depends on AUTH_SECRET secrecy |
| **T**ampering | Modified API request | CSRF check (Origin header), zod validation, rate limits | Low |
| **R**epudiation | User denies action | Server logs with timestamps, не доступны для удаления юзером | Low |
| **I**nfo disclosure | Stack traces, error details | NODE_ENV=production hides details, generic error messages | Medium — log files на VPS могут содержать details |
| **D**oS | Spam requests | Rate limits per IP/user/store, in-memory backoff | Medium — нет L7 firewall, нет Cloudflare пока |
| **E**levation | Регистрация → admin | Role в БД, проверка через `getUserRole(userId)`, нет auto-promotion | Low |

### 2. Miner protocol

| Threat | Vector | Mitigation | Residual risk |
|---|---|---|---|
| **S**poofing | Fake miner steals tasks | ECDSA signature на каждом запросе, public key регистрируется при первом heartbeat и pinned | Low |
| **T**ampering | Майнер возвращает поддельный AI-ответ | Скрытые верификационные таски сверяются с известным результатом, reputation падает при mismatch | **Medium** — small model variance может дать false positive; нужно tuning |
| **R**epudiation | Майнер отрицает задачу | tasks в БД с minerId+timestamp, immutable | Low |
| **I**nfo disclosure | Чужие задачи попадают другому майнеру | Каждый таск assigned к конкретному minerId, completeTask проверяет minerId | Low |
| **D**oS | Майнер не возвращает результат | Sweeper requeue через 15-90s, hard-fail через 240s | Low |
| **E**levation | Майнер становится admin | minerId не имеет userId, разные таблицы, нет cross-reference | Low |

### 3. Чейн razum-testnet-1

| Threat | Vector | Mitigation | Residual risk |
|---|---|---|---|
| **S**poofing | Fake validator подписывает блоки | CometBFT consensus с ed25519, validator set от genesis | **High** на testnet — 1 валидатор = 1 точка контроля. Multi-validator до mainnet |
| **T**ampering | Изменение state | BFT consensus гарантирует если >2/3 honest. На 1 валидаторе — гарантии нет, мы доверяем себе | High до multi-validator |
| **R**epudiation | Кто-то отрицает транзакцию | Подписи tx требуются, immutable ledger | Low |
| **I**nfo disclosure | Чейн публичен, всё видно | Это feature, не bug — нет sensitive data ON-chain | Low |
| **D**oS | Spam-транзакции забивают mempool | Min gas price `0nrazum` — TODO добавить spam-fee | **High** — на testnet можно заспамить за бесплатно |
| **E**levation | Получить validator privileges | Требует staking + создание validator-key + tx — не trivial | Low |

### 4. Bridge ETH ↔ Razum-chain (pre-deploy)

| Threat | Vector | Mitigation | Residual risk |
|---|---|---|---|
| **S**poofing | Fake mint без burn | 3-of-5 operator multisig, signed message включает sourceTxHash | Medium — компрометация 3 ключей = full drain |
| **T**ampering | Replay attack — mint дважды | processedNonces mapping предотвращает повтор | Low |
| **R**epudiation | Операторы отрицают подпись | onchain events эмитятся при каждой операции | Low |
| **I**nfo disclosure | Не применимо (все события public) | — | — |
| **D**oS | Большой mint выкачивает supply | DAILY_MINT_CAP = 10M RZM/день, pause function | Medium |
| **E**levation | Operator стал owner | onlyOwner защищает op-management; timelock 2 days на changes | Low |

**КРИТИЧНО**: bridge — это самая опасная часть. Mainnet bridge не запускаем без независимого аудита.

### 5. Storage (SQLite)

| Threat | Vector | Mitigation | Residual risk |
|---|---|---|---|
| **S**poofing | Подмена БД | File ownership root:root, mode 600 | Low — требует root-доступ к серверу |
| **T**ampering | SQL injection | better-sqlite3 prepared statements везде, нет raw concatenation | Low |
| **R**epudiation | Полностью identifies через id+timestamp | Logs cover most actions | Low |
| **I**nfo disclosure | Утечка через бэкапы | Бэкапы шифруются (когда B2 настроен) | Medium — пока no off-site |
| **D**oS | БД заполняется до краёв | Auto-rotation чатов>90 дней (запланировано), free disk monitoring | Medium |
| **E**levation | DB файл доступен веб-серверу | Read-only пробросы где можно (TODO) | Low |

### 6. Deployment / Infra

| Threat | Vector | Mitigation | Residual risk |
|---|---|---|---|
| **S**poofing | DNS hijacking | Cloudflare (когда подключим) + DNSSEC | Medium до Cloudflare |
| **T**ampering | Man-in-the-middle | HTTPS+HSTS, TLS 1.2+, valid Let's Encrypt | Low |
| **R**epudiation | Кто-то изменил код | Git commits подписаны user.name+email | Medium — нет GPG signing yet |
| **I**nfo disclosure | Server pwned | SSH key auth, no password, firewall (TODO ufw) | Medium |
| **D**oS | DDoS на сайт | Nginx rate-limit modules, no Cloudflare yet | **High** |
| **E**levation | App user → root | Web-app runs as root (PM2) — TODO unprivileged user | Medium |

## Cataloged residual risks (по приоритету)

### High
1. **Single validator** — multi-validator before mainnet
2. **No L7 DDoS protection** — Cloudflare to be wired up
3. **Chain has zero gas price** — testnet OK, mainnet needs spam-fee

### Medium
4. **App runs as root** — refactor to www-data user
5. **No off-site backups yet** — script ready, awaiting B2 creds
6. **No GPG-signed commits** — for tonight, not blocker
7. **Verification может давать false positives** — нужна продуктовая тонкая настройка
8. **Bridge не аудирован** — обязательно перед deploy
9. **Большой mint cap (10M/day)** — можно сделать меньше

### Low
10. Stack traces в console.error на сервере — не проблема, не в response
11. Validator key в keyring-test backend — для testnet ОК, для mainnet — HSM/tmkms

## Anti-fraud / Sybil

### User-side
- Анти-spam регистрации: rate-limit 5/h/IP
- Email-вериф (когда Resend подключим)
- Чекбокс 18+ обязательно
- Anti-sybil в airdrop: один IP — макс 2 аккаунта; activity threshold 3 дня; per-address cap

### Miner-side
- ECDSA pinning на первый heartbeat
- Reputation падает с -5 за расхождение с верификационным результатом
- При repuptation < 0 — исключение из task allocation

## Compliance considerations

- 152-ФЗ: storage в РФ, согласие на регистрации, прав субъекта реализованы
- 149-ФЗ: фильтрация запрещённого контента (в основном на стороне модели, не у нас)
- 259-ФЗ: RZM testnet не ЦФА (документировано в Terms, юр.заключение pending)
- GDPR: применимо к юзерам из ЕС — наш scope больше для РФ, но cookie-banner и базовые права реализованы

## Audit prep checklist

- ✅ Static analysis (npm audit, semgrep) — отчёт в SELF_AUDIT.md
- ✅ Threat model (этот документ)
- ✅ Test coverage > 60% (TODO дополнить)
- ✅ Зафиксирован код для аудита (git tag pre-audit)
- ⬜ Reproducible builds (TODO Docker image)
- ⬜ External pen-test (планируется)
- ⬜ Bug bounty активный (после mainnet)

## Изменения с момента последнего ревью

- 2026-05-14: первая версия документа
