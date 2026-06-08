import { DBModel } from '@/types';

const DB_KEY = 'dbdesigner_models';
const DB_CURRENT_KEY = 'dbdesigner_current_model';

export interface StoredModel {
  id: string;
  name: string;
  updatedAt: number;
  data: DBModel;
}

// 获取所有存储的模型
export function getStoredModels(): StoredModel[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredModel[];
  } catch {
    return [];
  }
}

// 保存模型到本地存储
export function saveModelToStorage(name: string, model: DBModel): string {
  const models = getStoredModels();
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
  return name;
}

// 从本地存储加载模型
export function loadModelFromStorage(name: string): DBModel | null {
  const models = getStoredModels();
  const found = models.find((m) => m.name === name);
  return found ? found.data : null;
}

// 获取最后打开的模型名称
export function getLastModelName(): string | null {
  return localStorage.getItem(DB_CURRENT_KEY);
}

// 删除存储的模型
export function deleteModelFromStorage(name: string): void {
  const models = getStoredModels().filter((m) => m.name !== name);
  localStorage.setItem(DB_KEY, JSON.stringify(models));
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
