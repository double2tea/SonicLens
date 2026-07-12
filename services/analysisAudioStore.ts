const DATABASE_NAME = 'soniclens';
const DATABASE_VERSION = 1;
const STORE_NAME = 'analysisAudio';

interface StoredAnalysisAudio {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
}

const getIndexedDB = (): IDBFactory => {
  if (typeof globalThis.indexedDB === 'undefined') {
    throw new Error('当前浏览器不支持 IndexedDB，无法保存分析音频。');
  }
  return globalThis.indexedDB;
};

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = getIndexedDB().open(DATABASE_NAME, DATABASE_VERSION);
    let blocked = false;

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('无法打开分析音频数据库。'));
    request.onblocked = () => {
      blocked = true;
      reject(new Error('分析音频数据库升级被其他页面阻塞。'));
    };
  });

const requestResult = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('分析音频数据库请求失败。'));
  });

const transactionComplete = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('分析音频数据库事务失败。'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('分析音频数据库事务已中止。'));
  });

const withDatabase = async <T>(operation: (database: IDBDatabase) => Promise<T>): Promise<T> => {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    database.close();
  }
};

const isStoredAnalysisAudio = (value: unknown): value is StoredAnalysisAudio =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  typeof value.id === 'string' &&
  'blob' in value &&
  value.blob instanceof Blob &&
  'name' in value &&
  typeof value.name === 'string' &&
  'type' in value &&
  typeof value.type === 'string' &&
  'lastModified' in value &&
  typeof value.lastModified === 'number' &&
  Number.isFinite(value.lastModified);

export const saveAnalysisAudio = (id: string, file: File): Promise<void> =>
  withDatabase(async (database) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).put({
      id,
      blob: file,
      name: file.name,
      type: file.type,
      lastModified: file.lastModified,
    } satisfies StoredAnalysisAudio);

    await Promise.all([requestResult(request), transactionComplete(transaction)]);
  });

export const loadAnalysisAudio = (id: string): Promise<File | null> =>
  withDatabase(async (database) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    const [value] = await Promise.all([
      requestResult<unknown>(request),
      transactionComplete(transaction),
    ]);

    if (value === undefined) return null;
    if (!isStoredAnalysisAudio(value)) {
      throw new Error(`分析音频记录 ${id} 已损坏。`);
    }

    return new File([value.blob], value.name, {
      type: value.type,
      lastModified: value.lastModified,
    });
  });

export const deleteAnalysisAudio = (id: string): Promise<void> =>
  withDatabase(async (database) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).delete(id);
    await Promise.all([requestResult(request), transactionComplete(transaction)]);
  });

export const clearAnalysisAudio = (): Promise<void> =>
  withDatabase(async (database) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).clear();
    await Promise.all([requestResult(request), transactionComplete(transaction)]);
  });

export const pruneAnalysisAudio = (validIds: string[]): Promise<void> =>
  withDatabase(async (database) => {
    const validIdSet = new Set(validIds);
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const cursorComplete = new Promise<void>((resolve, reject) => {
      const request = store.openKeyCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }

        if (typeof cursor.key !== 'string' || !validIdSet.has(cursor.key)) {
          cursor.delete();
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error('无法清理过期的分析音频记录。'));
    });

    await Promise.all([cursorComplete, transactionComplete(transaction)]);
  });
