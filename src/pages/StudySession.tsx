import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import GradientCard from "@/components/ui/GradientCard";
import { 
  ChevronDown, ChevronLeft, ExternalLink, Check, Loader2, 
  BookOpen, Users, Globe, ArrowLeftRight, Lightbulb, StickyNote,
  Network, Book, Languages, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function StudySession() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');
  const track = urlParams.get('track');

  const [user, setUser] = useState(null);
  const [responses, setResponses] = useState({});
  const [openSections, setOpenSections] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateResponse = (field, value) => {
    setResponses(prev => ({ ...prev, [field]: value }));
  };

  const resources = [
    { title: 'BibleProject — Book Overviews', url: 'https://bibleproject.com/explore/book-overviews/', subtitle: 'Quick context + structure' },
    { title: 'StepBible', url: 'https://www.stepbible.org/', subtitle: 'Cross references, lexicon, notes' },
    { title: 'Blue Letter Bible', url: 'https://www.blueletterbible.org/', subtitle: 'Word study, original language tools' },
    { title: 'NET Bible', url: 'https://netbible.org/', subtitle: 'Translator notes' },
  ];

  const sections = {
    beginner: [
      { 
        id: 'genre', 
        icon: BookOpen, 
        title: 'What genre is this?',
        placeholder: 'E.g., Gospel, Letter, Poetry, Prophecy, Narrative...',
        field: 'genre',
        tools: [
          { label: 'BibleGateway Genres', url: 'https://www.biblegateway.com/learn/bible-101/about-the-bible/biblical-genres/' },
          { label: 'BibleProject (How to Read)', url: 'https://bibleproject.com/videos/collections/how-to-read-the-bible/' }
        ]
      },
      { 
        id: 'observations', 
        icon: BookOpen, 
        title: 'What do you observe?',
        subtitle: 'Repeated words? Key phrases? Commands? Promises?',
        placeholder: 'Write what stands out to you...',
        field: 'observations',
        tools: [
          { label: 'StepBible', url: 'https://www.stepbible.org/' },
          { label: 'Blue Letter Bible', url: 'https://www.blueletterbible.org/' }
        ]
      },
      { 
        id: 'application', 
        icon: Lightbulb, 
        title: 'How will you apply this?',
        subtitle: 'What is God calling you to do or believe?',
        placeholder: 'Be specific about how this impacts your life...',
        field: 'application',
        tools: [
          { label: 'BibleProject (Character of God)', url: 'https://bibleproject.com/videos/collections/character-of-god/' }
        ]
      },
    ],
    intermediate: [
      { id: 'genre', icon: BookOpen, title: 'What genre is this?', placeholder: 'E.g., Gospel, Letter, Poetry...', field: 'genre', tools: [{ label: 'BibleGateway Genres', url: 'https://www.biblegateway.com/learn/bible-101/about-the-bible/biblical-genres/' }] },
      { id: 'observations', icon: BookOpen, title: 'What do you observe?', subtitle: 'Repeated words? Key phrases?', placeholder: 'Write what stands out...', field: 'observations', tools: [{ label: 'StepBible', url: 'https://www.stepbible.org/' }] },
      { 
        id: 'audience', 
        icon: Users, 
        title: 'Who was the original audience?',
        placeholder: 'Who was the author writing to? What was their situation?',
        field: 'original_audience',
        tools: [
          { label: 'BibleProject', url: 'https://bibleproject.com/explore/book-overviews/' },
          { label: 'StepBible', url: 'https://www.stepbible.org/' }
        ]
      },
      { 
        id: 'meaning', 
        icon: Globe, 
        title: 'What did it mean to them?',
        placeholder: 'What was the original message in their context?',
        field: 'original_meaning',
        tools: [
          { label: 'NET Bible', url: 'https://netbible.org/' },
          { label: 'Blue Letter Bible', url: 'https://www.blueletterbible.org/' }
        ]
      },
      { 
        id: 'similarities', 
        icon: ArrowLeftRight, 
        title: 'How is our context similar?',
        placeholder: 'What parallels do you see with today?',
        field: 'context_similarities',
        tools: []
      },
      { 
        id: 'differences', 
        icon: ArrowLeftRight, 
        title: 'How is our context different?',
        placeholder: 'What has changed since then?',
        field: 'context_differences',
        tools: []
      },
      { id: 'application', icon: Lightbulb, title: 'How will you apply this?', placeholder: 'Be specific...', field: 'application', tools: [] },
    ],
    advanced: [
      { id: 'genre', icon: BookOpen, title: 'What genre is this?', placeholder: 'E.g., Gospel, Letter, Poetry...', field: 'genre', tools: [] },
      { id: 'observations', icon: BookOpen, title: 'What do you observe?', placeholder: 'Write what stands out...', field: 'observations', tools: [] },
      { id: 'audience', icon: Users, title: 'Who was the original audience?', placeholder: 'Who was the author writing to?', field: 'original_audience', tools: [] },
      { id: 'meaning', icon: Globe, title: 'What did it mean to them?', placeholder: 'Original message in their context?', field: 'original_meaning', tools: [] },
      { id: 'similarities', icon: ArrowLeftRight, title: 'How is our context similar?', placeholder: 'Parallels with today?', field: 'context_similarities', tools: [] },
      { id: 'differences', icon: ArrowLeftRight, title: 'How is our context different?', placeholder: 'What has changed?', field: 'context_differences', tools: [] },
      { 
        id: 'structure', 
        icon: Network, 
        title: 'Structure & Flow',
        subtitle: 'How is the argument or narrative structured?',
        placeholder: 'Outline the flow of thought...',
        field: 'structure',
        tools: [
          { label: 'BibleProject', url: 'https://bibleproject.com/explore/book-overviews/' },
          { label: 'NET Bible', url: 'https://netbible.org/' }
        ]
      },
      { 
        id: 'themes', 
        icon: Book, 
        title: 'Key Themes',
        placeholder: 'What theological themes emerge?',
        field: 'themes',
        tools: [
          { label: 'BibleProject Themes', url: 'https://bibleproject.com/explore/themes/' }
        ]
      },
      { 
        id: 'crossrefs', 
        icon: Network, 
        title: 'Cross-References',
        subtitle: 'OT/NT connections, parallel passages',
        placeholder: 'Note related scriptures...',
        field: 'cross_references',
        tools: [
          { label: 'StepBible', url: 'https://www.stepbible.org/' },
          { label: 'OpenBible', url: 'https://www.openbible.info/labs/cross-references/' }
        ]
      },
      { 
        id: 'words', 
        icon: Languages, 
        title: 'Word Studies',
        placeholder: 'Key Greek/Hebrew words and their meanings...',
        field: 'word_studies',
        tools: [
          { label: 'Blue Letter Bible', url: 'https://www.blueletterbible.org/' }
        ]
      },
      { 
        id: 'commentary', 
        icon: MessageSquare, 
        title: 'Commentary Notes',
        subtitle: 'Scholarly insights or questions',
        placeholder: 'What are scholars saying? Your questions?',
        field: 'commentary_notes',
        tools: []
      },
      { id: 'application', icon: Lightbulb, title: 'How will you apply this?', placeholder: 'Be specific...', field: 'application', tools: [] },
    ],
  };

  const currentSections = sections[track] || sections.beginner;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.StudyResponse.create({
        user_email: user.email,
        study_id: `user-study-${Date.now()}`,
        ...responses,
        completed_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['study-responses']);
      window.location.href = createPageUrl("Studies");
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <GradientCard className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Sign in to continue</h2>
          <Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
        </GradientCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Link to={createPageUrl("StartStudy")} className="inline-flex items-center gap-2 text-amber-100 hover:text-white mb-6 text-sm">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-3xl font-serif font-bold mb-2">{reference}</h1>
          <p className="text-amber-100 capitalize">{track} Track</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Resources */}
        <GradientCard variant="sage" className="p-6 mb-8">
          <h3 className="font-bold text-slate-800 mb-3">Study Resources</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg bg-white/60 hover:bg-white border border-slate-100 hover:border-slate-200 transition-all group"
              >
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 group-hover:text-amber-600 transition-colors">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.subtitle}</div>
                </div>
              </a>
            ))}
          </div>
        </GradientCard>

        {/* Prompts */}
        <div className="space-y-4">
          {currentSections.map((section, i) => {
            const Icon = section.icon;
            const isOpen = openSections[section.id];
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
                  <GradientCard className="overflow-hidden">
                    <CollapsibleTrigger className="w-full p-6 text-left flex items-center gap-4 hover:bg-white/40 transition-colors">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Icon className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-800">{section.title}</h3>
                        {section.subtitle && <p className="text-sm text-slate-500">{section.subtitle}</p>}
                      </div>
                      <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-6 pb-6 space-y-4">
                        {section.tools && section.tools.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {section.tools.map((tool, idx) => (
                              <a
                                key={idx}
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-700 transition-colors inline-flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {tool.label}
                              </a>
                            ))}
                          </div>
                        )}
                        <Textarea
                          placeholder={section.placeholder}
                          value={responses[section.field] || ''}
                          onChange={(e) => updateResponse(section.field, e.target.value)}
                          className="min-h-32 resize-none"
                        />
                      </div>
                    </CollapsibleContent>
                  </GradientCard>
                </Collapsible>
              </motion.div>
            );
          })}
        </div>

        {/* Notes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: currentSections.length * 0.05 }}
          className="mt-4"
        >
          <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
            <GradientCard>
              <CollapsibleTrigger className="w-full p-6 text-left flex items-center gap-4 hover:bg-white/40 transition-colors">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <StickyNote className="h-5 w-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">Additional Notes</h3>
                  <p className="text-sm text-slate-500">General thoughts, questions, insights</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${openSections.notes ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6">
                  <Textarea
                    placeholder="Capture anything else God is teaching you..."
                    value={responses.notes || ''}
                    onChange={(e) => updateResponse('notes', e.target.value)}
                    className="min-h-32 resize-none"
                  />
                </div>
              </CollapsibleContent>
            </GradientCard>
          </Collapsible>
        </motion.div>

        {/* Submit */}
        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Complete Study
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}