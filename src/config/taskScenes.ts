/**
 * 题级场景标签
 *
 * 目标级的 `settings` 回答的是「这个目标整体能在哪练」，粒度太粗：
 * C7 方位理解 声明了桌面/地面/居家三个场景，但 8 道题里「放到椅子下面」
 * 只能在有椅子的地面做，「anchor 放桌上」在桌面上更顺。老师筛「地面」时
 * 想要的不是「C7 整个目标」，而是「C7 里真能在地面做的那几道」。
 * 所以场景标签下沉到题，一题挂 1-2 个场景。
 *
 * 口径（很重要，别和「内容涉及哪里」搞混）：
 * 标签标的是**这道题在哪里执行**，不是「题目内容在讲哪里」。
 * 例：K1-t4「周末你去哪了？」内容是户外经历，但题是在桌面坐着一问一答完成的，
 * 所以标签是 桌面 + 居家，不是户外。
 *
 * 每道题为什么这么标：
 * - 只有桌面能做（卡片、图卡、精确摆位、样本与候选分离）→ 桌面
 * - 需要站起来、蹲下、跑来跑去、往椅子/门这些家具上放 → 地面或居家
 * - 嵌在生活流程里（吃点心、切水果、剪指甲、穿鞋、洗澡）→ 居家
 * - 要出门才成立的（门口、邻居家、商场）→ 户外
 * - 一题挂两个场景，是「两种做法都自然」，不是「勉强也能」；
 *   拿不准就只留最自然的那个，宁可少标也别虚标，否则筛场景就失去意义。
 *
 * 为什么单独一张表、不写进题库：
 * 1. 184 道题分散在两个 1000+ 行的文件里，逐条看标签根本审不过来，
 *    集中成一张表老师能一眼扫完对错；
 * 2. 标签会随课堂反馈反复改，独立表改起来 diff 干净，不碰题干；
 * 3. taskScenes.test.mjs 能直接断言「每道题都有标签、标签不越界」，
 *    漏标会当场报错，不会悄悄回落成默认值。
 *
 * 本文件不 import 任何运行时模块（类型 import 会被擦除），
 * 所以能被 node 用 ts.transpileModule 直接跑单测。
 */

import type { ExpressionTask, SettingId } from './expressionTargets';

/** 和 expressionTargets.SETTINGS 同序；单测里有断言保证两边一致 */
export const SCENE_IDS: SettingId[] = ['desk', 'floor', 'home', 'outdoor'];

/**
 * 每道题的天然场景，首元素 = 默认场景（抽题时若不做场景筛选，按它排前面）。
 * key 必须是真实题号，单测会双向核对：表里不许有题库里没有的题，题库也不许漏标。
 */
