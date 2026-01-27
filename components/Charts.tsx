import React from 'react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { HistoricalPoint } from '../types';

interface ChartProps {
    data: HistoricalPoint[];
    color: string;
    height?: number;
    showAxes?: boolean;
}

export const SmoothAreaChart: React.FC<ChartProps> = ({ data, color, height = 200, showAxes = false }) => {
    return (
        <div style={{ width: '100%', height: height }}>
            <ResponsiveContainer>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    {showAxes && <XAxis dataKey="date" hide />}
                    {showAxes && <YAxis hide domain={['auto', 'auto']} />}
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#162a2a', border: '1px solid #334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value: number) => [value.toFixed(2), 'Value']}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={3}
                        fill={`url(#gradient-${color})`}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};