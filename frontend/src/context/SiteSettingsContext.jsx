import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const SiteSettingsContext = createContext({ settings: [], get: () => "", loading: true });

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/settings")
      .then((data) => setSettings(data.settings || []))
      .catch(() => setSettings([]))
      .finally(() => setLoading(false));
  }, []);

  const get = (key, fallback = "") =>
    settings.find((s) => s.key === key)?.value || fallback;

  return (
    <SiteSettingsContext.Provider value={{ settings, get, loading }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
