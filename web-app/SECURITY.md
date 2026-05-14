# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Razum AI, please report it responsibly:

- **Email**: security@airazum.com
- **PGP key**: (TODO — add when generated)
- **Encrypted Telegram**: @razum_security (private channel for verified researchers)

### What to include

- Component affected (web-app, chain, miner, bridge, etc.)
- Steps to reproduce
- Impact (data exposure, fund loss, DoS, etc.)
- Suggested fix (if you have one)

### What we do

1. Acknowledge within 48 hours
2. Investigate and reproduce within 7 days
3. Patch and deploy fix
4. Public disclosure 30-90 days after patch (depending on severity)
5. Credit you in HALL_OF_FAME.md (with permission)

## Bug Bounty (planned, not active yet)

Once mainnet launches and proper funding is in place, we will run a bounty program:

| Severity | Reward |
|---|---|
| Critical (fund loss, full takeover) | $5,000-50,000 |
| High (privilege escalation, data exfiltration) | $1,000-10,000 |
| Medium (CSRF, XSS, info disclosure) | $200-2,000 |
| Low (best practice violations) | $50-500 |

Until then, we offer recognition + free Pro subscription + RZM testnet tokens.

## Out of scope

- Theoretical vulnerabilities without working exploit
- Issues in third-party services (Cloudflare, Robokassa, etc.) — report to them directly
- Social engineering of team members
- Physical attacks (server room access, etc.)
- Spam/DoS attacks (we have rate limiting; just don't)

## Scope

- airazum.com and subdomains
- github.com/the-razum/* repos
- razum-testnet-1 chain (RPC, REST, P2P)
- Miner protocol (auth, signing)
- RZMTokenBridge contracts (when deployed)

## Recently fixed

- `2026-05-14` — Hardened CSP headers, added HSTS, Permissions-Policy
- `2026-05-14` — Rate limits added to /api/agents, /api/chat/upload, /api/voice, /api/image
- `2026-05-14` — Error message sanitization in production
- `2026-05-01` — ECDSA signature window widened with proper bounds (clock skew issue)
- `2026-05-01` — Chunk ordering bug in miner→web-app pipeline fixed

## Known limitations (acknowledged)

- Single validator on testnet — multi-validator coming Q2 2026
- Off-site backups require user-provided B2/S3 credentials — script ready, awaiting setup
- Email sending requires Resend API key — graceful fallback to console logs
- VPS RAM is 1.9GB — sufficient for testnet but tight for stress tests
- No external audit yet — planned before mainnet (Q3 2026)
