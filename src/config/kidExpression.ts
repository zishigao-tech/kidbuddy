/**
 * 语言表达练习 · 记录与统计
 *
 * 口径来自 skill「课堂记录量化工具」：
 * - 得分 0/1/2，2 = 无提示独立完成且达成率 ≥80%，1 = 提示后出现或达成率 50%-80%
 * - 「稳定」= 同一授课主体连续两次 2 分；跨主体两次 2 分只算「待复核」
 * - 记录文件名固定四段：姓名_YYYY-MM-DD_第N课时_标题.md，meta 块可被 rebuild_index.py 解析
 *
 * 零外部运行时依赖（仅 localStorage），便于 node 直接 transpile 单测。
 */
import { getExpressionTarget, isSettingId, materialLine, settingMeta, type ExpressionTarget, type SettingId } from './expressionTargets';
import { computeDttStats, type DttOutcome, type DttPromptLevel } from './dtt';
import { chainSectionFor, chainTargetName, normalizeRunsFor, type ChainRun } from './chainRecord';

export type ExpressionSubject = '教师' | '家长';
export type Achievement = 'independent' | 'prompted' | 'failed';
export type Score = 0 | 1 | 2;

export interface ExpressionRound {
  taskId: string;
  /** 伙伴问的题干 */
  ask: string;
  /** 孩子原话，照录不改写 */
  answer: string;
  /** 判定项（人工勾选） */
  checks: string[];
  checksHit: string[];
  achievement: Achievement | null;
  /** DTT：本试次结果，旧记录没有这两个字段 */
  outcome?: DttOutcome | null;
  /** DTT：本试次用的最高辅助等级 */
  promptLevel?: DttPromptLevel | null;
  /** DTT：同一道题的第几遍（从 1 开始） */
  repeatIndex?: number;
  /**
   * 这一题当场跳过了（没条件做、孩子不配合、教具不在）。
   * 跳过不等于「没做到」，所有统计都要把它排除，否则分数会被凭空拉低。
   */
  skipped?: boolean;
}

export interface ExpressionSession {
  id: string;
  student: string;
  date: string;
  /** 第 N 课时，同一条线跨天连续，教师课与家长课共用 */
  sessionNo: number;
  /** 练习内容标题，2-8 字，进文件名 */
  topic: string;
  targetId: string;
  by: ExpressionSubject;
  rounds: ExpressionRound[];
  score: Score | null;
  threeLines: { did: string; achieved: string; stuck: string };
  /** 家庭沟通要点 / 家庭训练指导里的「一句进步」 */
  highlight: string;
  /** 下次调整 / 下次课调整 */
  nextStep: string;
  /** 这节课实际用的教具（槽位 → 实际物品），换教室、换老师时用来判断可比性 */
  materials?: Record<string, string>;
  /**
   * 这节课在哪个训练场景做的。旧记录没有这个字段。
   * 同一个目标在桌面上能到 2 分、在户外只有 1 分，是很常见的事——
   * 不分场景看，就会把「换了个地方不会了」误判成「退步」。
   */
  setting?: SettingId;
  /**
   * 链式教学的逐遍记录。有值就说明这是一节链式课，这时 `rounds` 是空的
   * （链式课没有「题」，只有「步」）。
   *
   * 为什么塞进同一个 session 而不是另建一本账：
   * `nextSessionNo` 是按 student 数课时的。两本账各算各的，第 7 课时会同时
   * 出现在两种记录里；首页统计和 rebuild_index.py 也都要改成读两处。
   * 一个可选字段能换来零改造成本，值得。
   */
  runs?: ChainRun[];
  createdAt: number;
}

export interface ExpressionBook {
  sessions: ExpressionSession[];
}

export const ACHIEVEMENT_LABEL: Record<Achievement, string> = {
  independent: '独立做到',
  prompted: '提示后做到',
  failed: '没做到',
};

export const SCORE_LABEL: Record<Score, string> = {
  0: '还需要帮助',
  1: '提示后能做',
  2: '能自己做',
};

export const SCORE_RUBRIC =
  '0 = 未出现或需全程辅助；1 = 提示后出现或达成率 50%-80%；2 = 无提示独立完成且达成率 ≥80%。';

export function emptyBook(): ExpressionBook {
  return { sessions: [] };
}

