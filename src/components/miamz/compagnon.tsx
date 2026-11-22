"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { pickMessage, pickVariante, type HumeurId } from "@/lib/humeurs";
import { evaluerHumeur, type ContexteMiamz } from "@/lib/moteur-humeur";
import { regardVers } from "@/lib/regard";
import { bullesPourChemin } from "@/lib/themes";
import { MiamzContext } from "./contexte";
import MiamzSvg from "./svg";
import FeuilleChatMiamz from "./feuille-chat";
import { ANIMATIONS, BOUCHES } from "./visuels";

const MINUTE = 60_000;
const DUREE_BULLE_MS = 6000;
const DUREE_REBOND_MS = 600;
/** Un événement de moins de 2 min justifie une bulle spontanée. */
const EVENEMENT_FRAIS_MS = 2 * MINUTE;

const graineMinute = () => Math.floor(Date.now() / MINUTE);

/**
 * Widget compagnon vivant : fixed bas-droite, zone cliquable = le SVG seul
 * (le conteneur ne capte aucun clic, la bulle ne bloque rien). Recalcule
 * l'humeur au montage, toutes les 30 s et à chaque événement du contexte ;
 * tolère un contexte absent (avant le Task 5) : horloge seule. Au tap :
 * rebond + bulle contextuelle à la page (bullesPourChemin), sans toucher
 * au moteur d'humeur.
 */
