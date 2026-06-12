import Amplification from "@/components/amplification";
import ComparisonSection from "@/components/comparison-section";
import HowItWorks from "@/components/works";
import HeroSection from "@/components/hero-section";
import Vision from "@/components/vision";
import Pricing from "@/components/pricing";
import Footer from "@/components/footer";
import BookDemo from "@/components/book-demo";
import { ForceLight } from "@/components/force-theme";

export default function Home() {
  return (
    <ForceLight>
      <BookDemo />
      <HeroSection />
      <ComparisonSection />
      <Amplification/>
      <HowItWorks/>
      <Vision/>
      <Pricing/>
      <Footer/>
    </ForceLight>
  );
}
