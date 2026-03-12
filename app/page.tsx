import Amplification from "@/components/amplification";
import HowItWorks from "@/components/works";
import HeroSection from "@/components/hero-section";
import Pricing from "@/components/pricing"; 
import Footer from "@/components/footer";
import BookDemo from "@/components/book-demo";

export default function Home() {
  return (
    <>
      <BookDemo />
      <HeroSection />
      <Amplification/>
      <HowItWorks/>
      <Pricing/>
      <Footer/>
    </>
  );
}
