'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, Plus, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KotobaItem, Lesson } from '@/types/kotoba';

interface FullscreenTableEditorProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: number;
  items: Omit<KotobaItem, 'id'>[];
  onItemsChange: (items: Omit<KotobaItem, 'id'>[]) => void;
  onSave: () => void;
  isSaving: boolean;
  availableLessons?: Lesson[];
  onLessonChange?: (lessonId: number) => void;
}

export const FullscreenTableEditor: React.FC<FullscreenTableEditorProps> = ({
  isOpen,
  onClose,
  lessonId,
  items,
  onItemsChange,
  onSave,
  isSaving,
  availableLessons,
  onLessonChange,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || typeof window === 'undefined') return null;

  const handleAddRow = () => {
    onItemsChange([
      ...items,
      { lessonId, no: items.length + 1, kana: '', kanji: '', arti: '' },
    ]);
  };

  const handleItemChange = (index: number, field: keyof Omit<KotobaItem, 'id'>, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onItemsChange(updated);
  };

  const handleDeleteRow = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    const renumbered = updated.map((item, idx) => ({
      ...item,
      no: idx + 1,
    }));
    onItemsChange(renumbered);
  };

  return createPortal(
    <div
      onKeyDown={(e) => e.stopPropagation()}
      className="fixed inset-0 w-screen h-screen z-[99999] bg-zinc-950 flex flex-col p-3 sm:p-6 overflow-hidden select-none"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0 gap-2">
        {availableLessons && availableLessons.length > 1 && onLessonChange ? (
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-zinc-100">Edit Tabel:</span>
            <select
              value={lessonId}
              onChange={(e) => onLessonChange(Number(e.target.value))}
              className="h-8 rounded border border-zinc-800 bg-zinc-900 px-2 text-xs font-semibold text-[#EEAAC0] focus:outline-none focus:ring-1 focus:ring-[#EEAAC0] cursor-pointer"
            >
              {availableLessons.map((l) => (
                <option key={l.lessonId} value={l.lessonId} className="bg-zinc-950 text-zinc-100">
                  Bab {l.lessonId} ({l.totalCount} kata)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <h2 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
            Edit Tabel (Bab {lessonId})
          </h2>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddRow}>
            <Plus className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Tambah Baris</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Fullscreen Table Scroll Body (Mobile Optimized Horizontal Scroll) */}
      <div className="flex-1 overflow-auto my-3 rounded-lg border border-zinc-800 bg-zinc-900/60">
        <table className="w-full min-w-[520px] text-left text-xs sm:text-sm text-zinc-200 border-collapse">
          <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[11px] z-10">
            <tr>
              <th className="p-2 sm:p-3 w-12 sm:w-16 text-center">No</th>
              <th className="p-2 sm:p-3 w-1/3 min-w-[120px]">Hiragana / Kana</th>
              <th className="p-2 sm:p-3 w-1/4 min-w-[100px]">Kanji</th>
              <th className="p-2 sm:p-3 min-w-[140px]">Arti (Bahasa Indonesia)</th>
              <th className="p-2 sm:p-3 w-10 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-zinc-900/80">
                <td className="p-1.5 sm:p-2 text-center">
                  <input
                    type="number"
                    value={item.no || idx + 1}
                    onChange={(e) => handleItemChange(idx, 'no', parseInt(e.target.value, 10) || idx + 1)}
                    className="w-12 h-8 text-center text-xs font-mono rounded border border-zinc-800 bg-zinc-950 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#EEAAC0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="p-1.5 sm:p-2">
                  <Input
                    type="text"
                    value={item.kana}
                    onChange={(e) => handleItemChange(idx, 'kana', e.target.value)}
                    className="h-8 sm:h-9 font-japanese text-xs sm:text-sm text-zinc-100"
                    placeholder="Kana"
                  />
                </td>
                <td className="p-1.5 sm:p-2">
                  <Input
                    type="text"
                    value={item.kanji || ''}
                    onChange={(e) => handleItemChange(idx, 'kanji', e.target.value)}
                    className="h-8 sm:h-9 font-japanese text-xs sm:text-sm text-zinc-100"
                    placeholder="Kanji"
                  />
                </td>
                <td className="p-1.5 sm:p-2">
                  <Input
                    type="text"
                    value={item.arti}
                    onChange={(e) => handleItemChange(idx, 'arti', e.target.value)}
                    className="h-8 sm:h-9 text-xs sm:text-sm text-zinc-100"
                    placeholder="Arti"
                  />
                </td>
                <td className="p-1.5 sm:p-2 text-center">
                  <button
                    onClick={() => handleDeleteRow(idx)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 rounded transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-zinc-400 shrink-0">
        <span>Total {items.length} Kata</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Batal
          </Button>
          <Button variant="pink" size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
            Simpan ke Database
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
