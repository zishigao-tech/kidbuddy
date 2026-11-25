/**
 * 老师手调难度
 *
 * 配置里的 difficulty / settingDifficulty 是「通用口径」——按语言操作获得顺序
 * 排出来的、对所有孩子都成立的大致先后。但真实课堂里总有例外：
 * 这个孩子认颜色特别快，C4 该往前挪；那个孩子怕椅子，C7 在地面上一直是坎。
 * 老师看着整个列表最清楚该往哪插，所以给一套本地覆盖，不动配置文件。
 *
 * 三个取舍：
 *
 * 1. **调的是「顺序号」，不是「档位」**。界面上的圆圈数字是全表台阶，
 *    老师上下调一格就是「让它排到前一个/后一个目标旁边」。不做成
 *    「容易/中等/难」三档，因为三档撑不住 23 个目标，调完看不出位置。
 *
 * 2. **在哪一栏调，就只影响那一栏**。列表筛了「地面」时调的是这个目标在地面
 *    的难度，切回「全部场景」时全表台阶不变。一个目标在地面比在桌面难得多
 *    （C7 就是），共用一个数会互相拉扯。
 *
 * 3. **覆盖存在本机，不进课堂记录**。这是老师排课的顺序习惯，不是孩子的成绩；
 *    换台机器要重调是已知代价，换来的是不会污染导出给家长的记录。
 *    以后要按孩子分，把 storage key 加上 student 即可，数据结构不用动。
 *
 * 本文件不 import 任何运行时模块（类型 import 会被擦除），
 * 能被 node 用 ts.transpileModule 直接跑单测。
 */

import type { ExpressionTarget, SettingId } from './expressionTargets';

export interface TargetTuning {
  /** 覆盖全表台阶；不填表示用配置值 */
  difficulty?: number;
  /** 覆盖某个场景下的难度；没写的场景继承台阶 */
  settingDifficulty?: Partial<Record<SettingId, number>>;
  /** 最后一次调整时间，用于「刚调过」的提示和排查 */
  updatedAt: number;
}

/** targetId → 覆盖项；没有条目的目标完全走配置值 */
export type TuningBook = Record<string, TargetTuning>;

/** 难度合法区间：下界是台阶起点，上界给足余量（现在全表 12 级） */
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 30;

export function emptyTuning(): TuningBook {
  return {};
}

function isDifficulty(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_DIFFICULTY && value <= MAX_DIFFICULTY;
}

/**
 * 把 localStorage 里读到的东西洗成可信的 book。
 * 微信开发者工具里手改过 localStorage、或者旧版本残留脏数据时，
 * 直接信任会导致整个列表排序 NaN，所以逐个字段校验，坏的就丢掉。
 */
export function normalizeTuning(raw: unknown): TuningBook {
  const out: TuningBook = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [targetId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!targetId || !entry || typeof entry !== 'object') continue;
    const e = entry as Partial<TargetTuning>;
    const next: TargetTuning = { updatedAt: Number(e.updatedAt) || 0 };
    if (isDifficulty(e.difficulty)) next.difficulty = e.difficulty;
    if (e.settingDifficulty && typeof e.settingDifficulty === 'object') {
      const per: Partial<Record<SettingId, number>> = {};
      for (const [scene, value] of Object.entries(e.settingDifficulty)) {
        if (isDifficulty(value)) per[scene as SettingId] = value;
      }
      if (Object.keys(per).length > 0) next.settingDifficulty = per;
    }
    // 两个字段都没洗出来就是空条目，留着只会让「已调过」的判断误报
    if (next.difficulty !== undefined || next.settingDifficulty) out[targetId] = next;
  }
  return out;
}

/** 全表台阶：被调过就用调过的 */
export function tunedDifficulty(target: Pick<ExpressionTarget, 'id' | 'difficulty'>, book: TuningBook): number {
  return book[target.id]?.difficulty ?? target.difficulty;
}

/**
 * 场景难度，优先级从高到低：
 *   老师调的场景覆盖 → 配置里的场景难度 → 老师调的台阶 → 配置台阶
 *
 * 「老师调的台阶」排在「配置里的场景难度」之后，是为了让两处调整互不踩踏：
 * C7 全表 7、地面 3，老师在「全部场景」把 C7 挪到 5 时，地面的 3 应该原地不动。
 * 如果台阶覆盖优先，地面的 3 会一起变成 5——明明只调了全表，地面反而变难了，
 * 方向都是反的。没写场景覆盖的场景跟着台阶走，这是对的。
 */
export function tunedSceneDifficulty(
  target: Pick<ExpressionTarget, 'id' | 'difficulty' | 'settingDifficulty'>,
  scene: SettingId,
  book: TuningBook,
): number {
  const entry = book[target.id];
  return (
    entry?.settingDifficulty?.[scene] ??
    target.settingDifficulty?.[scene] ??
    entry?.difficulty ??
    target.difficulty
  );
}

/** 台阶有没有被老师动过 */
export function isDifficultyTuned(target: Pick<ExpressionTarget, 'id'>, book: TuningBook): boolean {
  return book[target.id]?.difficulty !== undefined;
}

/** 这个场景下的难度有没有被老师动过 */
export function isSceneDifficultyTuned(
  target: Pick<ExpressionTarget, 'id'>,
  scene: SettingId,
  book: TuningBook,
): boolean {
  return book[target.id]?.settingDifficulty?.[scene] !== undefined;
}

