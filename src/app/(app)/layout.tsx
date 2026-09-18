import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex-1 flex min-h-screen">
      <aside className="w-60 shrink-0 bg-brand text-white flex flex-col">
        <div className="flex items-center gap-3 px-5 py-5">
          <Image src="/logo.png" alt="" width={44} height={44} className="rounded-full bg-white/10 p-0.5" />
          <div>
            <p className="font-bold leading-tight">Eats Real</p>
            <p className="text-xs text-white/60">Admin</p>
          </div>
        </div>
        <Nav />
        <div className="mt-auto px-5 py-4 border-t border-white/10">
          <p className="text-xs text-white/60 truncate">{user?.email}</p>
          <form action={logout}>
            <button className="text-xs text-white/80 hover:text-white mt-1">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
    </div>
  );
}
