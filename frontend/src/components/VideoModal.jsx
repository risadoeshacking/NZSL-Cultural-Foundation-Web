import { useEffect, useMemo, useRef } from "react";
import { X, Play } from "lucide-react";
import YouTubePlayer from "./YouTubePlayer";
import { isMobileDevice, getYouTubeWatchUrl, extractYouTubeVideoId } from "../utils/youtube";

export default function VideoModal({ video, onClose }) {
  const overlayRef = useRef(null);
  const isMobile = useMemo(() => isMobileDevice(), []);

  const videoId = useMemo(
    () =>
      video
        ? extractYouTubeVideoId(video.video_id) || video.video_id
        : null,
    [video]
  );

  const watchUrl = useMemo(
    () => (videoId ? getYouTubeWatchUrl(videoId) : null),
    [videoId]
  );

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
        {isMobile && watchUrl ? (
          /* Mobile fallback: show thumbnail with a direct "Watch on YouTube" link.
             This avoids popup-blocker issues and lets iOS deep-link into the
             YouTube app when installed. */
          <div className="relative flex h-full w-full items-center justify-center bg-black">
            <img
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
              alt={video.title || "Video thumbnail"}
              className="absolute inset-0 h-full w-full object-cover"
              onError={(e) => {
                // Fallback to standard thumbnail if maxresdefault doesn't exist
                e.target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-black/40" />
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 flex flex-col items-center gap-3"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110 sm:h-20 sm:w-20">
                <Play size={28} fill="currentColor" />
              </span>
              <span className="text-sm font-semibold text-white drop-shadow-lg">
                Watch on YouTube
              </span>
            </a>
          </div>
        ) : (
          /* Desktop: show the embedded YouTube player */
          <YouTubePlayer
            className="absolute inset-0 h-full w-full"
            title={video.title}
            videoId={video.video_id}
            youtubeUrl={video.youtube_url}
          />
        )}
      </div>
    </div>
  );
}
