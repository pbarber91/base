import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Clock, Users, BookMarked, ArrowRight, Calendar } from "lucide-react";
import GradientCard from "@/components/ui/GradientCard";
import DifficultyBadge from "@/components/ui/DifficultyBadge";
import UserAvatar from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";

export default function CourseCard({ course, showProgress, enrollment }) {
  const categoryLabels = {
    foundations: "Foundations",
    bible_study: "Bible Study",
    theology: "Theology",
    spiritual_growth: "Spiritual Growth",
    leadership: "Leadership",
    family: "Family",
    outreach: "Outreach",
    other: "Other"
  };

  return (
    <Link to={createPageUrl("CourseDetail") + `?id=${course.id}`}>
      <GradientCard variant="cool" className="overflow-hidden group cursor-pointer h-full">
        <div className="relative h-44 overflow-hidden">
          {course.cover_image_url ? (
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <BookMarked className="h-12 w-12 text-slate-300" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge className="bg-white/90 text-slate-700 backdrop-blur-sm">
              {categoryLabels[course.category] || course.category}
            </Badge>
          </div>
          {showProgress && enrollment && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200">
              <div 
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${enrollment.progress_percent || 0}%` }}
              />
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <DifficultyBadge difficulty={course.difficulty || 'beginner'} />
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {course.sessions_count || 0} sessions
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {course.estimated_weeks || 4} weeks
              </span>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-slate-800 mb-2 group-hover:text-amber-700 transition-colors line-clamp-2">
            {course.title}
          </h3>
          
          <p className="text-sm text-slate-500 mb-4 line-clamp-2">
            {course.description}
          </p>
          
          {course.instructor_name && (
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar name={course.instructor_name} size="sm" />
              <span className="text-sm text-slate-600">{course.instructor_name}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {course.enrollment_count || 0} enrolled
            </span>
            <span className="text-amber-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              {showProgress && enrollment ? 'Continue' : 'View Course'}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </GradientCard>
    </Link>
  );
}