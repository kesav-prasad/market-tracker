const API_BASE = 'http://localhost:3001/api';

export const fetchDashboardData = async (retries = 30, delayMs = 2000): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/dashboard`);
    if (!res.ok) throw new Error('Failed to fetch data');
    return await res.json();
  } catch (err) {
    if (retries > 0) {
      console.warn(`fetchDashboardData failed, retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return fetchDashboardData(retries - 1, delayMs);
    }
    throw err;
  }
};

export const triggerRefresh = async () => {
  const res = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh data');
  return res.json();
};

export const fetchReconciliationResults = async () => {
  const res = await fetch(`${API_BASE}/reconcile/results`);
  if (!res.ok) throw new Error('Failed to fetch reconciliation results');
  return res.json();
};

export const importReconciliationData = async (snapshots: any[]) => {
  const res = await fetch(`${API_BASE}/reconcile/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshots })
  });
  if (!res.ok) throw new Error('Failed to import reconciliation data');
  return res.json();
};
