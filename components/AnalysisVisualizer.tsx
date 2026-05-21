import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { SonicProfile } from '../types';

interface AnalysisVisualizerProps {
  profile: SonicProfile;
}

const AnalysisVisualizer: React.FC<AnalysisVisualizerProps> = ({ profile }) => {
  const data = [
    { subject: '能量 (Energy)', A: profile.energy, fullMark: 100 },
    { subject: '快乐 (Happiness)', A: profile.happiness, fullMark: 100 },
    { subject: '原声 (Acoustic)', A: profile.acousticness, fullMark: 100 },
    { subject: '激烈 (Intensity)', A: profile.intensity, fullMark: 100 },
    { subject: '器乐 (Instrumental)', A: profile.instrumental, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[300px] flex items-center justify-center relative">
        <div className="absolute top-0 left-0 text-xs font-bold text-slate-500 uppercase tracking-widest">声波特征分析</div>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Vibe"
            dataKey="A"
            stroke="#ff4e00"
            strokeWidth={3}
            fill="#ff4e00"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalysisVisualizer;