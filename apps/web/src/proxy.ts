import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Protects /adminqrcode: refreshes the Supabase session cookie and redirects
// unauthenticated visitors to the login screen. Runs ONLY on admin routes
// (see matcher) so the public site is untouched. (Next 16 "proxy" convention,
// formerly "middleware".)
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/adminqrcode/login";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Not configured yet: only the login screen is reachable (it shows a notice).
  if (!url || !anonKey) {
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL("/adminqrcode/login", req.url));
  }

  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of toSet) res.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/adminqrcode/login", req.url));
  }
  if (user && isLogin) {
    return NextResponse.redirect(new URL("/adminqrcode", req.url));
  }
  return res;
}

export const config = {
  matcher: ["/adminqrcode/:path*"],
};
