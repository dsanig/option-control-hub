import { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar,
  Area
} from 'recharts';
import { mockVIXData, mockGreeksHistory, mockRiskMetrics, mockPutPositions, mockCallPositions, mockKPIData } from '@/data/mockData';
import { formatCurrency, formatNumber, formatDateShort, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, TrendingDown, Activity, Gauge } from 'lucide-react';

export function RiskTab() {
  const [spotMove, setSpotMove] = useState([0]);
  const [ivMove, setIvMove] = useState([0]);

  // Calculate current portfolio greeks
  const allOptions = [...mockPutPositions, ...mockCallPositions];
  const portfolioGreeks = {
    delta: allOptions.reduce((sum, p) => sum + (p.delta || 0) * Math.abs(p.quantity) * p.multiplier, 0),
    gamma: allOptions.reduce((sum, p) => sum + (p.gamma || 0) * Math.abs(p.quantity) * p.multiplier, 0),
    theta: allOptions.reduce((sum, p) => sum + (p.theta || 0), 0),
    vega: allOptions.reduce((sum, p) => sum + (p.vega || 0), 0),
  };

  // Stress test calculation
  const stressPL = () => {
    const spotChange = spotMove[0] / 100;
    const ivChange = ivMove[0] / 100;
    
    // Approximate P/L: Delta * spot_move + 0.5 * Gamma * spot_move^2 + Vega * iv_move
    const deltaPL = portfolioGreeks.delta * spotChange * mockKPIData.navTotal * 0.01; // Simplified
    const gammaPL = 0.5 * portfolioGreeks.gamma * Math.pow(spotChange * 100, 2);
    const vegaPL = portfolioGreeks.vega * ivChange * 100;
    
    return deltaPL + gammaPL + vegaPL;
  };

  // Prepare chart data
  const vixChartData = mockVIXData.map(d => ({
    date: formatDateShort(d.date),
    vix: d.vix,
    vega: d.portfolioVega / 1000, // Scale for display
  }));

  const greeksChartData = mockGreeksHistory.map(d => ({
    date: formatDateShort(d.date),
    delta: d.delta * -100, // Scale for display
    theta: d.theta / -1000, // Scale for display
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Risk Metrics Cards */}
      <div className="grid grid-cols-6 gap-4">
        <div className="kpi-card">
          <span className="kpi-label">Sharpe Ratio</span>
          <span className="kpi-value">{mockRiskMetrics.sharpeRatio.toFixed(2)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Sortino Ratio</span>
          <span className="kpi-value">{mockRiskMetrics.sortinoRatio.toFixed(2)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Max Drawdown</span>
          <span className="kpi-value text-loss">{formatPercent(mockRiskMetrics.maxDrawdown * 100)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Volatility (Ann.)</span>
          <span className="kpi-value">{(mockRiskMetrics.volatility * 100).toFixed(1)}%</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Beta</span>
          <span className="kpi-value">{mockRiskMetrics.beta.toFixed(2)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">VaR (95%)</span>
          <span className="kpi-value text-loss">{formatCurrency(mockRiskMetrics.var95, true)}</span>
        </div>
      </div>

      {/* Greeks Summary */}
      <div className="chart-container">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Portfolio Greeks</h3>
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Delta</span>
            </div>
            <span className="text-2xl font-mono font-semibold">
              {formatNumber(portfolioGreeks.delta, 0)}
            </span>
            <span className="text-xs text-muted-foreground">
              ${formatNumber(portfolioGreeks.delta * 100)} per 1% move
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-chart-3" />
              <span className="text-sm text-muted-foreground">Gamma</span>
            </div>
            <span className="text-2xl font-mono font-semibold">
              {formatNumber(portfolioGreeks.gamma, 0)}
            </span>
            <span className="text-xs text-muted-foreground">
              Delta change per $1
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-gain" />
              <span className="text-sm text-muted-foreground">Theta</span>
            </div>
            <span className={cn("text-2xl font-mono font-semibold", portfolioGreeks.theta > 0 ? "text-gain" : "text-loss")}>
              {formatCurrency(portfolioGreeks.theta)}
            </span>
            <span className="text-xs text-muted-foreground">
              Daily decay
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm text-muted-foreground">Vega</span>
            </div>
            <span className="text-2xl font-mono font-semibold">
              {formatCurrency(portfolioGreeks.vega)}
            </span>
            <span className="text-xs text-muted-foreground">
              Per 1% IV change
            </span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* VIX vs Portfolio Vega */}
        <div className="chart-container h-[300px]">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">VIX vs Portfolio Vega</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={vixChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220, 18%, 10%)',
                  border: '1px solid hsl(220, 15%, 18%)',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="vix" 
                name="VIX"
                stroke="hsl(38, 92%, 50%)" 
                strokeWidth={2}
                dot={false}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="vega" 
                name="Vega ($K)"
                stroke="hsl(190, 85%, 50%)"
                fill="hsl(190, 85%, 50%)"
                fillOpacity={0.2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Delta/Theta Time Series */}
        <div className="chart-container h-[300px]">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Delta & Theta (30 days)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={greeksChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(220, 18%, 10%)',
                  border: '1px solid hsl(220, 15%, 18%)',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="delta" 
                name="Delta (x100)"
                stroke="hsl(190, 85%, 50%)" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="theta" 
                name="Theta ($K/day)"
                stroke="hsl(145, 70%, 45%)" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stress Testing */}
      <div className="chart-container">
        <h3 className="text-sm font-medium text-muted-foreground mb-6">Stress Test Scenario</h3>
        <div className="grid grid-cols-3 gap-8">
          {/* Spot Move Slider */}
          <div className="space-y-4">
            <Label className="text-sm">Underlying Move</Label>
            <Slider
              value={spotMove}
              onValueChange={setSpotMove}
              min={-20}
              max={20}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">-20%</span>
              <span className={cn(
                "font-mono font-semibold",
                spotMove[0] > 0 ? "text-gain" : spotMove[0] < 0 ? "text-loss" : ""
              )}>
                {spotMove[0] > 0 ? '+' : ''}{spotMove[0]}%
              </span>
              <span className="text-muted-foreground">+20%</span>
            </div>
          </div>

          {/* IV Move Slider */}
          <div className="space-y-4">
            <Label className="text-sm">IV Change</Label>
            <Slider
              value={ivMove}
              onValueChange={setIvMove}
              min={-30}
              max={50}
              step={5}
              className="py-4"
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">-30%</span>
              <span className={cn(
                "font-mono font-semibold",
                ivMove[0] > 0 ? "text-warning" : ivMove[0] < 0 ? "text-gain" : ""
              )}>
                {ivMove[0] > 0 ? '+' : ''}{ivMove[0]}%
              </span>
              <span className="text-muted-foreground">+50%</span>
            </div>
          </div>

          {/* Result */}
          <div className="bg-surface-2 rounded-lg p-6 flex flex-col items-center justify-center">
            <span className="text-sm text-muted-foreground mb-2">Estimated P/L Impact</span>
            <span className={cn(
              "text-3xl font-mono font-bold",
              stressPL() > 0 ? "text-gain" : stressPL() < 0 ? "text-loss" : ""
            )}>
              {stressPL() > 0 ? '+' : ''}{formatCurrency(stressPL(), true)}
            </span>
            <span className="text-xs text-muted-foreground mt-2">
              {((stressPL() / mockKPIData.navTotal) * 100).toFixed(2)}% of NAV
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
