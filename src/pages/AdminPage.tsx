import { useState } from 'react';
import { Link } from '../components/Router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Avatar from '../components/ui/Avatar';
import {
  Users, Briefcase, Shield, TrendingUp, AlertCircle, CheckCircle,
  Clock, BarChart2, Settings, LogOut, ChevronRight, Eye, X,
  UserCheck, Flag, DollarSign, Activity
} from 'lucide-react';

type AdminTab = 'overview' | 'users' | 'jobs' | 'verifications' | 'analytics';

const MOCK_USERS = [
  { id: '1', name: 'Emma van der Berg', email: 'emma@example.com', type: 'client', plan: 'pro', verified: true, joined: '2024-03-15', status: 'active' },
  { id: '2', name: 'Marcus Klein', email: 'marcus@example.com', type: 'freelancer', plan: 'premium', verified: true, joined: '2024-02-28', status: 'active' },
  { id: '3', name: 'Sophie Laurent', email: 'sophie@example.com', type: 'freelancer', plan: 'pro', verified: false, joined: '2024-03-20', status: 'pending_verification' },
  { id: '4', name: 'Tom van Dijk', email: 'tom@example.com', type: 'freelancer', plan: 'free', verified: true, joined: '2024-01-10', status: 'active' },
  { id: '5', name: 'Jan de Vries', email: 'jan@example.com', type: 'business', plan: 'premium', verified: true, joined: '2024-02-05', status: 'active' },
];

const MOCK_VERIFICATIONS = [
  { id: '1', user: 'Sophie Laurent', type: 'identity', submitted: '2024-03-21', status: 'pending' },
  { id: '2', user: 'Rahim Khalid', type: 'identity', submitted: '2024-03-20', status: 'under_review' },
  { id: '3', user: 'BV Bouwbedrijf Noord', type: 'kvk', submitted: '2024-03-19', status: 'pending' },
  { id: '4', user: 'Lisa de Boer', type: 'identity', submitted: '2024-03-18', status: 'approved' },
];

