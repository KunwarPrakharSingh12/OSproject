import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Lock, Users, AlertTriangle, Shield, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DeadlockInfoPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Deadlock Detection System
          </h1>
          <p className="text-lg text-muted-foreground">
            Real-time collaborative workspace with intelligent deadlock prevention
          </p>
        </div>

        {/* What is a Deadlock */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">What is a Deadlock?</h2>
              <p className="text-muted-foreground">
                A deadlock occurs when two or more processes are waiting indefinitely for resources held by each other, creating a circular wait condition that prevents any of them from proceeding.
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Example Scenario:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>User A locks Component 1 and requests Component 2</li>
              <li>User B locks Component 2 and requests Component 1</li>
              <li>Both users are now waiting for each other → Deadlock!</li>
            </ol>
          </div>
        </Card>

        {/* Four Coffman Conditions */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">The Four Coffman Conditions</h2>
          <p className="text-muted-foreground mb-4">
            All four conditions must be present simultaneously for a deadlock to occur:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">1. Mutual Exclusion</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                At least one resource must be held in a non-sharable mode. Only one process can use the resource at a time.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">2. Hold and Wait</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A process must be holding at least one resource and waiting to acquire additional resources held by other processes.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">3. No Preemption</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Resources cannot be forcibly removed from processes. They must be voluntarily released by the holding process.
              </p>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">4. Circular Wait</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                A circular chain of processes exists where each process holds a resource needed by the next process in the chain.
              </p>
            </div>
          </div>
        </Card>

        {/* How Our System Detects Deadlocks */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">How Our System Works</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Badge className="h-8 w-8 flex items-center justify-center">1</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Real-time Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  The system continuously monitors all component locks and user requests in real-time using Supabase's realtime features.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Badge className="h-8 w-8 flex items-center justify-center">2</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Wait-for Graph Construction</h3>
                <p className="text-sm text-muted-foreground">
                  We build a wait-for graph that tracks which users are waiting for resources held by other users.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Badge className="h-8 w-8 flex items-center justify-center">3</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Cycle Detection Algorithm</h3>
                <p className="text-sm text-muted-foreground">
                  Using Depth-First Search (DFS), we detect circular wait conditions in the wait-for graph.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <Badge className="h-8 w-8 flex items-center justify-center">4</Badge>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Instant Alerts & Resolution</h3>
                <p className="text-sm text-muted-foreground">
                  When a deadlock is detected, the system immediately alerts affected users and provides actionable resolution options.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Prevention Strategies */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <CheckCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Prevention Best Practices</h2>
              <p className="text-muted-foreground mb-4">
                Follow these guidelines to avoid deadlocks in your collaborative workspace:
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 border-l-4 border-primary bg-primary/5 rounded">
              <p className="font-semibold mb-1">Request Resources in Order</p>
              <p className="text-sm text-muted-foreground">
                Always lock components in the same sequence to prevent circular wait conditions.
              </p>
            </div>

            <div className="p-3 border-l-4 border-primary bg-primary/5 rounded">
              <p className="font-semibold mb-1">Release Locks Promptly</p>
              <p className="text-sm text-muted-foreground">
                Release locks as soon as you're done to minimize hold times and prevent blocking others.
              </p>
            </div>

            <div className="p-3 border-l-4 border-primary bg-primary/5 rounded">
              <p className="font-semibold mb-1">Avoid Holding Multiple Locks</p>
              <p className="text-sm text-muted-foreground">
                Try to work with one component at a time when possible to reduce complexity.
              </p>
            </div>

            <div className="p-3 border-l-4 border-primary bg-primary/5 rounded">
              <p className="font-semibold mb-1">Monitor the Deadlock Status</p>
              <p className="text-sm text-muted-foreground">
                Keep an eye on the deadlock monitor to catch potential issues early.
              </p>
            </div>
          </div>
        </Card>

        {/* Try It Out */}
        <Card className="p-6 text-center bg-gradient-to-r from-primary/10 via-purple-500/10 to-cyan-500/10 border-primary/20">
          <h2 className="text-2xl font-semibold mb-2">Ready to Try It?</h2>
          <p className="text-muted-foreground mb-6">
            Create a board and experience real-time deadlock detection in action!
          </p>
          <Button onClick={() => navigate("/dashboard")} size="lg">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default DeadlockInfoPage;
