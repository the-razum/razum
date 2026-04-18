import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://airazum.com'
const FROM_EMAIL = process.env.EMAIL_FROM || 'Razum AI <noreply@airazum.com>'

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!resend) {
    if (!RESEND_API_KEY) {
      console.warn('[Email] RESEND_API_KEY not set — emails will be logged to console')
      return null
    }
    resend = new Resend(RESEND_API_KEY)
  }
  return resend
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const client = getResend()
  if (!client) {
    console.log(`[Email] TO: ${to}`)
    console.log(`[Email] SUBJECT: ${subject}`)
    console.log(`[Email] (dev mode — no API key)`)
    return true
  }
  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[Email] Resend error:', error)
      return false
    }
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
