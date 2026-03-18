import Architecture from "@/components/Architecture";
import ExecutionTraceSection from "@/components/ExecutionTraceSection";
import Hero from "@/components/Hero";
import ImpactSection from "@/components/ImpactSection";
import InfraArchitectureSection from "@/components/InfraArchitectureSection";
import InteractiveDemo from "@/components/InteractiveDemo";
import RecruiterCTASection from "@/components/RecruiterCTASection";
import SystemMetricsSection from "@/components/SystemMetricsSection";

export default function Home() {
  return (
    <>
      <Hero />
      <ExecutionTraceSection />
      <Architecture />
      <SystemMetricsSection />
      <InteractiveDemo />
      <InfraArchitectureSection />
      <ImpactSection />
      <RecruiterCTASection />
    </>
  );
}
