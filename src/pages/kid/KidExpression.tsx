import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lockLessonArea } from '@/config/lessonGate';
import {
  MODALITY_LABEL,
  SETTINGS,
  fitsScene,
  isPrimaryScene,
  isSettingId,
  isStageBand,
  sceneDifficulty,
  settingMeta,
  tierOf,
  type ExpressionBand,
  type ExpressionTier,
  type ExpressionTarget,
  type SettingId,
} from '@/config/expressionTargets';
import {
  SCORE_LABEL,
  STABILITY_LABEL,
  historyLine,
  nextSessionNo,
  sessionsOf,
  targetStat,
  type ExpressionBook,
  type ExpressionSession,
  type ExpressionSubject,
  type StabilityStatus,
} from '@/config/kidExpression';
import { EXPRESSION_MODULE, type LessonModule } from '@/config/lessonModules';
import { RecordExportSheet } from './components/RecordExportSheet';
import { useKid } from './KidContext';

// 键挂在模块前缀下：语言表达是 kidbuddy.expression.*，认知是 kidbuddy.cognition.*
const studentKey = (scope: string) => `${scope}.student`;
const subjectKey = (scope: string) => `${scope}.by`;
const stageKey = (scope: string) => `${scope}.stage`;
const sceneKey = (scope: string) => `${scope}.scene`;

function readStudent(scope: string, fallback: string): string {
  try {
    return localStorage.getItem(studentKey(scope)) || fallback;
  } catch {
    return fallback;
  }
}

function readStage(scope: string): ExpressionBand | 'all' {
  try {
    const raw = localStorage.getItem(stageKey(scope));
    return isStageBand(raw) ? raw : 'all';
  } catch {
    return 'all';
  }
}

function readSubject(scope: string): ExpressionSubject {
  try {
    return localStorage.getItem(subjectKey(scope)) === '家长' ? '家长' : '教师';
  } catch {
    return '教师';
  }
}

function readScene(scope: string): SettingId | 'all' {
  try {
    const raw = localStorage.getItem(sceneKey(scope));
    return isSettingId(raw) ? raw : 'all';
  } catch {
    return 'all';
  }
}

