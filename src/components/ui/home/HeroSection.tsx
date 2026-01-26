import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function HeroSection({ user }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-amber-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-3xl" />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}>

            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              Growing together in faith
            </span>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight mb-6">
              Dive Deeper into{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                Scripture
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl">
              Guided studies, church courses, and community connection—everything you need 
              to grow in your relationship with Christ, together.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap gap-4">

            <Link to={createPageUrl("Studies")}>
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold gap-2 h-12 px-8">
                <BookOpen className="h-5 w-5" />
                Start a Study
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to={createPageUrl("Courses")}>
              <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold gap-2 h-12 px-8">
                Browse Courses
              </Button>
            </Link>
          </motion.div>
        </div>
        
        {/* Stats */}
     
      </div>
    </section>);

}