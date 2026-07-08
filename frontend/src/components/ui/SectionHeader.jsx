export default function SectionHeader({ eyebrow, title, className = "", light = false, center = false }) {
  return (
    <div className={className}>
      {eyebrow && (
        <div
          className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold ${center ? "justify-center" : ""}`}
        >
          <span className="h-px w-5 bg-gold" />
          {eyebrow}
        </div>
      )}
      <h2 className={`font-display text-3xl font-semibold ${light ? "text-warm-white" : "text-text-dark"}`}>
        {title}
      </h2>
    </div>
  );
}
