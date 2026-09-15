'use client';

import React from 'react';
import { 
  RotateCw, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KotobaItem } from '@/types/kotoba';

export interface CardViewerProps {
  card?: KotobaItem;
  currentIndex: number;
  totalCards: number;
  isFlipped: boolean;
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  frontView: 'kana' | 'kanji' | 'arti';
  onNext: () => void;
  onPrev: () => void;
  size?: 'default' | 'large';
  sessionCompleted?: boolean;
  onRestart?: () => void;
}

export const CardViewer: React.FC<CardViewerProps> = ({
  card,
  currentIndex,
  totalCards,
  isFlipped,
  setIsFlipped,
  frontView,
  onNext,
  onPrev,
  size = 'default',
  sessionCompleted,
  onRestart,
}) => {
  const isLarge = size === 'large';
  const prevIndexRef = React.useRef(currentIndex);
  const [skipTransition, setSkipTransition] = React.useState(false);

  if (prevIndexRef.current !== currentIndex) {
    prevIndexRef.current = currentIndex;
    setSkipTransition(true);
  }

  React.useEffect(() => {
    setIsFlipped(false);
    if (skipTransition) {
      const timer = setTimeout(() => {
        setSkipTransition(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, setIsFlipped, skipTransition]);

  if (sessionCompleted) {
    return (
      <div className="w-full py-12 px-4 text-center space-y-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 my-auto">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-100">
          Selesai! (お疲れ様でした)
        </h3>
        {onRestart && (
          <Button variant="pink" size="sm" onClick={onRestart} className="h-9 px-5 text-xs font-semibold">
            Ulangi
          </Button>
        )}
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="w-full space-y-4">
      {/* Progress status & bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
          <span>Kartu {currentIndex + 1} dari {totalCards}</span>
        </div>
        <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800/80">
          <div
            className="bg-[#EEAAC0] h-full transition-all duration-300 rounded-full"
            style={{ width: `${Math.round(((currentIndex + 1) / totalCards) * 100)}%` }}
          />
        </div>
      </div>

      {/* 3D FLIP CARD */}
      <div
        className={`perspective-1000 w-full cursor-pointer ${
          isLarge ? 'min-h-[320px] sm:min-h-[380px]' : 'min-h-[240px] sm:min-h-[270px]'
        }`}
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        <div
          className={`relative w-full h-full ${
            isLarge ? 'min-h-[320px] sm:min-h-[380px]' : 'min-h-[240px] sm:min-h-[270px]'
          } rounded-2xl ${skipTransition ? 'transition-none' : 'transition-transform duration-500'} transform-style-3d border border-zinc-800/80 shadow-md ${
            isFlipped && !skipTransition ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-zinc-950 rounded-2xl p-4 sm:p-8 flex flex-col justify-between items-center text-center border border-zinc-800 overflow-y-auto">
            <div className="w-full flex justify-end shrink-0"></div>

            <div className="my-auto space-y-3 px-2 py-4 w-full max-w-full flex flex-col items-center justify-center">
              <div
                className={`font-bold font-japanese text-zinc-100 leading-relaxed tracking-wide w-full max-w-full break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${
                  isLarge ? 'text-3xl sm:text-4xl md:text-5xl' : 'text-xl sm:text-2xl md:text-3xl'
                }`}
              >
                {frontView === 'kana'
                  ? card.kana
                  : frontView === 'kanji'
                  ? card.kanji || card.kana
                  : card.arti}
              </div>
              {frontView === 'kana' && card.kanji && (
                <div className={`font-japanese text-zinc-400 font-medium leading-normal w-full max-w-full break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${isLarge ? 'text-lg' : 'text-sm'}`}>
                  {card.kanji}
                </div>
              )}
            </div>

            <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium shrink-0 pt-2">
              <RotateCw className="w-3 h-3 text-[#EEAAC0]" /> Balik
            </div>
          </div>

          {/* BACK SIDE */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-zinc-900 rounded-2xl p-4 sm:p-8 flex flex-col justify-between items-center text-center border border-zinc-700 overflow-y-auto">
            <div className="w-full flex justify-end shrink-0"></div>

            <div className="my-auto space-y-3 px-2 py-4 w-full max-w-full flex flex-col items-center justify-center">
              <div
                className={`font-bold text-zinc-100 leading-relaxed tracking-wide w-full max-w-full break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${
                  isLarge ? 'text-xl sm:text-2xl md:text-3xl' : 'text-base sm:text-lg md:text-xl'
                }`}
              >
                {frontView === 'arti' ? card.kana : card.arti}
              </div>
              {frontView !== 'arti' && card.kana && (
                <div className={`font-japanese text-zinc-400 leading-normal w-full max-w-full break-words [overflow-wrap:anywhere] whitespace-pre-wrap ${isLarge ? 'text-base' : 'text-sm'}`}>
                  {card.kana} {card.kanji ? `• ${card.kanji}` : ''}
                </div>
              )}
            </div>

            <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-medium shrink-0 pt-2">
              <RotateCw className="w-3 h-3 text-[#EEAAC0]" /> Balik
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS (Prev & Next) */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className={isLarge ? 'h-11 text-sm font-medium' : 'h-10 text-xs font-medium'}
        >
          <ChevronLeft className={isLarge ? 'w-5 h-5 mr-1' : 'w-4 h-4 mr-1'} />
          Prev
        </Button>

        <Button
          variant="pink"
          onClick={onNext}
          className={isLarge ? 'h-11 text-sm font-semibold' : 'h-10 text-xs font-semibold'}
        >
          Next
          <ChevronRight className={isLarge ? 'w-5 h-5 ml-1' : 'w-4 h-4 ml-1'} />
        </Button>
      </div>
    </div>
  );
};
