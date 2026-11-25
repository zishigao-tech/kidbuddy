/**
 * 链式教学记录的守门测试
 *
 * 这里重点锁四件事：
 *   1. 多遍不能合并统计。合并会把「第 3 遍已经独立」压成「第 1 遍的提示」，
 *      一节课的价值恰恰在遍与遍之间的变化。
 *   2. 每遍的分工单独算。老师中途换排法后，「哪些步归孩子做」就变了。
 *   3. 脏数据单条丢、不整课丢。旧记录、手改的 JSON 都可能带非法 mode 或越界步号。
 *   4. 分数口径对齐现有 SCORE_RUBRIC（80% / 50%），不另立一套。
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

const urlOf = async (name) => toDataUrl(await readFile(new URL(`./${name}`, import.meta.url), 'utf8'));

const chainUrl = await urlOf('chainTraining.ts');
const dttUrl = await urlOf('dtt.ts');
const chainTargetsUrl = await urlOf('chainTargets.ts');
const source = (await readFile(new URL('./chainRecord.ts', import.meta.url), 'utf8'))
  .replace("from './chainTraining'", `from '${chainUrl}'`)
  .replace("from './chainTargets'", `from '${chainTargetsUrl}'`);
const rec = await import(toDataUrl(source));
const chainLib = await import(chainUrl);
const dtt = await import(dttUrl);

const {
  CHAIN_PROMPT_LABELS,
  CHAIN_PROMPT_ORDER,
  promptShort,
  isHelped,
  normalizeRun,
  normalizeRuns,
  planOf,
  runStat,
  sessionChainStats,
  trendLine,
  trendDirection,
  suggestChainScore,
  progressAfter,
  composeChainThreeLines,
  buildStepMatrix,
  buildChainSection,
} = rec;

// ---------------------------------------------------------------------------
// 夹具：一条 5 步的演示链
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
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['x'],
  steps: [1, 2, 3, 4, 5].map((o) => ({ order: o, name: `第${o}步`, sd: `做${o}`, criterion: '做到', hint: '提示' })),
  familyGuide: { how: '', avoid: '' },
};

const step = (order, promptLevel, done = true, skipped = false) => ({ order, promptLevel, done, skipped });
const run = (mode, mastered, steps, note) => ({ mode, mastered, steps, note });

// ---------------------------------------------------------------------------
// 一、辅助等级标签
// ---------------------------------------------------------------------------

// 值必须和 DTT 完全一致：两套等级一分叉，导出到同一份记录里就没法横向比较
assert.deepEqual(
  CHAIN_PROMPT_ORDER,
  dtt.DTT_PROMPT_LEVELS.map((p) => p.value),
  'CHAIN_PROMPT_ORDER 必须和 DTT_PROMPT_LEVELS 同序',
);
assert.deepEqual(Object.keys(CHAIN_PROMPT_LABELS).sort(), CHAIN_PROMPT_ORDER.slice().sort(), '标签要覆盖全四级');

// 标签要换词：DTT 的 model 是「示范后仿说」，生活技能里不是仿说
assert.equal(promptShort('model'), '示范');
assert.equal(promptShort('physical'), '帮做');
assert.equal(promptShort('verbal'), '提示');
assert.equal(promptShort(null), '未记录');
assert.equal(isHelped('independent'), false);
assert.equal(isHelped('verbal'), true);
assert.equal(isHelped('physical'), true);

// ---------------------------------------------------------------------------
// 二、脏数据清洗
// ---------------------------------------------------------------------------

// 非法 mode 退回 defaultMode，非法 promptLevel 退回 independent
const dirty = normalizeRun(
  {
    mode: '乱写',
    mastered: 'abc',
    steps: [step(1, '乱写'), step(2, 'verbal')],
  },
  demo,
);
assert.equal(dirty.mode, 'forward', '非法 mode 要退回 defaultMode');
assert.equal(dirty.mastered, 0, '非法 mastered 要归零');
assert.equal(dirty.steps[0].promptLevel, 'independent', '非法辅助等级要退回独立');

// 越界步号（第 0 步、第 99 步）直接丢，不然统计会多出链外的步
const outOfRange = normalizeRun({ mode: 'total', mastered: 0, steps: [step(0, 'independent'), step(99, 'independent'), step(3, 'independent')] }, demo);
assert.deepEqual(outOfRange.steps.map((s) => s.order), [3], '越界步号要丢掉');

// 同一步记两次只留第一条，否则一起步会被算两遍，独立率能超过 100%
const dup = normalizeRun({ mode: 'total', mastered: 0, steps: [step(2, 'independent'), step(2, 'physical')] }, demo);
assert.equal(dup.steps.length, 1);
assert.equal(dup.steps[0].promptLevel, 'independent', '重复步号保留第一条');

// 空 steps / 非对象 → 整遍丢掉
assert.equal(normalizeRun({ mode: 'total', mastered: 0, steps: [] }, demo), null);
assert.equal(normalizeRun(null, demo), null);
assert.equal(normalizeRun('x', demo), null);

// 整组清洗：坏的一遍丢掉，好的留下
const runs = normalizeRuns([run('total', 0, [step(1, 'independent')]), null, run('total', 0, [])], demo);
assert.equal(runs.length, 1, '坏的一遍丢掉，好的要留下');
assert.deepEqual(normalizeRuns('不是数组', demo), [], '非数组返回空，不能抛');
assert.deepEqual(normalizeRuns(undefined, demo), []);

// done 只有明确写 false 才算没做到（旧数据没这个字段，默认做到了）
assert.equal(normalizeRun({ mode: 'total', mastered: 0, steps: [{ order: 1, promptLevel: 'independent' }] }, demo).steps[0].done, true);
assert.equal(normalizeRun({ mode: 'total', mastered: 0, steps: [step(1, 'independent', false)] }, demo).steps[0].done, false);

// note 空白要清掉，不然导出的「每遍备注」会多出空行
assert.equal(normalizeRun({ mode: 'total', mastered: 0, steps: [step(1, 'independent')], note: '   ' }, demo).note, undefined);

// ---------------------------------------------------------------------------
// 三、单遍统计：分母按这一遍的分工算
// ---------------------------------------------------------------------------

// 反向链 mastered=2 → 孩子做第 3–5 步，前两步老师代做
const backRun = run('backward', 2, [step(3, 'independent'), step(4, 'verbal'), step(5, 'independent')]);
const backPlan = planOf(demo, backRun);
assert.deepEqual(backPlan.targetSteps, [3, 4, 5], '反向链 mastered=2 应做第 3–5 步');

const backStat = runStat(demo, backRun, 2);
assert.equal(backStat.index, 2, '遍号要带上');
assert.equal(backStat.stats.total, 3, '分母只算孩子做的 3 步，老师代做的不进统计');
assert.equal(backStat.stats.independent, 2);
assert.equal(backStat.stats.firstPromptStep, 4);

// 全任务模式：全部归孩子
const totalRun = run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'physical'), step(4, 'independent'), step(5, 'independent')]);
assert.equal(runStat(demo, totalRun).stats.total, 5);

// ---------------------------------------------------------------------------
// 四、多遍：不合并，看趋势
// ---------------------------------------------------------------------------

const threeRuns = [
  run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'independent'), step(4, 'verbal'), step(5, 'physical', false)]),
  run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'independent'), step(4, 'independent'), step(5, 'verbal')]),
  run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'independent'), step(4, 'independent'), step(5, 'independent')]),
];

const s3 = sessionChainStats(demo, threeRuns);
assert.equal(s3.runs.length, 3);
assert.deepEqual(s3.trend, [3, 4, 5], '每遍独立步数要单独算，不能被合并');
assert.equal(s3.gain, 2, '净增 = 最后一遍 − 第一遍');
assert.equal(s3.frontier, null, '最后一遍全程独立，前沿应为空');
assert.equal(s3.last.stats.independentRate, 1);

assert.equal(trendLine(s3), '独立 3 步 → 4 步 → 5 步');
assert.equal(trendDirection(s3), 'up');

// 只有一遍时不谈趋势
const s1 = sessionChainStats(demo, [threeRuns[0]]);
assert.equal(trendLine(s1), '独立 3 步');
assert.equal(trendDirection(s1), 'single');
assert.equal(s1.gain, 0);

// 退步也要看得见，不能只留正向
const down = sessionChainStats(demo, [threeRuns[2], threeRuns[0]]);
assert.equal(down.gain, -2);
assert.equal(trendDirection(down), 'down');

// 空记录不能抛
const empty = sessionChainStats(demo, []);
assert.equal(empty.last, null);
assert.equal(empty.frontier, null);
assert.deepEqual(empty.trend, []);
assert.equal(trendLine(empty), '（还没有记录）');
assert.equal(suggestChainScore(empty), null);

// ---------------------------------------------------------------------------
// 五、分数口径：对齐 SCORE_RUBRIC 的 80% / 50%
// ---------------------------------------------------------------------------

// 5 步全独立 → 100% → 2 分
assert.equal(suggestChainScore(s3), 2);

// 4/5 = 80% → 2 分（边界含等号）
const four = sessionChainStats(demo, [run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'independent'), step(4, 'independent'), step(5, 'verbal')])]);
assert.equal(four.last.stats.independentRate, 0.8);
assert.equal(suggestChainScore(four), 2, '80% 应是 2 分（口径含等号）');

// 3/5 = 60% → 1 分
const three = sessionChainStats(demo, [run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'independent'), step(4, 'verbal'), step(5, 'physical')])]);
assert.equal(three.last.stats.independentRate, 0.6);
assert.equal(suggestChainScore(three), 1);

// 2/5 = 40% → 0 分
const two = sessionChainStats(demo, [run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'verbal'), step(4, 'physical'), step(5, 'physical')])]);
assert.equal(two.last.stats.independentRate, 0.4);
assert.equal(suggestChainScore(two), 0);

// ---------------------------------------------------------------------------
// 六、进度推进
// ---------------------------------------------------------------------------

// 连续 3 遍重点步独立才 +1（正向链 mastered=0 时重点是第 1 步）
const okOnce = run('forward', 0, [step(1, 'independent')]);
const okThrice = [okOnce, okOnce, okOnce];
assert.equal(progressAfter(demo, okThrice, { mode: 'forward', mastered: 0 }).mastered, 1, '连续 3 遍独立应推进 1 步');
assert.equal(progressAfter(demo, [okOnce, okOnce], { mode: 'forward', mastered: 0 }).mastered, 0, '只有 2 遍不能推进');

// 中间断一次就重新数
const helped = run('forward', 0, [step(1, 'verbal')]);
assert.equal(progressAfter(demo, [okOnce, okOnce, helped, okOnce], { mode: 'forward', mastered: 0 }).mastered, 0, '中间给过辅助要清零重数');

// 全任务模式不步进
assert.equal(progressAfter(demo, [run('total', 0, [step(1, 'independent'), step(2, 'independent')])], { mode: 'total', mastered: 0 }).mastered, 0, '全任务模式不按步步进');

// 已经到顶就不再涨
assert.equal(progressAfter(demo, okThrice, { mode: 'forward', mastered: 5 }).mastered, 5);

// 进度不越界
assert.equal(progressAfter(demo, okThrice, { mode: 'forward', mastered: 99 }).mastered, 5);

// ---------------------------------------------------------------------------
// 七、三行记录
// ---------------------------------------------------------------------------

const three2 = composeChainThreeLines(demo, threeRuns);
assert.match(three2.did, /演示链/);
assert.match(three2.did, /3 遍/);
assert.match(three2.achieved, /共 5 步/);
assert.match(three2.achieved, /独立完成 5 步/);
assert.match(three2.achieved, /比第 1 遍多 2 步/, '有进步要在「做到了什么」里说出来');

// 第一遍有卡点时要指出是第几步、那步叫什么。
// 注意这一遍第 4 步给了口头提示、第 5 步手把手还没做到，
// 但「能力前沿」取的是**第一次需要帮助**的位置，所以是第 4 步不是第 5 步——
// 这正是这个指标的意思：从哪儿开始就不用自己来了。
const stuck = composeChainThreeLines(demo, [threeRuns[0]]);
assert.match(stuck.stuck, /第 4 步/, '卡点要取第一次需要帮助的那一步');
assert.match(stuck.stuck, /第4步/, '要带出那一步的名字');

// 全程独立时说清「没给辅助」，不能空着
const clean = composeChainThreeLines(demo, [threeRuns[2]]);
assert.match(clean.stuck, /全程没给辅助/);

// 还没记时不能崩
const none = composeChainThreeLines(demo, []);
assert.ok(none.did.length > 0);

// ---------------------------------------------------------------------------
// 八、步骤 × 遍 矩阵
// ---------------------------------------------------------------------------

const matrix = buildStepMatrix(demo, threeRuns);
const lines = matrix.split('\n');
assert.match(lines[0], /第 1 遍/, '表头要有每一遍');
assert.match(lines[0], /第 3 遍/);
assert.equal(lines[1].split('|').length, lines[0].split('|').length, '分隔行要和表头列数一致');
assert.equal(lines.length, 2 + 5, '5 步应有 5 行');
// 手把手了但没做成：辅助等级和结果两个信息都要在，写成「帮做✗」
assert.match(matrix, /\| 5 \| 第5步 \| 帮做✗ \| 提示 \| 独立 \|/, '最后一格要能看到辅助褪除的全过程：帮做✗ → 提示 → 独立');

// 老师代做的步要显式写「我代做」，不能留白——留白看起来像孩子做不到。
// 但只有一遍时，代做的步根本不该进这张表（见上面的 backMatrix），
// 所以这条要用「两遍不同排法」才验得出来：第 1 遍反向只做 3–5，第 2 遍换全任务做 1–5。
const mixedMatrix = buildStepMatrix(demo, [
  run('backward', 2, [step(3, 'independent'), step(4, 'independent'), step(5, 'independent')]),
  run('total', 0, [step(1, 'independent'), step(2, 'independent'), step(3, 'independent'), step(4, 'independent'), step(5, 'independent')]),
]);
assert.match(mixedMatrix, /\| 1 \| 第1步 \| 我代做 \| 独立 \|/, '第 1 遍老师代做的步要标「我代做」');
assert.equal(buildStepMatrix(demo, [backRun]).split('\n').length, 2 + 3, '只有一遍时代做的步不进表，只列孩子做的 3 步');
assert.doesNotMatch(buildStepMatrix(demo, [backRun]).split('\n')[0], /第 2 遍/, '只有一遍时表头不该出现第 2 遍');

// 不适用 / 没做到要能区分
const special = buildStepMatrix(demo, [run('total', 0, [step(1, 'independent'), step(2, 'independent', true, true), step(3, 'independent', false)])]);
assert.match(special, /不适用/, '跳过的步要写「不适用」');
assert.match(special, /没做到/, '给了辅助也没做出来的步要写「没做到」');

assert.equal(buildStepMatrix(demo, []), '', '没记录时不该产出一张空表');

// ---------------------------------------------------------------------------
// 九、导出整节
// ---------------------------------------------------------------------------

const section = buildChainSection(demo, threeRuns);
assert.match(section, /课堂记录（三行）/);
assert.match(section, /目标达成（按步骤）/);
assert.match(section, /遍间变化/);
assert.match(section, /独立 3 步 → 4 步 → 5 步/);

// 只有一遍时不写「遍间变化」——一遍没有变化可言
const oneSection = buildChainSection(demo, [threeRuns[0]]);
assert.doesNotMatch(oneSection, /遍间变化/);

// 备注要带上遍号
const noted = buildChainSection(demo, [run('total', 0, [step(1, 'independent')], '走神了两次'), run('total', 0, [step(1, 'independent')])]);
assert.match(noted, /第 1 遍：走神了两次/);
assert.doesNotMatch(noted, /第 2 遍：/, '没写备注的遍不出现');

console.log(`chainRecord: 四级标签 / 多遍不合并 / 矩阵 / 导出，全部通过`);
