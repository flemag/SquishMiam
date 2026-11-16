"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function ConnexionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const erreurCle = searchParams.get("erreur") === "cle";
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function activerCle() {
    if (!code.trim()) {
      setMessage("Entre un code d'activation.");
      return;
    }
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cles/activer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        router.push("/plan");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Ce code est inconnu ou déjà utilisé.");
      }
    } catch {
      setMessage("Connexion impossible. Réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF9E6] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg shadow-[#FFB5C2]/20">
        <div className="mb-6 text-center">
          <div className="text-5xl">🍙</div>
          <h1 className="mt-3 text-3xl font-semibold text-[#4A6741]">Miamz</h1>
          <p className="mt-1 text-sm text-gray-500">Ton compagnon repas. Bien manger, sans charge mentale.</p>
        </div>

        {erreurCle && (
          <p className="mb-4 rounded-2xl bg-[#FFB5C2]/20 px-4 py-3 text-center text-sm text-[#B0413E]">
            Il te faut une clé d&apos;activation valide pour entrer. 🥕
          </p>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/plan" })}
          className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Continuer avec Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          ou activer une clé
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MIAMZ-XXXX-XXXX-XXXX"
            className="w-full rounded-full border border-gray-200 px-4 py-3 text-center font-mono tracking-wider outline-none focus:border-[#A8E6CF]"
          />
          <button
            onClick={activerCle}
            disabled={enCours}
            className="w-full rounded-full bg-[#4A6741] px-4 py-3 font-medium text-white transition hover:bg-[#3d5535] disabled:opacity-50"
          >
            {enCours ? "Activation…" : "Activer ma clé"}
          </button>
          {message && <p className="text-center text-sm text-[#B0413E]">{message}</p>}
        </div>
      </div>
    </main>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense>
      <ConnexionContent />
    </Suspense>
  );
}
