import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { apiPost } from "../api/client";
import { useSiteSettings } from "../context/SiteSettingsContext";

export default function Contact() {
  const { get } = useSiteSettings();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState({ state: "idle", message: "" });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ state: "sending", message: "" });
    try {
      await apiPost("/contact", form);
      setStatus({ state: "success", message: "Thanks — your message has been sent. We'll be in touch soon." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Something went wrong. Please try again." });
    }
  };

  return (
    <>
      <PageHeader
        title="Get In Touch"
        subtitle="Questions about our programs, events, or membership? Send us a message and we'll get back to you."
      />

      <section className="bg-cream px-5 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-black/5 bg-white p-8">
            <div className="mb-4">
              <label htmlFor="cName" className="mb-1 block text-sm font-medium text-text-dark">
                Name
              </label>
              <input
                id="cName"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="cEmail" className="mb-1 block text-sm font-medium text-text-dark">
                Email
              </label>
              <input
                id="cEmail"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="cSubject" className="mb-1 block text-sm font-medium text-text-dark">
                Subject
              </label>
              <input
                id="cSubject"
                name="subject"
                type="text"
                value={form.subject}
                onChange={handleChange}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
              />
            </div>
            <div className="mb-5">
              <label htmlFor="cMessage" className="mb-1 block text-sm font-medium text-text-dark">
                Message
              </label>
              <textarea
                id="cMessage"
                name="message"
                rows={5}
                required
                value={form.message}
                onChange={handleChange}
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={status.state === "sending"}
              className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-warm-white transition-colors hover:bg-maroon-light disabled:opacity-60"
            >
              {status.state === "sending" ? "Sending..." : "Send Message"}
            </button>

            {status.state === "error" && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {status.message}
              </div>
            )}
            {status.state === "success" && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {status.message}
              </div>
            )}
          </form>

          <div className="rounded-2xl border border-black/5 bg-white p-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
              Contact Information
            </div>
            <h3 className="mb-3 font-display text-2xl font-semibold text-text-dark">Reach Us Directly</h3>
            <p className="mb-6 text-sm text-text-dark-soft">
              Prefer to reach out directly? Here's how to find us.
            </p>
            <ul className="flex flex-col gap-4 text-sm">
              <li>
                <div className="font-semibold text-text-dark">Address</div>
                <div className="text-text-dark-soft">{get("contact_address", "Wellington, New Zealand")}</div>
              </li>
              <li>
                <div className="font-semibold text-text-dark">Phone</div>
                <a href={`tel:${get("contact_phone", "+6445678901").replace(/\s/g, "")}`} className="text-maroon">
                  {get("contact_phone", "+64 4 567 8901")}
                </a>
              </li>
              <li>
                <div className="font-semibold text-text-dark">Email</div>
                <a href={`mailto:${get("contact_email", "info@nzslfoundation.org.nz")}`} className="text-maroon">
                  {get("contact_email", "info@nzslfoundation.org.nz")}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
