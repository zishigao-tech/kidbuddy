import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  MODALITY_LABEL,
  SESSION_TASK_COUNT,
  fillSlots,
  isSettingId,
  materialLine,
  recordTaskUsage,
  resolvePicks,
  sceneDifficulty,
  settingMeta,
  type ExpressionTarget,
  type ExpressionTask,
  type MaterialSlot,
  type SettingId,
} from '@/config/expressionTargets';
import { pickSceneTasks, sceneMixLine, type ScenePick } from '@/config/taskScenes';
import { loadTuning, tunedDifficulty, tunedSceneDifficulty } from '@/config/targetTuning';
import { EXPRESSION_MODULE, type LessonModule } from '@/config/lessonModules';
import {
  DTT_OUTCOME_LABEL,
  DTT_PROMPT_LEVELS,
  DTT_WAIT_MS,
  computeDttStats,
  dttCorrection,
  dttMasteryHint,
  dttPraise,
  dttToAchievement,
  type DttOutcome,
  type DttPromptLevel,
} from '@/config/dtt';
import {
  SCORE_LABEL,
  SCORE_RUBRIC,
  composeThreeLines,
  nextSessionNo,
  pickHighlight,
  sessionFileName,
  suggestScore,
  todayIso,
  type Achievement,
  type ExpressionRound,
  type ExpressionSession,
  type ExpressionSubject,
  type Score,
} from '@/config/kidExpression';
import { ChatBubble } from './components/ChatBubble';
import { KidInputBar } from './components/KidInputBar';
import { RecordExportSheet } from './components/RecordExportSheet';
import { useKid, type KidCompanion } from './KidContext';
import { useReadAloud } from './hooks/useReadAloud';

/** 练习台的「教练」气泡：名字、颜色、表情跟随模块 */
function coachFor(module: LessonModule): KidCompanion {
  return {
    member: {
      id: 'expression-coach',
      kind: 'llm',
      name: module.coachName,
      description: `${module.title}练习教练`,
      source: 'builtin',
      providerId: '',
      model: '',
      customPrompt: '',
    },
    meta: {
      catchphrase: '你讲，我听。',
      greeting: '我们开始吧。',
      color: module.accentColor,
      emoji: module.emoji,
    },
  };
}

// 存储键按模块前缀走：语言表达是 kidbuddy.expression.*，认知是 kidbuddy.cognition.*，
// 这样两个模块各自记自己的教具、轮换和学生名，互不污染。
const rotationKey = (scope: string) => `${scope}.rotation`;
const materialKey = (scope: string) => `${scope}.materials`;
const studentKey = (scope: string) => `${scope}.student`;
const subjectKey = (scope: string) => `${scope}.by`;

/** 这个孩子在这个目标上最近练过哪几道题，越靠后越新 */
function readRotation(scope: string, student: string, targetId: string): string[] {
  try {
    const raw = localStorage.getItem(rotationKey(scope));
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, string[]>;
    return all[`${student}::${targetId}`] ?? [];
  } catch {
    return [];
  }
}

function writeRotation(scope: string, student: string, targetId: string, usedIds: string[]): void {
  try {
    const raw = localStorage.getItem(rotationKey(scope));
    const all = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    const key = `${student}::${targetId}`;
    all[key] = recordTaskUsage(all[key] ?? [], usedIds);
    localStorage.setItem(rotationKey(scope), JSON.stringify(all));
  } catch {
    // 存不进去最多下次重复抽同一批题，不影响这节课
  }
}

/** 按目标记住上次选的教具，换个教室不用重新选 */
function readPicks(scope: string, targetId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(materialKey(scope));
    if (!raw) return {};
    const all = JSON.parse(raw) as Record<string, Record<string, string>>;
    return all[targetId] ?? {};
  } catch {
    return {};
  }
}

function writePicks(scope: string, targetId: string, picks: Record<string, string>): void {
  try {
    const raw = localStorage.getItem(materialKey(scope));
    const all = raw ? (JSON.parse(raw) as Record<string, Record<string, string>>) : {};
    all[targetId] = picks;
    localStorage.setItem(materialKey(scope), JSON.stringify(all));
  } catch {
    // 存不进去不影响这节课，下次重新选一遍
  }
}

/** 把题干、提示、判定项里的 {key} 一次性换成今天实际用的教具 */
function fillTasks(tasks: ExpressionTask[], materials: MaterialSlot[], picks: Record<string, string>): ExpressionTask[] {
  return tasks.map((task) => ({
    ...task,
    ask: fillSlots(task.ask, materials, picks),
    hint: fillSlots(task.hint, materials, picks),
    checks: task.checks.map((c) => fillSlots(c, materials, picks)),
  }));
}

function readStudent(scope: string, fallback: string): string {
  try {
    return localStorage.getItem(studentKey(scope)) || fallback;
  } catch {
    return fallback;
  }
}

function readSubject(scope: string): ExpressionSubject {
  try {
    return localStorage.getItem(subjectKey(scope)) === '家长' ? '家长' : '教师';
  } catch {
    return '教师';
  }
}

/**
 * 列表页选了哪个场景，练习台跟着走。
 * 老师是「在地面」那一栏点进来的，抽题就该优先抽地面题——不然筛完场景
 * 进来还是随机抽，筛选白做了。没选场景时是 'all'，行为和以前一样。
 */
function readScene(scope: string): SettingId | 'all' {
  try {
    const raw = localStorage.getItem(`${scope}.scene`);
    return isSettingId(raw) ? raw : 'all';
  } catch {
    return 'all';
  }
}

interface Line {
  id: string;
  isKid: boolean;
  text: string;
  /** 实际朗读的口头指令；为空字符串时表示纯情境/静默提示，不朗读 */
  speakText?: string;
}

/** 把题干/提示开头的（动作/教具摆放说明）和真正要对孩子说的话拆开 */
function parseCue(raw: string): { setup: string; spoken: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^[（(]([^）)]+)[）)]\s*(.*)$/);
  if (!match) return { setup: '', spoken: trimmed };
  return { setup: match[1].trim(), spoken: match[2].trim() };
}

interface TrialSpec {
  key: string;
  taskIndex: number;
  repeatIndex: number;
}

/**
 * 「试次」是 DTT 的标准术语（trial），做 ABA 的老师认这个词，但家长不一定。
 * 不从文案里删掉它——「次」在这个页面里已经指别的东西了，改成「次」会和
 * 「第 1 遍」「已练 3 次」撞车。所以保留术语，在所有计数的地方挂同一句解释。
 */
