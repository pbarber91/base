import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GroupCard from '@/components/groups/GroupCard';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Groups() {
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({ search: '', type: '' });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const [userChurchId, setUserChurchId] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(u => {
      base44.entities.UserProfile.filter({ user_email: u.email }, null, 1)
        .then(p => setUserChurchId(p[0]?.church_id));
    }).catch(() => null);
  }, []);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.StudyGroup.list()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => base44.entities.UserProfile.list()
  });

  const profileMap = useMemo(() => {
    const map = {};
    profiles.forEach(p => { map[p.user_email] = p; });
    return map;
  }, [profiles]);

  const filteredGroups = useMemo(() => {
    return groups.filter(group => {
      const searchMatch = !filters.search || 
        group.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        group.description?.toLowerCase().includes(filters.search.toLowerCase());
      const typeMatch = !filters.type || group.type === filters.type;
      return searchMatch && typeMatch;
    });
  }, [groups, filters]);

  const getGroupMembers = (group) => {
    return (group.member_emails || []).map(email => profileMap[email]).filter(Boolean);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-6"
          >
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <span className="text-emerald-100 font-medium">Study Groups</span>
              </div>
              <h1 className="text-4xl font-serif font-bold mb-4">
                Grow Together
              </h1>
              <p className="text-lg text-emerald-100 leading-relaxed">
                Join a community of believers studying God's Word together. 
                Connect, discuss, and encourage one another.
              </p>
            </div>
            {user && (
              <Link to={createPageUrl("CreateGroup")}>
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50 gap-2">
                  <Plus className="h-5 w-5" />
                  Create Group
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search groups..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-10 bg-slate-50"
            />
          </div>
          <Select value={filters.type || 'all'} onValueChange={(v) => setFilters(f => ({ ...f, type: v === 'all' ? '' : v }))}>
            <SelectTrigger className="w-full sm:w-44 bg-slate-50">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="scripture_study">Scripture Study</SelectItem>
              <SelectItem value="course">Course Group</SelectItem>
              <SelectItem value="general">Fellowship</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <GroupCard group={group} members={getGroupMembers(group)} />
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No groups found"
            description="Be the first to create a study group and invite others to join!"
            action={user ? () => window.location.href = createPageUrl("CreateGroup") : null}
            actionLabel="Create Group"
          />
        )}
      </div>
    </div>
  );
}