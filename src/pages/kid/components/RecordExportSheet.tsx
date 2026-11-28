import { buildSessionMarkdown, sessionFileName, type ExpressionSession } from '@/config/kidExpression';
import { MarkdownExportSheet } from './MarkdownExportSheet';

/** 把一份课时记录导出成可并入「上课记录」目录的 markdown */
export function RecordExportSheet({
  session,
  accentClass = 'bg-rose-500',
  onClose,
}: {
  session: ExpressionSession;
  accentClass?: string;
  onClose: () => void;
}) {
  return (
    <MarkdownExportSheet
      title="课堂记录已生成"
      fileName={sessionFileName(session)}
      md={buildSessionMarkdown(session)}
      accentClass={accentClass}
      onClose={onClose}
      testId="expression-export-sheet"
    />
  );
}
