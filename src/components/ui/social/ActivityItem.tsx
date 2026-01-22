import React from 'react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatDistanceToNow } from "date-fns";
import { BookOpen, GraduationCap, Users, MessageCircle, Trophy, CheckCircle } from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";

export default function ActivityItem({ activity }) {
  const typeConfig = {
    started_study: { 
      icon: BookOpen, 
      color: "text-amber-500", 
      bgColor: "bg-amber-50",
      verb: "started" 
    },
    completed_study: { 
      icon: CheckCircle, 
      color: "text-emerald-500", 
      bgColor: "bg-emerald-50",
      verb: "completed" 
    },
    enrolled_course: { 
      icon: GraduationCap, 
      color: "text-violet-500", 
      bgColor: "bg-violet-50",
      verb: "enrolled in" 
    },
    completed_course: { 
      icon: Trophy, 
      color: "text-amber-500", 
      bgColor: "bg-amber-50",
      verb: "completed" 
    },
    completed_session: { 
      icon: CheckCircle, 
      color: "text-blue-500", 
      bgColor: "bg-blue-50",
      verb: "finished session in" 
    },
    joined_group: { 
      icon: Users, 
      color: "text-emerald-500", 
      bgColor: "bg-emerald-50",
      verb: "joined" 
    },
    discussion_post: { 
      icon: MessageCircle, 
      color: "text-blue-500", 
      bgColor: "bg-blue-50",
      verb: "commented on" 
    },
    milestone: { 
      icon: Trophy, 
      color: "text-amber-500", 
      bgColor: "bg-amber-50",
      verb: "achieved" 
    }
  };

  const config = typeConfig[activity.activity_type] || typeConfig.milestone;
  const Icon = config.icon;

  const getLink = () => {
    if (activity.related_type === 'study') return createPageUrl("StudyDetail") + `?id=${activity.related_id}`;
    if (activity.related_type === 'course') return createPageUrl("CourseDetail") + `?id=${activity.related_id}`;
    if (activity.related_type === 'group') return createPageUrl("GroupDetail") + `?id=${activity.related_id}`;
    return null;
  };

  const link = getLink();

  return (
    <div className="flex gap-4 p-4 hover:bg-slate-50 rounded-xl transition-colors">
      <UserAvatar 
        name={activity.user_name}
        imageUrl={activity.user_avatar}
        size="md"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className={`p-1.5 rounded-lg ${config.bgColor} flex-shrink-0`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800">
              <span className="font-semibold">{activity.user_name}</span>
              <span className="text-slate-500"> {config.verb} </span>
              {link ? (
                <Link to={link} className="font-medium text-amber-700 hover:text-amber-800">
                  {activity.title}
                </Link>
              ) : (
                <span className="font-medium">{activity.title}</span>
              )}
            </p>
            {activity.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">{activity.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}