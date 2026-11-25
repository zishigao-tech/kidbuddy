/**
 * 链式教学 · 目标库（生活技能 / 解决问题）
 *
 * 为什么单独建一套编号（A = 生活自理，P = 解决问题）而不直接沿用 goal-codes.md：
 * skill 里的 E / J / L 段是**单回合目标**（「如厕：白天独立如厕，尿裤子 ≤1 次/周」），
 * 判的是结果；这里一条链是**一串有序动作**，判的是「从第几步开始需要帮」。
 * 口径对不上，硬套会让课堂记录和机构汇报两本账。
 * 对照关系写在每条的 skillRef 里，不取代它。
 *
 * 拆步骤的三条规矩（写错一条，现场就没法判）：
 *   1. 每步只有一个动作。把「打开水龙头并把手打湿」写成一步，现场不知道该看哪个。
 *   2. 完成标准必须可观察。「理解洗手的重要性」不是标准，「两侧袖口过肘」才是。
 *   3. 辅助提示从轻到重写，用 / 分隔。写「帮忙」等于没写。
 *
 * 关于 selfInitiated：
 *   P 组前几步全是自发启动（停手 → 看人 → 开口）。
 *   老师一旦给指令，练的就变成「听指令」而不是「遇到事自己想起来」，
 *   所以在家里换成真实场景时效果会整个塌掉。这几步必须等，不能催。
 *
 * 纯数据 + import type，无运行时依赖，可被 node 单测直接加载。
 */

import type { ChainMode, ChainGroup, ChainTarget } from './chainTraining';

// ---------------------------------------------------------------------------
// A 组 · 生活技能
// ---------------------------------------------------------------------------

const WASH_HANDS: ChainTarget = {
  id: 'A1',
  name: '洗手',
  group: 'skill',
  band: 'preschool',
  difficulty: 1,
  settings: ['home'],
  summary: '饭前便后不用提醒也能自己走完一遍洗手：从拉袖子到擦干，九步不跳、不半路跑掉。',
  standard2: '全程 9 步独立完成 ≥2 次/周，中途不离开洗手台，冲净后手上无泡沫残留',
  onePenalty: '会开水和搓手，但搓手背总要提醒；或冲到一半手一甩就走',
  sessionSuccess: '一节课练 2–3 遍，其中至少 1 遍从第 1 步做到第 9 步没有中途离场',
  skillRef: 'J4',
  defaultMode: 'backward',
  sessionRuns: 3,
  needs: ['洗手台', '洗手液或肥皂', '毛巾或擦手纸'],
  steps: [
    {
      order: 1,
      name: '拉袖子',
      sd: '把袖子拉上去',
      criterion: '两侧袖口都过肘，前臂露出来',
      hint: '指一下袖口 / 抓着他的手拉一次 / 手把手拉上去',
      optional: true, // 穿短袖时不适用，跳过不计入分母
    },
    {
      order: 2,
      name: '开水',
      sd: '开水',
      criterion: '拧开或压下龙头，有水流出来、手能接到',
      hint: '指一下龙头 / 把他的手放到把手上 / 手把手拧',
    },
    {
      order: 3,
      name: '湿手',
      sd: '湿手',
      criterion: '双手掌心手背都碰到水流，持续 ≥3 秒',
      hint: '自己先伸手进水流给他看 / 把他的手带进水里',
    },
    {
      order: 4,
      name: '按洗手液',
      sd: '按一下',
      criterion: '掌心按到泵头，压出一次量（多少不论）',
      hint: '指一下泵头 / 扶着他的手按下去',
    },
    {
      order: 5,
      name: '搓手心',
      sd: '搓搓手心',
      criterion: '两掌相对摩擦 ≥5 秒，能看到泡沫',
      hint: '自己搓给他看 / 把手掌贴着他的手掌带着搓',
    },
    {
      order: 6,
      name: '搓手背',
      sd: '手背也搓',
      criterion: '一只手搓另一只手背，两只手都做到',
      hint: '示范手背搓 / 说「翻过来」',
    },
    {
      order: 7,
      name: '冲干净',
      sd: '冲掉',
      criterion: '手上看不到泡沫残留，冲水 ≥5 秒',
      hint: '指一下水流 / 说「还有泡泡」',
    },
    {
      order: 8,
      name: '关水',
      sd: '关水',
      criterion: '龙头完全关闭，不再滴水',
      hint: '指一下龙头 / 手把手关上',
    },
    {
      order: 9,
      name: '擦干',
      sd: '擦干',
      criterion: '用毛巾或纸把手掌手背擦到不滴水',
      hint: '指一下毛巾 / 把毛巾递到他手上',
    },
  ],
  familyGuide: {
    how: '在家把洗手固定在饭前和如厕后两个时点，一次只退一步辅助——这周还在拉袖子，就不要同时要求他自己关水。',
    avoid: '别开着水龙头替他搓。水流声一响，孩子容易只玩水不搓手，后面几步全乱。',
  },
};

