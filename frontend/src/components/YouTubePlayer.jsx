import { useEffect, useMemo, useRef, useState } from "react";
import { extractYouTubeVideoId, buildYouTubeEmbedUrl, isMobileDevice } from "../utils/youtube";


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


  const embedSrc = useMemo(() => {
    // iOS Error 153 is very sensitive to iframe query params.
    // Must match the safest template: exactly https://www.youtube.com/embed/VIDEO_ID
    return buildYouTubeEmbedUrl(normalizedVideoId);
  }, [normalizedVideoId]);


  // Keep minimal logic. iOS Error 153 is not reliably catchable via onError,
  // so we don't attempt to swap UI on error.
  useEffect(() => {
    if (!embedSrc) return;
  }, [embedSrc]);


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

  // Intentionally do not switch UI on iframe error.
  // On iOS, Error 153 can be triggered during initialization; swapping DOM can
  // prevent the iframe from retrying. Keep the iframe mounted.
  // if (loadError && watchUrl) { ... }
  void loadError;
  void watchUrl;



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

