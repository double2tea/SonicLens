import React from 'react';
import { ExternalLink, PlayCircle } from 'lucide-react';
import type { SimilarTrack } from '../types';

interface ReferenceTrackLinksProps {
  track: SimilarTrack;
}

interface ReferenceSite {
  name: string;
  url: string;
  accentColor: string;
}

const encodeQuery = (value: string): string => encodeURIComponent(value);

const buildReferenceSites = (track: SimilarTrack): ReferenceSite[] => {
  const query = `${track.title} ${track.artist}`.trim();
  const encodedQuery = encodeQuery(query);

  return [
    {
      name: 'YouTube',
      url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
      accentColor: '#ef4444',
    },
    {
      name: 'Spotify',
      url: `https://open.spotify.com/search/${encodedQuery}`,
      accentColor: '#22c55e',
    },
    {
      name: 'Apple Music',
      url: `https://music.apple.com/search?term=${encodedQuery}`,
      accentColor: '#fb7185',
    },
    {
      name: 'Google',
      url: `https://www.google.com/search?q=${encodedQuery}`,
      accentColor: '#60a5fa',
    },
  ];
};

const ReferenceTrackLinks: React.FC<ReferenceTrackLinksProps> = ({ track }) => {
  const sites = buildReferenceSites(track);

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
        <PlayCircle size={12} />
        试听参考:
      </span>
      {sites.map((site) => (
        <a
          key={site.name}
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`在 ${site.name} 搜索参考曲目`}
          style={{ '--brand-accent': site.accentColor } as React.CSSProperties}
          className="flex items-center gap-1.5 bg-white/5 border border-white/5 hover:border-[var(--brand-accent)] text-xs px-3 py-1.5 rounded-full text-slate-300 hover:text-white transition-all duration-300 group"
        >
          <span
            className="w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125"
            style={{ backgroundColor: site.accentColor }}
          />
          <span>{site.name}</span>
          <ExternalLink size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  );
};

export default ReferenceTrackLinks;
