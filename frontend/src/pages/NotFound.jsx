import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center">
      <h1 className="font-display text-4xl font-semibold text-warm-white">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-gold hover:text-gold-light">
        Back to Home →
      </Link>
    </div>
  );
}
