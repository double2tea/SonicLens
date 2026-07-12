import { ArrowUpRight } from 'lucide-react';
import type { SimilarTrack } from '../types';

interface ReferenceTrackLinksProps {
  track: SimilarTrack;
}

const buildSites = (track: SimilarTrack): Array<{ name: string; url: string }> => {
  const query = encodeURIComponent(`${track.title} ${track.artist}`.trim());
  return [
    { name: 'YouTube', url: `https://www.youtube.com/results?search_query=${query}` },
    { name: 'Spotify', url: `https://open.spotify.com/search/${query}` },
    { name: 'Apple Music', url: `https://music.apple.com/search?term=${query}` },
  ];
};

export default function ReferenceTrackLinks({ track }: ReferenceTrackLinksProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
      {buildSites(track).map((site) => (
        <a
          key={site.name}
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[0.66rem] text-[var(--text-muted)] hover:accent-text"
        >
          {site.name}
          <ArrowUpRight size={10} />
        </a>
      ))}
    </div>
  );
}
