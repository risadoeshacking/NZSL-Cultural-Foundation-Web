import { Link } from "react-router-dom";
import { useSiteSettings } from "../../context/SiteSettingsContext";

const SOCIAL_KEYS = [
  { key: "facebook_url", label: "Facebook" },
  { key: "instagram_url", label: "Instagram" },
  { key: "youtube_url", label: "YouTube" },
  { key: "twitter_url", label: "X" },
  { key: "linkedin_url", label: "LinkedIn" },
];

const QUICK_LINKS = [
  { to: "/about", label: "About Us" },
  { to: "/events", label: "Events" },
  { to: "/programmes", label: "Programmes" },
  { to: "/membership", label: "Enrol Now" },
];

export default function Footer() {
  const { get } = useSiteSettings();

  const socialLinks = SOCIAL_KEYS.map((s) => ({ ...s, url: get(s.key) })).filter((s) => s.url);

  return (
    <footer className="border-t border-white/10 bg-ink-deep text-warm-white/80">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-display text-lg font-semibold text-warm-white">
              New Zealand Sri Lanka Cultural Foundation
            </span>
          </div>
          <p className="text-sm leading-relaxed text-warm-white/60">
            {get(
              "footer_tagline",
              "Dedicated to preserving, showcasing, and celebrating Sri Lankan culture in Aotearoa New Zealand."
            )}
          </p>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.key}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-xs text-warm-white/70 transition-colors hover:border-gold hover:text-gold"
                  aria-label={s.label}
                >
                  {s.label[0]}
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-gold">
            Quick Links
          </div>
          <ul className="space-y-2 text-sm">
            {QUICK_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-warm-white/70 hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-gold">
            Contact Us
          </div>
          <ul className="space-y-2 text-sm text-warm-white/70">
            <li>{get("contact_address", "Wellington, New Zealand")}</li>
            <li>{get("contact_phone", "+64 4 567 8901")}</li>
            <li>{get("contact_email", "info@nzslcf.org.nz")}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-warm-white/50">
        {get("footer_copyright", "© 2026 New Zealand Sri Lanka Cultural Foundation. All rights reserved.")}
      </div>
    </footer>
  );
}
