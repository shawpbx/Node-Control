import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { GeneratedFile, MmdvmConfiguration } from '../types/mmdvmConfig';
import { generateAllFiles } from '../utils/generators';
import { downloadTextFile } from '../utils/download';

interface ConfigFilesViewProps {
  config: MmdvmConfiguration;
}

type CategoryFilter = 'ALL' | GeneratedFile['category'];

export function ConfigFilesView({ config }: ConfigFilesViewProps) {
  const allFiles = useMemo(() => generateAllFiles(config), [config]);
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const files = useMemo(
    () => (category === 'ALL' ? allFiles : allFiles.filter((f) => f.category === category)),
    [allFiles, category]
  );

  const activeFile = files.find((f) => f.id === selectedId) || files[0];

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedId(activeFile.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDownload = () => {
    if (!activeFile) return;
    downloadTextFile(activeFile.filename, activeFile.content);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Generated Configuration Files
          </h1>
          <p className="text-sm text-slate-700 dark:text-blue-200/80 mt-1">
            Inspect the exact AllStarLink (/etc/asterisk/*.conf), DVSwitch (/opt/*_Bridge/*.ini), MMDVM (/etc/mmdvm/*.ini), and installer script.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white/85 dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg self-start overflow-x-auto">
          {(['ALL', 'AllStarLink', 'DVSwitch', 'MMDVM', 'Installer'] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                category === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-blue-200 hover:bg-blue-100/70 dark:hover:bg-blue-900/50'
              }`}
            >
              {cat === 'ALL' ? `All (${allFiles.length})` : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* File List */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg divide-y divide-blue-100 dark:divide-blue-800/70 shadow-xs">
          {files.map((f) => {
            const isSelected = f.id === activeFile?.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedId(f.id)}
                className={`w-full text-left p-4 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/50'
                    : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm font-mono font-semibold truncate ${
                      isSelected ? 'text-blue-700 dark:text-sky-300' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {f.filename}
                  </p>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-blue-300/80 shrink-0">
                    {f.category}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500 dark:text-blue-300/75 mt-0.5 truncate">
                  {f.targetPath}
                </p>
                <p className="text-xs text-slate-600 dark:text-blue-200/80 mt-1.5 leading-relaxed">
                  {f.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Code Preview */}
        {activeFile && (
          <div className="lg:col-span-8 bg-white dark:bg-[#0d2240] border border-blue-200 dark:border-blue-800/70 rounded-lg overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-blue-100 dark:border-blue-800/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                  {activeFile.targetPath}
                </p>
                <p className="text-xs text-slate-500 dark:text-blue-300/75">
                  {activeFile.category} · {activeFile.content.split('\n').length} lines
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[36px] px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-700 text-xs font-medium text-slate-700 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-blue-900/40 inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  {copiedId === activeFile.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === activeFile.id ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="min-h-[36px] px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
            <pre className="p-4 max-h-[620px] overflow-auto bg-[#061224] text-blue-100 text-xs leading-relaxed font-mono">
              {activeFile.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
