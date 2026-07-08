import Hero from "../components/home/Hero";
import FeatureCards from "../components/home/FeatureCards";
import ProductionsAndEvents from "../components/home/ProductionsAndEvents";
import GalleryVideosWhatWeDo from "../components/home/GalleryVideosWhatWeDo";
import Partners from "../components/home/Partners";

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureCards />
      <ProductionsAndEvents />
      <GalleryVideosWhatWeDo />
      <Partners />
    </>
  );
}
