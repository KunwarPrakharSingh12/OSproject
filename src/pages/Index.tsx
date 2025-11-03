import { useState } from "react";
import { ProcessInput, Process } from "@/components/ProcessInput";
import { ResourceGraph } from "@/components/ResourceGraph";
import { DetectionResults } from "@/components/DetectionResults";
import { ExampleScenarios } from "@/components/ExampleScenarios";
import { ResourceConfiguration } from "@/components/ResourceConfiguration";
import { detectDeadlock } from "@/components/DeadlockDetector";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [resourceCount, setResourceCount] = useState<number>(5);
  const [processCount, setProcessCount] = useState<number>(10);
  const [detectionResult, setDetectionResult] = useState<ReturnType<typeof detectDeadlock> | null>(null);

  const handleAnalyze = () => {
    const result = detectDeadlock(processes);
    setDetectionResult(result);
  };

  const handleLoadExample = (exampleProcesses: Process[]) => {
    setProcesses(exampleProcesses);
    setDetectionResult(null);
  };

  const handleResolveDeadlock = () => {
    if (!detectionResult || !detectionResult.hasDeadlock) return;

    // Get the first cycle
    const cycle = detectionResult.cycles[0];
    
    // Find a process in the cycle
    const processInCycle = cycle.find(node => node.startsWith('P'));
    
    if (processInCycle) {
      // Remove one requesting resource from this process to break the cycle
      setProcesses(prevProcesses => 
        prevProcesses.map(p => {
          if (p.id === processInCycle && p.requesting.length > 0) {
            return {
              ...p,
              requesting: p.requesting.slice(0, -1)
            };
          }
          return p;
        })
      );
      
      // Clear detection result to force re-detection
      setDetectionResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center relative">
          <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Deadlock Detector
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Analyze process dependencies and resource allocation to identify circular wait conditions and prevent system deadlocks
          </p>
        </div>

        {/* Resource Configuration */}
        <div className="mb-6">
          <ResourceConfiguration
            resourceCount={resourceCount}
            onResourceCountChange={setResourceCount}
            processCount={processCount}
            onProcessCountChange={setProcessCount}
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ProcessInput
              processes={processes}
              onProcessesChange={setProcesses}
              maxProcesses={processCount}
            />
            <ExampleScenarios onLoadExample={handleLoadExample} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ResourceGraph
              processes={processes}
              cycles={detectionResult?.cycles || []}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-6">
          <Button
            onClick={handleAnalyze}
            size="lg"
            className="gap-2 px-8"
            disabled={processes.length === 0}
          >
            <Activity className="h-5 w-5" />
            Detect Deadlock
          </Button>
          
          {detectionResult?.hasDeadlock && (
            <Button
              onClick={handleResolveDeadlock}
              size="lg"
              variant="destructive"
              className="gap-2 px-8"
            >
              Break Deadlock
            </Button>
          )}
        </div>

        {/* Results */}
        {detectionResult && <DetectionResults result={detectionResult} />}
      </div>
    </div>
  );
};

export default Index;
