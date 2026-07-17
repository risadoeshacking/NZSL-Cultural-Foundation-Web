import { useEffect, useMemo, useRef } from "react";
import { extractYouTubeVideoId, buildYouTubeEmbedUrl } from "../utils/youtube";

/**
 * YouTube iframe player — iOS/WebKit safe.
 *
 * Removed (all cause Error 153 on iPhone Chrome / Safari):
 *   - loading="lazy"          → WebKit mishandles lazy iframes in dynamic modals
 *   - referrerPolicy           → strips referrer on iOS cross-origin, YouTube rejects
 *   - origin query param       → causes validation mismatch on iOS WebKit
 *   - enablejsapi=1            → JS-API handshake fails on iOS with above issues
 *   - setTimeout src delay     → race condition on iOS WebKit
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

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={className}
      src={embedSrc}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

