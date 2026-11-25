/**
 * 认知理解训练目标（C 系列）
 *
 * 排序口径不是年龄，而是「获得顺序」：
 *   视觉配对（不需要语言）→ 归类 → 特征/功能（要理解词的指代）→ 方位/数量 →
 *   顺序、比较、相同不同 → 因果与排除（要绕一层推理）。
 *
 * 和说说小课堂共用同一套结构：每个目标 8 道题、每节抽 4 道、教具槽位化、
 * DTT 试次判定、三行记录。区别只在题库和达成标准。
 *
 * 判定口径：认知目标基本都是听者反应——看动作对不对，不要求说出来。
 * 孩子说出来了是加分项，记录在 checks 里，但不作为达标条件。
 */

import type {
  ExpressionStage,
  ExpressionStageGroup,
  ExpressionTarget,
  ExpressionBand,
} from './expressionTargets';

/** 认知目标统一用这个等待口径，和 DTT 的 3 秒等待窗一致 */
const WAIT_THREE_SECONDS =
  '等 3 秒。这 3 秒里不重复指令、不替他拿、不用手指、不把答案挪近一点。他看你的时候，你就看着他，不点头也不出声。';

export const COGNITION_TARGETS: ExpressionTarget[] = [
  {
    id: 'C1',
    name: '相同物品配对',
    band: 'infant',
    difficulty: 1,
    settings: ['desk', 'floor'],
    settingDifficulty: { floor: 2 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '桌上放一个样子，从三样里挑出一模一样的那个，不需要说出名字',
    standard2: '3 选 1 相同配对连续两轮 ≥8/10，且中间不靠位置猜',
    onePenalty: '试错式乱拿、拿起又放下、要人指才拿对',
    sessionSuccess: '10 个回合里 ≥8 次第一次就拿对',
    opener: '找一个和这个一样的，放到我这里。',
    vbMapp: {
      operant: 'VP-MTS 视觉配对',
      level: 2,
      milestone: 'VP-MTS L2 · 第 8–10 里程碑（相同物品配对）',
      rationale:
        '配对是认知的起点，不需要命名、不需要听懂物品名，只要「看—比—拿」。ASD 孩子常常能配对却说不出来，所以这一条先把视觉比对这条通路建起来，后面的分类、特征都踩在它上面。',
      tag: 'VP-MTS L2',
    },
    materials: [
      {
        key: 'pair',
        label: '一组相同的东西（每样两件）',
        options: [
          { name: '红色积木', note: '两块一模一样的红积木，最稳' },
          { name: '勺子', note: '两把同样的勺子，好抓' },
          { name: '动物卡片', note: '两张一样的动物图，适合不喜欢实物的孩子' },
          { name: '小杯子', note: '两个一样的塑料杯' },
        ],
        fallback: '任何「同款两件」的东西都行：两只一样的袜子、两个一样的瓶盖、两片一样的饼干。关键是完全一样，不是相似。',
      },
      {
        key: 'distract',
        label: '两样差别很大的干扰物',
        options: [
          { name: '一个小球和一个勺子', note: '颜色、形状、材质都不同，不容易混' },
          { name: '一块积木和一张卡片', note: '立体和平面的差别够大' },
          { name: '一只袜子和一个杯子' },
        ],
        fallback: '干扰物只要和样本明显不同就行，别用「同色不同物」这种容易混的。',
      },
    ],
    tasks: [
      {
        id: 'C1-t1',
        ask: '（桌上摆：{pair} 一件放他正前方当样本，另外 {pair} 和 {distract} 三样分散摆开）找一个和这个一样的，拿给我。',
        hint: '（指着样本，再指一下两样东西）一样的，是哪个？',
        checks: ['第一次就拿对', '拿到后放到你手上，不是自己留着玩', '中途没有挨个试'],
      },
      {
        id: 'C1-t2',
        ask: '（把样本放到桌子另一头，三样候选摆成一排）看这个，把一样的找出来。',
        hint: '（把样本挪近一点，和三样候选并排）哪个和它一样？',
        checks: ['跨距离也能配对', '没有靠「离样本近」来选'],
      },
      {
        id: 'C1-t3',
        ask: '（把样本拿在手里举高，三样候选留在桌上）找一个和老师手里一样的。',
        hint: '（把手里的样本转一下给他看）一样的，在桌上哪个？',
        checks: ['看手里的样本也能配', '不需要把样本放下才敢选'],
      },
      {
        id: 'C1-t4',
        ask: '（把三样候选换个位置摆，样本位置不变）再来一次，一样的拿给我。',
        hint: '（指样本，再扫一遍桌面）一样的在哪里？',
        checks: ['换了位置仍然拿对', '不是在记位置'],
      },
      {
        id: 'C1-t5',
        ask: '（样本放左边，候选放右边，中间空出一段距离）把这个和一样的放在一起。',
        hint: '（把样本推到候选旁边）它们两个是一样的，你放一起。',
        checks: ['能把两件一样的东西并排放', '放完会看一眼你'],
      },
      {
        id: 'C1-t6',
        ask: '（先给他看样本 3 秒再收走，然后摆出三样候选）刚才那个，找一个一样的。',
        hint: '（把样本拿出来给他看一眼，再收走）一样的，哪个？',
        checks: ['离开样本也能凭记忆配对', '不是乱指'],
      },
      {
        id: 'C1-t7',
        ask: '（三样候选里放两件「同款」，把其中一件当样本）找一个和这个一样的。',
        hint: '（指样本）这个，还有哪个和它一样？',
        checks: ['两个相同物里能正确挑出另一件', '不会把样本自己拿起来'],
      },
      {
        id: 'C1-t8',
        ask: '（把候选增加到四样，其中三样差别大、一样是目标）这么多的东西里，找出和这个一样的。',
        hint: '（先把两样明显不相关的移开）现在剩三个，一样的在哪里？',
        checks: ['4 选 1 仍然拿对', '没有因为东西多就放弃'],
      },
    ],
    familyGuide: {
      what: '练习「看一个、找一个一样的」，这是所有认知活动的第一步',
      prepare: '同款两件的东西（积木、勺子、袜子都行）+ 两样明显不同的干扰物',
      start: '「找一个和这个一样的，放到我这里。」说完就不说话',
      wait: WAIT_THREE_SECONDS,
      prompts: '先指样本 → 再指候选 → 最后手把手带着拿一次；每退一级之前先给 3 秒等待',
      success: '10 次里有 8 次第一次就拿对，就算过关',
      fallback: '做不到就减到 2 选 1，或者把干扰物换成完全不同的东西',
      dose: '一次 10 个回合，5 分钟以内，一天 1–2 次',
      avoid: '别说「这个对不对呀」，别在他犹豫时把答案挪近，别每次都把目标放在同一侧',
    },
  },

  {
    id: 'C2',
    name: '同类配对（不同样式）',
    band: 'infant',
    difficulty: 2,
    settings: ['desk', 'home'],
    settingDifficulty: { home: 1 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '同一个东西的不同样子也能认出来：红杯子、蓝杯子、大杯子都还是杯子',
    standard2: '3 选 1 跨 2 种以上样式配对 ≥8/10',
    onePenalty: '只认颜色或只认大小，换个样式就不认',
    sessionSuccess: '10 个回合里 ≥8 次拿对同类物',
    opener: '这也是杯子，找找哪个还是杯子。',
    vbMapp: {
      operant: 'VP-MTS 视觉配对',
      level: 2,
      milestone: 'VP-MTS L2 · 第 11–13 里程碑（相似配对 / 同类不同样式）',
      rationale:
        '相同配对靠「长得一样」，同类配对要靠「知道这算什么」。这一步是从图像匹配跨到概念的第一步，卡住的孩子往往只记住了某个具体外观。',
      tag: 'VP-MTS L2',
    },
    materials: [
      {
        key: 'same',
        label: '同一种东西的两个不同款式（样本 + 目标）',
        options: [
          { name: '两个杯子', word: '杯子', note: '一个红的塑料杯、一个透明玻璃杯，差别够大又不算跨类' },
          { name: '两双鞋', word: '鞋', note: '一双运动鞋、一双凉鞋' },
          { name: '两把勺子', word: '勺子', note: '一把不锈钢、一把塑料大勺' },
          { name: '两辆车', word: '车', note: '一辆小汽车、一辆大卡车' },
        ],
        fallback: '拿同一类东西的两件不同款就行：两个碗、两本书、两件衣服。关键是「同类不同样」，不是完全一样。',
      },
      {
        key: 'other',
        label: '两样不同类的东西',
        options: [
          { name: '一个球和一个碗' },
          { name: '一本书和一只袜子' },
          { name: '一块积木和一个杯子' },
        ],
        fallback: '干扰物要跨类，别用「另一个杯子」当下干扰，否则题目就不成立了。',
      },
    ],
    tasks: [
      {
        id: 'C2-t1',
        ask: '（样本是{same}里的第一件，桌上放另一件{same}和{other}两样）哪个和这个是同一种东西？',
        hint: '（指着样本说它的名字）这是{same.word}，还有哪个是{same.word}？',
        checks: ['拿对同类的那件', '没有因为样子不同就放弃'],
      },
      {
        id: 'C2-t2',
        ask: '（把样本换成第二件，候选里放第一件和{other}）这两个里，哪一个和它是一类的？',
        hint: '（说名字）都是{same.word}，找那个{same.word}。',
        checks: ['反过来也能配（双向）', '不需要重复提示'],
      },
      {
        id: 'C2-t3',
        ask: '（样本放远一点，候选摆开）看看这个，把和它一样用途的那个拿过来。',
        hint: '（说功能）它是用来做事的，哪个和它做一样的事？',
        checks: ['能靠用途找同类', '距离不影响判断'],
      },
      {
        id: 'C2-t4',
        ask: '（换位置，样本和候选互换左右）再来一次，找同类的。',
        hint: '（指样本）这个，还有哪个和它一类？',
        checks: ['换位置仍拿对', '不是靠位置记'],
      },
      {
        id: 'C2-t5',
        ask: '（增加一个「近似但不同类」的干扰物，如{other}再加一样）三样里挑出和这个同类的。',
        hint: '（把明显不同类的移开一件）剩下两个，哪个和它一类？',
        checks: ['3 选 1 依然正确', '不被近似干扰物带走'],
      },
      {
        id: 'C2-t6',
        ask: '（先看样本 3 秒再收走，摆出三样候选）刚才那个，找一个一类的给我。',
        hint: '（掏出样本给他看一眼再收走）一类的，哪个？',
        checks: ['凭记忆也能找同类', '不是乱拿'],
      },
      {
        id: 'C2-t7',
        ask: '（把同类的两件都放在桌上，再放一样干扰物）把一类的两个放在一起。',
        hint: '（先指一个，再让他找另一个）还有哪个和它是一家的？',
        checks: ['能把同类两件并到一起', '不会把干扰物也拉进来'],
      },
      {
        id: 'C2-t8',
        ask: '（换成另一组同类物，考察是否泛化）换成别的了，这个和哪个是一类？',
        hint: '（说出类别名）它们都是{same.word}。',
        checks: ['换一组东西仍然能做', '说明是概念不是记图'],
      },
    ],
    familyGuide: {
      what: '练「同类不同样」：认识一个东西，不是记住它某一个样子',
      prepare: '同一类东西的两件不同款式 + 两样不同类的干扰物',
      start: '「哪个和这个是同一种东西？」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '先说出名字提示 → 指一下候选 → 最后带着拿',
      success: '10 次里 8 次拿对，且换一组东西还能做',
      fallback: '退回相同配对（C1），或者把两个款式做得更像一点',
      dose: '一次 10 个回合，5 分钟',
      avoid: '别说「不对，再想想」，别把干扰物摆得离他更远来暗示答案',
    },
  },

  {
    id: 'C3',
    name: '分类归纳',
    band: 'preschool',
    difficulty: 3,
    settings: ['desk', 'floor', 'home'],
    settingDifficulty: { floor: 2, home: 2 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '把混在一起的东西按类别分开放：水果一堆、动物一堆、车一堆',
    standard2: '两类混放 6–8 件，分类正确率 ≥80%，且不需要逐件提示',
    onePenalty: '能分对但每件都要提示；或只按颜色/大小分',
    sessionSuccess: '8 件里 ≥7 件放对筐',
    opener: '把水果都放到这个筐里，别的放到那个筐里。',
    vbMapp: {
      operant: 'Listener 听者反应 + 分类',
      level: 2,
      milestone: 'LR L2 · 类别归组（配合 VP-MTS 分类里程碑）',
      rationale:
        '分类要求同时记住「这一类包含哪些」和「哪些不属于」。它比配对难，因为孩子要自己判断，而不是拿两样东西互相比。',
      tag: 'LR L2',
    },
    materials: [
      {
        key: 'groupA',
        label: '第一类各 3–4 件',
        options: [
          { name: '水果', word: '水果', note: '苹果、香蕉、橘子，最好用实物或仿真水果' },
          { name: '动物', word: '动物', note: '玩具动物，孩子一般更有兴趣' },
          { name: '车', word: '车', note: '小汽车、卡车、消防车' },
        ],
        fallback: '用家里现成的：水果 vs 蔬菜、玩具 vs 餐具、袜子 vs 上衣，两类差别越大越好。',
      },
      {
        key: 'groupB',
        label: '第二类各 3–4 件',
        options: [
          { name: '积木', word: '积木', note: '和水果差别大，不容易混' },
          { name: '餐具', word: '餐具' },
          { name: '衣物', word: '衣服' },
        ],
        fallback: '第二类只要和第一类明显不同就行，别选「都是吃的」这种容易混的搭配。',
      },
    ],
    tasks: [
      {
        id: 'C3-t1',
        ask: '（两类各 3 件混在桌上，两个筐分别贴{groupA.word}和{groupB.word}的图）把{groupA}都放到这个筐里。',
        hint: '（指着筐上的图）{groupA}，是哪些？',
        checks: ['6 件里放对 ≥5 件', '没有把另一类放进来'],
      },
      {
        id: 'C3-t2',
        ask: '（同样混放，这次指令换成另一类）把{groupB}放到这个筐里。',
        hint: '（指筐上的图）{groupB}，找出来。',
        checks: ['换一类也能分', '不是只记住了「往左放」'],
      },
      {
        id: 'C3-t3',
        ask: '（先把两类分开摆好示范一次，再混起来）像刚才那样，把一样的放一起。',
        hint: '（各指一件示范）这个和这个是同类的。',
        checks: ['看过示范后能独立完成', '不需要再示范第二遍'],
      },
      {
        id: 'C3-t4',
        ask: '（混放，但这次不说类名）把它们分成两堆，一样的放一起。',
        hint: '（拿起一件）这个应该和谁在一起？',
        checks: ['不给类名也能自己分出两类', '两类件数都对'],
      },
      {
        id: 'C3-t5',
        ask: '（两类各 4 件，其中放一件「跨类不明显」的）还有这个，它应该去哪边？',
        hint: '（说出它的名字）它是{groupA}还是{groupB}？',
        checks: ['单件判断正确', '判断前会看一眼两堆'],
      },
      {
        id: 'C3-t6',
        ask: '（分完后故意放错一件）看看这里，有没有放错的？',
        hint: '（指着放错的那件）这个，应该在哪边？',
        checks: ['能发现错误', '能说出该去哪边'],
      },
      {
        id: 'C3-t7',
        ask: '（增加到三类，各 2 件）现在有三个筐，把它们分开。',
        hint: '（逐个指筐）这个是{groupA}，这个是{groupB}，剩下的放这里。',
        checks: ['三类也能分', '没有把两类混成一类'],
      },
      {
        id: 'C3-t8',
        ask: '（换一批同类物件，考察泛化）换成别的了，还是一样分。',
        hint: '（重新说一遍类名）{groupA}放这边，{groupB}放那边。',
        checks: ['换物件仍能分类', '说明掌握了类别不是记具体东西'],
      },
    ],
    familyGuide: {
      what: '练「哪些是一家的」，为以后的词汇归类和阅读理解打底',
      prepare: '两类各 3–4 件实物 + 两个筐或两个盘子',
      start: '「把水果都放到这个筐里。」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '说类名 → 指筐上的图 → 拿一件示范 → 手把手放一次',
      success: '8 件里 7 件放对，且不是每件都要提示',
      fallback: '减到每类 2 件，两类差别拉大；仍不行退回同类配对',
      dose: '一次 8–12 件，6 分钟，一天 1 次',
      avoid: '别说「这个不是水果吗」，别在他放错时立刻拿走重放，让他自己发现',
    },
  },

  {
    id: 'C4',
    name: '颜色特征理解',
    band: 'preschool',
    difficulty: 4,
    settings: ['desk', 'floor'],
    settingDifficulty: { floor: 5 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '听「拿红色的」就能挑对，不是靠猜，也不是只认某一件红东西',
    standard2: '4 种基本色，3 选 1 正确率 ≥80%，且跨不同物品',
    onePenalty: '只认某一件东西的颜色；换个物品就不会',
    sessionSuccess: '12 个回合里 ≥10 次拿对指定颜色',
    opener: '拿红色的那个给我。',
    vbMapp: {
      operant: 'LRFFC 听者反应（特征）',
      level: 2,
      milestone: 'LRFFC L2 · 按特征选择（颜色）',
      rationale:
        '颜色词是形容词里最具体的一个，孩子能看见、能比对。先建立「听形容词 → 找符合的物」这条通路，后面的形状、大小、材质都走同一个模式。',
      tag: 'LRFFC L2',
    },
    materials: [
      {
        key: 'colorItems',
        label: '同一种东西的不同颜色（每色 2 件）',
        options: [
          { name: '彩色积木', note: '红黄蓝绿各两块，最标准' },
          { name: '彩色小球' },
          { name: '彩色杯子' },
          { name: '彩色卡片', note: '纯色卡，没有其他干扰信息' },
        ],
        fallback: '任何同款不同色的东西都行：彩笔、瓶盖、袜子。关键是同一形状只有颜色不同，别让形状成为线索。',
      },
    ],
    tasks: [
      {
        id: 'C4-t1',
        ask: '（红黄蓝三件{colorItems}摆开）拿红色的给我。',
        hint: '（指一下红色的那件，不说话）',
        checks: ['第一次就拿对', '没有挨个试'],
      },
      {
        id: 'C4-t2',
        ask: '（换颜色顺序，指令换成黄色）拿黄色的。',
        hint: '（说「黄色」，再看一眼黄色的那件）',
        checks: ['换颜色仍正确', '不是只记住位置'],
      },
      {
        id: 'C4-t3',
        ask: '（三件里两件是红色系，一件是别的颜色）拿红色的。',
        hint: '（把两件红色系指一遍）哪个是红的？',
        checks: ['近似色里能挑对', '不被相近色干扰'],
      },
      {
        id: 'C4-t4',
        ask: '（换成不同物品，同样三种颜色）这些里面，拿蓝色的。',
        hint: '（指蓝色的那件）',
        checks: ['换物品仍能按颜色选', '说明颜色词是真的懂了'],
      },
      {
        id: 'C4-t5',
        ask: '（把红黄蓝三件放成一排，指令换成「把不是红色的给我」）',
        hint: '（指红色的那件摇头）不是这个，拿别的。',
        checks: ['能理解否定', '拿的不是红色的'],
      },
      {
        id: 'C4-t6',
        ask: '（四件四色）拿绿色的。',
        hint: '（说出绿色，指一下）',
        checks: ['4 选 1 正确', '第四种颜色也认得出'],
      },
      {
        id: 'C4-t7',
        ask: '（桌上只有两件是目标色，其余是别的颜色）把红色的都拿给我。',
        hint: '（指一件红色的）还有吗？',
        checks: ['能一次拿两件', '两件都拿对'],
      },
      {
        id: 'C4-t8',
        ask: '（把东西散开摆，距离拉大）把蓝色的给我。',
        hint: '（目光投向蓝色那件，不说话）',
        checks: ['距离和摆放不影响判断', '不需要走近才认得出'],
      },
    ],
    familyGuide: {
      what: '练听懂颜色词，不是只认识「我家那个红杯子」',
      prepare: '同款不同色的东西至少三种颜色，每色两件',
      start: '「拿红色的给我。」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '重复颜色词 → 指一下 → 手把手拿',
      success: '12 次里 10 次拿对，换物品也还能对',
      fallback: '先只练两种颜色，拉开色差；红和黄比红和橙好分',
      dose: '一次 12 个回合，5–6 分钟',
      avoid: '别说「红色，红色，红色」连说三遍，也别在他说错时说「这不是红色吗」',
    },
  },

  {
    id: 'C5',
    name: '形状特征理解',
    band: 'preschool',
    difficulty: 5,
    settings: ['desk', 'floor', 'home'],
    settingDifficulty: { home: 4 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '听「拿圆形的」就能挑对，圆形、方形、三角形分得清',
    standard2: '3 种基本形状，3 选 1 正确率 ≥80%',
    onePenalty: '只认颜色不认形状；圆形和方形混',
    sessionSuccess: '12 个回合里 ≥10 次拿对指定形状',
    opener: '拿圆形的给我。',
    vbMapp: {
      operant: 'LRFFC 听者反应（特征）',
      level: 2,
      milestone: 'LRFFC L2 · 按特征选择（形状）',
      rationale:
        '形状比颜色抽象，因为它不依附于物品本身。孩子要先「看出轮廓」，再和词对上。这一条练的是把注意力从「这是什么」转到「它长什么样」。',
      tag: 'LRFFC L2',
    },
    materials: [
      {
        key: 'shapes',
        label: '三种基本形状（每样 2 件，颜色统一）',
        options: [
          { name: '形状积木', note: '圆形、方形、三角形各两块，同色最好' },
          { name: '形状卡片', note: '纯色块，没有花纹' },
          { name: '纸剪的形状' },
        ],
        fallback: '用纸剪三个形状就行。颜色一定要统一或打乱，别让孩子靠颜色猜。',
      },
      {
        key: 'round',
        label: '生活里的圆形物（泛化用）',
        options: [
          { name: '一个球' },
          { name: '一个瓶盖' },
          { name: '一个盘子' },
        ],
        fallback: '任何「明显是圆的」东西都行，用来测他是不是真懂圆形，而不是只认那块积木。',
      },
    ],
    tasks: [
      {
        id: 'C5-t1',
        ask: '（从{shapes}里取圆形、方形、三角各一件摆开，同色）拿圆形的给我。',
        hint: '（用手指在桌上画一个圆）圆形的。',
        checks: ['第一次就拿对', '不是按位置拿'],
      },
      {
        id: 'C5-t2',
        ask: '（换上{shapes}，换一下摆放顺序）拿方形的。',
        hint: '（比一个方框的手势）',
        checks: ['换形状仍正确', '方形没和圆形混'],
      },
      {
        id: 'C5-t3',
        ask: '（{shapes}里放两件接近圆形的，如椭圆）拿圆形的。',
        hint: '（指真正的圆形）这个才是圆的。',
        checks: ['近似形状里能挑对', '不被椭圆带走'],
      },
      {
        id: 'C5-t4',
        ask: '（换成另一套{shapes}）这些里，拿三角形的。',
        hint: '（比三角形手势）三角形的。',
        checks: ['换物品仍能按形状选', '三角形认得出'],
      },
      {
        id: 'C5-t5',
        ask: '（把{shapes}和{round}混在一起）把圆形的都拿给我。',
        hint: '（指一件圆的）还有圆的吗？',
        checks: ['能跨物品找出同类形状', '至少拿对 2 件'],
      },
      {
        id: 'C5-t6',
        ask: '（{shapes}里再加一个长方形，共四件）拿方形的给我。',
        hint: '（在方形上比一下四条边）',
        checks: ['方形和长方形不混', '4 选 1 正确'],
      },
      {
        id: 'C5-t7',
        ask: '（把{shapes}摆在不同高度的位置）拿圆形的。',
        hint: '（指圆形那件，不说话）',
        checks: ['空间位置不影响判断', '视线能找到'],
      },
      {
        id: 'C5-t8',
        ask: '（把{shapes}贴在纸上、角度旋转过）拿圆形的给我。',
        hint: '（把纸转正一点）',
        checks: ['旋转后仍认得出', '不是只认正着摆的'],
      },
    ],
    familyGuide: {
      what: '练听懂形状词，从「认物品」转到「看轮廓」',
      prepare: '三种基本形状各两件，颜色最好统一；再加几件生活里的圆形物',
      start: '「拿圆形的给我。」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '说形状词 → 用手比划轮廓 → 指一下 → 手把手拿',
      success: '12 次里 10 次拿对，换物品也还能对',
      fallback: '先只练圆形和方形两种，三角形最后加',
      dose: '一次 12 个回合，5–6 分钟',
      avoid: '别在形状上涂不同颜色，否则孩子会改去认颜色',
    },
  },

  {
    id: 'C6',
    name: '功能理解',
    band: 'preschool',
    difficulty: 6,
    settings: ['home', 'desk'],
    settingDifficulty: { desk: 6, home: 4 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '听「哪个用来喝水」，不用看名字就能挑出对的东西',
    standard2: '常见物品 10 件以上，3 选 1 正确率 ≥80%',
    onePenalty: '靠外形猜；同一件物品换个说法就不认识',
    sessionSuccess: '10 个回合里 ≥8 次拿对',
    opener: '哪个是用来喝水的？',
    vbMapp: {
      operant: 'LRFFC 听者反应（功能）',
      level: 2,
      milestone: 'LRFFC L2 · 按功能选择物品',
      rationale:
        '功能是「物品的用途」，比颜色形状更抽象——看不见摸不着，只能靠经验。这一条通了，孩子才算真的理解物品，而不只是认识外观。',
      tag: 'LRFFC L2',
    },
    materials: [
      {
        key: 'funcItem',
        label: '有明确用途的日常物品（3–4 件）',
        options: [
          { name: '杯子、勺子、梳子', note: '用途差异大，最好用' },
          { name: '牙刷、毛巾、梳子' },
          { name: '笔、剪刀、尺子' },
        ],
        fallback: '用教室里现成的：杯子、勺子、纸巾、梳子。要求用途差别明显，别选「勺子和叉子」这种太像的。',
      },
      {
        key: 'sceneItem',
        label: '情境配套物（泛化用）',
        options: [
          { name: '雨伞', note: '配「下雨了要用什么」' },
          { name: '毛巾', note: '配「手湿了用什么」' },
        ],
        fallback: '任何「做什么事要用它」的东西都行，关键是你能说清用途。',
      },
    ],
    tasks: [
      {
        id: 'C6-t1',
        ask: '（{funcItem}三件摆开）哪个是用来喝水的？',
        hint: '（做喝水动作，不说话）',
        checks: ['拿对杯子一类的物品', '不是乱指'],
      },
      {
        id: 'C6-t2',
        ask: '（换一个功能问）哪个是用来梳头的？',
        hint: '（做梳头动作）',
        checks: ['换功能仍正确', '动作提示不需要两次'],
      },
      {
        id: 'C6-t3',
        ask: '（三件换位置）哪个是用来吃东西的？',
        hint: '（做舀东西的动作）',
        checks: ['位置变化不影响', '功能判断稳定'],
      },
      {
        id: 'C6-t4',
        ask: '（加入{sceneItem}）手脏了，用哪个？',
        hint: '（做擦手动作）',
        checks: ['情境式提问也能答', '拿的是能擦的东西'],
      },
      {
        id: 'C6-t5',
        ask: '（不给动作提示，只说功能）哪个可以剪东西？',
        hint: '（比一个剪刀手势）',
        checks: ['纯语言线索能选出', '不依赖动作提示'],
      },
      {
        id: 'C6-t6',
        ask: '（四件里放两件「功能接近」的）哪个是用来写字画画的？',
        hint: '（做握笔动作）',
        checks: ['近似功能里能挑对', '4 选 1 正确'],
      },
      {
        id: 'C6-t7',
        ask: '（把物品盖住一半，只露一部分）哪个是用来喝水的？',
        hint: '（把杯子露出来的部分指一下）',
        checks: ['信息不完整也能判断', '不是靠完整外形'],
      },
      {
        id: 'C6-t8',
        ask: '（换一批物品，考察泛化）这些东西里，哪个用来开门？',
        hint: '（做拧钥匙动作）',
        checks: ['换物品仍能按功能选', '说明功能概念已建立'],
      },
    ],
    familyGuide: {
      what: '练「这个东西是干什么用的」，比认外观更接近真正的理解',
      prepare: '3–4 件用途差别明显的日常物品',
      start: '「哪个是用来喝水的？」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '做动作提示 → 指一下 → 手把手拿',
      success: '10 次里 8 次拿对，换一批物品还能对',
      fallback: '退回颜色/形状（C4/C5），或减少到 2 选 1',
      dose: '一次 10 个回合，5 分钟',
      avoid: '别把物品名说出来，那会变成考命名而不是考功能',
    },
  },

  {
    id: 'C7',
    name: '方位理解',
    band: 'preschool',
    difficulty: 7,
    settings: ['floor', 'desk', 'home'],
    settingDifficulty: { desk: 6, floor: 3, home: 4 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '听「放到盒子里面」「放在桌子下面」就能做对，上下里外、旁边都分得清',
    standard2: '上下 / 里外 / 旁边三组方位，各组 ≥8/10 正确',
    onePenalty: '只认「上面」；或靠模仿别人的动作而不是听指令',
    sessionSuccess: '10 个回合里 ≥8 次放对位置',
    opener: '把积木放到盒子里面。',
    vbMapp: {
      operant: 'Listener 听者反应（方位）',
      level: 2,
      milestone: 'LR L2 · 按方位词完成动作',
      rationale:
        '方位词看不见摸不着，只能靠「参照物 + 关系」来理解。它还是很多课堂指令的前置能力——「把书放到桌上」「坐在椅子后面」，听不懂方位就跟不上集体课。',
      tag: 'LR L2',
    },
    materials: [
      {
        key: 'target',
        label: '一个容易被挪动的小物件',
        options: [
          { name: '小积木', note: '好抓、不滚，最稳' },
          { name: '小球', note: '会滚，难度稍高，看孩子手部控制' },
          { name: '小汽车' },
        ],
        fallback: '任何一只手能拿住的小东西都行，别用易碎的。',
      },
      {
        key: 'anchor',
        label: '一个能做参照的大物件',
        options: [
          { name: '带盖的盒子', note: '能做出「里面」和「上面」' },
          { name: '一把椅子', note: '能做出「上面」「下面」「旁边」' },
          { name: '一个托盘' },
        ],
        fallback: '盒子和椅子就够覆盖大部分方位；没有盒子就用抽屉、书包。',
      },
    ],
    tasks: [
      {
        id: 'C7-t1',
        ask: '（{anchor}放桌上，{target}给他）把{target}放到{anchor}里面。',
        hint: '（指着里面，做一个放进去的手势）里面。',
        checks: ['真的放进去了', '不是放在旁边'],
      },
      {
        id: 'C7-t2',
        ask: '（把{target}拿回来）放到{anchor}上面。',
        hint: '（手在{anchor}上方停一下）上面。',
        checks: ['放在顶部或上方', '和「里面」区分清楚'],
      },
      {
        id: 'C7-t3',
        ask: '（{anchor}换成椅子）放到椅子下面。',
        hint: '（指椅子底下）下面。',
        checks: ['放到椅子下方', '不是放到椅子上'],
      },
      {
        id: 'C7-t4',
        ask: '放到椅子旁边。',
        hint: '（指椅子侧面）旁边。',
        checks: ['放在侧面', '和「上面」「下面」不混'],
      },
      {
        id: 'C7-t5',
        ask: '（把{anchor}挪到房间另一头）把{target}放到{anchor}里面。',
        hint: '（指远处的盒子）那边，里面。',
        checks: ['要走过去完成', '不是随手一放'],
      },
      {
        id: 'C7-t6',
        ask: '（先给一个「把{target}给我」的简单指令，再给方位指令）现在放到{anchor}下面。',
        hint: '（重复「下面」）',
        checks: ['连续两个指令都能跟上', '没有停在第一个动作'],
      },
      {
        id: 'C7-t7',
        ask: '（{anchor}上先放一样别的东西）把{target}放到那样东西上面。',
        hint: '（指那个东西的上方）',
        checks: ['能理解「在某个东西上面」', '不是只会放在桌面上'],
      },
      {
        id: 'C7-t8',
        ask: '（不给手势，只说方位）把{target}放到椅子下面。',
        hint: '（说「下面」，不指）',
        checks: ['纯语言指令能做对', '不依赖手指提示'],
      },
    ],
    familyGuide: {
      what: '练听懂方位词，这是跟集体课指令最相关的一项',
      prepare: '一个盒子或椅子 + 一个小物件',
      start: '「把积木放到盒子里面。」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '重复方位词 → 指向位置 → 手把手带一次',
      success: '每组方位 10 次对 8 次，三组都过',
      fallback: '先只练「里面」和「上面」两个，稳了再加下面、旁边',
      dose: '一次 10 个回合，两组方位，6 分钟',
      avoid: '别一边说一边做动作，孩子会跟着动作走而不是听词',
    },
  },

  {
    id: 'C8',
    name: '数量理解',
    band: 'school',
    difficulty: 8,
    settings: ['desk', 'floor'],
    settingDifficulty: { floor: 9 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '听「给我 3 个」就能数对拿出 3 个，1 到 5 以内不出错',
    standard2: '1–5 以内按数取物 ≥8/10，且不需要逐个数出声',
    onePenalty: '会背数但不会按数取；抓一把给你',
    sessionSuccess: '10 个回合里 ≥8 次数量正确',
    opener: '给我 3 个。',
    vbMapp: {
      operant: 'Math 数量概念',
      level: 3,
      milestone: 'Math L3 · 按数取物（1–5）',
      rationale:
        '「会数数」和「知道 3 是多少」是两件事。很多孩子能背到 20，却拿不出 3 个。这一条练的是数量与实物的对应，是后面加减的基础。',
      tag: 'Math L3',
    },
    materials: [
      {
        key: 'countItem',
        label: '一堆同样的小物件（至少 8 个）',
        options: [
          { name: '积木', note: '大小一致，好摆' },
          { name: '小球' },
          { name: '小饼干', note: '能吃，动机强，但要注意别边做边吃' },
        ],
        fallback: '任何「一堆一样的东西」都行：扣子、木珠、纸片。必须完全一样，否则孩子会去挑不同颜色的。',
      },
      {
        key: 'container',
        label: '一个装东西的容器（我这边一个，他那边一个）',
        options: [
          { name: '小碗', note: '两侧各一个，最好一样' },
          { name: '盘子' },
          { name: '小篮子' },
        ],
        fallback: '桌子两边各划一块区域也行，不一定要容器。',
      },
    ],
    tasks: [
      {
        id: 'C8-t1',
        ask: '（{countItem}倒在{container}里，放在他面前）给我 2 个。',
        hint: '（伸两根手指）两个。',
        checks: ['正好给 2 个', '没有多给或少给'],
      },
      {
        id: 'C8-t2',
        ask: '（东西放回碗里）给我 3 个。',
        hint: '（伸三根手指，不数数）',
        checks: ['正好 3 个', '不靠逐个试'],
      },
      {
        id: 'C8-t3',
        ask: '给我 1 个。',
        hint: '（伸一根手指）',
        checks: ['只给 1 个', '1 和许多区分清楚'],
      },
      {
        id: 'C8-t4',
        ask: '给我 5 个。',
        hint: '（伸五根手指）',
        checks: ['正好 5 个', '上限数量也稳'],
      },
      {
        id: 'C8-t5',
        ask: '（我这边先放 4 个在{container}里，他那边也放一个）拿 4 个放到你那个{container}里。',
        hint: '（指目标碗）4 个。',
        checks: ['数量对且放对地方', '两个要求都完成'],
      },
      {
        id: 'C8-t6',
        ask: '（把数量增加到 6 个）给我 6 个。',
        hint: '（伸六根手指，或让他边数边拿）',
        checks: ['6 个也数得准', '超出 5 也不乱'],
      },
      {
        id: 'C8-t7',
        ask: '（桌上摆 4 个和 2 个两堆）哪一堆是 3 个？',
        hint: '（让他数一数每堆）',
        checks: ['能比较两堆数量', '不是只看哪堆大'],
      },
      {
        id: 'C8-t8',
        ask: '（不给手指提示，只说数）给我 4 个。',
        hint: '（说「4 个」，不伸手）',
        checks: ['纯语言线索能取对', '不依赖手指'],
      },
    ],
    familyGuide: {
      what: '练「知道 3 个是多少」，不是只会背数',
      prepare: '8–10 个完全一样的小物件 + 两个碗',
      start: '「给我 3 个。」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '伸手指 → 说「数一数」→ 手把手数一遍再拿',
      success: '10 次里 8 次数量正确',
      fallback: '从 2 以内开始，稳了再加 3、4、5；一次只加一个数',
      dose: '一次 10 个回合，5–6 分钟',
      avoid: '别让他每次都必须数出声，也别在他多拿一个时说「你数错了」',
    },
  },

  {
    id: 'C9',
    name: '大小长短比较',
    band: 'school',
    difficulty: 9,
    settings: ['desk', 'floor', 'outdoor'],
    modality: 'receptive',
    domain: '认知理解',
    summary: '听「拿大的」「哪个更长」就能选对，不被摆放方式骗到',
    standard2: '大小、长短、高矮三组比较 ≥8/10',
    onePenalty: '只看「离得远」或「放得高」来判断',
    sessionSuccess: '10 个回合里 ≥8 次选对',
    opener: '拿大的那个给我。',
    vbMapp: {
      operant: 'LRFFC 听者反应（比较）',
      level: 3,
      milestone: 'LRFFC L3 · 按相对属性选择',
      rationale:
        '「大」「长」是相对概念，同一件东西和不同的东西比，答案会变。这一条练的是「两两比较」而不是「记住某件东西大」，是抽象思维的第一道坎。',
      tag: 'LRFFC L3',
    },
    materials: [
      {
        key: 'pairSize',
        label: '同款但大小明显不同的两件（可再加第三件中等）',
        options: [
          { name: '大球和小球', note: '大小差别要一眼看得出' },
          { name: '大积木和小积木' },
          { name: '长铅笔和短铅笔', note: '测长短用' },
        ],
        fallback: '同款不同尺寸就行：大碗小碗、大熊小熊。别选「一看就是不同东西」的两件。',
      },
      {
        key: 'third',
        label: '第三件（做成三件排序）',
        options: [
          { name: '中等大小的同款' },
          { name: '更小的一件' },
        ],
        fallback: '没有第三件就只做两两比较，也够用。',
      },
    ],
    tasks: [
      {
        id: 'C9-t1',
        ask: '（{pairSize}两件摆开）拿大的给我。',
        hint: '（用手比一个大圈）大的。',
        checks: ['拿大的那件', '没有犹豫乱指'],
      },
      {
        id: 'C9-t2',
        ask: '（两件换位置）拿小的给我。',
        hint: '（手指并紧比一个小）小的。',
        checks: ['换位置仍正确', '大小概念不依赖位置'],
      },
      {
        id: 'C9-t3',
        ask: '（{third}加入，三件）把最大的给我。',
        hint: '（三件挨个摸一下，停在大的上）',
        checks: ['三件里选出最大', '不是只比两件'],
      },
      {
        id: 'C9-t4',
        ask: '（三件散开摆，距离拉开）把最小的给我。',
        hint: '（让他把三件排一排再比）',
        checks: ['距离不影响判断', '不被「放得远」骗'],
      },
      {
        id: 'C9-t5',
        ask: '（用长铅笔短铅笔）哪支更长？',
        hint: '（把两支一头对齐）',
        checks: ['一头对齐后能判断', '不是只看末端位置'],
      },
      {
        id: 'C9-t6',
        ask: '（把长的横放、短的竖放）哪支更长？',
        hint: '（把两支都竖起来比）',
        checks: ['摆放方向不影响', '能对齐后比较'],
      },
      {
        id: 'C9-t7',
        ask: '（把大门和小门、或者高瓶和矮瓶摆一起）哪个更高？',
        hint: '（手从底往上比）',
        checks: ['高度判断正确', '和「大」区分'],
      },
      {
        id: 'C9-t8',
        ask: '（同一件东西先和大的比、再和小的比）这个现在算大的还是小的？',
        hint: '（换一个参照物再问一次）',
        checks: ['理解「大」是相对的', '换参照物答案会变'],
      },
    ],
    familyGuide: {
      what: '练相对概念：大和小、长和短要看跟谁比',
      prepare: '同款不同尺寸的三件东西，外加一对长短不同的笔',
      start: '「拿大的给我。」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '比手势 → 把两件并排对齐 → 手把手比一次',
      success: '每组 10 次里 8 次正确',
      fallback: '先做两件比较，差别拉大；三件排序最后做',
      dose: '一次 10 个回合，5 分钟',
      avoid: '别把大的那件固定放在同一侧，也别用不同种类的东西比大小',
    },
  },

  {
    id: 'C10',
    name: '顺序排列',
    band: 'school',
    difficulty: 10,
    settings: ['desk', 'home'],
    settingDifficulty: { home: 8 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '把 3 张图按「先发生什么、后发生什么」排好，讲得出先后',
    standard2: '3 张图排序 ≥8/10，4 张图 ≥6/10',
    onePenalty: '能排对但说不清顺序；或只记住某一组的答案',
    sessionSuccess: '10 个回合里 ≥8 次排对 3 张图',
    opener: '哪个先发生？把它们按顺序排好。',
    vbMapp: {
      operant: 'VP-MTS / 序列概念',
      level: 3,
      milestone: 'VP-MTS L3 · 事件顺序排列',
      rationale:
        '排序要求同时握住「三个片段」和「它们的时间关系」，工作记忆负荷明显更高。它直接支撑讲一件事、复述经历这类叙事能力。',
      tag: 'VP-MTS L3',
    },
    materials: [
      {
        key: 'sequence',
        label: '一组 3 张的顺序图卡',
        options: [
          { name: '洗手三张', note: '开水龙头 → 搓肥皂 → 擦手，最直观' },
          { name: '吃东西三张', note: '拿水果 → 剥皮 → 吃' },
          { name: '画画三张', note: '拿笔 → 画 → 收笔' },
        ],
        fallback: '手机拍三张连续动作的照片也行：倒水、喝、放下。关键是有明确的先后。',
      },
      {
        key: 'sequence4',
        label: '一组 4 张的顺序图卡（进阶）',
        options: [
          { name: '起床四张' },
          { name: '做饭四张' },
        ],
        fallback: '没有四张就用三张做到稳，四张可以下个月再加。',
      },
    ],
    tasks: [
      {
        id: 'C10-t1',
        ask: '（{sequence}打乱摆开）看看这几张，哪个先发生？把它放最左边。',
        hint: '（指着第一张）这个是最开始。',
        checks: ['第一张放对', '不是随机放'],
      },
      {
        id: 'C10-t2',
        ask: '（第一张已就位）接下来是哪张？',
        hint: '（指中间位置）第二张。',
        checks: ['第二张放对', '能接着第一张想'],
      },
      {
        id: 'C10-t3',
        ask: '（剩最后一张）最后是哪张？',
        hint: '（指最右边）',
        checks: ['三张全排对', '没有来回换'],
      },
      {
        id: 'C10-t4',
        ask: '（重新打乱）这次全部自己排，从先到后。',
        hint: '（先问「最先做什么」再让他排）',
        checks: ['独立排对三张', '不需要逐张提示'],
      },
      {
        id: 'C10-t5',
        ask: '（排好后）说一说，先做什么，再做什么？',
        hint: '（示范一句「先…再…最后…」）',
        checks: ['能说出先后', '顺序和摆放一致'],
      },
      {
        id: 'C10-t6',
        ask: '（故意把两张顺序放反）这样对不对？哪里不对？',
        hint: '（指放反的两张）',
        checks: ['能发现顺序错误', '能说出该换哪张'],
      },
      {
        id: 'C10-t7',
        ask: '（换成{sequence4}）四张一起排，从先到后。',
        hint: '（先帮他找出第一张，剩下自己排）',
        checks: ['四张能排对 ≥3 张', '没有放弃'],
      },
      {
        id: 'C10-t8',
        ask: '（把图卡收起来，只用说的）早上起床以后，先做什么？',
        hint: '（提示「先穿衣服还是先刷牙」）',
        checks: ['不看图也能说出顺序', '说明是概念不是记图'],
      },
    ],
    familyGuide: {
      what: '练「先、再、最后」，这是讲一件事的骨架',
      prepare: '一组 3 张顺序图卡（自己拍三张照片也行）',
      start: '「哪个先发生？把它放最左边。」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '问「最先做什么」→ 指第一张 → 手把手排一次',
      success: '10 次里 8 次排对三张',
      fallback: '先只排两张（先/后），稳了再加第三张',
      dose: '一次 10 个回合，6 分钟',
      avoid: '别一边排一边替他说「然后呢」，也别用孩子没经历过的情境',
    },
  },

  {
    id: 'C11',
    name: '相同与不同',
    band: 'school',
    difficulty: 11,
    settings: ['desk', 'floor'],
    settingDifficulty: { floor: 12 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '能指出两样东西哪里一样、哪里不一样，也能挑出「不属于这一组」的那个',
    standard2: '两两比较 ≥8/10，三选一找不同 ≥7/10',
    onePenalty: '只会说「不一样」但说不出哪里不同',
    sessionSuccess: '10 个回合里 ≥8 次判断正确',
    opener: '这两个一样吗？哪里不一样？',
    vbMapp: {
      operant: 'LRFFC / 抽象比较',
      level: 3,
      milestone: 'LRFFC L3 · 相同与不同',
      rationale:
        '这是从「认识单个物品」跨到「比较两个物品」的关键一步，也是小学阶段找规律、做类比的底子。要求孩子同时抓住两个属性再比。',
      tag: 'LRFFC L3',
    },
    materials: [
      {
        key: 'sameItem',
        label: '一对「有同有异」的东西（同款不同色 / 同色不同物）',
        options: [
          { name: '红杯子和蓝杯子', note: '同形状不同色，最好讲' },
          { name: '两个球一大一小' },
          { name: '红苹果和红球', note: '同色不同物，难度高一点' },
        ],
        fallback: '关键是要「一部分一样、一部分不一样」，完全一样或完全不同的都不适合这一条。',
      },
      {
        key: 'oddOne',
        label: '一组三样，其中一个是「不属于」的',
        options: [
          { name: '两个水果 + 一辆车' },
          { name: '两只动物 + 一个杯子' },
          { name: '三件衣服里放一个勺子' },
        ],
        fallback: '同一组里三样，两样同类、一样跨类，别选近似容易混的组合。',
      },
    ],
    tasks: [
      {
        id: 'C11-t1',
        ask: '（{sameItem}摆开）这两个一样吗？',
        hint: '（把两件并排）看看，一样还是不一样？',
        checks: ['能说出一样/不一样', '判断正确'],
      },
      {
        id: 'C11-t2',
        ask: '哪里不一样？',
        hint: '（指颜色）这里不一样。',
        checks: ['能指出不同点', '不是只说「不一样」'],
      },
      {
        id: 'C11-t3',
        ask: '哪里是一样的？',
        hint: '（指形状/用途）这里一样。',
        checks: ['能指出相同点', '至少说出一处'],
      },
      {
        id: 'C11-t4',
        ask: '（换成完全相同的两件）这两个一样吗？',
        hint: '（把两件贴在一起看）',
        checks: ['能判断「完全一样」', '不会一律说不一样'],
      },
      {
        id: 'C11-t5',
        ask: '（{oddOne}三样摆开）哪一个和别的不一样？',
        hint: '（把两样同类的放一起）这两个是一伙的。',
        checks: ['能挑出不同类的那件', '不是随机指'],
      },
      {
        id: 'C11-t6',
        ask: '为什么它不一样？',
        hint: '（说类别）它们两个都是…，它不是。',
        checks: ['能说出理由', '理由和判断一致'],
      },
      {
        id: 'C11-t7',
        ask: '（三样里两样不同类，一样和目标同类）哪个和这个是一伙的？',
        hint: '（先说类别名）',
        checks: ['正向找同类也做得到', '和反向找不同都对'],
      },
      {
        id: 'C11-t8',
        ask: '（换一组）这一组里，哪个不该在这里？',
        hint: '（逐个问「它是什么」）',
        checks: ['换组仍能判断', '说明是概念不是记答案'],
      },
    ],
    familyGuide: {
      what: '练比较：同时看两样东西，找出哪里一样、哪里不一样',
      prepare: '一对「有同有异」的东西 + 一组「两同一异」的三样',
      start: '「这两个一样吗？」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '先问「一样的在哪里」→ 再问「不一样的在哪里」→ 示范一句完整回答',
      success: '10 次里 8 次判断正确，且能说出理由',
      fallback: '先只做「完全一样 / 完全不一样」的判断，再进「有同有异」',
      dose: '一次 10 个回合，6 分钟',
      avoid: '别替他总结「因为颜色不一样」，让他自己说出来',
    },
  },

  {
    id: 'C12',
    name: '因果与排除',
    band: 'school',
    difficulty: 12,
    settings: ['desk', 'home', 'outdoor'],
    settingDifficulty: { home: 10, outdoor: 12 },
    modality: 'receptive',
    domain: '认知理解',
    summary: '听「下雨了要带什么」「哪个不能吃」，能推出对的答案',
    standard2: '生活情境 10 组，3 选 1 ≥8/10',
    onePenalty: '靠猜；或只对某一个固定情境有反应',
    sessionSuccess: '10 个回合里 ≥8 次选对',
    opener: '下雨了，出门要带哪个？',
    vbMapp: {
      operant: 'LRFFC 高阶 / 推理',
      level: 3,
      milestone: 'LRFFC L3 · 情境推理与排除',
      rationale:
        '因果要求两步：先理解情境，再推出「因此需要什么」。这是认知链的顶端，也是日常生活自理最直接相关的一条——下雨带伞、手脏洗手，都靠它。',
      tag: 'LRFFC L3',
    },
    materials: [
      {
        key: 'scene',
        label: '一个生活情境（用说的，或用图卡）',
        options: [
          { name: '下雨了', note: '配雨伞 / 太阳帽 / 勺子' },
          { name: '手很脏', note: '配毛巾 / 铅笔 / 杯子' },
          { name: '肚子饿了', note: '配面包 / 枕头 / 雨伞' },
          { name: '天很冷', note: '配外套 / 扇子 / 冰水' },
        ],
        fallback: '用孩子每天真实经历的情境最有效：出门、洗手、吃饭、睡觉。别用他没经历过的场景。',
      },
      {
        key: 'candidates',
        label: '三个候选（一个对、两个明显不对）',
        options: [
          { name: '日常物品三件', note: '从现场随手拿三件，其中一件对' },
          { name: '图片三张' },
        ],
        fallback: '候选不必精致，从桌上随手拿三样就行，关键是只有一件说得通。',
      },
    ],
    tasks: [
      {
        id: 'C12-t1',
        ask: '（{scene}，摆出{candidates}）这种情况，要用哪个？',
        hint: '（把情境说具体一点）下雨了，头上要挡什么？',
        checks: ['选出说得通的那件', '不是随机指'],
      },
      {
        id: 'C12-t2',
        ask: '为什么是它？',
        hint: '（说「因为…所以…」开头）',
        checks: ['能说出因果', '理由和选择一致'],
      },
      {
        id: 'C12-t3',
        ask: '（同一情境，问反面）哪个不能用？',
        hint: '（指一个明显不合适的）这个行吗？',
        checks: ['能判断不合适的那件', '不只是会选对的'],
      },
      {
        id: 'C12-t4',
        ask: '（换一个情境）{scene}的话，用哪个？',
        hint: '（把情境再描述一遍）',
        checks: ['换情境仍能推', '不是只记住一个答案'],
      },
      {
        id: 'C12-t5',
        ask: '（三件里两件都「勉强能用」，一件最合适）哪个最合适？',
        hint: '（问「哪个更好用」）',
        checks: ['能挑出最合适的', '不是只排除明显错的'],
      },
      {
        id: 'C12-t6',
        ask: '（先说结果，问原因）衣服湿了，可能是怎么了？',
        hint: '（提示「是不是下雨了」）',
        checks: ['能从结果反推原因', '理由合理'],
      },
      {
        id: 'C12-t7',
        ask: '（给一个「不可能」的选项）这个可以吗？为什么不行？',
        hint: '（把选项和情境对照说一遍）',
        checks: ['能说清为什么不行', '不是只说不行'],
      },
      {
        id: 'C12-t8',
        ask: '（换成孩子自己经历过的情境）你上次…的时候，用了什么？',
        hint: '（提示他自己的经历）',
        checks: ['能联系自身经验', '回答和情境匹配'],
      },
    ],
    familyGuide: {
      what: '练「因为…所以…」，日常生活自理最用得上的推理',
      prepare: '一个孩子熟悉的情境 + 三件候选物品（一件合适）',
      start: '「下雨了，出门要带哪个？」说完等 3 秒',
      wait: WAIT_THREE_SECONDS,
      prompts: '把情境说具体 → 指一下合适的 → 示范一句「因为…所以…」',
      success: '10 次里 8 次选对，且能说出理由',
      fallback: '退回功能理解（C6），或者把候选减到两件',
      dose: '一次 10 个回合，6 分钟',
      avoid: '别问「你觉得呢」这种开放问题，也别在他答错时直接说答案',
    },
  },
];

/** 认知的学段划分沿用同一套年龄带，只是领域标签不同 */
export const COGNITION_STAGES: ExpressionStage[] = [
  { band: 'infant', code: 'B', ageLabel: '0-3 岁', domainLabel: '认知理解', rank: 0 },
  { band: 'preschool', code: 'G', ageLabel: '3-6 岁', domainLabel: '认知理解', rank: 1 },
  { band: 'school', code: 'K', ageLabel: '6-12 岁', domainLabel: '认知理解', rank: 2 },
];

function cognitionStageOf(band: ExpressionBand): ExpressionStage {
  return COGNITION_STAGES.find((s) => s.band === band) ?? COGNITION_STAGES[1];
}

/** 界面顺序：先学段，学段内由易到难 */
export const COGNITION_TARGETS_BY_STAGE: ExpressionTarget[] = COGNITION_TARGETS.slice().sort(
  (a, b) => cognitionStageOf(a.band).rank - cognitionStageOf(b.band).rank || a.difficulty - b.difficulty,
);

export function cognitionStageGroups(only: ExpressionBand | 'all' = 'all'): ExpressionStageGroup[] {
  return COGNITION_STAGES.filter((s) => only === 'all' || s.band === only)
    .map((stage) => ({
      stage,
      targets: COGNITION_TARGETS_BY_STAGE.filter((t) => t.band === stage.band),
    }))
    .filter((g) => g.targets.length > 0);
}

/** 建议下一个练的目标：学段最靠前、学段内最容易、还没稳定的那个 */
export function suggestNextCognition(stableIds: string[]): ExpressionTarget | undefined {
  return COGNITION_TARGETS_BY_STAGE.find((t) => !stableIds.includes(t.id));
}

export function getCognitionTarget(id: string | undefined): ExpressionTarget | undefined {
  if (!id) return undefined;
  return COGNITION_TARGETS.find((t) => t.id === id);
}

