import type { PointerOuvrier } from "./PointerClient";

// Ouvriers disposant d'un lien de pointage web (iPhone, pas d'APK iOS).
// La clé est le slug utilisé dans l'URL : /pointer/<slug>.
//
// Exemple, à remplacer par les vrais ouvriers de BIG LIGHT une fois créés
// dans la table `ouvriers` (récupérer leur id UUID depuis le dashboard) :
// export const POINTER_OUVRIERS: Record<string, PointerOuvrier> = {
//   jean: { id: "<uuid-de-jean>", prenom: "Jean", nom: "DUPONT" },
// };
export const POINTER_OUVRIERS: Record<string, PointerOuvrier> = {};
