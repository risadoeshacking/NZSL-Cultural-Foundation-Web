export function extractYouTubeVideoId(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") return null;

  const urlStr = inputUrl.trim();
  if (!urlStr) return null;

  // Support raw IDs
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlStr)) return urlStr;

  let url;
  try {
    url = new URL(urlStr);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && id.length === 11 ? id : null;
  }

  // youtube.com/watch?v=VIDEO_ID
  if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
    const v = url.searchParams.get("v");
    if (v && v.length === 11) return v;

    // youtube.com/embed/VIDEO_ID
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.indexOf("embed");
    if (
      embedIndex !== -1 &&
      parts[embedIndex + 1] &&
      parts[embedIndex + 1].length === 11
    ) {
      return parts[embedIndex + 1];
    }

    // youtube.com/v/VIDEO_ID (legacy)
    const vIndex = parts.indexOf("v");
    if (vIndex !== -1 && parts[vIndex + 1] && parts[vIndex + 1].length === 11) {
      return parts[vIndex + 1];
    }
  }

  // Fallback: attempt to find first plausible 11-char YouTube ID in path/query
  const match = urlStr.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})(?:[?&/]|$)/);
  if (match && match[1] && match[1].length === 11) return match[1];

  return null;
}

export function buildYouTubeEmbedUrl(videoId) {
  if (!videoId || typeof videoId !== "string") return null;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  // Always use /embed/VIDEO_ID — no origin param (causes Error 153 on iOS WebKit)
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Detect if the current device is a mobile / tablet.
 * Uses the same UA pattern the project already uses in VideoModal.
 * Returns false for desktop browsers (including desktop Chrome).
 */
export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Build a standard YouTube watch URL for a video ID.
 * On mobile this will deep-link to the YouTube app if installed,
 * otherwise it opens youtube.com in the browser.
 */
export function getYouTubeWatchUrl(videoId) {
  const id =
    videoId && videoId.length === 11 ? videoId : extractYouTubeVideoId(videoId);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}
