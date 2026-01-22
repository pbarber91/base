import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import StudyCard from '@/components/studies/StudyCard';
import StudyFilters from '@/components/studies/StudyFilters';
import EmptyState from '@/components/shared/EmptyState';
import { BookOpen, Loader2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Studies() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialDifficulty = urlParams.get('difficulty') || '';
  
  const [filters, setFilters] = useState({
    search: '',
    difficulty: initialDifficulty,
    book: ''
  });

  const { data: studies = [], isLoading } = useQuery({
    queryKey: ['studies'],
    queryFn: () => base44.entities.ScriptureStudy.filter({ is_published: true }, '-created_date')
  });

  const filteredStudies = useMemo(() => {
    return studies.filter(study => {
      const searchMatch = !filters.search || 
        study.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
        study.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        study.scripture_reference?.toLowerCase().includes(filters.search.toLowerCase());
      
      const difficultyMatch = !filters.difficulty || study.difficulty === filters.difficulty;
      const bookMatch = !filters.book || study.book === filters.book;
      
      return searchMatch && difficultyMatch && bookMatch;
    });
  }, [studies, filters]);

  const clearFilters = () => {
    setFilters({ search: '', difficulty: '', book: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-amber-100 font-medium">Scripture Studies</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-4xl font-serif font-bold mb-4">
                  Explore God's Word
                </h1>
                <p className="text-lg text-amber-100 leading-relaxed">
                  Guided journeys through scripture with thoughtful prompts and curated resources 
                  to help you understand and apply God's Word.
                </p>
              </div>
              <Link to="/StartStudy">
                <Button className="bg-white text-amber-600 hover:bg-amber-50 mt-2 sm:mt-0">
                  <Plus className="h-5 w-5 mr-2" />
                  Start New Study
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <StudyFilters 
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
        />
        
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
          </div>
        ) : filteredStudies.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStudies.map((study, i) => (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <StudyCard study={study} />
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No studies found"
            description="Try adjusting your filters or check back later for new studies."
            action={clearFilters}
            actionLabel="Clear Filters"
          />
        )}
      </div>
    </div>
  );
}