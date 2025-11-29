import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BodyMetrics } from '../types';

interface MetricsChartProps {
  data: BodyMetrics[];
  dataKey: keyof BodyMetrics;
  color: string;
  name: string;
  unit: string;
  bgColor?: string; // Optional custom bg color for the card
}

const MetricsChart: React.FC<MetricsChartProps> = ({ data, dataKey, color, name, unit, bgColor = 'white' }) => {
  const formattedData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
    fullDate: new Date(item.date).toLocaleDateString('zh-TW'),
  }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-100 rounded-3xl text-gray-400 font-bold">
        NO DATA
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-3xl shadow-soft h-full flex flex-col`} style={{ backgroundColor: bgColor }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-pop-dark font-display font-bold text-lg flex items-center gap-2">
          {name}
        </h3>
        <span className="text-xs text-pop-dark/60 font-semibold bg-pop-dark/5 px-3 py-1 rounded-full">{unit}</span>
      </div>
      <div className="flex-1 w-full min-h-[200px] text-xs font-semibold">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2655" strokeOpacity={0.05} vertical={false} />
            <XAxis 
              dataKey="displayDate" 
              stroke="#2A2655" 
              tickMargin={10} 
              tick={{fontSize: 10, fontWeight: 600, fill: '#2A2655', opacity: 0.5}}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="#2A2655" 
              domain={['auto', 'auto']} 
              tickFormatter={(val) => val.toFixed(1)}
              width={35}
              tick={{fontSize: 10, fontWeight: 600, fill: '#2A2655', opacity: 0.5}}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#2A2655', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(42, 38, 85, 0.2)'
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#ffffff', fontWeight: 600, marginBottom: '4px', opacity: 0.7 }}
              cursor={{ stroke: color, strokeWidth: 2, strokeDasharray: '5 5' }}
              formatter={(value: number) => [`${value} ${unit}`, name]}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                    return payload[0].payload.fullDate;
                }
                return label;
              }}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={4}
              dot={{ fill: color, r: 0, strokeWidth: 0 }}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: color }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricsChart;