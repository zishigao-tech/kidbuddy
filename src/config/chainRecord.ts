/**
 * 链式教学 · 课堂记录
 *
 * 和 DTT 的记录差别不在字段，在**记录单位**：
 *   DTT     一次课 4 道题 × 2 遍 = 8 个试次，一题一个 0/1/2
 *   链式    1 条链 × N 遍 × M 步，一步一个辅助等级
 *
 * 为什么必须细到「步」：
 *   「洗手 2 分」没有信息量，老师不知道该从哪退辅助；
 *   「从第 6 步搓手背开始要提示」直接就能用。
 *
 * 三条约定的口径：
 *
 * 1. **没记录 ≠ 没做到**。走完一遍的常态是顺利，异常才需要点。
 *    所以记录页默认每步是「独立」，老师只在卡住的步上改。
 *    代价是漏记会虚高，所以每遍结束时要有一次确认（页面负责）。
 *
 * 2. **每遍单独统计，不合并**。同一个 order 在多遍里各有一条记录，
 *    合并会把「第 3 遍已经独立了」压成「第 1 遍的提示」。
 *    一节课的价值恰恰在遍与遍之间的变化。
 *
 * 3. **targetSteps 每遍单独算**。老师可能中途换排法（反向换全任务），
 *    换了之后「哪些步归孩子做」就变了，不能拿第一遍的范围套最后一遍。
 *
 * 落盘策略：不新建 book，把 runs 挂进现有的 ExpressionSession。
 * 否则 nextSessionNo 会在两个 book 里各算各的，第 7 课时同时出现在两个文件里。
 * 这个文件只负责 runs 这一段，Session 的其余部分仍然归 kidExpression.ts。
 *
 * 纯逻辑，只依赖 chainTraining（值）与 dtt（类型），可被 node 单测加载。
 */

import type { DttPromptLevel } from './dtt';
import { getChainTarget } from './chainTargets';
import {
  chainPlan,
  chainStats,
  nextProgress,
  pct,
  CHAIN_MODE_META,
  type ChainMode,
  type ChainPlan,
  type ChainProgress,
  type ChainStats,
  type ChainStepRecord,
  type ChainTarget,
} from './chainTraining';

// ---------------------------------------------------------------------------
// 辅助等级标签
// ---------------------------------------------------------------------------

/**
 * 值沿用 DTT 的四级（dtt.ts 的 DttPromptLevel），只换标签。
 *
 * 为什么不新造一套：两套等级一旦分叉，导出到同一份记录里就没法横向比较；
 * 而且褪除顺序（独立 → 口头 → 示范 → 手把手）本来就是同一条。
 *
 * 为什么换标签：DTT 的 `model` 写的是「示范后仿说」，那是语言目标的说法。
 * 生活技能里孩子不是「仿说」，是「照着做」。
 */
export const CHAIN_PROMPT_LABELS: Record<DttPromptLevel, { label: string; short: string; desc: string }> = {
  independent: { label: '独立完成', short: '独立', desc: '没给任何提示，他自己做完了这一步' },
  verbal: { label: '口头提示', short: '提示', desc: '说了一句、指了一下，或给了二选一' },
  model: { label: '示范', short: '示范', desc: '我先做一遍给他看，他照着做' },
  physical: { label: '手把手', short: '帮做', desc: '带着他的手做，或替他把这一步做完' },
};

/** 从轻到重，顺序即褪除顺序。和 dtt.ts 的 DTT_PROMPT_LEVELS 必须一致（有测试守） */
export const CHAIN_PROMPT_ORDER: DttPromptLevel[] = ['independent', 'verbal', 'model', 'physical'];

export function promptShort(level: DttPromptLevel | null | undefined): string {
  return level ? (CHAIN_PROMPT_LABELS[level]?.short ?? '未记录') : '未记录';
}

/** 这一级是不是「给了帮助」。independent 之外都算 */
export function isHelped(level: DttPromptLevel): boolean {
  return level !== 'independent';
}

// ---------------------------------------------------------------------------
// 一遍
// ---------------------------------------------------------------------------

export interface ChainRun {
  /** 这一遍用的排法。中途换过也必须存下来，否则一周后回看不知道当时是怎么分工的 */
  mode: ChainMode;
  /** 这一遍开始时的已掌握步数，方向随 mode（反向链从尾部数） */
  mastered: number;
  /** 每一步的记录 */
  steps: ChainStepRecord[];
  /** 一句话：这一遍怎么了。可选，写「第 3 步开始要提示」这种 */
  note?: string;
}

