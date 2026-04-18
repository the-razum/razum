import { NextRequest } from 'next/server'

/**
 * OpenAI-compatible Models endpoint
 * GET /api/v1/models
 */
export async function GET(_req: NextRequest) {
  return new Response(JSON.stringify({
    object: 'list',
    data: [
      {
        id: 'qwen3.5-9b',
        object: 'model',
        created: 1713400000,
        owned_by: 'razum',
        permission: [],
        root: 'qwen3.5-9b',
        parent: null,
      },
      {
        id: 'deepseek-r1-7b',
        object: 'model',
        created: 1713400000,
        owned_by: 'razum',
        permission: [],
        root: 'deepseek-r1-7b',
        parent: null,
      },
    ],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
