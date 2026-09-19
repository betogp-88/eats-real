import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <Shell email={user?.email}>{children}</Shell>;
}
