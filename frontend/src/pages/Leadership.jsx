import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import LeaderCard from "../components/LeaderCard";
import { useApi } from "../hooks/useApi";

export default function Leadership() {
  const { data, loading } = useApi("/leadership");
  const leaders = data?.leaders || [];

  return (
    <>
      <PageHeader
        title="Our Leadership"
        subtitle="Meet the dedicated individuals who guide our foundation's mission to preserve and celebrate Sri Lankan culture in New Zealand."
      >
        <div className="mt-4">
          <Button to="/directors" variant="secondary" className="border-white/25 text-warm-white">
            Meet Our Directors →
          </Button>
        </div>
      </PageHeader>

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <p className="text-sm text-text-dark-soft">Loading team...</p>
          ) : leaders.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No team members listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {leaders.map((leader) => (
                <LeaderCard key={leader.id} leader={leader} showDirectorTag />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
