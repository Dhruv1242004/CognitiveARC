import Hero from "@/components/Hero";
import Architecture from "@/components/Architecture";
import Capabilities from "@/components/Capabilities";
import InteractiveDemo from "@/components/InteractiveDemo";
import EngineeringHighlights from "@/components/EngineeringHighlights";
import TechStack from "@/components/TechStack";

export default function Home() {
  return (
    <>
      <Hero />
      <hr className="divider" />
      <Architecture />
      <hr className="divider" />
      <Capabilities />
      <hr className="divider" />
      <InteractiveDemo />
      <hr className="divider" />
      <EngineeringHighlights />
      <hr className="divider" />
      <TechStack />
    </>
  );
}
