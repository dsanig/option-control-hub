import { useMemo } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { mockStockPositions, mockSectorAllocation, mockKPIData } from '@/data/mockData';
import { formatCurrency, formatPercent, getValueClass } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

const SECTOR_COLORS = [
  'hsl(190, 85%, 50%)',
  'hsl(145, 70%, 45%)',
  'hsl(280, 70%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 55%)',
];

export function StocksTab() {
  const totals = useMemo(() => ({
    marketValue: mockStockPositions.reduce((sum, s) => sum + s.marketValue, 0),
    costBasis: mockStockPositions.reduce((sum, s) => sum + s.costBasis, 0),
    unrealizedPL: mockStockPositions.reduce((sum, s) => sum + s.unrealizedPL, 0),
  }), []);

  const topHoldings = useMemo(() => 
    [...mockStockPositions]
      .sort((a, b) => b.marketValue - a.marketValue)
      .slice(0, 5),
    []
  );

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="kpi-card">
          <span className="kpi-label">Total Stock Value</span>
          <span className="kpi-value">{formatCurrency(totals.marketValue, true)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Cost Basis</span>
          <span className="kpi-value">{formatCurrency(totals.costBasis, true)}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Unrealized P/L</span>
          <span className={cn("kpi-value", getValueClass(totals.unrealizedPL))}>
            {formatCurrency(totals.unrealizedPL, true)}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">% of NAV</span>
          <span className="kpi-value">
            {((totals.marketValue / mockKPIData.navTotal) * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sector Allocation */}
        <div className="chart-container">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Sector Allocation</h3>
          <div className="flex items-center gap-6">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockSectorAllocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="percentage"
                    nameKey="sector"
                  >
                    {mockSectorAllocation.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(220, 18%, 10%)',
                      border: '1px solid hsl(220, 15%, 18%)',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 space-y-2">
              {mockSectorAllocation.map((item, index) => (
                <div key={item.sector} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: SECTOR_COLORS[index % SECTOR_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{item.sector}</span>
                  </div>
                  <div className="flex items-center gap-4 font-mono">
                    <span>{formatCurrency(item.value, true)}</span>
                    <span className="text-muted-foreground w-12 text-right">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Holdings */}
        <div className="chart-container">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Top Holdings</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topHoldings} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" horizontal={false} />
                <XAxis 
                  type="number"
                  tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
                  tickFormatter={(value) => formatCurrency(value, true)}
                />
                <YAxis 
                  type="category"
                  dataKey="symbol"
                  tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(220, 18%, 10%)',
                    border: '1px solid hsl(220, 15%, 18%)',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                />
                <Bar dataKey="marketValue" fill="hsl(190, 85%, 50%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="chart-container !p-0">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-medium text-muted-foreground">Stock Positions</h3>
        </div>
        <div className="overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Description</th>
                <th>Sector</th>
                <th>Quantity</th>
                <th>Market Value</th>
                <th>Cost Basis</th>
                <th>Unrealized P/L</th>
                <th>P/L %</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {mockStockPositions.map((pos) => {
                const plPct = ((pos.marketValue - pos.costBasis) / pos.costBasis) * 100;
                return (
                  <tr key={pos.id}>
                    <td className="font-medium">{pos.symbol}</td>
                    <td className="text-muted-foreground">{pos.description}</td>
                    <td>
                      <Badge variant="outline" className="text-xs">
                        {pos.sector}
                      </Badge>
                    </td>
                    <td>{pos.quantity.toLocaleString()}</td>
                    <td>{formatCurrency(pos.marketValue)}</td>
                    <td>{formatCurrency(pos.costBasis)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {pos.unrealizedPL > 0 ? (
                          <TrendingUp className="w-3 h-3 text-gain" />
                        ) : pos.unrealizedPL < 0 ? (
                          <TrendingDown className="w-3 h-3 text-loss" />
                        ) : null}
                        <span className={getValueClass(pos.unrealizedPL)}>
                          {formatCurrency(pos.unrealizedPL)}
                        </span>
                      </div>
                    </td>
                    <td className={getValueClass(plPct)}>
                      {formatPercent(plPct)}
                    </td>
                    <td>{pos.weightInPortfolio.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
