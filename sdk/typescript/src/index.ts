/**
 * Razum AI SDK for TypeScript/JavaScript
 *
 * Drop-in replacement for the OpenAI TypeScript SDK.
 *
 * @example
 * import { RazumAI } from 'razum-openai';
 * const client = new RazumAI({ apiKey: 'rzm_api_...' });
 * const response = await client.chat.completions.create({
 *   model: 'qwen3.5-9b',
 *   messages: [{ role: 'user', content: 'Привет' }],
 * });
 */

import OpenAI from 'openai';

const DEFAULT_BASE_URL = 'https://airazum.com/api/v1';

export const MODELS = {
  'qwen3.5-9b': 'Universal model, excellent Russian language',
  'deepseek-r1-7b': 'Reasoning and logic model',
} as const;

export type RazumModel = keyof typeof MODELS;

export interface RazumAIOptions {
  apiKey?: string;
  baseURL?: string;
  [key: string]: any;
}

export class RazumAI extends OpenAI {
  constructor(options: RazumAIOptions = {}) {
    const apiKey = options.apiKey || process.env.RAZUM_API_KEY || '';
    if (!apiKey) {
      throw new Error(
        'API key required. Get one at https://airazum.com/account\n' +
        'Pass apiKey option or set RAZUM_API_KEY environment variable.'
      );
    }
    super({
      apiKey,
      baseURL: options.baseURL || DEFAULT_BASE_URL,
      ...options,
    });
  }

  static listModels(): typeof MODELS {
    return MODELS;
  }
}

export default RazumAI;
