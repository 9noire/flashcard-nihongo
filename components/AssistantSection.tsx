'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bot, 
  Send, 
  Loader2, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Copy, 
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LessonMultiSelect } from '@/components/LessonMultiSelect';
import { KotobaItem, Lesson, ChatMessage } from '@/types/kotoba';

interface AssistantSectionProps {
  lessons: Lesson[];
  kotobaList: KotobaItem[];
}

const DEFAULT_GREETING = 'Konnichiwa! Tanyakan arti kata, contoh kalimat, atau tata bahasa dari bab yang sudah diimpor.';

export const AssistantSection: React.FC<AssistantSectionProps> = ({
  lessons,
  kotobaList,
}) => {
  const [selectedLessonScopes, setSelectedLessonScopes] = useState<number[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Initialize selected scopes to all lessons when lessons first load
  useEffect(() => {
    if (!hasInitialized && lessons.length > 0) {
      setSelectedLessonScopes(lessons.map((l) => l.lessonId));
      setHasInitialized(true);
    }
  }, [lessons, hasInitialized]);

  // Filter kotoba based on selected multi-lesson scopes
  const activeVocab = useMemo(() => {
    if (selectedLessonScopes.length === 0) {
      return [];
    }
    return kotobaList.filter((k) => selectedLessonScopes.includes(k.lessonId));
  }, [kotobaList, selectedLessonScopes]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'initial_greeting',
      role: 'assistant',
      content: DEFAULT_GREETING,
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fullscreenMessagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fullscreenTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle body overflow and escape key in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsFullscreen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isFullscreen]);

  // Auto-resize textarea height when typing or adding newlines via Shift+Enter
  useEffect(() => {
    const adjustHeight = (el: HTMLTextAreaElement | null) => {
      if (el) {
        el.style.height = 'auto';
        const newHeight = Math.min(Math.max(el.scrollHeight, 36), 160);
        el.style.height = `${newHeight}px`;
      }
    };
    adjustHeight(textareaRef.current);
    adjustHeight(fullscreenTextareaRef.current);
  }, [inputMessage, isFullscreen]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isFullscreen) {
      fullscreenMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen, isFullscreen]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : inputMessage).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');

    if (textareaRef.current) textareaRef.current.style.height = '36px';
    if (fullscreenTextareaRef.current) fullscreenTextareaRef.current.style.height = '36px';

    setIsLoading(true);

    try {
      const isAllSelected = lessons.length > 0 && selectedLessonScopes.length === lessons.length;
      const scopeParam = isAllSelected
        ? 'all'
        : selectedLessonScopes.length === 0
        ? 'none'
        : [...selectedLessonScopes].sort((a, b) => a - b).join(', ');

      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          kotobaList: activeVocab,
          lessonScope: scopeParam,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghubungi asisten AI');
      }

      const assistantReply: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Maaf, tidak dapat memproses jawaban saat ini.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantReply]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Gagal memuat respon: ${error?.message || 'Terjadi kesalahan.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (isFullscreen) {
          fullscreenTextareaRef.current?.focus();
        } else {
          textareaRef.current?.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `greeting_${Date.now()}`,
        role: 'assistant',
        content: DEFAULT_GREETING,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render basic markdown formatting cleanly
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }

      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      const formattedParts: React.ReactNode[] = [];
      let remainder = cleanLine;
      let partKey = 0;

      while (remainder.length > 0) {
        const boldMatch = remainder.match(/\*\*(.*?)\*\*/);
        const codeMatch = remainder.match(/`(.*?)`/);

        const matches: { type: 'bold' | 'code'; index: number; length: number; content: string }[] = [];
        if (boldMatch && boldMatch.index !== undefined) {
          matches.push({ type: 'bold', index: boldMatch.index, length: boldMatch[0].length, content: boldMatch[1] });
        }
        if (codeMatch && codeMatch.index !== undefined) {
          matches.push({ type: 'code', index: codeMatch.index, length: codeMatch[0].length, content: codeMatch[1] });
        }

        if (matches.length === 0) {
          formattedParts.push(<span key={partKey++}>{remainder}</span>);
          break;
        }

        matches.sort((a, b) => a.index - b.index);
        const earliest = matches[0];

        if (earliest.index > 0) {
          formattedParts.push(<span key={partKey++}>{remainder.substring(0, earliest.index)}</span>);
        }

        if (earliest.type === 'bold') {
          formattedParts.push(
            <strong key={partKey++} className="font-semibold text-zinc-100">
              {earliest.content}
            </strong>
          );
        } else if (earliest.type === 'code') {
          formattedParts.push(
            <code key={partKey++} className="bg-zinc-800 text-[#EEAAC0] px-1 py-0.5 rounded text-[11px] font-mono">
              {earliest.content}
            </code>
          );
        }

        remainder = remainder.substring(earliest.index + earliest.length);
      }

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-0.5">
            <span className="text-[#EEAAC0] font-bold text-xs leading-5">•</span>
            <div className="flex-1 leading-relaxed">{formattedParts}</div>
          </div>
        );
      }

      return (
        <p key={idx} className="leading-relaxed my-0.5">
          {formattedParts}
        </p>
      );
    });
  };

  // Reusable chat messages renderer
  const renderChatMessages = (scrollRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="space-y-3">
      {messages.map((msg) => {
        const isAssistant = msg.role === 'assistant';
        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
          >
            <div className="mb-1 px-1 text-[10px] text-zinc-500 font-medium">
              {isAssistant ? 'Asisten' : 'Kamu'}
            </div>

            <div
              className={`relative group max-w-[92%] sm:max-w-[85%] rounded-lg px-3.5 py-2.5 text-xs ${
                isAssistant
                  ? 'bg-zinc-900/90 border border-zinc-800 text-zinc-200'
                  : 'bg-[#EEAAC0]/15 border border-[#EEAAC0]/30 text-zinc-100'
              }`}
            >
              <div className="text-zinc-200 text-xs">
                {renderFormattedContent(msg.content)}
              </div>

              {isAssistant && (
                <button
                  onClick={() => handleCopyText(msg.id, msg.content)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all text-[10px]"
                  title="Salin jawaban"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex flex-col items-start">
          <div className="mb-1 px-1 text-[10px] text-zinc-500 font-medium">
            Asisten
          </div>
          <div className="rounded-lg px-3.5 py-2 bg-zinc-900/90 border border-zinc-800 text-zinc-400 text-xs flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-[#EEAAC0]" />
            <span>Mengetik...</span>
          </div>
        </div>
      )}

      <div ref={scrollRef} />
    </div>
  );

  // Reusable input form renderer
  const renderInputBox = (inputRef: React.RefObject<HTMLTextAreaElement | null>) => (
    <div className="relative flex items-end gap-2">
      <textarea
        ref={inputRef}
        rows={1}
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          activeVocab.length === 0
            ? 'Pilih minimal satu bab untuk bertanya...'
            : 'Ketik pertanyaan...'
        }
        disabled={isLoading || activeVocab.length === 0}
        className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#EEAAC0] focus:border-[#EEAAC0]/50 transition-[border,box-shadow] min-h-[36px] max-h-40 overflow-y-auto no-scrollbar leading-relaxed disabled:opacity-50"
      />

      <Button
        variant="pink"
        size="sm"
        onClick={() => handleSendMessage()}
        disabled={isLoading || !inputMessage.trim() || activeVocab.length === 0}
        className="h-9 px-3 shrink-0"
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  );

  return (
    <>
      <Card className="overflow-hidden border-zinc-800 bg-zinc-900/60 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4 space-y-0 border-b border-zinc-800/60 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#EEAAC0]" />
            <CardTitle className="text-sm font-semibold text-zinc-100">
              Tanya AI
            </CardTitle>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 text-xs">
            {/* Multi Lesson Selector */}
            <LessonMultiSelect
              lessons={lessons}
              selectedLessonIds={selectedLessonScopes}
              onChange={setSelectedLessonScopes}
            />

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
              onClick={handleResetChat}
              title="Reset Percakapan"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
              onClick={() => setIsFullscreen(true)}
              title="Fullscreen Mode"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
              onClick={() => setIsOpen(!isOpen)}
              title={isOpen ? 'Ciutkan' : 'Buka'}
            >
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="p-0 flex flex-col">
            {/* Chat Messages Log */}
            <div className="p-4 max-h-[360px] min-h-[160px] overflow-y-auto no-scrollbar">
              {renderChatMessages(messagesEndRef)}
            </div>

            {/* Input Chat Box */}
            <div className="p-3 bg-zinc-950 border-t border-zinc-800/60">
              {renderInputBox(textareaRef)}
            </div>
          </CardContent>
        )}
      </Card>

      {/* FULLSCREEN AI ASSISTANT PORTAL */}
      {isFullscreen && typeof window !== 'undefined' && createPortal(
        <div
          onKeyDown={(e) => e.stopPropagation()}
          className="fixed inset-0 w-screen h-screen z-[99999] bg-zinc-950 flex flex-col justify-between p-4 sm:p-6 overflow-hidden"
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 shrink-0 max-w-2xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#EEAAC0]" />
              <CardTitle className="text-sm font-semibold text-zinc-100">
                Tanya AI
              </CardTitle>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <LessonMultiSelect
                lessons={lessons}
                selectedLessonIds={selectedLessonScopes}
                onChange={setSelectedLessonScopes}
              />

              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-zinc-400 hover:text-zinc-100"
                onClick={handleResetChat}
                title="Reset Percakapan"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="text-zinc-400 hover:text-zinc-100 flex items-center gap-1 h-7 px-2"
                title="Keluar Fullscreen (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="text-xs">Keluar</span>
              </Button>
            </div>
          </div>

          {/* Fullscreen Chat Messages Log */}
          <div className="flex-1 max-w-2xl mx-auto w-full overflow-y-auto no-scrollbar py-4 px-1">
            {renderChatMessages(fullscreenMessagesEndRef)}
          </div>

          {/* Fullscreen Input Chat Box */}
          <div className="max-w-2xl mx-auto w-full pt-3 pb-1 border-t border-zinc-800/80 shrink-0">
            {renderInputBox(fullscreenTextareaRef)}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