export const TASK_SCENES: Record<string, SettingId[]> = {
  // ── B5 开口要东西：动机物在眼前，家里和桌面上最好做；t8 在门口，能延伸到户外
  'B5-t1': ['home', 'desk'],
  'B5-t2': ['home', 'desk'],
  'B5-t3': ['home', 'desk'],
  'B5-t4': ['home'],
  'B5-t5': ['home', 'desk'],
  'B5-t6': ['home', 'desk'],
  'B5-t7': ['home', 'desk'],
  'B5-t8': ['home', 'outdoor'],

  // ── G1 看见就说：卡片和图片必须桌面；t4/t7 走到窗边、指身体部位，室内外都行
  'G1-t1': ['desk', 'home'],
  'G1-t2': ['desk'],
  'G1-t3': ['desk'],
  'G1-t4': ['home', 'desk'],
  'G1-t5': ['home', 'desk'],
  'G1-t6': ['desk', 'home'],
  'G1-t7': ['home', 'outdoor'],
  'G1-t8': ['desk', 'home'],

  // ── G2 把词连成句：主体在桌面；t2 要做动作、t3 要往桌子底下放，地面也顺
  'G2-t1': ['desk'],
  'G2-t2': ['floor', 'desk'],
  'G2-t3': ['desk', 'floor'],
  'G2-t4': ['desk', 'home'],
  'G2-t5': ['desk'],
  'G2-t6': ['desk'],
  'G2-t7': ['desk'],
  'G2-t8': ['home'],

  // ── G3 听两步指令：t4/t7 纯身体动作，t5 关门窗、t8 点心前擦手，各归各的场景
  'G3-t1': ['desk'],
  'G3-t2': ['desk', 'floor'],
  'G3-t3': ['desk'],
  'G3-t4': ['floor', 'outdoor'],
  'G3-t5': ['home', 'desk'],
  'G3-t6': ['desk', 'floor'],
  'G3-t7': ['floor', 'outdoor'],
  'G3-t8': ['home'],

  // ── G4 提问与回答：图片、藏东西都在桌面；「睡觉在哪里」只有居家的答案才真
  'G4-t1': ['desk'],
  'G4-t2': ['desk', 'home'],
  'G4-t3': ['home', 'desk'],
  'G4-t4': ['desk', 'home'],
  'G4-t5': ['home'],
  'G4-t6': ['desk'],
  'G4-t7': ['home', 'desk'],
  'G4-t8': ['home'],

  // ── G5 语用四类：几乎全在生活流程里；t1 进门、t6 收笔可以在地面角色扮演
  'G5-t1': ['home', 'floor'],
  'G5-t2': ['home'],
  'G5-t3': ['home'],
  'G5-t4': ['home'],
  'G5-t5': ['home', 'outdoor'],
  'G5-t6': ['home', 'floor'],
  'G5-t7': ['home'],
  'G5-t8': ['home', 'outdoor'],

  // ── K1 说清一件事：叙述类全在桌面坐着一问一答；t8 睡前接着说，居家更自然
  'K1-t1': ['desk', 'home'],
  'K1-t2': ['desk', 'home'],
  'K1-t3': ['desk'],
  'K1-t4': ['desk', 'home'],
  'K1-t5': ['desk', 'home'],
  'K1-t6': ['desk', 'home'],
  'K1-t7': ['desk'],
  'K1-t8': ['desk', 'home'],

  // ── K2 拒绝与索回：全靠「大人来干预」这个情境，居家最真；t6/t8 在桌面上
  'K2-t1': ['home'],
  'K2-t2': ['home', 'floor'],
  'K2-t3': ['home', 'floor'],
  'K2-t4': ['home'],
  'K2-t5': ['home'],
  'K2-t6': ['desk', 'home'],
  'K2-t7': ['home', 'floor'],
  'K2-t8': ['home', 'desk'],

  // ── K3 主动求助：把东西放到够不到，桌面和家里都成立；t7 系鞋在门口
  'K3-t1': ['home', 'desk'],
  'K3-t2': ['home', 'desk'],
  'K3-t3': ['desk'],
  'K3-t4': ['desk'],
  'K3-t5': ['home', 'desk'],
  'K3-t6': ['desk'],
  'K3-t7': ['home', 'desk'],
  'K3-t8': ['home', 'desk'],

  // ── K4 复述通知：纯口头，哪都能做；涉及「隔壁老师」「教室」的偏桌面
  'K4-t1': ['desk', 'home'],
  'K4-t2': ['desk', 'home'],
  'K4-t3': ['desk', 'home'],
  'K4-t4': ['desk'],
  'K4-t5': ['desk', 'home'],
  'K4-t6': ['desk'],
  'K4-t7': ['desk', 'home'],
  'K4-t8': ['home', 'desk'],

  // ── K5 电话说清三要素：拿手机演，室内即可；t8 真去邻居家借，必须出门
  'K5-t1': ['home', 'desk'],
  'K5-t2': ['home', 'desk'],
  'K5-t3': ['desk'],
  'K5-t4': ['home', 'desk'],
  'K5-t5': ['home', 'desk'],
  'K5-t6': ['home', 'desk'],
  'K5-t7': ['home', 'desk'],
  'K5-t8': ['outdoor', 'home'],

  // ── C1 相同物品配对：桌面为主；t1/t5/t6/t8 摊开摆，地面完全做得到
  'C1-t1': ['desk', 'floor'],
  'C1-t2': ['desk'],
  'C1-t3': ['desk'],
  'C1-t4': ['desk'],
  'C1-t5': ['desk', 'floor'],
  'C1-t6': ['desk', 'floor'],
  'C1-t7': ['desk'],
  'C1-t8': ['desk', 'floor'],

  // ── C2 同类配对：桌面摆样本；t2/t8 换样式和换组，在家收拾东西时顺手做
  'C2-t1': ['desk'],
  'C2-t2': ['desk', 'home'],
  'C2-t3': ['desk'],
  'C2-t4': ['desk'],
  'C2-t5': ['desk'],
  'C2-t6': ['desk'],
  'C2-t7': ['desk'],
  'C2-t8': ['desk', 'home'],

  // ── C3 分类归纳：筐可以放地上；t3/t8 用家里现成的东西分堆
  'C3-t1': ['desk', 'floor'],
  'C3-t2': ['desk', 'floor'],
  'C3-t3': ['desk', 'home'],
  'C3-t4': ['desk', 'floor'],
  'C3-t5': ['desk'],
  'C3-t6': ['desk'],
  'C3-t7': ['desk', 'floor'],
  'C3-t8': ['desk', 'home'],

  // ── C4 颜色特征理解：全靠摆开三件物件，桌面最稳；t7/t8 摊开拉距离，地面也行
  'C4-t1': ['desk'],
  'C4-t2': ['desk'],
  'C4-t3': ['desk'],
  'C4-t4': ['desk'],
  'C4-t5': ['desk'],
  'C4-t6': ['desk'],
  'C4-t7': ['desk', 'floor'],
  'C4-t8': ['desk', 'floor'],

  // ── C5 形状特征理解：同上；t4/t8 换一套、贴纸上，家里也常做
  'C5-t1': ['desk'],
  'C5-t2': ['desk'],
  'C5-t3': ['desk'],
  'C5-t4': ['desk', 'home'],
  'C5-t5': ['desk', 'floor'],
  'C5-t6': ['desk'],
  'C5-t7': ['desk', 'floor'],
  'C5-t8': ['desk', 'home'],

  // ── C6 功能理解：问「哪个用来喝水」，实物都在居家；摆三件对比时回桌面
  'C6-t1': ['home', 'desk'],
  'C6-t2': ['home', 'desk'],
  'C6-t3': ['home', 'desk'],
  'C6-t4': ['home'],
  'C6-t5': ['home', 'desk'],
  'C6-t6': ['desk'],
  'C6-t7': ['desk'],
  'C6-t8': ['home', 'desk'],

  // ── C7 方位理解：靠椅子和空间关系，地面最自然；t1/t2/t6/t7 用桌上 anchor 时回桌面
  'C7-t1': ['desk', 'floor'],
  'C7-t2': ['desk', 'floor'],
  'C7-t3': ['floor', 'home'],
  'C7-t4': ['floor', 'home'],
  'C7-t5': ['floor', 'home'],
  'C7-t6': ['desk', 'floor'],
  'C7-t7': ['desk', 'floor'],
  'C7-t8': ['floor', 'home'],

  // ── C8 数量理解：数数要一件件点，桌面最好控；t5 两边各一个容器，地上也能分
  'C8-t1': ['desk'],
  'C8-t2': ['desk'],
  'C8-t3': ['desk'],
  'C8-t4': ['desk'],
  'C8-t5': ['desk', 'floor'],
  'C8-t6': ['desk'],
  'C8-t7': ['desk'],
  'C8-t8': ['desk'],

  // ── C9 大小长短比较：铅笔、瓶子在桌面；t7 比大门和门框，只能户外
  'C9-t1': ['desk'],
  'C9-t2': ['desk'],
  'C9-t3': ['desk'],
  'C9-t4': ['desk', 'floor'],
  'C9-t5': ['desk'],
  'C9-t6': ['desk'],
  'C9-t7': ['outdoor', 'desk'],
  'C9-t8': ['desk', 'floor'],

  // ── C10 顺序排列：图卡桌面；t8 收起来纯口头，早上起床的情境在居家
  'C10-t1': ['desk'],
  'C10-t2': ['desk'],
  'C10-t3': ['desk'],
  'C10-t4': ['desk'],
  'C10-t5': ['desk'],
  'C10-t6': ['desk'],
  'C10-t7': ['desk'],
  'C10-t8': ['home', 'desk'],

  // ── C11 相同与不同：三样摆开比，桌面；t5/t8 摊地上挑出「不一样的」
  'C11-t1': ['desk'],
  'C11-t2': ['desk'],
  'C11-t3': ['desk'],
  'C11-t4': ['desk'],
  'C11-t5': ['desk', 'floor'],
  'C11-t6': ['desk'],
  'C11-t7': ['desk'],
  'C11-t8': ['desk', 'floor'],

  // ── C12 因果与排除：摆候选对比在桌面；t6 衣服湿了、t8 自己经历过的情境，居家更真
  'C12-t1': ['desk', 'home'],
  'C12-t2': ['desk'],
  'C12-t3': ['desk'],
  'C12-t4': ['desk', 'home'],
  'C12-t5': ['desk'],
  'C12-t6': ['home', 'desk'],
  'C12-t7': ['desk'],
  'C12-t8': ['home', 'outdoor'],
};

