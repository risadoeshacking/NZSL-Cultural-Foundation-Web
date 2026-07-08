import { Link } from "react-router-dom";
import { getDay, getMonth } from "../utils/date";

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
