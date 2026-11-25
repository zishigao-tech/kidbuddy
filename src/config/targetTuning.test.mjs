/**
 * 老师手调难度的守门测试
 *
 * 这里最容易错的是「两处调整互相踩踏」：调了全表台阶，场景难度跟着乱变；
 * 调了场景难度，全表台阶被顺手改掉。所以专门有用例锁住优先级链。
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

const tuning = await import(toDataUrl(await readFile(new URL('./targetTuning.ts', import.meta.url), 'utf8')));

// 用真实的 C7：全表 7，桌面 6、地面 3、居家 4
const c7 = { id: 'C7', difficulty: 7, settingDifficulty: { desk: 6, floor: 3, home: 4 } };
const empty = tuning.emptyTuning();

// ---- 没调过时完全等于配置值 ----
assert.equal(tuning.tunedDifficulty(c7, empty), 7);
assert.equal(tuning.tunedSceneDifficulty(c7, 'floor', empty), 3);
assert.equal(tuning.tunedSceneDifficulty(c7, 'outdoor', empty), 7, '没写场景覆盖的，退回全表台阶');
assert.equal(tuning.isTargetTuned(c7, empty), false);
assert.equal(tuning.tuningCount(c7, empty), 0);

// ---- 调全表台阶：只影响台阶和「没场景覆盖」的场景 ----
let book = tuning.setDifficulty(empty, c7, 5, 1000);
assert.equal(tuning.tunedDifficulty(c7, book), 5);
assert.equal(book.C7.difficulty, 5);
assert.equal(book.C7.updatedAt, 1000);
assert.equal(tuning.isDifficultyTuned(c7, book), true);
assert.equal(tuning.isTargetTuned(c7, book), true);
assert.equal(tuning.tuningCount(c7, book), 1);

assert.equal(
  tuning.tunedSceneDifficulty(c7, 'floor', book),
  3,
  '调全表台阶不该动「本来就有场景难度」的地面——只调了全表，地面反而变难就是方向错了',
);
assert.equal(tuning.tunedSceneDifficulty(c7, 'desk', book), 6, '桌面同理');
assert.equal(tuning.tunedSceneDifficulty(c7, 'outdoor', book), 5, '没场景覆盖的户外跟着台阶走');

// ---- 调场景难度：只影响这一个场景 ----
book = tuning.setSceneDifficulty(book, c7, 'floor', 2, 1100);
assert.equal(tuning.tunedSceneDifficulty(c7, 'floor', book), 2);
assert.equal(tuning.tunedDifficulty(c7, book), 5, '调场景不该动全表台阶');
assert.equal(tuning.tunedSceneDifficulty(c7, 'desk', book), 6, '别的场景不受影响');
assert.equal(tuning.isSceneDifficultyTuned(c7, 'floor', book), true);
assert.equal(tuning.isSceneDifficultyTuned(c7, 'desk', book), false);
assert.equal(tuning.tuningCount(c7, book), 2);

// ---- 调回原值自动清除，不留脏条目 ----
book = tuning.setSceneDifficulty(book, c7, 'floor', 3, 1200);
assert.equal(tuning.isSceneDifficultyTuned(c7, 'floor', book), false, '调回配置值 3 应该清掉覆盖');
assert.equal(tuning.tunedSceneDifficulty(c7, 'floor', book), 3);

// 台阶覆盖存在时，场景「跟着台阶」的值也算原值
const 台阶书 = tuning.setDifficulty(empty, c7, 5, 1300);
const 跟随 = tuning.setSceneDifficulty(台阶书, c7, 'outdoor', 5, 1400);
assert.equal(tuning.isSceneDifficultyTuned(c7, 'outdoor', 跟随), false, '调成和台阶一样就是「跟着台阶」，不该算一处调整');

// 台阶调到配置值也清掉
const 复位 = tuning.setDifficulty(book, c7, 7, 1500);
assert.equal(tuning.isTargetTuned(c7, 复位), false, '台阶调回 7 且场景已清空，整条记录该消失');
assert.deepEqual(复位, {});

// ---- 传 null 恢复默认 ----
book = tuning.setDifficulty(tuning.setSceneDifficulty(empty, c7, 'floor', 2, 1), c7, 4, 2);
assert.equal(tuning.tuningCount(c7, book), 2);
book = tuning.setDifficulty(book, c7, null, 3);
assert.equal(tuning.isDifficultyTuned(c7, book), false);
assert.equal(tuning.tunedSceneDifficulty(c7, 'floor', book), 2, '清台阶不影响场景覆盖');
book = tuning.setSceneDifficulty(book, c7, 'floor', null, 4);
assert.deepEqual(book, {}, '两处都清完，记录整条删掉');

// ---- 整目标 / 整本清除 ----
book = tuning.setDifficulty(tuning.setSceneDifficulty(empty, c7, 'floor', 2, 1), c7, 4, 2);
assert.deepEqual(tuning.clearTarget(book, 'C7'), {});
assert.deepEqual(tuning.clearTarget(book, 'nope'), book, '清一个不存在的目标不该弄坏别的');
assert.deepEqual(tuning.clearAll(), {});

// ---- 区间钳制 ----
assert.equal(tuning.clampDifficulty(0), 1);
assert.equal(tuning.clampDifficulty(-5), 1);
assert.equal(tuning.clampDifficulty(999), 30);
assert.equal(tuning.clampDifficulty(3.6), 4, '四舍五入到整数，台阶不允许小数');
assert.equal(tuning.clampDifficulty(NaN), 1, '脏数据不能变成 NaN 传染整个排序');
assert.equal(tuning.nextDifficulty(1, -1), 1, '到顶就停住');
assert.equal(tuning.nextDifficulty(30, 1), 30);
assert.equal(tuning.nextDifficulty(7, 1), 8);

// setDifficulty 里也钳制，绕过界面直接调也不越界
const 越界 = tuning.setDifficulty(empty, c7, 99, 1);
assert.equal(越界.C7.difficulty, 30);

// ---- normalize：脏数据全部丢掉，不抛错 ----
assert.deepEqual(tuning.normalizeTuning(null), {});
assert.deepEqual(tuning.normalizeTuning('nope'), {});
assert.deepEqual(tuning.normalizeTuning({ C7: null }), {});
assert.deepEqual(tuning.normalizeTuning({ C7: { updatedAt: 1 } }), {}, '空条目丢掉，否则会显示「已调整」但没有实际覆盖');
assert.deepEqual(tuning.normalizeTuning({ C7: { difficulty: 'x' } }), {});
assert.deepEqual(tuning.normalizeTuning({ C7: { difficulty: 0 } }), {}, '0 越界');
assert.deepEqual(tuning.normalizeTuning({ C7: { difficulty: 5 } }), { C7: { difficulty: 5, updatedAt: 0 } });
assert.deepEqual(
  tuning.normalizeTuning({ C7: { difficulty: 5, settingDifficulty: { floor: 2, sofa: 9, desk: 'x' } } }),
  { C7: { difficulty: 5, settingDifficulty: { floor: 2, sofa: 9 }, updatedAt: 0 } },
  '未知场景名留着不影响排序，但非数字要丢',
);
assert.deepEqual(
  tuning.normalizeTuning({ C7: { settingDifficulty: { sofa: 9 } } }),
  { C7: { settingDifficulty: { sofa: 9 }, updatedAt: 0 } },
);
assert.deepEqual(tuning.normalizeTuning({ C7: { settingDifficulty: { desk: 'x' } } }), {});

// ---- JSON 往返 ----
book = tuning.setSceneDifficulty(tuning.setDifficulty(empty, c7, 4, 9), c7, 'floor', 2, 10);
const round = tuning.normalizeTuning(JSON.parse(JSON.stringify(book)));
assert.deepEqual(round, book, '存进 localStorage 再读出来要一模一样');

// ---- 排序：调过的值生效，并列时按原台阶兜底 ----
const list = [
  { id: 'A', difficulty: 3 },
  { id: 'B', difficulty: 1 },
  { id: 'C', difficulty: 2 },
];
assert.deepEqual(
  tuning.sortTargetsByDifficulty(list, {}).map((t) => t.id),
  ['B', 'C', 'A'],
);
const 调过 = tuning.setDifficulty({}, list[0], 1, 1);
assert.deepEqual(
  tuning.sortTargetsByDifficulty(list, 调过).map((t) => t.id),
  ['B', 'A', 'C'],
  'A 调到 1 以后应该和 B 并列在 B 后面（并列按原台阶兜底）',
);

// 原数组不能被改
assert.deepEqual(list.map((t) => t.id), ['A', 'B', 'C'], 'sortTargetsByDifficulty 不能就地排序');

console.log('targetTuning.test.mjs: ok');
