import React from 'react';
import { Sparkles, Flame, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function DifficultyTracks() {
  const tracks = [
    {
      icon: Sparkles,
      level: "Beginner",
      title: "Foundation Builder",
      description: "Perfect for those new to faith or returning after time away. Learn the basics of scripture reading and understanding.",
      features: ["Introduction to Bible books", "Core Christian concepts", "Simple reflection prompts"],
      color: "emerald",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: Flame,
      level: "Intermediate",
      title: "Deep Diver",
      description: "Ready to go deeper? Explore context, original languages, and theological connections across scripture.",
      features: ["Historical context studies", "Cross-references & themes", "Guided journaling"],
      color: "amber",
      gradient: "from-amber-500 to-orange-600"
    },
    {
      icon: Crown,
      level: "Advanced",
      title: "Scholar Path",
      description: "For serious students of the Word. Academic resources, scholarly commentaries, and leadership preparation.",
      features: ["Greek & Hebrew insights", "Scholarly resources", "Teaching preparation"],
      color: "violet",
      gradient: "from-violet-500 to-purple-600"
    }
  ];

  return (
    <section className="py-20 px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-amber-600 font-medium text-sm tracking-wide uppercase mb-3 block">
            Personalized Learning
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
            Study at Your Level
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Whether you're just beginning or have studied for years, 
            find studies tailored to where you are.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tracks.map((track, i) => (
            <motion.div
              key={track.level}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-300"
            >
              <div className={`h-2 bg-gradient-to-r ${track.gradient}`} />
              <div className="p-8">
                <div className={`w-12 h-12 rounded-xl bg-${track.color}-100 flex items-center justify-center mb-6`}>
                  <track.icon className={`h-6 w-6 text-${track.color}-600`} />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wider text-${track.color}-600`}>
                  {track.level}
                </span>
                <h3 className="text-xl font-bold text-slate-800 mt-2 mb-3">
                  {track.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  {track.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {track.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className={`w-1.5 h-1.5 rounded-full bg-${track.color}-400`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to={createPageUrl("Studies") + `?difficulty=${track.level.toLowerCase()}`}>
                  <Button variant="ghost" className={`w-full justify-between text-${track.color}-700 hover:text-${track.color}-800 hover:bg-${track.color}-50`}>
                    Browse {track.level} Studies
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}