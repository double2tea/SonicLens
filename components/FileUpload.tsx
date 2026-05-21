import React, { useCallback } from 'react';
import { Upload, FileAudio, Music, Volume2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  mode: 'music' | 'sfx';
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled, mode }) => {
  const isMusic = mode === 'music';
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    // Allow audio and mp4 video
    if (file && (file.type.startsWith('audio/') || file.type === 'video/mp4')) {
      onFileSelect(file);
    }
  }, [onFileSelect, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add(isMusic ? 'border-[var(--color-accent)]' : 'border-[#00f0ff]', 'bg-white/5'); }}
      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove(isMusic ? 'border-[var(--color-accent)]' : 'border-[#00f0ff]', 'bg-white/5'); }}
      onDrop={(e) => { 
        handleDrop(e); 
        e.currentTarget.classList.remove(isMusic ? 'border-[var(--color-accent)]' : 'border-[#00f0ff]', 'bg-white/5'); 
      }}
      className={`
        border-2 border-dashed rounded-3xl p-16 text-center transition-all duration-300
        flex flex-col items-center justify-center gap-6 group cursor-pointer relative overflow-hidden glass-panel
        ${disabled ? 'border-white/10 opacity-50 cursor-not-allowed' : `border-white/20 hover:bg-white/5 ${isMusic ? 'hover:border-[var(--color-accent)]' : 'hover:border-[#00f0ff]'}`}
      `}
    >
      <input
        type="file"
        id="fileInput"
        accept="audio/*,video/mp4"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      
      <div className={`absolute inset-0 bg-gradient-to-br ${isMusic ? 'from-[var(--color-accent)]/5 to-orange-500/5' : 'from-[#00f0ff]/5 to-blue-500/5'} pointer-events-none`} />

      <label htmlFor="fileInput" className="cursor-pointer w-full h-full flex flex-col items-center justify-center z-10">
        <div className="bg-black/40 p-6 rounded-full mb-4 shadow-xl shadow-black/20 group-hover:scale-110 transition-all duration-300">
          <Upload className={`w-10 h-10 ${isMusic ? 'text-[var(--color-accent)]' : 'text-[#00f0ff]'}`} />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">
           {isMusic ? '拖入音乐 (Music)' : '拖入音效 (SFX)'} 或点击上传
        </h3>
        <p className="text-slate-400 max-w-sm leading-relaxed">
          支持 MP3, WAV, AAC 以及 MP4 视频；视频会先本地提取音频。
          <br/><span className="text-xs text-slate-500 font-bold bg-black/40 px-2 py-1 rounded mt-2 inline-block">上传前自动压缩分析音频，默认目标 12MB</span>
        </p>
        
        <div className="flex gap-6 mt-8">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-400 bg-black/40 border border-white/10 px-4 py-2 rounded-full">
                {isMusic ? (
                    <><Music size={16} className="text-[var(--color-accent)]" /> 音乐模式</>
                ) : (
                    <><Volume2 size={16} className="text-[#00f0ff]" /> 音效模式</>
                )}
            </div>
        </div>
      </label>
    </div>
  );
};

export default FileUpload;
