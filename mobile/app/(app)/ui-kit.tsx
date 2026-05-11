import { Plus, Save, Send, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import BottomSheet from '../../components/ui/BottomSheet';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import FormInput from '../../components/ui/FormInput';
import ListRow from '../../components/ui/ListRow';
import PageShell from '../../components/ui/PageShell';
import SelectField from '../../components/ui/SelectField';
import StatusFilter from '../../components/ui/StatusFilter';
import Tabs from '../../components/ui/Tabs';
import { toast } from '../../store/toast.store';

type Section = 'buttons' | 'inputs' | 'feedback' | 'data' | 'layout';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'buttons',  label: 'Buttons' },
  { key: 'inputs',   label: 'Inputs' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'data',     label: 'Data' },
  { key: 'layout',   label: 'Layout' },
];

export default function UiKitScreen() {
  const [section, setSection] = useState<Section>('buttons');
  const [text, setText] = useState('');
  const [color, setColor] = useState('emerald');
  const [filter, setFilter] = useState('ALL');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <PageShell title="UI Kit" subtitle="Live showcase of every shared mobile component">
      <View className="mb-4">
        <Tabs value={section} onChange={setSection} items={SECTIONS} />
      </View>

      {section === 'buttons' && (
        <View>
          <Demo title="Variants">
            <View className="flex-row flex-wrap gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </View>
          </Demo>

          <Demo title="Sizes">
            <View className="flex-row flex-wrap gap-2 items-center">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </View>
          </Demo>

          <Demo title="With icons + states">
            <View className="flex-row flex-wrap gap-2 items-center">
              <Button leftIcon={<Plus size={14} color="#fff" />}>New</Button>
              <Button leftIcon={<Save size={14} color="#fff" />} variant="primary">Save</Button>
              <Button leftIcon={<Trash2 size={14} color="#fff" />} variant="danger" size="sm">Delete</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </View>
          </Demo>
        </View>
      )}

      {section === 'inputs' && (
        <View>
          <Demo title="FormInput">
            <FormInput label="Name" value={text} onChangeText={setText} placeholder="Type something" />
          </Demo>

          <Demo title="SelectField">
            <SelectField
              label="Favorite color"
              value={color}
              onChange={setColor}
              placeholder="Pick one"
              options={[
                { value: 'emerald', label: 'Emerald' },
                { value: 'sky',     label: 'Sky' },
                { value: 'rose',    label: 'Rose' },
                { value: 'amber',   label: 'Amber' },
              ]}
            />
            <Text className="text-xs text-slate-500 mt-2">Selected: {color}</Text>
          </Demo>

          <Demo title="StatusFilter">
            <StatusFilter
              options={['ALL', 'PENDING', 'SHIPPED', 'DELIVERED']}
              value={filter}
              onChange={setFilter}
            />
          </Demo>

          <Demo title="BottomSheet">
            <Button variant="primary" leftIcon={<Send size={14} color="#fff" />} onPress={() => setSheetOpen(true)}>
              Open BottomSheet
            </Button>
            <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="Example sheet">
              <Text className="text-sm text-slate-600 mb-4">
                BottomSheet wraps any content in a slide-up modal.
              </Text>
              <Button onPress={() => setSheetOpen(false)}>Done</Button>
            </BottomSheet>
          </Demo>
        </View>
      )}

      {section === 'feedback' && (
        <View>
          <Demo title="Badges">
            <View className="flex-row flex-wrap gap-2">
              <Badge variant="emerald">Active</Badge>
              <Badge variant="rose">Failed</Badge>
              <Badge variant="amber">Pending</Badge>
              <Badge variant="violet">B2B</Badge>
              <Badge variant="slate">Draft</Badge>
              <Badge variant="emerald" dot>With dot</Badge>
            </View>
          </Demo>

          <Demo title="Toast">
            <View className="flex-row flex-wrap gap-2">
              <Button variant="primary" size="sm" onPress={() => toast.success('Saved successfully')}>Success</Button>
              <Button variant="danger"  size="sm" onPress={() => toast.error('Something went wrong', 'Error')}>Error</Button>
              <Button variant="secondary" size="sm" onPress={() => toast.info('FYI: this is informational')}>Info</Button>
              <Button variant="ghost" size="sm" onPress={() => toast.warning('Heads up — check before continuing', 'Warning')}>Warning</Button>
            </View>
          </Demo>

          <Demo title="EmptyState">
            <Card className="p-2">
              <EmptyState title="No items yet" description="This is what an empty list looks like." />
            </Card>
          </Demo>
        </View>
      )}

      {section === 'data' && (
        <View>
          <Demo title="Avatar — sizes">
            <View className="flex-row items-center gap-2">
              <Avatar name="Alice" size="xs" />
              <Avatar name="Bob"   size="sm" />
              <Avatar name="Carol" size="md" />
              <Avatar name="Dan"   size="lg" />
              <Avatar name="Eve"   size="xl" />
            </View>
          </Demo>

          <Demo title="Avatar — shapes & null">
            <View className="flex-row items-center gap-2">
              <Avatar name="Frank" size="md" shape="circle" />
              <Avatar name="Grace" size="md" shape="rounded" />
              <Avatar name={null}  size="md" />
            </View>
          </Demo>

          <Demo title="ListRow with Avatar">
            <Card>
              <ListRow
                isFirst
                icon={<Avatar name="Alice Wong" size="sm" />}
                title="Alice Wong"
                subtitle="alice@acme.com"
                meta="Mumbai"
                right={<Badge variant="emerald" dot>Active</Badge>}
              />
              <ListRow
                icon={<Avatar name="Bob Patel" size="sm" />}
                title="Bob Patel"
                subtitle="+91 98765 43210"
                meta="Bangalore"
                right={<Badge variant="violet">B2B</Badge>}
              />
            </Card>
          </Demo>

          <Demo title="Tabs with badges">
            <Tabs
              value="orders"
              onChange={() => Alert.alert('Tab', 'Tab pressed')}
              items={[
                { key: 'overview', label: 'Overview' },
                { key: 'orders',   label: 'Orders',   badge: 12 },
                { key: 'inventory',label: 'Stock',    badge: 3 },
              ]}
            />
          </Demo>
        </View>
      )}

      {section === 'layout' && (
        <View>
          <Demo title="Card">
            <Card className="p-5">
              <Text className="text-base font-bold text-slate-900 mb-1">Card title</Text>
              <Text className="text-sm text-slate-500 mb-3">
                Cards wrap related content. Use as the base for stat tiles, list panels and form sections.
              </Text>
              <Button variant="primary" size="sm">Action</Button>
            </Card>
          </Demo>
        </View>
      )}
    </PageShell>
  );
}

function Demo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 mb-4">
      <Text className="text-sm font-bold text-slate-900 mb-3">{title}</Text>
      {children}
    </Card>
  );
}