export type ChainScore = 0 | 1 | 2;

const VALID_MODES: ChainMode[] = ['forward', 'backward', 'total'];
const VALID_PROMPTS: DttPromptLevel[] = ['independent', 'verbal', 'model', 'physical'];

function isMode(value: unknown): value is ChainMode {
  return typeof value === 'string' && (VALID_MODES as string[]).includes(value);
}

function isPromptLevel(value: unknown): value is DttPromptLevel {
  return typeof value === 'string' && (VALID_PROMPTS as string[]).includes(value);
}

/**
 * 清洗一遍的记录。旧数据、手改的 JSON、别的设备同步过来的都可能脏，
 * 脏一条不影响整节课——单条丢掉比整课丢掉好。
 */
export function normalizeRun(raw: unknown, target: ChainTarget): ChainRun | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.steps) || r.steps.length === 0) return null;

  const maxOrder = target.steps.length;
  const seen = new Set<number>();
  const steps: ChainStepRecord[] = [];
  for (const item of r.steps) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;
    const order = Number(s.order);
    if (!Number.isInteger(order) || order < 1 || order > maxOrder) continue;
    if (seen.has(order)) continue; // 同一步记两次，保留第一条，避免统计翻倍
    seen.add(order);
    steps.push({
      order,
      promptLevel: isPromptLevel(s.promptLevel) ? s.promptLevel : 'independent',
      done: s.done !== false, // 只有明确写了 false 才算没做到
      skipped: s.skipped === true,
    });
  }
  if (steps.length === 0) return null;

  return {
    mode: isMode(r.mode) ? r.mode : target.defaultMode,
    mastered: Number.isFinite(Number(r.mastered)) ? Math.max(0, Math.floor(Number(r.mastered))) : 0,
    steps: steps.sort((a, b) => a.order - b.order),
    note: typeof r.note === 'string' && r.note.trim() ? r.note.trim() : undefined,
  };
}

/** 清洗一节课的整组遍数。空数组是合法结果（还没记） */
export function normalizeRuns(raw: unknown, target: ChainTarget): ChainRun[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => normalizeRun(r, target)).filter((r): r is ChainRun => r !== null);
}

/**
 * 按 targetId 清洗，供 kidExpression.ts 调用。
 *
 * 链路被删掉时返回空数组而不是抛——旧记录里可能存着已经不存在的 A7，
 * 一条旧记录不该让整节课打不开。
 */
export function normalizeRunsFor(targetId: string, raw: unknown): ChainRun[] {
  const target = getChainTarget(targetId);
  if (!target) return [];
  return normalizeRuns(raw, target);
}

/** 这一遍的分工。老师可能中途换排法，所以每遍各算各的 */
export function planOf(target: ChainTarget, run: Pick<ChainRun, 'mode' | 'mastered'>): ChainPlan {
  return chainPlan(target, { mode: run.mode, mastered: run.mastered });
}

export interface ChainRunStat {
  /** 第几遍，从 1 开始 */
  index: number;
  mode: ChainMode;
  mastered: number;
  plan: ChainPlan;
  stats: ChainStats;
}

/** 单独一遍的统计 */
export function runStat(target: ChainTarget, run: ChainRun, index = 1): ChainRunStat {
  const plan = planOf(target, run);
  return {
    index,
    mode: run.mode,
    mastered: run.mastered,
    plan,
    stats: chainStats(target, run.steps, plan.targetSteps),
  };
}

// ---------------------------------------------------------------------------
// 一节课
// ---------------------------------------------------------------------------

export interface ChainSessionStats {
  runs: ChainRunStat[];
  /** 最后一遍——能力前沿看这个，不看平均 */
  last: ChainRunStat | null;
  /** 每遍独立完成的步数，用来画趋势 */
  trend: number[];
  /** 每遍的独立率 */
  rates: number[];
  /** 从第一遍到最后一遍，独立步数净增。负数也保留，退步一样要看见 */
  gain: number;
  /**
   * 最后一遍第一次需要帮助的步号。
   * 这是整节课最有用的一格——比完成度和平均独立率都有用。
   */
  frontier: number | null;
  /** 那个步叫什么，直接进导出正文 */
  frontierName: string | null;
}

