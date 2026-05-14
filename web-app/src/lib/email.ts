import { Resend } from 'resend'
import nodemailer, { Transporter } from 'nodemailer'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://airazum.com'
const FROM_EMAIL = process.env.EMAIL_FROM || 'Razum AI <noreply@airazum.com>'

// SMTP fallback (Mail.ru / Yandex / Gmail / любой)
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_SECURE = (process.env.SMTP_SECURE || 'true') === 'true'

let resend: Resend | null = null
let smtp: Transporter | null = null
let provider: 'resend' | 'smtp' | 'none' = 'none'

function getResend(): Resend | null {
  if (resend) return resend
  if (!RESEND_API_KEY) return null
  resend = new Resend(RESEND_API_KEY)
  return resend
}

function getSMTP(): Transporter | null {
  if (smtp) return smtp
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  smtp = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return smtp
}

function pickProvider(): 'resend' | 'smtp' | 'none' {
  if (provider !== 'none') return provider
  if (getResend()) { provider = 'resend'; console.log('[Email] using Resend'); return 'resend' }
  if (getSMTP())   { provider = 'smtp';   console.log(`[Email] using SMTP (${SMTP_HOST})`); return 'smtp' }
  console.warn('[Email] No provider configured — emails will only be logged to console.')
  return 'none'
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const p = pickProvider()
  if (p === 'none') {
    console.log(`[Email][LOG-ONLY] TO=${to} SUBJ=${subject}`)
    return true
  }
  try {
    if (p === 'resend') {
      const { error } = await getResend()!.emails.send({ from: FROM_EMAIL, to, subject, html })
      if (error) { console.error('[Email] Resend error:', error); return false }
    } else if (p === 'smtp') {
      await getSMTP()!.sendMail({ from: FROM_EMAIL, to, subject, html })
    }
    console.log(`[Email] Sent (${p}) to ${to}: ${subject}`)
    return true
  } catch (e) {
    console.error(`[Email] ${p} send error:`, e)
    return false
  }
}

// --- Email Templates ---

const STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 480px; margin: 0 auto; padding: 32px;
  background: #0d1017; color: #e0e0e0; border-radius: 12px;
`

const BTN = `
  display: inline-block; padding: 12px 32px;
  background: #00e59b; color: #0d1017; font-weight: 600;
  text-decoration: none; border-radius: 8px; font-size: 16px;
