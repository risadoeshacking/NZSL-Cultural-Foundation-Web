import { useState } from "react";
import { Play } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import SectionHeader from "../ui/SectionHeader";
import Button from "../ui/Button";
import Lightbox from "../Lightbox";
import VideoModal from "../VideoModal";

const WHAT_WE_DO_ITEMS = [
  {
    title: "Learn",
    description: "Quality programmes in dance and music that inspire creativity, confidence and cultural connection.",
  },
  {
    title: "Create",
    description: "Produce and present performances and major productions that showcase Sri Lankan arts and talent.",
  },
  {
    title: "Connect",
    description: "Collaborate with multicultural communities to celebrate diversity and build understanding through the arts.",
  },
  {
    title: "Inspire",
    description: "Create opportunities for people of all ages to participate, perform and grow together.",
  },
];

export default function GalleryVideosWhatWeDo() {
  const { data: galleryData, loading: galleryLoading } = useApi("/gallery?limit=6");
  const { data: videosData, loading: videosLoading } = useApi("/videos?limit=1");
  const [activeImage, setActiveImage] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);

  const photos = (galleryData?.images || []).slice(0, 6);
  const featuredVideo = (videosData?.videos || [])[0];

  return (
    <section className="bg-ink px-5 py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-3">
        <div>
          <SectionHeader eyebrow="Cultural Gallery" title="Moments in Pictures" light className="mb-6" />
          {galleryLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-white/5" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-warm-white/60">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-lg bg-white/5"
                  onClick={() => setActiveImage(photo)}
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title || ""}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="mt-5 text-center">
            <Button to="/gallery" variant="secondary" className="border-white/25 text-warm-white">
              View Full Gallery
            </Button>
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="Watch & Experience" title="Watch Our Videos" light className="mb-6" />
          {videosLoading ? (
            <div className="aspect-video w-full animate-pulse rounded-xl bg-white/5" />
          ) : !featuredVideo ? (
            <p className="text-sm text-warm-white/60">No videos yet.</p>
          ) : (
            <button
              type="button"
              className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-white/5"
              onClick={() => setActiveVideo(featuredVideo)}
            >
              <img
                src={`https://img.youtube.com/vi/${featuredVideo.video_id}/hqdefault.jpg`}
                alt={featuredVideo.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-text-dark">
                  <Play size={22} fill="currentColor" />
                </span>
              </span>
              <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-sm font-medium text-warm-white">
                {featuredVideo.title}
              </span>
            </button>
          )}
          <div className="mt-5 text-center">
            <Button to="/gallery" variant="secondary" className="border-white/25 text-warm-white">
              View All Videos
            </Button>
          </div>
        </div>

        <div>
          <SectionHeader eyebrow="Our Foundation" title="What We Do" light className="mb-6" />
          <p className="mb-5 text-sm leading-relaxed text-warm-white/70">
            We bring people together through arts, culture and community, creating opportunities to
            learn, perform, celebrate and connect across generations and cultures.
          </p>
          <ul className="mb-6 flex flex-col gap-4">
            {WHAT_WE_DO_ITEMS.map(({ title, description }) => (
              <li key={title} className="text-sm">
                <div className="font-display font-semibold text-warm-white">{title}</div>
                <div className="text-warm-white/70">{description}</div>
              </li>
            ))}
          </ul>
          <Button to="/about" variant="gold">
            Explore more about us
          </Button>
        </div>
      </div>

      <Lightbox image={activeImage} onClose={() => setActiveImage(null)} />
      <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </section>
  );
}
