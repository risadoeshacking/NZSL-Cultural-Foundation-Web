import { useEffect, useMemo, useRef } from "react";
import { extractYouTubeVideoId, buildYouTubeEmbedUrl } from "../utils/youtube";


/**
 * YouTube iframe player — iOS/WebKit safe.
 *
 * Key rules to avoid Error 153 on mobile:
 *   - NO referrerPolicy (strips referrer on iOS cross-origin, triggers Error 153)
 *   - NO loading="lazy" (WebKit lazy-load handling breaks YouTube init on iOS)
 *   - NO origin= param (causes Error 153 on iOS WebKit)
 *   - NO enablejsapi= param (can trigger cookie/consent issues on mobile)
 *   - playsinline=1 in URL keeps playback inside the iframe on iOS
 *   - allowFullScreen for fullscreen support
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
    return buildYouTubeEmbedUrl(normalizedVideoId);
  }, [normalizedVideoId]);


  // Stop playback when popup closes/unmounts.
  useEffect(() => {
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

  // Intentionally do NOT switch UI on iframe error.
  // On iOS, Error 153 can be triggered during initialization; swapping DOM can
  // prevent the iframe from retrying. Keep the iframe mounted.
  //
  // iOS/WebKit-safe iframe attributes:
  //   - playsInline: required on iOS to keep video inside the iframe
  //   - NO referrerPolicy: strips referrer on iOS cross-origin → Error 153
  //   - NO loading="lazy": WebKit lazy-load breaks YouTube init on iOS
  //   - NO frameBorder: deprecated; use CSS border:0 instead
  //   - Minimal allow: fewer permissions = fewer iOS security checks
  if (import.meta.env.DEV) {
    console.log("[YouTubePlayer] embedSrc:", embedSrc);
  }

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={className}
      src={embedSrc}
      style={{ border: 0 }}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      playsInline
    />
  );
}

