import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inisialisasi Response Awal
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Setup Supabase Client (Versi Next.js 15/16 Compatible)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Cek User (PENTING: Jangan gunakan getUser() di middleware jika ingin performa cepat, tapi untuk proteksi rute wajib getUser)
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 4. LOGIKA REDIRECT (Sederhana & Anti Loop)

  // A. JIKA BELUM LOGIN
  if (!user) {
    // Blokir akses ke /admin dan /crew
    if (path.startsWith('/admin') || path.startsWith('/crew')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // B. JIKA SUDAH LOGIN
  if (user) {
    const role = user.user_metadata?.role || 'crew';

    // Jika user login mencoba buka halaman login lagi -> Lempar ke dashboard masing-masing
    if (path ===('/login')) {
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', request.url))
      } else {
        return NextResponse.redirect(new URL('/crew/dashboard', request.url))
      }
    }

    // Proteksi Role: Admin Only
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/crew/dashboard', request.url))
    }
  }

  return response
}

export const config = {
  /*
   * Matcher: Terapkan middleware HANYA pada rute yang butuh proteksi
   * Hindari menerapkan pada _next, api, static files, favicon agar tidak "fetch failed" massal
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}