/** 一题的场景标签；没标的题回落成空数组，调用方要能处理 */
export function taskScenes(taskId: string): SettingId[] {
  return TASK_SCENES[taskId] ?? [];
}

/** 这题默认在哪个场景做（首元素）；没标时给桌面，和 SETTINGS 的默认一致 */
export function taskPrimaryScene(taskId: string): SettingId {
  return TASK_SCENES[taskId]?.[0] ?? 'desk';
}

/** 这题能不能在这个场景做 */
export function taskFitsScene(taskId: string, scene: SettingId): boolean {
  return (TASK_SCENES[taskId] ?? []).includes(scene);
}

/** 本场景下的题（保持题库原顺序，题库本身就是由易到难） */
export function tasksInScene<T extends { id: string }>(tasks: T[], scene: SettingId): T[] {
  return tasks.filter((t) => taskFitsScene(t.id, scene));
}

/**
 * 一个目标在某个场景下的「题量水位」：
 * - strict 只算本场景专属题
 * - stretch 加上别的场景也能凑合的题（就是题库全部）
 * 列表页用它决定要不要提示「本场景题少，会掺着别的场景练」。
 */
export function sceneLoad<T extends { id: string }>(tasks: T[], scene: SettingId): {
  inScene: number;
  total: number;
  /** 本场景题够不够上完一节（默认 4 道）*/
  enough: boolean;
} {
  const inScene = tasksInScene(tasks, scene).length;
  return { inScene, total: tasks.length, enough: inScene >= 4 };
}

