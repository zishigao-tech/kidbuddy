/**
 * 链式教学（Chaining）· 结构、算法与统计
 *
 * 为什么生活技能和解决问题不用 DTT 的「试次」——
 * 这两块的内容本身是**行为链**，不是离散回合：
 *   洗手 9 步、整理书包 6 步、走散了 5 步。
 * 用 DTT 的抽题逻辑去拆它，等于把一条链打断成互不相干的碎片，
 * 孩子每一步都会做，但连起来还是不会。
 *
 * 链式教学的三件事，缺一不可：
 *   1. 任务分析（Task Analysis）——把整条链拆出来，每步一句指令、一个可观察的完成标准
 *   2. 链式排法（forward / backward / total）——决定这一遍由谁做哪几步
 *   3. 视觉支持——一次只呈现当前这一步，不要一次摊开 8 张卡
 *
 * 三种排法各自适合谁：
 *   - backward 反向链：老师做完前面所有步，只让孩子做最后一步。
 *     孩子每次都能拿到「我完成了」的结果，挫败感强、动机弱的孩子首选。
 *     代价是「开头」最难——所以反向链走到最后一步才算真的会。
 *   - forward 正向链：从第 1 步教起。逻辑顺，但孩子要等很久才摸到结果。
 *   - total 全任务呈现：每次从头做到尾，不会的步给辅助。适合只差两三步的孩子。
 *
 * 「已掌握的步数」方向不同，这是本文件最容易读错的地方：
 *   forward / total 从第 1 步往后数，backward 从最后一步往前数。
 * 所以进度必须带上 mode 一起存，不能只存一个数字。
 *
 * 纯逻辑，无运行时依赖（只 import type），可直接被 node 单测加载。
 */

import type { DttPromptLevel } from './dtt';
import type { ExpressionBand, SettingId } from './expressionTargets';

/** 两个分组：生活技能 / 解决问题。它们共用同一套链式结构，只是内容不同。 */
export type ChainGroup = 'skill' | 'problem';

export const CHAIN_GROUP_META: Record<ChainGroup, { label: string; emoji: string; desc: string }> = {
  skill: {
    label: '自己的事自己做',
    emoji: '🧼',
    desc: '刷牙、收拾书包、用钱买东西——日常流程里的固定顺序，练的是「不用提醒也能一路做下来」',
  },
  problem: {
    label: '遇到事怎么办',
    emoji: '🛟',
    desc: '不会做、东西被拿走、走散了——卡住时的头几步，练的是「先做什么，再做什么」',
  },
};

/**
 * 链式排法。
 * 注意这不是「难度等级」——同一目标在不同阶段会换排法，
 * 比如穿裤子先反向链（他会提上去），熟练后再换全任务呈现。
 */
export type ChainMode = 'forward' | 'backward' | 'total';

export const CHAIN_MODE_META: Record<ChainMode, { label: string; short: string; desc: string }> = {
  forward: {
    label: '正向链',
    short: '正向',
    desc: '从第 1 步教起，会一步加一步，后面的老师代做',
  },
  backward: {
    label: '反向链',
    short: '反向',
    desc: '老师做完前面所有步，只让孩子做最后一步；会了往前扩一步',
  },
  total: {
    label: '全任务',
    short: '全任务',
    desc: '每次从头做到尾，卡在哪一步就在哪一步给辅助',
  },
};

