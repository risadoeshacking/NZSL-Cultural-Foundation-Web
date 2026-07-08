import { X } from "lucide-react";

export default function Lightbox({ image, onClose }) {
  if (!image) return null;
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
      <img
        src={image.image_url}
        alt={image.title || ""}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
