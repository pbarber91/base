import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Lock, BookOpen, GraduationCap, ArrowRight } from "lucide-react";
import GradientCard from "@/components/ui/GradientCard";
import UserAvatar from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";

export default function GroupCard({ group, members = [] }) {
  const typeConfig = {
    scripture_study: { icon: BookOpen, label: "Scripture Study", color: "amber" },
    course: { icon: GraduationCap, label: "Course Group", color: "violet" },
    general: { icon: Users, label: "Fellowship", color: "emerald" }
  };

  const config = typeConfig[group.type] || typeConfig.general;
  const Icon = config.icon;

  return (
    <Link to={createPageUrl("GroupDetail") + `?id=${group.id}`}>
      <GradientCard variant="sage" className="p-6 h-full group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-${config.color}-100 flex items-center justify-center`}>
            <Icon className={`h-6 w-6 text-${config.color}-600`} />
          </div>
          {group.is_private && (
            <Badge variant="outline" className="gap-1 text-slate-500">
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-amber-700 transition-colors">
          {group.name}
        </h3>
        
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
          {group.description}
        </p>
        
        <Badge variant="secondary" className="mb-4">
          {config.label}
        </Badge>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((member, i) => (
                <UserAvatar 
                  key={i}
                  name={member.display_name}
                  imageUrl={member.avatar_url}
                  size="xs"
                />
              ))}
              {(group.member_emails?.length || 0) > 4 && (
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-500 ring-2 ring-white">
                  +{(group.member_emails?.length || 0) - 4}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-500 ml-3">
              {group.member_emails?.length || 0} / {group.max_members} members
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </GradientCard>
    </Link>
  );
}