const TRIAL_HINT = '试次 = 一道题的一次完整回合。一节课抽 4 道题，每道练 2 遍，就是 8 个试次。';

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildTrials(tasks: ExpressionTask[], repeats: number): TrialSpec[] {
  const out: TrialSpec[] = [];
  tasks.forEach((task, taskIndex) => {
    for (let r = 1; r <= repeats; r += 1) out.push({ key: `${task.id}#${r}`, taskIndex, repeatIndex: r });
  });
  return out;
}

function makeRound(spec: TrialSpec, tasks: ExpressionTask[]): ExpressionRound {
  const task = tasks[spec.taskIndex];
  return {
    taskId: spec.key,
    ask: task.ask,
    answer: '',
    checks: task.checks,
    checksHit: [],
    achievement: null,
    outcome: null,
    promptLevel: null,
    repeatIndex: spec.repeatIndex,
  };
}

function outcomeMark(round: ExpressionRound): { text: string; tone: string } {
  // 跳过要先判：它没有 outcome，落到最后会显示成「未判定」，容易被误当成漏做
  if (round.skipped) return { text: '已跳过（不计分）', tone: 'bg-slate-100 text-slate-500' };
  if (round.outcome === 'correct') {
    return round.promptLevel === 'independent'
      ? { text: '独立正确', tone: 'bg-emerald-100 text-emerald-700' }
      : {
          text: `提示后正确 · ${DTT_PROMPT_LEVELS.find((p) => p.value === round.promptLevel)?.short ?? ''}`,
          tone: 'bg-amber-100 text-amber-700',
        };
  }
  if (round.outcome === 'incorrect') return { text: '错误', tone: 'bg-rose-100 text-rose-700' };
  if (round.outcome === 'no_response') return { text: '无反应', tone: 'bg-slate-200 text-slate-600' };
  return { text: '未判定', tone: 'bg-slate-100 text-slate-400' };
}

function trialChipColor(round: ExpressionRound, isCurrent: boolean): string {
  const ring = isCurrent ? 'ring-2 ring-slate-800 ring-offset-1' : '';
  if (round.skipped || round.outcome === 'no_response') return `bg-slate-200 text-slate-600 ${ring}`;
  if (round.outcome === 'correct') {
    return round.promptLevel === 'independent'
      ? `bg-emerald-500 text-white ${ring}`
      : `bg-amber-400 text-white ${ring}`;
  }
  if (round.outcome === 'incorrect') return `bg-rose-500 text-white ${ring}`;
  return isCurrent ? 'bg-slate-800 text-white ring-2 ring-slate-300' : 'bg-white text-slate-400 border border-slate-200';
}

/** 语言表达的练习台入口；认知模块复用同一个页面，只换 module */
export default function KidExpressionPlay() {
  return <LessonPlayPage module={EXPRESSION_MODULE} />;
}

export function LessonPlayPage({ module }: { module: LessonModule }) {
  const { targetId } = useParams();
  const target = module.getTarget(targetId);
  const [replayKey, setReplayKey] = useState(0);
  if (!target) return <Navigate to={module.basePath} replace />;
  return (
    <DttSession
      key={`${target.id}-${replayKey}`}
      target={target}
      module={module}
      onExit={() => setReplayKey((k) => k + 1)}
    />
  );
}

