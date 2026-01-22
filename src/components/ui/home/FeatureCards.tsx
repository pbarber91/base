import React from 'react';
import { BookOpen, GraduationCap, Users, MessageCircle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import GradientCard from "@/components/ui/GradientCard";

export default function FeatureCards() {
  const features = [
    {
      icon: BookOpen,
      title: "Scripture Studies",
      description: "Guided journeys through God's Word with thoughtful prompts and curated resources to deepen your understanding.",
      href: "Studies",
      variant: "warm",
      color: "text-amber-600",
      bgColor: "bg-amber-100"
    },
    {
      icon: GraduationCap,
      title: "Church Courses",
      description: "Rich, multi-session courses created by your church leaders for deeper discipleship and spiritual growth.",
      href: "Courses",
      variant: "purple",
      color: "text-violet-600",
      bgColor: "bg-violet-100"
    },
    {
      icon: Users,
      title: "Study Groups",
      description: "Connect with fellow believers, study together, and grow in community with others on the same journey.",
      href: "Groups",
      variant: "sage",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100"
    },
    {
      icon: MessageCircle,
      title: "Community Feed",
      description: "Share insights, celebrate milestones, and encourage one another as you walk with Christ together.",
      href: "Community",
      variant: "cool",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    }
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-800 mb-4">
            Tools for Your Faith Journey
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Whether you're just beginning to explore faith or leading others, 
            we have resources to help you grow.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link to={createPageUrl(feature.href)}>
                <GradientCard variant={feature.variant} className="p-8 h-full group cursor-pointer">
                  <div className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-6`}>
                    <feature.icon className={`h-7 w-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-3 group-hover:text-amber-700 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-500 leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <span className={`inline-flex items-center text-sm font-medium ${feature.color} group-hover:gap-2 transition-all`}>
                    Explore
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </span>
                </GradientCard>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}