const statusStyle: Record<StabilityStatus, { badge: string; dot: string }> = {
  none: { badge: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  progressing: { badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', dot: 'bg-sky-500' },
  pending: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  stable: { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
};

function ScoreChip({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">未打分</span>;
  }
  const color =
    score === 2
      ? 'bg-emerald-100 text-emerald-700'
      : score === 1
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${color}`}>
      {score} 分 · {SCORE_LABEL[score as 0 | 1 | 2]}
    </span>
  );
}

const tierStyle: Record<ExpressionTier, string> = {
  入门: 'bg-emerald-50 text-emerald-700',
  进阶: 'bg-sky-50 text-sky-700',
  挑战: 'bg-violet-50 text-violet-700',
};

function TargetCard({
  target,
  recommended,
  book,
  student,
  basePath,
  total,
  accent,
  sceneHint,
}: {
  target: ExpressionTarget;
  recommended: boolean;
  book: ExpressionBook;
  student: string;
  basePath: string;
  total: number;
  accent: LessonModule['accent'];
  sceneHint?: string;
}) {
  const stat = targetStat(book, student, target.id);
  const tier = tierOf(target.difficulty);
  const st = statusStyle[stat.status];

  return (
    <Link
      to={`${basePath}/${target.id}`}
      data-testid={`expression-target-${target.id}`}
      className={`flex flex-col gap-3 rounded-[28px] border-2 bg-white p-4 shadow-sm transition hover:shadow-md active:scale-[0.99] ${
        recommended ? `${accent.ring} ring-4 ${accent.soft}` : 'border-slate-100 hover:border-slate-200'
      }`}
    >
      {/* 顶行：难度台阶 + 名称 + ID + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            data-testid={`expression-step-${target.id}`}
            title={`全表第 ${target.difficulty} 级（共 ${total} 个目标），数字越小越容易`}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${accent.solid} text-sm font-extrabold text-white shadow-sm`}
          >
            {target.difficulty}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-800">{target.name}</span>
              <span className="font-mono text-xs font-bold text-slate-400">{target.id}</span>
            </div>
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${st.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden />
          {STABILITY_LABEL[stat.status]}
        </span>
      </div>

      {/* 中部：简介 + 通道/等级/里程碑元信息 */}
      <div className="space-y-2">
        <p className="text-sm leading-snug text-slate-600">{target.summary}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            data-testid={`expression-modality-${target.id}`}
            title={target.modality === 'receptive' ? '听者反应：看动作对不对，不要求开口' : '表达：要把话说出来'}
            className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
              target.modality === 'receptive'
                ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {target.modality === 'receptive' ? '👂 ' : '🗣️ '}
            {MODALITY_LABEL[target.modality]}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tierStyle[tier]}`}>{tier}</span>
          {sceneHint && (
            <span
              data-testid={`scene-tag-${target.id}`}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500"
              title={target.settings.map((id) => settingMeta(id).label).join(' / ')}
            >
              {sceneHint}
            </span>
          )}
          <span
            data-testid={`expression-vbmapp-${target.id}`}
            className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700"
            title={target.vbMapp.milestone}
          >
            VB-MAPP {target.vbMapp.tag}
          </span>
        </div>
      </div>

      {/* 底部：成绩条 + 2分标准 + 开始引导 */}
      <div className="mt-auto space-y-2 pt-1">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50/90 px-3 py-2">
          <ScoreChip score={stat.last} />
          <span className="text-xs font-semibold text-slate-500">已练 {stat.attempts} 次</span>
          <span className="ml-auto truncate text-xs text-slate-400">{historyLine(stat)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="line-clamp-1 min-w-0 flex-1 text-xs text-slate-400">2 分标准：{target.standard2}</span>
          <span
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold ${
              recommended ? `${accent.solid} text-white shadow-sm` : `${accent.soft} ${accent.textStrong}`
            }`}
          >
            {recommended ? '建议先练 →' : '开始 →'}
          </span>
        </div>
      </div>
    </Link>
  );
}

/** 语言表达的目标列表；认知模块复用同一个页面，只换 module */
export default function KidExpression() {
  return <LessonTargetsPage module={EXPRESSION_MODULE} />;
}

