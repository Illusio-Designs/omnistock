'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Button, Card, Input, Textarea, Select, Switch, PasswordInput, FileUpload, Badge,
} from '@/components/ui';
import {
  User, Building2, Bell, Shield, CreditCard, Globe, Mail, Phone, Save, Check,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi, billingApi } from '@/lib/api';

const TABS = [
  { key: 'profile',  label: 'Profile',       icon: User },
  { key: 'company',  label: 'Company',       icon: Building2 },
  { key: 'security', label: 'Security',      icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'billing',  label: 'Billing',       icon: CreditCard },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ British Pound (GBP)' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata',   label: 'India Standard Time (IST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'Europe/London',  label: 'Greenwich Mean Time (GMT)' },
  { value: 'Asia/Dubai',     label: 'Gulf Standard Time (GST)' },
];

export default function SettingsPage() {
  const { user, tenant } = useAuthStore();
  const [tab, setTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [company, setCompany] = useState({
    name: '', gstin: '', address: '', currency: 'INR', timezone: 'Asia/Kolkata',
  });
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' });
  const [notifications, setNotifications] = useState({
    orders: true, lowStock: true, reviews: false, marketing: false, weekly: true,
  });
  const [logo, setLogo] = useState<File[]>([]);
  const [profileError, setProfileError] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Hydrate from the auth store once it's loaded
  useEffect(() => {
    if (user) setProfile({ name: user.name || '', email: user.email || '', phone: (user as any).phone || '' });
  }, [user]);
  useEffect(() => {
    if (tenant) setCompany((c) => ({ ...c, name: tenant.businessName || '', gstin: (tenant as any).gstin || '' }));
  }, [tenant]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notificationPrefs');
      if (saved) setNotifications(JSON.parse(saved));
    } catch {}
  }, []);

  const saveProfile = async () => {
    setProfileError('');
    try {
      await authApi.updateMe({ name: profile.name, phone: profile.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || err.message);
    }
  };

  const saveCompany = async () => {
    setCompanyError('');
    try {
      await billingApi.updateTenant({ businessName: company.name, gstin: company.gstin });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setCompanyError(err.response?.data?.error || err.message);
    }
  };

  const savePassword = async () => {
    setPasswordError('');
    if (password.next !== password.confirm) {
      setPasswordError('New passwords do not match');
      return;
    }
    try {
      await authApi.changePassword(password.current, password.next);
      setPassword({ current: '', next: '', confirm: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || err.message);
    }
  };

  const saveNotifications = () => {
    localStorage.setItem('notificationPrefs', JSON.stringify(notifications));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 animate-slide-up max-w-5xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your account and workspace</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Tabs */}
          <div className="lg:col-span-1">
            <Card className="p-2">
              <nav className="space-y-0.5">
                {TABS.map(t => {
                  const Icon = t.icon;
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon size={15} className={active ? 'text-emerald-600' : 'text-slate-400'} />
                      {t.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-4">
            {tab === 'profile' && (
              <Card className="p-6">
                <h2 className="font-bold text-lg text-slate-900 mb-1">Profile</h2>
                <p className="text-xs text-slate-500 mb-5">Your personal information</p>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl">
                    {profile.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <Button size="sm" variant="secondary">Change Avatar</Button>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input label="Full Name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  <Input label="Email" type="email" leftIcon={<Mail size={14} />} value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                  <Input label="Phone" leftIcon={<Phone size={14} />} value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </div>

                {profileError && <p className="text-xs text-rose-600 font-medium mt-2">{profileError}</p>}
                <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t border-slate-100">
                  <Button variant="secondary" onClick={() => {
                    if (user) setProfile({ name: user.name || '', email: user.email || '', phone: (user as any).phone || '' });
                  }}>Reset</Button>
                  <Button leftIcon={saved ? <Check size={14} /> : <Save size={14} />} onClick={saveProfile}>
                    {saved ? 'Saved' : 'Save Changes'}
                  </Button>
                </div>
              </Card>
            )}

            {tab === 'company' && (
              <Card className="p-6">
                <h2 className="font-bold text-lg text-slate-900 mb-1">Company Info</h2>
                <p className="text-xs text-slate-500 mb-5">Used on invoices, reports, and public pages</p>

                <div className="space-y-4">
                  <Input label="Company Name" leftIcon={<Building2 size={14} />} value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
                  <Input label="GSTIN" value={company.gstin} onChange={(e) => setCompany({ ...company, gstin: e.target.value.toUpperCase() })} placeholder="22AAAAA0000A1Z5" />
                  <Textarea label="Registered Address" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} rows={3} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select label="Currency" value={company.currency} onChange={(v) => setCompany({ ...company, currency: v })} options={CURRENCIES} fullWidth />
                    <Select label="Timezone" value={company.timezone} onChange={(v) => setCompany({ ...company, timezone: v })} options={TIMEZONES} fullWidth />
                  </div>
                  <FileUpload
                    label="Company Logo"
                    accept="image/*"
                    maxSize={2 * 1024 * 1024}
                    value={logo}
                    onChange={setLogo}
                    hint="Square PNG recommended, min 200×200"
                  />
                </div>

                {companyError && <p className="text-xs text-rose-600 font-medium mt-2">{companyError}</p>}
                <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t border-slate-100">
                  <Button leftIcon={saved ? <Check size={14} /> : <Save size={14} />} onClick={saveCompany}>
                    {saved ? 'Saved' : 'Save Changes'}
                  </Button>
                </div>
              </Card>
            )}

            {tab === 'security' && (
              <>
                <Card className="p-6">
                  <h2 className="font-bold text-lg text-slate-900 mb-1">Change Password</h2>
                  <p className="text-xs text-slate-500 mb-5">Use a strong password you don't use elsewhere</p>

                  <div className="space-y-4">
                    <PasswordInput label="Current Password" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} />
                    <PasswordInput label="New Password" value={password.next} onChange={(e) => setPassword({ ...password, next: e.target.value })} showStrength />
                    <PasswordInput label="Confirm Password" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} />
                  </div>

                  {passwordError && <p className="text-xs text-rose-600 font-medium">{passwordError}</p>}
                  <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t border-slate-100">
                    <Button leftIcon={<Save size={14} />} onClick={savePassword}>Update Password</Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="font-bold text-lg text-slate-900 mb-1">Two-Factor Authentication</h2>
                  <p className="text-xs text-slate-500 mb-5">Add an extra layer of security to your account</p>
                  <Switch
                    label="Enable 2FA"
                    description="Require a verification code when signing in"
                    checked={false}
                  />
                </Card>

                <Card className="p-6">
                  <h2 className="font-bold text-lg text-slate-900 mb-4">Active Sessions</h2>
                  <div className="space-y-3">
                    {[
                      { device: 'MacBook Pro — Chrome', location: 'Bangalore, IN', current: true },
                      { device: 'iPhone 15 — Safari',   location: 'Mumbai, IN',    current: false },
                    ].map(s => (
                      <div key={s.device} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{s.device}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Globe size={10} /> {s.location}
                          </div>
                        </div>
                        {s.current ? (
                          <Badge variant="emerald" dot>Current</Badge>
                        ) : (
                          <button className="text-xs font-bold text-rose-600 hover:text-rose-700">Revoke</button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {tab === 'notifications' && (
              <Card className="p-6">
                <h2 className="font-bold text-lg text-slate-900 mb-1">Notifications</h2>
                <p className="text-xs text-slate-500 mb-5">Choose which alerts you want to receive</p>

                <div className="space-y-4 divide-y divide-slate-100">
                  <Switch label="New orders"    description="Get notified when a new order is placed"   checked={notifications.orders}    onCheckedChange={(v) => setNotifications({ ...notifications, orders: v })} />
                  <div className="pt-4"><Switch label="Low stock alerts" description="Notify when SKUs fall below reorder point" checked={notifications.lowStock} onCheckedChange={(v) => setNotifications({ ...notifications, lowStock: v })} /></div>
                  <div className="pt-4"><Switch label="Review requests"  description="Alerts when review APIs fail or succeed"   checked={notifications.reviews}   onCheckedChange={(v) => setNotifications({ ...notifications, reviews: v })} /></div>
                  <div className="pt-4"><Switch label="Weekly summary"   description="Monday morning business digest"           checked={notifications.weekly}    onCheckedChange={(v) => setNotifications({ ...notifications, weekly: v })} /></div>
                  <div className="pt-4"><Switch label="Marketing emails" description="Product updates and commerce tips"        checked={notifications.marketing} onCheckedChange={(v) => setNotifications({ ...notifications, marketing: v })} /></div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t border-slate-100">
                  <Button leftIcon={saved ? <Check size={14} /> : <Save size={14} />} onClick={saveNotifications}>
                    {saved ? 'Saved' : 'Save Preferences'}
                  </Button>
                </div>
              </Card>
            )}

            {tab === 'billing' && (
              <>
                <Card className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-emerald-100 blur-3xl opacity-50" />
                  <div className="relative">
                    <Badge variant="emerald">Current Plan</Badge>
                    <h2 className="text-2xl font-bold text-slate-900 mt-2">Growth</h2>
                    <p className="text-xs text-slate-500 mt-1">Unlimited channels · 10,000 orders/month</p>
                    <div className="flex items-baseline gap-1 mt-4">
                      <span className="text-4xl font-bold gradient-text">₹2,499</span>
                      <span className="text-sm text-slate-500 font-semibold">/month</span>
                    </div>
                    <div className="flex items-center gap-2 mt-5">
                      <Button>Upgrade Plan</Button>
                      <Button variant="secondary">Cancel Subscription</Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="font-bold text-lg text-slate-900 mb-4">Payment Method</h2>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50/50 border border-slate-100">
                    <div className="w-12 h-8 rounded-md bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900">•••• •••• •••• 4242</div>
                      <div className="text-xs text-slate-500">Expires 12/2027</div>
                    </div>
                    <Button size="sm" variant="secondary">Update</Button>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
