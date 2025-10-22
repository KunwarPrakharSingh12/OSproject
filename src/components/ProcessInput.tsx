import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, XCircle } from "lucide-react";

export interface Process {
  id: string;
  name: string;
  holding: string[];
  requesting: string[];
}

interface ProcessInputProps {
  processes: Process[];
  onProcessesChange: (processes: Process[]) => void;
}

export const ProcessInput = ({ processes, onProcessesChange }: ProcessInputProps) => {
  const addProcess = () => {
    const newProcess: Process = {
      id: `P${processes.length + 1}`,
      name: `Process ${processes.length + 1}`,
      holding: [],
      requesting: [],
    };
    onProcessesChange([...processes, newProcess]);
  };

  const removeProcess = (id: string) => {
    onProcessesChange(processes.filter((p) => p.id !== id));
  };

  const clearAllProcesses = () => {
    onProcessesChange([]);
  };

  const updateProcess = (id: string, field: keyof Process, value: string | string[]) => {
    onProcessesChange(
      processes.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleResourceInput = (
    id: string,
    field: "holding" | "requesting",
    value: string
  ) => {
    const resources = value
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
    updateProcess(id, field, resources);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Process Configuration</h2>
        <div className="flex gap-2">
          {processes.length > 0 && (
            <Button 
              onClick={clearAllProcesses} 
              size="sm" 
              variant="outline"
              className="gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
            >
              <XCircle className="h-4 w-4" />
              Clear All
            </Button>
          )}
          <Button onClick={addProcess} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Process
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {processes.map((process) => (
          <div
            key={process.id}
            className="p-4 border rounded-lg space-y-3 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <Label className="font-mono font-semibold">{process.id}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeProcess(process.id)}
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${process.id}-name`}>Process Name</Label>
              <Input
                id={`${process.id}-name`}
                value={process.name}
                onChange={(e) => updateProcess(process.id, "name", e.target.value)}
                placeholder="Process name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${process.id}-holding`}>
                Holding Resources (comma-separated)
              </Label>
              <Input
                id={`${process.id}-holding`}
                value={process.holding.join(", ")}
                onChange={(e) =>
                  handleResourceInput(process.id, "holding", e.target.value)
                }
                placeholder="e.g., R1, R2"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${process.id}-requesting`}>
                Requesting Resources (comma-separated)
              </Label>
              <Input
                id={`${process.id}-requesting`}
                value={process.requesting.join(", ")}
                onChange={(e) =>
                  handleResourceInput(process.id, "requesting", e.target.value)
                }
                placeholder="e.g., R3, R4"
                className="font-mono"
              />
            </div>
          </div>
        ))}

        {processes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No processes configured. Click "Add Process" to begin.
          </div>
        )}
      </div>
    </Card>
  );
};
