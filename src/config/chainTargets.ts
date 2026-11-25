/**
 * 链式教学 · 目标库（生活技能 / 解决问题）· 0-12 岁三段
 *
 * 分三段，由易到难，段位对齐 skill「课堂记录量化工具」的 references/goal-codes.md：
 *
 *   infant   0-3 岁   生活自理 E 段（E1 抓食吞咀 / E2 用杯饮水 / E3 穿衣配合 / E4 如厕准备）
 *   preschool 3-6 岁   生活自理 J 段（J3 穿脱 / J4 整理）
 *   school   6-12 岁   认知与自理 L 段（L2 用钱找零 / L3 收拾书包 / L5 突发情况第一步）
 *                     语言表达 K 段（K2 拒绝与索回 / K3 主动求助）
 *
 * band 只标「这条链的常规年龄」，**不限制谁能练**。
 * 一个 8 岁但功能水平在 3 岁的孩子，就该做 infant 段的链——跨段取用是正常做法，
 * 不要因为「他都 8 岁了」硬把他往 school 段推。
 * difficulty 是全表连续的 1–17，所以「下一个练什么」不用分段判断，直接按难度取。
 *
 * 为什么不直接沿用 goal-codes.md 的段位码：
 * skill 里 E/J/L 是**单回合目标**（「20 元以内独立完成付款与找零核对」），判的是结果；
 * 这里一条链是**一串有序动作**，判的是「从第几步开始需要帮」。
 * 口径对不上，硬套会让课堂记录和机构汇报两本账。
 * 对照关系写在每条 skillRef 里，不取代它。
 *
 * 拆步骤的三条规矩（写错一条，现场就没法判）：
 *   1. 每步只有一个动作。把「打开水龙头并把手打湿」写成一步，现场不知道该看哪个。
 *   2. 完成标准必须可观察。「理解洗手的重要性」不是标准，「两侧袖口过肘」才是。
 *   3. 辅助提示从轻到重写，用 / 分隔。写「帮忙」等于没写。
 *
 * 关于 selfInitiated（不给指令、等孩子自己启动的那几步）：
 *   两类目标必然有自发步——
 *     · 身体信号类：如厕表示（尿湿了才有机可教，成人没法「指令」一个尿意）；
 *     · 情境类：求助、走散了、突发情况（老师一给指令，练的就变成「听指令做」）。
 *   其余目标都该由成人一句指令启动。
 *   自发步必须连成一段，中间插一条指令，孩子自己启动的节奏就断了。
 *
 * 纯数据 + import type，无运行时依赖，可被 node 单测直接加载。
 */

import type { ChainMode, ChainGroup, ChainTarget } from './chainTraining';
import type { ExpressionBand } from './expressionTargets';

// ---------------------------------------------------------------------------
// A 组 · 生活技能 · 0-3 岁
// ---------------------------------------------------------------------------

const CUP_DRINK: ChainTarget = {
  id: 'A1',
  name: '用杯喝水',
  group: 'skill',
  band: 'infant',
  difficulty: 1,
  settings: ['home'],
  summary: '自己扶着杯子喝水，从扶杯、送到嘴边到喝完放下，不用大人一直托着杯底。',
  standard2: '用敞口杯或吸管杯独立喝水，不呛不洒（skill E2 原文口径）',
  onePenalty: '需成人扶杯；洒出较多',
  sessionSuccess: '一节课练 3 遍，其中 1 遍从扶杯到放下全程不用手把手',
  skillRef: 'E2',
  defaultMode: 'backward',
  sessionRuns: 3,
  needs: ['一只小号敞口杯或吸管杯（装 1/3 水）', '防水围兜', '一块干抹布'],
  steps: [
    {
      order: 1,
      name: '双手扶杯',
      sd: '扶好杯子',
      criterion: '两只手都扶在杯壁上，杯子没有倾倒',
      hint: '把他的手放到杯壁上 / 手把手扶着',
    },
    {
      order: 2,
      name: '送到嘴边',
      sd: '喝吧',
      criterion: '杯沿靠到嘴唇，没有撞到牙齿或鼻子',
      hint: '托一下杯底 / 扶着他的手腕往嘴边带',
    },
    {
      order: 3,
      name: '倾斜喝一口',
      sd: '喝一口',
      criterion: '杯子倾斜、水咽下去，洒出不超过一小口',
      hint: '托杯底轻轻往上抬 / 示范仰头喝',
    },
    {
      order: 4,
      name: '放下杯子',
      sd: '放下',
      criterion: '杯子放回桌面或托盘，没有扔出去',
      hint: '指一下桌面 / 扶着他的手放下去',
    },
  ],
  familyGuide: {
    how: '杯子固定放在同一个位置，每次喝都在那儿拿。位置固定比反复提醒有用得多。',
    avoid: '别用「倒过来晃也不洒」的学饮杯逗他玩。玩过一次，之后每次拿到杯子都想晃，水就喝不进去了。',
  },
};