export function normalizeBook(raw: unknown): ExpressionBook {
  const out = emptyBook();
  if (!raw || typeof raw !== 'object') return out;
  const list = (raw as { sessions?: unknown }).sessions;
  if (!Array.isArray(list)) return out;
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Partial<ExpressionSession>;
    if (!s.id || !s.student || !s.date || !s.targetId) continue;
    const session: ExpressionSession = {
      id: String(s.id),
      student: String(s.student),
      date: String(s.date),
      sessionNo: Number(s.sessionNo) || 1,
      topic: String(s.topic || '语言表达练习'),
      targetId: String(s.targetId),
      by: s.by === '家长' ? '家长' : '教师',
      rounds: Array.isArray(s.rounds)
        ? s.rounds.map((r) => ({
            taskId: String(r?.taskId ?? ''),
            ask: String(r?.ask ?? ''),
            answer: String(r?.answer ?? ''),
            checks: Array.isArray(r?.checks) ? r.checks.map(String) : [],
            checksHit: Array.isArray(r?.checksHit) ? r.checksHit.map(String) : [],
            achievement: r?.achievement === 'independent' || r?.achievement === 'prompted' || r?.achievement === 'failed' ? r.achievement : null,
            outcome: r?.outcome === 'correct' || r?.outcome === 'incorrect' || r?.outcome === 'no_response' ? r.outcome : null,
            promptLevel:
              r?.promptLevel === 'independent' || r?.promptLevel === 'verbal' || r?.promptLevel === 'model' || r?.promptLevel === 'physical'
                ? r.promptLevel
                : null,
            repeatIndex: Number(r?.repeatIndex) || 1,
          }))
        : [],
      setting: isSettingId(s.setting) ? s.setting : undefined,
      score: s.score === 0 || s.score === 1 || s.score === 2 ? s.score : null,
      threeLines: {
        did: String(s.threeLines?.did ?? ''),
        achieved: String(s.threeLines?.achieved ?? ''),
        stuck: String(s.threeLines?.stuck ?? ''),
      },
      highlight: String(s.highlight ?? ''),
      nextStep: String(s.nextStep ?? ''),
      createdAt: Number(s.createdAt) || Date.now(),
    };
    // 链式记录：清不干净就当没有，不要留个空数组在 JSON 里占地方
    const runs = normalizeRunsFor(session.targetId, s.runs);
    if (runs.length > 0) session.runs = runs;
    out.sessions.push(session);
  }
  out.sessions.sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date)));
  return out;
}

export const BOOK_KEY = 'kidbuddy.expression.book.v1';

/**
 * 账本按 key 读写：语言表达和认知理解各存一本，互不干扰。
 * 统计、三行记录、导出这些是纯函数，两个模块直接共用。
 */
export function loadBookFrom(key: string): ExpressionBook {
  try {
    const raw = localStorage.getItem(key);
    return raw ? normalizeBook(JSON.parse(raw)) : emptyBook();
  } catch {
    return emptyBook();
  }
}

export function saveBookTo(key: string, book: ExpressionBook): void {
  try {
    localStorage.setItem(key, JSON.stringify(normalizeBook(book)));
  } catch {
    /* 存储满了就不落盘，界面仍可用 */
  }
}

export function addSessionTo(key: string, book: ExpressionBook, session: ExpressionSession): ExpressionBook {
  const next = normalizeBook({ sessions: [...book.sessions, session] });
  saveBookTo(key, next);
  return next;
}

export function loadBook(): ExpressionBook {
  return loadBookFrom(BOOK_KEY);
}

export function saveBook(book: ExpressionBook): void {
  saveBookTo(BOOK_KEY, book);
}

export function addSession(book: ExpressionBook, session: ExpressionSession): ExpressionBook {
  return addSessionTo(BOOK_KEY, book, session);
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 该孩子的课时序号：已有几节就是第几节，跨天不重置，教师课与家长课共用 */
export function nextSessionNo(book: ExpressionBook, student: string): number {
  const mine = book.sessions.filter((s) => s.student === student);
  const max = mine.reduce((acc, s) => Math.max(acc, s.sessionNo), 0);
  return max + 1;
}

export function sessionsOf(book: ExpressionBook, student: string): ExpressionSession[] {
  return book.sessions
    .filter((s) => s.student === student)
    .slice()
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date.localeCompare(b.date)));
}

/** 按 0/1/2 的达成率给建议分：≥80% 记 2，≥50% 记 1，其余记 0；未判定返回 null */
/** 参与统计的试次：跳过的不算，没判定的不算，否则跳过会被误算成「没做到」 */
export function scoredRounds(rounds: ExpressionRound[]): ExpressionRound[] {
  return rounds.filter((r) => !r.skipped && r.achievement !== null);
}

