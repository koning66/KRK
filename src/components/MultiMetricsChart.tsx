import React from 'react';
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
import { BodyMetrics } from '../types';

interface MultiMetricsChartProps {
  data: BodyMetrics[];
}

const MultiMetricsChart: React.FC<MultiMetricsChartProps> = ({ data }) => {
  // Format date
  const formattedData = data.map(item => ({
    ...item,
    displayDate: new Date(item.date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }),
    fullDate: new Date(item.date).toLocaleDateString('zh-TW'),
  }));

  if (data.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-soft mb-6">
      <h3 className="text-pop-dark font-display font-bold text-xl mb-6">
        Overall Trends (Relative)
      </h3>
      <div className="h-72 w-full text-xs font-bold">
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
            {/* 
              We use multiple Y-axes (yAxisId) to scale each line independently.
              This allows lines with different units/scales to overlay meaningfully.
            */}
            <YAxis yAxisId="weight" domain={['auto', 'auto']} hide />
            <YAxis yAxisId="muscle" domain={['auto', 'auto']} hide />
            <YAxis yAxisId="fatMass" domain={['auto', 'auto']} hide />
            <YAxis yAxisId="percent" domain={['auto', 'auto']} hide />

            <Tooltip
              contentStyle={{ 
                backgroundColor: '#2A2655', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff',
                padding: '8px 12px',
                boxShadow: '0 4px 12px rgba(42, 38, 85, 0.2)'
              }}
              itemStyle={{ color: '#fff', padding: 0 }}
              labelStyle={{ color: '#ffffff', fontWeight: 600, marginBottom: '8px', opacity: 0.7 }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px', fontFamily: 'Quicksand', fontWeight: 700, color: '#2A2655' }} 
              iconType="circle"
            />
            
            {/* 
               Colors synchronized with App.tsx MetricsChart calls:
               Weight: #2A2655 (Dark)
               Muscle: #9BA9FF (Blue)
               Fat Mass: #FB85D9 (Pink)
               Body Fat %: #9EBD48 (Green/Lime variant)
            */}
            <Line yAxisId="weight" type="monotone" name="Weight (kg)" dataKey="weight" stroke="#2A2655" strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
            <Line yAxisId="muscle" type="monotone" name="Muscle (kg)" dataKey="skeletalMuscleMass" stroke="#9BA9FF" strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
            <Line yAxisId="fatMass" type="monotone" name="Fat Mass (kg)" dataKey="bodyFatMass" stroke="#FB85D9" strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
            <Line yAxisId="percent" type="monotone" name="Body Fat (%)" dataKey="percentBodyFat" stroke="#9EBD48" strokeWidth={4} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MultiMetricsChart;