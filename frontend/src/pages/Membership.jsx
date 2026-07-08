import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { apiPost } from "../api/client";
import { useSiteSettings } from "../context/SiteSettingsContext";

const PROGRAM_SLUG_MAP = { dance: "dancing", vocals: "vocals" };

const RADIO_CLASSES = (checked) =>
  `flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
    checked ? "border-maroon bg-maroon/5 text-maroon font-semibold" : "border-black/10 text-text-dark"
  }`;

export default function Membership() {
  const [searchParams] = useSearchParams();
  const { get } = useSiteSettings();
  const requestedProgram = PROGRAM_SLUG_MAP[searchParams.get("program")] || "";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    ageGroup: "",
    guardianName: "",
    guardianPhone: "",
    medicalNotes: "",
    consentGiven: false,
    program: requestedProgram,
  });
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const [copyFeedback, setCopyFeedback] = useState("");

  const isUnder16 = form.ageGroup === "16_and_under";

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ageGroup || !form.program) {
      setStatus({ state: "error", message: "Please select an age group and a program." });
      return;
    }
    setStatus({ state: "sending", message: "" });
    try {
      await apiPost("/membership/register", form);
      setStatus({ state: "success", message: "" });
    } catch (err) {
      setStatus({ state: "error", message: err.message || "Registration failed. Please try again." });
    }
  };

  const copyAccountDetails = () => {
    const accountName = get("bank_account_name", "NZSL Cultural Foundation");
    const accountNumber = get("bank_account_number", "Contact us for details");
    const bankName = get("bank_name", "");
    const reference = get("payment_reference", "Your full name");
    const text = `${accountName} — ${accountNumber}${bankName ? ` (${bankName})` : ""} — Reference: ${reference}`;
    navigator.clipboard.writeText(text);
    setCopyFeedback("Copied to clipboard!");
    setTimeout(() => setCopyFeedback(""), 2500);
  };

  if (status.state === "success") {
    const accountName = get("bank_account_name", "NZSL Cultural Foundation");
    const accountNumber = get("bank_account_number", "Contact us for details");
    const bankName = get("bank_name", "");
    const reference = get("payment_reference", "Your full name");

    return (
      <>
        <PageHeader title="Enrol Now" />
        <section className="bg-cream px-5 py-16">
          <div className="mx-auto max-w-md rounded-2xl border border-black/5 bg-white p-8 text-center">
            <h2 className="mb-2 font-display text-2xl font-semibold text-text-dark">Registration Received!</h2>
            <p className="mb-6 text-sm text-text-dark-soft">Please complete payment to activate your membership.</p>
            <div className="mb-6 flex flex-col gap-3 rounded-xl bg-cream p-4 text-left text-sm">
              <Row label="Account Name" value={accountName} />
              <Row label="Account Number" value={accountNumber} />
              {bankName && <Row label="Bank" value={bankName} />}
              <Row label="Reference" value={reference} />
            </div>
            <button
              type="button"
              onClick={copyAccountDetails}
              className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-warm-white hover:bg-maroon-light"
            >
              Copy Account Details
            </button>
            {copyFeedback && <div className="mt-2 text-xs text-green-600">{copyFeedback}</div>}
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Enrol Now"
        subtitle="Register for Dancing, Vocals, or both programs with the New Zealand Sri Lanka Cultural Foundation."
      />

      <section className="bg-cream px-5 py-16">
        <form onSubmit={handleSubmit} className="mx-auto max-w-xl rounded-2xl border border-black/5 bg-white p-8">
          <Field label="Full Name" htmlFor="mFullName">
            <input
              id="mFullName"
              type="text"
              required
              value={form.fullName}
              onChange={(e) => update({ fullName: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
            />
          </Field>
          <Field label="Email" htmlFor="mEmail">
            <input
              id="mEmail"
              type="email"
              required
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
            />
          </Field>
          <Field label="Phone Number" htmlFor="mPhone">
            <input
              id="mPhone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
            />
          </Field>

          <Field label="Age Group">
            <div className="flex flex-wrap gap-3">
              {[
                { value: "16_and_under", label: "16 years and below" },
                { value: "16_and_over", label: "16 years and over" },
              ].map((opt) => (
                <label key={opt.value} className={RADIO_CLASSES(form.ageGroup === opt.value)}>
                  <input
                    type="radio"
                    name="ageGroup"
                    value={opt.value}
                    checked={form.ageGroup === opt.value}
                    onChange={(e) => update({ ageGroup: e.target.value })}
                    className="accent-maroon"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>

          {isUnder16 && (
            <div className="mb-4 flex flex-col gap-3">
              <Field label="Guardian Name" htmlFor="mGuardianName">
                <input
                  id="mGuardianName"
                  type="text"
                  required={isUnder16}
                  value={form.guardianName}
                  onChange={(e) => update({ guardianName: e.target.value })}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
                />
              </Field>
              <Field label="Guardian Phone" htmlFor="mGuardianPhone">
                <input
                  id="mGuardianPhone"
                  type="tel"
                  required={isUnder16}
                  value={form.guardianPhone}
                  onChange={(e) => update({ guardianPhone: e.target.value })}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
                />
              </Field>
            </div>
          )}

          <Field label="Medical Notes (optional)" htmlFor="mMedicalNotes">
            <input
              id="mMedicalNotes"
              type="text"
              placeholder="Allergies, conditions, or anything we should know"
              value={form.medicalNotes}
              onChange={(e) => update({ medicalNotes: e.target.value })}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-maroon focus:outline-none"
            />
          </Field>

          <label className="mb-4 flex items-start gap-2 text-sm text-text-dark-soft">
            <input
              type="checkbox"
              checked={form.consentGiven}
              onChange={(e) => update({ consentGiven: e.target.checked })}
              className="mt-1 accent-maroon"
            />
            I consent to photos/video taken during classes and events being used for the
            Foundation's promotional purposes.
          </label>

          <Field label="Program">
            <div className="flex flex-wrap gap-3">
              {[
                { value: "dancing", label: "Dancing" },
                { value: "vocals", label: "Vocals" },
                { value: "both", label: "Both" },
              ].map((opt) => (
                <label key={opt.value} className={RADIO_CLASSES(form.program === opt.value)}>
                  <input
                    type="radio"
                    name="program"
                    value={opt.value}
                    checked={form.program === opt.value}
                    onChange={(e) => update({ program: e.target.value })}
                    className="accent-maroon"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </Field>

          <button
            type="submit"
            disabled={status.state === "sending"}
            className="w-full rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-warm-white transition-colors hover:bg-maroon-light disabled:opacity-60"
          >
            {status.state === "sending" ? "Registering..." : "Register"}
          </button>

          {status.state === "error" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {status.message}
            </div>
          )}
        </form>
      </section>
    </>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-text-dark">
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 pb-2 last:border-0 last:pb-0">
      <span className="text-text-dark-soft">{label}</span>
      <span className="font-semibold text-text-dark">{value}</span>
    </div>
  );
}
