/**
 * 生活小能手 · 链练习台
 *
 * 一屏只呈现**当前这一步**，不给完成标准那行小字——
 * 现场老师要的是「说什么、点哪个」，多一行判据只会让屏幕变满。
 * 完成标准写在数据里，记录页回看时才展开。
 *
 * 交互上有两个和 DTT 相反的地方，是这个页面的全部设计：
 *
 * 1. **默认「独立」**。走完一遍的常态是顺利，异常才需要点。
 *    所以不是「每步都要判」，而是「卡住了才改」。
 *    代价是漏记会虚高，所以每遍结束要弹一次确认，把这一遍记了几处帮助说清楚。
 *
 * 2. **老师代做的步也要走一遍**，只是不需要判定。
 *    反向链里前面几步是老师做的，跳过它们，孩子会以为「这条链从第 5 步才开始」。
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LIFE_MODULE } from '@/config/chainModule';
import { getChainTarget } from '@/config/chainTargets';
import {
  CHAIN_BAND_META,
  CHAIN_MODE_META,
  chainPlan,
  type ChainMode,
  type ChainTarget,
  type ChainStep,
} from '@/config/chainTraining';
import { CHAIN_PROMPT_LABELS, CHAIN_PROMPT_ORDER, composeChainThreeLines, sessionChainStats, suggestChainScore, trendLine } from '@/config/chainRecord';
import { addSessionTo, loadBookFrom, nextSessionNo, todayIso, type ExpressionBook, type Score } from '@/config/kidExpression';
import type { DttPromptLevel } from '@/config/dtt';
import { useKid } from './KidContext';

type Phase = 'run' | 'runDone' | 'summary';

/** 一条链在文件名里的短标题：去掉引号括号，截到 8 字 */
function topicOf(target: ChainTarget): string {
  const cleaned = target.name.replace(/[「」（）()·\s]/g, '');
  return (cleaned || target.id).slice(0, 8);
}

const promptButtonStyle: Record<DttPromptLevel, string> = {
  independent: 'bg-emerald-500 hover:bg-emerald-600',
  verbal: 'bg-amber-500 hover:bg-amber-600',
  model: 'bg-orange-500 hover:bg-orange-600',
  physical: 'bg-rose-500 hover:bg-rose-600',
};

