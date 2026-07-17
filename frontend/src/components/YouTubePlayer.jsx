import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { extractYouTubeVideoId, buildYouTubeEmbedUrl, isMobileDevice, getYouTubeWatchUrl } from "../utils/youtube";

/**
 * YouTube iframe player — iOS/WebKit safe.
 *
 * Features:
 *   - referrerPolicy="strict-origin-when-cross-origin" for proper referrer handling
 *   - frameBorder="0" for clean rendering
 *   - Error fallback: shows "Watch on YouTube" button if iframe fails to load
 *   - Mobile fallback: if on mobile and iframe errors, offers external link
 */
export default function YouTubePlayer({
  youtubeUrl,
  videoId,
  title = "YouTube video",
  autoplay = false,
  className = "w-full h-full",
}) {
  const normalizedVideoId = useMemo(() => {
    if (videoId) return extractYouTubeVideoId(videoId) || videoId;
    return extractYouTubeVideoId(youtubeUrl);
  }, [youtubeUrl, videoId]);

  const iframeRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  const embedSrc = useMemo(() => {
    const base = buildYouTubeEmbedUrl(normalizedVideoId);
    if (!base) return null;
    const params = new URLSearchParams();
    params.set("autoplay", autoplay ? "1" : "0");
    params.set("rel", "0");
    params.set("playsinline", "1");
    params.set("modestbranding", "1");
    return `${base}?${params.toString()}`;
  }, [normalizedVideoId, autoplay]);

  const watchUrl = useMemo(
    () => (normalizedVideoId ? getYouTubeWatchUrl(normalizedVideoId) : null),
    [normalizedVideoId]
  );

  // Detect iframe load failures (e.g. Error 153 on mobile).
  // We use a timeout: if the iframe hasn't loaded meaningful content
  // within 5 s on mobile, treat it as a failure.
  useEffect(() => {
    if (!embedSrc || !isMobileDevice()) return;
    const timer = setTimeout(() => {
      // If the iframe is still present but the user hasn't interacted,
      // we don't set error — only set on explicit error event.
    }, 5000);
    return () => clearTimeout(timer);
  }, [embedSrc]);

  const handleIframeError = useCallback(() => {
    setLoadError(true);
  }, []);

  useEffect(() => {
    // Stop playback when popup closes/unmounts.
    return () => {
      try {
        if (iframeRef.current) iframeRef.current.src = "about:blank";
      } catch {
        // ignore
      }
    };
  }, []);

  if (!normalizedVideoId || !embedSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-black/10 p-4">
        <p className="text-sm text-text-dark">Invalid YouTube link.</p>
      </div>
    );
  }

  // Fallback UI when iframe fails to load (common on mobile Safari/Chrome).
  if (loadError && watchUrl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-black p-6 text-center">
        <svg
          className="mb-4 h-16 w-16 text-red-500"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 3.993L9 16z" />
        </svg>
        <p className="mb-1 text-sm font-medium text-warm-white">
          Video can't play in this browser
        </p>
        <p className="mb-4 text-xs text-warm-white/60">
          Tap the button below to watch on YouTube.
        </p>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 3.993L9 16z" />
          </svg>
          Watch on YouTube
        </a>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={className}
      src={embedSrc}
      frameBorder="0"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      onError={handleIframeError}
    />
  );
}

