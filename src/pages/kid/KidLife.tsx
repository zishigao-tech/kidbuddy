/**
 * 生活小能手 · 目标列表
 *
 * 和说说小课堂的列表页不共用：那边按「学段 + 场景 + 题量」组织，
 * 这边按「年龄段 + 由易到难」组织，卡片上的信息也完全不同
 * （那边显示题数，这边显示步数和排法）。
 *
 * 排序口径：**全表难度连续**，所以两个分区里都直接按 difficulty 排，
 * 不重排、不分组内再分组——一条 0-3 岁的链永远排在 6-12 岁前面。
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lockLessonArea } from '@/config/lessonGate';
import { LIFE_MODULE } from '@/config/chainModule';
import { CHAIN_TARGETS, chainGroups, needsLine, suggestNextChain } from '@/config/chainTargets';
import { chainStableIds, lastBandOf } from '@/config/nextUp';
import { CHAIN_BAND_META, CHAIN_GROUP_META, CHAIN_MODE_META, type ChainTarget } from '@/config/chainTraining';
import { sessionChainStats } from '@/config/chainRecord';
import {
  loadBookFrom,
  nextSessionNo,
  sessionsOf,
  type ExpressionBook,
} from '@/config/kidExpression';
import { useKid } from './KidContext';

const scope = LIFE_MODULE.storagePrefix;
const studentKey = `${scope}.student`;

function readStudent(fallback: string): string {
  try {
    return localStorage.getItem(studentKey) || fallback;
  } catch {
    return fallback;
  }
}

/** 段位标签的配色。三个年龄段的颜色要能一眼分开，但不抢主色 */
const bandStyle: Record<keyof typeof CHAIN_BAND_META, string> = {
  infant: 'bg-rose-50 text-rose-600',
  preschool: 'bg-amber-50 text-amber-700',
  school: 'bg-indigo-50 text-indigo-600',
};

/** 这张卡上次练到哪。没有记录就不显示，不写「还没练过」占地方 */
export interface ChainLastInfo {
  independent: number;
  total: number;
  score: number | null;
}