const TIDY_TOYS: ChainTarget = {
  id: 'A2',
  name: '收玩具',
  group: 'skill',
  band: 'preschool',
  difficulty: 2,
  settings: ['floor', 'home'],
  summary: '听到「收玩具了」能停下来，把地上的玩具一件件放进筐，直到地面看不见玩具。',
  standard2: '听到指令后 5 分钟内独立收完，地面无残留，不需逐件提示',
  onePenalty: '收了三五件就开始玩；或每一件都要指一次才捡',
  sessionSuccess: '一节课练 2 遍，其中 1 遍从头收到尾，中间不多于 2 次提醒',
  skillRef: 'J4',
  defaultMode: 'total',
  sessionRuns: 2,
  needs: ['玩具筐或收纳箱', '地垫上摊开的玩具（8–15 件）'],
  steps: [
    {
      order: 1,
      name: '停手',
      sd: '收玩具了',
      criterion: '手上动作停下，看向成人，持续 ≥2 秒',
      hint: '叫名字 / 挡一下他手上的玩具 / 手把手把玩具放下',
    },
    {
      order: 2,
      name: '找到筐',
      sd: '筐在哪',
      criterion: '眼睛看向筐、手指向筐，或直接走过去',
      hint: '指一下筐 / 说「筐在柜子旁边」',
    },
    {
      order: 3,
      name: '捡一件',
      sd: '捡起来',
      criterion: '弯腰捡起一件玩具，握在手里',
      hint: '指着具体一件说「先收这个」 / 手把手捡',
    },
    {
      order: 4,
      name: '放进筐',
      sd: '放进去',
      criterion: '松手让玩具落进筐内，不掉在筐外',
      hint: '指一下筐 / 手把手放进去',
    },
    {
      order: 5,
      name: '环视检查',
      sd: '还有吗',
      criterion: '自己转头看一圈地面，没有玩具才走开',
      hint: '指一下还剩的 / 说「那边还有一个」',
    },
  ],
  familyGuide: {
    how: '把玩具量控制在 8–15 件。太多会变成「永远收不完」，孩子收一半就放弃不是态度问题，是量的问题。',
    avoid: '别一边说「收玩具」一边自己动手收。你收得比他快，他就学会等。',
  },
};

const PUT_ON_SHOES: ChainTarget = {
  id: 'A3',
  name: '穿鞋',
  group: 'skill',
  band: 'preschool',
  difficulty: 3,
  settings: ['home', 'outdoor'],
  summary: '出门前自己坐到椅子上，把两只脚伸进鞋、提上后跟、粘好粘扣，不用抱着脚塞。',
  standard2: '两只鞋独立穿好并粘牢，左右不反，全程 ≤3 分钟',
  onePenalty: '会伸脚不会提后跟；或粘扣粘反、粘一半就站起来',
  sessionSuccess: '一节课练 3 遍，其中至少 1 遍两只鞋都不用手把手',
  skillRef: 'J3',
  defaultMode: 'backward',
  sessionRuns: 3,
  needs: ['一双粘扣鞋（别用系带）', '门口的小椅子或垫子'],
  steps: [
    {
      order: 1,
      name: '坐下',
      sd: '坐下穿鞋',
      criterion: '屁股坐到椅子或垫子上，不是蹲着也不是站着',
      hint: '拍一下椅子 / 拉着他的手带过去坐',
    },
    {
      order: 2,
      name: '拿对鞋',
      sd: '拿你的鞋',
      criterion: '把两只鞋都拿到手边，不分左右先不论',
      hint: '指一下鞋 / 说「在门口」',
    },
    {
      order: 3,
      name: '脚伸进鞋口',
      sd: '脚伸进去',
      criterion: '脚尖进到鞋腔里，脚跟还在鞋外',
      hint: '帮他撑开鞋口 / 扶着他的脚往里送',
    },
    {
      order: 4,
      name: '提后跟',
      sd: '提一下后面',
      criterion: '手指勾住鞋后跟往上提，脚跟落进鞋里',
      hint: '示范勾后跟 / 手把手勾上去',
    },
    {
      order: 5,
      name: '粘粘扣',
      sd: '粘上',
      criterion: '粘扣对齐压平，扯一下不脱开',
      hint: '示范粘一次 / 扶着他的手压下去',
    },
  ],
  familyGuide: {
    how: '把穿鞋固定成出门前最后一个动作，椅子放在固定位置。位置固定了，孩子才知道「到这儿就该穿鞋」。',
    avoid: '别在赶时间的时候让他自己穿。你一急就上手代劳，他学到的就是「磨蹭到最后会有人帮我」。',
  },
};

