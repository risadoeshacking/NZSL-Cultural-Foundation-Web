import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About Us" },
  { to: "/events", label: "Events" },
  { to: "/programmes", label: "Programmes" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact Us" },
];

function linkClass({ isActive }) {
  return [
    "text-sm font-medium tracking-wide transition-colors",
    isActive ? "text-maroon" : "text-text-dark/70 hover:text-maroon",
  ].join(" ");
}

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
        <NavLink to="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="New Zealand Sri Lanka Cultural Foundation"
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
          <span className="min-w-0 truncate font-display text-lg font-semibold text-text-dark">
            New Zealand Sri Lanka Cultural Foundation
          </span>
        </NavLink>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <NavLink
          to="/membership"
          className="hidden rounded-full bg-gold px-5 py-2 text-sm font-semibold text-text-dark transition-colors hover:bg-gold-light md:inline-block"
        >
          Enrol Now
        </NavLink>

        <button
          type="button"
          aria-label="Toggle navigation"
          className="text-text-dark md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="flex flex-col gap-1 border-t border-black/5 bg-cream px-5 py-4 md:hidden">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <span className="block py-2">{link.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/membership"
            className="mt-2 rounded-full bg-gold px-5 py-2 text-center text-sm font-semibold text-text-dark"
            onClick={() => setMobileOpen(false)}
          >
            Enrol Now
          </NavLink>
        </nav>
      )}
    </header>
  );
}
