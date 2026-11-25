/**
 * 链式教学的守门测试
 *
 * 这里重点锁三件事，都是「改配置时最容易被无声破坏」的：
 *   1. 三种排法的分工（谁做哪几步）。算错不会报错，只会让老师照着错的分工上课。
 *   2. 分母口径。反向链里老师代做的步一旦被算进孩子成绩，完成度会凭空掉一半。
 *   3. A 组和 P 组的启动方式不能混。生活技能是「听指令启动」，
 *      解决问题是「情境触发自己启动」—— 这条分界线错了，整个模块的教学逻辑就反了。
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function toDataUrl(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`;
}
const read = async (name) => import(toDataUrl(await readFile(new URL(`./${name}`, import.meta.url), 'utf8')));

const chainLib = await read('chainTraining.ts');
const lib = await read('chainTargets.ts');
const dtt = await read('dtt.ts');

const { CHAIN_TARGETS, chainGroups, getChainTarget, suggestNextChain, needsLine } = lib;
const { chainPlan, chainStats, nextProgress, normalizeProgress, clampMastered, chainLine, CHAIN_MASTER_STREAK, CHAIN_GROUP_META, CHAIN_MODE_META } = chainLib;

// ---------------------------------------------------------------------------
// 一、目标库结构
// ---------------------------------------------------------------------------

assert.ok(CHAIN_TARGETS.length >= 4, '至少要有 4 条链才够两组分');

const ids = CHAIN_TARGETS.map((t) => t.id);
assert.equal(new Set(ids).size, ids.length, `链的 id 有重复：${ids.join(', ')}`);

// difficulty 全表连续 1..n：和 expressionTargets 的口径一致，跳号会让排序看起来乱
const diffs = CHAIN_TARGETS.map((t) => t.difficulty).sort((a, b) => a - b);
assert.deepEqual(
  diffs,
  Array.from({ length: CHAIN_TARGETS.length }, (_, i) => i + 1),
  `difficulty 必须全表连续、不跳号，现在是 ${diffs.join(',')}`,
);

for (const t of CHAIN_TARGETS) {
  // 编号前缀和分组必须一致，否则列表页分区会把 A 类归到「遇到事怎么办」
  const expectPrefix = t.group === 'skill' ? 'A' : 'P';
  assert.ok(t.id.startsWith(expectPrefix), `${t.id} 属于 ${t.group}，前缀应为 ${expectPrefix}`);

  assert.ok(t.steps.length >= 3, `${t.id}「${t.name}」只有 ${t.steps.length} 步，太少了，至少 3 步`);

  // 步骤序号从 1 连续
  const orders = t.steps.map((s) => s.order);
  assert.deepEqual(
    orders,
    Array.from({ length: t.steps.length }, (_, i) => i + 1),
    `${t.id} 的步骤号必须从 1 连续，现在是 ${orders.join(',')}`,
  );

  for (const s of t.steps) {
    assert.ok(s.name?.trim(), `${t.id} 第 ${s.order} 步缺 name`);
    assert.ok(s.sd?.trim(), `${t.id} 第 ${s.order} 步缺 sd（现场不知道说什么）`);
    assert.ok(s.criterion?.trim(), `${t.id} 第 ${s.order} 步缺 criterion（现场不知道判什么）`);
    assert.ok(s.hint?.trim(), `${t.id} 第 ${s.order} 步缺 hint（卡住了不知道怎么办）`);
    // 完成标准不能写成「理解 / 知道 / 掌握」这类没法观察的词
    assert.doesNotMatch(s.criterion, /理解|知道|掌握|意识到/, `${t.id} 第 ${s.order} 步的完成标准不可观察：「${s.criterion}」`);
  }

  assert.ok(t.needs.length > 0, `${t.id} 要写清楚现场准备什么`);
  assert.ok(t.settings.length > 0, `${t.id} 至少声明一个训练场景`);
  assert.ok(t.sessionRuns >= 1, `${t.id} 的 sessionRuns 至少 1 遍`);
  assert.ok(t.familyGuide?.how && t.familyGuide?.avoid, `${t.id} 的家庭指导要写 how 和 avoid 两条`);
}

// ---------------------------------------------------------------------------
// 二、A 组和 P 组的启动方式不能混（这条是本模块的分水岭）
// ---------------------------------------------------------------------------

const skillTargets = CHAIN_TARGETS.filter((t) => t.group === 'skill');
const problemTargets = CHAIN_TARGETS.filter((t) => t.group === 'problem');
assert.ok(skillTargets.length > 0 && problemTargets.length > 0, '两个分组都要有内容，否则第二区是空的');

for (const t of skillTargets) {
  // 生活技能是成人发指令启动的，不该有「等孩子自己想起来」的步
  assert.ok(
    t.steps.every((s) => !s.selfInitiated),
    `${t.id}「${t.name}」属于生活技能，不该有 selfInitiated 步——那样就不是听指令做了`,
  );
}

for (const t of problemTargets) {
  assert.ok(t.steps[0].selfInitiated, `${t.id}「${t.name}」的第 1 步必须是自发启动（先停手），不能靠老师下指令`);
  const selfCount = t.steps.filter((s) => s.selfInitiated).length;
  assert.ok(selfCount >= 2, `${t.id} 只有 ${selfCount} 个自发步，解决问题类至少要 2 步是孩子自己想起来的`);

  // 允许整条链全自发（如「开口求助」：一旦给指令，练的就变成「回答老师」而不是「主动求助」），
  // 但这种链的教学启动全靠**老师设置情境**，所以情境必须写进达标线和家庭指导，
  // 否则这条链就是空的——上课没有触发点，孩子永远没机会走到第 1 步。
  const allSelf = t.steps.every((s) => s.selfInitiated);
  if (allSelf) {
    assert.match(t.sessionSuccess, /情境/, `${t.id} 全是自发步，达标线必须写清这一节课设几个情境`);
    assert.ok(t.familyGuide.how.length >= 10, `${t.id} 全是自发步，家庭指导必须说清在家怎么造机会`);
  } else {
    // 自发步和引导步不能交错。中间插一条指令，孩子自己启动的节奏就断了，
    // 后面几步会变成「等指令」而不是接着往下做。
    const lastSelf = Math.max(...t.steps.filter((s) => s.selfInitiated).map((s) => s.order));
    const firstGuided = Math.min(...t.steps.filter((s) => !s.selfInitiated).map((s) => s.order));
    assert.ok(lastSelf < firstGuided, `${t.id} 的自发步和引导步交错在第 ${firstGuided} 步，会打断孩子自己的节奏`);
  }
}

for (const t of CHAIN_TARGETS) {
  for (const s of t.steps) {
    if (s.selfInitiated) {
      // 自发步的 sd 必须是括号里的说明，不能写成像指令的话，否则老师会照着念
      assert.match(s.sd, /^（/, `${t.id} 第 ${s.order} 步是自发步，sd 应该是「（不给指令…）」这样的说明，现在写的是「${s.sd}」`);
    }
  }
}

// ---------------------------------------------------------------------------
// 三、三种排法的分工
// ---------------------------------------------------------------------------

const demo = {
  id: 'T1',
  name: '演示链',
  group: 'skill',
  band: 'preschool',
  difficulty: 1,
  settings: ['home'],
  summary: '',
  standard2: '',
  onePenalty: '',
  sessionSuccess: '',
  skillRef: undefined,
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['x'],
  steps: [1, 2, 3, 4, 5].map((o) => ({ order: o, name: `第${o}步`, sd: `做${o}`, criterion: '做到', hint: '提示' })),
  familyGuide: { how: '', avoid: '' },
};
const N = demo.steps.length;

const cases = [
  // [mode, mastered, 期望 targetSteps, 期望 helpSteps, 期望 focusStep]
  ['forward', 0, [1], [2, 3, 4, 5], 1],
  ['forward', 3, [1, 2, 3, 4], [5], 4],
  ['forward', N, [1, 2, 3, 4, 5], [], N],
  ['backward', 0, [5], [1, 2, 3, 4], 5],
  ['backward', 2, [3, 4, 5], [1, 2], 3],
  ['backward', N, [1, 2, 3, 4, 5], [], 1],
  ['total', 0, [1, 2, 3, 4, 5], [], null],
  ['total', 3, [1, 2, 3, 4, 5], [], null],
];

for (const [mode, mastered, targets, helps, focus] of cases) {
  const plan = chainPlan(demo, { mode, mastered });
  assert.deepEqual(plan.targetSteps, targets, `${mode} / mastered=${mastered} 的「孩子做」算错了`);
  assert.deepEqual(plan.helpSteps, helps, `${mode} / mastered=${mastered} 的「老师做」算错了`);
  assert.equal(plan.focusStep, focus, `${mode} / mastered=${mastered} 的重点步算错了`);

  // 不变量：两边合起来正好是全链，且不重叠。少一步会静默漏做，多一步会做两遍
  const union = [...plan.targetSteps, ...plan.helpSteps].sort((a, b) => a - b);
  assert.deepEqual(union, [1, 2, 3, 4, 5], `${mode} / mastered=${mastered} 的分工没盖满全链`);
  assert.equal(new Set(union).size, union.length, `${mode} / mastered=${mastered} 有步被重复分配`);
  assert.ok(plan.line.length > 0, `${mode} / mastered=${mastered} 缺一句现场说明`);
}

// 反向链最容易搞反的地方：mastered 是从尾部数的。mastered=2 时重点步是 3，不是 2
assert.equal(chainPlan(demo, { mode: 'backward', mastered: 2 }).focusStep, 3, '反向链的 mastered 必须从最后一步往前数');
// 正向链的 mastered=2 时重点步是 3，不是 2 —— 这两个方向不同但数字碰巧一样，用一个更大的样本再验一次
assert.equal(chainPlan(demo, { mode: 'backward', mastered: 1 }).focusStep, 4, '反向链 mastered=1 应重点第 4 步');
assert.equal(chainPlan(demo, { mode: 'forward', mastered: 1 }).focusStep, 2, '正向链 mastered=1 应重点第 2 步');

// 进度钳制
assert.equal(clampMastered(demo, -3), 0);
assert.equal(clampMastered(demo, 99), N);
assert.equal(clampMastered(demo, Number.NaN), 0);
assert.equal(normalizeProgress(demo, null).mode, demo.defaultMode, '没有进度时用目标的 defaultMode');
assert.equal(normalizeProgress(demo, { mode: '乱写', mastered: 2 }).mode, demo.defaultMode, '脏 mode 要退回 defaultMode');
assert.equal(normalizeProgress({ ...demo, steps: [] }, { mode: 'backward', mastered: 5 }).mastered, 0, '空链的进度必须是 0');

// 空链不能炸
const empty = chainPlan({ ...demo, steps: [] }, { mode: 'forward', mastered: 0 });
assert.deepEqual(empty.targetSteps, []);
assert.equal(empty.focusStep, null);

// ---------------------------------------------------------------------------
// 四、进度推进
// ---------------------------------------------------------------------------

assert.equal(CHAIN_MASTER_STREAK, 3, '掌握标准改成 2 或 4 时要同步改这里的断言和注释');

// 差一遍就不推进 —— 免得「蒙对一次」就把辅助退掉
assert.equal(nextProgress(demo, { mode: 'forward', mastered: 2 }, CHAIN_MASTER_STREAK - 1).mastered, 2);
assert.equal(nextProgress(demo, { mode: 'forward', mastered: 2 }, CHAIN_MASTER_STREAK).mastered, 3);
assert.equal(nextProgress(demo, { mode: 'backward', mastered: 2 }, CHAIN_MASTER_STREAK).mastered, 3);
// 已经到顶就停住，不能越界
assert.equal(nextProgress(demo, { mode: 'forward', mastered: N }, CHAIN_MASTER_STREAK).mastered, N);
// 全任务模式不步进，看整条链的独立完成率，不看「第几步会了」
assert.equal(nextProgress(demo, { mode: 'total', mastered: 0 }, 99).mastered, 0);
// mode 不能丢
assert.equal(nextProgress(demo, { mode: 'backward', mastered: 0 }, CHAIN_MASTER_STREAK).mode, 'backward');

// ---------------------------------------------------------------------------
// 五、统计口径
// ---------------------------------------------------------------------------

const rec = (order, promptLevel, done = true, skipped = false) => ({ order, promptLevel, done, skipped });

// 五步：前两步独立，第三步口头，第四步手把手，第五步独立
const mixed = chainStats(demo, [rec(1, 'independent'), rec(2, 'independent'), rec(3, 'verbal'), rec(4, 'physical'), rec(5, 'independent')], [1, 2, 3, 4, 5]);
assert.equal(mixed.total, 5);
assert.equal(mixed.done, 5);
assert.equal(mixed.independent, 3, '独立完成的只有第 1、2、5 步');
assert.equal(mixed.completion, 1);
assert.equal(mixed.independentRate, 0.6);
assert.equal(mixed.maxIndependentStreak, 2, '最长连续独立是第 1–2 步');
assert.equal(mixed.firstPromptStep, 3, '第一次需要帮助在第 3 步——这是孩子的能力前沿');
assert.equal(mixed.promptCount.verbal, 1);
assert.equal(mixed.promptCount.physical, 1);
assert.equal(mixed.promptCount.independent, 3);

// 反向链的分母：只统计孩子做的步，老师代做的不进分母
const backwardPlan = chainPlan(demo, { mode: 'backward', mastered: 2 }); // target = [3,4,5]
const backwardStats = chainStats(
  demo,
  [rec(3, 'independent'), rec(4, 'independent'), rec(5, 'independent')],
  backwardPlan.targetSteps,
);
assert.equal(backwardStats.total, 3, '反向链只该统计孩子做的 3 步，不是全链 5 步');
assert.equal(backwardStats.independentRate, 1, '这 3 步都独立完成，独立率必须 100%');
assert.equal(backwardStats.firstPromptStep, null);

// 不传 scope 时退化成全链统计 —— 这时没记录的步要计入分母（是「没做完」，不是「不用做」）
const noScope = chainStats(demo, [rec(1, 'independent'), rec(2, 'independent')]);
assert.equal(noScope.total, 5);
assert.equal(noScope.done, 2);
assert.equal(noScope.completion, 0.4);

// 跳过的步不进分母：环境不具备不算孩子没做到
const withSkip = chainStats(demo, [rec(1, 'independent'), rec(2, 'independent', true, true), rec(3, 'independent')], [1, 2, 3]);
assert.equal(withSkip.total, 2, '跳过的第 2 步要从分母去掉');
assert.equal(withSkip.skipped, 1);
assert.equal(withSkip.independentRate, 1);

// 没做到也算能力前沿
const failed = chainStats(demo, [rec(1, 'independent'), rec(2, 'independent', false)], [1, 2, 3]);
assert.equal(failed.firstPromptStep, 2, '第 2 步没做到，前沿就在第 2 步');

// 辅助等级计数要覆盖全四级，不能漏键（否则 UI 上会显示 undefined）
assert.deepEqual(
  Object.keys(mixed.promptCount).sort(),
  dtt.DTT_PROMPT_LEVELS.map((p) => p.value).sort(),
  'promptCount 的键必须和 DTT_PROMPT_LEVELS 完全一致',
);
assert.deepEqual(Object.keys(mixed.promptCount).sort(), ['independent', 'model', 'physical', 'verbal']);

// 空记录不能出现 NaN（会直接显示成 NaN%）
const zero = chainStats(demo, [], [1, 2]);
assert.equal(zero.total, 2);
assert.equal(zero.completion, 0);
assert.equal(zero.independentRate, 0);
assert.ok(Number.isFinite(zero.completion) && Number.isFinite(zero.independentRate));

// ---------------------------------------------------------------------------
// 六、一句话摘要
// ---------------------------------------------------------------------------

const line = chainLine(mixed, demo);
assert.match(line, /共 5 步/);
assert.match(line, /第 3 步/);

// ---------------------------------------------------------------------------
// 七、真实数据的排法合理性
// ---------------------------------------------------------------------------

for (const t of CHAIN_TARGETS) {
  assert.ok(CHAIN_MODE_META[t.defaultMode], `${t.id} 的 defaultMode「${t.defaultMode}」不认识`);
  const plan = chainPlan(t, { mode: t.defaultMode, mastered: 0 });
  // 起步时不能出现「孩子一步都不用做」，否则第一次上课就没事干
  assert.ok(plan.targetSteps.length >= 1, `${t.id} 从 0 起步时孩子一步都不用做`);
  // 也不能一上来就整条链全压给孩子（那是不教就考）
  if (t.defaultMode !== 'total') {
    assert.ok(plan.targetSteps.length < t.steps.length, `${t.id} 起步时不该把整条链全给孩子做`);
  }
}

// 生活技能里至少要有一条反向链：反向链是这块的主力排法（孩子先拿到「我完成了」的结果）
assert.ok(
  skillTargets.some((t) => t.defaultMode === 'backward'),
  '生活技能至少要有一条默认反向链',
);

// 分组元信息齐全
for (const g of ['skill', 'problem']) {
  assert.ok(CHAIN_GROUP_META[g]?.label && CHAIN_GROUP_META[g]?.desc, `${g} 分组缺 label 或 desc`);
}

const groups = chainGroups();
assert.equal(groups.length, 2);
assert.equal(groups[0].group, 'skill', '列表页要把生活技能排在前面');
assert.equal(groups[1].group, 'problem');
assert.equal(groups.reduce((n, g) => n + g.targets.length, 0), CHAIN_TARGETS.length, '分组后不能丢目标');
// 分区内按 difficulty 升序
for (const g of groups) {
  const ds = g.targets.map((t) => t.difficulty);
  assert.deepEqual(ds, ds.slice().sort((a, b) => a - b), `${g.group} 分区内没按难度排序`);
}

// 辅助函数
assert.equal(getChainTarget('A1')?.name, '洗手');
assert.equal(getChainTarget('不存在'), undefined);
assert.equal(getChainTarget(undefined), undefined);
assert.equal(suggestNextChain([])?.difficulty, 1, '什么都没稳时推荐最靠前的');
assert.equal(suggestNextChain(CHAIN_TARGETS.map((t) => t.id)), undefined, '全稳了不该再推荐');
assert.ok(needsLine(CHAIN_TARGETS[0]).length > 0);

console.log(`chainTraining: ${CHAIN_TARGETS.length} 条链 / ${CHAIN_TARGETS.reduce((n, t) => n + t.steps.length, 0)} 步，全部通过`);
