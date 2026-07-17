import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play } from "lucide-react";
import { useApi } from "../hooks/useApi";
import Lightbox from "../components/Lightbox";
import VideoModal from "../components/VideoModal";

export default function ProductionDetail() {
  const { slug } = useParams();
  const { data, loading, error } = useApi(`/productions/${slug}`, [slug]);
  const production = data?.production;

  const { data: galleryData } = useApi(
    production ? `/gallery?production_id=${production.id}` : null,
    [production?.id]
  );
  const { data: videosData } = useApi(
    production ? `/videos?production_id=${production.id}` : null,
    [production?.id]
  );

  const [activeImage, setActiveImage] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const photos = galleryData?.images || [];
  const videos = videosData?.videos || [];

  if (loading) {
    return <div className="bg-ink px-5 py-32 text-center text-warm-white/60">Loading...</div>;
  }

  if (error || !production) {
    return (
      <div className="bg-ink px-5 py-32 text-center">
        <h1 className="font-display text-3xl font-semibold text-warm-white">Production not found</h1>
        <Link to="/productions" className="mt-4 inline-block text-gold hover:text-gold-light">
          ← Back to Productions
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-ink px-5 pb-14 pt-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-semibold text-warm-white md:text-5xl">{production.title}</h1>
          {production.tagline && <p className="mt-4 text-sm text-warm-white/70 md:text-base">{production.tagline}</p>}
        </div>
      </div>

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
          <div className="aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-maroon to-ink-deep">
            {production.cover_image && (
              <img src={production.cover_image} alt={production.title} className="h-full w-full object-cover" />
            )}
          </div>
          <div>
            {production.location && (
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-gold">
                {production.location}
              </div>
            )}
            <div
              className="text-sm leading-relaxed text-text-dark-soft prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: production.full_description || production.description }}
            />
          </div>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="bg-ink px-5 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 font-display text-2xl font-semibold text-warm-white">Gallery</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className="aspect-video overflow-hidden rounded-lg bg-white/5"
                  onClick={() => setActiveImage(photo)}
                >
                  <img src={photo.image_url} alt={photo.title || ""} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section className="bg-cream px-5 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 font-display text-2xl font-semibold text-text-dark">Videos</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  className="group relative block aspect-video overflow-hidden rounded-xl bg-black/5"
                  onClick={() => setActiveVideo(video)}
                >
                  <img
                    src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-text-dark">
                      <Play size={18} fill="currentColor" />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <Lightbox image={activeImage} onClose={() => setActiveImage(null)} />
      <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </>
  );
}
