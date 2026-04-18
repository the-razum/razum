"""
Razum AI SDK — Drop-in replacement for OpenAI Python SDK.

Usage:
    from razum_openai import RazumAI
    client = RazumAI(api_key='rzm_api_...')
    response = client.chat.completions.create(
        model='qwen3.5-9b',
        messages=[{'role': 'user', 'content': 'Привет'}]
    )
    print(response.choices[0].message.content)

Or use standard OpenAI SDK directly:
    from openai import OpenAI
    client = OpenAI(base_url='https://airazum.com/api/v1', api_key='rzm_api_...')
"""

__version__ = '0.1.0'

from openai import OpenAI

DEFAULT_BASE_URL = 'https://airazum.com/api/v1'

MODELS = {
    'qwen3.5-9b': 'Universal model, excellent Russian language',
    'deepseek-r1-7b': 'Reasoning and logic model',
}


class RazumAI(OpenAI):
    """
    Razum AI client — extends OpenAI SDK with Razum defaults.
    
    All OpenAI SDK features work: streaming, async, tools, etc.
    Just change the import and you're good to go.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        **kwargs,
    ):
        import os
        key = api_key or os.environ.get('RAZUM_API_KEY', '')
        if not key:
            raise ValueError(
                'API key required. Get one at https://airazum.com/account\n'
                'Pass api_key= or set RAZUM_API_KEY environment variable.'
            )
        super().__init__(api_key=key, base_url=base_url, **kwargs)

    @staticmethod
    def list_models() -> dict:
        """List available Razum AI models."""
        return MODELS
