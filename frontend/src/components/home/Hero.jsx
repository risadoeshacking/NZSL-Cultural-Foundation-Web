import { useEffect, useState } from "react";
import { CalendarDays, GraduationCap } from "lucide-react";
import Button from "../ui/Button";
import { useSiteSettings } from "../../context/SiteSettingsContext";

const HERO_SLOT_KEYS = [
  "hero_banner_url",
  "hero_banner_url_2",
  "hero_banner_url_3",
  "hero_banner_url_4",
  "hero_banner_url_5",
  "hero_banner_url_6",
  "hero_banner_url_7",
  "hero_banner_url_8",
];

export default function Hero() {
  const { get } = useSiteSettings();
  const bannerPosition = get("hero_banner_position", "50");
  const transition = get("hero_banner_transition", "fade");
  const durationMs = (Number(get("hero_banner_duration", "6")) || 6) * 1000;
  const photos = HERO_SLOT_KEYS.map((key) => get(key)).filter(Boolean);
  const slides = photos.length > 0 ? photos : ["/background.jpg"];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, durationMs);
    return () => clearInterval(id);
  }, [slides.length, durationMs, transition]);

  return (
    <section className="bg-cream px-5 pt-10 pb-16 md:pt-14">
      <div className="relative min-h-[55vh] overflow-hidden rounded-3xl bg-ink shadow-xl md:min-h-[65vh]">
        {transition === "scroll" ? (
          <div
            className="absolute inset-0 flex transition-transform duration-1000 ease-in-out"
            style={{
              width: `${slides.length * 100}%`,
              transform: `translateX(-${activeIndex * (100 / slides.length)}%)`,
            }}
          >
            {slides.map((url, i) => (
              <div
                key={url + i}
                className="h-full shrink-0 bg-cover"
                style={{
                  width: `${100 / slides.length}%`,
                  backgroundImage: `url('${url}')`,
                  backgroundPosition: `center ${bannerPosition}%`,
                }}
              />
            ))}
          </div>
        ) : (
          slides.map((url, i) => (
            <div
              key={url + i}
              className="absolute inset-0 bg-cover transition-opacity duration-1000 ease-in-out"
              style={{
                backgroundImage: `url('${url}')`,
                backgroundPosition: `center ${bannerPosition}%`,
                opacity: i === activeIndex % slides.length ? 1 : 0,
              }}
            />
          ))
        )}
        {/* Dark on the text side, fading smoothly into the photo — no hard seam. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, rgba(13,10,8,0.92) 0%, rgba(13,10,8,0.8) 30%, rgba(13,10,8,0.4) 55%, rgba(13,10,8,0.12) 78%, transparent 100%), linear-gradient(0deg, rgba(13,10,8,0.55) 0%, transparent 45%)",
          }}
        />

        <div className="relative flex min-h-[55vh] max-w-xl flex-col justify-center gap-5 px-8 py-12 md:min-h-[65vh] md:px-14">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-warm-white/70 sm:text-xs">
            <span className="truncate">New Zealand Sri Lanka Cultural Foundation</span>
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
              <GraduationCap size={16} /> Enrol Now
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
