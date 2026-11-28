import { SCORE_LABEL } from '@/config/kidExpression';

/**
 * 分数怎么上色，只在这里定义一次。
 * 三个模块（说说小课堂 / 认知理解 / 生活小能手）的底部记录都读这一份，
 * 否则同是 2 分，一页绿一页黄，老师会以为哪里出错了。
 */
export function scoreChipClass(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500';
  if (score === 2) return 'bg-emerald-100 text-emerald-700';
  if (score === 1) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

/** 走势里的小方块：比 ScoreChip 窄，一排放得下一节课 */
export function scoreDotClass(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-400';
  return scoreChipClass(score);
}

export function ScoreChip({ score }: { score: number | null }) {
  if (score === null) {
    return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreChipClass(null)}`}>未打分</span>;
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreChipClass(score)}`}>
      {score} 分 · {SCORE_LABEL[score as 0 | 1 | 2]}
    </span>
  );
}
