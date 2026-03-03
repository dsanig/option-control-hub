import { useQuery } from '@tanstack/react-query';

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || '';
}

export interface PortfolioSummary {
  position_count: number;
  total_market_value: string;
  total_unrealized_pnl: string;
  avg_delta: string;
  last_updated_at: string | null;
}

export function usePortfolioSummary(accountId?: string) {
  return useQuery({
    queryKey: ['portfolio-summary', accountId],
    queryFn: async (): Promise<PortfolioSummary | null> => {
      const base = getApiBaseUrl();
      const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
      const response = await fetch(`${base}/api/portfolio/summary${query}`);
      if (!response.ok) {
        throw new Error('Failed to load portfolio summary');
      }
      const data = await response.json();
      return data.summary;
    },
    staleTime: 30_000,
  });
}
