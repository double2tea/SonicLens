import { ArrowUpRight } from 'lucide-react';

interface StockLinksProps {
  genre?: string;
  keywords?: string[];
  type?: 'music' | 'sfx';
}

interface StockSite {
  description: string;
  name: string;
  url: string;
}

const buildSearchUrl = (baseUrl: string, parameter: string, query: string): string => {
  if (!query) return baseUrl;
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${parameter}=${encodeURIComponent(query)}`;
};

const getQuery = (genre: string | undefined, keywords: string[]): string =>
  Array.from(new Set([genre, ...keywords].filter((item): item is string => Boolean(item?.trim()))))
    .slice(0, 4)
    .join(' ');

export default function StockLinks({ genre, keywords = [], type = 'music' }: StockLinksProps) {
  const query = getQuery(genre, keywords);
  const musicSites: StockSite[] = [
    {
      name: 'Artlist',
      url: buildSearchUrl('https://artlist.io/royalty-free-music/search', 'search', query),
      description: '影视与广告授权音乐',
    },
    {
      name: 'Musicbed',
      url: buildSearchUrl('https://www.musicbed.com/songs', 'q', query),
      description: '独立音乐人与电影配乐',
    },
    {
      name: 'Epidemic Sound',
      url: buildSearchUrl('https://www.epidemicsound.com/music/', 'term', query),
      description: '多场景商业曲库',
    },
    {
      name: 'PremiumBeat',
      url: buildSearchUrl('https://www.premiumbeat.com/royalty-free-music', 'q', query),
      description: '广播与广告制作音乐',
    },
  ];
  const sfxSites: StockSite[] = [
    {
      name: 'Freesound',
      url: buildSearchUrl('https://freesound.org/search/', 'q', query),
      description: '开放音效社区',
    },
    {
      name: 'Artlist SFX',
      url: buildSearchUrl('https://artlist.io/sfx/search', 'search', query),
      description: '影视实录音效',
    },
    {
      name: 'Epidemic Sound',
      url: buildSearchUrl('https://www.epidemicsound.com/sound-effects/', 'term', query),
      description: '商业授权声音素材',
    },
    {
      name: 'Splice',
      url: buildSearchUrl('https://splice.com/sounds/search', 'q', query),
      description: '现代采样与声音设计',
    },
  ];
  const sites = type === 'sfx' ? sfxSites : musicSites;

  return (
    <div className="mt-7 grid gap-x-8 md:grid-cols-2">
      {sites.map((site, index) => (
        <a
          key={site.name}
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-4 border-t hairline py-4"
        >
          <span className="flex min-w-0 items-baseline gap-3">
            <span className="data-value text-[0.62rem] text-[var(--text-muted)]">0{index + 1}</span>
            <span>
              <span className="block text-sm font-semibold group-hover:accent-text">
                {site.name}
              </span>
              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                {site.description}
              </span>
            </span>
          </span>
          <ArrowUpRight
            size={15}
            className="shrink-0 text-[var(--text-muted)] group-hover:accent-text"
          />
        </a>
      ))}
    </div>
  );
}
