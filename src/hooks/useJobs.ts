import { useState, useEffect, useCallback } from 'react';
import { fetchJobs, fetchMyJobs, saveJob, unsaveJob, fetchSavedJobs } from '../lib/queries';
import type { Job } from '../lib/supabase';

export function useJobs(filters: {
  query?: string;
  remoteOnly?: boolean;
  budgetMin?: number;
  budgetMax?: number;
} = {}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await fetchJobs(filters);
    if (error) setError(error.message);
    else setJobs((data as unknown as Job[]) || []);
    setLoading(false);
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  return { jobs, loading, error, refetch: load };
}

export function useMyJobs(userId: string | undefined) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchMyJobs(userId).then(({ data }) => {
      setJobs((data as unknown as Job[]) || []);
      setLoading(false);
    });
  }, [userId]);

  return { jobs, loading };
}

export function useSavedJobs(userId: string | undefined) {
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchSavedJobs(userId).then(({ data }) => {
      const ids = new Set((data || []).map((s: any) => s.job?.id).filter(Boolean));
      setSavedJobIds(ids);
      setLoading(false);
    });
  }, [userId]);

  const toggle = async (jobId: string) => {
    if (!userId) return;
    if (savedJobIds.has(jobId)) {
      setSavedJobIds(prev => { const s = new Set(prev); s.delete(jobId); return s; });
      await unsaveJob(userId, jobId);
    } else {
      setSavedJobIds(prev => new Set([...prev, jobId]));
      await saveJob(userId, jobId);
    }
  };

  return { savedJobIds, loading, toggle };
}
