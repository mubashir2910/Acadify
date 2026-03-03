import Amplification from "@/components/amplification";
import HowItWorks from "@/components/works";
import HeroSection from "@/components/hero-section";
import Pricing from "@/components/pricing"; 
import Footer from "@/components/footer";

export default function Home() {
  return (
    <>
      <HeroSection />
      <Amplification/>
      <HowItWorks/>
      <Pricing/>
      <Footer/>
    </>
  );
}
