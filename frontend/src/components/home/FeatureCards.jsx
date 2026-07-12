import { Users, Sparkles, Landmark, HeartHandshake } from "lucide-react";

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
  return (
    <section className="bg-cream px-5 py-8">
      <h2 className="mb-5 text-center font-display text-2xl font-semibold text-text-dark">Our Values</h2>

      {/* Mobile: one compact line, icon + short label, no card box */}
      <div className="mx-auto flex max-w-7xl justify-between gap-2 sm:hidden">
        {FEATURES.map(({ icon: Icon, title }) => (
          <div key={title} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <Icon className="text-gold" size={22} strokeWidth={1.75} />
            <span className="text-[0.7rem] font-medium leading-tight text-text-dark">{title}</span>
          </div>
        ))}
      </div>

      {/* Tablet/desktop: full cards */}
      <div className="mx-auto hidden max-w-7xl gap-6 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <Icon className="mb-4 text-gold" size={28} strokeWidth={1.75} />
            <h3 className="mb-1 font-display text-lg font-semibold text-text-dark">{title}</h3>
            <p className="text-sm leading-relaxed text-text-dark-soft">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
