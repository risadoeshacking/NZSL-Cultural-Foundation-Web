import { useEffect, useMemo, useRef, useState } from "react";
import { extractYouTubeVideoId, buildYouTubeEmbedUrl } from "../utils/youtube";

export default function YouTubePlayer({
  youtubeUrl,
  videoId,
  title = "YouTube video",
  autoplay = false,
  className = "w-full h-full",
  onRequestClose,
}) {
  const normalizedVideoId = useMemo(() => {
    if (videoId) return extractYouTubeVideoId(videoId) || videoId;
    return extractYouTubeVideoId(youtubeUrl);
  }, [youtubeUrl, videoId]);

  const [shouldRender, setShouldRender] = useState(false);
  const iframeRef = useRef(null);

  const embedBase = useMemo(() => buildYouTubeEmbedUrl(normalizedVideoId), [normalizedVideoId]);

  const embedSrc = useMemo(() => {
    if (!embedBase) return null;
    const params = new URLSearchParams();
    if (autoplay) params.set("autoplay", "1");
    else params.set("autoplay", "0");
    params.set("rel", "0");
    params.set("playsinline", "1");
    params.set("modestbranding", "1");
    return `${embedBase}?${params.toString()}`;
  }, [embedBase, autoplay]);

  useEffect(() => {
    // Lazy-load iframe when component mounts.
    const t = window.setTimeout(() => setShouldRender(true), 50);
    return () => window.clearTimeout(t);
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

  return (
    <iframe
      ref={iframeRef}
      loading="lazy"
      title={title}
      className={className}
      src={shouldRender ? embedSrc : undefined}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
    />
  );
}

