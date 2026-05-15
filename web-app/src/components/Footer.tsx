import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.1)',
      padding: '40px 24px 24px',
      color: '#8294a8',
      fontSize: 13,
      marginTop: 60,
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ flex: '1 1 200px' }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: 8 }}>Razum<span style={{ color: '#00e59b' }}>AI</span></div>
            <div style={{ lineHeight: 1.6 }}>
              Открытая AI-платформа без VPN.<br/>
              Чат, API, майнинг на Mac/PC.
            </div>
          </div>
          <div>
            <div style={{ color: '#fff', marginBottom: 8 }}>Продукт</div>
            <Link href='/chat' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Чат</Link>
            <Link href='/agents' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Агенты</Link>
            <Link href='/miner' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Майнинг</Link>
            <Link href='/pricing' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Тарифы</Link>
          </div>
          <div>
            <div style={{ color: '#fff', marginBottom: 8 }}>Чейн</div>
            <Link href='/chain' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Explorer</Link>
            <Link href='/раздача RZM' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Раздача RZM</Link>
            <Link href='/docs' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>API</Link>
            <a href='https://github.com/the-razum' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>GitHub</a>
          </div>
          <div>
            <div style={{ color: '#fff', marginBottom: 8 }}>Компания</div>
            <Link href='/about' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>О проекте</Link>
            <Link href='/roadmap' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Планы развития</Link>
            <Link href='/faq' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>FAQ</Link>
          </div>
          <div>
            <div style={{ color: '#fff', marginBottom: 8 }}>Юр.</div>
            <Link href='/terms' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Условия</Link>
            <Link href='/privacy' style={{ display: 'block', padding: '3px 0', color: 'inherit' }}>Privacy</Link>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span>© 2026 Razum AI · airazum.com</span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>Открытое тестирование · RZM testnet не имеет рыночной стоимости</span>
        </div>
      </div>
    </footer>
  )
}