export function sessionChainStats(target: ChainTarget, runs: ChainRun[]): ChainSessionStats {
  const list = runs.map((run, i) => runStat(target, run, i + 1));
  const last = list.length > 0 ? list[list.length - 1] : null;
  const trend = list.map((r) => r.stats.independent);
  const rates = list.map((r) => r.stats.independentRate);
  const gain = list.length >= 2 ? trend[trend.length - 1] - trend[0] : 0;
  const frontier = last?.stats.firstPromptStep ?? null;
  const frontierName = frontier === null ? null : (target.steps.find((s) => s.order === frontier)?.name ?? null);

  return { runs: list, last, trend, rates, gain, frontier, frontierName };
}

/** 遍间趋势一句话：`独立 3 步 → 5 步 → 6 步` */
export function trendLine(stats: ChainSessionStats): string {
  if (stats.trend.length === 0) return '（还没有记录）';
  if (stats.trend.length === 1) return `独立 ${stats.trend[0]} 步`;
  return `独立 ${stats.trend.join(' 步 → ')} 步`;
}

/** 趋势方向，页面用它决定标绿还是标灰 */
export function trendDirection(stats: ChainSessionStats): 'up' | 'down' | 'flat' | 'single' {
  if (stats.trend.length < 2) return 'single';
  if (stats.gain > 0) return 'up';
  if (stats.gain < 0) return 'down';
  return 'flat';
}

/**
 * 建议分数。口径不另立一套，对齐 kidExpression.ts 的 SCORE_RUBRIC：
 *   2 分 = 无提示独立完成且达成率 ≥80%
 *   1 分 = 提示后出现或达成率 50%–80%
 *   0 分 = 其余
 *
 * 但这里的「达成率」是**最后一遍的独立完成步数占比**，不是试次正确率——
 * 链式教学看的是一节课结束时走到哪，不是全程平均。全程平均会被前几遍拖低，
 * 反而看不出进步。
 */
export function suggestChainScore(stats: ChainSessionStats): ChainScore | null {
  if (!stats.last || stats.last.stats.total === 0) return null;
  const rate = stats.last.stats.independentRate;
  if (rate >= 0.8) return 2;
  if (rate >= 0.5) return 1;
  return 0;
}

/** 这节课结束时该是什么进度，下次课直接拿来初始化 */
export function progressAfter(
  target: ChainTarget,
  runs: ChainRun[],
  start: { mode: ChainMode; mastered: number },
): ChainProgress {
  let progress: ChainProgress = { mode: start.mode, mastered: start.mastered };
  let streak = 0;

  for (const run of runs) {
    // 分工按「这一遍开始时的进度」算，所以要在换 mode 之前算
    const plan = chainPlan(target, progress);
    progress = { mode: run.mode, mastered: progress.mastered };

    const focus = plan.focusStep;
    if (focus === null) {
      streak = 0; // 全任务模式不步进，看整条链的独立完成率
      continue;
    }

    const rec = run.steps.find((s) => s.order === focus);
    const ok = !!(rec && rec.done && rec.promptLevel === 'independent' && !rec.skipped);
    streak = ok ? streak + 1 : 0;

    const before = progress.mastered;
    progress = nextProgress(target, progress, streak);
    if (progress.mastered > before) streak = 0;
  }

  return progress;
}

// ---------------------------------------------------------------------------
// 三行记录
// ---------------------------------------------------------------------------

export interface ChainThreeLines {
  did: string;
  achieved: string;
  stuck: string;
}

/** 自动草稿，老师可以改。改完再落盘 */
export function composeChainThreeLines(target: ChainTarget, runs: ChainRun[]): ChainThreeLines {
  if (runs.length === 0) {
    return { did: `练${target.name}`, achieved: '（还没记）', stuck: '（还没记）' };
  }

  const stats = sessionChainStats(target, runs);
  const modes = Array.from(new Set(runs.map((r) => CHAIN_MODE_META[r.mode]?.label ?? r.mode)));
  const firstPlan = stats.runs[0]?.plan;

  // 只有一遍时把分工说出来（「第 1–4 步我做完，第 5–9 步他自己做」），
  // 多遍就只说遍数和排法——每遍分工会不一样，一句概括反而错。
  const did =
    modes.length > 0
      ? `${target.name}练 ${runs.length} 遍，${modes.join(' / ')}${runs.length === 1 && firstPlan?.line ? `：${firstPlan.line}` : ''}`
      : `${target.name}练 ${runs.length} 遍`;

  const last = stats.last;
  const achieved = last
    ? `共 ${last.stats.total} 步，独立完成 ${last.stats.independent} 步，最后一遍独立率 ${pct(last.stats.independentRate)}%${
        stats.gain > 0 ? `；比第 1 遍多 ${stats.gain} 步` : ''
      }`
    : '（还没记）';

  const stuck =
    stats.frontier === null
      ? '全程没给辅助'
      : `从第 ${stats.frontier} 步「${stats.frontierName ?? ''}」开始需要帮助`;

  return { did, achieved, stuck };
}