// ---------------------------------------------------------------------------
// P 组 · 解决问题
// ---------------------------------------------------------------------------

const ASK_FOR_HELP: ChainTarget = {
  id: 'P1',
  name: '不会做时说「帮我」',
  group: 'problem',
  band: 'preschool',
  difficulty: 4,
  settings: ['desk', 'home'],
  summary: '拼图拼不上、裤子拉不上时，先停手，再找到身边的大人开口说「帮我」，不是硬掰也不是扔掉。',
  standard2: '遇到卡住的任务，10 秒内停手并主动开口求助，一周 ≥3 次，不需事先提醒',
  onePenalty: '会说「帮我」，但只在被问「要不要帮忙」之后才说；或先闹一场再说',
  sessionSuccess: '一节课设 3 个卡住的情境，其中 2 个能自己停下来并开口',
  skillRef: 'K3',
  defaultMode: 'forward',
  sessionRuns: 3,
  needs: ['一个明显拼不上的拼图（缺块或超难度）', '一件他穿不上的衣物'],
  steps: [
    {
      order: 1,
      name: '停手',
      sd: '（不给指令，等他自然停下）',
      selfInitiated: true,
      criterion: '手上动作停下，不再硬掰硬塞，持续 ≥2 秒',
      hint: '说「停一下」 / 轻轻按住他的手',
    },
    {
      order: 2,
      name: '看大人',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '转头或转身看向最近的成人，身体朝向对方',
      hint: '叫他的名字 / 说「看这里」',
    },
    {
      order: 3,
      name: '开口求助',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '说出「帮我」或「老师帮我」，音量能被听到',
      hint: '说前半句「帮…」 / 示范一遍让他仿说 / 带他一起说',
    },
  ],
  familyGuide: {
    how: '每天刻意留一个「他一定做不成」的小任务，等他开口再帮。全都替他做顺了，就永远没机会练这一句。',
    avoid: '别在他还没开口时主动问「要不要帮忙」。这一问，练的就变成了回答，不是发起。',
  },
};

const TOY_TAKEN: ChainTarget = {
  id: 'P2',
  name: '玩具被抢',
  group: 'problem',
  band: 'preschool',
  difficulty: 5,
  settings: ['floor', 'home'],
  summary: '玩具被拿走时，先停手不动手，大声说「不要」，把东西拿回来，再去告诉大人发生了什么。',
  standard2: '4 步里前三步独立完成（不动手 → 说「不要」→ 拿回），一周 ≥2 次',
  onePenalty: '会哭会喊但不动手也不求助；或直接上手抢打，事后说不清经过',
  sessionSuccess: '一节课设 2 个情境，其中 1 个能走完前 3 步且没有推打',
  skillRef: 'K2',
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['一件他正在玩的、明确属于他的玩具', '一位配合扮演的成人或同伴'],
  steps: [
    {
      order: 1,
      name: '停手',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '手停下，没有推、打、抓、咬对方',
      hint: '说「停」 / 站到两人中间挡一下',
    },
    {
      order: 2,
      name: '大声说不要',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '说出「不要」或「还给我」，音量能被 2 米外听到',
      hint: '说「大声说」 / 示范一遍 / 带他一起说',
    },
    {
      order: 3,
      name: '拿回东西',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '把玩具拿回手里或护在身前，没有继续拉扯',
      hint: '指一下他的手 / 说「拿回来」',
    },
    {
      order: 4,
      name: '告诉大人',
      sd: '去告诉老师',
      criterion: '走到大人面前，说出「他抢我的」或同时指人和指物',
      hint: '牵他过去 / 说前半句「老师，他…」',
    },
  ],
  familyGuide: {
    how: '在家用「抢—还」的小游戏练前 3 步，抢完一定还回去。重点是让孩子体验「说出来东西就回来了」，而不是「抢回去才算赢」。',
    avoid: '别教孩子「他抢你就抢回来」。这条链保的是孩子的安全和表达，不是输赢；也别在孩子面前评判对方小孩。',
  },
};

