import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Button from "../components/ui/Button";
import { EventGridCard } from "../components/EventCard";
import { useApi } from "../hooks/useApi";

// Matches the category options in the admin's event form (public/js/admin.js).
const CATEGORY_LABELS = {
  festival: "Festival",
  cultural: "Cultural",
  performance: "Performance",
  workshop: "Workshop",
  exhibition: "Exhibition",
  community: "Community",
  production: "Production",
  classes: "Classes",
};
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);

export default function Events() {
  const [browse, setBrowse] = useState("all");
  const [year, setYear] = useState("");
  const { data, loading } = useApi("/events?limit=200");
  const allEvents = data?.events || [];

  // Only show a category chip if at least one event actually uses it.
  const categories = useMemo(() => {
    const present = new Set(allEvents.map((e) => e.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [allEvents]);

  const browseTabs = useMemo(
    () => [
      { id: "all", label: "All" },
      ...categories.map((c) => ({ id: c, label: CATEGORY_LABELS[c] || c })),
      { id: "year", label: "By Year" },
    ],
    [categories]
  );

  const years = useMemo(() => {
    const set = new Set(allEvents.map((e) => new Date(e.date).getUTCFullYear()));
    return [...set].sort((a, b) => b - a);
  }, [allEvents]);

  const events = useMemo(() => {
    if (browse === "year") {
      return year ? allEvents.filter((e) => new Date(e.date).getUTCFullYear() === Number(year)) : allEvents;
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
            {browseTabs.map((t) => (
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
