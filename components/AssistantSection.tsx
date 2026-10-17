'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Send, 
  Loader2, 
  Trash2, 
  Sparkles, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KotobaItem, Lesson, ChatMessage } from '@/types/kotoba';

interface AssistantSectionProps {
  lessons: Lesson[];
  kotobaList: KotobaItem[];
}

const DEFAULT_GREETING = (count: number, scopeTitle: string): string => {
  return `**Konnichiwa!** (こんにちは) 👋\n\nSaya **Kotoba Sensei** (言葉先生). Saya sudah mempelajari **${count} kosakata** dari **${scopeTitle}** yang kamu miliki!\n\nKamu bisa bertanya tentang:\n- 💡 Contoh kalimat (例文 - reibun)\n- 🔍 Penjelasan makna atau perbedaan kata\n- 📝 Golongan kata kerja / kata sifat\n- 🎯 Minta kuis tebak arti kata untuk menguji ingatanmu!\n\n*Ada yang ingin kamu tanyakan hari ini?*`;
};

export const AssistantSection: React.FC<AssistantSectionProps> = ({
  lessons,
  kotobaList,
}) => {
  const [selectedLessonScope, setSelectedLessonScope] = useState<number | 'all'>('all');
  const [isOpen, setIsOpen] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter kotoba based on selected scope
  const activeVocab = useMemo(() => {
    if (selectedLessonScope === 'all') {
      return kotobaList;
    }
    return kotobaList.filter((k) => k.lessonId === Number(selectedLessonScope));
  }, [kotobaList, selectedLessonScope]);

  const scopeLabel = selectedLessonScope === 'all' ? 'Semua Bab' : `Bab ${selectedLessonScope}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'initial_greeting',
      role: 'assistant',
      content: DEFAULT_GREETING(activeVocab.length, scopeLabel),
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When scope changes, optionally update greeting if no messages were exchanged
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'initial_greeting') {
        return [
          {
            id: 'initial_greeting',
            role: 'assistant',
            content: DEFAULT_GREETING(activeVocab.length, scopeLabel),
            timestamp: Date.now(),
          },
        ];
      }
      return prev;
    });
  }, [activeVocab.length, scopeLabel]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

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
    setIsLoading(true);

    try {
      // Send the conversation history
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          kotobaList: activeVocab,
          lessonScope: selectedLessonScope,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghubungi asisten AI');
      }

      const assistantReply: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Maaf, saya tidak dapat memproses jawaban saat ini.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantReply]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Maaf, terjadi kendala:** ${error?.message || 'Gagal memuat respon.'}\n\nPastikan konfigurasi API Key sudah benar dan coba kirim ulang.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
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
        content: DEFAULT_GREETING(activeVocab.length, scopeLabel),
        timestamp: Date.now(),
      },
    ]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick prompt suggestions
  const quickPrompts = [
    '💡 Berikan 3 contoh kalimat dari bab ini',
    '🎯 Beri aku kuis tebak kata',
    '🔍 Apa saja kata sifat atau kata kerja di bab ini?',
    '📝 Buatkan rangkuman kosakata penting',
  ];

  // Helper to render basic markdown formatting nicely
  const renderFormattedContent = (content: string) => {
    // Split into paragraphs / lines
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Check if bullet point
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Simple parser for bold **text** and italic *text* and code `text`
      const formattedParts: React.ReactNode[] = [];
      let remainder = cleanLine;
      let partKey = 0;

      while (remainder.length > 0) {
        // Match bold **text**
        const boldMatch = remainder.match(/\*\*(.*?)\*\*/);
        // Match code `text`
        const codeMatch = remainder.match(/`(.*?)`/);

        // Find earliest match
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

        // Sort by earliest index
        matches.sort((a, b) => a.index - b.index);
        const earliest = matches[0];

        // Push text before match
        if (earliest.index > 0) {
          formattedParts.push(<span key={partKey++}>{remainder.substring(0, earliest.index)}</span>);
        }

        // Push formatted element
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

  return (
    <Card className="overflow-hidden border-zinc-800 bg-zinc-900/60 shadow-lg transition-all">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3.5 px-4 space-y-0 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EEAAC0]/10 border border-[#EEAAC0]/30 flex items-center justify-center text-[#EEAAC0]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-zinc-100">
              Kotoba AI Sensei
              <Badge variant="pink" className="text-[10px] py-0 px-1.5 font-normal">
                Gemini AI
              </Badge>
            </CardTitle>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 text-xs">
          {/* Scope Selector */}
          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-[11px]">
            <BookOpen className="w-3 h-3 text-zinc-400" />
            <select
              value={selectedLessonScope}
              onChange={(e) =>
                setSelectedLessonScope(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
              }
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="all" className="bg-zinc-900">
                Semua Bab ({kotobaList.length} kata)
              </option>
              {lessons.map((l) => (
                <option key={l.lessonId} value={l.lessonId} className="bg-zinc-900">
                  Bab {l.lessonId} ({l.totalCount} kata)
                </option>
              ))}
            </select>
          </div>

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
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? 'Ciutkan' : 'Buka'}
          >
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="p-0 flex flex-col">
          {/* Quick Prompts */}
          <div className="p-3 bg-zinc-950/60 border-b border-zinc-800/50 flex flex-wrap gap-1.5 text-xs">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt.replace(/^[^\w\s]+\s*/, ''))}
                disabled={isLoading || activeVocab.length === 0}
                className="px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-[#EEAAC0]/40 text-zinc-300 hover:text-zinc-100 text-[11px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="p-4 space-y-3 max-h-[380px] min-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.map((msg) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-500 font-medium">
                    {isAssistant ? (
                      <>
                        <Sparkles className="w-3 h-3 text-[#EEAAC0]" />
                        <span>Kotoba Sensei</span>
                      </>
                    ) : (
                      <span>Kamu</span>
                    )}
                  </div>

                  <div
                    className={`relative group max-w-[92%] sm:max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs ${
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
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-500 font-medium">
                  <Sparkles className="w-3 h-3 text-[#EEAAC0]" />
                  <span>Kotoba Sensei sedang berpikir...</span>
                </div>
                <div className="rounded-xl px-4 py-3 bg-zinc-900/90 border border-zinc-800 text-zinc-400 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#EEAAC0]" />
                  <span>Menganalisis materi kosakata dan merangkai jawaban...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Chat Box */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-800/60">
            <div className="relative flex items-center gap-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeVocab.length === 0
                    ? 'Import kosakata terlebih dahulu untuk mulai berdiskusi...'
                    : `Tanya Kotoba Sensei seputar ${scopeLabel}... (Tekan Enter untuk kirim)`
                }
                disabled={isLoading}
                className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#EEAAC0] focus:border-[#EEAAC0]/50 transition-all max-h-28 disabled:opacity-50"
              />

              <Button
                variant="pink"
                size="sm"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputMessage.trim()}
                className="h-9 px-3 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-zinc-500">
              <span>Shift + Enter untuk baris baru</span>
              <span>{activeVocab.length} kata termuat dalam memori</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
