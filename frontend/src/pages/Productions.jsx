import PageHeader from "../components/PageHeader";
import { LinkCard } from "../components/EventCard";
import { useApi } from "../hooks/useApi";

export default function Productions() {
  const { data, loading } = useApi("/productions");
  const productions = data?.productions || [];

  return (
    <>
      <PageHeader
        title="Our Major Productions"
        subtitle="Large-scale cultural showcases celebrating the beauty and diversity of Sri Lankan performing arts."
      />

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <p className="text-sm text-text-dark-soft">Loading productions...</p>
          ) : productions.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No productions listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {productions.map((p) => (
                <LinkCard
                  key={p.id}
                  to={`/productions/${p.slug}`}
                  image={p.cover_image}
                  title={p.title}
                  subtitle={p.tagline || p.location}
                  ctaLabel="View Production"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