function DttSession({
  target,
  module,
  onExit,
}: {
  target: ExpressionTarget;
  module: LessonModule;
  onExit: () => void;
}) {
  const navigate = useNavigate();
  const { profile, memory, voice, setVoicePrefs } = useKid();
  const readAloud = useReadAloud();
  const coach = coachFor(module);
  const listRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const scope = module.storagePrefix;
  const student = readStudent(scope, memory.nickname || '小朋友');
  const by = readSubject(scope);
  /** 列表页调过的难度，进页面读一次；练习中不改，避免这一节试次口径中途变 */
  const [tuning] = useState(() => loadTuning(scope));

  const [picks, setPicks] = useState<Record<string, string>>(() =>
    resolvePicks(target.materials, readPicks(scope, target.id)),
  );
  // 默认收起教具与备课细节，让平板首屏直接展示指令和判定按钮
  const [showMaterials, setShowMaterials] = useState(false);
  const [showGuideTips, setShowGuideTips] = useState(false);
  const [mobilePane, setMobilePane] = useState<'bench' | 'chat'>('bench');
  /**
   * 本节在哪个场景练：跟着列表页的筛选走，进练习台后不再变（换了要重进）。
   * 中途改场景会让已经判过的试次口径不一致，记录里就说不清「这一节在哪做的」。
   */
  const [liveScene] = useState<SettingId | 'all'>(() => readScene(scope));
  /**
   * 本节抽到的题（题库 8 道，一节只练 4 道，按「多久没练过」轮换）。
   * 场景优先：先抽本场景专属的，不够再从同目标的其他场景借，borrowed 记借了几道。
   */
  const [pick, setPick] = useState<ScenePick<ExpressionTask>>(() =>
    pickSceneTasks(target.tasks, liveScene, SESSION_TASK_COUNT, readRotation(scope, student, target.id)),
  );
  const drawnTasks = pick.tasks;
  const drawnIds = useMemo(() => drawnTasks.map((t) => t.id), [drawnTasks]);
  /** 这一节实际用的难度（老师调过的优先），和配置值分开存，用来判断要不要标「已调」 */
  const playStep =
    liveScene === 'all' ? tunedDifficulty(target, tuning) : tunedSceneDifficulty(target, liveScene, tuning);
  const playBaseStep = liveScene === 'all' ? target.difficulty : sceneDifficulty(target, liveScene);
  const tasks = useMemo(() => fillTasks(drawnTasks, target.materials, picks), [drawnTasks, target, picks]);
  const [repeats, setRepeats] = useState(2);
  const [trials, setTrials] = useState<TrialSpec[]>(() => buildTrials(tasks, 2));
  const [rounds, setRounds] = useState<ExpressionRound[]>(() => buildTrials(tasks, 2).map((s) => makeRound(s, tasks)));
  const roundsRef = useRef(rounds);
  const [idx, setIdx] = useState(0);
  /** 每起一个试次 +1，用来重启 3 秒等待窗 */
  const [trialSeq, setTrialSeq] = useState(0);
  const [phase, setPhase] = useState<'run' | 'review' | 'saved'>('run');
  /** 当前试次阶段：等反应 → 待判定 → 出结果 */
  const [trialStage, setTrialStage] = useState<'await' | 'judge' | 'feedback'>('await');
  const [waitExpired, setWaitExpired] = useState(false);
  const [waitBarGo, setWaitBarGo] = useState(false);
  const [lastJudge, setLastJudge] = useState<{ outcome: DttOutcome; promptLevel: DttPromptLevel } | null>(null);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [answerDraft, setAnswerDraft] = useState('');
  const [lines, setLines] = useState<Line[]>([]);

  const [three, setThree] = useState({ did: '', achieved: '', stuck: '' });
  const [threeDirty, setThreeDirty] = useState(false);
  const [score, setScore] = useState<Score | null>(null);
  const [highlight, setHighlight] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [saved, setSaved] = useState<ExpressionSession | null>(null);
  const [showExport, setShowExport] = useState(false);

  const fontSize = profile.band === 'preschool' ? 21 : 18;

  const currentIdx = Math.min(idx, trials.length - 1);
  const spec = trials[currentIdx];
  const currentTask = tasks[spec.taskIndex];
  const currentRound = rounds[currentIdx];
  const askCue = parseCue(currentTask.ask);
  const hintCue = parseCue(currentTask.hint);
  const stats = computeDttStats(rounds.filter((r) => !r.skipped).map((r) => ({ outcome: r.outcome ?? null, promptLevel: r.promptLevel ?? null })));
  const hasProgress = rounds.some((r) => r.achievement !== null || r.skipped);

  const pushCoach = useCallback(
    (text: string, speakText?: string) => {
      const toSpeak = speakText !== undefined ? speakText : text;
      setLines((prev) => [...prev, { id: newId('coach'), isKid: false, text, speakText: toSpeak }]);
      if (voice.autoReadAloud && readAloud.supported && toSpeak.trim()) {
        readAloud.speakNow(toSpeak, coach.member.id, undefined, 'zh-CN');
      }
    },
    [coach.member.id, readAloud, voice.autoReadAloud],
  );

  /**
   * 起一个试次：说一遍指令，开 3 秒等待窗。
   * 第二个参数用于「刚换掉题库」的场景——那时 tasks 还是上一次渲染的值，
   * 不显式传进来会念出上一批题。
   */
  const startTrial = useCallback(
    (trialSpec: TrialSpec, taskList: ExpressionTask[] = tasks) => {
      const task = taskList[trialSpec.taskIndex];
      const cue = parseCue(task.ask);
      setTrialStage('await');
      setWaitExpired(false);
      setShowPromptPicker(false);
      setAnswerDraft('');
      if (cue.spoken) {
        pushCoach(`第 ${trialSpec.repeatIndex} 遍：${cue.spoken}`, cue.spoken);
      } else {
        pushCoach(`第 ${trialSpec.repeatIndex} 遍（情境）：${cue.setup}`, '');
      }
      setTrialSeq((n) => n + 1);
    },
    [pushCoach, tasks],
  );

  /** 等待窗由试次序号驱动：每个新试次重新计时 3 秒并驱动线性进度条 */
  useEffect(() => {
    if (phase !== 'run' || trialStage !== 'await') return;
    setWaitExpired(false);
    setWaitBarGo(false);
    const raf = requestAnimationFrame(() => setWaitBarGo(true));
    const id = window.setTimeout(() => setWaitExpired(true), DTT_WAIT_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(id);
    };
  }, [trialSeq, trialStage, phase]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startTrial(trials[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines]);

  const persistRounds = (next: ExpressionRound[]) => {
    roundsRef.current = next;
    setRounds(next);
    if (!threeDirty) setThree(composeThreeLines({ rounds: next, targetId: target.id, by }, target));
  };

  /**
   * 改每道题的遍数：已判定和已跳过的试次原样保留，只重建没做过的部分。
   * 之前这里是整节课清空重来——孩子状态好想多练两轮，代价是把已做的记录全丢了。
   */
  const changeRepeats = (value: number) => {
    setRepeats(value);
    const nextTrials = buildTrials(tasks, value);
    const kept = new Map(roundsRef.current.filter((r) => r.achievement !== null || r.skipped).map((r) => [r.taskId, r]));
    const nextRounds = nextTrials.map((s) => kept.get(s.key) ?? makeRound(s, tasks));
    setTrials(nextTrials);
    persistRounds(nextRounds);
    const firstOpen = nextRounds.findIndex((r) => r.achievement === null && !r.skipped);
    const nextIdx = firstOpen === -1 ? nextRounds.length - 1 : firstOpen;
    setIdx(nextIdx);
    startTrial(nextTrials[nextIdx]);
  };

  /**
   * 换教具：只重建还没做的试次，已经判定的保持当时的题干不动——
   * 记录要反映当时真实用的东西，不能被后来的替换改掉。
   */
  const changeMaterial = (slotKey: string, name: string) => {
    const nextPicks = { ...picks, [slotKey]: name };
    setPicks(nextPicks);
    writePicks(scope, target.id, nextPicks);
    // 只重填本节抽到的那几道，试次下标是按这一批算的
    const nextTasks = fillTasks(drawnTasks, target.materials, nextPicks);
    const nextRounds = trials.map((s, i) => {
      const old = roundsRef.current[i];
      if (old && (old.achievement !== null || old.skipped)) return old;
      return makeRound(s, nextTasks);
    });
    persistRounds(nextRounds);
    const current = nextRounds[idx];
    if (current && current.achievement === null && !current.skipped) {
      const cue = parseCue(nextTasks[spec.taskIndex].ask);
      if (cue.spoken) {
        pushCoach(`换成「${name}」，第 ${spec.repeatIndex} 遍：${cue.spoken}`, cue.spoken);
      } else {
        pushCoach(`换成「${name}」，第 ${spec.repeatIndex} 遍（情境）：${cue.setup}`, '');
      }
      setTrialStage('await');
      setWaitExpired(false);
      setShowPromptPicker(false);
      setAnswerDraft('');
      setTrialSeq((n) => n + 1);
    }
  };

  /** 换一批：还没开始判定时，从题库里另外抽几道 */
  const redraw = () => {
    if (roundsRef.current.some((r) => r.achievement !== null || r.skipped)) return;
    const nextPick = pickSceneTasks(target.tasks, liveScene, SESSION_TASK_COUNT, [
      ...readRotation(scope, student, target.id),
      ...drawnIds,
    ]);
    const nextTasks = fillTasks(nextPick.tasks, target.materials, picks);
    const nextTrials = buildTrials(nextTasks, repeats);
    setPick(nextPick);
    setTrials(nextTrials);
    persistRounds(nextTrials.map((s) => makeRound(s, nextTasks)));
    setIdx(0);
    setLines([]);
    pushCoach('换一批题，我们重新开始。', '');
    startTrial(nextTrials[0], nextTasks);
  };

  /** 孩子说完了：先把原话记下来，进入待判定 */
  const submitAnswer = (text: string) => {
    if (trialStage !== 'await') return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setLines((prev) => [...prev, { id: newId('kid'), isKid: true, text: trimmed }]);
    setAnswerDraft(trimmed);
    const next = roundsRef.current.map((r, i) => (i === idx ? { ...r, answer: trimmed } : r));
    roundsRef.current = next;
    setRounds(next);
    setTrialStage('judge');
  };

  const judge = (outcome: DttOutcome, promptLevel: DttPromptLevel) => {
    const achievement = dttToAchievement({ outcome, promptLevel });
    const next = roundsRef.current.map((r, i) =>
      i === idx ? { ...r, outcome, promptLevel, achievement, answer: r.answer || answerDraft } : r,
    );
    persistRounds(next);
    setLastJudge({ outcome, promptLevel });
    setShowPromptPicker(false);
    setTrialStage('feedback');
    pushCoach(outcome === 'correct' ? dttPraise(promptLevel, idx) : dttCorrection(outcome));
  };

  const enterReview = () => {
    readAloud.cancel();
    const source = roundsRef.current;
    setThree(composeThreeLines({ rounds: source, targetId: target.id, by }, target));
    setScore(suggestScore(source));
    setHighlight(pickHighlight(source));
    setPhase('review');
  };

  const advance = () => {
    if (idx + 1 >= trials.length) {
      enterReview();
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    startTrial(trials[nextIdx]);
  };

  /**
   * 这题先跳过：教具凑不出来、孩子这会儿不配合、场地做不了。
   * 记 skipped 而不是「没做到」，后面所有统计都排除它，分数不会被凭空拉低。
   */
  const skipCurrent = () => {
    const next = roundsRef.current.map((r, i) => (i === idx ? { ...r, skipped: true, achievement: null, outcome: null } : r));
    persistRounds(next);
    pushCoach('这题先跳过，我们换下一个。');
    advance();
  };

  /** 同一道题再来一遍：在当前试次后面插一个同题试次 */
  const retry = () => {
    const used = roundsRef.current.filter((r) => r.taskId.startsWith(`${currentTask.id}#`)).length;
    const spec2: TrialSpec = { key: `${currentTask.id}#${used + 1}`, taskIndex: spec.taskIndex, repeatIndex: used + 1 };
    const nextTrials = [...trials];
    nextTrials.splice(idx + 1, 0, spec2);
    setTrials(nextTrials);
    const nextRounds = [...roundsRef.current];
    nextRounds.splice(idx + 1, 0, makeRound(spec2, tasks));
    persistRounds(nextRounds);
    setIdx(idx + 1);
    startTrial(spec2);
  };

  const overrideAchievement = (taskId: string, achievement: Achievement) => {
    const next = roundsRef.current.map((r) => {
      if (r.taskId !== taskId) return r;
      if (achievement === 'independent') {
        return { ...r, achievement, outcome: 'correct' as DttOutcome, promptLevel: 'independent' as DttPromptLevel };
      }
      if (achievement === 'failed') {
        return { ...r, achievement, outcome: 'incorrect' as DttOutcome };
      }
      return {
        ...r,
        achievement,
        outcome: 'correct' as DttOutcome,
        promptLevel: r.promptLevel && r.promptLevel !== 'independent' ? r.promptLevel : ('verbal' as DttPromptLevel),
      };
    });
    persistRounds(next);
  };

  const toggleCheck = (round: ExpressionRound, check: string) => {
    const has = round.checksHit.includes(check);
    const next = roundsRef.current.map((r) =>
      r.taskId === round.taskId ? { ...r, checksHit: has ? r.checksHit.filter((c) => c !== check) : [...r.checksHit, check] } : r,
    );
    persistRounds(next);
  };

  const save = () => {
    const book = module.loadBook();
    const session: ExpressionSession = {
      id: newId('session'),
      student,
      date: todayIso(),
      sessionNo: nextSessionNo(book, student),
      topic: target.name,
      targetId: target.id,
      by,
      rounds,
      score,
      threeLines: three,
      highlight,
      nextStep,
      materials: picks,
      setting: liveScene === 'all' ? undefined : liveScene,
      createdAt: Date.now(),
    };
    module.addSession(book, session);
    writeRotation(scope, student, target.id, drawnIds);
    setSaved(session);
    setPhase('saved');
  };

  /** 判定按钮面板：在 await（直接判动作/口头）和 judge（记完原话后判）共用 */
  const renderJudgeButtons = (includeNoResponse: boolean) => (
    <div className="space-y-2.5" data-testid="dtt-judge">
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => judge('correct', 'independent')}
          data-testid="judge-independent"
          className="flex h-14 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98]"
        >
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-black"
            aria-hidden
          >
            ✓
          </span>
          <span>独立正确</span>
        </button>
        <button
          type="button"
          onClick={() => setShowPromptPicker((v) => !v)}
          data-testid="judge-prompted"
          className={`flex h-14 items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.98] ${
            showPromptPicker ? 'ring-2 ring-amber-300 ring-offset-1' : ''
          }`}
        >
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-black"
            aria-hidden
          >
            ◐
          </span>
          <span>提示后正确</span>
        </button>
        <button
          type="button"
          onClick={() => judge('incorrect', 'independent')}
          data-testid="judge-failed"
          className="flex h-14 items-center justify-center gap-1.5 rounded-2xl bg-rose-500 px-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-rose-600 active:scale-[0.98]"
        >
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-black"
            aria-hidden
          >
            ✕
          </span>
          <span>错误</span>
        </button>
      </div>

      {showPromptPicker && (
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-2.5 sm:grid-cols-3">
          {DTT_PROMPT_LEVELS.filter((p) => p.value !== 'independent').map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => judge('correct', p.value)}
              data-testid={`prompt-${p.value}`}
              className="flex h-14 flex-col items-center justify-center rounded-xl border border-amber-300 bg-white px-2 text-amber-800 shadow-sm transition hover:bg-amber-50"
            >
              <span className="text-xs font-extrabold">{p.label}</span>
              <span className="max-w-full truncate text-[10px] font-medium text-amber-700/80">{p.desc}</span>
            </button>
          ))}
        </div>
      )}

      {includeNoResponse && (
        <button
          type="button"
          onClick={() => judge('no_response', 'independent')}
          data-testid="judge-no-response"
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
        >
          <span aria-hidden>⏳</span>
          <span>等不到反应，记为无反应</span>
        </button>
      )}
    </div>
  );

  // ======================= 评审页 =======================
  if (phase === 'review') {
    const mastery = dttMasteryHint(stats);
    const activeCount = rounds.filter((r) => !r.skipped).length;
    const skippedCount = rounds.filter((r) => r.skipped).length;
    return (
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-[max(24px,env(safe-area-inset-bottom))]"
        data-testid="expression-review"
      >
        <div className="mx-auto w-full max-w-4xl space-y-4 py-3">
          <div className={`rounded-[28px] bg-gradient-to-r ${module.headerGradient} p-5 text-white shadow-lg`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold">填写这节课的记录</h1>
                <p className="mt-1 text-sm opacity-95">
                  {target.id} {target.name} · {by}带练 · {student}
                  {skippedCount > 0 ? ` · 已跳过 ${skippedCount} 题不计分` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="rounded-2xl bg-white/20 px-3.5 py-2 text-center">
                  <div className="text-xl font-extrabold">
                    {stats.total}/{activeCount}
                  </div>
                  <div className="text-[11px] opacity-90">已判定试次</div>
                </div>
                <div className="rounded-2xl bg-white/20 px-3.5 py-2 text-center">
                  <div className="text-xl font-extrabold">{Math.round(stats.independentRate * 100)}%</div>
                  <div className="text-[11px] opacity-90">独立正确率</div>
                </div>
                <div className="rounded-2xl bg-white/20 px-3.5 py-2 text-center">
                  <div className="text-xl font-extrabold">{stats.maxIndependentStreak}</div>
                  <div className="text-[11px] opacity-90">最长连续独立</div>
                </div>
              </div>
            </div>
          </div>

          {mastery && (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800" data-testid="dtt-mastery-hint">
              📈 {mastery}
            </div>
          )}

          <div className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-slate-800">一、逐试次回看</h2>
              <span className="text-xs text-slate-400">判定不准可以直接改，三行草稿会跟着变</span>
            </div>
            <div className="space-y-3">
              {rounds.map((r, i) => {
                const mark = outcomeMark(r);
                return (
                  <div key={r.taskId} className="rounded-2xl border-2 border-slate-100 p-3.5">
                    <div className="flex flex-wrap items-start gap-2">
                      <span
                        title={`第 ${i + 1} 个试次：${TRIAL_HINT}`}
                        className="cursor-help rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600"
                      >
                        第 {i + 1} 试次
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${mark.tone}`}>{mark.text}</span>
                      <span className="min-w-0 flex-1 text-sm font-bold text-slate-700">{r.ask}</span>
                    </div>
                    <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-slate-700">
                      {r.answer.trim() ? `原话：「${r.answer.trim()}」` : '（这一试次没有记录到原话）'}
                    </div>
                    {r.checks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {r.checks.map((c) => {
                          const hit = r.checksHit.includes(c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggleCheck(r, c)}
                              className={`flex h-12 items-center rounded-xl border-2 px-3 text-xs font-bold ${
                                hit ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'
                              }`}
                            >
                              {hit ? '✓ ' : '○ '}
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {(['independent', 'prompted', 'failed'] as Achievement[]).map((a) => (
                        <button
                          key={a}
                          type="button"
                          data-testid={`judge-${a}`}
                          onClick={() => overrideAchievement(r.taskId, a)}
                          className={`flex h-12 items-center gap-1.5 rounded-xl border-2 px-3 text-xs font-bold ${
                            r.achievement === a
                              ? a === 'independent'
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : a === 'prompted'
                                  ? 'border-amber-500 bg-amber-500 text-white'
                                  : 'border-rose-500 bg-rose-500 text-white'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          {a === 'independent' ? '✓ 独立正确' : a === 'prompted' ? '◐ 提示后正确' : '✕ 错误 / 无反应'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-slate-800">二、目标达成得分</h2>
              <button
                type="button"
                onClick={() => setScore(suggestScore(roundsRef.current))}
                className="h-12 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600"
              >
                按当前判定重新建议
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {([0, 1, 2] as Score[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  data-testid={`score-${s}`}
                  onClick={() => setScore(s)}
                  className={`flex h-14 min-w-[9rem] flex-1 flex-col items-center justify-center rounded-2xl border-2 text-sm font-bold ${
                    score === s ? `${module.accent.ring} ${module.accent.soft} ${module.accent.textStrong}` : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  <span className="text-lg">{s} 分</span>
                  <span className="text-xs font-medium">{SCORE_LABEL[s]}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              建议分按独立正确率给：≥80% 记 2，50%-80% 记 1，其余记 0。口径：{SCORE_RUBRIC} 分数由你确认，系统不替你判断。
            </p>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-slate-800">三、课堂记录三行</h2>
              <button
                type="button"
                onClick={() => {
                  setThree(composeThreeLines({ rounds: roundsRef.current, targetId: target.id, by }, target));
                  setThreeDirty(false);
                }}
                className="h-12 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600"
              >
                按当前判定重算草稿
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-400">草稿会跟着判定自动更新；你一旦手动改过某一行，就不再自动覆盖。</p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-500">今天做了什么</span>
                <textarea
                  value={three.did}
                  onChange={(e) => {
                    setThreeDirty(true);
                    setThree((p) => ({ ...p, did: e.target.value }));
                  }}
                  rows={3}
                  className={`mt-1 w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none ${module.accent.focusRing}`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500">做到了什么</span>
                <textarea
                  value={three.achieved}
                  onChange={(e) => {
                    setThreeDirty(true);
                    setThree((p) => ({ ...p, achieved: e.target.value }));
                  }}
                  rows={3}
                  className={`mt-1 w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none ${module.accent.focusRing}`}
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500">卡在哪</span>
                <textarea
                  value={three.stuck}
                  onChange={(e) => {
                    setThreeDirty(true);
                    setThree((p) => ({ ...p, stuck: e.target.value }));
                  }}
                  rows={3}
                  className={`mt-1 w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none ${module.accent.focusRing}`}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-extrabold text-slate-800">
              四、{by === '家长' ? '下次课调整（教师备课用）' : '家长沟通要点'}
            </h2>
            <label className="block">
              <span className="text-xs font-bold text-slate-500">
                {by === '家长' ? '家长课不写这段，导出时自动换成家庭训练指导八项' : '可以告诉家长的一句进步'}
              </span>
              <textarea
                value={highlight}
                onChange={(e) => setHighlight(e.target.value)}
                rows={2}
                placeholder="取孩子自己说的一句话，不要写「表现不错」"
                className={`mt-1 w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none ${module.accent.focusRing}`}
              />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-bold text-slate-500">{by === '家长' ? '下次课调整' : '本周家庭任务 / 下次调整'}</span>
              <textarea
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                rows={2}
                placeholder="一句话说清下周练什么、怎么练"
                className={`mt-1 w-full rounded-xl border-2 border-slate-200 p-2.5 text-sm outline-none ${module.accent.focusRing}`}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pb-4">
            <button
              type="button"
              onClick={() => setPhase('run')}
              title={`回去继续练，不保存这一节。${TRIAL_HINT}`}
              className="h-14 flex-1 rounded-2xl bg-white text-base font-bold text-slate-600 shadow-sm"
            >
              回去再练几个试次
            </button>
            <button type="button" onClick={save} data-testid="save-session" className={`h-14 flex-[2] rounded-2xl ${module.accent.solid} text-base font-extrabold text-white shadow-sm`}>
              保存这份记录
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================= 已保存 =======================
  if (phase === 'saved' && saved) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 pb-[max(24px,env(safe-area-inset-bottom))]" data-testid="expression-saved">
        <div className="w-full max-w-lg rounded-[32px] bg-white p-6 text-center shadow-lg">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-800">记录已保存</h1>
          <p className="mt-2 text-sm text-slate-500">
            第{saved.sessionNo}课时 · {saved.date} · {saved.targetId} {target.name}
            {saved.score === null ? '（未打分）' : ` · ${saved.score} 分`}
          </p>
          <p className="mt-1 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{sessionFileName(saved)}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" onClick={() => setShowExport(true)} className="flex h-14 items-center justify-center rounded-2xl bg-slate-800 text-base font-bold text-white">
              导出成课堂记录 .md
            </button>
            <button type="button" onClick={() => navigate(module.basePath)} className={`flex h-14 items-center justify-center rounded-2xl ${module.accent.solid} text-base font-bold text-white`}>
              回{module.title}
            </button>
            <button type="button" onClick={onExit} className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">
              再练一次
            </button>
          </div>
        </div>
        {showExport && (
          <RecordExportSheet
            session={saved}
            accentClass={module.accent.solid}
            onClose={() => setShowExport(false)}
          />
        )}
      </div>
    );
  }

  // ======================= 试次执行 =======================
  const feedbackCorrect = lastJudge?.outcome === 'correct';
  const showBenchOnMobile = mobilePane === 'bench';
  const firstAskCue = parseCue(tasks[0]?.ask ?? '');
  const showOpenerNote = Boolean(target.opener.trim() && target.opener.trim() !== firstAskCue.spoken);

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="expression-play" data-target={target.id} data-trial={idx + 1}>
      {/* 顶部栏：与下方双栏和底部输入栏保持同宽对齐 */}
      <div className="mx-auto flex w-full max-w-6xl shrink-0 items-center gap-2.5 px-4 pb-2 sm:gap-3">
        <Link to={module.basePath} aria-label={`返回${module.title}`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
          ←
        </Link>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${module.accent.icon} text-2xl sm:text-3xl`} aria-hidden>
          {module.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1 className="truncate text-lg font-extrabold text-slate-800 sm:text-xl">
              {target.id} {target.name}
            </h1>
            <span
              className={`rounded-lg px-1.5 py-0.5 text-[11px] font-extrabold ${
                target.modality === 'receptive' ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {MODALITY_LABEL[target.modality]}
            </span>
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 sm:inline">
              VB-MAPP {target.vbMapp.tag}
            </span>
            {/*
              显示这一节实际用的难度，而不是配置里的固定台阶。
              老师刚在列表页把它从 7 调到 5，进来还写 7 就会以为没生效。
            */}
            <span
              data-testid="play-step"
              data-tuned={playStep !== playBaseStep ? 'true' : 'false'}
              title={`${
                liveScene === 'all' ? '全表台阶' : `${settingMeta(liveScene).label}上的难度`
              } ${playStep}（配置值 ${playBaseStep}，数字越小越容易）`}
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                playStep !== playBaseStep
                  ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {liveScene === 'all' ? '台阶' : `${settingMeta(liveScene).label}难度`} {playStep}
              {playStep !== playBaseStep && ' · 已调'}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            <span
              title={TRIAL_HINT}
              className="cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2"
            >
              试次 {Math.min(idx + 1, trials.length)}/{trials.length}
            </span>{' '}
            · 连续独立 {stats.currentStreak} 次 · {by}带练 · {student}
          </div>
        </div>
        {readAloud.supported && (
          <button
            type="button"
            onClick={() => {
              if (voice.autoReadAloud) readAloud.cancel();
              setVoicePrefs({ autoReadAloud: !voice.autoReadAloud });
            }}
            className={`flex h-12 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold shadow-sm transition ${
              voice.autoReadAloud ? `${module.accent.solid} text-white` : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            <span aria-hidden>{voice.autoReadAloud ? '🔊' : '🔈'}</span>
            <span className="hidden sm:inline">{voice.autoReadAloud ? '自动朗读' : '朗读关'}</span>
          </button>
        )}
      </div>

      {/* 试次进度条 + 平板竖屏分栏切换 */}
      <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-wrap items-center justify-between gap-2 px-4 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {rounds.map((r, i) => (
            <span
              key={r.taskId}
              className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold transition ${trialChipColor(
                r,
                i === idx,
              )}`}
            >
              {i + 1}
            </span>
          ))}
          <span className="ml-1 text-xs font-bold text-slate-500">
            独立率 {stats.total > 0 ? `${Math.round(stats.independentRate * 100)}%` : '—'}
          </span>
        </div>

        <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-0.5 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePane('bench')}
            className={`flex h-12 items-center gap-1 rounded-xl px-3.5 text-xs font-extrabold transition ${
              showBenchOnMobile ? `${module.accent.solid} text-white` : 'text-slate-600'
            }`}
          >
            📋 练习操作台
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('chat')}
            className={`flex h-12 items-center gap-1 rounded-xl px-3.5 text-xs font-extrabold transition ${
              !showBenchOnMobile ? `${module.accent.solid} text-white` : 'text-slate-600'
            }`}
          >
            📝 辅助与实录 ({lines.length})
          </button>
        </div>
      </div>

      {/* 主区域：宽屏 62/38 左右分栏，竖屏平板切换单栏 */}
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-3 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        {/* 左：DTT 操作台 */}
        <div
          className={`${
            showBenchOnMobile ? 'flex' : 'hidden lg:flex'
          } min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-[28px] border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5`}
        >
          {/* Tier 1：统一清爽备课条 */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">每题</span>
                <div className="flex overflow-hidden rounded-xl bg-slate-100 p-0.5">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => changeRepeats(n)}
                      data-testid={`repeats-${n}`}
                      className={`h-12 rounded-[10px] px-3.5 text-sm font-extrabold transition ${
                        repeats === n ? `${module.accent.solid} text-white shadow-sm` : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {n}遍
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2" data-testid="task-pool">
                {liveScene !== 'all' && (
                  <span
                    data-testid="play-scene"
                    className={`flex h-12 items-center gap-1 rounded-lg px-2.5 text-xs font-bold ${
                      pick.borrowed > 0
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                    title={
                      pick.borrowed > 0
                        ? `${settingMeta(liveScene).label}只有 ${pick.inScene} 道专属题，为了凑够一节的强度，从别的场景借了 ${pick.borrowed} 道——记录里会写清这一节不完全在${settingMeta(liveScene).label}做的`
                        : `这一节全部是${settingMeta(liveScene).label}专属题`
                    }
                  >
                    <span aria-hidden>{settingMeta(liveScene).emoji}</span>
                    {settingMeta(liveScene).label}
                    {pick.borrowed > 0 && <span className="text-[10px]">借 {pick.borrowed} 道</span>}
                  </span>
                )}
                <span
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600"
                  title={`本节题目分布：${sceneMixLine(drawnTasks) || '—'}（按每道题可用的场景计，一题可能算两个场景）`}
                >
                  本节抽到 {drawnIds.length} 道 / 题库共 {target.tasks.length} 道
                </span>
                <button
                  type="button"
                  disabled={hasProgress}
                  onClick={redraw}
                  data-testid="redraw-tasks"
                  title={hasProgress ? '本节已开始判定，如需换题请点左上角重进' : '从题库换一批没练过的题'}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  换一批
                </button>
              </div>
            </div>

            {target.materials.length > 0 && (
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 px-3.5 py-1" data-testid="material-picker">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">
                    🧸 教具：{materialLine(target.materials, picks)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMaterials((v) => !v)}
                    data-testid="material-toggle"
                    className={`h-12 shrink-0 px-2 text-sm font-bold ${module.accent.text} hover:underline`}
                  >
                    {showMaterials ? '收起' : '更换教具'}
                  </button>
                </div>
                {showMaterials && (
                  <div className="pb-2">
                    {target.materials.map((slot) => (
                      <div key={slot.key} className="mt-2">
                        <div className="text-[11px] font-bold text-slate-500">{slot.label}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {slot.options.map((opt) => (
                            <button
                              key={opt.name}
                              type="button"
                              onClick={() => changeMaterial(slot.key, opt.name)}
                              data-testid={`material-${slot.key}-${opt.name}`}
                              title={opt.note ?? ''}
                              className={`h-12 rounded-full px-3 text-xs font-bold transition ${
                                picks[slot.key] === opt.name
                                  ? `${module.accent.solid} text-white shadow-sm`
                                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {opt.name}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1 text-[11px] leading-snug text-slate-400">都没有？{slot.fallback}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tier 2：核心指令舞台卡 */}
          <div className={`rounded-2xl border ${module.accent.softBorder} bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  title={TRIAL_HINT}
                  className={`cursor-help rounded-full ${module.accent.soft} px-3 py-1 text-xs font-extrabold ${module.accent.textStrong}`}
                >
                  第 {Math.min(idx + 1, trials.length)} 试次 · 第 {spec.repeatIndex} 遍
                </span>
                {target.modality === 'receptive' && (
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-200/80">
                    👂 看动作，不要求开口
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowGuideTips((v) => !v)}
                className="h-12 rounded-xl px-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
              >
                {showGuideTips ? '收起提示标准' : '辅助顺序与达标口径'}
              </button>
            </div>

            <div data-testid="dtt-instruction">
              {askCue.setup && askCue.spoken ? (
                <>
                  <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-sm leading-relaxed text-slate-600">
                    <span className="mr-2 inline-block rounded-md bg-white px-2 py-0.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200/80">
                      摆放 / 动作
                    </span>
                    {askCue.setup}
                  </div>
                  <div className="mt-3 text-[26px] font-extrabold leading-snug tracking-tight text-slate-900 sm:text-[30px]">
                    {askCue.spoken}
                  </div>
                </>
              ) : askCue.setup ? (
                <div className="mt-3 space-y-2">
                  <span className="inline-block rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                    情境与动作 · 暂不开口
                  </span>
                  <div className="text-xl font-extrabold leading-relaxed text-slate-800 sm:text-2xl">
                    {askCue.setup}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-[26px] font-extrabold leading-snug tracking-tight text-slate-900 sm:text-[30px]">
                  {askCue.spoken}
                </div>
              )}
            </div>

            {showGuideTips && (
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-800">
                  <span className="font-bold">辅助从轻到重：</span>
                  {DTT_PROMPT_LEVELS.filter((p) => p.value !== 'independent')
                    .map((p) => p.short)
                    .join(' → ')}
                  （给了就要往下退）
                </div>
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-800">
                  <span className="font-bold">本次达标：</span>
                  {target.sessionSuccess}
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 text-slate-500">
                  <span className="font-bold">2 分标准：</span>
                  {target.standard2}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {readAloud.supported && askCue.spoken && (
                <button
                  type="button"
                  onClick={() => readAloud.speakNow(askCue.spoken, coach.member.id, undefined, 'zh-CN')}
                  className={`flex h-12 min-w-[140px] flex-1 items-center justify-center gap-1.5 rounded-xl border ${module.accent.softBorder} ${module.accent.soft} px-3 text-sm font-extrabold ${module.accent.textStrong} transition hover:opacity-90`}
                >
                  🔊 再说一遍指令
                </button>
              )}
              <button
                type="button"
                onClick={skipCurrent}
                data-testid="skip-trial"
                className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                这题跳过 →
              </button>
              <button
                type="button"
                onClick={enterReview}
                data-testid="finish-practice"
                className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                提前收尾，去填记录 →
              </button>
            </div>
          </div>

          {/* Tier 3：等待窗与判定操作台 */}
          {trialStage === 'await' && (
            <div className="space-y-3 border-t border-slate-100 pt-3.5">
              <div
                className={`overflow-hidden rounded-xl border px-3.5 py-2.5 text-sm font-bold transition ${
                  waitExpired ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200/80 bg-slate-50 text-slate-600'
                }`}
                data-testid="dtt-wait"
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {waitExpired
                      ? '已等满 3 秒没反应 —— 可参考右侧辅助提示，再等他一次。'
                      : '说完就闭嘴，等 3 秒。他没反应不要重复指令。'}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    key={trialSeq}
                    className={`h-full rounded-full transition-all ease-linear ${waitExpired ? 'bg-amber-500' : 'bg-slate-400'}`}
                    style={{
                      width: waitBarGo ? '100%' : '0%',
                      transitionDuration: `${DTT_WAIT_MS}ms`,
                    }}
                  />
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                {target.modality === 'receptive'
                  ? '孩子做出动作后直接点判定（不用等他说话，也可在右侧勾选观察要点）：'
                  : '孩子口头说完可直接点判定，或在下方语音/打字记下原话后再判：'}
              </div>

              {renderJudgeButtons(true)}
            </div>
          )}

          {trialStage === 'judge' && (
            <div className="space-y-3 border-t border-slate-100 pt-3.5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-sm font-bold text-slate-700">
                已记录孩子原话：「{answerDraft}」
              </div>
              <div className="text-xs font-semibold text-slate-500">按刚才这一次反应判定，别掺上次的印象：</div>
              {renderJudgeButtons(false)}
            </div>
          )}

          {trialStage === 'feedback' && lastJudge && (
            <div
              className={`rounded-2xl border p-4 ${feedbackCorrect ? 'border-emerald-200 bg-emerald-50/80' : 'border-slate-200 bg-slate-50'}`}
              data-testid="dtt-feedback"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg">{feedbackCorrect ? (lastJudge.promptLevel === 'independent' ? '⭐⭐' : '⭐') : '↩️'}</span>
                <span className={`text-base font-extrabold ${feedbackCorrect ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {feedbackCorrect
                    ? lastJudge.promptLevel === 'independent'
                      ? '独立正确'
                      : `提示后正确（${DTT_PROMPT_LEVELS.find((p) => p.value === lastJudge.promptLevel)?.label}）`
                    : DTT_OUTCOME_LABEL[lastJudge.outcome]}
                </span>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-slate-500">
                {feedbackCorrect ? '结果出现要立刻给，超过 2 秒就不算即时强化了。' : '不批评、不追问原因，退回上一级辅助重来。'}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={retry}
                  data-testid="dtt-retry"
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  {feedbackCorrect ? '🔁 再做一遍巩固' : '🔁 同一道题再来一遍'}
                </button>
                <button
                  type="button"
                  onClick={skipCurrent}
                  data-testid="skip-trial-feedback"
                  className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50"
                >
                  跳过
                </button>
                <button
                  type="button"
                  onClick={advance}
                  data-testid="dtt-next"
                  title={
                    idx + 1 >= trials.length
                      ? '这一节练完了，去填三行记录并保存'
                      : `进入下一个试次：同一道题还有下一遍就继续这道题，没有就换下一道。${TRIAL_HINT}`
                  }
                  className={`flex h-12 flex-1 items-center justify-center rounded-xl ${module.accent.solid} text-sm font-bold text-white shadow-sm transition hover:opacity-95`}
                >
                  {idx + 1 >= trials.length ? '练习结束，去填记录 →' : '下一次试 →'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 右：本试次观察要点与辅助提示 + 课堂实录 */}
        <div
          className={`${
            showBenchOnMobile ? 'hidden lg:flex' : 'flex'
          } min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-sm`}
        >
          {(currentTask.checks.length > 0 || currentTask.hint) && (
            <div className="shrink-0 space-y-3 border-b border-slate-100 bg-slate-50/40 p-4">
              {currentTask.checks.length > 0 && currentRound && (
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-700">本试次观察要点</span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      已勾选 {currentRound.checksHit.length}/{currentTask.checks.length}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {currentTask.checks.map((c) => {
                      const hit = currentRound.checksHit.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCheck(currentRound, c)}
                          className={`flex min-h-12 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-left text-xs font-bold transition ${
                            hit
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span aria-hidden>{hit ? '✓' : '○'}</span>
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {currentTask.hint && (
                <div
                  className={`rounded-xl border px-3 py-2.5 text-xs transition ${
                    waitExpired && trialStage === 'await'
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
                      : 'border-amber-200/70 bg-amber-50/50 text-amber-900/90'
                  }`}
                >
                  <div className="font-extrabold">💡 卡住时可以这样辅助</div>
                  {hintCue.setup && <div className="mt-1 leading-relaxed text-amber-800/85">动作：{hintCue.setup}</div>}
                  {hintCue.spoken && <div className="mt-1 font-bold leading-relaxed text-amber-950">提示语：{hintCue.spoken}</div>}
                </div>
              )}
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2 text-xs">
              <span className="font-bold text-slate-600">课堂实录</span>
              <span className="text-[11px] text-slate-400">孩子原话照录，不改写</span>
            </div>
            <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {showOpenerNote && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <span className="font-bold text-slate-600">开场引导：</span>
                  {target.opener}
                </div>
              )}
              {lines.map((m) => (
                <ChatBubble
                  key={m.id}
                  isKid={m.isKid}
                  speakerName={m.isKid ? student : coach.member.name}
                  content={m.text}
                  companion={m.isKid ? undefined : coach}
                  fontSize={fontSize}
                  onReadAloud={
                    !m.isKid && readAloud.supported && (m.speakText ?? m.text).trim()
                      ? () => readAloud.speakNow((m.speakText ?? m.text).trim(), coach.member.id, undefined, 'zh-CN')
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <KidInputBar
        maxWidthClass="max-w-6xl"
        disabled={trialStage !== 'await'}
        placeholder={
          trialStage !== 'await'
            ? '这一试已经记录，点上方按钮进下一次试'
            : target.modality === 'receptive'
              ? '可选：记录孩子做了什么动作，或直接点上方判定…'
              : '按住说话，或者打字记下孩子的原话…'
        }
        speechLang="zh-CN"
        onSend={submitAnswer}
      />
    </div>
  );
}
