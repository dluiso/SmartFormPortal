'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ExternalLink, Star, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Process {
  id: string;
  name: string;
  description: string | null;
  publicUrl: string;
  requiresRenewal: boolean;
  category: { name: string; color: string | null } | null;
  department: { name: string } | null;
}

interface Props {
  processes: Process[];
  favoriteIds: string[];
  userId: string;
  tenantId: string;
}

export default function AvailableProcesses({
  processes,
  favoriteIds: initialFavorites,
  userId,
}: Props) {
  const t = useTranslations('processes');
  const tDash = useTranslations('dashboard');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));
  const [isPending, startTransition] = useTransition();

  const filtered = processes.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.name.toLowerCase().includes(search.toLowerCase()) ||
      p.department?.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFavorite = async (processId: string) => {
    const isFav = favorites.has(processId);
    setFavorites((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(processId) : next.add(processId);
      return next;
    });

    startTransition(async () => {
      try {
        const res = await fetch(`/api/processes/${processId}/favorite`, {
          method: isFav ? 'DELETE' : 'POST',
        });
        if (!res.ok) throw new Error();
      } catch {
        setFavorites((prev) => {
          const next = new Set(prev);
          isFav ? next.add(processId) : next.delete(processId);
          return next;
        });
        toast.error('Could not update favorites. Please try again.');
      }
    });
  };

  const [applying, setApplying] = useState<string | null>(null);

  const handleApply = async (process: Process) => {
    setApplying(process.id);
    try {
      const res = await fetch(`/api/processes/${process.id}/apply`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      toast.error('Could not start application. Please try again.');
    } finally {
      setApplying(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{tDash('available_processes')}</h2>
        <span className="text-sm text-slate-500">{filtered.length} available</span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_placeholder')}
          className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileTextIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{t('no_processes')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((process) => (
            <ProcessCard
              key={process.id}
              process={process}
              isFavorite={favorites.has(process.id)}
              isApplying={applying === process.id}
              onToggleFavorite={() => toggleFavorite(process.id)}
              onApply={() => handleApply(process)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessCard({
  process,
  isFavorite,
  isApplying,
  onToggleFavorite,
  onApply,
}: {
  process: Process;
  isFavorite: boolean;
  isApplying: boolean;
  onToggleFavorite: () => void;
  onApply: () => void;
}) {
  const t = useTranslations('processes');

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 text-sm leading-snug truncate pr-2">
            {process.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {process.category && (
              <Badge
                variant="secondary"
                className="text-xs h-5 px-1.5 bg-slate-100 text-slate-600 border-0"
                style={
                  process.category.color
                    ? { backgroundColor: `${process.category.color}20`, color: process.category.color }
                    : undefined
                }
              >
                {process.category.name}
              </Badge>
            )}
            {process.department && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 border-slate-300 text-slate-500">
                {process.department.name}
              </Badge>
            )}
            {process.requiresRenewal && (
              <Badge variant="outline" className="text-xs h-5 px-1.5 border-purple-200 text-purple-600">
                Annual
              </Badge>
            )}
          </div>
        </div>
        <button
          onClick={onToggleFavorite}
          className="flex-shrink-0 text-slate-300 hover:text-amber-500 transition-colors ml-1"
          title={isFavorite ? t('unfavorite') : t('favorite')}
        >
          {isFavorite ? (
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          ) : (
            <Star className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Description */}
      {process.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{process.description}</p>
      )}

      {/* Apply button */}
      <Button
        onClick={onApply}
        size="sm"
        disabled={isApplying}
        className="w-full h-8 text-xs"
      >
        <ExternalLink className={`w-3 h-3 mr-1.5 ${isApplying ? 'animate-pulse' : ''}`} />
        {isApplying ? t('applying') : t('apply')}
      </Button>
    </div>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
