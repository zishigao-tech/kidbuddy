import { useState } from 'react';

/**
 * 「生成好的 markdown 给你看一眼，然后复制或下载」——所有导出都走这一层。
 *
 * 单节课的记录、一个模块的全部课时，差别只在 md 和文件名上，
 * 弹窗本身不该有两份，否则按钮位置、提示语、可访问性标签早晚会走偏。
 */
export function MarkdownExportSheet({
  title,
  note,
  fileName,
  md,
  accentClass = 'bg-rose-500',
  onClose,
  testId = 'markdown-export-sheet',
}: {
  title: string;
  /** 标题下面那段说明，默认提示 meta 块能被归档脚本识别 */
  note?: string;
  fileName: string;
  md: string;
  accentClass?: string;
  onClose: () => void;
  testId?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 pb-[max(16px,env(safe-area-inset-bottom))]"
      data-testid={testId}
    >
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-[28px] bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-800">{title}</h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              文件名 <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{fileName}</code>
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭导出弹窗"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-bold text-slate-600"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
          {note ??
            '这份 markdown 的 meta 块与四段文件名可直接被「上课记录」目录识别：存成同名文件后跑 rebuild_index.py，就会自动并入该孩子的汇总页与同类练习对照表。'}
        </p>
        <pre className="mt-3 min-h-0 flex-1 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          {md}
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy()}
            className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-slate-800 px-4 text-sm font-bold text-white"
          >
            {copied ? '已复制 ✓' : '📋 复制全文'}
          </button>
          <button
            type="button"
            data-testid={`${testId}-download`}
            onClick={download}
            className={`flex h-12 flex-1 items-center justify-center rounded-2xl ${accentClass} px-4 text-sm font-bold text-white`}
          >
            ⬇️ 下载 .md
          </button>
        </div>
      </div>
    </div>
  );
}
