'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle, Info, AlertCircle, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface LogEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { email: string; firstName: string | null; lastName: string | null } | null;
}

const SEVERITY_CONFIG = {
  INFO:     { icon: Info,          color: 'text-slate-500',  bg: 'bg-slate-100' },
  WARNING:  { icon: AlertTriangle, color: 'text-amber-400',  bg: 'bg-amber-900/30' },
  ERROR:    { icon: AlertCircle,   color: 'text-red-400',    bg: 'bg-red-900/30'   },
  CRITICAL: { icon: Zap,           color: 'text-purple-400', bg: 'bg-purple-900/30'},
};

export default function ActivityLogsTable() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(severity ? { severity } : {}),
      });
      const res = await fetch(`/api/admin/activity-logs?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, severity]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, severity]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity, user..."
            className="pl-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
          />
        </div>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
        >
          <option value="">All severities</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="ERROR">Error</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        <span className="text-xs text-slate-500 ml-auto">{total} entries</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-xs text-slate-500 font-medium uppercase tracking-wider px-4 py-2.5 border-b border-slate-200">
          <span className="w-6" />
          <span>Action / User</span>
          <span className="px-4">Entity</span>
          <span className="px-4">IP</span>
          <span>Time</span>
        </div>

        {loading && logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No logs found</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {logs.map((log) => {
              const cfg = SEVERITY_CONFIG[log.severity];
              const Icon = cfg.icon;
              const isExpanded = expanded === log.id;
              const userName = log.user
                ? `${log.user.firstName ?? ''} ${log.user.lastName ?? ''}`.trim() || log.user.email
                : 'System';

              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : log.id)}
                    className="w-full grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 items-center px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-3 h-3 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900 font-medium truncate">{log.action}</p>
                      <p className="text-xs text-slate-500 truncate">{userName}</p>
                    </div>
                    <div className="px-4">
                      {log.entityType && (
                        <Badge className="text-xs bg-slate-100 text-slate-500 border-0">
                          {log.entityType}
                        </Badge>
                      )}
                    </div>
                    <div className="px-4">
                      <span className="text-xs text-slate-400 font-mono">{log.ipAddress ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </button>

                  {isExpanded && log.details && (
                    <div className="px-4 pb-3 ml-9">
                      <pre className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 overflow-x-auto max-h-48">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-slate-200 text-slate-500 hover:bg-slate-100 h-7 w-7 p-0"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border-slate-200 text-slate-500 hover:bg-slate-100 h-7 w-7 p-0"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
