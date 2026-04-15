'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { userApi, roleApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Trash2, Users, Shield, X, Save } from 'lucide-react';

export default function TeamPage() {
  const { hasPermission } = useAuthStore();
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900">Team</h1>
        <p className="text-slate-500 mt-1">Manage users and role-based access.</p>

        <div className="flex gap-1 mt-6 p-1 bg-slate-100 rounded-xl w-fit">
          {[
            { k: 'users', label: 'Users',  icon: Users  },
            { k: 'roles', label: 'Roles',  icon: Shield },
          ].map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${
                tab === k ? 'bg-white text-slate-900 shadow' : 'text-slate-500'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'users' ? <UsersTab canManage={hasPermission('users.create','users.update')} />
                           : <RolesTab canManage={hasPermission('roles.create','roles.update')} />}
        </div>
      </div>
    </DashboardLayout>
  );
}

// ──────────────────────────────────────────────────────────────
function UsersTab({ canManage }: { canManage: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const load = async () => {
    const [u, r] = await Promise.all([userApi.list(), roleApi.list()]);
    setUsers(u.data); setRoles(r.data);
  };
  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    if (data.id) await userApi.update(data.id, data);
    else await userApi.create(data);
    setShowNew(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm('Deactivate this user?')) return;
    await userApi.delete(id); load();
  };

  return (
    <>
      {canManage && (
        <div className="mb-4">
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold">
            <Plus size={16} /> Add user
          </button>
        </div>
      )}

      {(showNew || editing) && (
        <UserForm
          initial={editing}
          roles={roles}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSave={save}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Roles</th>
              <th className="text-center p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-semibold">{u.name}</td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.map((ur: any) => (
                      <span key={ur.role.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {ur.role.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-center">{u.isActive ? '✅' : '—'}</td>
                <td className="p-3 flex gap-2 justify-end">
                  {canManage && (
                    <>
                      <button onClick={() => setEditing(u)} className="text-slate-500 text-xs font-bold">Edit</button>
                      <button onClick={() => del(u.id)} className="text-red-500"><Trash2 size={14} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UserForm({ initial, roles, onClose, onSave }: any) {
  const [f, setF] = useState<any>(initial || {
    name: '', email: '', password: '', roleIds: [], isActive: true,
  });
  // Normalise initial roles into an array of IDs
  useEffect(() => {
    if (initial?.roles) {
      setF((p: any) => ({ ...p, roleIds: initial.roles.map((ur: any) => ur.role.id) }));
    }
  }, [initial]);

  const toggleRole = (id: string) => {
    setF((p: any) => ({
      ...p,
      roleIds: p.roleIds.includes(id) ? p.roleIds.filter((r: string) => r !== id) : [...p.roleIds, id],
    }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{initial ? 'Edit user' : 'Add user'}</h3>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Input label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} disabled={!!initial} />
        {!initial && (
          <Input label="Temporary password" type="password" value={f.password} onChange={(v) => setF({ ...f, password: v })} className="col-span-2" />
        )}
        {initial && (
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
            Active
          </label>
        )}
      </div>
      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Roles</div>
        <div className="flex flex-wrap gap-2">
          {roles.map((r: any) => (
            <button
              key={r.id}
              type="button"
              onClick={() => toggleRole(r.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                f.roleIds.includes(r.id) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-slate-600">Cancel</button>
        <button onClick={() => onSave(f)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold inline-flex items-center gap-2">
          <Save size={14} /> Save
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function RolesTab({ canManage }: { canManage: boolean }) {
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    const [r, p] = await Promise.all([roleApi.list(), userApi.permissionCatalog()]);
    setRoles(r.data); setPerms(p.data);
  };
  useEffect(() => { load(); }, []);

  const save = async (data: any) => {
    if (data.id) await roleApi.update(data.id, data);
    else await roleApi.create(data);
    setEditing(null); setShowNew(false); load();
  };
  const del = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    await roleApi.delete(id); load();
  };

  // Group perms by module for the form
  const permsByModule: Record<string, any[]> = {};
  for (const p of perms) {
    (permsByModule[p.module] ||= []).push(p);
  }

  return (
    <>
      {canManage && (
        <div className="mb-4">
          <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold">
            <Plus size={16} /> New role
          </button>
        </div>
      )}

      {(showNew || editing) && (
        <RoleForm
          initial={editing}
          permsByModule={permsByModule}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={save}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {roles.map((r) => (
          <div key={r.id} className="p-4 bg-white border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold">{r.name}</div>
                <div className="text-xs text-slate-500 font-mono">{r.code} {r.isSystem && '· system'}</div>
              </div>
              <div className="text-xs text-slate-500">{r._count?.users || 0} users</div>
            </div>
            <div className="text-xs text-slate-500 mt-2">{r.permissions?.length || 0} permissions</div>
            {canManage && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditing(r)} className="text-xs font-bold text-slate-700">Edit</button>
                {!r.isSystem && (
                  <button onClick={() => del(r.id)} className="text-xs font-bold text-red-500">Delete</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function RoleForm({ initial, permsByModule, onClose, onSave }: any) {
  const [f, setF] = useState<any>(initial || {
    code: '', name: '', description: '', permissionCodes: [],
  });
  useEffect(() => {
    if (initial?.permissions) {
      setF((p: any) => ({
        ...p,
        permissionCodes: initial.permissions.map((rp: any) => rp.permission.code),
      }));
    }
  }, [initial]);

  const toggle = (code: string) => {
    setF((p: any) => ({
      ...p,
      permissionCodes: p.permissionCodes.includes(code)
        ? p.permissionCodes.filter((c: string) => c !== code)
        : [...p.permissionCodes, code],
    }));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{initial ? 'Edit role' : 'New role'}</h3>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Code" value={f.code} onChange={(v) => setF({ ...f, code: v.toUpperCase() })} disabled={!!initial?.isSystem} />
        <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Input label="Description" value={f.description || ''} onChange={(v) => setF({ ...f, description: v })} className="col-span-2" />
      </div>

      <div className="mt-6">
        <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Permissions</div>
        <div className="space-y-3 max-h-96 overflow-auto pr-2">
          {Object.entries(permsByModule).map(([mod, list]: any) => (
            <div key={mod}>
              <div className="text-xs font-bold text-slate-700 uppercase mb-1">{mod}</div>
              <div className="flex flex-wrap gap-2">
                {list.map((p: any) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => toggle(p.code)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${
                      f.permissionCodes.includes(p.code) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.code}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-slate-600">Cancel</button>
        <button onClick={() => onSave(f)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-semibold inline-flex items-center gap-2">
          <Save size={14} /> Save
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, className = '', disabled = false, type = 'text' }: any) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
}
