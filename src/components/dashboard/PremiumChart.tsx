import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface PremiumChartProps {
  data: Array<{
    month: string;
    premium: number;
    capitalAtRisk: number;
  }>;
}

export function PremiumChart({ data }: PremiumChartProps) {
  return (
    <div className="chart-container h-[300px]">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Monthly Premium Collected</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 18%)" vertical={false} />
          <XAxis 
            dataKey="month" 
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
            formatter={(value: number, name: string) => [
              formatCurrency(value), 
              name === 'premium' ? 'Premium' : 'Capital at Risk'
            ]}
          />
          <Bar 
            dataKey="premium" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === data.length - 1 ? 'hsl(190, 85%, 50%)' : 'hsl(190, 60%, 40%)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
