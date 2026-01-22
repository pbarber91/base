import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GradientCard from "@/components/ui/GradientCard";
import { BookOpen, ChevronRight, Sparkles, Compass, Mountain } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function StartStudy() {
  const [reference, setReference] = useState('');
  const [track, setTrack] = useState('');

  useEffect(() => {
    base44.auth.me().catch(() => {
      // Redirect to GetStarted if not logged in
      window.location.href = createPageUrl("GetStarted");
    });
  }, []);

  const tracks = [
    {
      id: 'beginner',
      title: 'Beginner Track',
      icon: Sparkles,
      color: 'from-emerald-500 to-teal-600',
      description: 'Perfect for those new to Bible study. Focus on observations and practical application.',
      prompts: ['What do you observe?', 'How will you apply this?']
    },
    {
      id: 'intermediate',
      title: 'Intermediate Track',
      icon: Compass,
      color: 'from-blue-500 to-indigo-600',
      description: 'Dig deeper with historical context. Explore original audience and cultural differences.',
      prompts: ['Who was the audience?', 'What did it mean to them?', 'How is our context similar/different?']
    },
    {
      id: 'advanced',
      title: 'Advanced Track',
      icon: Mountain,
      color: 'from-purple-500 to-violet-600',
      description: 'Comprehensive study with structure analysis, themes, cross-references, and word studies.',
      prompts: ['Structure & flow', 'Key themes', 'Cross-references', 'Word studies', 'Commentary notes']
    }
  ];

  const handleStart = () => {
    if (reference && track) {
      const params = new URLSearchParams({ reference, track });
      window.location.href = createPageUrl("StudySession") + "?" + params.toString();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-amber-100 font-medium">Scripture Study</span>
            </div>
            <h1 className="text-4xl font-serif font-bold mb-4">
              Start a New Study
            </h1>
            <p className="text-lg text-amber-100 leading-relaxed">
              Choose your scripture passage and study track. We'll guide you with thoughtful prompts and helpful resources.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GradientCard variant="warm" className="p-8 mb-8">
            <Label htmlFor="reference" className="text-base font-semibold text-slate-800 mb-2 block">
              Scripture Reference
            </Label>
            <Input
              id="reference"
              placeholder="e.g., John 3:16-17, Romans 8, Psalm 23"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="text-lg h-12"
            />
            <p className="text-sm text-slate-500 mt-2">
              Enter the passage you want to study today
            </p>
          </GradientCard>
        </motion.div>

        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Choose Your Study Track</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {tracks.map((t, i) => {
              const Icon = t.icon;
              const isSelected = track === t.id;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                >
                  <button
                    onClick={() => setTrack(t.id)}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 shadow-lg'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">{t.title}</h3>
                    <p className="text-sm text-slate-600 mb-4">{t.description}</p>
                    <div className="space-y-1">
                      {t.prompts.slice(0, 3).map((prompt, idx) => (
                        <div key={idx} className="text-xs text-slate-500 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          {prompt}
                        </div>
                      ))}
                      {t.prompts.length > 3 && (
                        <div className="text-xs text-slate-400">+ {t.prompts.length - 3} more</div>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-end"
        >
          <Button
            size="lg"
            onClick={handleStart}
            disabled={!reference || !track}
            className="bg-amber-600 hover:bg-amber-700 text-lg px-8"
          >
            Begin Study
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}