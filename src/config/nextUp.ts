/**
 * 「下次练什么 / 上次练到哪」——首页三张带练卡底下那两行，列表页顶部那条横幅也用它。
 *
 * 单独放一个文件，是因为它得同时摸三个模块的账本。口径必须和模块内部
 * **完全一致**：首页说「下次练刷牙」、点进去却指向洗手，老师只会当成 bug。
 * 所以这里出的是唯一一份答案，页面不许各算一遍。
 *
 * 两套「稳了」的口径不一样，别统一：
 * - 语言表达 / 认知：同一授课主体连续两次 2 分（跨主体只算待复核）
 * - 生活技能：最近一节课 2 分 —— 一次课就练 2–3 遍，再要两次课太慢
 *
 * 读账本失败一律返回 null：首页是孩子的门面，宁可这行不显示，也不能白屏。
 */
import { CHAIN_BAND_META } from './chainTraining';
import type { ExpressionBand } from './expressionTargets';
import { CHAIN_TARGETS, getChainTarget, suggestNextChain } from './chainTargets';
import { LIFE_MODULE } from './chainModule';
import { sessionChainStats } from './chainRecord';
import { loadBookFrom, sessionsOf, targetStat, type ExpressionSession } from './kidExpression';
import type { LessonModule } from './lessonModules';

export interface NextUp {
  /** 练什么，卡片上直接显示 */
  label: string;
  /** 点了能直达这条目标。首页卡上的「⚡ 直接练」用它拼路由 */
  path: string;
  /** 名字右边的补充：学段 · 步数，或者目标编号 */
  meta: string;
  /**
   * 上次上课练到哪，**极短**：链式是「5/9」（最后一遍独立几步 / 共几步），
   * DTT 是「2 分」。三列卡只有约 200px 文字区，写成「上次独立 5/9 步」会把名字挤掉。
   */
  last?: string;
}

/** 这个模块的账记在谁头上。和模块自己的页面一样从 localStorage 读 */
export function studentOf(scope: string, fallback: string): string {
  try {
    return localStorage.getItem(`${scope}.student`) || fallback;
  } catch {
    return fallback;
  }
}

/**
 * 链式课的「稳了」= 最近一节课拿了 2 分。
 * 不要求连续两次：一次课就把同一条链练 2–3 遍，再要求两次课，节奏太慢，
 * 家长会以为没在推进。
 */
export function chainStableIds(mine: ExpressionSession[]): string[] {
  const latest = new Map<string, ExpressionSession>();
  for (const s of mine) latest.set(s.targetId, s); // mine 已按日期升序，后面的覆盖前面的
  return Array.from(latest.entries())
    .filter(([, s]) => s.score === 2)
    .map(([id]) => id);
}

/**
 * 最近一次练的那条链属于哪一段。「下次练」据此优先在同段里往下走——
 * 3-6 岁练完洗手，再被建议回 0-3 岁练用杯喝水，这条建议就没人会照做。
 */
export function lastBandOf(mine: ExpressionSession[]): ExpressionBand | undefined {
  for (let i = mine.length - 1; i >= 0; i -= 1) {
    const band = getChainTarget(mine[i].targetId)?.band;
    if (band) return band;
  }
  return undefined;
}

/**
 * 这个模块最近一次课练到哪。
 *
 * 链式课取**最后一遍**的独立步数：全程平均会被前几遍拖低，看不出现在的水平。
 * 口径和练习台、列表卡完全一致，都是 sessionChainStats。
 */
function chainLast(mine: ExpressionSession[]): string | undefined {
  const last = mine[mine.length - 1];
  if (!last?.runs?.length) return undefined;
  const target = getChainTarget(last.targetId);
  if (!target) return undefined;
  const st = sessionChainStats(target, last.runs);
  if (!st.last) return undefined;
  return `${st.last.stats.independent}/${st.last.stats.total}`;
}

/** 生活技能：按难度顺序取第一条还没稳的链，优先同段 */
export function chainNextUp(fallbackStudent: string): NextUp | null {
  const book = loadBookFrom(LIFE_MODULE.bookKey);
  const mine = sessionsOf(book, studentOf(LIFE_MODULE.storagePrefix, fallbackStudent));
  const next = suggestNextChain(chainStableIds(mine), lastBandOf(mine));
  const last = chainLast(mine);
  if (!next) {
    return { label: '全部练稳了', path: LIFE_MODULE.basePath, meta: `${CHAIN_TARGETS.length} 条都稳了`, last };
  }
  return {
    label: next.name,
    path: `${LIFE_MODULE.basePath}/${next.id}`,
    meta: `${CHAIN_BAND_META[next.band].short} 岁 · ${next.steps.length} 步`,
    last,
  };
}

/** 语言表达 / 认知：按难度顺序取第一个还没稳的目标 */
export function dttNextUp(module: LessonModule, fallbackStudent: string): NextUp | null {
  const book = loadBookFrom(module.bookKey);
  const student = studentOf(module.storagePrefix, fallbackStudent);
  const mine = sessionsOf(book, student);
  const stableIds = module.targets
    .filter((t) => targetStat(book, student, t.id).status === 'stable')
    .map((t) => t.id);
  const next = module.suggestNext(stableIds);
  const lastSession = mine[mine.length - 1];
  const last = lastSession ? (lastSession.score === null ? '未打分' : `${lastSession.score} 分`) : undefined;
  if (!next) {
    return { label: '全部练稳了', path: module.basePath, meta: `${module.targets.length} 个目标都稳了`, last };
  }
  // 只给编号：名字已经说清练什么了，卡片三列只有 250px 宽，再塞学段会把名字挤掉
  return { label: next.name, path: `${module.basePath}/${next.id}`, meta: next.id, last };
}