// ---------------------------------------------------------------------------
// 导出片段
// ---------------------------------------------------------------------------

/**
 * 步骤 × 遍 的矩阵。
 *
 * 这张表是 DTT 给不了的：它同时回答「卡在哪一步」和「这一节课有没有往前走」。
 * 第 7 步从「示范」到「提示」到「独立」，就是辅助成功褪除的证据。
 */
export function buildStepMatrix(target: ChainTarget, runs: ChainRun[]): string {
  if (runs.length === 0) return '';

  const plans = runs.map((run) => planOf(target, run));
  // 只列「至少有一遍是要孩子做的步」：老师代做的步不该出现在孩子的达成表里
  const wanted = new Set<number>();
  for (const p of plans) for (const o of p.targetSteps) wanted.add(o);
  const orders = Array.from(wanted).sort((a, b) => a - b);
  if (orders.length === 0) return '';

  const head = ['| 步 | 这一步 |', ...runs.map((_, i) => ` 第 ${i + 1} 遍 |`)].join('');
  const sep = ['| --- | --- |', ...runs.map(() => ' --- |')].join('');

  const rows = orders.map((order) => {
    const step = target.steps.find((s) => s.order === order);
    const cells = runs.map((run, i) => {
      const inScope = plans[i].targetSteps.includes(order);
      if (!inScope) return '我代做';
      const rec = run.steps.find((s) => s.order === order);
      if (!rec) return '—';
      if (rec.skipped) return '不适用';
      // 给了辅助还是没做成，两个信息都要留：
      // 只写「没做到」就看不出当时是手把手还是只说了句提示，而这决定了下次从哪一级开始退。
      if (!rec.done) return rec.promptLevel === 'independent' ? '没做到' : `${promptShort(rec.promptLevel)}✗`;
      return promptShort(rec.promptLevel);
    });
    return `| ${order} | ${step?.name ?? ''} | ${cells.join(' | ')} |`;
  });

  return [head, sep, ...rows].join('\n');
}

/** 一整节链式课的导出片段：三行记录 + 矩阵 + 遍间变化 */
export function buildChainSection(target: ChainTarget, runs: ChainRun[]): string {
  const lines: string[] = [];
  const stats = sessionChainStats(target, runs);
  const three = composeChainThreeLines(target, runs);

  lines.push('**课堂记录（三行）**');
  lines.push('');
  lines.push(`- **今天做了什么**：${three.did}`);
  lines.push(`- **做到了什么**：${three.achieved}`);
  lines.push(`- **卡在哪**：${three.stuck}`);
  lines.push('');

  const matrix = buildStepMatrix(target, runs);
  if (matrix) {
    lines.push('**目标达成（按步骤）**');
    lines.push('');
    lines.push(matrix);
    lines.push('');
    if (runs.length >= 2) {
      lines.push(`**遍间变化**：${trendLine(stats)}${stats.gain > 0 ? `（+${stats.gain}）` : stats.gain < 0 ? `（${stats.gain}）` : ''}`);
      lines.push('');
    }
  }

  if (runs.some((r) => r.note?.trim())) {
    lines.push('**每遍备注**');
    lines.push('');
    runs.forEach((run, i) => {
      if (run.note?.trim()) lines.push(`- 第 ${i + 1} 遍：${run.note.trim()}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 按 targetId 导出整节，供 kidExpression.ts 调用。
 * 链被删掉时返回空串，调用方退回 DTT 格式，不要让整节课导出失败。
 */
export function chainSectionFor(targetId: string, runs: ChainRun[]): string {
  const target = getChainTarget(targetId);
  if (!target || runs.length === 0) return '';
  return buildChainSection(target, runs);
}

/**
 * 这条链叫什么。只给 kidExpression 的「目标」行用——
 * 链的编号是 A5 / P3，直接当名字拼出去会写成「A5 A5」。
 */
export function chainTargetName(targetId: string): string | null {
  return getChainTarget(targetId)?.name ?? null;
}
