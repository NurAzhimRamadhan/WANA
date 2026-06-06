import React, { useEffect, useState } from 'react';
import { Bell, MessageCircle, Mail, Inbox, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { WANA } from '@/constants/testIds/wana';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/ImpactBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const channelIcon = {
  whatsapp: <MessageCircle className="h-4 w-4 text-[#25D366]" />,
  email: <Mail className="h-4 w-4 text-wana-river" />,
  system: <Inbox className="h-4 w-4 text-wana-soil" />,
};

export default function AlertCenter() {
  const { t, lang } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [region, setRegion] = useState('all');
  const [priority, setPriority] = useState('all');

  const fetchAll = async () => {
    const params = {};
    if (region !== 'all') params.region = region;
    if (priority !== 'all') params.priority = priority;
    const { data } = await api.get('/alerts', { params });
    setAlerts(data);
  };

  useEffect(() => {
    (async () => {
      const { data } = await api.get('/regulations/meta/regions');
      setRegions(data.regions || []);
    })();
  }, []);

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [region, priority]);

  const toggleRead = async (alert) => {
    await api.patch(`/alerts/${alert.id}`, { is_read: !alert.is_read });
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, is_read: !a.is_read } : a));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">Real-time alerts</div>
          <h1 className="mt-2 font-display font-bold text-4xl sm:text-5xl tracking-tight text-wana-ink leading-[1.05]">{t('alerts.title')}</h1>
          <p className="mt-3 text-wana-soil max-w-3xl text-[16px] leading-relaxed">{t('alerts.sub')}</p>
        </div>
        <SubscribeDialog regions={regions} />
      </div>

      <div className="mt-6 flex gap-3 flex-wrap">
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger data-testid={WANA.alerts.regionFilter} className="w-56 bg-white border-wana-border">
            <SelectValue placeholder={t('common.region')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')} — {t('common.region')}</SelectItem>
            {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger data-testid={WANA.alerts.priorityFilter} className="w-56 bg-white border-wana-border">
            <SelectValue placeholder={t('common.priority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')} — {t('common.priority')}</SelectItem>
            <SelectItem value="high">{t('priority.high')}</SelectItem>
            <SelectItem value="medium">{t('priority.medium')}</SelectItem>
            <SelectItem value="low">{t('priority.low')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <h2 className="mt-10 mb-4 font-heading font-semibold text-lg text-wana-ink">{t('alerts.timeline_title')}</h2>
      <div className="space-y-3" data-testid={WANA.alerts.list}>
        {alerts.length === 0 && (
          <div className="bg-white border border-wana-border rounded-md p-8 text-center text-wana-soil">{t('alerts.empty')}</div>
        )}
        {alerts.map((a) => (
          <div
            key={a.id}
            data-testid={WANA.alerts.item(a.id)}
            className={`glass-light hover-lift rounded-2xl p-5 flex gap-4 transition-all ${
              a.is_read ? '' : 'border-l-4 border-l-wana-forest glow-forest'
            }`}
          >
            <div className="h-10 w-10 shrink-0 rounded-md bg-wana-forest/10 text-wana-forest flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <PriorityBadge priority={a.priority} />
                {a.action_needed && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-wana-terracotta">
                    <AlertTriangle className="h-3 w-3" /> {t('alerts.action_needed')}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-wana-soil">
                  {channelIcon[a.channel]} {a.channel}
                </span>
                <span className="text-[11px] text-wana-soil ml-auto">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <div className="font-heading font-semibold text-wana-ink leading-snug">{lang === 'id' ? a.title_id : a.title_en}</div>
              <div className="mt-1 text-sm text-wana-soil leading-relaxed">{lang === 'id' ? a.message_id : a.message_en}</div>
              <div className="mt-2 text-xs text-wana-moss font-semibold">{a.region} · {a.territory}</div>
            </div>
            <button
              type="button"
              data-testid={WANA.alerts.markRead(a.id)}
              onClick={() => toggleRead(a)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-wana-forest hover:underline"
            >
              {a.is_read ? <Circle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {a.is_read ? t('alerts.mark_unread') : t('alerts.mark_read')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubscribeDialog({ regions }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', organization: '', contact: '', region: '', channel: 'both' });

  const submit = async () => {
    if (!form.name || !form.contact || !form.region) {
      toast.error('Please fill name, contact and region.');
      return;
    }
    await api.post('/alert-subscriptions', form);
    toast.success(t('alerts.success'));
    setOpen(false);
    setForm({ name: '', organization: '', contact: '', region: '', channel: 'both' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid={WANA.alerts.subscribeBtn}
          className="bg-wana-forest hover:bg-wana-forest/90 text-white font-semibold"
        >
          <Bell className="h-4 w-4 mr-2" /> {t('alerts.subscribe_title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white border-wana-border">
        <DialogHeader>
          <DialogTitle className="font-heading">{t('alerts.subscribe_title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-wana-soil -mt-2">{t('alerts.subscribe_sub')}</p>
        <div className="space-y-3 mt-2">
          <Input data-testid={WANA.alerts.subscribeNameInput} placeholder={t('alerts.name_ph')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input data-testid={WANA.alerts.subscribeOrgInput} placeholder={t('alerts.org_ph')} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
          <Input data-testid={WANA.alerts.subscribeContactInput} placeholder={t('alerts.contact_ph')} value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
            <SelectTrigger data-testid={WANA.alerts.subscribeRegionSelect}>
              <SelectValue placeholder={t('common.region')} />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}>
            <SelectTrigger data-testid={WANA.alerts.subscribeChannelSelect}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="both">WhatsApp + Email</SelectItem>
            </SelectContent>
          </Select>
          <Button data-testid={WANA.alerts.subscribeSubmit} onClick={submit} className="w-full bg-wana-forest hover:bg-wana-forest/90 text-white">
            {t('alerts.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
