import React, { useState } from 'react';
import { Mail, Users, BookOpen, Sprout } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WANA } from '@/constants/testIds/wana';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ICONS = [Users, BookOpen, Sprout];

export default function Contact() {
  const { t } = useLanguage();
  const partners = t('contact.partners');
  const [form, setForm] = useState({ name: '', email: '', organization: '', message: '' });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill required fields.');
      return;
    }
    toast.success(t('contact.success'));
    setForm({ name: '', email: '', organization: '', message: '' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-3xl">
        <div className="text-[11px] uppercase tracking-[0.25em] font-semibold text-wana-moss">Partnership</div>
        <h1 className="mt-2 font-display font-bold text-4xl sm:text-5xl tracking-tight text-wana-ink leading-[1.05]">{t('contact.title')}</h1>
        <p className="mt-3 text-wana-soil text-[16px] leading-relaxed">{t('contact.sub')}</p>
      </div>

      <div className="mt-10 grid md:grid-cols-3 gap-5">
        {partners.map((p, i) => {
          const Icon = ICONS[i] || Users;
          return (
            <div key={i} className="bg-white border border-wana-border rounded-md p-5">
              <div className="h-10 w-10 rounded-md bg-wana-forest text-white flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-heading font-semibold text-lg text-wana-ink">{p.t}</h3>
              <p className="mt-2 text-sm text-wana-soil leading-relaxed">{p.d}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-10 bg-white border border-wana-border rounded-md p-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-4 text-wana-forest">
          <Mail className="h-5 w-5" />
          <h2 className="font-heading font-bold text-xl text-wana-ink">{t('contact.form_title')}</h2>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <Input data-testid={WANA.contact.nameInput} placeholder={t('contact.name_ph')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input data-testid={WANA.contact.emailInput} type="email" placeholder={t('contact.email_ph')} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input data-testid={WANA.contact.orgInput} placeholder={t('contact.org_ph')} value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
          <Textarea data-testid={WANA.contact.messageInput} rows={6} placeholder={t('contact.message_ph')} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <Button type="submit" data-testid={WANA.contact.submitBtn} className="bg-wana-forest hover:bg-wana-forest/90 text-white">
            {t('contact.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
