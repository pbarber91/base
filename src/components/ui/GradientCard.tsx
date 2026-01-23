// src/components/ui/GradientCard.tsx
import React from "react";
import { cn } from "@/lib/utils";

export default function GradientCard({
  children,
  className,
  variant = "warm",
  hover = true,
  ...props
}: any) {
  const variants: Record<string, string> = {
    warm: "bg-gradient-to-br from-amber-50 via-white to-orange-50",
    cool: "bg-gradient-to-br from-slate-50 via-white to-blue-50",
    sage: "bg-gradient-to-br from-emerald-50 via-white to-teal-50",
    purple: "bg-gradient-to-br from-violet-50 via-white to-indigo-50",
    sunset: "bg-gradient-to-br from-rose-50 via-white to-amber-50",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100/80 shadow-sm",
        // ✅ Ensure readable default text on these light gradient surfaces
        "text-foreground",
        variants[variant],
        hover && "transition-all duration-300 hover:shadow-lg hover:border-slate-200/80 hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
