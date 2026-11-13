import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import * as XLSX from 'xlsx';
import { DatabaseManager } from './database/index.js';
import { DataService } from './services/data-service.js';
import { CATEGORIES, type AffaireInput, type Categorie, type PointageInput } from '../shared/types.js';

let mainWindow: BrowserWindow | null = null;
let manager: DatabaseManager;

const escapeHtml = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const euro = (value: number): string => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
const number = (value: number): string => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

function reportHtml(service: DataService, affaireId: number): string | null {
  const affaire = service.getAffaire(affaireId);
  if (!affaire) return null;
  const pointages = service.listPointages(affaireId);
  const budgets = service.getBudgets(affaireId).filter((budget) => budget.heuresPrevues > 0 || budget.heuresConsommees > 0);
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    @page{size:A4;margin:16mm}body{font:12px Arial,sans-serif;color:#172033}h1{font-size:25px;margin:0}h2{font-size:16px;margin:24px 0 10px;color:#197b64}.muted{color:#64748b}.header{display:flex;justify-content:space-between;border-bottom:3px solid #197b64;padding-bottom:16px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:18px 0}.stat{background:#f1f5f9;border-radius:7px;padding:10px}.stat b{display:block;font-size:16px;margin-top:4px}table{width:100%;border-collapse:collapse}th{background:#e8f3f0;text-align:left}th,td{padding:7px;border-bottom:1px solid #dbe2ea}.negative{color:#dc2626}.footer{margin-top:24px;font-size:10px;color:#94a3b8}
  </style></head><body><div class="header"><div><h1>${escapeHtml(affaire.nom)}</h1><div class="muted">${escapeHtml(affaire.client)}</div></div><div><b>${affaire.terminee ? 'Terminée' : 'En cours'}</b><br><span class="muted">Édité le ${new Date().toLocaleDateString('fr-FR')}</span></div></div>
  <div class="stats"><div class="stat">Prix vendu HT<b>${euro(affaire.montantVenduHt)}</b></div><div class="stat">Heures consommées<b>${number(affaire.heuresConsommees)} h</b></div><div class="stat">Crédit heures<b class="${affaire.creditRestantHeures < 0 ? 'negative' : ''}">${number(affaire.creditRestantHeures)} h</b></div><div class="stat">Taux réel<b>${affaire.tauxHoraireReel ? `${euro(affaire.tauxHoraireReel)}/h` : '—'}</b></div></div>
  <h2>Budget par catégorie</h2><table><thead><tr><th>Catégorie</th><th>Prévu</th><th>Consommé</th><th>Restant</th></tr></thead><tbody>${budgets.map((budget) => `<tr><td>${escapeHtml(budget.categorie)}</td><td>${number(budget.heuresPrevues)} h</td><td>${number(budget.heuresConsommees)} h</td><td class="${budget.heuresRestantes < 0 ? 'negative' : ''}">${number(budget.heuresRestantes)} h</td></tr>`).join('') || '<tr><td colspan="4">Aucun budget détaillé</td></tr>'}</tbody></table>
  <h2>Historique des pointages</h2><table><thead><tr><th>Date</th><th>Heures</th><th>Catégorie</th><th>Commentaire</th></tr></thead><tbody>${pointages.map((pointage) => `<tr><td>${escapeHtml(pointage.date)}</td><td>${number(pointage.heures)} h</td><td>${escapeHtml(pointage.categorie)}</td><td>${escapeHtml(pointage.commentaire)}</td></tr>`).join('') || '<tr><td colspan="4">Aucun pointage</td></tr>'}</tbody></table><div class="footer">Rapport généré localement par CMS Temps.</div></body></html>`;
}

const normalizeDate = (value: unknown): string => {
  if (value instanceof Date) return value.toLocaleDateString('en-CA');
  if (typeof value === 'number') return XLSX.SSF.format('yyyy-mm-dd', value);
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text;
};

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
  ipcMain.handle('pointages:create-many', (_e, inputs: PointageInput[]) => service.createPointages(inputs));
  ipcMain.handle('budgets:get', (_e, affaireId: number) => service.getBudgets(affaireId));
  ipcMain.handle('budgets:save', (_e, affaireId: number, budgets: Array<{ categorie: Categorie; heuresPrevues: number }>) => service.saveBudgets(affaireId, budgets));
  ipcMain.handle('dashboard', () => service.dashboard());
  ipcMain.handle('export:excel', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, { title: 'Exporter les données', defaultPath: 'CMS-Temps-export.xlsx', filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }] });
    if (result.canceled || !result.filePath) return null;
    const affaires = service.listAffaires().map(({ prevision, ...affaire }) => ({ ...affaire, ...prevision }));
    const pointages = service.listPointages();
    const budgets = service.listAffaires().flatMap((affaire) => service.getBudgets(affaire.id).filter((budget) => budget.heuresPrevues > 0).map((budget) => ({ affaireId: affaire.id, affaire: affaire.nom, ...budget })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(affaires), 'Affaires');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pointages), 'Pointages');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(budgets), 'Budgets');
    XLSX.writeFile(workbook, result.filePath);
    return result.filePath;
  });
  ipcMain.handle('import:excel', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, { title: 'Importer des données Excel', properties: ['openFile'], filters: [{ name: 'Classeur Excel', extensions: ['xlsx', 'xls'] }] });
    if (result.canceled || !result.filePaths[0]) return null;
    const workbook = XLSX.readFile(result.filePaths[0], { cellDates: true });
    const affaireRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Affaires ?? workbook.Sheets[workbook.SheetNames[0]]);
    const pointageRows = workbook.Sheets.Pointages ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Pointages) : [];
    const budgetRows = workbook.Sheets.Budgets ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Budgets) : [];
    const idMap = new Map<number, number>();
    for (const row of affaireRows) {
      const oldId = Number(row.id ?? 0);
      const newId = service.createAffaire({
        nom: String(row.nom ?? row.Nom ?? '').trim(), client: String(row.client ?? row.Client ?? '').trim(),
        montantVenduHt: Number(row.montantVenduHt ?? row['Prix HT'] ?? 0), tauxHoraireReference: Number(row.tauxHoraireReference ?? row['Taux horaire'] ?? 70),
        dateCreation: normalizeDate(row.dateCreation ?? row['Date création'] ?? new Date()), dateCloture: row.dateCloture ? normalizeDate(row.dateCloture) : null,
        dateEcheance: row.dateEcheance ? normalizeDate(row.dateEcheance) : null, terminee: row.terminee === true || Number(row.terminee) === 1 || String(row.terminee).toLowerCase() === 'oui',
        commentaire: String(row.commentaire ?? ''),
      });
      if (oldId) idMap.set(oldId, newId);
    }
    const inputs = pointageRows.flatMap((row): PointageInput[] => {
      const affaireId = idMap.get(Number(row.affaireId ?? row.affaire_id)) ?? Number(row.affaireId ?? row.affaire_id ?? 0);
      const categorie = String(row.categorie ?? 'Autre') as Categorie;
      if (!affaireId || !CATEGORIES.includes(categorie)) return [];
      return [{ affaireId, date: normalizeDate(row.date), heures: Number(row.heures ?? 0), categorie, commentaire: String(row.commentaire ?? '') }];
    }).filter((input) => input.heures > 0);
    service.createPointages(inputs);
    const budgetsByAffaire = new Map<number, Array<{ categorie: Categorie; heuresPrevues: number }>>();
    for (const row of budgetRows) {
      const affaireId = idMap.get(Number(row.affaireId ?? row.affaire_id)) ?? Number(row.affaireId ?? row.affaire_id ?? 0);
      const categorie = String(row.categorie ?? '') as Categorie;
      if (!affaireId || !CATEGORIES.includes(categorie)) continue;
      const list = budgetsByAffaire.get(affaireId) ?? [];
      list.push({ categorie, heuresPrevues: Number(row.heuresPrevues ?? row.heures_prevues ?? 0) });
      budgetsByAffaire.set(affaireId, list);
    }
    for (const [affaireId, budgets] of budgetsByAffaire) service.saveBudgets(affaireId, budgets);
    return { affaires: affaireRows.length, pointages: inputs.length };
  });
  ipcMain.handle('report:pdf', async (_event, affaireId: number) => {
    const affaire = service.getAffaire(affaireId);
    if (!affaire) return null;
    const result = await dialog.showSaveDialog(mainWindow!, { title: 'Exporter le rapport PDF', defaultPath: `Rapport-${affaire.nom.replace(/[^a-z0-9]+/gi, '-')}.pdf`, filters: [{ name: 'Document PDF', extensions: ['pdf'] }] });
    if (result.canceled || !result.filePath) return null;
    const html = reportHtml(service, affaireId);
    if (!html) return null;
    const reportWindow = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
    try {
      await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      const pdf = await reportWindow.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 } });
      fs.writeFileSync(result.filePath, pdf);
      return result.filePath;
    } finally { reportWindow.destroy(); }
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
  void manager.automaticBackup(path.join(app.getPath('userData'), 'backups')).catch((error) => console.error('Sauvegarde automatique impossible', error));
  registerHandlers(new DataService(() => manager.db));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => manager?.close());
