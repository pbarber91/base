import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import HeroSection from '@/components/home/HeroSection';
import FeatureCards from '@/components/home/FeatureCards';
import DifficultyTracks from '@/components/home/DifficultyTracks';
import StudyCard from '@/components/studies/StudyCard';
import CourseCard from '@/components/courses/CourseCard';
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: featuredStudies = [], isLoading: loadingStudies } = useQuery({
    queryKey: ['featured-studies'],
    queryFn: () => base44.entities.ScriptureStudy.filter({ is_published: true }, '-created_date', 4),
    enabled: !!user
  });

  const { data: featuredCourses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ['featured-courses'],
    queryFn: () => base44.entities.Course.filter({ is_published: true, visibility: 'public' }, '-enrollment_count', 4),
    enabled: !!user
  });

  return (
    <div className="min-h-screen bg-white">
      <HeroSection user={user} />
      <FeatureCards />
      <DifficultyTracks />
      
      {/* Featured Studies */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-amber-600 font-medium text-sm tracking-wide uppercase mb-2 block">
                Scripture Studies
              </span>
              <h2 className="text-3xl font-serif font-bold text-slate-800">
                Popular Studies
              </h2>
            </div>
            <Link to={createPageUrl("Studies")}>
              <Button variant="ghost" className="text-amber-700 hover:text-amber-800 gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {loadingStudies ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : featuredStudies.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredStudies.map((study, i) => (
                <motion.div
                  key={study.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <StudyCard study={study} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No studies available yet. Check back soon!
            </div>
          )}
        </div>
      </section>
      
      {/* Featured Courses */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-violet-600 font-medium text-sm tracking-wide uppercase mb-2 block">
                Church Courses
              </span>
              <h2 className="text-3xl font-serif font-bold text-slate-800">
                Featured Courses
              </h2>
            </div>
            <Link to={createPageUrl("Courses")}>
              <Button variant="ghost" className="text-violet-700 hover:text-violet-800 gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {loadingCourses ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredCourses.map((course, i) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <CourseCard course={course} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No courses available yet. Check back soon!
            </div>
          )}
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-6">
            Ready to Grow in Your Faith?
          </h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            Join thousands of believers who are diving deeper into scripture and building 
            meaningful connections with their church community.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={createPageUrl("Studies")}>
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700 h-12 px-8">
                Start Your Journey
              </Button>
            </Link>
            <Link to={createPageUrl("Groups")}>
              <Button size="lg" variant="outline" className="h-12 px-8">
                Find a Group
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}