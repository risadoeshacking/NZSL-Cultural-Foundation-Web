import { CalendarDays, GraduationCap } from "lucide-react";
import Button from "../ui/Button";
import { useSiteSettings } from "../../context/SiteSettingsContext";

export default function Hero() {
  const { get } = useSiteSettings();
  const bannerUrl = get("hero_banner_url") || "/background.jpg";
  const bannerPosition = get("hero_banner_position", "50");

  return (
    <section className="bg-cream px-5 pt-10 pb-16 md:pt-14">
      <div className="relative min-h-[55vh] overflow-hidden rounded-3xl bg-ink shadow-xl md:min-h-[65vh]">
        <div
          className="absolute inset-0 bg-cover"
          style={{ backgroundImage: `url('${bannerUrl}')`, backgroundPosition: `center ${bannerPosition}%` }}
        />
        {/* Dark on the text side, fading smoothly into the photo — no hard seam. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(13,10,8,0.92) 0%, rgba(13,10,8,0.8) 30%, rgba(13,10,8,0.4) 55%, rgba(13,10,8,0.12) 78%, transparent 100%), linear-gradient(0deg, rgba(13,10,8,0.55) 0%, transparent 45%)",
          }}
        />

        <div className="relative flex min-h-[55vh] max-w-xl flex-col justify-center gap-5 px-8 py-12 md:min-h-[65vh] md:px-14">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-warm-white/70">
            New Zealand Sri Lanka Cultural Foundation
          </div>
          <h1 className="font-display text-4xl font-semibold leading-tight text-warm-white md:text-5xl">
            Preserving Heritage.
            <br />
            <span className="text-gold">Inspiring Generations.</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-warm-white/70 md:text-base">
            Promoting Sri Lankan culture, arts and heritage in New Zealand through dance, music
            and community.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button to="/events" variant="gold">
              <CalendarDays size={16} /> Upcoming Events
            </Button>
            <Button to="/membership" variant="secondary" className="text-warm-white border-white/25">
              <GraduationCap size={16} /> Enrol in Classes
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