const FINGER_FOOD: ChainTarget = {
  id: 'A2',
  name: '抓食送入口中',
  group: 'skill',
  band: 'infant',
  difficulty: 2,
  settings: ['home'],
  summary: '用手从碗里抓起小块食物，稳稳送到嘴边放进嘴里，不是抓着玩或者糊一脸。',
  standard2: '能咀嚼固体食物不呛；用手抓食送入口中（skill E1 原文口径）',
  onePenalty: '只吃软食；抓食洒落 >50%',
  sessionSuccess: '一节课练 3 遍，其中 1 遍抓起—送到—吃下三步不用手把手',
  skillRef: 'E1',
  defaultMode: 'backward',
  sessionRuns: 3,
  needs: ['一小碗切块的手指食物（香蕉块、馒头丁等，约成人小指头大小）', '防水围兜', '湿巾'],
  steps: [
    {
      order: 1,
      name: '伸手去拿',
      sd: '拿一个吃',
      criterion: '手伸进碗里，抓住一样食物',
      hint: '指一下碗里 / 把碗往他面前推',
    },
    {
      order: 2,
      name: '捏稳',
      sd: '捏住',
      criterion: '手指捏住食物，抬手时没有掉回碗里',
      hint: '帮他把手指合上 / 换一块更好抓的',
    },
    {
      order: 3,
      name: '送到嘴边',
      sd: '送到嘴里',
      criterion: '手到嘴边，食物中途没有掉落',
      hint: '扶一下他的手肘 / 示范送到嘴边',
    },
    {
      order: 4,
      name: '放进嘴里',
      sd: '吃吧',
      criterion: '食物进嘴、咀嚼、咽下，没有一直含在嘴里',
      hint: '示范张嘴 / 说「嚼一嚼」',
    },
  ],
  familyGuide: {
    how: '一次只放 3–4 块在碗里。堆满一碗，孩子会用手抓一把玩，反而不肯好好拿。',
    avoid: '别在他抓不稳的时候直接把食物塞进嘴里。这一塞，「送到嘴边」这一步就永远轮不到他做。',
  },
};

const DRESS_COOPERATE: ChainTarget = {
  id: 'A3',
  name: '穿衣配合',
  group: 'skill',
  band: 'infant',
  difficulty: 3,
  settings: ['home'],
  summary: '穿脱衣服时不用被拽：听到「伸手」就把手臂伸进袖子，听到「抬脚」就把脚伸进裤腿。',
  standard2: '穿脱时主动伸手、抬脚 ≥2 次/次（skill E3 原文口径）',
  onePenalty: '需口头提示；被动配合',
  sessionSuccess: '一节课穿脱外套 2 次，其中 1 次三次配合都不用拽他的手',
  skillRef: 'E3',
  defaultMode: 'backward',
  sessionRuns: 2,
  needs: ['一件宽松开衫或套头衫', '一条松紧带长裤'],
  steps: [
    {
      order: 1,
      name: '伸手进袖',
      sd: '伸手',
      criterion: '手臂朝袖口方向伸出，不是被拽进去',
      hint: '把袖子撑开对着他的手 / 轻碰一下他的手背',
    },
    {
      order: 2,
      name: '手出袖口',
      sd: '手出来',
      criterion: '手掌从袖口穿出来',
      hint: '从袖口外面轻轻带一下 / 让他在里面自己推',
    },
    {
      order: 3,
      name: '抬脚进裤腿',
      sd: '抬脚',
      criterion: '一只脚抬起并伸进裤腿口',
      hint: '把裤腿撑开 / 托一下他的脚',
    },
    {
      order: 4,
      name: '头钻进领口',
      sd: '头低一下',
      criterion: '头从领口穿出来',
      hint: '把领口撑大 / 扶一下他的头',
    },
  ],
  familyGuide: {
    how: '每天固定两个穿衣时点（起床、洗澡后），用同一句口令。次数够多，配合才会稳定。',
    avoid: '别为了快就一边说着「伸手」一边把他的手拽进去。手被拽过一次，下次他就等着被拽了。',
  },
};

