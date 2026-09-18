import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

function fallo(msg: string) {
  return new NextResponse(`Error de configuración: ${msg}`, {
    status: 500,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  if (!url || !key) {
    return fallo("faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel (Settings → Environment Variables). Después de agregarlas hay que redesplegar.");
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
    return fallo(`NEXT_PUBLIC_SUPABASE_URL no parece una URL de Supabase válida (valor actual: "${url}"). Debe ser como https://abcdefgh.supabase.co`);
  }

  try {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isLogin = request.nextUrl.pathname.startsWith("/login");
    if (!user && !isLogin) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/login";
      return NextResponse.redirect(dest);
    }
    if (user && isLogin) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/";
      return NextResponse.redirect(dest);
    }
    return response;
  } catch (e) {
    return fallo(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