const STATS_OVERVIEW = [
  { label: 'Total Users', value: '42,891', change: '+124 this week', icon: Users, color: 'text-blue-500' },
  { label: 'Active Jobs', value: '3,412', change: '+89 today', icon: Briefcase, color: 'text-green-500' },
  { label: 'Pending Reviews', value: '7', change: '3 urgent', icon: Shield, color: 'text-amber-500' },
  { label: 'Monthly Revenue', value: '€48,230', change: '+12.4% MoM', icon: DollarSign, color: 'text-emerald-500' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [verifications, setVerifications] = useState(MOCK_VERIFICATIONS);

  useDocumentTitle('Admin');

  const handleVerification = (id: string, action: 'approved' | 'rejected') => {
    setVerifications(prev => prev.map(v => v.id === id ? { ...v, status: action } : v));
  };

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: BarChart2 },
    { id: 'users' as AdminTab, label: 'Users', icon: Users },
    { id: 'jobs' as AdminTab, label: 'Jobs', icon: Briefcase },
    { id: 'verifications' as AdminTab, label: 'Verifications', icon: Shield },
    { id: 'analytics' as AdminTab, label: 'Analytics', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header />

      <div className="pt-16 flex">
        {/* Sidebar */}
        <div className="hidden lg:flex flex-col w-60 min-h-screen border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 pt-6 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="px-4 mb-6">
            <div className="flex items-center gap-2 px-3 py-2">
              <div className="w-7 h-7 bg-neutral-900 dark:bg-white rounded-lg flex items-center justify-center">
                <Shield size={14} className="text-white dark:text-neutral-900" />
              </div>
              <span className="text-sm font-bold text-neutral-900 dark:text-white">Admin Panel</span>
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="px-3 pb-6 mt-auto space-y-1">
            <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <Settings size={16} /> Settings
            </Link>
            <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <LogOut size={16} /> Exit Admin
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Mobile tabs */}
          <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium flex-shrink-0 transition-all ${
                  activeTab === tab.id ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <tab.icon size={13} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Overview</h1>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS_OVERVIEW.map(stat => (
                  <div key={stat.label} className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <stat.icon size={18} className={stat.color} />
                    </div>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mt-0.5">{stat.label}</p>
                    <p className="text-xs text-success-600 dark:text-success-400 mt-1">{stat.change}</p>
                  </div>
                ))}
              </div>

              {/* Pending verifications alert */}
              <div className="card p-5 border-l-4 border-l-amber-400">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">3 verifications pending review</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Review and approve identity and KVK verifications from new users.</p>
                  </div>
                  <button onClick={() => setActiveTab('verifications')} className="btn-secondary text-xs flex items-center gap-1">
                    Review <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Recent signups */}
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Recent Signups</h3>
                  <button onClick={() => setActiveTab('users')} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors flex items-center gap-1">
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <div className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                  {MOCK_USERS.slice(0, 4).map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-6 py-3.5">
                      <Avatar name={u.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{u.name}</p>
                        <p className="text-xs text-neutral-400">{u.email}</p>
                      </div>
                      <span className="badge bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs capitalize">{u.type}</span>
                      <span className={`badge text-xs ${u.verified ? 'badge-verified' : 'bg-warning-50 dark:bg-warning-700/20 text-warning-600 dark:text-warning-400'}`}>
                        {u.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Users</h1>
                <div className="flex items-center gap-2">
                  <input placeholder="Search users..." className="input-base py-2 text-xs w-48" />
                </div>
              </div>

              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">User</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Type</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Plan</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Status</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Joined</th>
                        <th className="px-5 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50">
                      {MOCK_USERS.map(u => (
                        <tr key={u.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.name} size="sm" />
                              <div>
                                <p className="text-sm font-medium text-neutral-900 dark:text-white">{u.name}</p>
                                <p className="text-xs text-neutral-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="badge bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 capitalize">{u.type}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`badge capitalize ${u.plan === 'premium' ? 'badge-premium' : u.plan === 'pro' ? 'badge-pro' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                              {u.plan}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`badge text-xs ${u.verified ? 'badge-verified' : 'bg-warning-50 dark:bg-warning-700/20 text-warning-600 dark:text-warning-400'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${u.verified ? 'bg-success-500' : 'bg-warning-500'}`} />
                              {u.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-neutral-500 dark:text-neutral-400">{u.joined}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              <button className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                                <Eye size={14} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-error-50 dark:hover:bg-error-500/10 text-neutral-400 hover:text-error-500 transition-colors">
                                <Flag size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Verifications */}
          {activeTab === 'verifications' && (
            <div className="space-y-5 animate-fade-in">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Verifications</h1>

              <div className="card overflow-hidden">
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                  {verifications.map(v => (
                    <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        v.status === 'approved' ? 'bg-success-50 dark:bg-success-700/20' : v.status === 'under_review' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'
                      }`}>
                        <UserCheck size={16} className={
                          v.status === 'approved' ? 'text-success-600 dark:text-success-400' : v.status === 'under_review' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                        } />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{v.user}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{v.type} verification · Submitted {v.submitted}</p>
                      </div>
                      <span className={`badge text-xs ${
                        v.status === 'approved' ? 'badge-verified' : v.status === 'under_review' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {v.status.replace('_', ' ')}
                      </span>
                      {v.status !== 'approved' && v.status !== 'rejected' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleVerification(v.id, 'approved')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-success-50 dark:bg-success-700/20 text-success-700 dark:text-success-400 rounded-lg hover:bg-success-100 dark:hover:bg-success-700/30 transition-colors"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button
                            onClick={() => handleVerification(v.id, 'rejected')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 rounded-lg hover:bg-error-100 dark:hover:bg-error-500/20 transition-colors"
                          >
                            <X size={12} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analytics placeholder */}
          {activeTab === 'analytics' && (
            <div className="space-y-5 animate-fade-in">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Analytics</h1>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'New Users (7d)', value: '+234', color: 'bg-blue-500' },
                  { label: 'New Jobs (7d)', value: '+89', color: 'bg-green-500' },
                  { label: 'Applications (7d)', value: '+1,204', color: 'bg-amber-500' },
                  { label: 'Revenue (7d)', value: '€4,823', color: 'bg-emerald-500' },
                ].map(s => (
                  <div key={s.label} className="card p-6">
                    <div className={`w-3 h-3 rounded-full ${s.color} mb-4`} />
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white">{s.value}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="card p-8 flex items-center justify-center h-64">
                <div className="text-center">
                  <BarChart2 size={40} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                  <p className="text-sm text-neutral-400">Detailed analytics charts would appear here</p>
                </div>
              </div>
            </div>
          )}

          {/* Jobs placeholder */}
          {activeTab === 'jobs' && (
            <div className="space-y-5 animate-fade-in">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Job Moderation</h1>
              <div className="card p-8 flex items-center justify-center h-64">
                <div className="text-center">
                  <Briefcase size={40} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">All posted jobs appear here for moderation</p>
                  <Link to="/jobs" className="btn-secondary mt-4 inline-flex">Browse Jobs</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
