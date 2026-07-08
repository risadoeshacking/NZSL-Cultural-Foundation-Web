import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import About from "./pages/About";
import Directors from "./pages/Directors";
import Leadership from "./pages/Leadership";
import Partners from "./pages/Partners";
import Events from "./pages/Events";
import Productions from "./pages/Productions";
import ProductionDetail from "./pages/ProductionDetail";
import Programmes from "./pages/Programmes";
import ProgrammeDetail from "./pages/ProgrammeDetail";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Membership from "./pages/Membership";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <SiteSettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="directors" element={<Directors />} />
            <Route path="leadership" element={<Leadership />} />
            <Route path="partners" element={<Partners />} />
            <Route path="events" element={<Events />} />
            <Route path="productions" element={<Productions />} />
            <Route path="productions/:slug" element={<ProductionDetail />} />
            <Route path="programmes" element={<Programmes />} />
            <Route path="programmes/:slug" element={<ProgrammeDetail />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="contact" element={<Contact />} />
            <Route path="membership" element={<Membership />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SiteSettingsProvider>
  );
}
