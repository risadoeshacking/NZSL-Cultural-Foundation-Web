import { useEffect, useState } from "react";
import { X } from "lucide-react";
import YouTubePlayer from "./YouTubePlayer";

export default function VideoModal({ video, onClose }) {
  const [autoplay, setAutoplay] = useState(true);

  // If autoplay doesn't start, swap to autoplay=0 after a short delay.
  useEffect(() => {
    if (!video) return;
    if (!autoplay) return;

    const t = setTimeout(() => {
      setAutoplay(false);
    }, 3500);

    return () => clearTimeout(t);
  }, [video, autoplay]);

  useEffect(() => {
    if (!video) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [video]);

  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute right-6 top-6 text-white/80 hover:text-white"
        onClick={onClose}
      >
        <X size={28} />
      </button>

      <div
        className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <YouTubePlayer
          className="h-full w-full"
          title={video.title}
          autoplay={autoplay}
          // video.video_id is expected, but we also support if the backend sends youtube_url.
          videoId={video.video_id}
          youtubeUrl={video.youtube_url}
        />
      </div>
    </div>
  );
}