const TOILET_SIGNAL: ChainTarget = {
  id: 'A4',
  name: '如厕表示',
  group: 'skill',
  band: 'infant',
  difficulty: 4,
  settings: ['home'],
  summary: '尿湿或想尿时能表示出来——指裤子、说「湿」或者拉大人的手，而不是一直忍到哭。',
  standard2: '尿湿后能表示不适；对坐便不抗拒（skill E4 原文口径）',
  onePenalty: '只在不舒服时哭；抗拒坐便',
  sessionSuccess: '一节课设 2 次换尿布的情境，其中 1 次他能主动指裤子或拉大人的手',
  skillRef: 'E4',
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['便盆或儿童坐便圈', '易穿脱的裤子', '记录表（记下每次尿湿的时间）'],
  steps: [
    {
      order: 1,
      name: '感觉到湿了停下',
      sd: '（不给指令，等他自己表现）',
      selfInitiated: true,
      criterion: '动作停下，低头看裤子或用手抓裤子',
      hint: '说「是不是湿了」 / 指一下他的裤子',
    },
    {
      order: 2,
      name: '表示出来',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '指裤子、说「湿」或拉大人的手过来',
      hint: '问「怎么了」 / 指一下他的裤子给他看',
    },
    {
      order: 3,
      name: '配合换衣或坐便',
      sd: '来，换一下',
      criterion: '走向换衣处或坐上便盆，不抗拒、不打挺',
      hint: '牵他的手过去 / 自己先坐下示范',
    },
  ],
  familyGuide: {
    how: '先记一周尿湿时间，找出规律（多半在喝水后 20–30 分钟）。到点前带他去坐一次便盆，成功率高得多。',
    avoid: '别在尿湿后批评。这个阶段的目标是「愿意表示」，一被说，孩子学会的是藏起来不让人发现，反而更难练。',
  },
};

// ---------------------------------------------------------------------------
// A 组 · 生活技能 · 3-6 岁
// ---------------------------------------------------------------------------

const WASH_HANDS: ChainTarget = {
  id: 'A5',
  name: '洗手',
  group: 'skill',
  band: 'preschool',
  difficulty: 6,
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
    how: '把洗手固定在饭前和如厕后两个时点，一次只退一步辅助——这周还在拉袖子，就不要同时要求他自己关水。',
    avoid: '别开着水龙头替他搓。水流声一响，孩子容易只玩水不搓手，后面几步全乱。',
  },
};

const TIDY_TOYS: ChainTarget = {
  id: 'A6',
  name: '收玩具',
  group: 'skill',
  band: 'preschool',
  difficulty: 7,
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
  id: 'A7',
  name: '穿脱鞋',
  group: 'skill',
  band: 'preschool',
  difficulty: 8,
  settings: ['home', 'outdoor'],
  summary: '出门前自己坐到椅子上把两只脚伸进鞋、提上后跟、粘好粘扣；回家能自己脱下来放回鞋架。',
  standard2: '穿：两只鞋独立穿好并粘牢，左右不反；脱：脱下后摆回鞋架（skill J3 口径）',
  onePenalty: '会伸脚不会提后跟；或粘扣粘反、脱完随手一扔',
  sessionSuccess: '一节课穿 2 次脱 2 次，其中各 1 次不用手把手',
  skillRef: 'J3',
  defaultMode: 'backward',
  sessionRuns: 3,
  needs: ['一双粘扣鞋（系带单列，别混着练）', '门口的小椅子', '鞋架'],
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
      criterion: '把两只鞋都拿到手边，先不论左右',
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
    {
      order: 6,
      name: '脱鞋摆回去',
      sd: '脱下来放好',
      criterion: '两只鞋脱下后并排摆在鞋架上，鞋头朝外',
      hint: '指一下鞋架 / 示范鞋头朝外',
      optional: true, // 出门环节只练穿；回家环节才练这一步
    },
  ],
  familyGuide: {
    how: '把穿鞋固定成出门前最后一个动作，椅子放在固定位置。位置固定了，孩子才知道「到这儿就该穿鞋」。',
    avoid: '别在赶时间的时候让他自己穿。你一急就上手代劳，他学到的就是「磨蹭到最后会有人帮我」。',
  },
};


// ---------------------------------------------------------------------------
// A 组 · 生活技能 · 6-12 岁
// ---------------------------------------------------------------------------

