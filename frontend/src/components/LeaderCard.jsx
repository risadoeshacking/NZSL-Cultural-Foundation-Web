function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function LeaderCard({ leader, showDirectorTag = false }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-ink">
        {leader.photo_url ? (
          <img src={leader.photo_url} alt={leader.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-maroon to-ink-deep">
            <span className="font-display text-3xl font-semibold text-warm-white/80">
              {getInitials(leader.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gold">
            {leader.role}
            {showDirectorTag && leader.category === "director" ? " · Director" : ""}
          </div>
          <h3 className="font-display text-lg font-semibold text-warm-white">{leader.name}</h3>
        </div>
      </div>
      {(leader.bio || leader.contribution) && (
        <div className="p-4">
          {leader.bio && <p className="text-sm leading-relaxed text-text-dark-soft">{leader.bio}</p>}
          {leader.contribution && (
            <p className="mt-2 text-sm leading-relaxed text-text-dark-soft">{leader.contribution}</p>
          )}
        </div>
      )}
    </div>
  );
}
