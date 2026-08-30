'use client';

import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Database } from 'lucide-react';
import { loadStoredTasks, loadStoredProjects, loadStoredSettings, saveStoredTasks, saveStoredProjects, saveStoredSettings } from '@/lib/client-sync';
import * as XLSX from 'xlsx';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function ImportExportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportExportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMsg(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to import workbook');
      }

      setImportResult({
        importedCount: data.importedCount,
        skippedCount: data.skippedCount,
      });
      setSelectedFile(null);
      onImportSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during import.');
    } finally {
      setIsUploading(false);
    }
  };

  // Client & Server Supported Exporter
  const handleTriggerExport = () => {
    try {
      const localTasks = loadStoredTasks();
      if (localTasks && localTasks.length > 0) {
        const rows = localTasks.map((t) => ({
          Date: t.date,
          Project: t.project?.name || 'Unknown',
          Description: t.description,
          'Duration (Minutes)': t.durationMinutes,
          'Duration (Hours)': (t.durationMinutes / 60).toFixed(2),
          Status: t.status,
          Notes: t.notes || '',
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Task Log');

        if (exportFormat === 'csv') {
          XLSX.writeFile(wb, `Remotasks_Export_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: 'csv' });
        } else {
          XLSX.writeFile(wb, `Remotasks_Export_${new Date().toISOString().slice(0, 10)}.xlsx`, { bookType: 'xlsx' });
        }
        return;
      }
    } catch (e) {
      console.warn('Client export fallback to server:', e);
    }
    window.location.href = `/api/export?format=${exportFormat}`;
  };

  // 1-Click JSON Backup Exporter
  const handleExportJsonBackup = () => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: loadStoredTasks() || [],
      projects: loadStoredProjects() || [],
      settings: loadStoredSettings() || {},
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remotasks_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg('Database backup downloaded successfully!');
  };

  // 1-Click JSON Restore Handler
  const handleRestoreJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = evt.target?.result as string;
        const data = JSON.parse(raw);

        if (data.tasks && Array.isArray(data.tasks)) {
          saveStoredTasks(data.tasks);
        }
        if (data.projects && Array.isArray(data.projects)) {
          saveStoredProjects(data.projects);
        }
        if (data.settings && typeof data.settings === 'object') {
          saveStoredSettings(data.settings);
        }

        setSuccessMsg(`Successfully restored ${data.tasks?.length || 0} tasks and backup data!`);
        onImportSuccess();
      } catch (err: any) {
        setErrorMsg('Invalid backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 bg-slate-900 border-slate-700 shadow-2xl relative rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Import & Export Data</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {importResult && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              Successfully imported <strong>{importResult.importedCount}</strong> task entries! ({importResult.skippedCount} empty/skipped rows)
            </span>
          </div>
        )}

        {/* Section 1: Excel Import */}
        <div className="mb-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            Import Historical Timesheet (.xlsx)
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Upload your existing workbook (<code className="text-slate-300 font-mono">Task_Log_TimeSheet_Automated.xlsx</code>) to import your full history.
          </p>

          <form onSubmit={handleImportSubmit} className="space-y-3">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 file:cursor-pointer cursor-pointer"
            />

            {selectedFile && (
              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing Tasks...
                  </>
                ) : (
                  <>Start Import</>
                )}
              </button>
            )}
          </form>
        </div>

        {/* Section 2: Timesheet Export */}
        <div className="mb-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400" />
            Export Task Log
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Download your task log as a formatted spreadsheet file.
          </p>

          <div className="flex items-center gap-3">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="glass-input text-xs bg-slate-900 py-2 min-w-[130px]"
            >
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
            </select>

            <button
              onClick={handleTriggerExport}
              className="flex-1 py-2 px-4 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Export
            </button>
          </div>
        </div>

        {/* Section 3: 1-Click JSON Backup & Restore */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            1-Click Complete Backup & Restore (JSON)
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Back up all your tasks, custom projects, and settings to a single backup file.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={handleExportJsonBackup}
              className="w-full sm:w-auto flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-white bg-purple-600/80 hover:bg-purple-600 border border-purple-500/30 transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Backup (.json)
            </button>

            <label className="w-full sm:w-auto flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Restore Backup (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreJsonBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="skeuo-button-secondary px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
