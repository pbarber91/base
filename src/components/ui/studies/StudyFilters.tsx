import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

export default function StudyFilters({ filters, onChange, onClear }) {
  const bibleBooks = [
    "Genesis", "Exodus", "Psalms", "Proverbs", "Isaiah", "Matthew", "Mark", 
    "Luke", "John", "Acts", "Romans", "1 Corinthians", "Ephesians", 
    "Philippians", "Colossians", "James", "1 Peter", "1 John", "Revelation"
  ];

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const hasFilters = filters.search || filters.difficulty || filters.book;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-8 shadow-sm">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search studies..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="pl-10 bg-slate-50 border-slate-200"
          />
        </div>
        
        <Select value={filters.difficulty || 'all'} onValueChange={(v) => handleChange('difficulty', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-44 bg-slate-50">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filters.book || 'all'} onValueChange={(v) => handleChange('book', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-full md:w-44 bg-slate-50">
            <SelectValue placeholder="Bible Book" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Books</SelectItem>
            {bibleBooks.map(book => (
              <SelectItem key={book} value={book}>{book}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
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