/** 一步。顺序、指令、完成标准三样必须有，缺一个现场就没法判。 */
export interface ChainStep {
  /** 步骤序号，从 1 开始，必须连续不跳号 */
  order: number;
  /** 这一步叫什么，2-6 字，进进度条和记录 */
  name: string;
  /** 老师在这一步说的指令。短、单一，一次只说一遍 */
  sd: string;
  /**
   * 这一步**不给指令**，等孩子自己启动。
   *
   * 「解决问题」这类链的前几步都是自发启动的：停手、看大人、开口。
   * 老师一给指令，就变成「听指令去做」而不是「遇到事自己想起来做」——
   * 这是整个 P 组最容易教错的地方，所以用字段标出来，UI 上要显式提示「别说话」。
   */
  selfInitiated?: boolean;
  /** 什么算这一步做到了。写可观察的动作，不写「理解」「知道」 */
  criterion: string;
  /** 卡住时给的提示，从轻到重写，用 / 分隔 */
  hint: string;
  /**
   * 这一步可能不适用（没有热水龙头、今天没穿外套）。
   * 跳过的步不计入分母，否则完成度会被环境拖低。
   */
  optional?: boolean;
}

export interface ChainFamilyGuide {
  /** 在家怎么接着练，一句话 */
  how: string;
  /** 家长最容易帮倒忙的地方 */
  avoid: string;
}

export interface ChainTarget {
  /** A1 / P2 这种，A = 生活自理，P = 解决问题 */
  id: string;
  name: string;
  group: ChainGroup;
  band: ExpressionBand;
  /** 由易到难，1 最容易。组内连续、不跳号 */
  difficulty: number;
  /** 能在哪些场景练，首元素 = 主场景 */
  settings: SettingId[];
  /** 一句话说清练什么 */
  summary: string;
  /** 学期口径的 2 分标准（skill 原文口径） */
  standard2: string;
  /** 常见 1 分情形 */
  onePenalty: string;
  /** 一节课的达标线，不要拿学期口径判一节课 */
  sessionSuccess: string;
  /**
   * 对应 skill「课堂记录量化工具」goal-codes.md 里的哪一条，如 'J3'。
   * 只作对照用，**编号本身不沿用段位码**——段位码是单回合目标，这里是链，
   * 一条链可能横跨好几条段位，硬套会让记录对不上账。
   */
  skillRef?: string;
  /** 现场要准备的东西。生活技能的物品是固定的，没得选，所以不用教具槽位那一套 */
  needs: string[];
  /** 首选排法，老师可改 */
  defaultMode: ChainMode;
  /** 一节课建议练几遍（注意是「遍」，不是「道题」） */
  sessionRuns: number;
  steps: ChainStep[];
  familyGuide: ChainFamilyGuide;
}

/** 进度：必须和 mode 一起存，因为 backward 的 mastered 是从后往前数的 */
export interface ChainProgress {
  mode: ChainMode;
  /** 已掌握的步数。forward / total 从第 1 步数，backward 从最后一步数 */
  mastered: number;
}

/** 一遍做下来，每一步的记录 */
export interface ChainStepRecord {
  order: number;
  promptLevel: DttPromptLevel;
  /** 这一步做到了没有。给了辅助但做出来了，done 仍然是 true */
  done: boolean;
  /** 现场判定不适用（没热水、今天没穿外套），不进分母 */
  skipped?: boolean;
}

export interface ChainPlan {
  mode: ChainMode;
  /** 这一遍孩子自己做的步骤序号 */
  targetSteps: number[];
  /** 这一遍老师代做的步骤序号 */
  helpSteps: number[];
  /** 这一遍重点教的那一步。total 模式没有重点步，为 null */
  focusStep: number | null;
  /** 链的总步数 */
  total: number;
  /** 已掌握的步数（方向随 mode） */
  mastered: number;
  /** 一句话：这一遍怎么走。给带课的人看，也直接进课堂记录 */
  line: string;
}

/** 连续几遍独立完成才算「这一步掌握了」。3 遍是常用的稳一点的口径，2 遍偏激进。 */
export const CHAIN_MASTER_STREAK = 3;

const range = (from: number, to: number): number[] => {
  const out: number[] = [];
  for (let i = from; i <= to; i += 1) out.push(i);
  return out;
};

/** 把掌握步数钳到合法区间，防止旧记录或手改配置带进越界值 */
export function clampMastered(chain: ChainTarget, value: number): number {
  const n = chain.steps.length;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(n, Math.floor(value)));
}

