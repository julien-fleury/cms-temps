import { contextBridge, ipcRenderer } from 'electron';
import type { AffaireInput, Categorie, CmsApi, PointageInput } from '../shared/types.js';

const api: CmsApi = {
  affaires: {
    list: () => ipcRenderer.invoke('affaires:list'),
    get: (id) => ipcRenderer.invoke('affaires:get', id),
    create: (input: AffaireInput) => ipcRenderer.invoke('affaires:create', input),
    update: (id, input: AffaireInput) => ipcRenderer.invoke('affaires:update', id, input),
    remove: (id) => ipcRenderer.invoke('affaires:remove', id),
  },
  pointages: {
    list: (affaireId) => ipcRenderer.invoke('pointages:list', affaireId),
    create: (input: PointageInput) => ipcRenderer.invoke('pointages:create', input),
    update: (id, input: PointageInput) => ipcRenderer.invoke('pointages:update', id, input),
    remove: (id) => ipcRenderer.invoke('pointages:remove', id),
    createMany: (inputs) => ipcRenderer.invoke('pointages:create-many', inputs),
  },
  budgets: {
    get: (affaireId) => ipcRenderer.invoke('budgets:get', affaireId),
    save: (affaireId, budgets: Array<{ categorie: Categorie; heuresPrevues: number }>) => ipcRenderer.invoke('budgets:save', affaireId, budgets),
  },
  dashboard: () => ipcRenderer.invoke('dashboard'),
  exportExcel: () => ipcRenderer.invoke('export:excel'),
  importExcel: () => ipcRenderer.invoke('import:excel'),
  reportPdf: (affaireId) => ipcRenderer.invoke('report:pdf', affaireId),
  backup: () => ipcRenderer.invoke('database:backup'),
  restore: () => ipcRenderer.invoke('database:restore'),
};

contextBridge.exposeInMainWorld('cms', api);
