export const readVideoDuration = (file: File, signal?: AbortSignal): Promise<number> =>
  new Promise((resolve, reject) => {
    signal?.throwIfAborted();
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      signal?.removeEventListener('abort', handleAbort);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };
    const handleAbort = () => {
      cleanup();
      reject(new DOMException('视频读取已取消。', 'AbortError'));
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const { duration } = video;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('无法读取视频时长。'));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('无法读取视频元数据。'));
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
    video.src = objectUrl;
  });
