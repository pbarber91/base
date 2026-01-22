import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Sparkles, Flame, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DifficultyBadge({ difficulty, className }) {
  const config = {
    beginner: {
      icon: Sparkles,
      label: "Beginner",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
    },
    intermediate: {
      icon: Flame,
      label: "Intermediate", 
      className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
    },
    advanced: {
      icon: Crown,
      label: "Advanced",
      className: "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
    }
  };

  const { icon: Icon, label, className: badgeClass } = config[difficulty] || config.beginner;

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", badgeClass, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}