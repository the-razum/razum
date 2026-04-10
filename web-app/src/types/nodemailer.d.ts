declare module 'nodemailer' {
  namespace nodemailer {
    interface TransportOptions {
      host?: string
      port?: number
      secure?: boolean
      auth?: { user: string; pass: string }
      [key: string]: any
    }

    interface MailOptions {
      from?: string
      to?: string | string[]
      subject?: string
      text?: string
      html?: string
      [key: string]: any
    }

    interface SentMessageInfo {
      messageId: string
    }

    interface Transporter {
      sendMail(options: MailOptions): Promise<SentMessageInfo>
    }

    function createTransport(options: TransportOptions): Transporter
  }

  export = nodemailer
}
