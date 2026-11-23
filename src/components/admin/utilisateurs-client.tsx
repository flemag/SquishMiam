"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normaliser } from "@/lib/recherche-recettes";
import { messageErreur } from "@/lib/erreur-api";
import FeuilleModale from "@/components/ui/feuille-modale";

export type UtilisateurAdminVue = {
  id: string;
  nom: string | null;
  email: string;
  role: "ADMIN" | "USER";
  inscription: string;
  recettes: number;
  acces: "illimite" | "actif" | "expire" | "aucun";
  expireLe: string | null;
  estSoi: boolean;
};

type Dialogue =
  | { type: "role"; user: UtilisateurAdminVue; role: "ADMIN" | "USER" }
  | { type: "prolonger"; user: UtilisateurAdminVue; jours: 7 | 30 | 90 | null }
  | { type: "revoquer"; user: UtilisateurAdminVue }
  | null;

export default function UtilisateursClient({ utilisateurs }: { utilisateurs: UtilisateurAdminVue[] }) {
  const router = useRouter();
  const [requete, setRequete] = useState("");
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const utilisateursFiltres = utilisateurs.filter((u) =>
    normaliser(`${u.nom ?? ""} ${u.email}`).includes(normaliser(requete))
  );

  function ouvrirRole(u: UtilisateurAdminVue) {
    if (u.estSoi) return;
    setErreur(null);
    setDialogue({ type: "role", user: u, role: u.role });
  }

  function ouvrirProlonger(u: UtilisateurAdminVue) {
    if (u.acces === "aucun" || u.acces === "illimite" || u.estSoi) return;
    setErreur(null);
    setDialogue({ type: "prolonger", user: u, jours: 30 });
  }

  function ouvrirRevoquer(u: UtilisateurAdminVue) {
    if (u.acces === "aucun" || u.estSoi) return;
    setErreur(null);
    setDialogue({ type: "revoquer", user: u });
  }

  function fermer() {
    if (enCours) return;
    setDialogue(null);
    setErreur(null);
  }

  async function changerRole() {
    if (!dialogue || dialogue.type !== "role") return;
    const { id } = dialogue.user;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: dialogue.role }),
      });
      if (res.ok) {
        const label = dialogue.role === "ADMIN" ? "Admin" : "Membre";
        setMessage({ texte: `Le rôle de ${dialogue.user.nom ?? dialogue.user.email} est maintenant ${label}.`, erreur: false });
        fermer();
        router.refresh();
      } else {
        setErreur(await messageErreur(res, "Changement de rôle impossible — réessaie."));
      }
    } catch {
      setErreur("Changement de rôle impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function prolonger() {
    if (!dialogue || dialogue.type !== "prolonger") return;
    const { id } = dialogue.user;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/acces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jours: dialogue.jours }),
      });
      if (res.ok) {
        setMessage({ texte: `Accès de ${dialogue.user.nom ?? dialogue.user.email} prolongé.`, erreur: false });
        fermer();
        router.refresh();
      } else {
        setErreur(await messageErreur(res, "Prolongation impossible — réessaie."));
      }
    } catch {
      setErreur("Prolongation impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function revoquer() {
    if (!dialogue || dialogue.type !== "revoquer") return;
    const { id } = dialogue.user;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/acces`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setMessage({ texte: `${data.cles} accès révoqué(s) pour ${dialogue.user.nom ?? dialogue.user.email}.`, erreur: false });
        fermer();
        router.refresh();
      } else {
        setErreur(await messageErreur(res, "Révocation impossible — réessaie."));
      }
    } catch {
      setErreur("Révocation impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <label htmlFor="recherche-utilisateur" className="block text-sm font-medium mb-1">
        Rechercher un utilisateur
      </label>
      <input
        id="recherche-utilisateur"
        type="text"
        placeholder="Nom ou email"
        value={requete}
        onChange={(e) => setRequete(e.target.value)}
        className="champ mt-1 min-h-11 w-full"
      />

      {message && (
        <div role="status" aria-live="polite" className={`mb-4 text-sm ${message.erreur ? "text-danger" : "text-[#4A6741]"} `}>
          {message.texte}
        </div>
      )}

      {utilisateursFiltres.length === 0 ? (
        utilisateurs.length === 0 ? (
          <p className="text-sm text-texte-tres-doux">Aucun compte.</p>
        ) : (
          <p className="text-sm text-texte-tres-doux">Aucun utilisateur ne correspond.</p>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {utilisateursFiltres.map((u) => (
            <li key={u.id} className="carte p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{u.nom ?? u.email}</span>
                    {u.nom && (
                      <span className="text-xs text-texte-doux truncate">{u.email}</span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.role === "ADMIN"
                          ? "bg-[#C9B6E4] text-[#43325e]"
                          : "bg-[#A8E6CF] text-[#2e5340]"
                      }`}
                    >
                      {u.role === "ADMIN" ? "Admin" : "Membre"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-texte-doux">
                    <span>
                      {u.acces === "actif"
                        ? `Accès actif jusqu&apos;au ${u.expireLe}`
                        : u.acces === "expire"
                          ? `Accès expiré depuis le ${u.expireLe}`
                          : u.acces === "illimite"
                            ? "Accès illimité"
                            : "Aucune clé d&apos;accès"}
                    </span>
                    <span>Inscrit le {u.inscription} · {u.recettes} recette(s)</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => ouvrirRole(u)}
                    disabled={enCours || u.estSoi}
                    className="bouton-secondaire min-h-11 shrink-0"
                    title={u.estSoi ? "Tu ne peux pas changer ton propre rôle" : undefined}
                  >
                    Rôle
                  </button>
                  <button
                    onClick={() => ouvrirProlonger(u)}
                    disabled={enCours || u.acces === "aucun" || u.acces === "illimite" || u.estSoi}
                    className="bouton-secondaire min-h-11 shrink-0"
                    title={
                      u.acces === "aucun"
                        ? "Aucune clé active à prolonger"
                        : u.acces === "illimite"
                          ? "Accès illimité"
                          : u.estSoi
                            ? undefined
                            : undefined
                    }
                  >
                    Prolonger
                  </button>
                  {!u.estSoi && u.acces !== "aucun" && (
                    <button
                      onClick={() => ouvrirRevoquer(u)}
                      disabled={enCours}
                      className="min-h-11 rounded-full px-3 text-sm text-danger hover:bg-[#FFB5C2]/20 disabled:opacity-60"
                    >
                      Révoquer
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialogue?.type === "role" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Changer le rôle"
          footer={
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fermer}
                disabled={enCours}
                className="bouton-secondaire min-h-11 flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={changerRole}
                disabled={enCours || dialogue.role === dialogue.user.role}
                className="bouton min-h-11 flex-1"
              >
                {enCours ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-texte-doux">Choisis le nouveau rôle pour {dialogue.user.nom ?? dialogue.user.email} :</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Rôle">
              <button
                type="button"
                role="radio"
                aria-checked={dialogue.role === "USER"}
                onClick={() => setDialogue({ ...dialogue, role: "USER" })}
                disabled={enCours}
                className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition ${
                  dialogue.role === "USER"
                    ? "bg-[#4A6741] text-white border-[#4A6741]"
                    : "border-bordure hover:bg-[#A8E6CF]/30"
                }`}
              >
                Membre
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={dialogue.role === "ADMIN"}
                onClick={() => setDialogue({ ...dialogue, role: "ADMIN" })}
                disabled={enCours}
                className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition ${
                  dialogue.role === "ADMIN"
                    ? "bg-[#4A6741] text-white border-[#4A6741]"
                    : "border-bordure hover:bg-[#A8E6CF]/30"
                }`}
              >
                Admin
              </button>
            </div>
            {erreur && (
              <p role="status" aria-live="polite" className="text-sm text-danger">
                {erreur}
              </p>
            )}
          </div>
        </FeuilleModale>
      )}

      {dialogue?.type === "prolonger" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Prolonger l&apos;accès"
          footer={
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fermer}
                disabled={enCours}
                className="bouton-secondaire min-h-11 flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={prolonger}
                disabled={enCours}
                className="bouton min-h-11 flex-1"
              >
                {enCours ? "Prolongation…" : "Prolonger"}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-texte-doux">
              Choisis la durée de prolongation pour {dialogue.user.nom ?? dialogue.user.email} :
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Durée">
              <button
                type="button"
                role="radio"
                aria-checked={dialogue.jours === 7}
                onClick={() => setDialogue({ ...dialogue, jours: 7 })}
                disabled={enCours}
                className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition ${
                  dialogue.jours === 7
                    ? "bg-[#4A6741] text-white border-[#4A6741]"
                    : "border-bordure hover:bg-[#A8E6CF]/30"
                }`}
              >
                +7 jours
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={dialogue.jours === 30}
                onClick={() => setDialogue({ ...dialogue, jours: 30 })}
                disabled={enCours}
                className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition ${
                  dialogue.jours === 30
                    ? "bg-[#4A6741] text-white border-[#4A6741]"
                    : "border-bordure hover:bg-[#A8E6CF]/30"
                }`}
              >
                +30 jours
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={dialogue.jours === 90}
                onClick={() => setDialogue({ ...dialogue, jours: 90 })}
                disabled={enCours}
                className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition ${
                  dialogue.jours === 90
                    ? "bg-[#4A6741] text-white border-[#4A6741]"
                    : "border-bordure hover:bg-[#A8E6CF]/30"
                }`}
              >
                +90 jours
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={dialogue.jours === null}
                onClick={() => setDialogue({ ...dialogue, jours: null })}
                disabled={enCours}
                className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition ${
                  dialogue.jours === null
                    ? "bg-[#4A6741] text-white border-[#4A6741]"
                    : "border-bordure hover:bg-[#A8E6CF]/30"
                }`}
              >
                Illimité
              </button>
            </div>
            {erreur && (
              <p role="status" aria-live="polite" className="text-sm text-danger">
                {erreur}
              </p>
            )}
          </div>
        </FeuilleModale>
      )}

      {dialogue?.type === "revoquer" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Révoquer les accès"
          footer={
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fermer}
                disabled={enCours}
                className="bouton-secondaire min-h-11 flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={revoquer}
                disabled={enCours}
                className="min-h-11 flex-1 rounded-full bg-[#B0413E] px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                {enCours ? "Révocation…" : "Révoquer"}
              </button>
            </div>
          }
        >
          <p className="text-sm text-texte-doux">
            Révoquer tous les accès actifs de {dialogue.user.nom ?? dialogue.user.email} ? Cette action
            coupe l&apos;accès immédiatement.
          </p>
          {erreur && (
            <p role="status" aria-live="polite" className="text-sm text-danger">
              {erreur}
            </p>
          )}
        </FeuilleModale>
      )}
    </div>
  );
}