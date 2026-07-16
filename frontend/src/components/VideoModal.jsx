import { useState } from "react";
import { X } from "lucide-react";

export default function VideoModal({ video, onClose }) {
  const [autoplay, setAutoplay] = useState(true);
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
      <div className="aspect-video w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <iframe
          className="h-full w-full rounded-lg"
          src={
            `https://www.youtube-nocookie.com/embed/${video.video_id}?autoplay=${autoplay ? 1 : 0}&rel=0&playsinline=1`
          }
          title={video.title}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onError={() => setAutoplay(false)}
        />
      </div>
    </div>
  );
}