const BRUSH_TEETH: ChainTarget = {
  id: 'A8',
  name: '刷牙',
  group: 'skill',
  band: 'school',
  difficulty: 12,
  settings: ['home'],
  summary: '早晚自己完成一遍刷牙：挤牙膏、刷外面刷里面、漱口、冲牙刷、放回原位，不用人站在旁边盯。',
  standard2: '早晚各一次，7 步独立完成，全程 ≥90 秒，刷到里面不跳过',
  onePenalty: '会刷外面不会刷里面；或漱口水直接咽下去、牙刷冲两下就扔回杯子',
  sessionSuccess: '一节课练 2 遍，其中 1 遍从拿牙刷到放回杯子独立走完',
  defaultMode: 'backward',
  sessionRuns: 2,
  needs: ['自己的牙刷与杯子', '牙膏', '洗手台', '一面能看到嘴的镜子'],
  steps: [
    {
      order: 1,
      name: '拿牙刷',
      sd: '拿牙刷',
      criterion: '从自己的杯子里取出牙刷，不拿错别人的',
      hint: '指一下杯子 / 说「你的在蓝色那个」',
    },
    {
      order: 2,
      name: '挤牙膏',
      sd: '挤牙膏',
      criterion: '挤出黄豆大小到刷毛上，没有挤到手上或台面上',
      hint: '示范挤一次 / 扶着他的手挤',
    },
    {
      order: 3,
      name: '刷外面',
      sd: '刷外面',
      criterion: '刷毛贴住牙面来回刷 ≥15 秒，上下排都刷到',
      hint: '自己刷给他看 / 说「上面刷刷，下面刷刷」',
    },
    {
      order: 4,
      name: '刷里面',
      sd: '里面也刷',
      criterion: '刷毛转到牙齿内侧刷 ≥15 秒，张嘴配合',
      hint: '示范内侧刷 / 说「张开嘴」',
    },
    {
      order: 5,
      name: '漱口',
      sd: '漱口',
      criterion: '含水漱 ≥3 次并吐出，没有咽下去',
      hint: '示范吐水 / 说「吐到池子里」',
    },
    {
      order: 6,
      name: '冲牙刷',
      sd: '冲一下',
      criterion: '牙刷在水流下冲净，刷毛上看不到泡沫',
      hint: '指一下水流 / 说「还有泡泡」',
    },
    {
      order: 7,
      name: '放回杯子',
      sd: '放回去',
      criterion: '牙刷头朝上放回自己的杯子，不横倒在台面上',
      hint: '指一下杯子 / 示范头朝上',
    },
  ],
  familyGuide: {
    how: '早晚两次固定在起床后和睡前，用同一句开场话。刷牙靠的是流程固定，不是每天提醒。',
    avoid: '别因为赶时间就替他刷。刷里面最容易被跳过，一旦默许「刷外面就行」，这条就练不成。',
  },
};

const PACK_SCHOOLBAG: ChainTarget = {
  id: 'A9',
  name: '按课表整理书包',
  group: 'skill',
  band: 'school',
  difficulty: 13,
  settings: ['desk', 'home'],
  summary: '照着第二天的课表，把书、作业、文具一样样装进书包，最后对一遍不漏东西。',
  standard2: '5 分钟内独立备齐当天用品，遗漏 ≤1 项，不需口头提醒看课表（skill L3 口径）',
  onePenalty: '会把书塞进包，但不看课表；或装完不检查，第二天到校发现缺作业',
  sessionSuccess: '一节课练 2 遍，其中 1 遍不看课表也能按科目找齐（说明课表已内化）',
  skillRef: 'L3',
  defaultMode: 'total',
  sessionRuns: 2,
  needs: ['打印的课表或手机课表', '书包', '书架或抽屉（书按科目分开放）', '铅笔盒与作业本'],
  steps: [
    {
      order: 1,
      name: '看课表',
      sd: '看课表',
      criterion: '拿到课表或打开课表，视线落在上面 ≥2 秒',
      hint: '指一下课表 / 把课表推到他面前',
    },
    {
      order: 2,
      name: '说带什么',
      sd: '明天要带什么',
      criterion: '说出至少 2 个科目名或物品名',
      hint: '指课表第一行 / 问「第一节是什么课」',
    },
    {
      order: 3,
      name: '找书',
      sd: '把书找出来',
      criterion: '从书架取出对应科目的书 ≥2 本，放在桌上',
      hint: '说出科目名 / 指一下书架位置',
    },
    {
      order: 4,
      name: '装进书包',
      sd: '装进去',
      criterion: '书本平放进主袋，不折角、不硬塞',
      hint: '撑开书包口 / 手把手放进去',
    },
    {
      order: 5,
      name: '装文具和作业',
      sd: '文具和作业呢',
      criterion: '铅笔盒和当天作业本都进包',
      hint: '指一下桌面 / 说「作业在桌上」',
    },
    {
      order: 6,
      name: '对一遍',
      sd: '再对一遍',
      criterion: '对着课表逐项指认，自己发现遗漏并补上',
      hint: '指着课表问「这个带了吗」',
      optional: true, // 时间紧时可跳过，但跳过要在记录里标出来
    },
  ],
  familyGuide: {
    how: '把整理书包固定在睡前最后一个环节，课表贴在书桌上方。前几天带着对一遍，之后只在对完之后检查。',
    avoid: '别在孩子装完之后偷偷补漏。补了他永远不知道自己漏了什么，「对一遍」这一步就废了。',
  },
};

