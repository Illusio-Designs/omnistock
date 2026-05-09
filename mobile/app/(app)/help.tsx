/**
 * Mobile Help & Support — mirrors the web HelpDrawer.
 *
 * Two tabs:
 *   - Browse help: FAQ accordion (CMS-driven via /help/faqs?audience=tenant)
 *                  + quick-link to /tickets
 *   - Contact:     short ticket form that POSTs to /tickets via ticketApi
 */

import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, LifeBuoy, MessageSquare, Send } from 'lucide-react-native';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import FormInput from '../../components/ui/FormInput';
import PageShell from '../../components/ui/PageShell';
import SelectField from '../../components/ui/SelectField';
import { helpApi, ticketApi, type HelpFaq } from '../../lib/api';
import { toast } from '../../store/toast.store';

type Tab = 'help' | 'contact';

export default function HelpScreen() {
  const [tab, setTab] = useState<Tab>('help');

  return (
    <PageShell title="Help & Support" subtitle="Find answers fast or reach the team.">
      {/* Tabs */}
      <View className="flex-row mb-3 border-b border-slate-200">
        <TabButton label="Browse help" active={tab === 'help'} onPress={() => setTab('help')} />
        <TabButton label="Contact"     active={tab === 'contact'} onPress={() => setTab('contact')} />
      </View>

      {tab === 'help' ? (
        <BrowseHelp onContact={() => setTab('contact')} />
      ) : (
        <ContactForm onSent={() => setTab('help')} />
      )}
    </PageShell>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`flex-1 py-3 ${active ? 'border-b-2 border-emerald-500' : ''}`}>
      <Text className={`text-center text-sm font-bold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function BrowseHelp({ onContact }: { onContact: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['help-faqs', 'tenant'],
    queryFn: () => helpApi.faqs('tenant').then((r) => r.data || []),
  });

  return (
    <View className="gap-4">
      {/* Quick links */}
      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick links</Text>
        <Pressable
          onPress={onContact}
          className="flex-row items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white"
        >
          <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
            <MessageSquare size={18} color="#04AB94" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-slate-900">Contact support</Text>
            <Text className="text-xs text-slate-500">Open a new ticket — replies arrive by email</Text>
          </View>
        </Pressable>
      </View>

      {/* FAQ accordion */}
      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Frequently asked</Text>
        {isLoading ? (
          <View className="p-6 rounded-2xl border border-slate-200 bg-white">
            <Text className="text-sm text-slate-400 text-center">Loading…</Text>
          </View>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={<LifeBuoy size={28} color="#94a3b8" />}
            title="No FAQs yet"
            description="Check back soon — your team will publish help content here."
          />
        ) : (
          <View className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
            {data.map((faq, idx) => (
              <FaqRow
                key={faq.id}
                faq={faq}
                isOpen={openId === faq.id}
                onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                isLast={idx === data.length - 1}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function FaqRow({
  faq, isOpen, onToggle, isLast,
}: {
  faq: HelpFaq; isOpen: boolean; onToggle: () => void; isLast: boolean;
}) {
  return (
    <View className={isLast ? '' : 'border-b border-slate-100'}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-3 p-4">
        <Text className="flex-1 text-sm font-semibold text-slate-900">{faq.question}</Text>
        <ChevronDown
          size={16}
          color="#94a3b8"
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {isOpen ? (
        <View className="px-4 pb-4">
          <Text className="text-xs text-slate-600 leading-relaxed">{faq.answer}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ContactForm({ onSent }: { onSent: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('billing');
  const [priority, setPriority] = useState('normal');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Add a subject and a short description before sending.', 'Missing details');
      return;
    }
    setBusy(true);
    try {
      await ticketApi.create({
        subject: subject.trim(),
        body: body.trim(),
        priority,
        category,
      });
      toast.success("We'll reply on the email tied to your account.", 'Ticket created');
      setSubject('');
      setBody('');
      setTimeout(onSent, 600);
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Could not send. Try again.';
      toast.error(typeof msg === 'string' ? msg : 'Could not send. Try again.', 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-3">
      <FormInput
        label="Subject"
        value={subject}
        onChangeText={setSubject}
        placeholder="Short summary of the issue"
        maxLength={140}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <SelectField
            label="Category"
            value={category}
            onChange={setCategory}
            options={[
              { value: 'billing',   label: 'Billing' },
              { value: 'technical', label: 'Technical issue' },
              { value: 'account',   label: 'Account' },
              { value: 'feature',   label: 'Feature request' },
              { value: 'other',     label: 'Other' },
            ]}
          />
        </View>
        <View className="flex-1">
          <SelectField
            label="Priority"
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'low',    label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high',   label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
        </View>
      </View>
      <View>
        <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What happened? Include any error messages or steps to reproduce."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          className="border border-slate-200 rounded-2xl p-3 bg-white text-sm text-slate-900 min-h-[120px]"
        />
      </View>
      <Button onPress={submit} loading={busy} leftIcon={<Send size={14} color="#fff" />}>
        {busy ? 'Sending…' : 'Create ticket'}
      </Button>
      <Text className="text-[11px] text-slate-500 text-center mt-1">
        Or email{' '}
        <Text className="font-bold text-emerald-700">info@kartriq.com</Text> directly.
      </Text>
    </View>
  );
}
