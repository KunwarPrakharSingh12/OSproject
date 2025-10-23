import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Activity, ArrowLeft, Plus, Lock, Unlock, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DeadlockMonitor } from "@/components/DeadlockMonitor";
import { BoardResourceGraph } from "@/components/BoardResourceGraph";

interface Board {
  id: string;
  title: string;
  description: string | null;
}

interface Component {
  id: string;
  title: string;
  content: string | null;
  board_id: string;
  position_x: number;
  position_y: number;
  created_at: string;
}

interface ResourceLock {
  id: string;
  user_id: string;
  component_id: string;
  requested_at: string;
  acquired_at: string | null;
  released_at: string | null;
}

// Validation schema for component creation
const componentSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string()
    .trim()
    .max(5000, "Content must be less than 5000 characters")
    .optional()
});

const BoardPage = () => {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [board, setBoard] = useState<Board | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [locks, setLocks] = useState<ResourceLock[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [deadlockCycles, setDeadlockCycles] = useState<string[][]>([]);
  
  // New component dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComponentTitle, setNewComponentTitle] = useState("");
  const [newComponentContent, setNewComponentContent] = useState("");

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchBoardData();
    });

    // Set up realtime subscription
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "components",
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          fetchComponents();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "resource_locks",
        },
        () => {
          fetchLocks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, navigate]);

  const fetchBoardData = async () => {
    try {
      await Promise.all([fetchBoard(), fetchComponents(), fetchLocks()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoard = async () => {
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .eq("id", boardId)
      .single();

    if (error) throw error;
    setBoard(data);
  };

  const fetchComponents = async () => {
    const { data, error } = await supabase
      .from("components")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    setComponents(data || []);
  };

  const fetchLocks = async () => {
    const { data, error } = await supabase
      .from("resource_locks")
      .select("*")
      .is("released_at", null);

    if (error) throw error;
    setLocks(data || []);
  };

  const createComponent = async () => {
    // Validate input
    const validation = componentSchema.safeParse({
      title: newComponentTitle,
      content: newComponentContent || undefined
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("components").insert({
        board_id: boardId,
        title: validation.data.title,
        content: validation.data.content || null,
        position_x: Math.floor(Math.random() * 300),
        position_y: Math.floor(Math.random() * 200),
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Component created successfully",
      });

      setIsDialogOpen(false);
      setNewComponentTitle("");
      setNewComponentContent("");
      fetchComponents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const requestLock = async (componentId: string) => {
    try {
      const { error } = await supabase.from("resource_locks").insert({
        user_id: user?.id,
        component_id: componentId,
        acquired_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Lock Acquired",
        description: "You now have exclusive access to this component",
      });

      fetchLocks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const releaseLock = async (componentId: string) => {
    try {
      const lock = locks.find(
        (l) => l.component_id === componentId && l.user_id === user?.id && !l.released_at
      );

      if (!lock) return;

      // Delete the lock instead of updating to avoid unique constraint issues
      const { error } = await supabase
        .from("resource_locks")
        .delete()
        .eq("id", lock.id);

      if (error) throw error;

      toast({
        title: "Lock Released",
        description: "Component is now available for others",
      });

      fetchLocks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const releaseLockById = async (lockId: string) => {
    try {
      const { error } = await supabase
        .from("resource_locks")
        .delete()
        .eq("id", lockId);

      if (error) throw error;

      toast({
        title: "Lock Released",
        description: "Component released to help resolve deadlock",
      });

      fetchLocks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteAllComponents = async () => {
    try {
      // First, delete all locks associated with components in this board
      const componentIds = components.map(c => c.id);
      const { error: locksError } = await supabase
        .from("resource_locks")
        .delete()
        .in("component_id", componentIds);

      if (locksError) throw locksError;

      // Then delete all components
      const { error: componentsError } = await supabase
        .from("components")
        .delete()
        .eq("board_id", boardId);

      if (componentsError) throw componentsError;

      toast({
        title: "Success",
        description: "All components deleted successfully",
      });

      fetchComponents();
      fetchLocks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isComponentLocked = (componentId: string) => {
    return locks.some((l) => l.component_id === componentId && !l.released_at);
  };

  const isLockedByCurrentUser = (componentId: string) => {
    return locks.some(
      (l) => l.component_id === componentId && l.user_id === user?.id && !l.released_at
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-2xl font-bold mb-2">Board Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The board you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{board.title}</h1>
                {board.description && (
                  <p className="text-sm text-muted-foreground">
                    {board.description}
                  </p>
                )}
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Component
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Component</DialogTitle>
                  <DialogDescription>
                    Add a new component to your collaborative board
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="title"
                      value={newComponentTitle}
                      onChange={(e) => setNewComponentTitle(e.target.value)}
                      placeholder="Component title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="content" className="text-sm font-medium">
                      Description
                    </label>
                    <Textarea
                      id="content"
                      value={newComponentContent}
                      onChange={(e) => setNewComponentContent(e.target.value)}
                      placeholder="Component description..."
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createComponent}>Create Component</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Deadlock Monitor */}
        {components.length > 0 && (
          <div className="mb-8">
            <DeadlockMonitor
              locks={locks}
              components={components}
              currentUserId={user?.id || ""}
              onResolve={releaseLockById}
              onCyclesDetected={(cycles) => setDeadlockCycles(cycles)}
              onDeleteAllComponents={deleteAllComponents}
            />
          </div>
        )}

        {/* Resource Graph Visualization */}
        {locks.length > 0 && (
          <div className="mb-8">
            <BoardResourceGraph
              locks={locks}
              components={components}
              cycles={deadlockCycles}
            />
          </div>
        )}

        {components.length === 0 ? (
          <Card className="p-12 text-center">
            <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No components yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first component to start collaborating
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Component
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {components.map((component) => {
              const locked = isComponentLocked(component.id);
              const lockedByMe = isLockedByCurrentUser(component.id);

              return (
                <Card
                  key={component.id}
                  className={`p-6 transition-all ${
                    locked
                      ? lockedByMe
                        ? "border-primary shadow-glow"
                        : "border-destructive opacity-75"
                      : "hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold">{component.title}</h3>
                    {locked && (
                      <Badge variant={lockedByMe ? "default" : "destructive"}>
                        {lockedByMe ? "Locked by you" : "Locked"}
                      </Badge>
                    )}
                  </div>
                  
                  {component.content && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {component.content}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-xs text-muted-foreground">
                      {new Date(component.created_at).toLocaleDateString()}
                    </span>
                    {lockedByMe ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => releaseLock(component.id)}
                      >
                        <Unlock className="h-4 w-4 mr-2" />
                        Release
                      </Button>
                    ) : !locked ? (
                      <Button
                        size="sm"
                        onClick={() => requestLock(component.id)}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Lock
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" disabled>
                        <Lock className="h-4 w-4 mr-2" />
                        Locked
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardPage;
