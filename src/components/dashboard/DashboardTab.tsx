import { KPICard } from './KPICard';
import { NAVChart } from './NAVChart';
import { PremiumChart } from './PremiumChart';
import { AllocationChart } from './AllocationChart';
import { PerformanceChart } from './PerformanceChart';
import { PriorityWatchlist } from './PriorityWatchlist';
import { 
  mockKPIData, 
  mockNAVHistory, 
  mockMonthlyPremium, 
  mockSectorAllocation,
  mockPerformance,
  mockPutPositions,
  mockCallPositions
} from '@/data/mockData';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { 
  DollarSign, 
  Shield, 
  TrendingUp, 
  Activity,
  Target,
  Clock
} from 'lucide-react';

export function DashboardTab() {
  // Calculate breakdowns by expiry bucket
  const allOptions = [...mockPutPositions, ...mockCallPositions];
  const expiryBuckets = [
    { label: '0-7d', min: 0, max: 7 },
    { label: '8-30d', min: 8, max: 30 },
    { label: '31-60d', min: 31, max: 60 },
    { label: '60d+', min: 61, max: 999 },
  ];

  const bucketData = expiryBuckets.map(bucket => {
    const positions = allOptions.filter(p => p.dte >= bucket.min && p.dte <= bucket.max);
    const risk = positions.reduce((sum, p) => sum + p.capitalAtRisk, 0);
    return {
      label: bucket.label,
      count: positions.length,
      risk,
      percentage: (risk / mockKPIData.capitalAtRisk) * 100
    };
  });

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-6 gap-4">
        <KPICard
          label="NAV Total"
          value={formatCurrency(mockKPIData.navTotal, true)}
          change={mockKPIData.navChangePct}
          changeLabel="vs yesterday"
          trend="up"
          icon={<DollarSign className="w-4 h-4" />}
          size="large"
        />
        <KPICard
          label="Capital at Risk"
          value={formatCurrency(mockKPIData.capitalAtRisk, true)}
          changeLabel={`${mockKPIData.capitalAtRiskPct.toFixed(1)}% of NAV`}
          icon={<Shield className="w-4 h-4" />}
        />
        <KPICard
          label="Monthly Premium"
          value={formatCurrency(mockKPIData.monthlyPremium, true)}
          change={mockKPIData.monthlyPremiumROI}
          changeLabel="ROI on risk"
          trend="up"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPICard
          label="YTD Premium"
          value={formatCurrency(mockKPIData.ytdPremium, true)}
          icon={<Target className="w-4 h-4" />}
        />
        <KPICard
          label="Avg Delta"
          value={mockKPIData.avgDelta.toFixed(3)}
          icon={<Activity className="w-4 h-4" />}
        />
        <KPICard
          label="Data Freshness"
          value="Live"
          changeLabel={mockKPIData.dataFreshness.toLocaleTimeString()}
          icon={<Clock className="w-4 h-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        <NAVChart data={mockNAVHistory} />
        <PremiumChart data={mockMonthlyPremium} />
      </div>

      {/* Priority Watchlist - Full Width */}
      <PriorityWatchlist 
        putPositions={mockPutPositions} 
        callPositions={mockCallPositions} 
      />

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-6">
        <PerformanceChart data={mockPerformance} />
        
        <AllocationChart 
          data={mockSectorAllocation} 
          title="Sector Allocation" 
        />

        {/* Expiry Breakdown */}
        <div className="chart-container">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Risk by Expiry</h3>
          <div className="space-y-3">
            {bucketData.map((bucket) => (
              <div key={bucket.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{bucket.label}</span>
                  <span className="font-mono">{formatCurrency(bucket.risk, true)}</span>
                </div>
                <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(bucket.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{bucket.count} positions</span>
                  <span>{bucket.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