export function LessonTargetsPage({ module }: { module: LessonModule }) {
  const navigate = useNavigate();
  const { memory } = useKid();
  const scope = module.storagePrefix;
  const [book] = useState<ExpressionBook>(module.loadBook);
  const [student, setStudent] = useState(() => readStudent(scope, memory.nickname || '小朋友'));
  const [subject, setSubject] = useState<ExpressionSubject>(() => readSubject(scope));
  const [exporting, setExporting] = useState<ExpressionSession | null>(null);
  const [stage, setStage] = useState<ExpressionBand | 'all'>(() => readStage(scope));
  const [scene, setScene] = useState<SettingId | 'all'>(() => readScene(scope));
  const [showExtra, setShowExtra] = useState(false);

  const mine = sessionsOf(book, student);
  const stableIds = module.targets
    .filter((t) => targetStat(book, student, t.id).status === 'stable')
    .map((t) => t.id);
  const stableCount = stableIds.length;
  const pendingCount = module.targets.filter((t) => targetStat(book, student, t.id).status === 'pending').length;
  const nextTarget = module.suggestNext(stableIds);
  const groups = module.stageGroups(stage);
  const masteryPct = module.targets.length > 0 ? Math.round((stableCount / module.targets.length) * 100) : 0;

  /**
   * 选了某个训练场景时，列表换成「主场 + 也能在这里练」两段。
   * 一个目标可以挂在多个场景下，全都平铺会让「桌面」一栏装进 21/23 个目标，
   * 筛选就白做了，所以备选的折叠起来。
   */
  const sceneView = useMemo(() => {
    if (scene === 'all') return null;
    const inScene = module.targets
      .filter((t) => fitsScene(t, scene))
      .filter((t) => stage === 'all' || t.band === stage);
    const byScene = (a: ExpressionTarget, b: ExpressionTarget) =>
      sceneDifficulty(a, scene) - sceneDifficulty(b, scene) || a.difficulty - b.difficulty;
    return {
      primary: inScene.filter((t) => isPrimaryScene(t, scene)).sort(byScene),
      extra: inScene.filter((t) => !isPrimaryScene(t, scene)).sort(byScene),
    };
  }, [module.targets, scene, stage]);

  const changeStage = (value: ExpressionBand | 'all') => {
    setStage(value);
    try {
      localStorage.setItem(stageKey(scope), value);
    } catch {
      /* 忽略 */
    }
  };

  const changeScene = (value: SettingId | 'all') => {
    setScene(value);
    setShowExtra(false);
    try {
      localStorage.setItem(sceneKey(scope), value);
    } catch {
      /* 忽略 */
    }
  };

  const changeStudent = (value: string) => {
    setStudent(value);
    try {
      localStorage.setItem(studentKey(scope), value);
    } catch {
      /* 忽略 */
    }
  };

  const changeSubject = (value: ExpressionSubject) => {
    setSubject(value);
    try {
      localStorage.setItem(subjectKey(scope), value);
    } catch {
      /* 忽略 */
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto px-4 pb-[max(32px,env(safe-area-inset-bottom))] pt-2 sm:px-5"
      data-testid="kid-expression-page"
    >
      <div className="mx-auto max-w-5xl space-y-5">
        {/* 头部 Hero 横幅 + 掌握度进度条 */}
        <div className={`rounded-[32px] bg-gradient-to-r ${module.headerGradient} p-5 text-white shadow-lg sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl" aria-hidden>
                {module.emoji}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold sm:text-3xl">{module.title}</h1>
                <p className="mt-1 text-sm opacity-95 sm:text-base">{module.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="rounded-2xl bg-white/20 px-4 py-2 text-center">
                <div className="text-2xl font-extrabold leading-tight">{mine.length}</div>
                <div className="text-[11px] font-medium opacity-90">已记录课时</div>
              </div>
              <div className="rounded-2xl bg-white/20 px-4 py-2 text-center">
                <div className="text-2xl font-extrabold leading-tight">{stableCount}</div>
                <div className="text-[11px] font-medium opacity-90">已稳定目标</div>
              </div>
              <button
                type="button"
                data-testid="lock-lesson"
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
              <span>整体目标掌握度</span>
              <span>
                已稳定 {stableCount} / {module.targets.length} 个目标（{masteryPct}%）
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${masteryPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* 课堂配置条：学生 + 带练人 + 连续课时号 */}
        <div className="flex flex-wrap items-center gap-3 rounded-[28px] border border-slate-100 bg-white/95 p-4 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <span>孩子</span>
            <input
              value={student}
              onChange={(e) => changeStudent(e.target.value)}
              data-testid="expression-student"
              className={`h-12 w-36 rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-slate-800 outline-none ${module.accent.focusRing}`}
            />
          </label>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
            <span>这节课谁带</span>
            <div className="flex overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 p-0.5">
              {(['教师', '家长'] as ExpressionSubject[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  data-testid={`expression-subject-${v}`}
                  onClick={() => changeSubject(v)}
                  className={`h-12 rounded-lg px-4 text-sm font-bold transition ${
                    subject === v ? `${module.accent.solid} text-white shadow-sm` : 'text-slate-500'
                  }`}
                >
                  {v === '教师' ? '老师带' : '家长带'}
                </button>
              ))}
            </div>
          </div>
          <span className={`ml-auto rounded-full ${module.accent.soft} px-3.5 py-1.5 text-xs font-bold ${module.accent.textStrong}`}>
            下一节：第 {nextSessionNo(book, student)} 课时（跨天连续）
          </span>
        </div>

        {pendingCount > 0 && (
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            ⚠️ 有 {pendingCount} 个目标是「待复核」：最近两次都是 2 分，但一次教师课、一次家长课。需要一节教师课复测，才能算稳定。
          </div>
        )}

        {/* 本节推荐练目标卡片 */}
        {nextTarget && (
          <div className={`flex flex-wrap items-center justify-between gap-4 rounded-[28px] border-2 ${module.accent.softBorder} bg-white p-4 shadow-sm`}>
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${module.accent.solid} text-lg font-extrabold text-white shadow-sm`}>
                {nextTarget.difficulty}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full ${module.accent.soft} px-2.5 py-0.5 text-xs font-extrabold ${module.accent.textStrong}`}>
                    ✨ 建议本节先练
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-400">{nextTarget.id}</span>
                  <span className="text-xs font-bold text-slate-400">· {MODALITY_LABEL[nextTarget.modality]}</span>
                </div>
                <div className="mt-0.5 truncate text-lg font-extrabold text-slate-800">{nextTarget.name}</div>
                <p className="truncate text-xs text-slate-500">{nextTarget.summary}</p>
              </div>
            </div>
            <Link
              to={`${module.basePath}/${nextTarget.id}`}
              className={`flex h-12 shrink-0 items-center gap-1.5 rounded-2xl ${module.accent.solid} px-5 text-sm font-extrabold text-white shadow-sm transition active:scale-[0.98]`}
            >
              开始本节 →
            </Link>
          </div>
        )}

        {/* 目标列表：训练场景 + 学段，两层筛选 */}
        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-xl font-extrabold text-slate-800">全部训练目标</h2>
            <span className="text-xs font-bold text-slate-400">
              {sceneView
                ? '按本场景难度由易到难，圆圈数字仍是全表台阶'
                : '按学段（B → G → K）由易到难，圆圈数字为全表台阶'}
            </span>
          </div>

          {/* 先选「在哪练」：老师和家长共用这一套场景标签 */}
          <div className="mb-2 flex flex-wrap gap-2" data-testid="expression-scene-filter">
            {[
              { key: 'all' as const, label: '🗂️ 全部场景' },
              ...SETTINGS.map((s) => ({ key: s.id, label: `${s.emoji} ${s.label}` })),
            ].map((option) => {
              const active = scene === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  data-testid={`scene-filter-${option.key}`}
                  aria-pressed={active}
                  onClick={() => changeScene(option.key)}
                  className={`h-12 rounded-full px-4 text-sm font-bold transition ${
                    active ? `${module.accent.solid} text-white shadow-sm` : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {scene !== 'all' && (
            <p className="mb-3 text-xs font-bold text-slate-400">{settingMeta(scene).hint}</p>
          )}

          <div className="mb-4 flex flex-wrap gap-2" data-testid="expression-stage-filter">
            {[
              { key: 'all' as const, label: '全部学段' },
              ...module.stages.map((s) => ({ key: s.band, label: `${s.ageLabel} ${s.code}` })),
            ].map((option) => {
              const active = stage === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  data-testid={`stage-filter-${option.key}`}
                  aria-pressed={active}
                  onClick={() => changeStage(option.key)}
                  className={`h-12 rounded-full px-4 text-sm font-bold transition ${
                    active ? `${module.accent.solid} text-white shadow-sm` : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {sceneView && scene !== 'all' ? (
            <div className="space-y-6">
              <section data-testid="scene-primary">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg ${module.accent.icon} px-2.5 py-0.5 text-xs font-extrabold ${module.accent.textStrong}`}>
                    主场
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-700">
                    {settingMeta(scene).emoji} {settingMeta(scene).label}上练的目标
                  </h3>
                  <span className="text-xs font-bold text-slate-400">共 {sceneView.primary.length} 个</span>
                </div>
                {sceneView.primary.length === 0 ? (
                  <p className="rounded-2xl bg-white p-5 text-center text-sm text-slate-400">
                    这个场景 + 这个学段没有主场目标，换一个学段看看。
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {sceneView.primary.map((t) => (
                      <TargetCard
                        key={t.id}
                        target={t}
                        recommended={nextTarget?.id === t.id}
                        book={book}
                        student={student}
                        basePath={module.basePath}
                        total={module.targets.length}
                        accent={module.accent}
                        sceneHint={
                          sceneDifficulty(t, scene) === t.difficulty
                            ? undefined
                            : `本场景难度 ${sceneDifficulty(t, scene)}`
                        }
                      />
                    ))}
                  </div>
                )}
              </section>

              {sceneView.extra.length > 0 && (
                <section data-testid="scene-extra">
                  <button
                    type="button"
                    data-testid="scene-extra-toggle"
                    aria-expanded={showExtra}
                    onClick={() => setShowExtra((v) => !v)}
                    className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300"
                  >
                    <span>
                      也能在这里练 · {sceneView.extra.length} 个目标
                      <span className="ml-2 font-normal text-slate-400">主场在别处，但{settingMeta(scene).label}也做得动</span>
                    </span>
                    <span aria-hidden className="text-slate-400">{showExtra ? '收起 ▲' : '展开 ▼'}</span>
                  </button>
                  {showExtra && (
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      {sceneView.extra.map((t) => (
                        <TargetCard
                          key={t.id}
                          target={t}
                          recommended={nextTarget?.id === t.id}
                          book={book}
                          student={student}
                          basePath={module.basePath}
                          total={module.targets.length}
                          accent={module.accent}
                          sceneHint={`主场在 ${settingMeta(t.settings[0]).label}${
                            sceneDifficulty(t, scene) === t.difficulty
                              ? ''
                              : ` · 难度 ${sceneDifficulty(t, scene)}`
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.stage.band} data-testid={`stage-group-${group.stage.band}`}>
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-lg ${module.accent.icon} px-2.5 py-0.5 text-xs font-extrabold ${module.accent.textStrong}`}>
                      {group.stage.code} 段
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-700">
                      {group.stage.ageLabel} · {group.stage.domainLabel}
                    </h3>
                    <span className="text-xs font-bold text-slate-400">共 {group.targets.length} 个目标</span>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {group.targets.map((t) => (
                      <TargetCard
                        key={t.id}
                        target={t}
                        recommended={nextTarget?.id === t.id}
                        book={book}
                        student={student}
                        basePath={module.basePath}
                        total={module.targets.length}
                        accent={module.accent}
                        sceneHint={`主场 ${settingMeta(t.settings[0]).emoji}${settingMeta(t.settings[0]).label}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 课时账本 */}
        <div className="rounded-[32px] border border-slate-100 bg-white/95 p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold text-slate-800">📋 课时记录（{mine.length}）</h2>
            <span className="text-xs text-slate-400">点「导出」拿到可并入上课记录的 .md</span>
          </div>
          {mine.length === 0 ? (
            <p className="py-6 text-center text-base text-slate-400">还没有记录。挑一个目标，和孩子练完一轮就会自动生成。</p>
          ) : (
            <div className="space-y-2.5">
              {mine
                .slice()
                .reverse()
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-slate-100 bg-slate-50/40 p-3.5"
                  >
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700">
                      第{s.sessionNo}课时
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {s.date} · {s.topic}
                    </span>
                    <span className={`rounded-full ${module.accent.soft} px-2.5 py-0.5 text-xs font-bold ${module.accent.text}`}>
                      {s.targetId}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                      {s.by}
                    </span>
                    <ScoreChip score={s.score} />
                    <button
                      type="button"
                      onClick={() => setExporting(s)}
                      className="ml-auto h-12 rounded-xl bg-slate-800 px-4 text-xs font-bold text-white transition hover:bg-slate-700"
                    >
                      导出 .md
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {exporting && (
        <RecordExportSheet
          session={exporting}
          accentClass={module.accent.solid}
          onClose={() => setExporting(null)}
        />
      )}
    </div>
  );
}
