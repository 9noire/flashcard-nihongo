'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, ChevronDown, Check } from 'lucide-react';
import { Lesson } from '@/types/kotoba';

interface LessonMultiSelectProps {
  lessons: Lesson[];
  selectedLessonIds: number[];
  onChange: (selectedIds: number[]) => void;
  className?: string;
}

export const LessonMultiSelect: React.FC<LessonMultiSelectProps> = ({
  lessons,
  selectedLessonIds,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allLessonIds = lessons.map((l) => l.lessonId);
  const isAllSelected =
    lessons.length > 0 && selectedLessonIds.length === lessons.length;

  // Determine button trigger display label
  const getLabel = () => {
    if (lessons.length === 0) return 'Tidak ada bab';
    if (selectedLessonIds.length === 0) return 'Pilih Bab';
    if (isAllSelected) return 'Semua Bab';
    if (selectedLessonIds.length === 1) return `Bab ${selectedLessonIds[0]}`;
    if (selectedLessonIds.length <= 3) {
      const sorted = [...selectedLessonIds].sort((a, b) => a - b);
      return `Bab ${sorted.join(', ')}`;
    }
    return `${selectedLessonIds.length} Bab dipilih`;
  };

  const handleSelectAll = () => {
    onChange(allLessonIds);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const handleToggleLesson = (lessonId: number) => {
    if (selectedLessonIds.includes(lessonId)) {
      onChange(selectedLessonIds.filter((id) => id !== lessonId));
    } else {
      onChange([...selectedLessonIds, lessonId]);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-xs ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 flex items-center gap-1.5 rounded border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 px-2 text-[11px] text-zinc-200 transition-colors focus:outline-none focus:ring-1 focus:ring-[#EEAAC0] font-medium cursor-pointer"
      >
        <BookOpen className="w-3 h-3 text-zinc-400 shrink-0" />
        <span className="truncate max-w-[130px]">{getLabel()}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-56 rounded-lg border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl z-50">
          {/* Header Actions: Pilih Semua & Batal Semua */}
          <div className="flex items-center justify-between pb-1.5 mb-1 px-1 border-b border-zinc-800/60 text-[10px]">
            <span className="text-zinc-500 font-medium">Pilih Bab</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#EEAAC0] hover:underline cursor-pointer"
              >
                Pilih Semua
              </button>
              <span className="text-zinc-700">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-zinc-400 hover:text-rose-400 hover:underline cursor-pointer"
              >
                Batal Semua
              </button>
            </div>
          </div>

          {/* List of Lessons */}
          <div className="max-h-56 overflow-y-auto no-scrollbar space-y-0.5">
            {lessons.length === 0 ? (
              <div className="py-2 text-center text-[11px] text-zinc-500">
                Belum ada bab
              </div>
            ) : (
              lessons.map((lesson) => {
                const checked = selectedLessonIds.includes(lesson.lessonId);
                return (
                  <label
                    key={lesson.lessonId}
                    className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-200 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                          checked
                            ? 'bg-[#EEAAC0] border-[#EEAAC0] text-zinc-950'
                            : 'border-zinc-700 bg-zinc-900'
                        }`}
                      >
                        {checked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="font-medium">Bab {lesson.lessonId}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {lesson.totalCount} kata
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleLesson(lesson.lessonId)}
                      className="hidden"
                    />
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
