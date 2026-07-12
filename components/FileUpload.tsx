import React, { useCallback, useId, useRef, useState } from 'react';
import { FileAudio, FileVideo, Upload } from 'lucide-react';
import type { AnalysisMode } from '../types';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
  mode: AnalysisMode;
}

const isSupportedFile = (file: File, mode: AnalysisMode): boolean =>
  mode === 'video'
    ? file.type === 'video/mp4'
    : file.type.startsWith('audio/') || file.type === 'video/mp4';

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled, mode }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const descriptionId = useId();
  const errorId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<{ message: string; mode: AnalysisMode } | null>(null);
  const isMusic = mode === 'music';
  const isVideo = mode === 'video';
  const errorMessage = error?.mode === mode ? error.message : null;

  const selectFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;

      if (!isSupportedFile(file, mode)) {
        setError({
          message: isVideo
            ? '视频分析仅支持 MP4 文件。'
            : `请选择音频或 MP4 视频，视频会自动提取音轨进行${isMusic ? '音乐' : '音效'}分析。`,
          mode,
        });
        return;
      }

      setError(null);
      onFileSelect(file);
    },
    [disabled, isMusic, isVideo, mode, onFileSelect],
  );

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    inputRef.current?.click();
  };

  const openFilePicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  const accentText = 'text-[var(--accent)]';
  const accentBorder = 'accent-border';

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={isVideo ? 'video/mp4' : 'audio/*,video/mp4'}
        aria-label={isVideo ? '选择 MP4 视频' : `选择${isMusic ? '音乐' : '音效'}或 MP4 视频`}
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-describedby={`${descriptionId}${errorMessage ? ` ${errorId}` : ''}`}
        onClick={openFilePicker}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex min-h-[310px] min-w-0 w-full flex-col items-center justify-center overflow-hidden rounded-lg border p-7 text-center outline-none transition-[border-color,background-color,opacity] duration-300 sm:min-h-[350px] sm:p-10 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--canvas)] ${
          disabled
            ? 'cursor-not-allowed border-black/8 bg-black/[0.012] opacity-55'
            : `cursor-pointer bg-white/35 hover:bg-white/60 ${
                isDragging
                  ? `${accentBorder} scale-[0.995]`
                  : 'border-black/10 hover:border-black/25'
              }`
        } ${errorMessage ? 'border-red-400/40' : ''}`}
      >
        <div className="relative z-10 flex max-w-lg flex-col items-center">
          <div
            className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-black/[0.045] transition-transform duration-300 group-hover:-translate-y-0.5 ${
              isDragging ? 'accent-surface' : ''
            }`}
          >
            {isDragging ? (
              isVideo ? (
                <FileVideo
                  aria-hidden="true"
                  className={`h-5 w-5 ${accentText}`}
                  strokeWidth={1.7}
                />
              ) : (
                <FileAudio
                  aria-hidden="true"
                  className={`h-5 w-5 ${accentText}`}
                  strokeWidth={1.7}
                />
              )
            ) : (
              <Upload aria-hidden="true" className={`h-5 w-5 ${accentText}`} strokeWidth={1.7} />
            )}
          </div>

          <h3 className="text-balance text-xl font-semibold tracking-[-0.025em] text-[var(--text)] sm:text-2xl">
            {isDragging
              ? `松开即可载入${isVideo ? '视频' : '媒体'}`
              : `拖入${isVideo ? '视频' : isMusic ? '音乐或视频' : '音效或视频'}，或点击选择`}
          </h3>
          <p
            id={descriptionId}
            className="mt-3 max-w-md text-xs leading-5 text-[var(--text-muted)] sm:text-sm"
          >
            {isVideo
              ? 'MP4 · 联合识别分镜、画面与声音'
              : 'MP3、WAV、AAC、MP4 · 视频仅在本地提取音轨'}
          </p>

          <div aria-live="polite" className="min-h-6 pt-3">
            {errorMessage && (
              <p id={errorId} role="alert" className="text-sm font-medium text-red-300">
                {errorMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FileUpload;
