import { Handshake } from "lucide-react";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useApi } from "../hooks/useApi";

export default function Partners() {
  const { data, loading } = useApi("/sponsors");
  const sponsors = data?.sponsors || [];

  return (
    <>
      <PageHeader
        title="Partners & Sponsors"
        subtitle="The organisations and businesses who support our mission to preserve and celebrate Sri Lankan culture in Aotearoa."
      >
        <div className="mt-4">
          <Link to="/about" className="text-sm font-semibold text-gold hover:text-gold-light">
            ← Back to About Us
          </Link>
        </div>
      </PageHeader>

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <p className="text-sm text-text-dark-soft">Loading partners...</p>
          ) : sponsors.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No partners listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {sponsors.map((s) => {
                const Wrapper = s.website_url ? "a" : "div";
                const linkProps = s.website_url
                  ? { href: s.website_url, target: "_blank", rel: "noopener noreferrer" }
                  : {};
                return (
                  <Wrapper
                    key={s.id}
                    {...linkProps}
                    className="flex flex-col items-center gap-4 rounded-2xl border border-black/5 bg-white p-6 text-center"
                  >
                    <div className="flex h-16 items-center justify-center">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} loading="lazy" className="max-h-16 max-w-[160px] object-contain" />
                      ) : (
                        <Handshake className="text-gold" size={32} />
                      )}
                    </div>
                    <div className="font-display text-base font-semibold text-text-dark">{s.name}</div>
                  </Wrapper>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