const BUY_THING: ChainTarget = {
  id: 'A10',
  name: '用钱买东西',
  group: 'skill',
  band: 'school',
  difficulty: 14,
  settings: ['outdoor', 'home'],
  summary: '在便利店自己完成一次买东西：想好买什么、看价格、数够不够、递钱、接找零、拿上东西走。',
  standard2: '20 元以内独立完成付款与找零核对，连续 3 次中 ≥2 次正确（skill L2 口径）',
  onePenalty: '会递钱不会等找零；或钱一递就跑开，东西忘了拿',
  sessionSuccess: '一节课在真实便利店完成 2 次，其中 1 次全程不用提示',
  skillRef: 'L2',
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['10 元与 1 元纸币或硬币若干', '一间便利店（避开排队高峰）', '事先和店员打过招呼'],
  steps: [
    {
      order: 1,
      name: '想好买什么',
      sd: '想买什么',
      criterion: '指出或说出一样具体的东西，不换来换去',
      hint: '问「你要哪一个」 / 给两个选项',
    },
    {
      order: 2,
      name: '看价格',
      sd: '多少钱',
      criterion: '读出价签上的数字，或明确指向价签',
      hint: '指一下价签 / 说「上面写着几」',
    },
    {
      order: 3,
      name: '数钱够不够',
      sd: '钱够不够',
      criterion: '数出金额并说出「够」或「不够」，判断正确',
      hint: '帮他数 / 问「一张十块够吗」',
    },
    {
      order: 4,
      name: '递钱',
      sd: '把钱给他',
      criterion: '钱递到店员手上或柜台上，没有扔',
      hint: '示范递 / 扶着他的手递过去',
    },
    {
      order: 5,
      name: '接找零',
      sd: '等找钱',
      criterion: '接过找零放进钱包或口袋，没有落在柜台上',
      hint: '说「等一下，还有钱」 / 指一下找零',
    },
    {
      order: 6,
      name: '拿东西走',
      sd: '拿上东西',
      criterion: '拿齐买的物品再离开柜台',
      hint: '指一下袋子 / 说「东西还没拿」',
    },
  ],
  familyGuide: {
    how: '先从「只买一样、钱数正好不用找零」开始；稳了再加找零，最后才加自己挑。三步分开练，别一次全上。',
    avoid: '别在人多的时段练。排队一催，孩子会被推着走完流程，学不到东西，还容易被吓退。',
  },
};

const SHOWER: ChainTarget = {
  id: 'A11',
  name: '淋浴与擦干',
  group: 'skill',
  band: 'school',
  difficulty: 15,
  settings: ['home'],
  summary: '自己完成一次淋浴：脱衣归位、试水温、淋湿、打沐浴露、冲净、关水、擦干、穿好睡衣。',
  standard2: '8 步独立完成，水温自己试过再站进去，出浴室时身上擦到不滴水',
  onePenalty: '会冲水不会搓；或洗完不擦干就穿衣服，头发滴着水出来',
  sessionSuccess: '一节课练 1 遍，从脱衣到穿好睡衣，成人只在门外提示不超过 2 次',
  defaultMode: 'backward',
  sessionRuns: 1,
  needs: ['淋浴间', '沐浴露', '大浴巾', '睡衣', '洗衣篮'],
  steps: [
    {
      order: 1,
      name: '脱衣归位',
      sd: '把衣服放进篮子',
      criterion: '脱下的衣物全部放进洗衣篮，不扔在地上',
      hint: '指一下篮子 / 捡起来递给他放',
    },
    {
      order: 2,
      name: '试水温',
      sd: '先试试水',
      criterion: '手伸到水流下试温，说「可以」或调冷热后才站进去',
      hint: '示范用手背试 / 说「太烫就转这边」',
    },
    {
      order: 3,
      name: '淋湿全身',
      sd: '淋湿',
      criterion: '身体正面、背面、头发都淋到水',
      hint: '说「转个圈」 / 示范转身',
    },
    {
      order: 4,
      name: '打沐浴露',
      sd: '打沐浴露',
      criterion: '取适量搓出泡沫，覆盖手臂、前身、腿',
      hint: '示范搓 / 说「腋下和脖子也要」',
    },
    {
      order: 5,
      name: '冲净',
      sd: '冲干净',
      criterion: '身上和头发没有泡沫残留',
      hint: '指一下还带泡沫的地方 / 说「头发上还有」',
    },
    {
      order: 6,
      name: '关水',
      sd: '关水',
      criterion: '龙头完全关闭，不再出水',
      hint: '指一下龙头 / 手把手关',
    },
    {
      order: 7,
      name: '擦干',
      sd: '擦干',
      criterion: '用浴巾把身体和头发擦到不滴水',
      hint: '示范擦背 / 说「头发也要擦」',
    },
    {
      order: 8,
      name: '穿睡衣',
      sd: '穿衣服',
      criterion: '睡衣睡裤都穿好，前后不反',
      hint: '把衣服递到他手上 / 指一下正反',
    },
  ],
  familyGuide: {
    how: '把淋浴固定在睡前，顺序每次都一样（先洗头后洗身，或反过来，选一种就别改）。流程稳定了才谈得上独立。',
    avoid: '这是隐私环节：6 岁以上尽量由同性成人陪同，只在孩子明确求助时才进浴室介入，不要为了练「独立」让孩子独自在无人看护的浴室里完成。',
  },
};


