'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KotobaItem } from '@/types/kotoba';
import { CardViewer } from '@/components/CardViewer';
import { CardTitle } from './ui/card';

interface FullscreenFlashcardProps {
  isOpen: boolean;
  onClose: () => void;
  cards: KotobaItem[];
  currentIndex: number;
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  frontView: 'kana' | 'kanji' | 'arti';
  onNext: () => void;
  onPrev: () => void;
  sessionCompleted?: boolean;
  onRestart?: () => void;
}

export const FullscreenFlashcard: React.FC<FullscreenFlashcardProps> = ({
  isOpen,
  onClose,
  cards,
  currentIndex,
  isFlipped,
  setIsFlipped,
  frontView,
  onNext,
  onPrev,
  sessionCompleted,
  onRestart,
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

  if (!isOpen || cards.length === 0 || typeof window === 'undefined') return null;

  const currentCard = cards[currentIndex];

  return createPortal(
    <div
      onKeyDown={(e) => e.stopPropagation()}
      className="fixed inset-0 w-screen h-screen z-[99999] bg-zinc-950 flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#EEAAC0]" />
          Flashcard
        </CardTitle>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-100 flex items-center gap-1.5"
        >
          <Minimize2 className="w-4 h-4" />
          <span className="text-xs">Keluar</span>
        </Button>
      </div>

      {/* Center Focused Modular CardViewer */}
      <div className="flex-1 flex items-center justify-center max-w-xl mx-auto w-full my-auto py-4">
        <CardViewer
          card={currentCard}
          currentIndex={currentIndex}
          totalCards={cards.length}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          frontView={frontView}
          onNext={onNext}
          onPrev={onPrev}
          size="large"
          sessionCompleted={sessionCompleted}
          onRestart={onRestart}
        />
      </div>
    </div>,
    document.body
  );
};
