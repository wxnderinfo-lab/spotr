import { useState, useEffect } from 'react';
import { useLocation, Link } from '../components/Router';
import { useAuth } from '../contexts/AuthContext';
import { fetchJobById, applyToJob, fetchJobApplications } from '../lib/queries';
import { useSavedJobs } from '../hooks/useJobs';
import { useStartConversation } from '../hooks/useMessages';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Avatar from '../components/ui/Avatar';
import { SkeletonCard } from '../components/ui/Shared';
import type { Job } from '../lib/supabase';
import {
  ArrowLeft, MapPin, Clock, DollarSign, Briefcase, Globe, Calendar,
  Bookmark, BookmarkCheck, MessageSquare, Send, CheckCircle, AlertCircle,
  Loader, Users, ChevronRight, Flag, Share2, X
} from 'lucide-react';

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function formatBudget(job: Job) {
  if (!job.budget_min && !job.budget_max) return 'Open budget';
  if (job.budget_type === 'hourly') return `€${job.budget_min}–€${job.budget_max}/hr`;
  if (job.budget_min && job.budget_max) return `€${job.budget_min.toLocaleString()}–€${job.budget_max.toLocaleString()}`;
  return `€${(job.budget_min || job.budget_max || 0).toLocaleString()}`;
}

interface ApplyModalProps {
  jobId: string;
  freelancerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ApplyModal({ jobId, freelancerId, onClose, onSuccess }: ApplyModalProps) {
  const [proposal, setProposal] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = async () => {
    if (!proposal.trim() || proposal.length < 50) {
      setError('Please write a proposal of at least 50 characters');
      return;
    }
    setLoading(true);
    const { error } = await applyToJob({
      job_id: jobId,
      freelancer_id: freelancerId,
      proposal: proposal.trim(),
      bid_amount: bidAmount ? parseFloat(bidAmount) : undefined,
      delivery_days: deliveryDays ? parseInt(deliveryDays) : undefined,
    });
    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setError('You have already applied to this job.');
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg shadow-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">Submit Proposal</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm border border-red-200 dark:border-red-500/20">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Your Proposal *</label>
            <textarea
              value={proposal}
              onChange={e => setProposal(e.target.value)}
              placeholder="Introduce yourself, explain your relevant experience, and describe how you'll approach this project…"
              rows={6}
              className="input-base resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-neutral-400 mt-1">{proposal.length}/2000 chars — min. 50</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Your Bid (€)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">€</span>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  min="1"
                  className="input-base pl-8"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Delivery (days)</label>
              <input
                type="number"
                value={deliveryDays}
                onChange={e => setDeliveryDays(e.target.value)}
                placeholder="e.g. 14"
                min="1"
                className="input-base"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleApply} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? <><Loader size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Submit Proposal</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage({ jobId }: { jobId: string }) {
  const { navigate } = useLocation();
  const { user, profile } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [applied, setApplied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { savedJobIds, toggle: toggleSave } = useSavedJobs(user?.id);
  const { start: startConversation, loading: startingConv } = useStartConversation();

  useDocumentTitle(job?.title);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: job?.title, text: job?.description?.slice(0, 100), url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };

  useEffect(() => {
    fetchJobById(jobId).then(({ data, error }) => {
      if (data) setJob(data);
      setLoading(false);
    });
  }, [jobId]);

  const handleMessage = async () => {
    if (!user || !job?.client_id) { navigate('/auth/login'); return; }
    const convId = await startConversation(user.id, job.client_id);
    if (convId) navigate('/messages');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950">
        <Header />
        <div className="pt-16 max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
        <Header />
        <div className="text-center pt-16">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Job not found</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">This job may have been removed or is no longer available.</p>
          <button onClick={() => navigate('/jobs')} className="btn-primary">Browse Jobs</button>
        </div>
      </div>
    );
  }

  const client = job.client;
  const category = job.category;
  const isSaved = savedJobIds.has(job.id);
  const isOwner = user?.id === job.client_id;
  const canApply = user && profile?.user_type !== 'client' && !isOwner;

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <Header />

      {showApply && user && (
        <ApplyModal
          jobId={job.id}
          freelancerId={user.id}
          onClose={() => setShowApply(false)}
          onSuccess={() => { setShowApply(false); setApplied(true); }}
        />
      )}

      <div className="pt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Back */}
          <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 mb-8 transition-colors">
            <ArrowLeft size={15} /> Back to Jobs
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header card */}
              <div className="card p-7">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex-1">
                    {category && (
                      <span className="inline-block px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-medium rounded-full mb-3">
                        {category.name}
                      </span>
                    )}
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-white leading-snug mb-3">{job.title}</h1>
                    <div className="flex flex-wrap gap-4 text-sm text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} /> {formatTimeAgo(job.created_at)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={13} /> {job.application_count} applicants
                      </span>
                      {job.deadline && (
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} /> Deadline: {new Date(job.deadline).toLocaleDateString('en-NL', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleSave(job.id)}
                      className={`p-2.5 rounded-xl border transition-all ${isSaved ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900' : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'}`}
                    >
                      {isSaved ? <BookmarkCheck size={16} className="text-neutral-900 dark:text-white" /> : <Bookmark size={16} className="text-neutral-500" />}
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 text-neutral-500 transition-all relative"
                      title={shareCopied ? 'Link copied!' : 'Share'}
                    >
                      <Share2 size={16} />
                      {shareCopied && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                          Copied!
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Budget + location chips */}
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-full">
                    <DollarSign size={14} className="text-green-600 dark:text-green-400" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">{formatBudget(job)}</span>
                    <span className="text-xs text-green-600/70 dark:text-green-400/70">{job.budget_type}</span>
                  </div>
                  {job.location && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-neutral-800 rounded-full">
                      <MapPin size={13} className="text-neutral-500" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">{job.location}</span>
                    </div>
                  )}
                  {job.remote_ok && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                      <Globe size={13} className="text-blue-500" />
                      <span className="text-sm text-blue-700 dark:text-blue-400">Remote OK</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="card p-7">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4">Project Description</h2>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
                  {job.description}
                </div>
              </div>

              {/* Skills */}
              {job.skills_required?.length > 0 && (
                <div className="card p-7">
                  <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4">Required Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skills_required.map((s: string) => (
                      <span key={s} className="px-3 py-1.5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Applied success */}
              {applied && (
                <div className="card p-5 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-800/40 flex items-center justify-center">
                      <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">Proposal submitted!</p>
                      <p className="text-xs text-green-700 dark:text-green-400/80 mt-0.5">The client will be notified. You'll hear back if they're interested.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Apply card */}
              <div className="card p-6 sticky top-24">
                {!user ? (
                  <div className="text-center">
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">Sign in to apply for this job</p>
                    <Link to="/auth/register" className="btn-primary w-full block text-center">Create Account</Link>
                    <Link to="/auth/login" className="btn-ghost w-full block text-center mt-2">Sign In</Link>
                  </div>
                ) : isOwner ? (
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">Your job post</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Applications</span>
                        <span className="font-semibold text-neutral-900 dark:text-white">{job.application_count}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">Status</span>
                        <span className="badge bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs capitalize">{job.status}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="btn-secondary w-full mt-4">Manage Applications</button>
                  </div>
                ) : applied ? (
                  <div className="text-center py-2">
                    <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">Proposal sent!</p>
                    <p className="text-xs text-neutral-400 mt-1">Waiting for client response</p>
                  </div>
                ) : canApply ? (
                  <>
                    <button onClick={() => setShowApply(true)} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5">
                      <Send size={16} /> Apply Now
                    </button>
                    <button onClick={handleMessage} disabled={startingConv} className="btn-secondary w-full flex items-center justify-center gap-2 mt-2.5 py-3">
                      {startingConv ? <Loader size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                      Ask a Question
                    </button>
                  </>
                ) : profile?.user_type === 'client' ? (
                  <p className="text-xs text-neutral-400 text-center">Switch to a freelancer account to apply for jobs.</p>
                ) : null}
              </div>

              {/* Client card */}
              {client && (
                <div className="card p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-4">Posted by</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={client.full_name} src={client.avatar_url} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{client.full_name}</p>
                      {client.location && <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{client.location}</p>}
                    </div>
                  </div>
                  {client.is_verified && (
                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-xl mb-3">
                      <CheckCircle size={13} /> Verified client
                    </div>
                  )}
                  {client.bio && <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{client.bio}</p>}
                </div>
              )}

              {/* Report */}
              <button className="flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors mx-auto">
                <Flag size={12} /> Report this job
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
