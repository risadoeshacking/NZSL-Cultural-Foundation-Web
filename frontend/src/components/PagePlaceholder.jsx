export default function PagePlaceholder({ title }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <h1 className="font-display text-4xl font-semibold text-warm-white">{title}</h1>
      <p className="mt-3 text-sm uppercase tracking-widest text-gold">Coming in a later phase</p>
    </div>
  );
}