export function normalizeProgress(chain: ChainTarget, progress: Partial<ChainProgress> | null | undefined): ChainProgress {
  const mode: ChainMode =
    progress?.mode === 'forward' || progress?.mode === 'backward' || progress?.mode === 'total'
      ? progress.mode
      : chain.defaultMode;
  return { mode, mastered: clampMastered(chain, Number(progress?.mastered ?? 0)) };
}

/**
 * 算出这一遍该怎么走。
 *
 * 三种排法的差别只在这三行里：
 *   forward   已会 1..k    → 教第 k+1 步，后面老师做完
 *   backward  已会后 m 步  → 教第 n-m 步，前面老师做完
 *   total     不分工        → 全部孩子做，卡住给辅助
 */
export function chainPlan(chain: ChainTarget, progress: Partial<ChainProgress> | null | undefined): ChainPlan {
  const n = chain.steps.length;
  const { mode, mastered } = normalizeProgress(chain, progress);

  if (n === 0) {
    return { mode, targetSteps: [], helpSteps: [], focusStep: null, total: 0, mastered: 0, line: '这条链还没有步骤' };
  }

  if (mode === 'total') {
    return {
      mode,
      targetSteps: range(1, n),
      helpSteps: [],
      focusStep: null,
      total: n,
      mastered,
      line: mastered > 0 ? `从第 1 步做到第 ${n} 步，前 ${mastered} 步应该不用辅助` : `从第 1 步做到第 ${n} 步，卡在哪一步就在哪一步给辅助`,
    };
  }

  if (mode === 'backward') {
    // mastered 从尾部往头部数：最后 mastered 步已经稳了
    const focus = Math.max(1, n - mastered);
    const taught = range(focus, n);
    const help = range(1, focus - 1);
    const line =
      help.length === 0
        ? `整条链他自己做，重点看第 ${focus} 步`
        : `第 1–${focus - 1} 步我做完，第 ${focus}–${n} 步他自己做（重点第 ${focus} 步）`;
    return { mode, targetSteps: taught, helpSteps: help, focusStep: focus, total: n, mastered, line };
  }

  // forward：已会 1..mastered，教下一条
  const focus = Math.min(n, mastered + 1);
  const targeted = range(1, focus);
  const help = mastered >= n ? [] : range(focus + 1, n);
  const line =
    mastered >= n
      ? `整条链他自己做，共 ${n} 步`
      : mastered === 0
        ? `第 ${focus} 步我教，第 ${focus + 1}–${n} 步我做完`
        : `前 ${mastered} 步他自己做，第 ${focus} 步我教，第 ${focus + 1}–${n} 步我做完`;
  return { mode, targetSteps: targeted, helpSteps: help, focusStep: focus, total: n, mastered, line };
}

/**
 * 这一遍练完，进度该不该往前走。
 *
 * @param streak 当前重点步连续独立完成的遍数（含这一遍）。
 *   只有达到 CHAIN_MASTER_STREAK 才 +1，否则原地不动——
 *   免得「蒙对一次」就把辅助退掉了。
 *
 * total 模式不步进：全任务呈现看的是整条链的独立完成率，
 * 不是「第几步会了」，所以进度靠 chainStats 里的 independentSteps 反映。
 */
export function nextProgress(chain: ChainTarget, progress: Partial<ChainProgress> | null | undefined, streak: number): ChainProgress {
  const current = normalizeProgress(chain, progress);
  if (current.mode === 'total') return current;
  if (!Number.isFinite(streak) || streak < CHAIN_MASTER_STREAK) return current;
  const n = chain.steps.length;
  if (current.mastered >= n) return current;
  return { mode: current.mode, mastered: current.mastered + 1 };
}

