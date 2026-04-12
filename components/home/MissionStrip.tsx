import { getStoreBrand } from "@/app/lib/store-brand";

export function MissionStrip() {
  const { missionParagraph } = getStoreBrand();
  return (
    <section className="border-b border-neutral-200 bg-white py-10 text-center">
      <p className="mx-auto max-w-3xl px-4 text-base leading-relaxed text-neutral-800 sm:px-6 md:text-lg lg:px-8">
        {missionParagraph}
      </p>
    </section>
  );
}
