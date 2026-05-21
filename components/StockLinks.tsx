import React from 'react';
import { ExternalLink, Search } from 'lucide-react';

interface StockLinksProps {
  keywords?: string[];
  genre?: string;
  customQuery?: string;
  variant?: 'grid' | 'compact';
  type?: 'music' | 'sfx';
}

interface StockSite {
  name: string;
  url: string;
  accentColor: string;
  desc: string;
  supportsDeepSearch?: boolean;
}

const encodeQuery = (query: string): string => encodeURIComponent(query);

const buildSearchUrl = (baseUrl: string, param: string, query: string): string => {
  if (!query) return baseUrl;

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${param}=${encodeQuery(query)}`;
};

const getSearchQuery = (customQuery: string | undefined, genre: string | undefined, keywords: string[]): string => {
  if (customQuery) return customQuery.trim();

  const terms = [genre, ...keywords].filter((term): term is string => Boolean(term?.trim()));
  return Array.from(new Set(terms)).slice(0, 4).join(' ');
};

const StockLinks: React.FC<StockLinksProps> = ({ 
  keywords = [], 
  genre, 
  customQuery,
  variant = 'grid',
  type = 'music'
}) => {
  const query = getSearchQuery(customQuery, genre, keywords);

  const musicSites: StockSite[] = [
    {
      name: "Artlist",
      url: buildSearchUrl('https://artlist.io/royalty-free-music/search', 'search', query),
      accentColor: "#eab308",
      desc: "电影感独立创作库"
    },
    {
      name: "Musicbed",
      url: buildSearchUrl('https://www.musicbed.com/songs', 'q', query),
      accentColor: "#ffffff",
      desc: "艺术声学高端曲库"
    },
    {
      name: "Epidemic Sound",
      url: buildSearchUrl('https://www.epidemicsound.com/music/', 'term', query),
      accentColor: "#f43f5e",
      desc: "大牌自媒体无版权曲库"
    },
    {
      name: "Extreme Music",
      url: buildSearchUrl('https://www.extrememusic.com/search', 'q', query),
      accentColor: "#ef4444",
      desc: "顶级影视配乐Hans Zimmer大厂"
    },
    {
      name: "PremiumBeat",
      url: buildSearchUrl('https://www.premiumbeat.com/royalty-free-music', 'q', query),
      accentColor: "#0d9488",
      desc: "广播级影视广告品质"
    },
    {
      name: "Audio Network",
      url: 'https://us.audionetwork.com/track/searchkeyword',
      accentColor: "#e11d48",
      desc: "环球影视专用宏大配乐",
      supportsDeepSearch: false,
    }
  ];

  const sfxSites: StockSite[] = [
    {
      name: "Freesound",
      url: buildSearchUrl('https://freesound.org/search/', 'q', query),
      accentColor: "#6366f1",
      desc: "全球最大免费音效社区"
    },
    {
      name: "Artlist SFX",
      url: buildSearchUrl('https://artlist.io/sfx/search', 'search', query),
      accentColor: "#eab308",
      desc: "影视物理环境实录音效"
    },
    {
      name: "Epidemic Sound",
      url: buildSearchUrl('https://www.epidemicsound.com/sound-effects/', 'term', query),
      accentColor: "#f43f5e",
      desc: "多轨无缝拼接实声音效"
    },
    {
      name: "Splice",
      url: buildSearchUrl('https://splice.com/sounds/search', 'q', query),
      accentColor: "#3b82f6",
      desc: "现代合成与质感拟音采样"
    }
  ];

  const sites = type === 'sfx' ? sfxSites : musicSites;
  const hoverBorderColor = type === 'sfx' ? 'hover:border-[#00f0ff]' : 'hover:border-[var(--color-accent)]';

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
          探寻类似风格:
        </span>
        {sites.map((site) => (
          <a
            key={site.name}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            title={site.supportsDeepSearch === false ? `打开 ${site.name} 搜索入口` : `在 ${site.name} 搜索相似音频`}
            style={{ '--brand-accent': site.accentColor } as React.CSSProperties}
            className={`flex items-center gap-1.5 bg-white/5 border border-white/5 hover:border-[var(--brand-accent)] text-xs px-3 py-1.5 rounded-full text-slate-300 hover:text-white transition-all duration-300 group`}
          >
            <span className="w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-125" style={{ backgroundColor: site.accentColor }}></span>
            <span>{site.name}</span>
            <ExternalLink size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    );
  }

  const gridColsClass = sites.length === 6 
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' 
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  // Default Grid Variant
  return (
    <div className={`grid ${gridColsClass} gap-4 mt-6`}>
      {sites.map((site) => (
        <a
          key={site.name}
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          title={site.supportsDeepSearch === false ? `打开 ${site.name} 搜索入口` : `在 ${site.name} 搜索相似音频`}
          style={{ '--brand-accent': site.accentColor } as React.CSSProperties}
          className={`
            bg-white/5 border border-white/5 hover:border-[var(--brand-accent)] text-white p-5 rounded-2xl transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1
            flex flex-col justify-between h-36 group relative overflow-hidden
          `}
        >
          {/* Subtle top brand outline */}
          <div className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300 group-hover:bg-[var(--brand-accent)]" />
          
          <div className="flex justify-between items-start">
            <span className="font-bold text-base tracking-wide text-slate-100 group-hover:text-white transition-colors">{site.name}</span>
            <div className="text-slate-400 group-hover:text-white p-1 rounded-lg bg-white/0 group-hover:bg-white/5 transition-all">
              <ExternalLink size={14} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-xs text-slate-400 font-medium group-hover:text-slate-200 transition-colors leading-snug line-clamp-2 select-none">{site.desc}</p>
            <div 
              className="p-1.5 rounded-full shrink-0 border border-white/5 transition-all duration-300"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            >
              <Search size={14} className="text-slate-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default StockLinks;
