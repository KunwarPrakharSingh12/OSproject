import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ResourceLock {
  id: string;
  user_id: string;
  component_id: string;
  requested_at: string;
  acquired_at: string | null;
  released_at: string | null;
}

interface Component {
  id: string;
  title: string;
}

interface DeadlockCycle {
  components: string[];
  users: string[];
}

interface DeadlockMonitorProps {
  locks: ResourceLock[];
  components: Component[];
  currentUserId: string;
  onResolve: (lockId: string) => void;
}

export const DeadlockMonitor = ({ locks, components, currentUserId, onResolve }: DeadlockMonitorProps) => {
  const [deadlockStatus, setDeadlockStatus] = useState<{
    detected: boolean;
    cycles: DeadlockCycle[];
    message: string;
  }>({
    detected: false,
    cycles: [],
    message: "System healthy",
  });

  useEffect(() => {
    detectDeadlock();
  }, [locks]);

  const detectDeadlock = () => {
    // Build wait-for graph
    const waitingFor: Map<string, Set<string>> = new Map();
    const componentOwners: Map<string, string> = new Map();

    // Track who owns which components
    locks.forEach((lock) => {
      if (lock.acquired_at && !lock.released_at) {
        componentOwners.set(lock.component_id, lock.user_id);
      }
    });

    // Build wait-for relationships
    locks.forEach((lock) => {
      if (!lock.acquired_at && !lock.released_at) {
        // This user is waiting for this component
        const owner = componentOwners.get(lock.component_id);
        if (owner && owner !== lock.user_id) {
          if (!waitingFor.has(lock.user_id)) {
            waitingFor.set(lock.user_id, new Set());
          }
          waitingFor.get(lock.user_id)!.add(owner);
        }
      }
    });

    // Detect cycles using DFS
    const cycles: DeadlockCycle[] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (userId: string): boolean => {
      visited.add(userId);
      recStack.add(userId);
      path.push(userId);

      const neighbors = waitingFor.get(userId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStartIndex = path.indexOf(neighbor);
          const cycleUsers = path.slice(cycleStartIndex);
          
          // Get components involved
          const involvedComponents: string[] = [];
          locks.forEach((lock) => {
            if (cycleUsers.includes(lock.user_id) && (lock.acquired_at || !lock.released_at)) {
              if (!involvedComponents.includes(lock.component_id)) {
                involvedComponents.push(lock.component_id);
              }
            }
          });

          cycles.push({
            users: cycleUsers,
            components: involvedComponents,
          });
          return true;
        }
      }

      path.pop();
      recStack.delete(userId);
      return false;
    };

    // Check for cycles starting from each user
    for (const userId of waitingFor.keys()) {
      if (!visited.has(userId)) {
        dfs(userId);
      }
    }

    if (cycles.length > 0) {
      setDeadlockStatus({
        detected: true,
        cycles,
        message: `⚠️ Deadlock detected! ${cycles.length} circular wait condition(s) found.`,
      });
    } else {
      setDeadlockStatus({
        detected: false,
        cycles: [],
        message: "✓ System is safe - no deadlocks detected",
      });
    }
  };

  const getComponentTitle = (componentId: string) => {
    const component = components.find((c) => c.id === componentId);
    return component?.title || "Unknown Component";
  };

  const getUserLocksInCycle = (cycle: DeadlockCycle) => {
    return locks.filter((lock) => 
      cycle.users.includes(lock.user_id) && 
      cycle.components.includes(lock.component_id) &&
      lock.user_id === currentUserId
    );
  };

  return (
    <Card className="p-6 border-2 transition-all">
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-full ${deadlockStatus.detected ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          {deadlockStatus.detected ? (
            <AlertTriangle className="h-6 w-6 text-destructive" />
          ) : (
            <Shield className="h-6 w-6 text-primary" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Deadlock Monitor</h3>
            <Badge variant={deadlockStatus.detected ? "destructive" : "default"}>
              {deadlockStatus.detected ? "Active" : "Clear"}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            {deadlockStatus.message}
          </p>

          {deadlockStatus.detected && deadlockStatus.cycles.length > 0 && (
            <div className="space-y-4">
              {deadlockStatus.cycles.map((cycle, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Circular Wait Detected (Cycle {index + 1})</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-2">
                      <div>
                        <strong>Involved Components:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {cycle.components.map((compId) => (
                            <li key={compId} className="text-sm">
                              {getComponentTitle(compId)}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <strong>Resolution Options:</strong>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>• Release one of your locked components</p>
                          <p>• Wait for another user to release their lock</p>
                          <p>• Request resources in a consistent order</p>
                        </div>
                      </div>

                      {getUserLocksInCycle(cycle).length > 0 && (
                        <div className="pt-2 flex gap-2">
                          {getUserLocksInCycle(cycle).map((lock) => (
                            <Button
                              key={lock.id}
                              size="sm"
                              variant="outline"
                              onClick={() => onResolve(lock.id)}
                            >
                              Release {getComponentTitle(lock.component_id)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Prevention Tips</AlertTitle>
                <AlertDescription className="text-sm space-y-1">
                  <p>• Always request resources in the same order</p>
                  <p>• Release locks as soon as you're done</p>
                  <p>• Avoid holding multiple locks simultaneously</p>
                  <p>• Use timeouts for lock acquisition</p>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!deadlockStatus.detected && locks.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p>Currently monitoring {locks.filter(l => !l.released_at).length} active locks</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
