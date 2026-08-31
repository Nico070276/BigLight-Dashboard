import { notFound } from "next/navigation";
import PointerClient from "../PointerClient";
import { POINTER_OUVRIERS } from "../ouvriers";

// Lien de pointage web dédié par ouvrier : /pointer/<slug> (iPhone, pas d'APK iOS).
export function generateStaticParams() {
  return Object.keys(POINTER_OUVRIERS).map((slug) => ({ slug }));
}

export default async function PointerSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ouvrier = POINTER_OUVRIERS[slug];
  if (!ouvrier) notFound();
  return <PointerClient ouvrier={ouvrier} />;
}
