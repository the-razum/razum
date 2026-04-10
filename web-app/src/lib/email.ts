import nodemailer from 'nodemailer'

// SMTP configuration — supports any provider (Yandex, Gmail, Mailgun, etc.)
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465')
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER
const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://airazum.com'

let transporter: any = null

function getTransporter() {
  if (!transporter) {
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn('[Email] SMTP not configured — emails will be logged to console')
      return null
    }
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return transporter
}

// Send email or log to console in dev mode
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter()
  if (!t) {
    console.log(`[Email] TO: ${to}`)
    console.log(`[Email] SUBJECT: ${subject}`)
    console.log(`[Email] BODY: ${html.replace(/<[^>]+>/g, '')}`)
    return true // Don't block registration in dev
  }
  try {
    await t.sendMail({ from: `"Razum AI" <${SMTP_FROM}>`, to, subject, html })
    console.log(`[Email] Sent to ${to}: ${subject}`)
    return true
  } catch (e) {
    console.error('[Email] Send error:', e)
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
  background: #4ade80; color: #0d1017; font-weight: 600;
  text-decoration: none; border-radius: 8px; font-size: 16px;
`

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
  const link = `${APP_URL}/verify-email?token=${token}`
  return sendEmail(to, 'Подтвердите email — Razum AI', `
    <div style="${STYLE}">
      <h2 style="color: #4ade80; margin-top: 0;">Razum AI</h2>
      <p>Привет, ${name}!</p>
      <p>Подтвердите ваш email для завершения регистрации:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="${BTN}">Подтвердить email</a>
      </p>
      <p style="font-size: 13px; color: #888;">
        Или скопируйте ссылку:<br/>
        <a href="${link}" style="color: #4ade80; word-break: break-all;">${link}</a>
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
      <h2 style="color: #4ade80; margin-top: 0;">Razum AI</h2>
      <p>Привет, ${name}!</p>
      <p>Вы запросили сброс пароля. Нажмите кнопку ниже:</p>
      <p style="text-align: center; margin: 24px 0;">
        <a href="${link}" style="${BTN}">Сбросить пароль</a>
      </p>
      <p style="font-size: 13px; color: #888;">
        Или скопируйте ссылку:<br/>
        <a href="${link}" style="color: #4ade80; word-break: break-all;">${link}</a>
      </p>
      <p style="font-size: 12px; color: #666; margin-top: 24px;">
        Ссылка действительна 1 час. Если вы не запрашивали сброс — просто проигнорируйте это письмо.
      </p>
    </div>
  `)
}
