import React from 'react';
import { ExternalLink, Search } from 'lucide-react';

interface StockLinksProps {
  keywords?: string[];
  genre?: string;
  customQuery?: string;
  variant?: 'grid' | 'compact';
  type?: 'music' | 'sfx';
}

const StockLinks: React.FC<StockLinksProps> = ({ 
  keywords = [], 
  genre, 
  customQuery,
  variant = 'grid',
  type = 'music'
}) => {
  // Logic: 
  // 1. If customQuery is provided (e.g. specific song title), use it.
  // 2. Otherwise use the first 2-3 keywords.
  let query = '';
  let audioNetQuery = '';

  if (customQuery) {
    query = customQuery;
    audioNetQuery = customQuery; // Keep it simple for Audio Network too
  } else {
    query = keywords.slice(0, 3).join(' '); 
    audioNetQuery = keywords.slice(0, 2).join(' ');
  }

  const encodedQuery = encodeURIComponent(query);
  const encodedAudioNetQuery = encodeURIComponent(audioNetQuery);

  const musicSites = [
    {
      name: "Artlist",
      url: `https://artlist.io/royalty-free-music/search?terms=${encodedQuery}`,
      accentColor: "#eab308",
      desc: "电影感独立创作库"
    },
    {
      name: "Musicbed",
      url: `https://www.musicbed.com/songs?q=${encodedQuery}`,
      accentColor: "#ffffff",
      desc: "艺术声学高端曲库"
    },
    {
      name: "Epidemic Sound",
      url: `https://www.epidemicsound.com/music/search/?term=${encodedQuery}`,
      accentColor: "#f43f5e",
      desc: "大牌自媒体无版权曲库"
    },
    {
      name: "Extreme Music",
      url: `https://www.extrememusic.com/search?q=${encodedQuery}`,
      accentColor: "#ef4444",
      desc: "顶级影视配乐Hans Zimmer大厂"
    },
    {
      name: "PremiumBeat",
      url: `https://www.premiumbeat.com/royalty-free-music?q=${encodedQuery}`,
      accentColor: "#0d9488",
      desc: "广播级影视广告品质"
    },
    {
      name: "Audio Network",
      url: `https://www.audionetwork.com/browse/results?keywords=${encodedAudioNetQuery}`,
      accentColor: "#e11d48",
      desc: "环球影视专用宏大配乐"
    }
  ];

  const sfxSites = [
    {
      name: "Freesound",
      url: `https://freesound.org/search/?q=${encodedQuery}`,
      accentColor: "#6366f1",
      desc: "全球最大免费音效社区"
    },
    {
      name: "Artlist SFX",
      url: `https://artlist.io/sfx/search?terms=${encodedQuery}`,
      accentColor: "#eab308",
      desc: "影视物理环境实录音效"
    },
    {
      name: "Epidemic Sound",
      url: `https://www.epidemicsound.com/sound-effects/search/?term=${encodedQuery}`,
      accentColor: "#f43f5e",
      desc: "多轨无缝拼接实声音效"
    },
    {
      name: "Splice",
      url: `https://splice.com/sounds/search/samples?q=${encodedQuery}`,
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
            title={`在 ${site.name} 搜索相似音频`}
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