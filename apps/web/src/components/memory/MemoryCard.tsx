"use client";

import { useState } from "react";
import { MemoryCategory, MemoryFact } from "@/types/memory";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Check, 
  X,
  User,
  HeartPulse,
  Plane,
  Utensils,
  Calendar,
  BrainCircuit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ICONS: Record<MemoryCategory, any> = {
  personal: User,
  health: HeartPulse,
  travel: Plane,
  food: Utensils,
  schedule: Calendar,
  other: BrainCircuit,
};

interface MemoryCardProps {
  category: MemoryCategory;
  facts: MemoryFact[];
  onAddFact: (category: MemoryCategory, fact: string) => Promise<void>;
  onUpdateFact: (id: string, fact: string) => Promise<void>;
  onDeleteFact: (id: string) => Promise<void>;
}

export function MemoryCard({
  category,
  facts,
  onAddFact,
  onUpdateFact,
  onDeleteFact,
}: MemoryCardProps) {
  const Icon = ICONS[category];
  const [isAdding, setIsAdding] = useState(false);
  const [newFact, setNewFact] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleAdd = async () => {
    if (!newFact.trim()) return;
    await onAddFact(category, newFact);
    setNewFact("");
    setIsAdding(false);
  };

  const startEdit = (fact: MemoryFact) => {
    setEditingId(fact.id);
    setEditValue(fact.fact);
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    await onUpdateFact(id, editValue);
    setEditingId(null);
  };

  return (
    <Card className="h-full flex flex-col rounded-xl border border-border border-l-4 border-l-primary shadow-sm transition-all hover:shadow-md bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {category}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          {isAdding && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <Input
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="Add new fact..."
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAdd}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          )}
          
          {facts.length === 0 && !isAdding && (
            <p className="text-xs text-muted-foreground italic">No facts yet.</p>
          )}

          <div className="flex flex-wrap gap-2">
            {facts.map((fact) => (
              <div
                key={fact.id}
                className="group flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-2 py-1 text-sm hover:bg-secondary transition-colors w-full sm:w-auto overflow-hidden"
              >
                {editingId === fact.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-6 text-sm px-1 py-0 min-w-[150px]"
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(fact.id)}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => saveEdit(fact.id)}
                    >
                      <Check className="h-3 w-3 text-green-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="truncate max-w-[200px] sm:max-w-[150px] md:max-w-[200px]" title={fact.fact}>
                      {fact.fact}
                    </span>
                    <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(fact)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 text-muted-foreground hover:text-red-500"
                        onClick={() => onDeleteFact(fact.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
