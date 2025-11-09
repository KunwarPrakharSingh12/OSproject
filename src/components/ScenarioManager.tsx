import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, FolderOpen, Trash2 } from "lucide-react";
import { Process } from "@/components/ProcessInput";

interface Scenario {
  id: string;
  name: string;
  description: string | null;
  process_count: number;
  resource_count: number;
  processes: Process[];
  created_at: string;
}

interface ScenarioManagerProps {
  processes: Process[];
  processCount: number;
  resourceCount: number;
  onLoadScenario: (scenario: Scenario) => void;
}

export const ScenarioManager = ({
  processes,
  processCount,
  resourceCount,
  onLoadScenario,
}: ScenarioManagerProps) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from("deadlock_scenarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScenarios((data || []) as unknown as Scenario[]);
    } catch (error: any) {
      console.error("Error fetching scenarios:", error);
    }
  };

  const handleSave = async () => {
    if (!scenarioName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a scenario name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save scenarios",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("deadlock_scenarios").insert([{
        user_id: user.id,
        name: scenarioName,
        description: scenarioDescription || null,
        process_count: processCount,
        resource_count: resourceCount,
        processes: processes as any,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scenario saved successfully",
      });

      setScenarioName("");
      setScenarioDescription("");
      setSaveDialogOpen(false);
      fetchScenarios();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLoad = () => {
    const scenario = scenarios.find((s) => s.id === selectedScenarioId);
    if (scenario) {
      onLoadScenario(scenario);
      setLoadDialogOpen(false);
      toast({
        title: "Success",
        description: "Scenario loaded successfully",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("deadlock_scenarios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scenario deleted successfully",
      });

      fetchScenarios();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Save Scenario
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
            <DialogDescription>
              Save your current deadlock scenario for later use
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Scenario Name</Label>
              <Input
                id="name"
                placeholder="e.g., Dining Philosophers"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe this scenario..."
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              Save Scenario
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Load Scenario
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load Scenario</DialogTitle>
            <DialogDescription>
              Choose a saved scenario to load
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {scenarios.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No saved scenarios yet
              </p>
            ) : (
              <>
                <Select
                  value={selectedScenarioId}
                  onValueChange={setSelectedScenarioId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenarios.map((scenario) => (
                      <SelectItem key={scenario.id} value={scenario.id}>
                        {scenario.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedScenarioId && (
                  <Card className="p-4">
                    {(() => {
                      const scenario = scenarios.find(
                        (s) => s.id === selectedScenarioId
                      );
                      return scenario ? (
                        <>
                          <h4 className="font-semibold mb-2">
                            {scenario.name}
                          </h4>
                          {scenario.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {scenario.description}
                            </p>
                          )}
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Processes: {scenario.process_count}</p>
                            <p>Resources: {scenario.resource_count}</p>
                            <p>
                              Created:{" "}
                              {new Date(
                                scenario.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button
                              onClick={handleLoad}
                              className="flex-1"
                            >
                              Load Scenario
                            </Button>
                            <Button
                              onClick={() => handleDelete(scenario.id)}
                              variant="destructive"
                              size="icon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </Card>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