const OUT_OF_REACH: ChainTarget = {
  id: 'P3',
  name: '东西够不着',
  group: 'problem',
  band: 'preschool',
  difficulty: 6,
  settings: ['home', 'desk'],
  summary: '想要的东西在架子上时，不爬高不硬跳，先看有没有凳子或夹子，实在够不到就叫人说「帮我拿」。',
  standard2: '4 步独立完成，全过程没有攀爬家具、没有摔落风险动作',
  onePenalty: '会叫人但先爬了再说；或站在下面一直跳，不找工具也不开口',
  sessionSuccess: '一节课设 2 次够不着的情境，其中 1 次先找工具再求助',
  skillRef: 'K3',
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['一个放高的透明罐（能看见里面的东西）', '一张稳的小凳子', '一个长柄夹子'],
  steps: [
    {
      order: 1,
      name: '停手',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '停止跳跃、攀爬、拉扯架子',
      hint: '说「停」 / 把他从架子旁带开一步',
    },
    {
      order: 2,
      name: '找工具',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '视线在周围找，或手指向凳子、夹子',
      hint: '指一下凳子 / 说「有没有可以踩的」',
    },
    {
      order: 3,
      name: '用工具',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '搬凳子到位置并踩稳，或拿夹子去夹',
      hint: '示范搬凳子 / 扶一下凳子腿',
      optional: true, // 现场判断不稳妥时跳过，直接走求助
    },
    {
      order: 4,
      name: '开口求助',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '说出「帮我拿」并同时指向目标物',
      hint: '说前半句「帮我…」 / 示范一遍',
    },
  ],
  familyGuide: {
    how: '把零食和常用玩具放到「需要踮脚但踩凳子就一定够得到」的高度。太容易就没机会练，太高高到怎么都够不到也会放弃。',
    avoid: '别把这条练成「一律找人」。工具能解决就先练工具，求助是兜底，顺序反了孩子会变成凡事只喊人。',
  },
};

export const CHAIN_TARGETS: ChainTarget[] = [WASH_HANDS, TIDY_TOYS, PUT_ON_SHOES, ASK_FOR_HELP, TOY_TAKEN, OUT_OF_REACH];

export function groupOf<T extends { group: ChainGroup }>(targets: T[], group: ChainGroup): T[] {
  return targets.filter((t) => t.group === group);
}

export function getChainTarget(id: string | undefined): ChainTarget | undefined {
  if (!id) return undefined;
  return CHAIN_TARGETS.find((t) => t.id === id);
}

/** 挑下一个目标：同组内优先，组内都稳了才跨组 */
export function suggestNextChain(stableIds: string[]): ChainTarget | undefined {
  const stable = new Set(stableIds);
  const pending = CHAIN_TARGETS.filter((t) => !stable.has(t.id));
  if (pending.length === 0) return undefined;
  return pending.reduce((a, b) => (a.difficulty <= b.difficulty ? a : b));
}

/** 列表页顶部的两段式分区 */
export function chainGroups(targets: ChainTarget[] = CHAIN_TARGETS): { group: ChainGroup; targets: ChainTarget[] }[] {
  return (['skill', 'problem'] as ChainGroup[]).map((group) => ({
    group,
    targets: groupOf(targets, group).slice().sort((a, b) => a.difficulty - b.difficulty),
  }));
}

/** 三种排法都列出来，供老师现场改 */
export const CHAIN_MODES: ChainMode[] = ['backward', 'forward', 'total'];

/** 一条链要准备什么，列表页提前看 */
export function needsLine(target: ChainTarget): string {
  return target.needs.length === 0 ? '不需要教具' : target.needs.join(' · ');
}
