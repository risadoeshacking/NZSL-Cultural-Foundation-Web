import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import { EventGridCard } from "../components/EventCard";
import { useApi } from "../hooks/useApi";

const BROWSE_TABS = [
  { id: "all", label: "All" },
  { id: "festival", label: "Festival" },
  { id: "cultural", label: "Cultural" },
  { id: "performance", label: "Performance" },
  { id: "workshop", label: "Workshop" },
  { id: "exhibition", label: "Exhibition" },
  { id: "year", label: "By Year" },
];

export default function Events() {
  const [browse, setBrowse] = useState("all");
  const [year, setYear] = useState("");
  const { data, loading } = useApi("/events?limit=200");
  const allEvents = data?.events || [];

  const years = useMemo(() => {
    const set = new Set(allEvents.map((e) => new Date(e.date).getFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [allEvents]);

  const events = useMemo(() => {
    if (browse === "year") {
      return year ? allEvents.filter((e) => new Date(e.date).getFullYear() === Number(year)) : allEvents;
    }
    if (browse === "all") return allEvents;
    return allEvents.filter((e) => e.category === browse);
  }, [allEvents, browse, year]);

  const handleBrowseChange = (id) => {
    setBrowse(id);
    if (id !== "year") setYear("");
  };

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
          <div className="mb-8 flex flex-wrap gap-2">
            {BROWSE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleBrowseChange(t.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  browse === t.id ? "bg-maroon text-warm-white" : "bg-white text-text-dark border border-black/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {browse === "year" && (
            <div className="mb-8">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Years</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

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
