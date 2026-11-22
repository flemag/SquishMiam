"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FeuilleModale from "@/components/ui/feuille-modale";
import MiamzSvg from "./svg";
import { animationPourHumeur, BOUCHES } from "./visuels";
import type { HumeurId } from "@/lib/humeurs";
import type { ReponseMiamz } from "@/lib/chat-miamz";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  humeur?: HumeurId;
  actions?: ReponseMiamz["actions"];
};

const SUGGESTIONS = [
  "Qu'est-ce qu'on mange ce soir ? 🍙",
  "Idée rapide en moins de 20 min ⏱️",
  "Un repas végétarien 🌱",
];

export default function FeuilleChatMiamz({
  ouvert,
  onFermer,
  humeurInitiale = "content",
}: {
  ouvert: boolean;
  onFermer: () => void;
  humeurInitiale?: HumeurId;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "bienvenue",
      role: "assistant",
      content:
        "Coucou ! Je suis Miamz, ton petit compagnon repas. Dis-moi tout : qu'est-ce qui te ferait plaisir aujourd'hui ?",
      humeur: "content",
    },
  ]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [humeurMiamz, setHumeurMiamz] = useState<HumeurId>(humeurInitiale);
  const finMessagesRef = useRef<HTMLDivElement>(null);
  const envoiEnCoursRef = useRef(false);
  const compteurRef = useRef(0);

  const nouvelId = (prefixe: string) => `${prefixe}-${++compteurRef.current}`;

  useEffect(() => {
    if (!ouvert) return;
    const doux =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    finMessagesRef.current?.scrollIntoView({ behavior: doux ? "auto" : "smooth" });
  }, [messages, enCours, ouvert]);

  async function envoyerMessage(texteAEnvoyer?: string) {
    const texte = (texteAEnvoyer ?? saisie).trim();
    // Verrou synchrone : deux appuis rapides ne peuvent pas envoyer deux fois.
    if (!texte || enCours || envoiEnCoursRef.current) return;
    envoiEnCoursRef.current = true;

    const messageUtilisateur: Message = {
      id: nouvelId("user"),
      role: "user",
      content: texte,
    };

    setMessages((prev) => [...prev, messageUtilisateur]);
    setSaisie("");
    setEnCours(true);

    try {
      // Six échanges maximum (douze messages), comme côté serveur.
      const historique = messages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/miamz/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: texte, historique }),
      });

      const data: (ReponseMiamz & { error?: string }) | null = await res.json().catch(() => null);

      if (!res.ok) {
        const messageServeur =
          res.status === 401
            ? "Ta session a expiré. Reconnecte-toi pour continuer à discuter avec moi !"
            : typeof data?.error === "string"
              ? data.error
              : "Oups ! Je n'arrive pas à joindre mon petit réseau culinaire. Réessaie dans un instant !";
        throw new Error(messageServeur);
      }

      if (!data || typeof data.reponse !== "string") {
        throw new Error("Miam ! J'ai eu un petit trou de mémoire. Réessaie dans un instant !");
      }

      setHumeurMiamz(data.humeur || "content");

      const messageMiamz: Message = {
        id: nouvelId("assistant"),
        role: "assistant",
        content: data.reponse,
        humeur: data.humeur,
        actions: data.actions,
      };

      setMessages((prev) => [...prev, messageMiamz]);
    } catch (erreur) {
      setMessages((prev) => [
        ...prev,
        {
          id: nouvelId("err"),
          role: "assistant",
          content:
            erreur instanceof Error
              ? erreur.message
              : "Oups ! Je n'arrive pas à me connecter au réseau culinaire. Réessaie dans un instant !",
          humeur: "inquiet",
        },
      ]);
    } finally {
      envoiEnCoursRef.current = false;
      setEnCours(false);
    }
  }

  return (
    <FeuilleModale
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Discuter avec Miamz"
    >
      <div className="flex h-[60dvh] flex-col">
        {/* En-tête Miamz animé */}
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[#A8E6CF]/20 p-3">
          <MiamzSvg
            taille={48}
            pose={humeurMiamz}
            bouche={BOUCHES[humeurMiamz] ?? "sourire"}
            animation={animationPourHumeur(humeurMiamz)}
            className="h-12 w-12 shrink-0"
          />
          <div>
            <p className="text-sm font-semibold text-miamz-vert">Miamz</p>
            <p className="text-xs text-texte-doux">Ton compagnon repas</p>
          </div>
        </div>

        {/* Liste des messages */}
        <div
          role="log"
          aria-live="polite"
          className="flex-1 space-y-3 overflow-y-auto px-1 py-2"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-xs bg-[#4A6741] text-white"
                    : "rounded-bl-xs border border-bordure bg-white text-foreground shadow-xs"
                }`}
              >
                {m.content}
              </div>

              {/* Actions interactives */}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.actions.map((act, i) => (
                    <Link
                      key={i}
                      href={act.lien}
                      onClick={onFermer}
                      className="bouton-secondaire min-h-11 px-3 text-xs"
                    >
                      {act.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {enCours && (
            <div className="flex items-center gap-2 text-xs text-texte-doux">
              <span className="inline-block animate-bounce motion-reduce:animate-none">🍙</span>
              Miamz réfléchit…
            </div>
          )}
          <div ref={finMessagesRef} />
        </div>

        {/* Suggestions rapides (si peu de messages) */}
        {messages.length <= 2 && (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => envoyerMessage(sug)}
                disabled={enCours}
                className="min-h-11 shrink-0 rounded-full border border-bordure bg-white px-3 text-xs text-texte-doux hover:bg-[#A8E6CF]/20"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        {/* Zone de saisie */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            envoyerMessage();
          }}
          className="mt-2 flex gap-2 border-t border-bordure pt-3"
        >
          <input
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Pose ta question à Miamz…"
            aria-label="Message pour Miamz"
            maxLength={500}
            className="champ min-w-0 flex-1 rounded-full px-4"
          />
          <button
            type="submit"
            disabled={!saisie.trim() || enCours}
            className="bouton min-h-11 rounded-full px-5"
          >
            Envoyer
          </button>
        </form>
      </div>
    </FeuilleModale>
  );
}
