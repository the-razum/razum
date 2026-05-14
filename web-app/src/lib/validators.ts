import { z } from 'zod'

export const RegisterSchema = z.object({
  email: z.string().email().max(254),
  name: z.string().min(2).max(100).trim(),
  password: z.string().min(8).max(128),
  ref: z.string().regex(/^[a-f0-9]{0,16}$/).optional().default(''),
})

export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email().max(254),
})

export const ResetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(128),
})

export const AgentCreateSchema = z.object({
  name: z.string().min(1).max(80),
  avatar: z.string().max(10).optional(),
  description: z.string().max(280).optional(),
  systemPrompt: z.string().min(1).max(4000),
  welcomeMessage: z.string().max(500).optional(),
  model: z.enum(['qwen3.5-9b', 'deepseek-r1-7b']).optional(),
  temperature: z.number().min(0).max(1.5).optional(),
  isPublic: z.boolean().optional(),
})

export const FaucetSchema = z.object({
  address: z.string().regex(/^razum1[02-9ac-hj-np-z]{38}$/),
})

export const ChatBodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(8000),
  })).min(1).max(50),
  model: z.string().max(50).optional(),
  webSearch: z.boolean().optional(),
  chatId: z.string().max(64).nullable().optional(),
  thinkingEnabled: z.boolean().optional(),
  agentSlug: z.string().max(40).optional(),
})

// Helper: validate and return either parsed object or NextResponse error
export function validateBody<T>(schema: z.ZodType<T>, data: any): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(data)
  if (r.success) return { ok: true, data: r.data }
  const first = r.error.issues[0]
  return { ok: false, error: `${first.path.join('.')}: ${first.message}` }
}