export default function KidLifePlay() {
  const { targetId } = useParams();
  const navigate = useNavigate();
  const { memory } = useKid();
  const target = useMemo(() => getChainTarget(targetId), [targetId]);

  const [book, setBook] = useState<ExpressionBook>(() => loadBookFrom(LIFE_MODULE.bookKey));
  const [student] = useState(() => {
    try {
      return localStorage.getItem(`${LIFE_MODULE.storagePrefix}.student`) || memory.nickname || '小朋友';
    } catch {
      return memory.nickname || '小朋友';
    }
  });

  const [phase, setPhase] = useState<Phase>('run');
  const [mode, setMode] = useState<ChainMode>(target?.defaultMode ?? 'backward');
  const [mastered, setMastered] = useState(0);
  const [idx, setIdx] = useState(0);
  /** 当前这一遍的记录，key = 步号 */
  const [records, setRecords] = useState<Record<number, { promptLevel: DttPromptLevel; done: boolean }>>({});
  /** 已完成的遍 */
  const [runs, setRuns] = useState<
    { mode: ChainMode; mastered: number; steps: { order: number; promptLevel: DttPromptLevel; done: boolean }[] }[]
  >([]);
  const [threeLines, setThreeLines] = useState({ did: '', achieved: '', stuck: '' });
  const [score, setScore] = useState<Score | null>(null);

  if (!target) {
    return (
      <div className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-xl rounded-[28px] border-2 border-slate-200 bg-white p-6 text-center">
          <p className="text-sm font-bold text-slate-600">这条链不存在，可能已经被删掉了。</p>
          <Link
            to={LIFE_MODULE.basePath}
            className="mt-4 flex h-12 items-center justify-center rounded-2xl bg-sky-500 text-sm font-bold text-white"
          >
            回到列表
          </Link>
        </div>
      </div>
    );
  }

  const plan = chainPlan(target, { mode, mastered });
  const totalSteps = target.steps.length;
  const currentStep: ChainStep | undefined = target.steps.find((s) => s.order === idx + 1);
  const isHelpStep = plan.helpSteps.includes(idx + 1);
  const isMineStep = plan.targetSteps.includes(idx + 1);
  const helpedCount = Object.values(records).filter((r) => r.promptLevel !== 'independent' || !r.done).length;

  const advance = () => {
    if (idx + 1 >= totalSteps) {
      setPhase('runDone');
      return;
    }
    setIdx(idx + 1);
  };

  const markStep = (promptLevel: DttPromptLevel, done = true) => {
    setRecords((prev) => ({ ...prev, [idx + 1]: { promptLevel, done } }));
    advance();
  };

  /** 这一遍走完：存进 runs，清空当前记录，回第 1 步 */
  const finishRun = () => {
    const steps = Object.entries(records).map(([order, r]) => ({ order: Number(order), ...r }));
    const next = [...runs, { mode, mastered, steps }];
    setRuns(next);
    setRecords({});
    setIdx(0);
    setPhase('run');

    // 一节课第一次走完就先把三行草稿填上，老师后面只要改
    if (next.length === 1) {
      const draft = composeChainThreeLines(target, next);
      setThreeLines(draft);
      setScore(suggestChainScore(sessionChainStats(target, next)));
    }
  };

  const goSummary = () => {
    const draft = composeChainThreeLines(target, runs);
    setThreeLines(draft);
    setScore(suggestChainScore(sessionChainStats(target, runs)));
    setPhase('summary');
  };

  const save = () => {
    if (runs.length === 0) return;
    const session = {
      id: `${target.id}-${Date.now()}`,
      student,
      date: todayIso(),
      sessionNo: nextSessionNo(book, student),
      topic: topicOf(target),
      targetId: target.id,
      by: '教师' as const,
      rounds: [],
      score,
      threeLines,
      highlight: '',
      nextStep: '',
      runs,
      createdAt: Date.now(),
    };
    const next = addSessionTo(LIFE_MODULE.bookKey, book, session);
    setBook(next);
    navigate(LIFE_MODULE.basePath);
  };

  const stats = sessionChainStats(target, runs);

  // -------------------------------------------------------------------------
  // 记录页
  // -------------------------------------------------------------------------
  if (phase === 'summary') {
    return (
      <div
        className="flex-1 overflow-y-auto px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-2 sm:px-5"
        data-testid="life-summary"
      >
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-[28px] border-2 border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold text-slate-400">
              {student} · {todayIso()} · 第 {nextSessionNo(book, student)} 课时
            </div>
            <h1 className="mt-1 text-xl font-extrabold text-slate-800">
              {target.id} {target.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{CHAIN_BAND_META[target.band].label}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{runs.length} 遍</span>
              <span className="rounded-lg bg-sky-100 px-2 py-1 text-sky-700">{trendLine(stats)}</span>
            </div>
          </div>

          {/* 三行记录：程序给草稿，老师改 */}
          <div className="space-y-3 rounded-[28px] border-2 border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-sm font-extrabold text-slate-700">课堂记录（三行）</div>
            {(
              [
                ['did', '今天做了什么'],
                ['achieved', '做到了什么'],
                ['stuck', '卡在哪'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-bold text-slate-500">{label}</span>
                <textarea
                  value={threeLines[key]}
                  onChange={(e) => setThreeLines((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={2}
                  data-testid={`life-three-${key}`}
                  className="mt-1 w-full resize-none rounded-xl border-2 border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-sky-400"
                />
              </label>
            ))}
          </div>

          {/* 步骤 × 遍 预览：保存前先让老师看一眼对不对 */}
          <div className="rounded-[28px] border-2 border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm font-extrabold text-slate-700">每一步用了什么辅助</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th className="w-9 py-1.5 pr-1 font-bold">步</th>
                    <th className="py-1.5 pr-2 font-bold">这一步</th>
                    {runs.map((_, i) => (
                      <th key={i} className="w-16 py-1.5 pr-1 font-bold">
                        第 {i + 1} 遍
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {target.steps.map((s) => (
                    <tr key={s.order} className="border-t border-slate-100">
                      <td className="py-1.5 pr-1 font-bold text-slate-400">{s.order}</td>
                      <td className="truncate py-1.5 pr-2 font-bold text-slate-700">{s.name}</td>
                      {runs.map((r, i) => {
                        // 每一遍的分工单独算：老师中途可能换过排法
                        const inScope = chainPlan(target, r).targetSteps.includes(s.order);
                        const rec = r.steps.find((x) => x.order === s.order);
                        const cell = !inScope
                          ? '我代做'
                          : !rec
                            ? '—'
                            : !rec.done
                              ? '没做到'
                              : CHAIN_PROMPT_LABELS[rec.promptLevel].short;
                        return (
                          <td key={i} className="py-1.5 pr-2 text-slate-500">
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[28px] border-2 border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-sm font-extrabold text-slate-700">打分</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              按最后一遍的独立完成步数占比算，不看全程平均——全程平均会被前几遍拖低，看不出进步。
            </p>
            <div className="mt-3 flex gap-2">
              {([2, 1, 0] as Score[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  data-testid={`life-score-${v}`}
                  onClick={() => setScore(v)}
                  className={`h-12 flex-1 rounded-2xl text-sm font-extrabold transition ${
                    score === v ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {v} 分
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setPhase('run')}
              className="h-12 flex-1 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
            >
              再练一遍
            </button>
            <button
              type="button"
              data-testid="life-save"
              onClick={save}
              className="h-12 flex-[2] rounded-2xl bg-sky-500 text-sm font-extrabold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-50"
              disabled={runs.length === 0}
            >
              保存这节课
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 练习页 / 一遍结束确认
  // -------------------------------------------------------------------------
  const progressDots = target.steps.map((s) => {
    const done = s.order <= idx;
    const current = s.order === idx + 1;
    const help = plan.helpSteps.includes(s.order);
    const rec = records[s.order];
    const helped = rec && (rec.promptLevel !== 'independent' || !rec.done);
    return { order: s.order, done, current, help, helped };
  });

  return (
    <div
      className="flex-1 overflow-y-auto px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-2 sm:px-5"
      data-testid="life-play"
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <Link
            to={LIFE_MODULE.basePath}
            className="flex h-12 items-center gap-1.5 rounded-2xl bg-white px-4 text-sm font-bold text-slate-600 shadow-sm"
          >
            ← 返回
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-extrabold text-slate-800">
              {target.id} {target.name}
            </div>
            <div className="text-[11px] font-bold text-slate-400">
              {CHAIN_BAND_META[target.band].label} · 共 {totalSteps} 步 · 这是第 {runs.length + 1} 遍
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700">
            {CHAIN_MODE_META[mode].label}
          </span>
        </div>

        {/* 这一遍怎么分工，用一句话说清 */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-4 py-2.5 text-[13px] font-bold text-sky-900">
          {plan.line}
        </div>

        {/* 步骤进度条 */}
        <div className="flex flex-wrap gap-1.5" data-testid="life-progress">
          {progressDots.map((d) => (
            <span
              key={d.order}
              title={`第 ${d.order} 步`}
              className={`flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-extrabold ${
                d.current
                  ? 'bg-sky-500 text-white ring-2 ring-sky-200'
                  : // 代做的步要排在「已完成」前面判断：绿色代表孩子做得好，
                    // 老师代做的步不该蹭这个颜色，否则整条链看起来像孩子全做完了
                    d.help
                    ? 'bg-slate-100 text-slate-400'
                    : d.helped
                      ? 'bg-amber-100 text-amber-700'
                      : d.done
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-white text-slate-400 ring-1 ring-slate-200'
              }`}
            >
              {d.order}
            </span>
          ))}
        </div>

        {phase === 'runDone' ? (
          <div className="space-y-3 rounded-[28px] border-2 border-sky-200 bg-white p-6 text-center shadow-sm">
            <div className="text-3xl" aria-hidden>
              ✅
            </div>
            <div className="text-lg font-extrabold text-slate-800">这一遍走完了</div>
            <p className="text-sm leading-relaxed text-slate-500">
              这一遍记了 <b className="text-amber-600">{helpedCount}</b> 处需要帮助，其余按独立算。
              如果刚才其实给了提示但没点，现在可以回去补。
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                data-testid="life-run-confirm"
                onClick={finishRun}
                className="h-12 rounded-2xl bg-sky-500 text-sm font-extrabold text-white shadow-sm transition hover:bg-sky-600"
              >
                没问题，存这一遍
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdx(0);
                  setPhase('run');
                }}
                className="h-12 rounded-2xl bg-slate-100 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
              >
                回去改一下
              </button>
              <button
                type="button"
                data-testid="life-goto-summary"
                onClick={goSummary}
                className="h-12 rounded-2xl text-sm font-bold text-slate-500 transition hover:bg-slate-50"
              >
                不练了，去填记录 →
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border-2 border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold text-slate-400">
              第 {idx + 1} 步 / 共 {totalSteps} 步
            </div>
            <div className="mt-1 text-2xl font-extrabold text-slate-800">{currentStep?.name}</div>

            {isHelpStep ? (
              <>
                <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-500">
                  这一步<b>由我代做</b>，不用判。做完点下面的按钮继续——
                  孩子也要看着你做，前面怎么开头是他后面接下去的依据。
                </div>
                <button
                  type="button"
                  data-testid="life-help-next"
                  onClick={advance}
                  className="mt-4 h-12 w-full rounded-2xl bg-slate-800 text-sm font-extrabold text-white transition hover:bg-slate-900"
                >
                  我做完了，下一步 →
                </button>
              </>
            ) : isMineStep ? (
              <>
                {/* 只说指令，不显示完成标准——现场要的是「说什么」，不是「读一段判据」 */}
                <div className="mt-3 rounded-2xl bg-sky-50 p-5 text-center text-xl font-extrabold leading-snug text-sky-900">
                  「{currentStep?.sd}」
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {CHAIN_PROMPT_ORDER.map((level) => (
                    <button
                      key={level}
                      type="button"
                      data-testid={`life-prompt-${level}`}
                      onClick={() => markStep(level)}
                      title={CHAIN_PROMPT_LABELS[level].desc}
                      className={`h-12 rounded-2xl text-sm font-extrabold text-white shadow-sm transition active:scale-[0.98] ${promptButtonStyle[level]}`}
                    >
                      {CHAIN_PROMPT_LABELS[level].short}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid="life-prompt-failed"
                  onClick={() => markStep('physical', false)}
                  className="mt-2 h-12 w-full rounded-2xl bg-slate-100 text-sm font-bold text-slate-500 transition hover:bg-slate-200"
                >
                  ✗ 这一步没做到
                </button>
              </>
            ) : (
              <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                这一步不在这一遍的分工里。
                <button type="button" onClick={advance} className="mt-3 h-12 w-full rounded-2xl bg-slate-800 text-sm font-bold text-white">
                  跳过 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 遍次与分工的调整放底部，不挡操作 */}
        {phase === 'run' && runs.length === 0 && idx === 0 && (
          <div className="rounded-[28px] border border-slate-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">排法</span>
              {(Object.keys(CHAIN_MODE_META) as ChainMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`life-mode-${m}`}
                  onClick={() => {
                    setMode(m);
                    setIdx(0);
                    setRecords({});
                  }}
                  className={`h-12 rounded-xl px-3 text-xs font-bold transition ${
                    mode === m ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {CHAIN_MODE_META[m].label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">已经会几步</span>
              {Array.from({ length: totalSteps + 1 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  data-testid={`life-mastered-${n}`}
                  onClick={() => {
                    setMastered(n);
                    setIdx(0);
                    setRecords({});
                  }}
                  className={`h-12 w-12 rounded-xl text-xs font-bold transition ${
                    mastered === n ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              反向链的「已经会几步」是从<b>最后一步往前数</b>：填 2 表示最后两步他能自己做完。
            </p>
          </div>
        )}

        {runs.length > 0 && phase === 'run' && (
          <button
            type="button"
            onClick={goSummary}
            className="h-12 w-full rounded-2xl bg-white text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            练了 {runs.length} 遍，去填记录 →
          </button>
        )}
      </div>
    </div>
  );
}
