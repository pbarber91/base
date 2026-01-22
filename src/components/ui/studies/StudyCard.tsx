import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, Users, BookOpen, ArrowRight } from "lucide-react";
import GradientCard from "@/components/ui/GradientCard";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import { Badge } from "@/components/ui/badge";

export default function StudyCard({ study }) {
  return (
    <Link to={createPageUrl("StudyDetail") + `?id=${study.id}`}>
      <GradientCard 
        variant={study.difficulty === 'beginner' ? 'sage' : study.difficulty === 'advanced' ? 'purple' : 'warm'} 
        className="overflow-hidden group cursor-pointer"
      >
        {study.cover_image_url && (
          <div className="h-40 overflow-hidden">
            <img 
              src={study.cover_image_url} 
              alt={study.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <DifficultyBadge difficulty={study.difficulty} />
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {study.estimated_minutes || 20} min
            </span>
          </div>
          
          <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-amber-700 transition-colors line-clamp-2">
            {study.title}
          </h3>
          
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">
            {study.description}
          </p>
          
          <div className="flex items-center gap-2 text-sm text-amber-700 font-medium mb-4">
            <BookOpen className="h-4 w-4" />
            {study.scripture_reference}
          </div>
          
          {study.tags && study.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {study.tags.slice(0, 3).map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-white/50">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {study.participants_count || 0} studying
            </span>
            <span className="text-amber-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Begin Study
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </GradientCard>
    </Link>
  );
}