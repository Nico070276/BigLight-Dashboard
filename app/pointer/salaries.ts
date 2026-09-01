import type { PointerSalarie } from "./PointerClient";

// Salariés disposant d'un lien de pointage web (iPhone, pas d'APK iOS).
// La clé est le slug utilisé dans l'URL : /pointer/<slug>.
export const POINTER_SALARIES: Record<string, PointerSalarie> = {
  houssama: { id: "0739053b-b4b7-40c9-8689-95ca8d03f14b", prenom: "Houssama", nom: "LERLOUCH" },
  hicham: { id: "eb28b229-b01f-4fc0-8505-5fb75f199a5d", prenom: "Hicham", nom: "MALLOW" },
  // ⚠️ Nom de famille à corriger dans le dashboard (contient encore le texte
  // indicatif "nom de famille" saisi par erreur) — mettre à jour ici une fois fait.
  nuno: { id: "55731c81-eebf-4e6f-afb2-6131bedf5919", prenom: "Nuno", nom: "nom de famille" },
};
