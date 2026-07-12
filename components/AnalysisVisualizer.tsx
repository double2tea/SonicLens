import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { SonicProfile } from '../types';

interface AnalysisVisualizerProps {
  profile: SonicProfile;
}

const AnalysisVisualizer = ({ profile }: AnalysisVisualizerProps) => {
  const data = [
    { subject: '能量 (Energy)', A: profile.energy, fullMark: 100 },
    { subject: '快乐 (Happiness)', A: profile.happiness, fullMark: 100 },
    { subject: '原声 (Acoustic)', A: profile.acousticness, fullMark: 100 },
    { subject: '激烈 (Intensity)', A: profile.intensity, fullMark: 100 },
    { subject: '器乐 (Instrumental)', A: profile.instrumental, fullMark: 100 },
  ];

  return (
    <div className="flex h-[220px] w-full items-center justify-center">
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(21, 31, 24, 0.16)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#59695f', fontSize: 9 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Vibe"
            dataKey="A"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalysisVisualizer;
