import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { PerformanceRecord } from '@/types/investment';
import { formatDateShort, formatPercent } from '@/lib/formatters';

interface PerformanceChartProps {
  data: PerformanceRecord[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  // Sample every 7 days for cleaner display
  const sampledData = data.filter((_, i) => i % 7 === 0).map(d => ({
    date: formatDateShort(d.date),
    portfolio: d.cumulativeReturn * 100,
    benchmark: (d.benchmarkReturn || 0) * 100,
  }));

  return (
    <div className="chart-container h-[300px]">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Cumulative Return</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sampledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
            tickLine={false}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(220, 18%, 10%)',
              border: '1px solid hsl(220, 15%, 18%)',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`]}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
          />
          <Line 
            type="monotone" 
            dataKey="portfolio" 
            name="Portfolio"
            stroke="hsl(190, 85%, 50%)" 
            strokeWidth={2}
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="benchmark" 
            name="Benchmark"
            stroke="hsl(215, 15%, 55%)" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