function ChainCard({
  target,
  recommended,
  last,
}: {
  target: ChainTarget;
  recommended: boolean;
  last?: ChainLastInfo;
}) {
  const stepCount = target.steps.length;
  const mode = CHAIN_MODE_META[target.defaultMode];

  return (
    <Link
      to={`${LIFE_MODULE.basePath}/${target.id}`}
      data-testid={`chain-target-${target.id}`}
      aria-label={`开始练 ${target.name}`}
      className={`relative flex flex-col gap-3 rounded-[28px] border-2 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-[0.995] ${
        recommended ? 'border-sky-300 ring-2 ring-sky-100' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-base font-extrabold text-white shadow-sm">
          {target.difficulty}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base font-extrabold text-slate-800">{target.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${bandStyle[target.band]}`}>
              {CHAIN_BAND_META[target.band].label}
            </span>
            {recommended && (
              <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[11px] font-bold text-white">建议下一个</span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{target.summary}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{stepCount} 步</span>
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">{mode.label}</span>
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">编号 {target.id}</span>
      </div>

      {last && (
        <div
          data-testid={`chain-last-${target.id}`}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700"
        >
          <span aria-hidden>📈</span>
          <span>
            上次独立 {last.independent}/{last.total} 步
          </span>
          {last.score !== null && <span className="ml-auto shrink-0 text-emerald-600">{last.score} 分</span>}
        </div>
      )}

      <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
        <span aria-hidden>🧰</span>
        <span className="line-clamp-1">需要 {needsLine(target)}</span>
      </div>
    </Link>
  );
}

export default function KidLife() {
  const navigate = useNavigate();
  const { memory } = useKid();
  const [book] = useState<ExpressionBook>(() => loadBookFrom(LIFE_MODULE.bookKey));
  const [student, setStudent] = useState(() => readStudent(memory.nickname || '小朋友'));

  const mine = sessionsOf(book, student);

  /**
   * 某条链「稳了」= 它最近一节课拿了 2 分。
   * 口径来自 nextUp.ts，和首页那张卡共用一份——首页指向 A6、列表却指着 A1 会被当成 bug。
   */
  const stableIds = useMemo(() => chainStableIds(mine), [mine]);

  const practicedCount = useMemo(() => new Set(mine.map((s) => s.targetId)).size, [mine]);

  /**
   * 每张卡上次练到哪。取这条链最近一条带 runs 的记录，**只报最后一遍**——
   * 全程平均会被前几遍拖低，看不出现在的水平。
   * 没有记录就不放进 map，卡片上不写「还没练过」占地方。
   */
  const lastByTarget = useMemo(() => {
    const out = new Map<string, ChainLastInfo>();
    for (const t of CHAIN_TARGETS) {
      const list = mine.filter((s) => s.targetId === t.id);
      const last = list[list.length - 1];
      if (!last?.runs?.length) continue;
      const st = sessionChainStats(t, last.runs);
      if (!st.last) continue;
      out.set(t.id, { independent: st.last.stats.independent, total: st.last.stats.total, score: last.score });
    }
    return out;
  }, [mine]);
  const nextTarget = useMemo(() => suggestNextChain(stableIds, lastBandOf(mine)), [stableIds, mine]);
  const groups = useMemo(() => chainGroups(), []);
  const masteryPct = CHAIN_TARGETS.length > 0 ? Math.round((stableIds.length / CHAIN_TARGETS.length) * 100) : 0;

  const changeStudent = (value: string) => {
    setStudent(value);
    try {
      localStorage.setItem(studentKey, value);
    } catch {
      /* 忽略 */
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-2 sm:px-5"
      data-testid="kid-life-page"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className={`rounded-[32px] bg-gradient-to-r ${LIFE_MODULE.headerGradient} p-5 text-white shadow-lg sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl" aria-hidden>
                {LIFE_MODULE.emoji}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold sm:text-3xl">{LIFE_MODULE.title}</h1>
                <p className="mt-1 text-sm opacity-95 sm:text-base">{LIFE_MODULE.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-2xl bg-white/20 px-4 py-2 text-center">
                <div className="text-2xl font-extrabold leading-tight">{mine.length}</div>
                <div className="text-[11px] font-medium opacity-90">已记录课时</div>
              </div>
              <div className="rounded-2xl bg-white/20 px-4 py-2 text-center">
                <div className="text-2xl font-extrabold leading-tight">{practicedCount}</div>
                <div className="text-[11px] font-medium opacity-90">练过的链</div>
              </div>
              <button
                type="button"
                data-testid="lock-life"
                title="锁定课堂入口，孩子需要重新验证才能进来"
                onClick={() => {
                  lockLessonArea();
                  navigate('/');
                }}
                className="flex h-14 items-center gap-1.5 rounded-2xl bg-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/30 active:scale-[0.98]"
              >
                <span aria-hidden>🔒</span>
                结束课堂
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/15 px-4 py-2.5">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
              <span>整体掌握度</span>
              <span>
                已稳 {stableIds.length} / {CHAIN_TARGETS.length} 条链（{masteryPct}%）
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${masteryPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-slate-100 bg-white/95 p-4 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <span>孩子</span>
            <input
              value={student}
              onChange={(e) => changeStudent(e.target.value)}
              data-testid="life-student"
              className="h-12 w-36 rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-slate-800 outline-none focus:border-sky-400"
            />
          </label>
          <span className="ml-auto rounded-full bg-sky-50 px-3.5 py-1.5 text-xs font-bold text-sky-700">
            下一节：第 {nextSessionNo(book, student)} 课时（跨天连续）
          </span>
        </div>

        {/* 链式教学的解释：第一次进来的老师需要知道「这不是一题一题抽」 */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-[13px] leading-relaxed text-sky-900">
          <span className="font-extrabold">这个模块不抽题，练的是「一条链」。</span>
          一次课把一条链走 2–3 遍，每一步单独判「独立 / 提示 / 示范 / 帮做」。
          记录里最有用的一格是<b>「从第几步开始需要帮助」</b>——它直接告诉你辅助该从哪往后退。
        </div>

        {nextTarget && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-2 border-sky-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-lg font-extrabold text-white shadow-sm">
                {nextTarget.difficulty}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-slate-800">
                  接下来建议练：{nextTarget.name}
                  <span className="ml-2 text-xs font-bold text-slate-400">
                    {CHAIN_BAND_META[nextTarget.band].short} · {nextTarget.steps.length} 步
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{nextTarget.summary}</p>
              </div>
            </div>
            <Link
              to={`${LIFE_MODULE.basePath}/${nextTarget.id}`}
              data-testid="life-start-next"
              className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-sky-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600 active:scale-[0.98]"
            >
              开始练 →
            </Link>
          </div>
        )}

        {groups.map((group) => {
          const meta = CHAIN_GROUP_META[group.group];
          return (
            <section key={group.group} data-testid={`life-group-${group.group}`} className="space-y-3">
              <div className="flex flex-wrap items-baseline gap-2 px-1">
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800">
                  <span aria-hidden>{meta.emoji}</span>
                  {meta.label}
                </h2>
                <span className="text-xs font-bold text-slate-400">{group.targets.length} 条链</span>
              </div>
              <p className="px-1 text-[13px] leading-relaxed text-slate-500">{meta.desc}</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {group.targets.map((t) => (
                  <ChainCard key={t.id} target={t} recommended={nextTarget?.id === t.id} last={lastByTarget.get(t.id)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
