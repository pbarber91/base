import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";

export default function CourseFilters({ filters, onChange, onClear, churches = [] }) {
  const categories = [
    { value: "foundations", label: "Foundations" },
    { value: "bible_study", label: "Bible Study" },
    { value: "theology", label: "Theology" },
    { value: "spiritual_growth", label: "Spiritual Growth" },
    { value: "leadership", label: "Leadership" },
    { value: "family", label: "Family" },
    { value: "outreach", label: "Outreach" },
    { value: "other", label: "Other" }
  ];

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const hasFilters = filters.search || filters.category || filters.difficulty || filters.church_id;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-8 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search courses..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200"
          />
        </div>
        
        <Select value={filters.category || 'all'} onValueChange={(v) => handleChange('category', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full lg:w-44 bg-slate-50">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filters.difficulty || 'all'} onValueChange={(v) => handleChange('difficulty', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full lg:w-40 bg-slate-50">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        
        {churches.length > 0 && (
          <Select value={filters.church_id || 'all'} onValueChange={(v) => handleChange('church_id', v === 'all' ? '' : v)}>
            <SelectTrigger className="w-full lg:w-48 bg-slate-50">
              <SelectValue placeholder="Church" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Churches</SelectItem>
              {churches.map(church => (
                <SelectItem key={church.id} value={church.id}>{church.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {hasFilters && (
          <Button variant="ghost" onClick={onClear} className="text-slate-500">
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}