import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

function toDataUrl(source) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`;
}

const expr = await import(toDataUrl(await readFile(new URL('./expressionTargets.ts', import.meta.url), 'utf8')));
const cog = await import(toDataUrl(await readFile(new URL('./cognitionTargets.ts', import.meta.url), 'utf8')));

const all = [...expr.EXPRESSION_TARGETS, ...cog.COGNITION_TARGETS];
const ids = new Set(expr.SETTINGS.map((s) => s.id));

// ---- 场景定义本身 ----
assert.deepEqual([...ids], ['desk', 'floor', 'home', 'outdoor'], '四个场景的顺序固定，桌面在最前');
assert.equal(new Set(expr.SETTINGS.map((s) => s.label)).size, 4, '场景名不能重复');
assert.ok(expr.SETTINGS.every((s) => s.emoji && s.hint && s.hint.length >= 8), '每个场景都要有 emoji 和判断口诀');
assert.equal(expr.isSettingId('desk'), true);
assert.equal(expr.isSettingId('sofa'), false);
assert.equal(expr.isSettingId(undefined), false);

// ---- 每个目标都要有场景 ----
assert.equal(all.length, 23, '说说小课堂 11 + 认知 12');
for (const t of all) {
  assert.ok(Array.isArray(t.settings) && t.settings.length >= 1, `${t.id} 至少要有一个训练场景`);
  assert.ok(t.settings.every((s) => ids.has(s)), `${t.id} 有非法场景 ${t.settings}`);
  assert.equal(new Set(t.settings).size, t.settings.length, `${t.id} 场景不能重复`);
  assert.ok(expr.fitsScene(t, t.settings[0]), `${t.id} 主场景必须在自己能练的场景里`);
  assert.equal(expr.isPrimaryScene(t, t.settings[0]), true);
  if (t.settings.length > 1) {
    assert.equal(expr.isPrimaryScene(t, t.settings[1]), false, `${t.id} 主场景只能有一个`);
  }
}

// ---- 难度覆盖 ----
for (const t of all) {
  const override = t.settingDifficulty || {};
  for (const key of Object.keys(override)) {
    assert.ok(ids.has(key), `${t.id} 的难度覆盖里出现未知场景 ${key}`);
    assert.ok(t.settings.includes(key), `${t.id} 给「没列进场景」的 ${key} 写了难度，界面上根本不会显示`);
    const value = override[key];
    assert.ok(Number.isInteger(value) && value >= 1, `${t.id} 的 ${key} 难度必须是从 1 开始的整数`);
    assert.ok(value <= 15, `${t.id} 的 ${key} 难度 ${value} 明显超出全表台阶范围`);
  }
  // 没写覆盖就退回全表台阶
  for (const s of t.settings) {
    const value = expr.sceneDifficulty(t, s);
    assert.ok(Number.isInteger(value) && value >= 1, `${t.id} 在 ${s} 下没有可用难度`);
    if (!(s in override)) assert.equal(value, t.difficulty, `${t.id} 在 ${s} 下的难度应等于全表台阶`);
  }
}

// ---- 分布：四个场景都得有人练，户外只做泛化场 ----
const coverage = { desk: 0, floor: 0, home: 0, outdoor: 0 };
const primaries = { desk: 0, floor: 0, home: 0, outdoor: 0 };
for (const t of all) {
  for (const s of t.settings) coverage[s] += 1;
  primaries[t.settings[0]] += 1;
}
for (const s of ids) {
  assert.ok(coverage[s] >= 3, `${s} 只有 ${coverage[s]} 个目标，太少了`);
}
assert.ok(primaries.desk >= 8, '桌面是主场最多的场景');
assert.equal(primaries.outdoor, 0, '户外是泛化检验场，不作为任何目标的主场');

// ---- 场地难度应该和全局台阶有区分度：至少有几个目标主场景比全表容易 ----
const easierOnPrimary = all.filter((t) => expr.sceneDifficulty(t, t.settings[0]) < t.difficulty);
assert.ok(easierOnPrimary.length >= 5, '主场通常比全表口径容易，应该有一批体现出来');
assert.ok(
  all.every((t) => expr.sceneDifficulty(t, t.settings[0]) <= t.difficulty),
  '主场景不应该比全表台阶更难——真更难说明主场景选错了',
);

// ---- 标签辅助函数 ----
assert.equal(expr.settingMeta('floor').label, '地面');
assert.equal(expr.settingMeta('nope').id, 'desk', '未知场景回落到第一个，不抛错');

console.log('targetSettings.test.mjs: ok');