export interface ChainStats {
  /** 要做的步数（不含跳过） */
  total: number;
  /** 记录里有几条 */
  recorded: number;
  done: number;
  skipped: number;
  /** 全程没给辅助且做到的步数 */
  independent: number;
  /** 完成度 = done ÷ total */
  completion: number;
  /** 独立率 = independent ÷ total */
  independentRate: number;
  /** 最长连续无辅助完成 */
  maxIndependentStreak: number;
  /**
   * 第一次需要帮助的步号 —— 这是「孩子的能力前沿」。
   *
   * 比完成度高信息量：完成度 100% 也可能是全程手把手，
   * 而 firstPromptStep = 4 直接告诉你「辅助该从第 4 步往后退」。
   */
  firstPromptStep: number | null;
  /** 各辅助等级用了多少次 */
  promptCount: Record<DttPromptLevel, number>;
}

const emptyPromptCount = (): Record<DttPromptLevel, number> => ({
  independent: 0,
  verbal: 0,
  model: 0,
  physical: 0,
});

/**
 * 一遍（或几遍合并）的统计。
 *
 * @param targetSteps 这一遍要孩子做的步（chainPlan.targetSteps）。
 *   **必须传**，否则反向链里老师代做的那几步会被算成孩子没做到，
 *   完成度会凭空掉一半。不传时退化成「统计全链」，只适合全任务模式。
 *
 * 跳过步单独计数并从分母里去掉：环境不具备不算孩子没做到。
 * 这条不处理，一次「没热水」就能让完成度凭空掉 12%。
 */
export function chainStats(chain: ChainTarget, records: ChainStepRecord[], targetSteps?: number[]): ChainStats {
  const byOrder = new Map<number, ChainStepRecord>();
  for (const r of records) {
    if (!byOrder.has(r.order)) byOrder.set(r.order, r);
  }
  const scope = targetSteps ? new Set(targetSteps) : null;

  const promptCount = emptyPromptCount();
  let total = 0;
  let done = 0;
  let skipped = 0;
  let independent = 0;
  let streak = 0;
  let maxStreak = 0;
  let firstPromptStep: number | null = null;

  for (const step of chain.steps) {
    if (scope && !scope.has(step.order)) continue;
    const r = byOrder.get(step.order);
    if (r?.skipped) {
      skipped += 1;
      continue;
    }
    total += 1;
    if (!r) {
      streak = 0;
      continue;
    }

    promptCount[r.promptLevel] = (promptCount[r.promptLevel] ?? 0) + 1;

    if (r.done && r.promptLevel === 'independent') {
      done += 1;
      independent += 1;
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
      if (r.done) done += 1;
      // 没做到也算前沿：卡住的地方就是辅助该出现的地方
      if (firstPromptStep === null) firstPromptStep = step.order;
    }
  }

  return {
    total,
    recorded: byOrder.size,
    done,
    skipped,
    independent,
    completion: total === 0 ? 0 : done / total,
    independentRate: total === 0 ? 0 : independent / total,
    maxIndependentStreak: maxStreak,
    firstPromptStep,
    promptCount,
  };
}

/** 记录页要填的「三行记录」里的第一行，省得老师自己组织语言 */
export function chainLine(stats: ChainStats, chain: ChainTarget): string {
  if (stats.total === 0) return '这条链这一次没有可做的步骤';
  const head = `共 ${stats.total} 步，独立完成 ${stats.independent} 步`;
  if (stats.firstPromptStep === null) return `${head}，全程没给辅助`;
  const step = chain.steps.find((s) => s.order === stats.firstPromptStep);
  return `${head}，从第 ${stats.firstPromptStep} 步「${step?.name ?? ''}」开始需要帮助`;
}

/** 百分比取整，避免 UI 上出现 66.66666% */
export function pct(value: number): number {
  return Math.round(value * 100);
}

/** 这一步在当前进度下是不是「重点步」，列表页用来加标记 */
export function isFocusStep(plan: ChainPlan): (order: number) => boolean {
  return (order: number) => plan.focusStep !== null && order === plan.focusStep;
}
