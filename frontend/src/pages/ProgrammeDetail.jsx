import { useParams, Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import Button from "../components/ui/Button";

export default function ProgrammeDetail() {
  const { slug } = useParams();
  const { data, loading, error } = useApi(`/programmes/${slug}`, [slug]);
  const programme = data?.programme;

  if (loading) {
    return <div className="bg-ink px-5 py-32 text-center text-warm-white/60">Loading...</div>;
  }

  if (error || !programme) {
    return (
      <div className="bg-ink px-5 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold text-warm-white">Programme not found</h1>
        <Link to="/programmes" className="mt-4 inline-block text-gold hover:text-gold-light">
          ← Back to Programmes
        </Link>
      </div>
    );
  }

  const classes = programme.classes || [];

  return (
    <>
      <div className="bg-ink px-5 pb-14 pt-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-semibold text-warm-white md:text-5xl">{programme.name}</h1>
          {programme.description && (
            <p className="mt-4 text-sm text-warm-white/70 md:text-base">{programme.description}</p>
          )}
          <div className="mt-6">
            <Button to={`/membership?program=${programme.slug}`} variant="gold">
              Register Now
            </Button>
          </div>
        </div>
      </div>

      {classes.length > 0 && (
        <section className="bg-cream px-5 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 font-display text-2xl font-semibold text-text-dark">Classes</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => (
                <div key={c.id} className="rounded-2xl border border-black/5 bg-white p-6">
                  <h3 className="mb-3 font-display text-lg font-semibold text-text-dark">{c.name}</h3>
                  <ul className="flex flex-col gap-1.5 text-sm text-text-dark-soft">
                    {c.age_group && <li>Age group: {c.age_group}</li>}
                    {c.schedule && <li>Schedule: {c.schedule}</li>}
                    {c.location && <li>Location: {c.location}</li>}
                    {c.fee_amount && (
                      <li>
                        Fee: ${c.fee_amount} / {c.fee_period}
                      </li>
                    )}
                    {c.tutors?.length > 0 && <li>Tutors: {c.tutors.map((t) => t.name).join(", ")}</li>}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
