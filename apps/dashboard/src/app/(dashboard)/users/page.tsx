'use client';

import { useEffect, useState } from 'react';

type Role = 'super_admin' | 'admin' | 'operator' | 'viewer';

interface User {
  id: number;
  username: string;
  role: Role;
  createdAt: string | null;
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  operator:    'Operator',
  viewer:      'Viewer',
};

const ROLE_COLOURS: Record<Role, string> = {
  super_admin: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  admin:       'bg-blue-500/15 text-blue-400 border-blue-500/20',
  operator:    'bg-green-500/15 text-green-400 border-green-500/20',
  viewer:      'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

const ROLE_INFO: { role: Role; colour: string; description: string; permissions: string[] }[] = [
  {
    role: 'super_admin',
    colour: 'text-purple-400',
    description: 'Full unrestricted access.',
    permissions: [
      'Create, edit and delete any user (including other super admins)',
      'Manage all zones, screens, playlists and assets',
      'Activate emergency overrides',
      'Change global settings and app name',
    ],
  },
  {
    role: 'admin',
    colour: 'text-blue-400',
    description: 'Day-to-day management without destructive user controls.',
    permissions: [
      'Create and edit operator and viewer accounts',
      'Manage all zones, screens, playlists and assets',
      'Activate emergency overrides',
      'Cannot create super admin accounts or delete users',
    ],
  },
  {
    role: 'operator',
    colour: 'text-green-400',
    description: 'Content management only.',
    permissions: [
      'Upload and manage assets',
      'Create and edit playlists and slides',
      'Cannot manage users, zones or screens',
      'Cannot activate emergency overrides',
    ],
  },
  {
    role: 'viewer',
    colour: 'text-gray-400',
    description: 'Read-only access to the dashboard.',
    permissions: [
      'View screens, zones, playlists and assets',
      'Cannot create, edit or delete anything',
      'Cannot manage users or activate overrides',
    ],
  },
];

function RolesHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-100">Role permissions</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          {ROLE_INFO.map(({ role, colour, description, permissions }) => (
            <div key={role} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-sm font-semibold ${colour}`}>{ROLE_LABELS[role]}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{description}</p>
              <ul className="space-y-1">
                {permissions.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                    <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [showHelp, setShowHelp]     = useState(false);
  const [editUser, setEditUser]     = useState<User | null>(null);

  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole]         = useState<Role>('viewer');
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState('');

  // Edit form
  const [editRole, setEditRole]       = useState<Role>('viewer');
  const [editPassword, setEditPassword] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) { setError('Failed to load users'); return; }
      setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'Failed to create user'); return; }
      setShowAdd(false);
      setNewUsername(''); setNewPassword(''); setNewRole('viewer');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    setFormError('');
    try {
      const body: Record<string, string> = { role: editRole };
      if (editPassword.trim()) body.password = editPassword.trim();
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'Failed to update user'); return; }
      setEditUser(null);
      setEditPassword('');
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Users</h1>
          <p className="text-sm text-gray-400">Manage who has access to the DisplayGrid dashboard.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(true)}
            title="Role permissions"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-colors text-sm font-semibold"
          >
            ?
          </button>
          <button
            onClick={() => { setShowAdd(true); setFormError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New User
          </button>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([r, label]) => (
          <span key={r} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ROLE_COLOURS[r]}`}>{label}</span>
        ))}
      </div>

      {loading && <p className="text-gray-500 text-sm">Loading users…</p>}
      {error   && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Username</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Created</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4 text-gray-200 font-medium">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ROLE_COLOURS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditUser(u); setEditRole(u.role); setEditPassword(''); setFormError(''); }}
                        className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                        title="Edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-colors"
                        title="Delete"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-600">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Role help modal */}
      {showHelp && <RolesHelpModal onClose={() => setShowHelp(false)} />}

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-5">New User</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
                <input
                  value={newUsername} onChange={e => setNewUsername(e.target.value)}
                  placeholder="e.g. jane.doe"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
                <select
                  value={newRole} onChange={e => setNewRole(e.target.value as Role)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-100 mb-1">Edit User</h2>
            <p className="text-sm text-gray-500 mb-5">{editUser.username}</p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
                <select
                  value={editRole} onChange={e => setEditRole(e.target.value as Role)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password <span className="text-gray-600">(leave blank to keep current)</span></label>
                <input
                  type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              {formError && <p className="text-red-400 text-sm">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditUser(null)}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