// ---------------------------------------------------------------------------
// P 组 · 解决问题
// ---------------------------------------------------------------------------

const REACH_FOR_HAND: ChainTarget = {
  id: 'P1',
  name: '够不着时拉大人的手',
  group: 'problem',
  band: 'infant',
  difficulty: 5,
  settings: ['home', 'floor'],
  summary: '想要的东西拿不到时，不是站着哭，而是转向大人、拉住他的手往那个方向带——这是求助最早的形式。',
  standard2: '够不到时 10 秒内转向大人并拉手或指物，一周 ≥3 次',
  onePenalty: '会拉手，但要大人先问「你要什么」；或直接拉着人走却不说不要哪个',
  sessionSuccess: '一节课设 3 次够不着的情境，其中 2 次能自己转向大人并拉手',
  defaultMode: 'forward',
  sessionRuns: 3,
  needs: ['一样他想要但放高的东西（透明罐更好）', '一张稳的小凳子（先收起来）'],
  steps: [
    {
      order: 1,
      name: '停下不再硬够',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '停止跳跃、拉扯、够的动作，持续 ≥2 秒',
      hint: '说「停」 / 把他从柜子边带开半步',
    },
    {
      order: 2,
      name: '转向大人',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '转头或转身，身体朝向身边的大人',
      hint: '叫他的名字 / 走到他侧前方让他更容易看到',
    },
    {
      order: 3,
      name: '拉手或指给他看',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '抓住大人的手往目标方向拉，或手指目标同时发声',
      hint: '把他的手放到你手上 / 说「拉我过去」',
    },
  ],
  familyGuide: {
    how: '把零食和常用玩具放在「他一定够不到」的高度。够得到就没有求助的机会，放太高又会直接放弃——中间那一档才有用。',
    avoid: '别在他还没拉手时就把东西拿下来。你预判得越准，他越不需要学这一招。',
  },
};

// ---------------------------------------------------------------------------
// P 组 · 解决问题 · 3-6 岁
// ---------------------------------------------------------------------------

const STOP_ON_NO: ChainTarget = {
  id: 'P2',
  name: '听到「不可以」停下来',
  group: 'problem',
  band: 'preschool',
  difficulty: 9,
  settings: ['home', 'outdoor', 'floor'],
  summary: '听到「不可以」能立刻停手、把手从东西上拿开，并且不马上又回去——这是所有安全规则的第一道闸。',
  standard2: '听到「不可以」能停止动作；能等待 10 秒（skill D5 原文口径）',
  onePenalty: '需重复 2–3 次才停；等待 <5 秒',
  sessionSuccess: '一节课设 3 次制止的情境，其中 2 次听一遍就停、并且能等 10 秒不回去',
  skillRef: 'D5',
  defaultMode: 'forward',
  sessionRuns: 3,
  needs: ['一样他常见但不可以碰的东西（插座、热水杯、别人的杯子）', '一个计时器或手机秒表'],
  steps: [
    {
      order: 1,
      name: '停手',
      sd: '不可以',
      criterion: '动作在 2 秒内停下，手停在半空或原位',
      hint: '音量提高再说一遍 / 手挡在他和物品之间',
    },
    {
      order: 2,
      name: '手拿开',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '手从物品上移开，退后或转向别处',
      hint: '指一下他的手 / 说「手放下来」',
    },
    {
      order: 3,
      name: '等一会儿不回去',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '10 秒内没有再去碰，能转去做别的事或看着大人',
      hint: '用计时器数给他听 / 递给他另一样东西',
    },
  ],
  familyGuide: {
    how: '把「不可以」固定用在真正危险的事上。一天说十遍「不可以」，这个词就废了，孩子会当背景音。',
    avoid: '别在孩子停下之后又补一句「怎么这么不听话」。停下来就该结束，追着说会让他下次犹豫要不要停。',
  },
};