export default function Compagnon() {
  const miamz = useContext(MiamzContext);
  const pathname = usePathname();
  const [humeur, setHumeur] = useState<HumeurId>("content");
  const [variante, setVariante] = useState(0);
  const [bulle, setBulle] = useState<string | null>(null);
  const [chatOuvert, setChatOuvert] = useState(false);
  const [rebond, setRebond] = useState(false);
  const [regard, setRegard] = useState({ dx: 0, dy: 0 });
  const [aSouris, setASouris] = useState(false);

  const racineRef = useRef<HTMLDivElement>(null);
  const humeurPrecedente = useRef<HumeurId>("content");
  const minuteurBulle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minuteurRebond = useRef<ReturnType<typeof setTimeout> | null>(null);

  const afficheBulle = useCallback((texte: string) => {
    setBulle(texte);
    if (minuteurBulle.current) clearTimeout(minuteurBulle.current);
    minuteurBulle.current = setTimeout(() => setBulle(null), DUREE_BULLE_MS);
  }, []);

  const montreBulle = useCallback(
    (h: HumeurId) => {
      afficheBulle(pickMessage(h, graineMinute()));
    },
    [afficheBulle]
  );

  /** Humeur = horloge + événements du contexte, avec l'âge rafraîchi. */
  const recalcule = useCallback(() => {
    const maintenant = new Date();
    let dernierEvenement: ContexteMiamz["dernierEvenement"] = null;
    if (miamz?.dernierEvenement) {
      const { type } = miamz.dernierEvenement;
      const horodatage = miamz.dernierEvenementHorodatage;
      const age =
        horodatage === null
          ? miamz.dernierEvenement.ilYAms
          : Math.max(0, maintenant.getTime() - horodatage);
      dernierEvenement = { type, ilYAms: age };
    }

    const humeurSuivante = evaluerHumeur({
      maintenant,
      repasSemaine: miamz?.repasSemaine ?? 0,
      dernierEvenement,
    });
    // Graine = minute courante : stable intra-minute, varié inter-minutes.
    const graine = Math.floor(maintenant.getTime() / MINUTE);
    setHumeur(humeurSuivante);
    setVariante(pickVariante(humeurSuivante, graine));

    if (humeurSuivante !== humeurPrecedente.current) {
      humeurPrecedente.current = humeurSuivante;
      // Bulle spontanée uniquement pour un changement causé par un événement
      // frais — jamais la nuit (endormi dort en silence).
      const evenementFrais =
        dernierEvenement !== null && dernierEvenement.ilYAms < EVENEMENT_FRAIS_MS;
      if (evenementFrais && humeurSuivante !== "endormi") montreBulle(humeurSuivante);
    }
  }, [miamz, montreBulle]);

  // Au montage, à chaque événement du contexte (recalcule change), et toutes les 30 s.
  useEffect(() => {
    recalcule();
    const intervalle = setInterval(recalcule, 30_000);
    return () => clearInterval(intervalle);
  }, [recalcule]);

  // Regard : suit la souris (desktop), dérive au repos (tactile). Jamais en reduced-motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let image = 0;
    const bouge = (e: MouseEvent) => {
      setASouris(true);
      if (image) return;
      image = requestAnimationFrame(() => {
        image = 0;
        const boite = racineRef.current?.getBoundingClientRect();
        if (!boite) return;
        const suivant = regardVers(e.clientX, e.clientY, {
          x: boite.x,
          y: boite.y,
          largeur: boite.width,
          hauteur: boite.height,
        });
        setRegard((precedent) =>
          precedent.dx === suivant.dx && precedent.dy === suivant.dy ? precedent : suivant
        );
      });
    };
    window.addEventListener("mousemove", bouge);
    return () => {
      window.removeEventListener("mousemove", bouge);
      if (image) cancelAnimationFrame(image);
    };
  }, []);

  // Nettoyage des minuteries de bulle et de rebond.
  useEffect(
    () => () => {
      if (minuteurBulle.current) clearTimeout(minuteurBulle.current);
      if (minuteurRebond.current) clearTimeout(minuteurRebond.current);
    },
    []
  );

  const auClic = () => {
    // rAF pour rejouer l'animation même si un rebond était en cours.
    setRebond(false);
    requestAnimationFrame(() => setRebond(true));
    if (minuteurRebond.current) clearTimeout(minuteurRebond.current);
    minuteurRebond.current = setTimeout(() => setRebond(false), DUREE_REBOND_MS);
    // Bulle contextuelle à la page (jamais de message d'humeur au tap).
    const pool = bullesPourChemin(pathname);
    afficheBulle(pool[graineMinute() % pool.length]);
  };

  const animation = rebond
    ? "miamz-rebond 600ms cubic-bezier(0.34, 1.56, 0.64, 1)"
    : (ANIMATIONS[humeur][variante] ?? ANIMATIONS[humeur][0] ?? "");

  return (
    <>
      <div
        data-regard={aSouris ? "souris" : "idle"}
        className="pointer-events-none fixed bottom-[calc(4.5rem+max(env(safe-area-inset-bottom),0.25rem))] right-3 z-40 sm:bottom-[max(env(safe-area-inset-bottom),1rem)] sm:right-5"
      >
        <div className="flex flex-col items-end gap-2">
          <div
            aria-live="polite"
            className={`miamz-bulle max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl rounded-br-sm border border-bordure bg-white/95 px-3 py-2 text-center text-sm text-miamz-vert shadow-md ${
              bulle ? "" : "hidden"
            }`}
          >
            <p>{bulle}</p>
            <button
              type="button"
              onClick={() => setChatOuvert(true)}
              className="pointer-events-auto mt-1 inline-flex min-h-11 items-center gap-1 rounded-full bg-[#A8E6CF]/30 px-3 text-xs font-semibold text-[#4A6741] hover:bg-[#A8E6CF]/50"
            >
              💬 Discuter avec moi
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChatOuvert(true)}
              aria-label="Discuter avec Miamz"
              className="pointer-events-auto flex h-11 items-center gap-1.5 rounded-full border border-bordure bg-white/95 px-3.5 text-xs font-medium text-miamz-vert shadow-sm transition hover:bg-[#A8E6CF]/30 focus-visible:outline-2 focus-visible:outline-[#e07a5f]"
            >
              <span>💬</span>
              <span className="hidden sm:inline">Discuter</span>
            </button>
            <button
              type="button"
              onClick={auClic}
              aria-label="Miamz, ton compagnon repas"
              className="pointer-events-auto block rounded-full focus-visible:outline-2 focus-visible:outline-[#e07a5f]"
            >
              <div ref={racineRef}>
                <MiamzSvg
                  taille={72}
                  yeux={regard}
                  bouche={BOUCHES[humeur] ?? "sourire"}
                  pose={humeur}
                  variante={variante}
                  animation={animation}
                  className="h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]"
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Hors du conteneur pointer-events-none : la feuille modale doit rester
          interactive (saisie, suggestions, fermeture au toucher). */}
      <FeuilleChatMiamz
        ouvert={chatOuvert}
        onFermer={() => setChatOuvert(false)}
        humeurInitiale={humeur}
      />
    </>
  );
}
