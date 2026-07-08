import { Users, Sparkles, Landmark, HeartHandshake } from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Our Community",
    description: "Bringing people together through culture and creativity.",
  },
  {
    icon: Sparkles,
    title: "Inspiring Generations",
    description: "Nurturing talent and confidence in young and old.",
  },
  {
    icon: Landmark,
    title: "Rich Heritage",
    description: "Proudly sharing the beauty of Sri Lankan traditions.",
  },
  {
    icon: HeartHandshake,
    title: "Stronger Together",
    description: "Building a vibrant multicultural future in New Zealand.",
  },
];

export default function FeatureCards() {
  return (
    <section className="bg-cream px-5 py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
