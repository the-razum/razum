# Razum AI SDK for Python

Drop-in replacement for the OpenAI Python SDK. Route your AI requests through the Razum decentralized GPU network.

## Installation

```bash
pip install razum-openai
```

## Quick Start

```python
from razum_openai import RazumAI

client = RazumAI(api_key='rzm_api_...')

# Non-streaming
response = client.chat.completions.create(
    model='qwen3.5-9b',
    messages=[{'role': 'user', 'content': 'Что такое Razum AI?'}]
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model='deepseek-r1-7b',
    messages=[{'role': 'user', 'content': 'Реши задачу: 15 * 17'}],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end='')
```

## Or use OpenAI SDK directly

```python
from openai import OpenAI

client = OpenAI(
    base_url='https://airazum.com/api/v1',
    api_key='rzm_api_...'
)
# Same API as OpenAI — just different base_url
```

## Available Models

| Model | Description |
|-------|-------------|
| qwen3.5-9b | Universal model, excellent Russian |
| deepseek-r1-7b | Reasoning and logic |

## Get API Key

1. Register at https://airazum.com/register
2. Go to Account → Generate API Key
3. Use the key with this SDK

## License

MIT
