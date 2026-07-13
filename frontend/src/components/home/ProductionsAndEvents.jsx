import { useApi } from "../../hooks/useApi";
import SectionHeader from "../ui/SectionHeader";
import Button from "../ui/Button";
import { LinkCard, EventListItem } from "../EventCard";
import { isUpcoming } from "../../utils/date";

export default function ProductionsAndEvents() {
  const { data: productionsData, loading: productionsLoading } = useApi("/productions");
  const { data: eventsData, loading: eventsLoading } = useApi("/events?limit=100");

  const productions = (productionsData?.productions || []).slice(0, 3);
  const events = (eventsData?.events || []).filter((e) => isUpcoming(e.date)).slice(0, 5);

  return (
    <section className="bg-cream px-5 py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionHeader eyebrow="Festivals & Productions" title="Our Major Productions" className="mb-8" />
          {productionsLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="aspect-4/3 animate-pulse rounded-2xl bg-black/5" />
              ))}
            </div>
          ) : productions.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No productions listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
          <div className="mt-6 text-center">
            <Button to="/productions" variant="primary">
              View All Productions
            </Button>
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="What's On" title="Upcoming Events" className="mb-8" />
          {eventsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-black/5" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No upcoming events yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {events.map((ev) => (
                <EventListItem key={ev.id} event={ev} />
              ))}
            </div>
          )}
          <div className="mt-4 text-right">
            <Button to="/events" variant="secondary" className="border-text-dark/20 text-text-dark">
              View All Events
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