/** 这个目标有没有任何一处被调过——列表上给个记号 */
export function isTargetTuned(target: Pick<ExpressionTarget, 'id'>, book: TuningBook): boolean {
  return book[target.id] !== undefined;
}

/** 某目标被调过几处，用于「恢复默认」按钮文案 */
export function tuningCount(target: Pick<ExpressionTarget, 'id'>, book: TuningBook): number {
  const entry = book[target.id];
  if (!entry) return 0;
  return (entry.difficulty !== undefined ? 1 : 0) + Object.keys(entry.settingDifficulty ?? {}).length;
}

/**
 * 把难度钳在合法区间，并限制一次调一格。
 * 老师连点 + 时不会一下跳到 30——step 固定 ±1，界面上的意思就是「挪一格」。
 */
export function clampDifficulty(value: number): number {
  if (!Number.isFinite(value)) return MIN_DIFFICULTY;
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(value)));
}

function withEntry(book: TuningBook, targetId: string, entry: TargetTuning | null): TuningBook {
  const next = { ...book };
  if (!entry || (entry.difficulty === undefined && !entry.settingDifficulty)) {
    delete next[targetId];
  } else {
    next[targetId] = entry;
  }
  return next;
}

/**
 * 改全表台阶。
 *
 * 传 null = 恢复默认。
 * 调到和配置值一样时自动清掉覆盖——不然「改了又改回来」会永久留一条脏条目，
 * 界面上一直显示「已调整」，老师会以为还有效。
 */
export function setDifficulty(
  book: TuningBook,
  target: Pick<ExpressionTarget, 'id' | 'difficulty'>,
  value: number | null,
  now: number = Date.now(),
): TuningBook {
  const entry = book[target.id] ?? { updatedAt: 0 };
  const base: TargetTuning = { ...entry, updatedAt: now };
  if (value === null || clampDifficulty(value) === target.difficulty) {
    delete base.difficulty;
  } else {
    base.difficulty = clampDifficulty(value);
  }
  return withEntry(book, target.id, base);
}

/**
 * 改某个场景下的难度。
 *
 * 传 null = 恢复默认。
 * 调到和「该场景继承来的值」一样时清掉覆盖；注意这里的参照值不是配置台阶，
 * 而是去掉场景覆盖后的 tunedSceneDifficulty——台阶本身被调过时，场景跟着台阶走，
 * 把场景覆盖调回同值等于「跟着台阶」，不该算一处独立调整。
 */
export function setSceneDifficulty(
  book: TuningBook,
  target: Pick<ExpressionTarget, 'id' | 'difficulty' | 'settingDifficulty'>,
  scene: SettingId,
  value: number | null,
  now: number = Date.now(),
): TuningBook {
  const entry = book[target.id] ?? { updatedAt: 0 };
  const per = { ...(entry.settingDifficulty ?? {}) };
  const inherited = tunedSceneDifficulty(target, scene, {
    [target.id]: { ...entry, settingDifficulty: undefined },
  });
  if (value === null || clampDifficulty(value) === inherited) {
    delete per[scene];
  } else {
    per[scene] = clampDifficulty(value);
  }
  const base: TargetTuning = { ...entry, updatedAt: now };
  if (Object.keys(per).length > 0) base.settingDifficulty = per;
  else delete base.settingDifficulty;
  return withEntry(book, target.id, base);
}

/** 整个目标恢复默认 */
export function clearTarget(book: TuningBook, targetId: string): TuningBook {
  return withEntry(book, targetId, null);
}

/** 整本清空（换学期、换班时用） */
export function clearAll(): TuningBook {
  return {};
}

export function loadTuning(storagePrefix: string): TuningBook {
  try {
    const raw = localStorage.getItem(`${storagePrefix}.tuning`);
    return normalizeTuning(raw ? JSON.parse(raw) : null);
  } catch {
    return {};
  }
}

export function saveTuning(storagePrefix: string, book: TuningBook): void {
  try {
    if (Object.keys(book).length === 0) {
      localStorage.removeItem(`${storagePrefix}.tuning`);
      return;
    }
    localStorage.setItem(`${storagePrefix}.tuning`, JSON.stringify(book));
  } catch {
    /* 存不下就算了，这次会话里调过的仍然生效 */
  }
}

/**
 * 有重复难度时，调整后的落位。
 *
 * 场景里两个目标都是 3（比如 G2 和 C3 在桌面上都算 3），老师把 C3 往上调一格
 * 变 2 就够插入；但反过来把 G2 往下调会撞到 4。这里不强制避让——
 * 允许并列（并列时按原台阶兜底排序），因为「一样难」在真实课堂里很常见，
 * 硬拉开反而失真。这个函数只负责算下一格的建议值，界面上就是 ±1。
 */
export function nextDifficulty(current: number, direction: 1 | -1): number {
  return clampDifficulty(current + direction);
}

/**
 * 被调过的目标按调过的值重排。
 * 只在需要「调完立刻看到落位」的地方用（列表页），其他统计口径仍然走配置。
 */
export function sortTargetsByDifficulty<T extends Pick<ExpressionTarget, 'id' | 'difficulty'>>(
  targets: T[],
  book: TuningBook,
): T[] {
  return [...targets].sort(
    (a, b) => tunedDifficulty(a, book) - tunedDifficulty(b, book) || a.difficulty - b.difficulty,
  );
}
