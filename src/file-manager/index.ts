import { DBModel } from '@/types';

const DB_KEY = 'dbdesigner_models';
const DB_CURRENT_KEY = 'dbdesigner_current_model';

export interface StoredModel {
  id: string;
  name: string;
  updatedAt: number;
  data: DBModel;
}

// ---- 后端探测：桌面版(Go + SQLite) 走 API，Web 版兜底 localStorage ----
let backend: 'sqlite' | 'local' | null = null;

async function detectBackend(): Promise<'sqlite' | 'local'> {
  if (backend) return backend;
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const body = await res.json();
      backend = body.storage === 'sqlite' ? 'sqlite' : 'local';
    } else {
      backend = 'local';
    }
  } catch {
    backend = 'local';
  }
  return backend;
}

// 初始化存储后端（应用启动时调用一次）
export async function initStorage(): Promise<'sqlite' | 'local'> {
  return detectBackend();
}

// 获取所有存储的模型
export async function getStoredModels(): Promise<StoredModel[]> {
  if ((await detectBackend()) === 'sqlite') {
    const res = await fetch('/api/models');
    if (!res.ok) return [];
    const list = await res.json();
    // 列表接口不含 data 字段
    return list.map((m: StoredModel) => ({ ...m, data: {} as DBModel }));
  }
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredModel[];
  } catch {
    return [];
  }
}

// 保存模型到本地存储
export async function saveModelToStorage(name: string, model: DBModel): Promise<void> {
  if ((await detectBackend()) === 'sqlite') {
    await fetch('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: model }),
    });
    return;
  }
  const models = getStoredModelsSync();
  const existing = models.find((m) => m.name === name);
  const now = Date.now();

  if (existing) {
    existing.data = model;
    existing.updatedAt = now;
  } else {
    models.push({
      id: `model_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      updatedAt: now,
      data: model,
    });
  }

  localStorage.setItem(DB_KEY, JSON.stringify(models));
  localStorage.setItem(DB_CURRENT_KEY, name);
}

// 从本地存储加载模型
export async function loadModelFromStorage(name: string): Promise<DBModel | null> {
  if ((await detectBackend()) === 'sqlite') {
    try {
      const res = await fetch(`/api/models/${encodeURIComponent(name)}`);
      if (!res.ok) return null;
      const rec = await res.json();
      return rec.data as DBModel;
    } catch {
      return null;
    }
  }
  const models = getStoredModelsSync();
  const found = models.find((m) => m.name === name);
  return found ? found.data : null;
}

// 获取最后打开的模型名称
export async function getLastModelName(): Promise<string | null> {
  if ((await detectBackend()) === 'sqlite') {
    try {
      const res = await fetch('/api/current');
      if (!res.ok) return null;
      const body = await res.json();
      return body.name ?? null;
    } catch {
      return null;
    }
  }
  return localStorage.getItem(DB_CURRENT_KEY);
}

// 删除存储的模型
export async function deleteModelFromStorage(name: string): Promise<void> {
  if ((await detectBackend()) === 'sqlite') {
    await fetch(`/api/models/${encodeURIComponent(name)}`, { method: 'DELETE' });
    return;
  }
  const models = getStoredModelsSync().filter((m) => m.name !== name);
  localStorage.setItem(DB_KEY, JSON.stringify(models));
}

// 同步读取 localStorage 中的模型（仅 local 后端使用）
function getStoredModelsSync(): StoredModel[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredModel[];
  } catch {
    return [];
  }
}

// 页面关闭前的同步兜底保存（仅 beforeunload 使用，绕过 800ms 防抖窗口）
export function syncSaveModel(name: string, model: DBModel): void {
  if (backend === 'sqlite') {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/models', false); // 同步请求，确保关闭前完成写入
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ name, data: model }));
    } catch {
      // 忽略，本地服务器失败时数据最多丢最后一次修改
    }
    return;
  }
  const models = getStoredModelsSync();
  const existing = models.find((m) => m.name === name);
  const now = Date.now();
  if (existing) {
    existing.data = model;
    existing.updatedAt = now;
  } else {
    models.push({ id: `model_${now}`, name, updatedAt: now, data: model });
  }
  localStorage.setItem(DB_KEY, JSON.stringify(models));
  localStorage.setItem(DB_CURRENT_KEY, name);
}

// 导出为文件下载
export function downloadModelFile(model: DBModel, fileName?: string): void {
  const json = JSON.stringify(model, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const name = fileName || `design_${Date.now()}.dbm`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// 从文件导入
export async function importModelFromFile(): Promise<DBModel | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.dbm,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const text = await file.text();
      try {
        const data = JSON.parse(text) as DBModel;
        resolve(data);
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

export function downloadTextFile(content: string, fileName: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
