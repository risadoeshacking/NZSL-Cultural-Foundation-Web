import { Landmark, HeartHandshake, Star, Sprout } from "lucide-react";
import PageHeader from "../components/PageHeader";
import SectionHeader from "../components/ui/SectionHeader";
import Button from "../components/ui/Button";
import LeaderCard from "../components/LeaderCard";
import { useApi } from "../hooks/useApi";

const VALUES = [
  {
    icon: Landmark,
    title: "Heritage",
    description: "We honour and preserve the cultural traditions passed down through generations.",
  },
  {
    icon: HeartHandshake,
    title: "Community",
    description: "We build connections between Sri Lankan and New Zealand communities.",
  },
  {
    icon: Star,
    title: "Excellence",
    description: "We maintain the highest standards in our cultural programming and events.",
  },
  {
    icon: Sprout,
    title: "Future",
    description: "We inspire the next generation to carry forward their cultural identity.",
  },
];

const STORY_PARAGRAPHS = [
  `The New Zealand Sri Lanka Cultural Foundation was established with a singular vision: to
  create a lasting home for Sri Lankan culture in Aotearoa New Zealand. Founded by a group of
  passionate community leaders, the foundation has grown into a respected cultural institution
  that organizes events, preserves heritage, and builds bridges between Sri Lankan and New
  Zealand communities.`,
  `Since our establishment, we have organized cultural events that celebrate the richness of Sri
  Lankan traditions — from the luminous nights of Vesak to the joyful celebrations of Sinhala &
  Tamil New Year. Our work extends to heritage preservation through digital archives, youth
  mentorship programs that connect young Sri Lankans with their roots, and partnerships with New
  Zealand cultural institutions.`,
  `We believe that culture is the bridge that connects people across borders, generations, and
  traditions. Through our programs, we have introduced thousands of New Zealanders to the beauty
  of Sri Lankan heritage, fostering mutual understanding and respect.`,
];

export default function About() {
  const { data, loading } = useApi("/leadership");
  const team = (data?.leaders || []).slice(0, 6);

  return (
    <>
      <PageHeader
        title="About the Foundation"
        subtitle="Discover our story, mission, and commitment to preserving Sri Lankan cultural heritage in New Zealand."
      />

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white p-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Our Mission</div>
            <h3 className="mb-3 font-display text-2xl font-semibold text-text-dark">
              Preserving Heritage, Building Community
            </h3>
            <p className="text-sm leading-relaxed text-text-dark-soft">
              To preserve and promote Sri Lankan cultural heritage in New Zealand, fostering
              understanding and appreciation between communities through education, events, and
              the arts.
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white p-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Our Vision</div>
            <h3 className="mb-3 font-display text-2xl font-semibold text-text-dark">
              A Thriving Cultural Legacy
            </h3>
            <p className="text-sm leading-relaxed text-text-dark-soft">
              A thriving Sri Lankan cultural community in New Zealand where heritage is
              celebrated, traditions are preserved, and future generations are inspired to carry
              forward their cultural identity.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-ink px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <SectionHeader eyebrow="Our Story" title="A Foundation Built on Heritage" light className="mb-8" />
          <div className="flex flex-col gap-5">
            {STORY_PARAGRAPHS.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-warm-white/75">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Values" title="What Guides Us" className="mb-10" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-black/5 bg-white p-6">
                <Icon className="mb-4 text-gold" size={28} strokeWidth={1.75} />
                <h3 className="mb-1 font-display text-lg font-semibold text-text-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-text-dark-soft">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <SectionHeader
              eyebrow="Our People"
              title="Meet the Team"
              light
            />
            <div className="flex flex-wrap gap-3">
              <Button to="/directors" variant="secondary" className="border-white/25 text-warm-white">
                Meet Our Directors →
              </Button>
              <Button to="/leadership" variant="secondary" className="border-white/25 text-warm-white">
                Full Leadership →
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-warm-white/60">Loading team...</p>
          ) : team.length === 0 ? (
            <p className="text-sm text-warm-white/60">No team members listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((leader) => (
                <LeaderCard key={leader.id} leader={leader} showDirectorTag />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Supported By"
            title="Partners & Sponsors"
            className=""
          />
          <Button to="/partners" variant="secondary" className="border-text-dark/20 text-text-dark">
            View All →
          </Button>
        </div>
      </section>
    </>
  );
}
