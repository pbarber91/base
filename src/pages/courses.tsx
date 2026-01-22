import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import CourseCard from '@/components/courses/CourseCard';
import CourseFilters from '@/components/courses/CourseFilters';
import EmptyState from '@/components/shared/EmptyState';
import { GraduationCap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function Courses() {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    difficulty: '',
    church_id: ''
  });
  const [userChurchId, setUserChurchId] = useState(null);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ is_published: true }, '-enrollment_count')
  });

  const { data: churches = [] } = useQuery({
    queryKey: ['churches'],
    queryFn: () => base44.entities.Church.list()
  });

  React.useEffect(() => {
    base44.auth.me().then(u => {
      base44.entities.UserProfile.filter({ user_email: u.email }, null, 1)
        .then(p => setUserChurchId(p[0]?.church_id));
    }).catch(() => null);
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Only show public courses OR courses from user's church
      if (course.visibility === 'church_only' && course.church_id !== userChurchId) {
        return false;
      }
      const searchMatch = !filters.search || 
        course.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        course.description?.toLowerCase().includes(filters.search.toLowerCase());
      
      const categoryMatch = !filters.category || course.category === filters.category;
      const difficultyMatch = !filters.difficulty || course.difficulty === filters.difficulty;
      const churchMatch = !filters.church_id || course.church_id === filters.church_id;
      
      return searchMatch && categoryMatch && difficultyMatch && churchMatch;
    });
  }, [courses, filters, userChurchId]);

  const clearFilters = () => {
    setFilters({ search: '', category: '', difficulty: '', church_id: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-500 to-purple-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-violet-100 font-medium">Church Courses</span>
            </div>
            <h1 className="text-4xl font-serif font-bold mb-4">
              Grow Through Discipleship
            </h1>
            <p className="text-lg text-violet-100 leading-relaxed">
              Multi-session courses created by church leaders for deeper spiritual growth 
              and practical application of biblical truth.
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <CourseFilters 
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
          churches={churches}
        />
        
        {loadingCourses ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <CourseCard course={course} />
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title="No courses found"
            description="Try adjusting your filters or check back later for new courses."
            action={clearFilters}
            actionLabel="Clear Filters"
          />
        )}
      </div>
    </div>
  );
}