/**
 * 按「多久没练过」排序：没练过的排最前，最近练过的排最后。
 * 和 expressionTargets.pickSessionTasks 同一口径，这里单独实现一份是因为
 * 本文件不能运行时 import 那个模块（会让 node 单测的动态 import 失败）。
 * taskScenes.test.mjs 里有对照测试，两边结果必须一致。
 */
export function orderByRotation<T extends { id: string }>(tasks: T[], history: string[] = []): T[] {
  const lastUsed = new Map<string, number>();
  history.forEach((id, i) => lastUsed.set(id, i));
  const order = new Map(tasks.map((t, i) => [t.id, i]));
  const rank = (id: string): number => (lastUsed.has(id) ? (lastUsed.get(id) as number) : -1);
  return [...tasks].sort((a, b) => {
    const ra = rank(a.id);
    const rb = rank(b.id);
    if (ra !== rb) return ra - rb;
    return (order.get(a.id) as number) - (order.get(b.id) as number);
  });
}

export interface ScenePick<T> {
  /** 这一节抽到的题，按题库原顺序 */
  tasks: T[];
  /** 其中本场景专属的有几道 */
  inScene: number;
  /** 为了凑够数，从别的场景借了几道 */
  borrowed: number;
}

/**
 * 抽这一节的题，本场景优先。
 *
 * 为什么要「借」而不是「本场景不够就少抽几道」：一节课的强度是按 4 道 ×
 * 2 遍设计的，少抽一道就少了 2 个试次，达成率会飘。所以本场景题不够时
 * 从同一个目标的其他场景补，并在界面上说清借了几道——老师心里有数，
 * 记录里也能看出这一节不完全在地面做的。
 *
 * 返回的 tasks 按题库原顺序排（题库由易到难），不是按「先本场景后借的」排，
 * 否则一节课的难度曲线会乱跳。
 */
export function pickSceneTasks<T extends { id: string }>(
  tasks: T[],
  scene: SettingId | 'all',
  count: number,
  history: string[] = [],
): ScenePick<T> {
  if (scene === 'all' || tasks.length <= count) {
    const picked = orderByRotation(tasks, history).slice(0, count);
    const ids = new Set(picked.map((t) => t.id));
    return {
      tasks: tasks.filter((t) => ids.has(t.id)),
      inScene: scene === 'all' ? picked.length : tasksInScene(picked, scene).length,
      borrowed: 0,
    };
  }
  const local = orderByRotation(tasksInScene(tasks, scene), history);
  const rest = orderByRotation(
    tasks.filter((t) => !taskFitsScene(t.id, scene)),
    history,
  );
  const takeLocal = local.slice(0, count);
  const need = count - takeLocal.length;
  const picked = [...takeLocal, ...rest.slice(0, Math.max(0, need))];
  const ids = new Set(picked.map((t) => t.id));
  return {
    tasks: tasks.filter((t) => ids.has(t.id)),
    inScene: takeLocal.length,
    borrowed: picked.length - takeLocal.length,
  };
}

/** 一节课里题目的场景分布，给记录和导出用，如「桌面 3 / 居家 1」 */
export function sceneMixLine(tasks: ExpressionTask[]): string {
  const counts = new Map<SettingId, number>();
  for (const task of tasks) {
    for (const scene of taskScenes(task.id)) {
      counts.set(scene, (counts.get(scene) ?? 0) + 1);
    }
  }
  const labels: Record<SettingId, string> = { desk: '桌面', floor: '地面', home: '居家', outdoor: '户外' };
  return SCENE_IDS.filter((s) => counts.has(s))
    .map((s) => `${labels[s]} ${counts.get(s)}`)
    .join(' / ');
}
