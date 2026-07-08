import { useState } from "react";
import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import { EventGridCard } from "../components/EventCard";
import { useApi } from "../hooks/useApi";

const TABS = [
  { id: "upcoming", label: "Upcoming Events" },
  { id: "performances", label: "Performances" },
];

export default function Events() {
  const [tab, setTab] = useState("upcoming");
  const endpoint = tab === "performances" ? "/events?category=performance&limit=50" : "/events?limit=50";
  const { data, loading } = useApi(endpoint, [tab]);

  const events =
    tab === "performances"
      ? data?.events || []
      : (data?.events || []).filter((e) => e.category !== "performance");

  return (
    <>
      <PageHeader title="Events" subtitle="Cultural events, festivals, and performances happening across Aotearoa New Zealand.">
        <div className="mt-4 flex justify-center">
          <Button to="/productions" variant="secondary" className="border-white/25 text-warm-white">
            View Our Productions →
          </Button>
        </div>
      </PageHeader>

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex gap-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  tab === t.id ? "bg-maroon text-warm-white" : "bg-white text-text-dark border border-black/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-text-dark-soft">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-text-dark-soft">No events to show here yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventGridCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
