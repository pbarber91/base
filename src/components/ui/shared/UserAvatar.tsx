import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function UserAvatar({ 
  name, 
  imageUrl, 
  size = "md",
  className,
  showStatus,
  status = "offline"
}) {
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl"
  };

  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-slate-300",
    busy: "bg-amber-500"
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative inline-block">
      <Avatar className={cn(sizeClasses[size], "ring-2 ring-white", className)}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-medium">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span className={cn(
          "absolute bottom-0 right-0 block rounded-full ring-2 ring-white",
          size === "xs" || size === "sm" ? "h-2 w-2" : "h-3 w-3",
          statusColors[status]
        )} />
      )}
    </div>
  );
}