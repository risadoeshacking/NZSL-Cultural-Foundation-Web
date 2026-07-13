import { Link } from "react-router-dom";

const VARIANTS = {
  primary: "bg-maroon text-warm-white hover:bg-maroon-light",
  secondary: "bg-transparent border border-current text-inherit hover:bg-black/5",
  gold: "bg-gold text-text-dark hover:bg-gold-light",
};

export default function Button({ to, href, variant = "primary", className = "", children, ...props }) {
  const classes = [
    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    VARIANTS[variant],
    className,
  ].join(" ");

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
