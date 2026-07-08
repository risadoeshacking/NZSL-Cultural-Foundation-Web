/** Generic horizontal auto-scrolling strip. Duplicates children once for a seamless loop. */
export default function Marquee({ children, className = "" }) {
  return (
    <div className={`group overflow-hidden ${className}`}>
      <div className="flex w-max animate-marquee gap-10 group-hover:[animation-play-state:paused]">
        <div className="flex items-center gap-10">{children}</div>
        <div className="flex items-center gap-10" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
