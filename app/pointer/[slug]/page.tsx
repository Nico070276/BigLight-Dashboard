import { notFound } from "next/navigation";
import PointerClient from "../PointerClient";
import { POINTER_SALARIES } from "../salaries";

// Lien de pointage web dédié par salarié : /pointer/<slug> (iPhone, pas d'APK iOS).
export function generateStaticParams() {
  return Object.keys(POINTER_SALARIES).map((slug) => ({ slug }));
}

export default async function PointerSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salarie = POINTER_SALARIES[slug];
  if (!salarie) notFound();
  return <PointerClient salarie={salarie} />;
}
