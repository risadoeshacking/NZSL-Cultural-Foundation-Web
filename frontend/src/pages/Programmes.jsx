import PageHeader from "../components/PageHeader";
import { LinkCard } from "../components/EventCard";
import { useApi } from "../hooks/useApi";

export default function Programmes() {
  const { data, loading } = useApi("/programmes");
  const programmes = data?.programmes || [];

  return (
    <>
      <PageHeader
        title="Programmes"
        subtitle="Learn to dance, learn to sing, and grow as part of a vibrant cultural community."
      />

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <p className="text-sm text-text-dark-soft">Loading programmes...</p>
          ) : programmes.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No programmes listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {programmes.map((p) => (
                <LinkCard
                  key={p.id}
                  to={`/programmes/${p.slug}`}
                  image={p.cover_image}
                  title={p.name}
                  subtitle={p.description}
                  ctaLabel="View Programme"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
