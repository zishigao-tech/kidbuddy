/**
 * 题级场景标签的守门测试
 *
 * 这张表是手写的 184 条，最容易出的错是「漏标一道」和「标了个不存在的题」。
 * 漏标不会报错——只会让那题在任何场景筛选下都抽不到，安静地消失。
 * 所以这里做双向核对：题库里的每一题都要在表里，表里的每一个 key 都要在题库里。
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

const read = async (name) => (await import(toDataUrl(await readFile(new URL(`./${name}`, import.meta.url), 'utf8'))));
const expr = await read('expressionTargets.ts');
const cog = await read('cognitionTargets.ts');
const scenes = await read('taskScenes.ts');

const all = [...expr.EXPRESSION_TARGETS, ...cog.COGNITION_TARGETS];
const allTasks = all.flatMap((t) => t.tasks);
const sceneIds = expr.SETTINGS.map((s) => s.id);

// ---- 场景清单必须和主配置同序，否则记录里「桌面 3 / 居家 1」会串位 ----
assert.deepEqual(scenes.SCENE_IDS, sceneIds, 'SCENE_IDS 要和 SETTINGS 完全一致（含顺序）');

// ---- 184 题全覆盖，且不多不少 ----
assert.equal(allTasks.length, 184, '题库题数变化时记得同步这张表');
const taskIdSet = new Set(allTasks.map((t) => t.id));
assert.equal(taskIdSet.size, allTasks.length, '题库里有重复题号');

const missing = allTasks.filter((t) => !scenes.TASK_SCENES[t.id]);
assert.equal(missing.length, 0, `这些题没打场景标签：${missing.map((t) => t.id).join(', ')}`);

const extra = Object.keys(scenes.TASK_SCENES).filter((id) => !taskIdSet.has(id));
assert.equal(extra.length, 0, `表里这些题号在题库里不存在：${extra.join(', ')}`);

// ---- 每条标签都合法、不重复、1-2 个场景 ----
for (const [taskId, list] of Object.entries(scenes.TASK_SCENES)) {
  assert.ok(Array.isArray(list) && list.length >= 1, `${taskId} 至少要挂一个场景`);
  assert.ok(list.length <= 2, `${taskId} 挂了 ${list.length} 个场景，太多了——标签一虚，筛场景就没意义`);
  assert.ok(list.every((s) => sceneIds.includes(s)), `${taskId} 有非法场景：${list}`);
  assert.equal(new Set(list).size, list.length, `${taskId} 场景重复`);
}

// ---- 题级标签不能越出目标级声明 ----
for (const t of all) {
  for (const task of t.tasks) {
    const list = scenes.taskScenes(task.id);
    for (const s of list) {
      assert.ok(
        t.settings.includes(s),
        `${task.id} 标了「${s}」，但 ${t.id} 的 settings 里没有这个场景——要么补 settings，要么改标签`,
      );
    }
  }
}

// ---- 目标声明的每个场景，都得有题可练 ----
for (const t of all) {
  for (const s of t.settings) {
    const n = scenes.tasksInScene(t.tasks, s).length;
    assert.ok(n >= 1, `${t.id} 声明了「${s}」，但那个场景下一道题都没有，筛过去会是空卡`);
  }
}

// ---- 总量分布：四个场景都要有实打实的题，不能全靠一两个目标撑着 ----
const perScene = { desk: 0, floor: 0, home: 0, outdoor: 0 };
for (const t of allTasks) for (const s of scenes.taskScenes(t.id)) perScene[s] += 1;
for (const s of sceneIds) {
  // 户外门槛单独放低：目标级只有 6 个目标声明了户外，它是泛化场不是主力，
  // 硬凑到 10 道就得给「其实在室内做」的题贴户外标签，标签一虚筛场景就废了。
  assert.ok(perScene[s] >= (s === 'outdoor' ? 8 : 10), `「${s}」只有 ${perScene[s]} 道题，太少`);
}
assert.ok(perScene.desk > perScene.outdoor, '桌面题应该比户外多——户外是泛化场，不是主力');

// ---- 辅助函数 ----
assert.equal(scenes.taskFitsScene('C7-t8', 'floor'), true);
assert.equal(scenes.taskFitsScene('C7-t8', 'desk'), false, '「放到椅子下面」不该标成桌面题');
assert.deepEqual(scenes.taskScenes('nope'), [], '未知题号回落空数组，不抛错');
assert.equal(scenes.taskPrimaryScene('nope'), 'desk', '未知题号默认桌面');

const c7 = all.find((t) => t.id === 'C7');
assert.equal(scenes.tasksInScene(c7.tasks, 'floor').length >= 4, true, 'C7 主场是地面，地面题得够一节');
assert.equal(scenes.tasksInScene(c7.tasks, 'floor').every((t) => scenes.taskFitsScene(t.id, 'floor')), true);

const load = scenes.sceneLoad(c7.tasks, 'floor');
assert.equal(load.total, 8);
assert.equal(load.inScene, scenes.tasksInScene(c7.tasks, 'floor').length);
assert.equal(load.enough, load.inScene >= 4);

// ---- 轮换排序要和 pickSessionTasks 同一口径 ----
const b5 = all.find((t) => t.id === 'B5');
const history = ['B5-t1', 'B5-t2'];
const mine = scenes.orderByRotation(b5.tasks, history).map((t) => t.id);
const theirs = expr.pickSessionTasks(b5.tasks, 8, history).map((t) => t.id);
// pickSessionTasks 取前 8 道后按题库原序返回；orderByRotation 是全序，前 8 个集合要一致
assert.deepEqual([...mine].sort(), [...theirs].sort(), '两套轮换排序对同一批题的取舍应一致');

// ---- 按场景抽题 ----
const pickFloor = scenes.pickSceneTasks(c7.tasks, 'floor', 4, []);
assert.equal(pickFloor.tasks.length, 4, '本场景题够时抽满 4 道');
assert.equal(pickFloor.borrowed, 0, 'C7 地面题够 4 道，不该借');
assert.ok(pickFloor.tasks.every((t) => scenes.taskFitsScene(t.id, 'floor')), '全部来自地面');
// 结果按题库原顺序返回，不是按「先本场景后借的」排
const order = new Map(c7.tasks.map((t, i) => [t.id, i]));
const pickedOrder = pickFloor.tasks.map((t) => order.get(t.id));
assert.deepEqual(pickedOrder, [...pickedOrder].sort((a, b) => a - b), '抽到的题要按题库原顺序返回');

// 本场景题不够时，从别的场景借，数量补足、不重复
const g5 = all.find((t) => t.id === 'G5');
const pickFloorG5 = scenes.pickSceneTasks(g5.tasks, 'floor', 4, []);
assert.equal(pickFloorG5.tasks.length, 4, '地面题不够时也要凑够 4 道');
assert.equal(pickFloorG5.inScene, scenes.tasksInScene(g5.tasks, 'floor').slice(0, 4).length);
assert.equal(pickFloorG5.borrowed, 4 - pickFloorG5.inScene);
assert.equal(new Set(pickFloorG5.tasks.map((t) => t.id)).size, 4, '借来的题不能和本场景题重复');

// 全部场景时不筛选，行为和 pickSessionTasks 一致（都是取 4 道）
const pickAll = scenes.pickSceneTasks(c7.tasks, 'all', 4, []);
assert.equal(pickAll.tasks.length, 4);
assert.equal(pickAll.borrowed, 0);

// 轮换：练过的题排后面，下一次抽题就会换掉
const first = scenes.pickSceneTasks(c7.tasks, 'floor', 2, []);
const second = scenes.pickSceneTasks(c7.tasks, 'floor', 2, first.tasks.map((t) => t.id));
assert.equal(
  second.tasks.some((t) => first.tasks.some((f) => f.id === t.id)),
  false,
  '连着两节不该抽到同一道题（只要题库里有得换）',
);

// ---- 场景分布行 ----
// C7 前 4 道：t1/t2 桌面+地面、t3/t4 地面+居家 → 桌面 2、地面 4、居家 2
assert.equal(scenes.sceneMixLine(pickFloor.tasks), '桌面 2 / 地面 4 / 居家 2');
assert.equal(scenes.sceneMixLine([]), '', '没有题时给空串，调用方自己决定要不要显示');
assert.match(scenes.sceneMixLine(all.find((t) => t.id === 'C7').tasks.slice(0, 4)), /桌面|地面|居家/);

console.log('taskScenes.test.mjs: ok');
