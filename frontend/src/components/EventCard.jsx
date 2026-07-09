import { Link } from "react-router-dom";
import { getDay, getMonth } from "../utils/date";

const CATEGORY_COLORS = {
  festival: "#d4760a",
  exhibition: "#8b3a9f",
  performance: "#0f9b8e",
  workshop: "#d4760a",
  cultural: "#d4760a",
  general: "#8b3a9f",
  arts: "#8b3a9f",
  culture: "#d4760a",
  heritage: "#ffb300",
  community: "#ffb300",
  production: "#6f1d2e",
  classes: "#2e7d32",
};

function categoryColor(category) {
  return CATEGORY_COLORS[String(category).toLowerCase()] || "#d4760a";
}

/** Full event card with image band, category badge, date badge — used on the /events hub page. */
export function EventGridCard({ event }) {
  const color = categoryColor(event.category);
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div
        className="relative h-40"
        style={{ background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)` }}
      >
        <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur">
          {event.category}
        </div>
        <div className="absolute right-3 top-3 rounded-lg bg-white px-2.5 py-1.5 text-center shadow">
          <div className="font-display text-base font-semibold leading-none text-maroon">
            {getDay(event.date)}
          </div>
          <div className="text-[0.6rem] uppercase tracking-wide text-text-dark-soft">
            {getMonth(event.date)}
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
          {event.category}
        </div>
        <h3 className="mb-1 font-display text-lg font-semibold text-text-dark">{event.title}</h3>
        {event.description && (
          <p className="mb-3 line-clamp-2 text-sm text-text-dark-soft">{event.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-text-dark-soft">
          <span>{event.location || "TBA"}</span>
          <span>
            {event.time_start}
            {event.time_end ? ` – ${event.time_end}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Compact list item with a date badge — used in the homepage's Upcoming Events list. */
export function EventListItem({ event }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-black/5 bg-white p-3">
      <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-cream">
        <div className="font-display text-lg font-semibold leading-none text-maroon">
          {getDay(event.date)}
        </div>
        <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-text-dark-soft">
          {getMonth(event.date)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-text-dark">{event.title}</div>
        <div className="truncate text-xs text-text-dark-soft">
          {event.time_start}
          {event.location ? ` · ${event.location}` : ""}
        </div>
      </div>
      <Link to="/events" className="flex-shrink-0 text-xs font-semibold text-maroon hover:text-maroon-light">
        View Details ›
      </Link>
    </div>
  );
}

/** Image link card — used for Productions/Programmes grids (home preview and hub pages). */
export function LinkCard({ to, image, title, subtitle, ctaLabel = "View More" }) {
  return (
    <Link
      to={to}
      className="group block overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-maroon to-ink-deep">
        {image && (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-4">
        <div className="font-display text-base font-semibold text-text-dark">{title}</div>
        {subtitle && <div className="mt-1 text-xs text-text-dark-soft">{subtitle}</div>}
        <div className="mt-2 text-xs font-semibold text-maroon">{ctaLabel} →</div>
      </div>
    </Link>
  );
}
