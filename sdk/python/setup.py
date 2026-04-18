from setuptools import setup, find_packages

setup(
    name='razum-openai',
    version='0.1.0',
    description='Razum AI SDK — Drop-in OpenAI replacement for decentralized AI inference',
    long_description=open('README.md').read() if __import__('os').path.exists('README.md') else '',
    long_description_content_type='text/markdown',
    author='Razum AI Team',
    author_email='dev@airazum.com',
    url='https://github.com/the-razum/razum-openai',
    packages=find_packages(),
    install_requires=['openai>=1.0.0'],
    python_requires='>=3.8',
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
    ],
    keywords='razum ai openai llm decentralized gpu inference',
)
