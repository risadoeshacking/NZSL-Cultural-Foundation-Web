import { CalendarDays, GraduationCap } from "lucide-react";
import Button from "../ui/Button";
import { useSiteSettings } from "../../context/SiteSettingsContext";

export default function Hero() {
  const { get } = useSiteSettings();
  const bannerUrl = get("hero_banner_url") || "/background.jpg";
  const bannerPosition = get("hero_banner_position", "50");

  return (
    <section className="bg-cream px-5 pt-10 pb-16 md:pt-14">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-3xl bg-ink shadow-xl">
        <div className="grid min-h-[55vh] grid-cols-1 md:min-h-[65vh] md:grid-cols-2">
          <div className="flex flex-col justify-center gap-5 px-8 py-12 md:px-14">
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

          <div className="relative min-h-[260px]">
            <div
              className="absolute inset-0 bg-cover"
              style={{ backgroundImage: `url('${bannerUrl}')`, backgroundPosition: `center ${bannerPosition}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent md:bg-gradient-to-l" />
          </div>
        </div>
      </div>
    </section>
  );
}
