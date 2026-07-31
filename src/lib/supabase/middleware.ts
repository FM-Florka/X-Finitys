import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  canAccessPengumuman,
  canView,
  dashboardHome,
  moduleForDashboardPath,
  type AppRole,
} from '@/lib/roles'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // PENTING: jangan hapus getUser(). Wajib dipanggil biar session di-refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Tidak ada landing publik: root selalu ke login (atau dashboard kalau sudah login).
  // Berlaku sama untuk browser web maupun WebView app Android.
  if (path === '/') {
    const url = request.nextUrl.clone()
    url.pathname = user ? '/dashboard' : '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Semua halaman wajib login. Hanya /login (+ auth callback) terbuka untuk guest.
  const GUEST_PATHS = ['/login', '/auth']
  const isGuestPath = GUEST_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`)
  )

  if (!user && !isGuestPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(url)
  }

  // User yang sudah login tidak perlu form login — kecuali ada ?error=
  // (biar pesan error/self-heal signOut tetap terlihat, tidak loop).
  if (user && path === '/login') {
    const hasError = request.nextUrl.searchParams.has('error')
    if (!hasError) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // Route guard per role — modul dashboard di luar ringkasan & data saya
  if (user && path.startsWith('/dashboard')) {
    const module = moduleForDashboardPath(path)
    if (module) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      const role = (profile?.role as AppRole | undefined) ?? undefined
      const allowed =
        module === 'pengumuman'
          ? canAccessPengumuman(role)
          : canView(role, module)
      if (!allowed) {
        const url = request.nextUrl.clone()
        url.pathname = dashboardHome(role)
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
  }

  // PENTING: kembalikan supabaseResponse apa adanya (bawa cookies session).
  return supabaseResponse
}
