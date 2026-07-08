import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Lightbox from "../components/Lightbox";
import VideoModal from "../components/VideoModal";
import { useApi } from "../hooks/useApi";

const MEDIA_TABS = [
  { id: "photos", label: "Photos" },
  { id: "videos", label: "Videos" },
];

const BROWSE_TABS = [
  { id: "all", label: "All" },
  { id: "productions", label: "Productions" },
  { id: "performances", label: "Performances" },
  { id: "classes", label: "Classes" },
  { id: "year", label: "By Year" },
];

export default function Gallery() {
  const [media, setMedia] = useState("photos");
  const [browse, setBrowse] = useState("all");
  const [productionId, setProductionId] = useState("");
  const [year, setYear] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const { data: productionsData } = useApi("/productions");
  const { data: yearsData } = useApi(
    browse === "year" ? (media === "photos" ? "/gallery/years" : "/videos/years") : null,
    [browse, media]
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("limit", "100");
    if (browse === "performances") params.set("category", "performances");
    else if (browse === "classes") params.set("category", "classes");
    else if (browse === "productions") params.set("production_id", productionId || "any");
    else if (browse === "year" && year) params.set("year", year);
    return params.toString();
  }, [browse, productionId, year]);

  const endpoint = media === "photos" ? `/gallery?${query}` : `/videos?${query}`;
  const { data, loading } = useApi(endpoint, [endpoint]);

  const photos = media === "photos" ? data?.images || [] : [];
  const videos = media === "videos" ? data?.videos || [] : [];
  const productions = productionsData?.productions || [];
  const years = yearsData?.years || [];

  const handleBrowseChange = (id) => {
    setBrowse(id);
    if (id !== "productions") setProductionId("");
    if (id !== "year") setYear("");
  };

  return (
    <>
      <PageHeader
        title="Gallery"
        subtitle="Photos and videos from our events, productions, performances and classes."
      />

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex justify-center gap-3">
            {MEDIA_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMedia(t.id)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                  media === t.id ? "bg-maroon text-warm-white" : "bg-white text-text-dark border border-black/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {BROWSE_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleBrowseChange(t.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  browse === t.id ? "bg-text-dark text-warm-white" : "bg-white text-text-dark border border-black/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {browse === "productions" && (
            <div className="mb-8 flex justify-center">
              <select
                value={productionId}
                onChange={(e) => setProductionId(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
              >
                <option value="">All Productions</option>
                {productions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {browse === "year" && (
            <div className="mb-8 flex justify-center">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
              >
                {years.length === 0 ? (
                  <option value="">No years available</option>
                ) : (
                  years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {loading ? (
            <p className="text-center text-sm text-text-dark-soft">Loading...</p>
          ) : media === "photos" ? (
            photos.length === 0 ? (
              <p className="text-center text-sm text-text-dark-soft">No photos found for this filter.</p>
            ) : (
              <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
                {photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-lg"
                    onClick={() => setActiveIndex(i)}
                  >
                    <img
                      src={photo.image_url}
                      alt={photo.title || ""}
                      className="w-full object-cover transition-transform group-hover:scale-105"
                      style={{ height: `${150 + (i % 3) * 60}px` }}
                    />
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="text-sm font-medium text-white">{photo.title || "Untitled"}</div>
                      {photo.photographer && <div className="text-xs text-white/70">{photo.photographer}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : videos.length === 0 ? (
            <p className="text-center text-sm text-text-dark-soft">No videos found for this filter.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <div key={video.id}>
                  <button
                    type="button"
                    className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-black/5"
                    onClick={() => setActiveVideo(video)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-text-dark">
                        <Play size={22} fill="currentColor" />
                      </span>
                    </span>
                  </button>
                  <div className="mt-2 text-sm font-medium text-text-dark">{video.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Lightbox images={photos} index={activeIndex} onClose={() => setActiveIndex(null)} onNavigate={setActiveIndex} />
      <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </>
  );
}
