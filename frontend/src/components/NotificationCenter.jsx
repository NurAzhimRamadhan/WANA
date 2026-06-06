import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, FileText, Map as MapIcon, MessageCircle, Folder, Scale, AlertTriangle, CheckCheck, Radio } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { WANA } from '@/constants/testIds/wana';

const ICONS = {
  regulation: AlertTriangle,
  brief: FileText,
  spatial: MapIcon,
  alert: MessageCircle,
  evidence: Folder,
  validation: Scale,
};

const CATEGORY_STYLES = {
  urgent:  { dot: 'bg-[#B75D46]', ring: 'ring-[#B75D46]/30', text: 'text-[#B75D46]', chip: 'bg-[#B75D46]/10 text-[#B75D46]' },
  warning: { dot: 'bg-[#D49A36]', ring: 'ring-[#D49A36]/30', text: 'text-[#8a6118]', chip: 'bg-[#D49A36]/15 text-[#8a6118]' },
  success: { dot: 'bg-[#4A6B53]', ring: 'ring-[#4A6B53]/30', text: 'text-[#4A6B53]', chip: 'bg-[#4A6B53]/12 text-[#4A6B53]' },
  info:    { dot: 'bg-[#5A7A85]', ring: 'ring-[#5A7A85]/30', text: 'text-[#395461]', chip: 'bg-[#5A7A85]/12 text-[#395461]' },
};

function timeAgo(iso, lang) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(1, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (lang === 'id') {
    if (s < 60) return `${s} detik lalu`;
    if (m < 60) return `${m} menit lalu`;
    if (h < 24) return `${h} jam lalu`;
    return `${d} hari lalu`;
  }
  if (s < 60) return `${s}s ago`;
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function NotificationCenter() {
  const { lang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [pulse, setPulse] = useState(false);
  const prevUnread = useRef(0);

  const load = async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 30 } });
      setItems(data);
      const u = data.filter((n) => !n.is_read).length;
      if (u > prevUnread.current && prevUnread.current > 0) {
        setPulse(true);
        setTimeout(() => setPulse(false), 2400);
      }
      prevUnread.current = u;
      setUnread(u);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000); // gentle polling
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, []);

  const markAllRead = async () => {
    await api.post('/notifications/mark-all-read');
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  const handleClick = async (n) => {
    if (!n.is_read) {
      try {
        await api.patch(`/notifications/${n.id}`, { is_read: true });
        setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
        setUnread((u) => Math.max(0, u - 1));
      } catch {}
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="notification-bell"
          className="relative h-9 w-9 inline-flex items-center justify-center rounded-md border border-wana-border bg-white text-wana-ink hover:text-wana-forest hover:border-wana-forest/40 transition-colors duration-200"
          aria-label="Notifications"
        >
          <Bell className={`h-4 w-4 ${pulse ? 'animate-pulse' : ''}`} />
          {unread > 0 && (
            <span
              data-testid="notification-unread-badge"
              className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B75D46] text-white text-[10px] font-bold flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[380px] max-w-[calc(100vw-1.5rem)] p-0 border-wana-border bg-white shadow-xl rounded-md overflow-hidden"
        data-testid="notification-panel"
      >
        {/* header */}
        <div className="px-4 py-3 border-b border-wana-border flex items-center justify-between gap-3 bg-wana-bg/60">
          <div>
            <div className="text-sm font-heading font-semibold text-wana-ink leading-tight">
              {lang === 'id' ? 'Aktivitas Sistem' : 'System Activity'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-wana-soil">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-wana-moss animate-ping opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-wana-moss" />
              </span>
              <span className="font-semibold text-wana-moss">
                {lang === 'id' ? 'Monitoring aktif' : 'Monitoring active'}
              </span>
              <Radio className="h-3 w-3 text-wana-moss" />
            </div>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              data-testid="notification-mark-all-read"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-wana-forest hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {lang === 'id' ? 'Tandai semua dibaca' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* list */}
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="h-8 w-8 mx-auto text-wana-moss/60" />
              <p className="mt-3 text-sm text-wana-soil">
                {lang === 'id' ? 'Belum ada aktivitas baru.' : 'No new activity yet.'}
              </p>
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                const cs = CATEGORY_STYLES[n.category] || CATEGORY_STYLES.info;
                return (
                  <li key={n.id}>
                    <Link
                      to={n.link || '/'}
                      onClick={() => handleClick(n)}
                      data-testid={`notification-item-${n.id}`}
                      className={`block px-4 py-3 border-b border-wana-border last:border-b-0 transition-colors duration-200 ${
                        n.is_read ? 'bg-white hover:bg-wana-bg/60' : 'bg-wana-bg hover:bg-wana-bg/80'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`h-9 w-9 shrink-0 rounded-md ring-1 ${cs.ring} bg-white flex items-center justify-center ${cs.text}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className={`text-sm font-semibold leading-snug flex-1 ${n.is_read ? 'text-wana-soil' : 'text-wana-ink'}`}>
                              {lang === 'id' ? n.title_id : n.title_en}
                            </div>
                            {!n.is_read && (
                              <span className={`h-1.5 w-1.5 rounded-full ${cs.dot} mt-1.5 shrink-0`} />
                            )}
                          </div>
                          <div className="text-[12px] text-wana-soil mt-0.5 leading-snug line-clamp-2">
                            {lang === 'id' ? n.message_id : n.message_en}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                            <span className={`px-1.5 py-0.5 rounded ${cs.chip}`}>{n.category}</span>
                            {n.region && <span className="text-wana-moss">{n.region}</span>}
                            <span className="ml-auto text-wana-soil tracking-normal normal-case font-normal">{timeAgo(n.created_at, lang)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {/* footer */}
        <div className="px-4 py-2.5 border-t border-wana-border bg-wana-bg/40">
          <Link
            to="/alerts"
            onClick={() => setOpen(false)}
            data-testid="notification-view-all"
            className="block text-center text-xs font-semibold text-wana-forest hover:underline"
          >
            {lang === 'id' ? 'Lihat semua aktivitas' : 'View all activity'}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