const ASK_FOR_HELP: ChainTarget = {
  id: 'P3',
  name: '不会做时说「帮我」',
  group: 'problem',
  band: 'preschool',
  difficulty: 10,
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

const THING_TAKEN: ChainTarget = {
  id: 'P4',
  name: '东西被拿走',
  group: 'problem',
  band: 'preschool',
  difficulty: 11,
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
      criterion: '走到大人面前，说出「他拿我的」或同时指人和指物',
      hint: '牵他过去 / 说前半句「老师，他…」',
    },
  ],
  familyGuide: {
    how: '在家用「拿走—还回来」的小游戏练前 3 步，拿完一定还回去。重点是让孩子体验「说出来东西就回来了」，而不是「抢回去才算赢」。',
    avoid: '别教孩子「他抢你就抢回来」。这条链保的是孩子的安全和表达，不是输赢；也别在孩子面前评判对方小孩。',
  },
};


// ---------------------------------------------------------------------------
// P 组 · 解决问题 · 6-12 岁
// ---------------------------------------------------------------------------

const GOT_LOST: ChainTarget = {
  id: 'P5',
  name: '走散了怎么办',
  group: 'problem',
  band: 'school',
  difficulty: 16,
  settings: ['outdoor'],
  summary: '在商场或街上找不到家人时，不乱跑、回到刚才的位置、找穿制服的人或带小孩的大人，说清自己走散了。',
  standard2: '5 步能在实地演练中独立走完，全程不跑出视线范围、不跟陌生人离场',
  onePenalty: '知道要找大人，但一着急就往反方向跑；或找到人却说不清自己是谁',
  sessionSuccess: '一节课设 2 个情境：先在教室里把 5 步说清，再去一次真实商场实地走一遍',
  skillRef: 'L5',
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['一间常去的商场或超市（避开人流高峰）', '一张写着孩子姓名和家长电话的卡片', '提前和现场保安打过招呼'],
  steps: [
    {
      order: 1,
      name: '停下不乱跑',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '停下脚步站在原地 ≥5 秒，没有继续往前或往回跑',
      hint: '说「站住」 / 拉住他的手',
    },
    {
      order: 2,
      name: '环顾四周',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '转头看四周，视线在搜索，不是原地发呆或哭',
      hint: '说「看看妈妈在哪」 / 带他转头看一圈',
    },
    {
      order: 3,
      name: '回到固定点',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '退回到上一个经过的固定位置（店门口、收银台、电梯口）',
      hint: '指一下固定点 / 说「回刚才那个门口」',
    },
    {
      order: 4,
      name: '找对人',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '走向穿制服的工作人员或带小孩的家长，距离 <2 米停下',
      hint: '指一下保安 / 说「找穿制服的叔叔」',
    },
    {
      order: 5,
      name: '说清走散了',
      sd: '告诉他你怎么了',
      criterion: '说出「我找不到妈妈了」并说出自己的名字',
      hint: '说前半句「我找不到…」 / 让他拿出信息卡',
    },
  ],
  familyGuide: {
    how: '先在教室里把 5 步说熟，再去一次真实商场走一遍。提前和保安打好招呼，让孩子真的走过去说一次——演练过的和没演练过的差别非常大。',
    avoid: '别用「你再乱跑就会被拐走」来吓。吓出来的配合遇到真走散时会变成僵住不动，反而更危险。',
  },
};

const EMERGENCY_FIRST_STEP: ChainTarget = {
  id: 'P6',
  name: '突发情况第一步',
  group: 'problem',
  band: 'school',
  difficulty: 17,
  settings: ['home', 'outdoor'],
  summary: '遇到受伤流血、着火冒烟、有人倒地、陌生人搭讪、被反锁这五类情况，先离开危险、再找人、能说清发生在哪。',
  standard2: '5 类情境中 ≥4 类能说出并演示第一步，不自行处理危险源（skill L5 口径）',
  onePenalty: '说得出但做不出；或第一时间跑去找人，却没先离开危险的地方',
  sessionSuccess: '一节课过 3 类情境，其中 2 类能自己先离开危险再找大人',
  skillRef: 'L5',
  defaultMode: 'forward',
  sessionRuns: 2,
  needs: ['5 张情境卡片（受伤 / 着火 / 有人倒地 / 陌生人 / 被反锁）', '教室或家里的实景动线'],
  steps: [
    {
      order: 1,
      name: '停下',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '手里的事停下，注意力转向异常的地方',
      hint: '说「停」 / 指一下异常的方向',
    },
    {
      order: 2,
      name: '判断危不危险',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '说出「危险」或「不危险」，判断与实情一致',
      hint: '问「这个危险吗」 / 给两个选项',
    },
    {
      order: 3,
      name: '离开危险',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '朝远离危险源的方向移动 ≥2 米，没有伸手去碰',
      hint: '拉住他往后退 / 说「往这边走」',
    },
    {
      order: 4,
      name: '找大人',
      sd: '（不给指令）',
      selfInitiated: true,
      criterion: '走向最近的成人，距离 <2 米并开口叫人',
      hint: '指一下最近的成人 / 说「去叫叔叔」',
    },
    {
      order: 5,
      name: '说清在哪怎么了',
      sd: '告诉他怎么了',
      criterion: '说出「哪里 + 怎么了」两个要素，如「厨房着火了」',
      hint: '说前半句「厨房…」 / 给两个选项让他选',
    },
  ],
  familyGuide: {
    how: '一次只过一类情境，用实景走一遍：站在厨房门口问「这里冒烟了，你第一步做什么」。五类分开练，别一次全上。',
    avoid: '别让孩子演练「救火」「止血」这类处置动作。这条链只保前三步——离开、找人、说清楚。要孩子去处理危险源，反而是把他推回危险里。',
  },
};