`

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
  const link = `${APP_URL}/verify-email?token=${token}`
  return sendEmail(to, 'Подтвердите email — Razum AI', `
    <div style="${STYLE}">
      <h2 style="color: #00e59b; margin-top: 0;">Razum AI</h2>
      <p>Привет, ${name}!</p>
      <p>Подтвердите ваш email для завершения регистрации:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="${BTN}">Подтвердить email</a>
      </p>
      <p style="font-size: 13px; color: #888;">
        Или скопируйте ссылку:<br/>
        <a href="${link}" style="color: #00e59b; word-break: break-all;">${link}</a>
      </p>
      <p style="font-size: 12px; color: #666; margin-top: 24px;">
        Ссылка действительна 24 часа. Если вы не регистрировались — просто проигнорируйте это письмо.
      </p>
    </div>
  `)
}

export async function sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
  const link = `${APP_URL}/reset-password?token=${token}`
  return sendEmail(to, 'Сброс пароля — Razum AI', `
    <div style="${STYLE}">
      <h2 style="color: #00e59b; margin-top: 0;">Razum AI</h2>
      <p>Привет, ${name}!</p>
      <p>Вы запросили сброс пароля. Нажмите кнопку ниже:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="${BTN}">Сбросить пароль</a>
      </p>
      <p style="font-size: 13px; color: #888;">
        Или скопируйте ссылку:<br/>
        <a href="${link}" style="color: #00e59b; word-break: break-all;">${link}</a>
      </p>
      <p style="font-size: 12px; color: #666; margin-top: 24px;">
        Ссылка действительна 1 час. Если вы не запрашивали сброс — просто проигнорируйте это письмо.
      </p>
    </div>
  `)
}

// === Welcome email — after successful registration ===
export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  return sendEmail(to, 'Добро пожаловать в Razum AI!', `
    <div style="${STYLE}">
      <h2 style="color: #00e59b; margin-top: 0;">Razum AI</h2>
      <p>Привет, ${name}! 👋</p>
      <p>Вы зарегистрировались на Razum AI — российской децентрализованной AI-платформе.</p>
      <p><b>Что у вас есть:</b></p>
      <ul>
        <li>30 бесплатных запросов в день</li>
        <li>OpenAI-совместимый API (ключ в личном кабинете)</li>
        <li>Доступ к чату на airazum.com/chat</li>
        <li>100 RZM testnet (получите на /faucet)</li>
      </ul>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${APP_URL}/chat" style="${BTN}">Открыть чат</a>
      </p>
      <p style="font-size: 13px; color: #888;">
        Документация: <a href="${APP_URL}/docs" style="color: #00e59b;">airazum.com/docs</a><br/>
        Майнинг на своём компе: <a href="${APP_URL}/miner" style="color: #00e59b;">airazum.com/miner</a>
      </p>
      <p style="font-size: 12px; color: #666; margin-top: 24px;">
        Если у вас вопросы — пишите на <a href="mailto:support@airazum.com" style="color: #00e59b;">support@airazum.com</a>
      </p>
    </div>
  `)
}

// === Payment confirmation ===
export async function sendPaymentConfirmation(to: string, name: string, plan: string, amount: number, currency = 'RUB'): Promise<boolean> {
  return sendEmail(to, `Оплата прошла — план ${plan}`, `
    <div style="${STYLE}">
      <h2 style="color: #00e59b; margin-top: 0;">Платёж получен ✓</h2>
      <p>Привет, ${name}!</p>
      <p>Мы получили вашу оплату.</p>
      <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding:8px 0; color:#888;">План</td><td style="padding:8px 0; text-align:right;"><b>${plan}</b></td></tr>
        <tr><td style="padding:8px 0; color:#888;">Сумма</td><td style="padding:8px 0; text-align:right;"><b>${amount} ${currency}</b></td></tr>
        <tr><td style="padding:8px 0; color:#888;">Действует до</td><td style="padding:8px 0; text-align:right;">через 30 дней</td></tr>
      </table>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${APP_URL}/account" style="${BTN}">Личный кабинет</a>
      </p>
      <p style="font-size: 12px; color: #666;">
        Закрывающие документы для юр.лиц: <a href="mailto:billing@airazum.com" style="color: #00e59b;">billing@airazum.com</a>
      </p>
    </div>
  `)
}

// === Plan expired ===
export async function sendPlanExpiredEmail(to: string, name: string): Promise<boolean> {
  return sendEmail(to, 'Ваш платный план Razum AI закончился', `
    <div style="${STYLE}">
      <h2 style="color: #00e59b; margin-top: 0;">План завершён</h2>
      <p>Привет, ${name}!</p>
      <p>Ваш платный план Razum AI закончился. Вы переведены на бесплатный тариф — 30 запросов в день.</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${APP_URL}/pricing" style="${BTN}">Продлить план</a>
      </p>
      <p style="font-size: 13px; color: #888;">
        Все ваши чаты и API-ключи сохранены. Сменили решение? Зайдите в <a href="${APP_URL}/account" style="color: #00e59b;">личный кабинет</a>.
      </p>
    </div>
  `)
}

// === New miner registered (notify owner) ===
export async function sendMinerRegisteredEmail(to: string, name: string, minerName: string, minerId: string): Promise<boolean> {
  return sendEmail(to, `Новый майнер: ${minerName}`, `
    <div style="${STYLE}">
      <h2 style="color: #00e59b; margin-top: 0;">Майнер подключился ⛏</h2>
      <p>Привет, ${name}!</p>
      <p>На ваш кошелёк зарегистрирован новый майнер:</p>
      <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding:8px 0; color:#888;">Имя</td><td style="padding:8px 0; text-align:right;"><b>${minerName}</b></td></tr>
        <tr><td style="padding:8px 0; color:#888;">ID</td><td style="padding:8px 0; text-align:right; font-family: monospace; font-size: 12px;">${minerId.slice(0,8)}...</td></tr>
      </table>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${APP_URL}/account" style="${BTN}">Посмотреть статистику</a>
      </p>
    </div>
  `)
}

// === Generic notification (admin alerts) ===
export async function sendAdminAlert(to: string, subject: string, body: string): Promise<boolean> {
  return sendEmail(to, `[Razum Alert] ${subject}`, `
    <div style="${STYLE}">
      <h2 style="color: #ff6b6b; margin-top: 0;">⚠ Alert</h2>
      <p style="white-space: pre-wrap; font-family: monospace; font-size: 13px;">${body}</p>
      <p style="font-size: 12px; color: #666; margin-top: 24px;">— razum-monitor on $(hostname)</p>
    </div>
  `)
}
