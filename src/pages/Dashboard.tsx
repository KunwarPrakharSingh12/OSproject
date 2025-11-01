import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Activity, LogOut, Plus, Users } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Board {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
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
      fetchBoards();
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

  const fetchBoards = async () => {
    try {
      const { data, error } = await supabase
        .from("boards")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBoards(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDemoBoard = async () => {
    try {
      const { data, error } = await supabase
        .from("boards")
        .insert({
          title: "Demo Project Board",
          description: "Collaborative workspace with deadlock detection",
          owner_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Board Created",
        description: "Your collaborative board is ready!",
      });

      navigate(`/board/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const deleteAllBoards = async () => {
    try {
      const { error } = await supabase
        .from("boards")
        .delete()
        .eq("owner_id", user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "All boards deleted successfully",
      });

      fetchBoards();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CollabLock</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Boards</h1>
            <p className="text-muted-foreground">
              Collaborative workspaces with real-time deadlock detection
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={createDemoBoard} className="gap-2">
              <Plus className="h-4 w-4" />
              New Board
            </Button>
            {boards.length > 0 && (
              <Button 
                onClick={deleteAllBoards} 
                variant="destructive" 
                className="gap-2"
              >
                Delete All Boards
              </Button>
            )}
          </div>
        </div>

        {boards.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No boards yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first collaborative board to get started
            </p>
            <Button onClick={createDemoBoard}>Create Your First Board</Button>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/board/${board.id}`)}
              >
                <h3 className="text-xl font-semibold mb-2">{board.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {board.description || "No description"}
                </p>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(board.created_at).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;