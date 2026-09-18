import Image from "next/image";
import { LoginForm } from "./form";

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-line shadow-sm p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Image src="/logo.png" alt="Eats Real" width={96} height={96} priority />
          <h1 className="text-xl font-bold text-brand">Eats Real Admin</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
