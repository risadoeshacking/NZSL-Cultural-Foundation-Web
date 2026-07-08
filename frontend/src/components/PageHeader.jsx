export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="bg-ink px-5 pb-14 pt-16 text-center">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-4xl font-semibold text-warm-white md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-sm leading-relaxed text-warm-white/70 md:text-base">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