// ---------------------------------------------------------------------------
// 汇总与查询
// ---------------------------------------------------------------------------

/** 按 difficulty 升序排列，数组顺序 == 难度顺序，方便核对 */
export const CHAIN_TARGETS: ChainTarget[] = [
  CUP_DRINK, // 1  0-3 岁
  FINGER_FOOD, // 2
  DRESS_COOPERATE, // 3
  TOILET_SIGNAL, // 4
  REACH_FOR_HAND, // 5
  WASH_HANDS, // 6  3-6 岁
  TIDY_TOYS, // 7
  PUT_ON_SHOES, // 8
  STOP_ON_NO, // 9
  ASK_FOR_HELP, // 10
  THING_TAKEN, // 11
  BRUSH_TEETH, // 12  6-12 岁
  PACK_SCHOOLBAG, // 13
  BUY_THING, // 14
  SHOWER, // 15
  GOT_LOST, // 16
  EMERGENCY_FIRST_STEP, // 17
];

export function groupOf<T extends { group: ChainGroup }>(targets: T[], group: ChainGroup): T[] {
  return targets.filter((t) => t.group === group);
}

export function getChainTarget(id: string | undefined): ChainTarget | undefined {
  if (!id) return undefined;
  return CHAIN_TARGETS.find((t) => t.id === id);
}

/**
 * 挑下一个目标：按难度顺序取第一个还没稳的。
 *
 * 传了 `lastBand`（最近一次练的那条链属于哪一段）就先在**同段**里挑。
 * 老师跨段取用是正常做法，但 3-6 岁练完洗手，再被建议回 0-3 岁去练用杯喝水，
 * 这条建议就没用了——「下次练」要能接着练，不是从头再来。
 * 同段都稳了才回到全表按难度挑，保证一直练下去总有个下一步。
 */
export function suggestNextChain(stableIds: string[], lastBand?: ExpressionBand): ChainTarget | undefined {
  const stable = new Set(stableIds);
  const pending = CHAIN_TARGETS.filter((t) => !stable.has(t.id));
  if (pending.length === 0) return undefined;
  const sameBand = lastBand ? pending.filter((t) => t.band === lastBand) : [];
  const pool = sameBand.length > 0 ? sameBand : pending;
  return pool.reduce((a, b) => (a.difficulty <= b.difficulty ? a : b));
}

/** 列表页顶部的两段式分区（生活技能 / 解决问题），段内按难度升序 */
export function chainGroups(targets: ChainTarget[] = CHAIN_TARGETS): { group: ChainGroup; targets: ChainTarget[] }[] {
  return (['skill', 'problem'] as ChainGroup[]).map((group) => ({
    group,
    targets: groupOf(targets, group).slice().sort((a, b) => a.difficulty - b.difficulty),
  }));
}

/**
 * 按年龄段切片，列表页用来做「0-3 / 3-6 / 6-12」的折叠。
 * 段内按难度升序，空段不返回。
 */
export function targetsByBand(targets: ChainTarget[] = CHAIN_TARGETS): { band: string; targets: ChainTarget[] }[] {
  const order = ['infant', 'preschool', 'school'];
  return order
    .map((band) => ({
      band,
      targets: targets.filter((t) => t.band === band).slice().sort((a, b) => a.difficulty - b.difficulty),
    }))
    .filter((g) => g.targets.length > 0);
}

/** 三种排法都列出来，供老师现场改 */
export const CHAIN_MODES: ChainMode[] = ['backward', 'forward', 'total'];

/** 一条链要准备什么，列表页提前看 */
export function needsLine(target: ChainTarget): string {
  return target.needs.length === 0 ? '不需要教具' : target.needs.join(' · ');
}