export function suggestScore(rounds: ExpressionRound[]): Score | null {
  const judged = scoredRounds(rounds);
  if (judged.length === 0) return null;
  const independent = judged.filter((r) => r.achievement === 'independent').length;
  const ratio = independent / judged.length;
  if (ratio >= 0.8) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

export function countAchievements(rounds: ExpressionRound[]): Record<Achievement, number> {
  return rounds.reduce<Record<Achievement, number>>(
    (acc, r) => {
      if (!r.skipped && r.achievement) acc[r.achievement] += 1;
      return acc;
    },
    { independent: 0, prompted: 0, failed: 0 },
  );
}

export type StabilityStatus = 'none' | 'progressing' | 'pending' | 'stable';

export interface TargetStat {
  targetId: string;
  status: StabilityStatus;
  /** 最近一次得分 */
  last: Score | null;
  /** 最近一次的授课主体 */
  lastBy: ExpressionSubject | null;
  /** 历史得分序列，仅含有打分的课时 */
  history: Score[];
  /** 历史主体序列，与 history 一一对应 */
  subjects: ExpressionSubject[];
  attempts: number;
}

function targetSessions(book: ExpressionBook, student: string, targetId: string): ExpressionSession[] {
  return sessionsOf(book, student).filter((s) => s.targetId === targetId);
}

export function targetStat(book: ExpressionBook, student: string, targetId: string): TargetStat {
  const all = targetSessions(book, student, targetId);
  const scored = all.filter((s) => s.score !== null);
  const history = scored.map((s) => s.score as Score);
  const subjects = scored.map((s) => s.by);
  const last = history.length > 0 ? history[history.length - 1] : null;
  const lastBy = subjects.length > 0 ? subjects[subjects.length - 1] : null;

  let status: StabilityStatus = 'none';
  if (all.length > 0) status = 'progressing';
  if (history.length >= 2) {
    const n = history.length;
    if (history[n - 1] === 2 && history[n - 2] === 2) {
      status = subjects[n - 1] === subjects[n - 2] ? 'stable' : 'pending';
    }
  }
  return { targetId, status, last, lastBy, history, subjects, attempts: all.length };
}

export const STABILITY_LABEL: Record<StabilityStatus, string> = {
  none: '未开始',
  progressing: '进行中',
  pending: '待复核',
  stable: '已稳定',
};

/** 汇总页那行「历史：K1：1 → 2 → 2（教师·家长·教师）」 */
export function historyLine(stat: TargetStat): string {
  if (stat.history.length === 0) return '暂无打分记录';
  const chain = stat.history.join(' → ');
  const mixed = new Set(stat.subjects).size > 1;
  return mixed
    ? `${stat.targetId}：${chain}（${stat.subjects.join('·')}）`
    : `${stat.targetId}：${chain}`;
}

/** 三行记录草稿：只用已发生的试次与判定，不写评价词 */
export function composeThreeLines(
  session: Pick<ExpressionSession, 'rounds' | 'targetId' | 'by'>,
  target: ExpressionTarget,
): { did: string; achieved: string; stuck: string } {
  const countedRounds = session.rounds.filter((r) => !r.skipped);
  const total = countedRounds.length;
  const skipped = session.rounds.length - total;
  const judgedRounds = scoredRounds(session.rounds);
  const judged = judgedRounds.length;
  const hasDtt = countedRounds.some((r) => r.outcome);
  const counted = countAchievements(session.rounds);

  const uniqueAsks = Array.from(new Set(countedRounds.map((r) => r.ask.replace(/[。？]$/, ''))));
  const skipNote = skipped > 0 ? `、当场跳过 ${skipped} 题不计分` : '';

  const tag = `${target.id} ${target.name}（VB-MAPP ${target.vbMapp.tag}）`;
  const did =
    judged === 0
      ? `${tag}，DTT 计划 ${total} 试次${skipNote}，本节没有判定。`
      : `${tag}，DTT 计划 ${total} 试次${skipNote}、已判定 ${judged} 试次；题目：${uniqueAsks.join('／')}。`;

  let achieved: string;
  if (judged === 0) {
    achieved = '本节未判定，按 DTT 口径不打分。';
  } else if (hasDtt) {
    const stats = computeDttStats(judgedRounds.map((r) => ({ outcome: r.outcome ?? null, promptLevel: r.promptLevel ?? null })));
    achieved = `${judged} 试次中：独立正确 ${stats.independentCorrect}（${Math.round(stats.independentRate * 100)}%）、口头提示后正确 ${
      stats.correctByPrompt.verbal
    }、示范后正确 ${stats.correctByPrompt.model}、手把手后正确 ${stats.correctByPrompt.physical}、错误 ${stats.incorrect}、无反应 ${
      stats.noResponse
    }；最长连续独立正确 ${stats.maxIndependentStreak} 次。`;
  } else {
    achieved = `${judged} 试次中，独立做到 ${counted.independent} 次、提示后做到 ${counted.prompted} 次、没做到 ${counted.failed} 次；独立完成率 ${Math.round(
      (counted.independent / judged) * 100,
    )}%。`;
  }

  const failedRounds = session.rounds.filter((r) => r.achievement === 'failed');
  const stuck =
    judged === 0
      ? '未判定，卡点没有记录；下节课补一次判定再定方向。'
      : failedRounds.length === 0
        ? '本次试次没有出现错误或走神，未记录到明显卡点；下节课按褪除辅助的方向推进。'
        : `卡在：${failedRounds
            .map((r) => `「${r.ask.replace(/[。？]$/, '')}」（${r.outcome === 'no_response' ? '等 3 秒无反应' : '错误'}）`)
            .join('；')}。`;

  return { did, achieved, stuck };
}

/** 家长版导语：取第一句独立完成的原话，没有就取最长的一句；跳过的题不进导语 */
export function pickHighlight(rounds: ExpressionRound[]): string {
  const used = rounds.filter((r) => !r.skipped);
  const independent = used.find((r) => r.achievement === 'independent' && r.answer.trim());
  if (independent) return independent.answer.trim();
  const longest = used
    .filter((r) => r.answer.trim())
    .sort((a, b) => b.answer.length - a.answer.length)[0];
  return longest ? longest.answer.trim() : '';
}

export function sessionFileName(session: Pick<ExpressionSession, 'student' | 'date' | 'sessionNo' | 'topic'>): string {
  const safe = (t: string) => t.replace(/[\\/:*?"<>|\s]/g, '').slice(0, 24) || '语言表达练习';
  return `${safe(session.student)}_${session.date}_第${session.sessionNo}课时_${safe(session.topic)}.md`;
}

function achievementEvidence(rounds: ExpressionRound[]): string {
  const used = rounds.filter((r) => !r.skipped);
  const skipped = rounds.length - used.length;
  const skipNote = skipped > 0 ? `　（另有 ${skipped} 题当场跳过，未计入）` : '';
  const hasDtt = used.some((r) => r.outcome);
  if (!hasDtt) {
    return (
      used
        .map((r, i) => {
          const verdict = r.achievement ? ACHIEVEMENT_LABEL[r.achievement] : '未判定';
          const hit = r.checksHit.length > 0 ? `，要素命中：${r.checksHit.join('、')}` : '';
          const answer = r.answer.trim() ? `原话「${r.answer.trim()}」` : '未作答';
          return `第${i + 1}轮（${verdict}${hit}）：${answer}`;
        })
        .join('；') + skipNote
    );
  }

  const stats = computeDttStats(used.map((r) => ({ outcome: r.outcome ?? null, promptLevel: r.promptLevel ?? null })));
  const chain = used
    .map((r, i) => {
      const mark =
        r.outcome === 'correct'
          ? r.promptLevel === 'independent'
            ? '✅独立'
            : `🟡${promptShort(r.promptLevel)}`
          : r.outcome === 'incorrect'
            ? '❌错误'
            : '❌无反应';
      const answer = r.answer.trim() ? `「${r.answer.trim()}」` : '';
      return `${i + 1}.${mark}${answer}`;
    })
    .join('；');

  const summary = `共 ${stats.total} 试次：独立正确 ${stats.independentCorrect}、口头提示后 ${stats.correctByPrompt.verbal}、示范后 ${
    stats.correctByPrompt.model
  }、手把手后 ${stats.correctByPrompt.physical}、错误 ${stats.incorrect}、无反应 ${stats.noResponse}；独立正确率 ${Math.round(
    stats.independentRate * 100,
  )}%；最长连续独立正确 ${stats.maxIndependentStreak} 次`;
  return `${summary}。逐试次：${chain}${skipNote}`;
}

function promptShort(level: DttPromptLevel | null | undefined): string {
  if (level === 'verbal') return '口头';
  if (level === 'model') return '示范';
  if (level === 'physical') return '手把手';
  return '独立';
}

function familyGuideSection(target: ExpressionTarget): string {
  const g = target.familyGuide;
  return [
    '**家庭训练指导（家长照着做）**',
    '',
    `- **下次还是练这个**：${g.what}`,
    `- **准备什么**：${g.prepare}`,
    `- **怎么开始**：${g.start}`,
    `- **说完等几秒**：${g.wait}`,
    `- **提示从轻到重，给了就要退**：${g.prompts}`,
    `- **做到什么算成功**：${g.success}`,
    `- **做不到就这样降级**：${g.fallback}`,
    `- **这三件先别做**：${g.avoid}`,
    `- **练多久**：${g.dose}`,
  ].join('\n');
}

export function buildSessionMarkdown(session: ExpressionSession): string {
  const target = getExpressionTarget(session.targetId);
  // 链式课的编号（A5 / P3）不是名字，别拼成「A5 A5」
  const name = target?.name ?? chainTargetName(session.targetId) ?? session.targetId;
  const scoreText = session.score === null ? '本课未打分' : `${session.targetId}=${session.score}`;
  const scoreCell = session.score === null ? '—' : String(session.score);
  const quotes = session.rounds
    .filter((r) => r.answer.trim())
    .map((r) => `> 「${r.answer.trim()}」`)
    .join('\n');

  const lines: string[] = [];
  lines.push('<!--meta');
  lines.push(`student: ${session.student}`);
  lines.push(`date: ${session.date}`);
  lines.push(`topic: ${session.topic}`);
  lines.push(`session: 第${session.sessionNo}课时`);
  lines.push(`by: ${session.by}`);
  lines.push(`targets: ${session.targetId}`);
  lines.push(`scores: ${session.score === null ? '' : scoreText}`);
  lines.push('-->');
  lines.push('');
  lines.push('');
  lines.push(
    `### ${session.date} · 第${session.sessionNo}课时 · ${session.topic}${session.by === '家长' ? '（家长带练）' : ''}`,
  );
  lines.push('');
  lines.push(`**目标**：${session.targetId} ${name}　**授课**：${session.by}　**得分**：${scoreText}`);
  lines.push('');
  if (target) {
    lines.push(`**本次教具**：${materialLine(target.materials, session.materials ?? {})}`);
    lines.push('');
  }
  // 场景写进正文不进 meta：隔壁的 rebuild_index.py 只认固定几个 key，
  // 多一个未知 key 会走到它的兜底分支，宁可保守一点，正文里人也能看见。
  if (session.setting) {
    lines.push(`**训练场景**：${settingMeta(session.setting).emoji} ${settingMeta(session.setting).label}`);
    lines.push('');
  }
  // 链式课（生活技能 / 解决问题）走另一套记录块：
  // 三行 + 「步骤 × 遍」矩阵都由 chainRecord 生成，这里不再重复拼。
  // 链路被删或数据全清掉时返回空串，自动退回下面的 DTT 格式，旧记录照样能导出。
  const chainSection = session.runs?.length ? chainSectionFor(session.targetId, session.runs) : '';

  if (chainSection) {
    lines.push(chainSection);
    lines.push(`*得分口径：${SCORE_RUBRIC}（链式课按最后一遍的独立完成步数占比算，不看全程平均）*`);
    lines.push('');
  } else {
    lines.push('**课堂记录（三行）**');
    lines.push('');
    lines.push(`- **今天做了什么**：${session.threeLines.did}`);
    lines.push(`- **做到了什么**：${session.threeLines.achieved}`);
    lines.push(`- **卡在哪**：${session.threeLines.stuck}`);
    lines.push('');
    lines.push('**学生原话样本**');
    lines.push('');
    lines.push(quotes || '> （本次没有可引用的原话）');
    lines.push('');
    lines.push('**目标达成**');
    lines.push('');
    lines.push('| 编号 | 目标 | 本次观察到的表现 | 得分 |');
    lines.push('| --- | --- | --- | --- |');
    lines.push(
      `| ${session.targetId} | ${name}：${target?.standard2 ?? ''} | ${achievementEvidence(session.rounds)} | ${scoreCell} |`,
    );
    lines.push('');
    lines.push(`*得分口径：${SCORE_RUBRIC}*`);
  }
  if (session.by === '家长') {
    lines.push('*家长课的分数与教师课记在同一条序列里，但「稳定」要求相同授课主体连续两次 2 分，跨主体只算「待复核」。*');
  }
  lines.push('');
  if (session.by === '家长' && target) {
    lines.push(familyGuideSection(target));
  } else {
    lines.push('**家庭沟通要点**');
    lines.push('');
    lines.push(`- **可以告诉家庭的一句进步**：${session.highlight || '（待补充）'}`);
    lines.push(`- **本周家庭任务**：${session.nextStep || '（待补充）'}`);
  }
  lines.push('');
  lines.push(`**${session.by === '家长' ? '下次课调整（教师备课用，不必给家长）' : '下次调整'}**`);
  lines.push('');
  lines.push(`- ${session.nextStep || '（待补充）'}`);
  lines.push('');
  return lines.join('\n');
}
