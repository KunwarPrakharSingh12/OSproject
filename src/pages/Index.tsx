import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProcessInput, Process } from "@/components/ProcessInput";
import { ResourceGraph } from "@/components/ResourceGraph";
import { DetectionResults } from "@/components/DetectionResults";
import { ExampleScenarios } from "@/components/ExampleScenarios";
import { ResourceConfiguration } from "@/components/ResourceConfiguration";
import { ScenarioManager } from "@/components/ScenarioManager";
import { detectDeadlock } from "@/components/DeadlockDetector";
import { Button } from "@/components/ui/button";
import { Activity, LogOut, Home } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [resourceCount, setResourceCount] = useState<number>(5);
  const [processCount, setProcessCount] = useState<number>(10);
  const [detectionResult, setDetectionResult] = useState<ReturnType<typeof detectDeadlock> | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  const handleLoadScenario = (scenario: any) => {
    setProcesses(scenario.processes);
    setProcessCount(scenario.process_count);
    setResourceCount(scenario.resource_count);
    setDetectionResult(null);
    toast({
      title: "Success",
      description: `Loaded scenario: ${scenario.name}`,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ZeroLock Detector</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <Home className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Title */}
        <div className="mb-6 text-center">
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Analyze process dependencies and resource allocation to identify circular wait conditions
          </p>
        </div>

        {/* Scenario Manager */}
        <div className="mb-6 flex justify-center">
          <ScenarioManager
            processes={processes}
            processCount={processCount}
            resourceCount={resourceCount}
            onLoadScenario={handleLoadScenario}
          />
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
