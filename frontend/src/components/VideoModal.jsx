import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

export default function VideoModal({ video, onClose }) {
  const [autoplay, setAutoplay] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const embedSrc = useMemo(() => {
    if (!video) return "";
    const autoplayParam = autoplay ? 1 : 0;
    return `https://www.youtube-nocookie.com/embed/${video.video_id}?autoplay=${autoplayParam}&rel=0&playsinline=1&modestbranding=1`;
  }, [video, autoplay]);

  // Some domains/devices reject autoplay (Error 153). If autoplay doesn't start,
  // swap to autoplay=0 after a short delay.
  useEffect(() => {
    if (!video) return;
    if (!autoplay) return;

    const t = setTimeout(() => {
      setAutoplay(false);
      setIframeKey((k) => k + 1);
    }, 3500);

    return () => clearTimeout(t);
  }, [video, autoplay]);

  useEffect(() => {
    if (!video) return;
    // Force iframe remount when we change strategy.
    setIframeKey((k) => k + 1);
  }, [video?.video_id]);

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
          key={iframeKey}
          className="h-full w-full rounded-lg"
          src={embedSrc}
          title={video.title}
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
        />
      </div>
    </div>
  );
}

