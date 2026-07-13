import { Users, Sparkles, Landmark, HeartHandshake } from "lucide-react";
import { useScrollReveal } from "../../hooks/useScrollReveal";

const FEATURES = [
  {
    icon: Users,
    title: "Community",
    description: "Bringing people together through culture and creativity.",
  },
  {
    icon: Sparkles,
    title: "Inspiration",
    description: "Nurturing talent and confidence in young and old.",
  },
  {
    icon: Landmark,
    title: "Heritage",
    description: "Proudly sharing the beauty of Sri Lankan traditions.",
  },
  {
    icon: HeartHandshake,
    title: "Unity",
    description: "Building a vibrant multicultural future in New Zealand.",
  },
];

export default function FeatureCards() {
  const { ref, visible } = useScrollReveal();
  return (
    <section className="bg-ink px-5 py-8">
      <div
        ref={ref}
        className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
          visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <h2 className="mb-5 text-center font-display text-2xl font-semibold text-warm-white">Our Values</h2>

        {/* Mobile: one compact line, icon + short label, no card box */}
        <div className="mx-auto flex max-w-7xl justify-between gap-2 sm:hidden">
          {FEATURES.map(({ icon: Icon, title }) => (
            <div key={title} className="flex flex-1 flex-col items-center gap-1.5 text-center">
              <Icon className="text-gold" size={22} strokeWidth={1.75} />
              <span className="text-[0.7rem] font-medium leading-tight text-warm-white">{title}</span>
            </div>
          ))}
        </div>

        {/* Tablet/desktop: full cards */}
        <div className="mx-auto hidden max-w-7xl gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <Icon className="mb-4 text-gold" size={28} strokeWidth={1.75} />
              <h3 className="mb-1 font-display text-lg font-semibold text-warm-white">{title}</h3>
              <p className="text-sm leading-relaxed text-warm-white/70">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
