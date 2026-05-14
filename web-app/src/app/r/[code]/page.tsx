import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default function ReferralPage({ params }: { params: { code: string } }) {
  const code = (params.code || '').slice(0, 16).replace(/[^a-f0-9]/gi, '')
  if (code) {
    cookies().set('razum_ref', code, { httpOnly: false, maxAge: 30*24*3600, path: '/' })
  }
  redirect('/register?invited=1')
}
