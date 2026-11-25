import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function toDataUrl(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`;
}

function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    get length() {
      return store.size;
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

installLocalStorage();

// kidExpression 现在多了一层依赖：kidExpression → chainRecord → chainTargets / chainTraining。
// data url 里解析不了相对路径，所以逐层把 import 换成上一层转好的 data url。
const urlOf = async (name) => toDataUrl(await readFile(new URL(`./${name}`, import.meta.url), 'utf8'));

const targetsUrl = await urlOf('expressionTargets.ts');
const dttUrl = await urlOf('dtt.ts');
const chainTrainingUrl = await urlOf('chainTraining.ts');
const chainTargetsUrl = await urlOf('chainTargets.ts');

const chainRecordUrl = toDataUrl(
  (await readFile(new URL('./chainRecord.ts', import.meta.url), 'utf8'))
    .replace("from './chainTraining'", `from '${chainTrainingUrl}'`)
    .replace("from './chainTargets'", `from '${chainTargetsUrl}'`),
);

const source = (await readFile(new URL('./kidExpression.ts', import.meta.url), 'utf8'))
  .replace("from './expressionTargets'", `from '${targetsUrl}'`)
  .replace("from './dtt'", `from '${dttUrl}'`)
  .replace("from './chainRecord'", `from '${chainRecordUrl}'`);
const mod = await import(toDataUrl(source));
const targets = await import(targetsUrl);

const round = (achievement, answer = '') => ({
  taskId: `t-${Math.random()}`,
  ask: '题干',
  answer,
  checks: [],
  checksHit: [],
  achievement,
});

const session = (over) => ({
  id: `s-${Math.random()}`,
  student: '小远',
  date: '2026-11-24',
  sessionNo: 1,
  topic: '说清一件事',
  targetId: 'K1',
  by: '教师',
  rounds: [],
  score: 2,
  threeLines: { did: '', achieved: '', stuck: '' },
  highlight: '',
  nextStep: '',
  createdAt: 1,
  ...over,
});

// ---- 目标库与 skill 编号一致，且按 VB-MAPP 语言操作顺序排列 ----
{
  const ids = targets.EXPRESSION_TARGETS_BY_DIFFICULTY.map((t) => t.id);
  assert.deepEqual(ids, ['B5', 'G1', 'G2', 'G3', 'G4', 'G5', 'K1', 'K2', 'K3', 'K4', 'K5']);
  for (const t of targets.EXPRESSION_TARGETS) {
    assert.ok(t.tasks.length >= 3, `${t.id} 至少 3 道题`);
    assert.ok(t.standard2.length > 0 && t.onePenalty.length > 0);
    assert.ok(t.sessionSuccess && t.sessionSuccess.length > 0, `${t.id} 缺本次达标线`);
    assert.ok(t.vbMapp && t.vbMapp.tag, `${t.id} 缺 VB-MAPP 标签`);
    const g = t.familyGuide;
    for (const key of ['what', 'prepare', 'start', 'wait', 'prompts', 'success', 'fallback', 'dose', 'avoid']) {
      assert.ok(g[key] && g[key].length > 0, `${t.id} 家庭指导缺 ${key}`);
    }
  }
  assert.equal(targets.getExpressionTarget('K1').name, '说清一件事');
  assert.equal(targets.getExpressionTarget('B5').name, '开口要东西');
  assert.equal(targets.getExpressionTarget('nope'), undefined);
}

// ---- 建议分：按独立完成率 80% / 50% 两个闸口 ----
{
  assert.equal(mod.suggestScore([]), null, '未判定不给建议分');
  assert.equal(mod.suggestScore([round(null)]), null);

  assert.equal(mod.suggestScore([round('independent'), round('independent'), round('independent'), round('independent')]), 2);
  assert.equal(mod.suggestScore([round('independent'), round('independent'), round('independent'), round('independent'), round('failed')]), 2, '4/5=80% 仍是 2 分');
  assert.equal(mod.suggestScore([round('independent'), round('independent'), round('independent'), round('failed')]), 1, '3/4=75% 落到 1 分');
}

// 上面的 25% 断言写反了，单独明确一次
{
  assert.equal(mod.suggestScore([round('independent'), round('prompted'), round('failed'), round('failed')]), 0, '1/4=25% → 0 分');
  assert.equal(mod.suggestScore([round('independent'), round('failed')]), 1, '1/2=50% → 1 分');
}

// ---- 稳定判定：同主体连续两次 2 分才算，跨主体是待复核 ----
{
  const book = mod.normalizeBook({
    sessions: [
      session({ date: '2026-11-20', score: 2, by: '教师', createdAt: 1 }),
      session({ date: '2026-11-22', score: 2, by: '教师', createdAt: 2 }),
    ],
  });
  const stat = mod.targetStat(book, '小远', 'K1');
  assert.equal(stat.status, 'stable');
  assert.deepEqual(stat.history, [2, 2]);

  const cross = mod.normalizeBook({
    sessions: [
      session({ date: '2026-11-20', score: 2, by: '教师', createdAt: 1 }),
      session({ date: '2026-11-22', score: 2, by: '家长', createdAt: 2 }),
    ],
  });
  const crossStat = mod.targetStat(cross, '小远', 'K1');
  assert.equal(crossStat.status, 'pending', '跨主体两次 2 分只算待复核');
  assert.equal(mod.historyLine(crossStat), 'K1：2 → 2（教师·家长）');

  const falling = mod.normalizeBook({
    sessions: [
      session({ date: '2026-11-20', score: 2, by: '教师', createdAt: 1 }),
      session({ date: '2026-11-22', score: 1, by: '教师', createdAt: 2 }),
    ],
  });
  assert.equal(mod.targetStat(falling, '小远', 'K1').status, 'progressing');

  const one = mod.normalizeBook({ sessions: [session({ score: 2 })] });
  assert.equal(mod.targetStat(one, '小远', 'K1').status, 'progressing', '只有一次 2 分不算稳定');

  assert.equal(mod.targetStat(mod.emptyBook(), '小远', 'K1').status, 'none');
}

// ---- 课时序号：同一孩子连续，跨天不重置，教师家长共用一条线 ----
{
  const book = mod.normalizeBook({
    sessions: [
      session({ date: '2026-11-20', sessionNo: 1, by: '教师' }),
      session({ date: '2026-11-21', sessionNo: 2, by: '家长' }),
      session({ date: '2026-11-22', sessionNo: 3, by: '教师' }),
      session({ student: '别人', sessionNo: 9 }),
    ],
  });
  assert.equal(mod.nextSessionNo(book, '小远'), 4);
  assert.equal(mod.nextSessionNo(book, '新孩子'), 1);
  assert.equal(mod.sessionsOf(book, '小远').length, 3);
}

// ---- 文件名四段固定，能被 rebuild_index.py 的 TASK_RE 认出来 ----
{
  const name = mod.sessionFileName({ student: '小 远', date: '2026-11-24', sessionNo: 2, topic: '说清一件事' });
  assert.equal(name, '小远_2026-11-24_第2课时_说清一件事.md');
  const re = /^(?<stu>[^_]+)_(?<date>\d{4}-\d{2}-\d{2})_(?:(?<session>第\d+课时)_)?(?<topic>.+)\.md$/;
  const m = re.exec(name);
  assert.ok(m, '文件名必须匹配 skill 的四段规则');
  assert.equal(m.groups.session, '第2课时');
  assert.equal(m.groups.topic, '说清一件事');
}

// ---- 导出的 markdown：meta 可解析、家长课换成家庭训练指导 ----
{
  const rounds = [
    { taskId: 'K1-t1', ask: '说说今天做完的一件事。', answer: '我在厨房吃了早饭然后换衣服', checks: ['谁', '在哪'], checksHit: ['在哪'], achievement: 'independent' },
    { taskId: 'K1-t2', ask: '昨天和小伙伴玩了什么？', answer: '忘了', checks: ['谁'], checksHit: [], achievement: 'failed' },
  ];
  const teacherMd = mod.buildSessionMarkdown(session({ rounds, score: 1, highlight: '他把地点说上了', nextStep: '下周继续练四要素' }));
  assert.match(teacherMd, /^<!--meta/);
  assert.match(teacherMd, /student: 小远/);
  assert.match(teacherMd, /session: 第1课时/);
  assert.match(teacherMd, /by: 教师/);
  assert.match(teacherMd, /targets: K1/);
  assert.match(teacherMd, /scores: K1=1/);
  assert.match(teacherMd, /### 2026-11-24 · 第1课时 · 说清一件事/);
  assert.match(teacherMd, /\*\*家庭沟通要点\*\*/);
  assert.doesNotMatch(teacherMd, /家庭训练指导/);
  assert.match(teacherMd, /> 「我在厨房吃了早饭然后换衣服」/, '原话照录');

  const parentMd = mod.buildSessionMarkdown(session({ rounds, score: 1, by: '家长' }));
  assert.match(parentMd, /by: 家长/);
  assert.match(parentMd, /（家长带练）/);
  assert.match(parentMd, /\*\*家庭训练指导（家长照着做）\*\*/);
  assert.match(parentMd, /下次还是练这个/);
  assert.match(parentMd, /做不到就这样降级/);
  assert.match(parentMd, /这三件先别做/);
  assert.doesNotMatch(parentMd, /家庭沟通要点/);

  const noScore = mod.buildSessionMarkdown(session({ rounds, score: null }));
  assert.match(noScore, /scores: \n?/);
  assert.match(noScore, /本课未打分/);
}

// ---- 三行草稿：写数量和提示级别，不写评价词 ----
{
  const rounds = [
    round('independent', '我说完了'),
    round('prompted', '嗯'),
    round('failed', ''),
  ];
  const three = mod.composeThreeLines({ rounds, targetId: 'K1', by: '教师' }, targets.getExpressionTarget('K1'));
  assert.match(three.achieved, /3 试次中，独立做到 1 次、提示后做到 1 次、没做到 1 次/);
  assert.match(three.achieved, /独立完成率 33%/);
  assert.match(three.stuck, /卡在/);
  assert.doesNotMatch(three.achieved, /不错|较弱|表现好/);

  const clean = mod.composeThreeLines({ rounds: [round('independent', 'a')], targetId: 'K1', by: '教师' }, targets.getExpressionTarget('K1'));
  assert.match(clean.stuck, /未记录到明显卡点/);
}

// ---- 三行不能把「没做的轮次」算成做了 ----
{
  const target = targets.getExpressionTarget('K4');
  const blank = [
    round(null, ''),
    round(null, ''),
  ];
  const none = mod.composeThreeLines({ rounds: blank, targetId: 'K4', by: '教师' }, target);
  assert.match(none.did, /DTT 计划 2 试次，本节没有判定/);
  assert.match(none.achieved, /按 DTT 口径不打分/);
  assert.match(none.stuck, /卡点没有记录/);

  const partial = [
    round(null, '明天九点带水彩笔'),
    round(null, ''),
    round(null, ''),
  ];
  const p = mod.composeThreeLines({ rounds: partial, targetId: 'K4', by: '教师' }, target);
  assert.match(p.did, /DTT 计划 3 试次，本节没有判定/);
  assert.match(p.achieved, /本节未判定，按 DTT 口径不打分/);
}

// ---- 原话优先取独立完成的第一句，没有就取最长的 ----
{
  assert.equal(mod.pickHighlight([round('failed', '很长很长的一句话'), round('independent', '我说清楚了')]), '我说清楚了');
  assert.equal(mod.pickHighlight([round('failed', '短'), round('prompted', '长一点的回答')]), '长一点的回答');
  assert.equal(mod.pickHighlight([]), '');
}

// ---- 存取：坏数据不炸，缺字段给默认 ----
{
  localStorage.setItem('kidbuddy.expression.book.v1', '{not json');
  assert.deepEqual(mod.loadBook().sessions, []);

  const saved = mod.addSession(mod.emptyBook(), session({ rounds: [round('independent', 'x')] }));
  assert.equal(saved.sessions.length, 1);
  const reloaded = mod.loadBook();
  assert.equal(reloaded.sessions[0].student, '小远');
  assert.equal(reloaded.sessions[0].rounds[0].answer, 'x');
  assert.equal(reloaded.sessions[0].score, 2);

  const normalized = mod.normalizeBook({ sessions: [{ id: 'a', student: '小远', date: '2026-11-24', targetId: 'K1', score: 7, by: '奇怪' }] });
  assert.equal(normalized.sessions[0].score, null, '非法分数归零为未打分');
  assert.equal(normalized.sessions[0].by, '教师', '未知主体按教师处理');
  assert.equal(normalized.sessions[0].sessionNo, 1);
}

// ---- 日期用本地时区，不因 UTC 偏移串到前一天 ----
{
  assert.equal(mod.todayIso(new Date(2026, 10, 24, 0, 30)), '2026-11-24');
  assert.equal(mod.todayIso(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
}

// ---- DTT 数据进导出：试次统计与逐试次记录 ----
{
  const rounds = [
    { taskId: 'K4-t1#1', ask: '听好，我说一遍', answer: '明天九点', checks: [], checksHit: [], achievement: 'independent', outcome: 'correct', promptLevel: 'independent', repeatIndex: 1 },
    { taskId: 'K4-t1#2', ask: '听好，我说一遍', answer: '带水彩笔', checks: [], checksHit: [], achievement: 'prompted', outcome: 'correct', promptLevel: 'verbal', repeatIndex: 2 },
    { taskId: 'K4-t2#1', ask: '下午三点操场', answer: '', checks: [], checksHit: [], achievement: 'failed', outcome: 'no_response', promptLevel: null, repeatIndex: 1 },
  ];
  const md = mod.buildSessionMarkdown(session({ rounds, score: 1, targetId: 'K4' }));
  assert.match(md, /共 3 试次/);
  assert.match(md, /独立正确 1、口头提示后 1、示范后 0、手把手后 0、错误 0、无反应 1/);
  assert.match(md, /独立正确率 33%/);
  assert.match(md, /最长连续独立正确 1 次/);
  assert.match(md, /逐试次：1\.✅独立「明天九点」/);
  assert.match(md, /2\.🟡口头/);
  assert.match(md, /3\.❌无反应/);

  const three = mod.composeThreeLines({ rounds, targetId: 'K4', by: '教师' }, targets.getExpressionTarget('K4'));
  assert.match(three.achieved, /独立正确 1（33%）/);
  assert.match(three.achieved, /最长连续独立正确 1 次/);
  assert.match(three.stuck, /等 3 秒无反应/);
}

// ---- 跳过的题不能算进分数：它没有 outcome，掉进统计里就会变成「没做到」 ----
{
  const meta = { taskId: 'x', ask: '题', hint: 'h', checks: [], checksHit: [], answer: '' };
  const made = [
    { ...meta, taskId: 'a', achievement: 'independent', outcome: 'correct', promptLevel: 'independent' },
    { ...meta, taskId: 'b', achievement: 'independent', outcome: 'correct', promptLevel: 'independent' },
    { ...meta, taskId: 'c', skipped: true, achievement: null, outcome: undefined },
    { ...meta, taskId: 'd', skipped: true, achievement: null, outcome: undefined },
  ];

  // 只该看前两条：2/2 独立 → 2 分；把跳过算进去会掉到 50% 变 1 分
  assert.equal(mod.suggestScore(made), 2, '跳过的题不能拉低得分');

  const counted = mod.countAchievements(made);
  assert.equal(counted.independent, 2, '计数要排除跳过');
  assert.equal(counted.failed, 0, '跳过不能被算成没做到');

  const three = mod.composeThreeLines({ rounds: made, targetId: 'K4', by: '教师' }, targets.getExpressionTarget('K4'));
  assert.match(three.did, /当场跳过 2 题不计分/, '三行记录要注明跳过了几题');
  assert.match(three.achieved, /错误 0、无反应 0/, '跳过不能被计成错误或无反应');
  assert.match(three.achieved, /独立正确 2（100%）/, '分母要排除跳过的题');

  const md = mod.buildSessionMarkdown({
    id: 's',
    student: '小明',
    date: '2026-11-24',
    sessionNo: 1,
    topic: '复述通知',
    targetId: 'K4',
    by: '教师',
    rounds: made,
    score: 2,
    threeLines: three,
    highlight: '',
    nextStep: '继续',
    materials: {},
    createdAt: Date.now(),
  });
  assert.match(md, /另有 2 题当场跳过/, '导出的记录要写明跳过数量');

  // 全跳过 = 没有可判定的试次，不能瞎给分
  const allSkipped = made.map((r) => ({ ...r, skipped: true, achievement: null, outcome: undefined }));
  assert.equal(mod.suggestScore(allSkipped), null, '一题没判就返回 null，不能给 0 分');
}

// ---------------------------------------------------------------------------
// 链式课（生活技能 / 解决问题）走同一个 session，靠 runs 区分
// ---------------------------------------------------------------------------

// A5 洗手第 7–9 步，反向链 mastered=2。这三步都独立完成，第 7 步给了口头提示。
const chainSteps = [
  { order: 7, promptLevel: 'verbal', done: true },
  { order: 8, promptLevel: 'independent', done: true },
  { order: 9, promptLevel: 'independent', done: true },
];
const chainSession = {
  id: 'chain-1',
  student: '小明',
  date: '2026-11-26',
  sessionNo: 1,
  topic: '洗手',
  targetId: 'A5',
  by: '教师',
  rounds: [],
  score: 2,
  threeLines: { did: '（应由程序生成）', achieved: '', stuck: '' },
  highlight: '',
  nextStep: '',
  createdAt: Date.now(),
  runs: [{ mode: 'backward', mastered: 2, steps: chainSteps }],
};

const chainMd = mod.buildSessionMarkdown(chainSession);
// 链式课不该出现 DTT 的那两块
assert.doesNotMatch(chainMd, /学生原话样本/, '链式课没有「题」，不该出现原话样本');
assert.doesNotMatch(chainMd, /\| 编号 \| 目标 \| 本次观察到的表现 \| 得分 \|/, '链式课不该用 DTT 的达成表');
// 该出现的
assert.match(chainMd, /课堂记录（三行）/);
assert.match(chainMd, /目标达成（按步骤）/);
assert.match(chainMd, /\| 7 \| 冲干净 \| 提示 \|/, '矩阵要按步列出辅助等级');
assert.match(chainMd, /按最后一遍的独立完成步数占比算/, '得分口径要写明链式课的算法');
// 三行由程序生成，不用 session.threeLines 里那份
assert.doesNotMatch(chainMd, /应由程序生成/);

// 「目标」行要写链的名字，不能把编号当名字拼成「A5 A5」
assert.match(chainMd, /\*\*目标\*\*：A5 洗手/, '目标行要带上链名');
assert.doesNotMatch(chainMd, /A5 A5/, '编号和名字不能是同一个');

// meta 块只能有固定几个 key：rebuild_index.py 见到未知 key 会走兜底分支
const metaBlock = chainMd.split('-->')[0];
assert.match(metaBlock, /targets: A5/);
assert.doesNotMatch(metaBlock, /runs:/, 'runs 不能进 meta，会破坏索引脚本');

// 链路被删掉时退回 DTT 格式，旧记录照样能导出，不能整节课打不开
const orphan = mod.buildSessionMarkdown({ ...chainSession, targetId: '已删除的链' });
assert.match(orphan, /学生原话样本/, '链不存在时应退回 DTT 格式');

// normalizeBook 要能认 runs，并且清不干净时不留空数组
const book = mod.normalizeBook({
  sessions: [
    chainSession,
    { ...chainSession, id: 'chain-2', runs: [{ mode: '乱写', mastered: 0, steps: [] }] },
  ],
});
assert.equal(book.sessions[0].runs.length, 1, '合法的 runs 要留下');
assert.equal(book.sessions[1].runs, undefined, '全是脏数据的 runs 要整组丢掉，不留空数组');

console.log('PASS kidExpression');
