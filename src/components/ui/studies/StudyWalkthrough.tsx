import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import GradientCard from "@/components/ui/GradientCard";
import { 
  ChevronDown, CheckCircle, ExternalLink, Book, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const EXTERNAL_RESOURCES = [
  { name: "Bible Project", url: "https://bibleproject.com", description: "Visual theology and Bible overviews" },
  { name: "NET Bible", url: "https://netbible.org", description: "Free Bible with extensive study notes" },
  { name: "Step Bible", url: "https://www.stepbible.org", description: "Interactive study tools" },
  { name: "Blue Letter Bible", url: "https://www.blueletterbible.org", description: "Original language tools and concordance" },
  { name: "Bible Gateway", url: "https://www.biblegateway.com", description: "Multiple translations and commentaries" },
  { name: "Got Questions", url: "https://www.gotquestions.org", description: "Answers to Bible questions" }
];

export default function StudyWalkthrough({ 
  study, 
  difficulty, 
  responses = {}, 
  onResponseChange,
  onComplete 
}) {
  const [isPrayerOpen, setIsPrayerOpen] = useState(false);
  const [completedSections, setCompletedSections] = useState(new Set());

  const handleTextChange = (field, value) => {
    onResponseChange({ ...responses, [field]: value });
  };

  const markSectionComplete = (section) => {
    setCompletedSections(new Set([...completedSections, section]));
  };

  const isComplete = (section) => completedSections.has(section);

  const beginnerPrompts = ['genre', 'observations', 'application', 'notes'];
  const intermediatePrompts = [...beginnerPrompts, 'original_audience', 'original_meaning', 'context_similarities', 'context_differences'];
  const advancedPrompts = [...intermediatePrompts, 'structure', 'themes', 'cross_references', 'word_studies', 'commentary_notes'];

  const currentPrompts = {
    'beginner': beginnerPrompts,
    'intermediate': intermediatePrompts,
    'advanced': advancedPrompts
  }[difficulty] || beginnerPrompts;

  return (
    <div className="space-y-6">
      {/* Prayer Card (Optional, Collapsible) */}
      {study.prayer_prompt && (
        <Collapsible open={isPrayerOpen} onOpenChange={setIsPrayerOpen}>
          <GradientCard variant="warm" className="p-6">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800">Prayer</h3>
                    <p className="text-xs text-slate-500">Optional • Start with prayer</p>
                  </div>
                </div>
                <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", isPrayerOpen && "rotate-180")} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 pt-4 border-t border-amber-100">
              <p className="text-slate-600 leading-relaxed">{study.prayer_prompt}</p>
            </CollapsibleContent>
          </GradientCard>
        </Collapsible>
      )}

      {/* Scripture Text */}
      <GradientCard variant="cool" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Book className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Read the Scripture</h3>
            <p className="text-sm text-slate-500">{study.scripture_reference}</p>
          </div>
        </div>
        <div className="bg-white/60 rounded-xl p-4 border border-slate-100">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{study.scripture_text}</p>
        </div>
      </GradientCard>

      {/* Resources Section */}
      <GradientCard variant="purple" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <ExternalLink className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Study Resources</h3>
            <p className="text-sm text-slate-500">External Bible study tools</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {(study.external_resources?.length ? study.external_resources : EXTERNAL_RESOURCES).map((resource, idx) => (
            <a
              key={idx}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg border border-violet-100 hover:bg-violet-50 hover:border-violet-200 transition-colors group"
            >
              <ExternalLink className="h-4 w-4 text-violet-400 mt-0.5 group-hover:text-violet-600" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 text-sm group-hover:text-violet-700">{resource.name}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{resource.description}</p>
              </div>
            </a>
          ))}
        </div>
      </GradientCard>

      {/* Study Prompts */}
      <GradientCard variant="sage" className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Study Prompts</h3>
            <p className="text-sm text-slate-500">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Beginner Prompts */}
          {currentPrompts.includes('genre') && (
            <div>
              <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                What Genre is the scripture?
                {isComplete('genre') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
              </Label>
              <p className="text-sm text-slate-500 mb-3">
                Is it narrative, poetry, prophecy, epistle, gospel, wisdom, apocalyptic?
              </p>
              <Textarea
                value={responses.genre || ''}
                onChange={(e) => handleTextChange('genre', e.target.value)}
                onBlur={() => markSectionComplete('genre')}
                placeholder="Your answer..."
                className="min-h-[80px]"
              />
            </div>
          )}

          {currentPrompts.includes('observations') && (
            <div>
              <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                Observations
                {isComplete('observations') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
              </Label>
              <p className="text-sm text-slate-500 mb-3">
                What did you notice? What words or phrases were repeated?
              </p>
              <Textarea
                value={responses.observations || ''}
                onChange={(e) => handleTextChange('observations', e.target.value)}
                onBlur={() => markSectionComplete('observations')}
                placeholder="Your observations..."
                className="min-h-[100px]"
              />
            </div>
          )}

          {currentPrompts.includes('application') && (
            <div>
              <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                Application / Response
                {isComplete('application') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
              </Label>
              <p className="text-sm text-slate-500 mb-3">
                How will you respond to what God is showing you?
              </p>
              <Textarea
                value={responses.application || ''}
                onChange={(e) => handleTextChange('application', e.target.value)}
                onBlur={() => markSectionComplete('application')}
                placeholder="Your application..."
                className="min-h-[100px]"
              />
            </div>
          )}

          {currentPrompts.includes('notes') && (
            <div>
              <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                Notes
                {isComplete('notes') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
              </Label>
              <Textarea
                value={responses.notes || ''}
                onChange={(e) => handleTextChange('notes', e.target.value)}
                onBlur={() => markSectionComplete('notes')}
                placeholder="Additional notes..."
                className="min-h-[80px]"
              />
            </div>
          )}

          {/* Intermediate Prompts */}
          {difficulty !== 'beginner' && (
            <>
              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Intermediate Questions
                </h4>
              </div>

              {currentPrompts.includes('original_audience') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    Who was the original audience?
                    {isComplete('original_audience') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <Textarea
                    value={responses.original_audience || ''}
                    onChange={(e) => handleTextChange('original_audience', e.target.value)}
                    onBlur={() => markSectionComplete('original_audience')}
                    placeholder="Your answer..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {currentPrompts.includes('original_meaning') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    What did this scripture mean to them?
                    {isComplete('original_meaning') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <Textarea
                    value={responses.original_meaning || ''}
                    onChange={(e) => handleTextChange('original_meaning', e.target.value)}
                    onBlur={() => markSectionComplete('original_meaning')}
                    placeholder="Your answer..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {currentPrompts.includes('context_similarities') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    How is it similar to our context?
                    {isComplete('context_similarities') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <Textarea
                    value={responses.context_similarities || ''}
                    onChange={(e) => handleTextChange('context_similarities', e.target.value)}
                    onBlur={() => markSectionComplete('context_similarities')}
                    placeholder="Your answer..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {currentPrompts.includes('context_differences') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    How is it different from our context?
                    {isComplete('context_differences') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <Textarea
                    value={responses.context_differences || ''}
                    onChange={(e) => handleTextChange('context_differences', e.target.value)}
                    onBlur={() => markSectionComplete('context_differences')}
                    placeholder="Your answer..."
                    className="min-h-[80px]"
                  />
                </div>
              )}
            </>
          )}

          {/* Advanced Prompts */}
          {difficulty === 'advanced' && (
            <>
              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
                  Advanced Analysis
                </h4>
              </div>

              {currentPrompts.includes('structure') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    What's the structure / argument flow?
                    {isComplete('structure') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <Textarea
                    value={responses.structure || ''}
                    onChange={(e) => handleTextChange('structure', e.target.value)}
                    onBlur={() => markSectionComplete('structure')}
                    placeholder="Your analysis..."
                    className="min-h-[100px]"
                  />
                </div>
              )}

              {currentPrompts.includes('themes') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    What are the key themes?
                    {isComplete('themes') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <Textarea
                    value={responses.themes || ''}
                    onChange={(e) => handleTextChange('themes', e.target.value)}
                    onBlur={() => markSectionComplete('themes')}
                    placeholder="Your analysis..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {currentPrompts.includes('cross_references') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    Cross-references to OT or NT?
                    {isComplete('cross_references') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <p className="text-sm text-slate-500 mb-3">
                    Use tools like Blue Letter Bible to find connections
                  </p>
                  <Textarea
                    value={responses.cross_references || ''}
                    onChange={(e) => handleTextChange('cross_references', e.target.value)}
                    onBlur={() => markSectionComplete('cross_references')}
                    placeholder="Your notes..."
                    className="min-h-[80px]"
                  />
                </div>
              )}

              {currentPrompts.includes('word_studies') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    Word Studies
                    {isComplete('word_studies') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <p className="text-sm text-slate-500 mb-3">
                    Explore original Greek/Hebrew meanings with study tools
                  </p>
                  <Textarea
                    value={responses.word_studies || ''}
                    onChange={(e) => handleTextChange('word_studies', e.target.value)}
                    onBlur={() => markSectionComplete('word_studies')}
                    placeholder="Your word studies..."
                    className="min-h-[100px]"
                  />
                </div>
              )}

              {currentPrompts.includes('commentary_notes') && (
                <div>
                  <Label className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    Commentary Notes / Unresolved Questions
                    {isComplete('commentary_notes') && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                  </Label>
                  <Textarea
                    value={responses.commentary_notes || ''}
                    onChange={(e) => handleTextChange('commentary_notes', e.target.value)}
                    onBlur={() => markSectionComplete('commentary_notes')}
                    placeholder="Your notes and questions..."
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <Button 
            onClick={onComplete}
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <CheckCircle className="h-5 w-5" />
            Complete Study
          </Button>
        </div>
      </GradientCard>
    </div>
  );
}