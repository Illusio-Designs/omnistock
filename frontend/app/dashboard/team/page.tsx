'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { userApi, roleApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Plus, Trash2, Users, Shield, Save, Pencil } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Checkbox } from '@/components/ui/Checkbox';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { Tabs, useConfirm } from '@/components/ui';

export default function TeamPage() {
  const { hasPermission } = useAuthStore();
  const [tab, setTab] = useState<'users' | 'roles'>('users');

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#06D4B8] to-[#06B6D4] bg-clip-text text-transparent">Team</h1>
        <p className="text-slate-500 mt-1">Manage users and role-based access.</p>

        <div className="mt-6">
          <Tabs<'users' | 'roles'>
            value={tab}
            onChange={setTab}
            items={[
              { key: 'users', label: 'Users', icon: <Users size={14} /> },
              { key: 'roles', label: 'Roles', icon: <Shield size={14} /> },
            ]}
          />
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
  const [confirmUi, askConfirm] = useConfirm();

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
    const ok = await askConfirm({
      title: 'Deactivate this user?',
      description: 'The user will lose access immediately. You can re-activate them later.',
      confirmLabel: 'Deactivate',
      variant: 'danger',
    });
    if (!ok) return;
    await userApi.delete(id); load();
  };

  return (
    <>
      {confirmUi}
      {canManage && (
        <div className="mb-4">
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setShowNew(true)}>
            Add user
          </Button>
        </div>
      )}

      <Modal
        open={showNew || !!editing}
        onClose={() => { setShowNew(false); setEditing(null); }}
        title={editing ? 'Edit user' : 'Add user'}
        size="lg"
      >
        <UserForm
          initial={editing}
          roles={roles}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSave={save}
        />
      </Modal>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Roles</th>
              <th className="text-center p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, idx) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-500 font-semibold">{idx + 1}</td>
                <td className="p-3 font-semibold">
                  <div className="flex items-center gap-2">
                    {u.name}
                    {u.isPlatformAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider">
                        Platform Admin
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles?.length ? u.roles.map((ur: any) => (
                      <span key={ur.role.id} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {ur.role.name}
                      </span>
                    )) : u.isPlatformAdmin ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">All access</span>
                    ) : null}
                  </div>
                </td>
                <td className="p-3 text-center">{u.isActive ? '✅' : '—'}</td>
                <td className="p-3 flex gap-2 justify-end">
                  {canManage && !u.isPlatformAdmin && (
                    <>
                      <Tooltip content="Edit user">
                        <Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
                          <Pencil size={14} />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Deactivate user">
                        <Button variant="danger" size="icon" onClick={() => del(u.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </Tooltip>
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

function UserForm({ initial, roles, onClose, onSave }: {
  initial: any;
  roles: any[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
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
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Name" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input label="Email" value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} disabled={!!initial} />
        {!initial && (
          <div className="col-span-2">
            <PasswordInput label="Temporary password" value={f.password ?? ''} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </div>
        )}
        {initial && (
          <div className="col-span-2">
            <Checkbox
              checked={!!f.isActive}
              onCheckedChange={(c) => setF({ ...f, isActive: c })}
              label="Active"
            />
          </div>
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
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" leftIcon={<Save size={14} />} onClick={() => onSave(f)}>Save</Button>
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
  const [confirmUi, askConfirm] = useConfirm();

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
    const ok = await askConfirm({
      title: 'Delete this role?',
      description: 'Users assigned to this role will lose its permissions. This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    await roleApi.delete(id); load();
  };

  // Group perms by module for the form
  const permsByModule: Record<string, any[]> = {};
  for (const p of perms) {
    (permsByModule[p.module] ||= []).push(p);
  }

  return (
    <>
      {confirmUi}
      {canManage && (
        <div className="mb-4">
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setShowNew(true)}>
            New role
          </Button>
        </div>
      )}

      <Modal
        open={showNew || !!editing}
        onClose={() => { setEditing(null); setShowNew(false); }}
        title={editing ? 'Edit role' : 'New role'}
        size="xl"
      >
        <RoleForm
          initial={editing}
          permsByModule={permsByModule}
          onClose={() => { setEditing(null); setShowNew(false); }}
          onSave={save}
        />
      </Modal>

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
                <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>Edit</Button>
                {!r.isSystem && (
                  <Button variant="danger" size="sm" onClick={() => del(r.id)}>Delete</Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function RoleForm({ initial, permsByModule, onClose, onSave }: {
  initial: any;
  permsByModule: Record<string, any[]>;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
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
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Code" value={f.code ?? ''} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} disabled={!!initial?.isSystem} />
        <Input label="Name" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <div className="col-span-2">
          <Input label="Description" value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
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
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" leftIcon={<Save size={14} />} onClick={() => onSave(f)}>Save</Button>
      </div>
    </div>
  );
}
