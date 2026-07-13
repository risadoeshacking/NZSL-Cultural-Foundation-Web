import { useApi } from "../../hooks/useApi";
import SectionHeader from "../ui/SectionHeader";
import Button from "../ui/Button";
import Marquee from "../Marquee";

export default function Partners() {
  const { data, loading } = useApi("/sponsors");
  const sponsors = data?.sponsors || [];

  if (!loading && sponsors.length === 0) return null;

  return (
    <section className="bg-cream px-5 py-14">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Supported By" title="Our Partners & Sponsors" className="mb-8 text-center" center />
        {loading ? (
          <div className="flex justify-center gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 w-32 animate-pulse rounded-lg bg-black/5" />
            ))}
          </div>
        ) : (
          <Marquee>
            {sponsors.map((s) => (
              <a
                key={s.id}
                href={s.website_url || "/partners"}
                target={s.website_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex h-16 items-center justify-center rounded-lg bg-white px-6 shadow-sm"
                title={s.name}
              >
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} loading="lazy" className="max-h-10 max-w-[140px] object-contain" />
                ) : (
                  <span className="text-sm font-semibold text-text-dark">{s.name}</span>
                )}
              </a>
            ))}
          </Marquee>
        )}
        <div className="mt-8 text-center">
          <Button to="/partners" variant="secondary" className="border-text-dark/20 text-text-dark">
            View All Partners
          </Button>
        </div>
      </div>
    </section>
  );
}
