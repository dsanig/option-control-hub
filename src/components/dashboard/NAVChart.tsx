import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { NAVRecord } from '@/types/investment';
import { formatCurrency, formatDateShort } from '@/lib/formatters';

interface NAVChartProps {
  data: NAVRecord[];
}

export function NAVChart({ data }: NAVChartProps) {
  const chartData = data.map(d => ({
    date: formatDateShort(d.date),
    nav: d.total,
    cash: d.cash,
    securities: d.securities,
    options: d.options,
  }));

  return (
    <div className="chart-container h-[300px]">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">NAV History</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(190, 85%, 50%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(190, 85%, 50%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" />
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
            axisLine={{ stroke: 'hsl(220, 15%, 18%)' }}
            tickLine={false}
            tickFormatter={(value) => formatCurrency(value, true)}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(220, 18%, 10%)',
              border: '1px solid hsl(220, 15%, 18%)',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'hsl(210, 20%, 92%)' }}
            formatter={(value: number) => [formatCurrency(value), 'NAV']}
          />
          <Area 
            type="monotone" 
            dataKey="nav" 
            stroke="hsl(190, 85%, 50%)" 
            strokeWidth={2}
            fill="url(#navGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
