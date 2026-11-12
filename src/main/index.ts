import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { DatabaseManager } from './database/index.js';
import { DataService } from './services/data-service.js';
import type { AffaireInput, PointageInput } from '../shared/types.js';

let mainWindow: BrowserWindow | null = null;
let manager: DatabaseManager;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1080, minHeight: 700,
    backgroundColor: '#f4f6f8',
    title: 'CMS Temps',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void mainWindow.loadURL(devUrl);
  else void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
}

function registerHandlers(service: DataService): void {
  ipcMain.handle('affaires:list', () => service.listAffaires());
  ipcMain.handle('affaires:get', (_e, id: number) => service.getAffaire(id));
  ipcMain.handle('affaires:create', (_e, input: AffaireInput) => service.createAffaire(input));
  ipcMain.handle('affaires:update', (_e, id: number, input: AffaireInput) => service.updateAffaire(id, input));
  ipcMain.handle('affaires:remove', (_e, id: number) => service.removeAffaire(id));
  ipcMain.handle('pointages:list', (_e, affaireId?: number) => service.listPointages(affaireId));
  ipcMain.handle('pointages:create', (_e, input: PointageInput) => service.createPointage(input));
  ipcMain.handle('pointages:update', (_e, id: number, input: PointageInput) => service.updatePointage(id, input));
  ipcMain.handle('pointages:remove', (_e, id: number) => service.removePointage(id));
  ipcMain.handle('dashboard', () => service.dashboard());
  ipcMain.handle('export:excel', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, { title: 'Exporter les données', defaultPath: 'CMS-Temps-export.xlsx', filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }] });
    if (result.canceled || !result.filePath) return null;
    const affaires = service.listAffaires();
    const pointages = service.listPointages();
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(affaires), 'Affaires');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pointages), 'Pointages');
    XLSX.writeFile(workbook, result.filePath);
    return result.filePath;
  });
  ipcMain.handle('database:backup', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, { title: 'Sauvegarder la base', defaultPath: `CMS-Temps-${new Date().toISOString().slice(0, 10)}.sqlite`, filters: [{ name: 'Base SQLite', extensions: ['sqlite'] }] });
    if (result.canceled || !result.filePath) return null;
    await manager.backup(result.filePath);
    return result.filePath;
  });
  ipcMain.handle('database:restore', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { title: 'Restaurer une sauvegarde', properties: ['openFile'], filters: [{ name: 'Base SQLite', extensions: ['sqlite', 'db'] }] });
    if (result.canceled || !result.filePaths[0]) return false;
    manager.restore(result.filePaths[0]);
    return true;
  });
}

app.whenReady().then(() => {
  manager = new DatabaseManager(path.join(app.getPath('userData'), 'cms-temps.sqlite'));
  registerHandlers(new DataService(() => manager.db));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => manager?.close());
