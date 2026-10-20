'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Shuffle, 
  Loader2, 
  Maximize2,
  Pencil
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KotobaItem, Lesson } from '@/types/kotoba';
import { FullscreenFlashcard } from '@/components/FullscreenFlashcard';
import { FullscreenTableEditor } from '@/components/FullscreenTableEditor';
import { CardViewer } from '@/components/CardViewer';
import { saveKotobaBatch } from '@/lib/firestoreService';

import { LessonMultiSelect } from '@/components/LessonMultiSelect';

interface FlashcardSectionProps {
  lessons: Lesson[];
  kotobaList: KotobaItem[];
  isLoading: boolean;
  onDataChange?: () => void;
}

export const FlashcardSection: React.FC<FlashcardSectionProps> = ({
  lessons,
  kotobaList,
  isLoading,
  onDataChange,
}) => {
  const [selectedLessonIds, setSelectedLessonIds] = useState<number[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [startNo, setStartNo] = useState<number>(1);
  const [endNo, setEndNo] = useState<number>(100);
  const [frontView, setFrontView] = useState<'kana' | 'kanji' | 'arti'>('kana');
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Initialize selected lessons to all lessons when lessons first load
  useEffect(() => {
    if (!hasInitialized && lessons.length > 0) {
      setSelectedLessonIds(lessons.map((l) => l.lessonId));
      setHasInitialized(true);
    }
  }, [lessons, hasInitialized]);

  // Edit DB state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLessonId, setEditLessonId] = useState<number>(1);
  const [editItems, setEditItems] = useState<Omit<KotobaItem, 'id'>[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Dynamic max available count based on selected lessons
  const maxAvailableCount = useMemo(() => {
    if (selectedLessonIds.length === 0) {
      return 1;
    }
    return kotobaList.filter((item) => selectedLessonIds.includes(item.lessonId)).length || 1;
  }, [kotobaList, selectedLessonIds]);

  // Update default endNo when lesson or dataset changes
  useEffect(() => {
    setStartNo(1);
    setEndNo(maxAvailableCount);
  }, [selectedLessonIds, maxAvailableCount]);

  const activeDeckCards = useMemo(() => {
    if (selectedLessonIds.length === 0) {
      return [];
    }

    let filtered = kotobaList.filter((item) => {
      const matchLesson = selectedLessonIds.includes(item.lessonId);
      const matchRange = item.no >= startNo && item.no <= endNo;
      return matchLesson && matchRange;
    });

    if (isShuffled) {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    } else {
      filtered = [...filtered].sort((a, b) => a.lessonId - b.lessonId || a.no - b.no);
    }

    return filtered;
  }, [kotobaList, selectedLessonIds, startNo, endNo, isShuffled, shuffleKey]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  }, [selectedLessonIds, startNo, endNo, isShuffled, shuffleKey]);

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const currentCard = activeDeckCards[currentIndex];

  const handleNext = () => {
    if (currentIndex < activeDeckCards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    if (isShuffled) {
      setShuffleKey((prev) => prev + 1);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
  };

  const handleOpenEdit = () => {
    const targetLesson = selectedLessonIds.length === 1 ? selectedLessonIds[0] : (selectedLessonIds[0] || lessons[0]?.lessonId || 1);
    setEditLessonId(targetLesson);
    const existing = kotobaList.filter((item) => item.lessonId === targetLesson);
    setEditItems(existing.map((item) => ({ ...item })));
    setIsEditModalOpen(true);
  };

  const handleSaveEditToDb = async () => {
    setIsSavingEdit(true);
    try {
      const finalItems = editItems.map((item, idx) => ({
        ...item,
        lessonId: editLessonId,
        no: item.no || idx + 1,
      }));
      await saveKotobaBatch(editLessonId, finalItems);
      setIsEditModalOpen(false);
      onDataChange?.();
    } catch (err) {
      console.error('Gagal memperbarui data:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowLeft' || e.key === '1') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowRight' || e.key === '2') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, activeDeckCards.length]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3.5 px-4 space-y-0 border-b border-zinc-800/60">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#EEAAC0]" />
            Flashcard
          </CardTitle>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <LessonMultiSelect
              lessons={lessons}
              selectedLessonIds={selectedLessonIds}
              onChange={setSelectedLessonIds}
            />

            <div className="flex items-center gap-1 h-7 rounded border border-zinc-800 bg-zinc-950 px-1.5 text-[11px]">
              <span className="text-zinc-500">No:</span>
              <input
                type="number"
                min={1}
                max={endNo}
                value={startNo}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 1;
                  setStartNo(Math.min(endNo, Math.max(1, val)));
                }}
                className="w-8 text-center font-medium text-zinc-100 bg-transparent focus:outline-none"
              />
              <span className="text-zinc-600">-</span>
              <input
                type="number"
                min={startNo}
                max={maxAvailableCount}
                value={endNo}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || maxAvailableCount;
                  setEndNo(Math.min(maxAvailableCount, Math.max(startNo, val)));
                }}
                className="w-8 text-center font-medium text-zinc-100 bg-transparent focus:outline-none"
              />
            </div>

            <select
              value={frontView}
              onChange={(e) => setFrontView(e.target.value as 'kana' | 'kanji' | 'arti')}
              className="h-7 rounded border border-zinc-800 bg-zinc-950 px-2 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#EEAAC0] font-medium"
            >
              <option value="kana">Depan: Hiragana</option>
              <option value="kanji">Depan: Kanji</option>
              <option value="arti">Depan: Arti</option>
            </select>

            <Button
              variant={isShuffled ? 'pink' : 'outline'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsShuffled(!isShuffled)}
              title="Acak"
            >
              <Shuffle className="w-3 h-3" />
            </Button>

            {/* EDIT SAVED DATA BUTTON */}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-zinc-300 hover:text-zinc-100"
              onClick={handleOpenEdit}
              disabled={kotobaList.length === 0 || selectedLessonIds.length === 0}
              title="Edit Data Kosakata"
            >
              <Pencil className="w-3 h-3" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsFullscreenOpen(true)}
              disabled={activeDeckCards.length === 0}
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {isLoading ? (
            <div className="py-14 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#EEAAC0]" />
              Memuat flashcard...
            </div>
          ) : activeDeckCards.length === 0 ? (
            <div className="py-14 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-lg">
              {kotobaList.length === 0
                ? 'Belum ada data kosakata. Silakan import PDF di atas.'
                : 'Tidak ada bab yang dipilih. Silakan centang bab yang ingin dipelajari.'}
            </div>
          ) : (
            /* Shared CardViewer Component */
            <CardViewer
              card={currentCard}
              currentIndex={currentIndex}
              totalCards={activeDeckCards.length}
              isFlipped={isFlipped}
              setIsFlipped={setIsFlipped}
              frontView={frontView}
              onNext={handleNext}
              onPrev={handlePrev}
              size="default"
              sessionCompleted={sessionCompleted}
              onRestart={handleRestart}
            />
          )}
        </CardContent>
      </Card>

      {/* EDIT SAVED KOTOBA MODAL */}
      <FullscreenTableEditor
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        lessonId={editLessonId}
        items={editItems}
        onItemsChange={setEditItems}
        onSave={handleSaveEditToDb}
        isSaving={isSavingEdit}
      />

      {/* FULLSCREEN FLASHCARD STUDY MODE PORTAL */}
      <FullscreenFlashcard
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        cards={activeDeckCards}
        currentIndex={currentIndex}
        isFlipped={isFlipped}
        setIsFlipped={setIsFlipped}
        frontView={frontView}
        onNext={handleNext}
        onPrev={handlePrev}
        sessionCompleted={sessionCompleted}
        onRestart={handleRestart}
      />
    </>
  );
};
