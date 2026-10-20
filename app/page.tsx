'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ImportSection } from '@/components/ImportSection';
import { FlashcardSection } from '@/components/FlashcardSection';
import { AssistantSection } from '@/components/AssistantSection';
import { Footer } from '@/components/Footer';

import { Lesson, KotobaItem } from '@/types/kotoba';
import { fetchAllLessons, fetchKotobaByLessons } from '@/lib/firestoreService';

export default function Home() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [kotobaList, setKotobaList] = useState<KotobaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedLessons = await fetchAllLessons();
      setLessons(fetchedLessons);

      const allKotoba = await fetchKotobaByLessons([]);
      setKotobaList(allKotoba);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 font-sans antialiased">
      <main className="w-full max-w-2xl mx-auto px-4 py-8 space-y-5 flex-1">
        
        {/* Minimal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span className="text-[#EEAAC0] font-japanese font-normal">言葉</span> Kotoba Flashcards
          </h1>
        </div>

        {/* Section 1: Import */}
        <ImportSection onImportSuccess={() => loadData()} />

        {/* Section 2: Flashcards */}
        <div className="relative z-20">
          <FlashcardSection
            lessons={lessons}
            kotobaList={kotobaList}
            isLoading={isLoading}
            onDataChange={loadData}
          />
        </div>

        {/* Section 3: AI Assistant */}
        <div className="relative z-10">
          <AssistantSection
            lessons={lessons}
            kotobaList={kotobaList}
          />
        </div>

      </main>

      <Footer />
    </div>
  );
}
