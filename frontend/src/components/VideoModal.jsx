import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import YouTubePlayer from "./YouTubePlayer";
import { isMobileDevice, getYouTubeWatchUrl } from "../utils/youtube";

export default function VideoModal({ video, onClose }) {
  const overlayRef = useRef(null);

  // Mobile: open YouTube externally (app or browser) and close the modal.
  // Desktop: show the embedded player in a popup.
  useEffect(() => {
    if (!video) return;
    if (isMobileDevice()) {
      const url = getYouTubeWatchUrl(video.video_id) || video.youtube_url;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      onClose();
    }
  }, [video, onClose]);

  // Prevent body scrolling behind the modal
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
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/90 p-3 sm:p-6"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute right-3 top-3 z-10 text-white/80 hover:text-white sm:right-6 sm:top-6"
        onClick={onClose}
      >
        <X size={28} />
      </button>

      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-lg"
        style={{ aspectRatio: "16 / 9", maxHeight: "calc(100vh - 24px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <YouTubePlayer
          className="absolute inset-0 h-full w-full"
          title={video.title}
          videoId={video.video_id}
          youtubeUrl={video.youtube_url}
        />
      </div>
    </div>
  );
}