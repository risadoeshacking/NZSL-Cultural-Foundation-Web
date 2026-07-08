import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/**
 * `image` — single-image mode (Home, ProductionDetail).
 * `images` + `index` + `onNavigate` — gallery mode with prev/next (Gallery page).
 */
export default function Lightbox({ image, images, index, onClose, onNavigate }) {
  const gallery = Array.isArray(images);
  const active = gallery ? images[index] : image;

  useEffect(() => {
    if (!gallery || !active) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % images.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gallery, active, index, images, onClose, onNavigate]);

  if (!active) return null;

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

      {gallery && images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            className="absolute left-4 text-white/80 hover:text-white md:left-8"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index - 1 + images.length) % images.length);
            }}
          >
            <ChevronLeft size={36} />
          </button>
          <button
            type="button"
            aria-label="Next"
            className="absolute right-4 text-white/80 hover:text-white md:right-8"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((index + 1) % images.length);
            }}
          >
            <ChevronRight size={36} />
          </button>
        </>
      )}

      <img
        src={active.image_url}
        alt={active.title || ""}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
