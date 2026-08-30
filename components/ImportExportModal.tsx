'use client';

import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
  
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportResult(null);
      setErrorMsg(null);
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

  const handleTriggerExport = () => {
    window.location.href = `/api/export?format=${exportFormat}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg p-6 bg-slate-900/90 border-slate-700 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Import & Export Data</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {importResult && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>
              Successfully imported <strong>{importResult.importedCount}</strong> task entries! ({importResult.skippedCount} empty/skipped rows)
            </span>
          </div>
        )}

        {/* Section 1: Excel Import */}
        <div className="mb-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800">
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
        <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
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

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 bg-slate-800 hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
