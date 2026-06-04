import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Link } from '../components/Router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Avatar from '../components/ui/Avatar';
import { supabase } from '../lib/supabase';
import {
  User, Bell, Shield, CreditCard, Moon, Sun, Upload, AlertCircle,
  CheckCircle, LogOut, Camera, Globe, MapPin, Lock, X
} from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'security' | 'billing' | 'verify';

interface NotifPrefs {
  messages: boolean;
  applications: boolean;
  reviews: boolean;
  recommendations: boolean;
  marketing: boolean;
}

export default function SettingsPage({ initialTab }: { initialTab?: Tab }) {
  const { profile, updateProfile, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || 'profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useDocumentTitle('Settings');

  // Profile fields
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Security fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    messages: true,
    applications: true,
    reviews: true,
    recommendations: false,
    marketing: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // Verification
  const [kvkNumber, setKvkNumber] = useState('');
  const [kvkSaving, setKvkSaving] = useState(false);
  const [kvkSaved, setKvkSaved] = useState(false);
  const [kvkError, setKvkError] = useState('');
  const [verifySaving, setVerifySaving] = useState(false);
  const [verifySubmitted, setVerifySubmitted] = useState(false);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  const [idUploadError, setIdUploadError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);
    await updateProfile({ full_name: fullName, bio, location, website, phone });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (!newPassword || newPassword.length < 8) {
      setPwError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      setPwError(error.message);
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    await signOut();
  };

  const handleVerifyKvk = async () => {
    if (!kvkNumber || kvkNumber.length !== 8) {
      setKvkError('KVK number must be exactly 8 digits');
      return;
    }
    setKvkError('');
    setKvkSaving(true);
    await updateProfile({ kvk_number: kvkNumber } as any);
    setKvkSaving(false);
    setKvkSaved(true);
    setTimeout(() => setKvkSaved(false), 3000);
  };

  const handleIdUpload = async (file: File) => {
    setIdUploadError('');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setIdUploadError('Please upload an image (JPG, PNG, WebP) or PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setIdUploadError('File must be under 10 MB.');
      return;
    }
    const ext = file.name.split('.').pop();
    const path = `verifications/${profile?.id}-id.${ext}`;
    const { error: upError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upError) { setIdUploadError(upError.message); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setIdDocumentUrl(data.publicUrl);
  };

  const handleSubmitVerification = async () => {
    setVerifySaving(true);
    const { error } = await supabase.from('verifications').insert({
      user_id: profile?.id,
      verification_type: 'identity',
      status: 'pending',
      document_urls: idDocumentUrl ? [idDocumentUrl] : [],
    });
    setVerifySaving(false);
    if (!error) setVerifySubmitted(true);
  };

  const toggleNotif = (key: keyof NotifPrefs) => {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    setNotifSaved(false);
  };

  const saveNotifPrefs = async () => {
    await updateProfile({ notification_preferences: notifPrefs } as any);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'security' as Tab, label: 'Security', icon: Lock },
    { id: 'billing' as Tab, label: 'Billing', icon: CreditCard },
    { id: 'verify' as Tab, label: 'Verification', icon: Shield },
  ];

  const notifItems: { key: keyof NotifPrefs; label: string; desc: string }[] = [
    { key: 'messages', label: 'New messages', desc: 'When someone sends you a message' },
    { key: 'applications', label: 'Job applications', desc: 'When someone applies to your job' },
    { key: 'reviews', label: 'New reviews', desc: 'When you receive a new review' },
    { key: 'recommendations', label: 'Job recommendations', desc: 'Personalized job suggestions' },
    { key: 'marketing', label: 'Marketing emails', desc: 'News, tips and product updates' },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header />

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md shadow-2xl animate-scale-in p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">Delete Account</h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              This will permanently delete your account, profile, and all associated data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-8">Settings</h1>

          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="hidden md:block w-52 flex-shrink-0">
              <div className="card p-2 space-y-0.5">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-700'
                    }`}
                  >
                    <tab.icon size={15} />
                    {tab.label}
                  </button>
                ))}
                <hr className="my-2 border-neutral-100 dark:border-neutral-800" />
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>

            {/* Mobile tabs */}
            <div className="md:hidden w-full mb-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium flex-shrink-0 transition-all ${
                      activeTab === tab.id ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <tab.icon size={12} /> {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="card p-6">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-5">Profile Information</h3>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        <Avatar name={profile?.full_name || ''} src={profile?.avatar_url} size="xl" />
                        <label className="absolute bottom-0 right-0 w-7 h-7 bg-neutral-900 dark:bg-white rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-950 cursor-pointer hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors">
                          <Camera size={13} className="text-white dark:text-neutral-900" />
                          <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !profile?.id) return;
                            const ext = file.name.split('.').pop();
                            const path = `avatars/${profile.id}.${ext}`;
                            const { error: upError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
                            if (!upError) {
                              const { data } = supabase.storage.from('avatars').getPublicUrl(path);
                              await updateProfile({ avatar_url: data.publicUrl });
                            }
                          }} />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">{profile?.full_name || 'Your Name'}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{profile?.email}</p>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Full Name</label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input-base" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Email</label>
                        <input type="email" value={profile?.email || ''} disabled className="input-base opacity-60 cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"><MapPin size={11} className="inline mr-1" />Location</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Amsterdam, Netherlands" className="input-base" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"><Globe size={11} className="inline mr-1" />Website</label>
                        <input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" className="input-base" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Bio</label>
                        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Tell others about yourself..." className="input-base resize-none" maxLength={500} />
                        <p className="text-xs text-neutral-400 mt-1">{bio.length}/500</p>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 mt-3 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle size={14} /> {error}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                      <button onClick={handleSave} disabled={saving} className="btn-primary">
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      {saved && (
                        <span className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400 animate-fade-in">
                          <CheckCircle size={14} /> Saved!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="card p-6">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">Appearance</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {dark ? <Moon size={16} className="text-neutral-500" /> : <Sun size={16} className="text-neutral-500" />}
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">Dark Mode</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">Use dark theme</p>
                        </div>
                      </div>
                      <button
                        onClick={toggle}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${dark ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200'}`}
                      >
                        <div className={`w-[18px] h-[18px] bg-white dark:bg-neutral-900 rounded-full absolute top-[3px] transition-transform duration-200 ${dark ? 'translate-x-[26px]' : 'translate-x-[3px]'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div className="card p-6 animate-fade-in">
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-5">Notification Preferences</h3>
                  <div className="space-y-5">
                    {notifItems.map(item => (
                      <div key={item.key} className="flex items-center justify-between py-3 border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.label}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => toggleNotif(item.key)}
                          className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${notifPrefs[item.key] ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                        >
                          <div className={`w-[18px] h-[18px] bg-white dark:bg-neutral-900 rounded-full absolute top-[3px] transition-transform duration-200 ${notifPrefs[item.key] ? 'translate-x-[26px]' : 'translate-x-[3px]'}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button onClick={saveNotifPrefs} className="btn-primary text-sm">Save Preferences</button>
                    {notifSaved && (
                      <span className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400 animate-fade-in">
                        <CheckCircle size={14} /> Saved!
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Security */}
              {activeTab === 'security' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="card p-6">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-5">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="input-base"
                          placeholder="Enter current password"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="input-base"
                          placeholder="Min. 8 characters"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="input-base"
                          placeholder="Repeat new password"
                        />
                      </div>
                      {pwError && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle size={14} /> {pwError}
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <button onClick={handlePasswordChange} disabled={pwSaving} className="btn-primary">
                          {pwSaving ? 'Updating...' : 'Update Password'}
                        </button>
                        {pwSaved && (
                          <span className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400 animate-fade-in">
                            <CheckCircle size={14} /> Password updated!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card p-6 border-l-4 border-l-error-500">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-1">Delete Account</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">This action is permanent and cannot be undone.</p>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 text-sm font-medium text-error-600 dark:text-error-400 border border-error-200 dark:border-error-500/30 rounded-xl hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                    >
                      Delete my account
                    </button>
                  </div>
                </div>
              )}

              {/* Billing */}
              {activeTab === 'billing' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="card p-6">
                    <h3 className="text-base font-semibold text-neutral-900 dark:text-white mb-4">Current Plan</h3>
                    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl mb-4">
                      <div>
                        <p className="font-bold text-neutral-900 dark:text-white capitalize">{profile?.subscription_tier || 'Free'} Plan</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {profile?.subscription_tier === 'free' ? 'Basic features included' : 'Renews on June 30, 2026'}
                        </p>
                      </div>
                      {profile?.subscription_tier === 'free' ? (
                        <Link to="/pricing" className="btn-primary text-xs">Upgrade</Link>
                      ) : (
                        <button className="btn-secondary text-xs">Manage</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Verification */}
              {activeTab === 'verify' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="card p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-success-50 dark:bg-success-700/20 flex items-center justify-center flex-shrink-0">
                        <Shield size={22} className="text-success-600 dark:text-success-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Identity Verification</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Verified profiles get 3x more responses. Upload a government-issued ID to get your verified badge.</p>
                      </div>
                    </div>

                    {profile?.is_verified ? (
                      <div className="flex items-center gap-2 text-success-600 dark:text-success-400">
                        <CheckCircle size={16} /> Your identity is verified
                      </div>
                    ) : verifySubmitted ? (
                      <div className="flex items-center gap-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-3 rounded-xl text-sm">
                        <CheckCircle size={15} /> Verification submitted! We'll review within 24 hours.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <label className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 text-center hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer flex flex-col items-center">
                          <Upload size={24} className={`mb-2 ${idDocumentUrl ? 'text-success-500' : 'text-neutral-400'}`} />
                          {idDocumentUrl ? (
                            <>
                              <p className="text-sm font-medium text-success-600 dark:text-success-400">Document uploaded</p>
                              <p className="text-xs text-neutral-400 mt-1">Click to replace</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Upload ID document</p>
                              <p className="text-xs text-neutral-400 mt-1">Passport, driver's license, or national ID (max 10 MB)</p>
                            </>
                          )}
                          <input type="file" accept="image/*,.pdf" className="sr-only" onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleIdUpload(file);
                          }} />
                        </label>
                        {idUploadError && (
                          <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} /> {idUploadError}
                          </p>
                        )}
                        <button
                          onClick={handleSubmitVerification}
                          disabled={verifySaving || !idDocumentUrl}
                          className="btn-primary w-full disabled:opacity-50"
                        >
                          {verifySaving ? 'Submitting…' : 'Submit for Verification'}
                        </button>
                      </div>
                    )}
                  </div>

                  {(profile?.user_type === 'business' || profile?.user_type === 'freelancer') && (
                    <div className="card p-6">
                      <div className="flex items-start gap-4 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                          <Shield size={22} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">KVK Business Verification</h3>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Verify your Dutch Chamber of Commerce registration to show clients your business is legitimate.</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">KVK Number</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={kvkNumber}
                            onChange={e => setKvkNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="12345678"
                            maxLength={8}
                            className="input-base flex-1"
                          />
                          <button
                            onClick={handleVerifyKvk}
                            disabled={kvkSaving || kvkNumber.length !== 8}
                            className="btn-primary whitespace-nowrap disabled:opacity-50"
                          >
                            {kvkSaving ? 'Saving…' : 'Verify KVK'}
                          </button>
                        </div>
                        {kvkError && (
                          <p className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-2">
                            <AlertCircle size={12} /> {kvkError}
                          </p>
                        )}
                        {kvkSaved && (
                          <p className="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400 mt-2">
                            <CheckCircle size={12} /> KVK number saved!
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
