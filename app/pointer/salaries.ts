import type { PointerSalarie } from "./PointerClient";

// Salariés disposant d'un lien de pointage web (iPhone, pas d'APK iOS).
// La clé est le slug utilisé dans l'URL : /pointer/<slug>.
//
// Exemple, à remplacer par les vrais salariés de BIG LIGHT une fois créés
// dans la table `salaries` (récupérer leur id UUID depuis le dashboard) :
// export const POINTER_SALARIES: Record<string, PointerSalarie> = {
//   jean: { id: "<uuid-de-jean>", prenom: "Jean", nom: "DUPONT" },
// };
export const POINTER_SALARIES: Record<string, PointerSalarie> = {};
