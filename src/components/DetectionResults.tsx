import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle } from "lucide-react";
import { DetectionResult } from "./DeadlockDetector";
import { getResolutionStrategies } from "./DeadlockDetector";

interface DetectionResultsProps {
  result: DetectionResult;
}

export const DetectionResults = ({ result }: DetectionResultsProps) => {
  const strategies = getResolutionStrategies(result.cycles);

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start gap-4">
          {result.hasDeadlock ? (
            <AlertCircle className="h-8 w-8 text-destructive flex-shrink-0 mt-1" />
          ) : (
            <CheckCircle className="h-8 w-8 text-success flex-shrink-0 mt-1" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold">Detection Result</h2>
              <Badge
                variant={result.hasDeadlock ? "destructive" : "default"}
                className={
                  result.hasDeadlock ? "" : "bg-success hover:bg-success/90"
                }
              >
                {result.hasDeadlock ? "Deadlock Detected" : "Safe State"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{result.message}</p>
          </div>
        </div>

        {result.cycles.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-destructive">
              Circular Wait Conditions:
            </h3>
            {result.cycles.map((cycle, index) => (
              <div
                key={index}
                className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg"
              >
                <div className="font-mono text-sm">
                  <span className="font-semibold">Cycle {index + 1}: </span>
                  {cycle.join(" → ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {result.hasDeadlock && strategies.length > 0 && (
        <>
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resolution Strategies</h2>
            <div className="space-y-2 text-sm">
              {strategies.map((strategy, index) => (
                <div
                  key={index}
                  className={
                    strategy.startsWith("**")
                      ? "font-semibold mt-4 first:mt-0"
                      : strategy.startsWith("  •") || strategy.startsWith("  ")
                      ? "ml-4 text-muted-foreground"
                      : ""
                  }
                >
                  {strategy.replace(/\*\*/g, "")}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Prevention Strategies</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold mb-2">How to Avoid Deadlocks:</p>
              </div>
              
              <div className="space-y-2">
                <p className="font-medium">1. Resource Ordering</p>
                <p className="ml-4 text-muted-foreground">
                  Always acquire resources in a consistent order across all processes. For example, if Process A needs Resources 1 and 2, always request Resource 1 first, then Resource 2.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">2. Timeout Mechanism</p>
                <p className="ml-4 text-muted-foreground">
                  Implement timeouts when requesting resources. If a resource cannot be acquired within a time limit, release all held resources and retry.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">3. Request All Resources at Once</p>
                <p className="ml-4 text-muted-foreground">
                  Instead of acquiring resources incrementally, request all needed resources at the beginning. This prevents partial allocation that can lead to circular wait.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">4. Avoid Hold and Wait</p>
                <p className="ml-4 text-muted-foreground">
                  Release currently held resources before requesting new ones. This breaks the hold-and-wait condition necessary for deadlocks.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium">5. Use Lock Hierarchy</p>
                <p className="ml-4 text-muted-foreground">
                  Assign priority levels to resources and always acquire locks in order of increasing priority. This creates a total ordering that prevents circular dependencies.
                </p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
