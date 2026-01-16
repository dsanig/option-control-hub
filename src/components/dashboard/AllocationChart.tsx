import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip 
} from 'recharts';
import { SectorAllocation } from '@/types/investment';
import { formatCurrency, formatNumber } from '@/lib/formatters';

interface AllocationChartProps {
  data: SectorAllocation[];
  title: string;
}

const COLORS = [
  'hsl(190, 85%, 50%)',
  'hsl(145, 70%, 45%)',
  'hsl(280, 70%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 55%)',
  'hsl(210, 80%, 55%)',
];

export function AllocationChart({ data, title }: AllocationChartProps) {
  return (
    <div className="chart-container">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="flex items-center gap-6">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                dataKey="percentage"
                nameKey="sector"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
          {data.map((item, index) => (
            <div key={item.sector} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-muted-foreground">{item.sector}</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-foreground">{formatCurrency(item.value, true)}</span>
                <span className="text-muted-foreground w-14 text-right">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
