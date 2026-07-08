import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import LeaderCard from "../components/LeaderCard";
import { useApi } from "../hooks/useApi";

export default function Directors() {
  const { data, loading } = useApi("/leadership?category=director");
  const directors = data?.leaders || [];

  return (
    <>
      <PageHeader title="Our Directors" subtitle="Meet our Directors and read their biographies.">
        <div className="mt-4">
          <Button to="/leadership" variant="secondary" className="border-white/25 text-warm-white">
            Meet the Full Team →
          </Button>
        </div>
      </PageHeader>

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <p className="text-sm text-text-dark-soft">Loading directors...</p>
          ) : directors.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No directors listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {directors.map((leader) => (
                <LeaderCard key={leader.id} leader={leader} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
