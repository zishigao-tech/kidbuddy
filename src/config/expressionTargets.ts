/**
 * 语言表达练习 · 目标库
 *
 * 编号与判定标准逐条对齐 skill「课堂记录量化工具」的 references/goal-codes.md：
 * - B 段（0-3 岁 · 语言沟通）：B5 首个有意义的词
 * - G 段（3-6 岁 · 语言沟通）：G1 词汇、G2 句长、G3 两步指令、G4 提问与回答、G5 语用
 * - K 段（6-12 岁 · 语言表达）：K1 说清一件事、K2 明确拒绝与索回、K3 主动求助、
 *   K4 复述口头通知、K5 电话/当面说清三要素
 *
 * 编号含义固定，不得临时发明；standard2 / onePenalty 保持 skill 原文口径，
 * 改了统计会错位。跨龄个案按「实际教学目标所在段」取码，不按年龄取码。
 *
 * 排列依据：**编号即台阶**。代码表本身按年龄段分段（B → G → K），段内编号就是
 * 教学先后：G1 词汇 → G2 句长 → G3 两步指令 → G4 问答 → G5 语用；
 * K1 叙事 → K2 拒绝 → K3 求助 → K4 复述 → K5 电话。
 * difficulty 直接等于这个顺序（1-11），所以卡片上的圆圈数字和目标编号的尾号
 * 同向递增，不会出现「④ K2 排在 ⑧ K1 前面」这种看着别扭的情况。
 *
 * 注意 G3 是听者反应（Listener），不是表达：它练「听懂并执行」，本身不要求开口。
 * 放在这里是因为它是 G4 问答和 K1 叙述的前置——听不懂带顺序的指令，就讲不清顺序。
 *
 * 与 VB-MAPP 的关系（Sundberg）：B5 是 Mand 请求起点，G1 是 Tact 命名起点，
 * G2 是语言结构，G3 是 Listener 双成分指令，G4 是 Intraverbal，K2/K3 是功能性 Mand。
 * VB-MAPP 的语言操作获得顺序（Mand → Tact → 语言结构 → 功能性 Mand → 社会语用 →
 * Intraverbal）与这套编号在段内是一致的，差异只出现在跨段：同一功能在 G 段是简版、
 * 在 K 段是难版。
 *
 * 对 ASD 与发育迟缓孩子的意义：
 * 1. 先建立「说话有用」——请求的动机就在眼前，比命名和问答都容易起量；
 * 2. 词汇是句子的材料，命名没铺开就上句长，只会练出仿说；
 * 3. Intraverbal（对话）没有实物可指，难度最高，必须排在命名之后；
 * 4. 带记忆负荷的复述、没有表情可用的电话，放在最后。
 */

export type ExpressionBand = 'infant' | 'preschool' | 'school';

/**
 * 沟通通道：
 * - receptive 听者反应——听懂并做动作，不要求开口（如 G3 两步指令）
 * - expressive 表达——要把话说出来
 * 界面上分别显示「听」「说」两个标记，避免把听指令的目标当成开口目标去判分。
 */
export type ExpressionModality = 'receptive' | 'expressive';

export const MODALITY_LABEL: Record<ExpressionModality, string> = {
  receptive: '听',
  expressive: '说',
};

/** 听者反应类目标：判分看动作对不对，不看说没说 */
export function isReceptive(target: { modality: ExpressionModality }): boolean {
  return target.modality === 'receptive';
}

/**
 * 教具槽位：题干里的 `{key}` 换成老师实际拿在手上的东西。
 *
 * 为什么要这么绕一层——教室里不一定有「泡泡水」「三格图片故事」，
 * 把具体物品写死在题干里，老师只能照念一件不存在的东西，或者现场改词，
 * 一改就冒出歧义（改成「摇铃」还是「小鼓」？孩子要说的词也跟着变）。
 * 所以题干只写「把{容器}举到他面前」，具体是饼干罐还是泡泡水，上课前选一次，
 * 全课题干自动替换，记录里也存下这次实际用的教具，方便不同老师之间横向比较。
 */
export interface MaterialOption {
  /** 实际拿在手上的东西 */
  name: string;
  /** 孩子要说出的词。和 name 不一样时填，如 name「泡泡水」而 word「泡泡」；不填就用 name */
  word?: string;
  /** 一组两样东西时拆开写，供 {key.1} / {key.2} 引用，如「杯子和积木」→ ['杯子','积木'] */
  parts?: string[];
  /** 一句话说明它为什么合适，选的时候看 */
  note?: string;
}

export interface MaterialSlot {
  /** 占位键，题干里写成 {key}；要孩子说的词写 {key.word}，一组里的第 n 样写 {key.n} */
  key: string;
  /** 这类教具在课里扮演什么角色 */
  label: string;
  /** 候选，至少 2 个，第 1 个是默认 */
  options: MaterialOption[];
  /** 一样都没有时的兜底办法 */
  fallback: string;
}

export interface ExpressionTask {
  id: string;
  /** 伙伴对孩子念的题干，照念，不加话；可含 {slotKey} 占位 */
  ask: string;
  /** 孩子卡住时给的提示句；同样支持 {slotKey} */
  hint: string;
  /** 判定提示项：人工勾选，不做自动计分 */
  checks: string[];
}

/** 槽位里出现过的所有占位键（含 {key.word} / {key.1} 形式），用于校验题干有没有引用不存在的教具 */
export function placeholderKeys(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\{([a-zA-Z][\w]*)(?:\.[\w]+)?\}/g), (m) => m[1])));
}

/** 默认选择：每个槽位取第一项；已有选择优先，避免刷新后跳回默认 */
export function resolvePicks(materials: MaterialSlot[], picks: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slot of materials) {
    const chosen = picks[slot.key];
    out[slot.key] = slot.options.some((o) => o.name === chosen) ? chosen : (slot.options[0]?.name ?? '');
  }
  return out;
}

/**
 * 把题干里的占位换成实际教具：
 *   {key}        整串，如「杯子和积木」
 *   {key.word}   孩子要说出的词，如「泡泡」
 *   {key.1}      一组里的第 n 样，如「杯子」
 * 没定义的占位原样留着，方便测试和现场排查。
 */
export function fillSlots(text: string, materials: MaterialSlot[], picks: Record<string, string> = {}): string {
  const chosen = resolvePicks(materials, picks);
  return text.replace(/\{([a-zA-Z][\w]*)(?:\.([\w]+))?\}/g, (whole, key: string, part?: string) => {
    const slot = materials.find((s) => s.key === key);
    if (!slot) return whole;
    const option = slot.options.find((o) => o.name === chosen[key]) ?? slot.options[0];
    if (!option) return whole;
    if (!part) return chosen[key];
    if (part === 'word') return option.word ?? option.name;
    const index = Number(part);
    if (Number.isInteger(index) && index >= 1) return option.parts?.[index - 1] ?? option.name;
    return whole;
  });
}

/** 这节课一句「教具清单」，进记录和导出用 */
export function materialLine(materials: MaterialSlot[], picks: Record<string, string> = {}): string {
  if (materials.length === 0) return '无需特意准备教具，用现场现成的';
  const chosen = resolvePicks(materials, picks);
  return materials.map((slot) => `${slot.label}：${chosen[slot.key]}`).join('；');
}

/** 一节课默认抽几道题：每个目标有 8 道，全练一遍会拖太长 */
export const SESSION_TASK_COUNT = 4;

/**
 * 从题库里抽出这一节课要练的题。
 *
 * 顺序不是随机，而是按「多久没练过」：
 * 从没练过的最优先 → 越早练过的越靠前 → 最近练过的排最后。
 * 抽完仍按题库原顺序返回（题库本身由易到难），所以同一目标连着上几次课，
 * 题会自然轮换，不会每次都撞同样那 4 道，也不会一上来就抽到最难的那道。
 */
export function pickSessionTasks(
  tasks: ExpressionTask[],
  count: number = SESSION_TASK_COUNT,
  history: string[] = [],
): ExpressionTask[] {
  if (tasks.length <= count) return tasks;
  const lastUsed = new Map<string, number>();
  history.forEach((id, i) => lastUsed.set(id, i));
  const order = new Map(tasks.map((t, i) => [t.id, i]));
  const rank = (id: string): number => (lastUsed.has(id) ? (lastUsed.get(id) as number) : -1);
  const ranked = [...tasks].sort((a, b) => {
    const ra = rank(a.id);
    const rb = rank(b.id);
    if (ra !== rb) return ra - rb;
    // 都没练过时按题库原顺序取，不能按 id 字符串排——否则 t10 会排到 t2 前面
    return (order.get(a.id) as number) - (order.get(b.id) as number);
  });
  const chosen = new Set(ranked.slice(0, count).map((t) => t.id));
  return tasks.filter((t) => chosen.has(t.id));
}

/** 记下这次练了哪几道：越靠后越新；只留最近 keep 条，避免无限长 */
export function recordTaskUsage(history: string[], usedIds: string[], keep = 24): string[] {
  const used = new Set(usedIds);
  const rest = history.filter((id) => !used.has(id));
  return [...rest, ...usedIds].slice(-keep);
}


export interface ExpressionFamilyGuide {
  /** 练什么 */
  what: string;
  /** 准备什么 */
  prepare: string;
  /** 怎么开始（照念的那一句） */
  start: string;
  /** 等几秒 */
  wait: string;
  /** 提示顺序 */
  prompts: string;
  /** 算成功的标准 */
  success: string;
  /** 做不到怎么降级 */
  fallback: string;
  /** 时长与频次 */
  dose: string;
  /** 这三件先别做 */
  avoid: string;
}

/** VB-MAPP 对应关系：给老师看，也给家长一个「为什么现在练这个」的解释 */
export interface VbMappRef {
  /** 语言操作类别：Mand 请求 / Tact 命名 / Linguistic 语言结构 / Intraverbal 对话 等 */
  operant: string;
  /** VB-MAPP 阶段：1 = 0-18 个月，2 = 18-30 个月，3 = 30-48 个月 */
  level: 1 | 2 | 3;
  /** 对应里程碑（写区间，不写单条，避免学期内口径变动） */
  milestone: string;
  /** 为什么这一条对 ASD / 发育迟缓的孩子排在这个位置 */
  rationale: string;
  /** 卡片上的短标签，如「Mand L1」 */
  tag: string;
}

/**
 * 训练场景：同一个目标可以在多个场景下练。
 * 老师和家长共用这一套标签，不给两端各维护一份。
 */
export type SettingId = 'desk' | 'floor' | 'home' | 'outdoor';

export interface SettingMeta {
  id: SettingId;
  label: string;
  emoji: string;
  /** 一句话判断口诀，给家长看 */
  hint: string;
}

export const SETTINGS: SettingMeta[] = [
  { id: 'desk', label: '桌面', emoji: '🪑', hint: '能坐下来慢慢教的，先放桌面' },
  { id: 'floor', label: '地面', emoji: '🧸', hint: '要动起来、要钻要爬的，放地面' },
  { id: 'home', label: '居家', emoji: '🏠', hint: '能在生活里顺手做的，放居家' },
  { id: 'outdoor', label: '户外', emoji: '🌳', hint: '要检验「换个地方还会不会」的，放户外' },
];

export function isSettingId(value: unknown): value is SettingId {
  return SETTINGS.some((s) => s.id === value);
}

export function settingMeta(id: SettingId): SettingMeta {
  return SETTINGS.find((s) => s.id === id) ?? SETTINGS[0];
}

export interface ExpressionTarget {
  id: string;
  name: string;
  band: ExpressionBand;
  /**
   * 由易到难的练习台阶，1 = 最容易。数字必须连续、不跳号。
   * 排序口径：VB-MAPP 语言操作获得顺序（请求 → 命名 → 句长 → 拒绝/求助 →
   * 语用 → 问答 → 叙述 → 复述 → 转述）。
   */
  difficulty: number;
  /**
   * 这个目标能在哪些训练场景下练，首元素 = 主场景（列表标签和默认排序用它）。
   * 一个目标可以出现在多个场景下——比如「C6 功能理解」主场景是居家，桌面上也能做。
   */
  settings: SettingId[];
  /**
   * 某个场景下的难度覆盖，没写的场景沿用 difficulty。
   * 口径和台阶一致：越小越容易。同一目标在不同场景难度可以差很多
   * （方位理解在地面比在桌面容易），所以列表按场景筛选后要按这个排。
   */
  settingDifficulty?: Partial<Record<SettingId, number>>;
  /** 听 / 说：听者反应类目标只看动作对不对，不要求开口 */
  modality: ExpressionModality;
  /** 五领域归类，用于统计；认知理解模块也复用这个结构 */
  domain: '语言沟通' | '语言表达' | '认知理解';
  /** 一句话说清练什么，给孩子和家长看 */
  summary: string;
  /** 2 分标准（skill 原文口径，学期目标） */
  standard2: string;
  /** 常见 1 分情形 */
  onePenalty: string;
  /** 本次课的达标线：DTT 一次练习里看这个，不要拿学期口径判一节课 */
  sessionSuccess: string;
  /** 伙伴开场白 */
  opener: string;
  vbMapp: VbMappRef;
  /** 这节课要用的教具槽位，题干里用 {key} 引用；一道都不用备时给空数组 */
  materials: MaterialSlot[];
  tasks: ExpressionTask[];
  familyGuide: ExpressionFamilyGuide;
}

/** 目标在某个场景下的难度：有覆盖用覆盖，没覆盖就退回全表台阶 */
export function sceneDifficulty(target: ExpressionTarget, scene: SettingId): number {
  return target.settingDifficulty?.[scene] ?? target.difficulty;
}

/** 目标能不能在这个场景下练 */
export function fitsScene(target: ExpressionTarget, scene: SettingId): boolean {
  return target.settings.includes(scene);
}

/** 是不是这个场景的主场（主场排在前面，备选的折叠在下面） */
export function isPrimaryScene(target: ExpressionTarget, scene: SettingId): boolean {
  return target.settings[0] === scene;
}

/**
 * 3 秒等待窗，和 DTT 的 DTT_WAIT_MS 保持一致。
 * ASD 孩子等待耐受更短，5 秒容易变成「走神」而不是「思考」。
 */
const WAIT_THREE_SECONDS =
  '等 3 秒。这 3 秒里不重复问题、不替他接话、不改成二选一、不说「你想想呀」、不用手指。他看你的时候，你就看着他，不点头也不出声。';

export const EXPRESSION_TARGETS: ExpressionTarget[] = [
  {
    id: 'B5',
    name: '开口要东西',
    band: 'infant',
    difficulty: 1,
    settings: ['home', 'desk', 'outdoor'],
    settingDifficulty: { desk: 2, home: 1, outdoor: 4 },
    modality: 'expressive',
    domain: '语言沟通',
    summary: '想要的东西在眼前，用词说出来，不用伸手、不用哭',
    standard2: '在需要时主动说出 ≥1 个稳定的词（同一情境 3 次以上）',
    onePenalty: '仿说但不主动用；词义不稳定',
    sessionSuccess: '10 个回合里 ≥8 次自己说出目标词（构音不准也算）',
    opener: '想要什么，就说给我听。你说了，我就给你。',
    vbMapp: {
      operant: 'Mand 请求',
      level: 1,
      milestone: 'Mand L1 · 第 1–5 里程碑（2 → 10 个不同请求）',
      rationale:
        '请求的动机就在眼前，是所有语言操作里最容易建立的。ASD 和发育迟缓的孩子常先学会拉手、指、哭来要东西，先把「说话」变成最省力的方式，后面的命名和对话才有地基。',
      tag: 'Mand L1',
    },
    materials: [
      {
        key: 'item',
        label: '他这会儿最想要的那样东西',
        options: [
          { name: '泡泡水', word: '泡泡', note: '吹的、看得见拿不到，动机最稳' },
          { name: '饼干罐', word: '饼干', note: '拧紧的透明罐，最容易做出「必须开口」的情境' },
          { name: '小汽车', word: '车', note: '放高处，够不到' },
          { name: '气球', word: '气球', note: '吹到一半停住，他一定会要' },
        ],
        fallback: '用他此刻真的想要的那样东西就行，吃的玩的都可以；实在没有，就把他正在玩的玩具拿在手里、举高，不给他。',
      },
      {
        key: 'toy',
        label: '能玩起来的一样玩具（t6 / t7）',
        options: [
          { name: '秋千', word: '秋千', note: '推几下停住，动机最强' },
          { name: '小汽车', word: '车', note: '推着跑，停住就要' },
          { name: '泡泡水', word: '泡泡', note: '吹两下停住' },
        ],
        fallback: '任何能「玩到一半停下来」的东西都行，关键是他玩得正起劲时你停手。',
      },
    ],
    tasks: [
      {
        id: 'B5-t1',
        ask: '（把{item}举到他面前，他拿不到，看着他，不说话）',
        hint: '「{item.word}」',
        checks: ['自己说出「{item.word}」', '没有伸手来抢', '说完看着你等回应'],
      },
      {
        id: 'B5-t2',
        ask: '（把{item}放进他看得见、但自己打不开的容器里，放在他面前）',
        hint: '「{item.word}」',
        checks: ['说出「{item.word}」', '不是只说「这个」「那个」', '说完等你打开'],
      },
      {
        id: 'B5-t3',
        ask: '（把{item}放到他够不到的高处）',
        hint: '「{item.word}」',
        checks: ['说出「{item.word}」', '看向目标物', '没有拉你的手去够'],
      },
      {
        id: 'B5-t4',
        ask: '（张开手臂站在他面前，等他说）',
        hint: '「抱抱」',
        checks: ['说出「抱抱」或「举高」', '主动靠近你', '说完伸手要抱'],
      },
      {
        id: 'B5-t5',
        ask: '（吃点心时间：把{item}放在桌上，只给他空碗和勺子）',
        hint: '「{item.word}」',
        checks: ['说出「{item.word}」', '没有直接用手抓', '说完看你一眼'],
      },
      {
        id: 'B5-t6',
        ask: '（推{toy}玩几下，然后停住不动，手扶着等他）',
        hint: '「还要」',
        checks: ['说出「还要」或「{toy.word}」', '没有自己动手推', '说完等你继续'],
      },
      {
        id: 'B5-t7',
        ask: '（他正伸手要{toy}，你把手挡在前面，不给也不说话）',
        hint: '「给我」',
        checks: ['说出「给我」或「{toy.word}」', '没有推开你的手', '说完看着你'],
      },
      {
        id: 'B5-t8',
        ask: '（出门前站在门口，手放在门把上，不开门，等他说）',
        hint: '「开门」',
        checks: ['说出「开门」或「走」', '没有自己拧门把', '说完看着你'],
      },
    ],
    familyGuide: {
      what: '练「用词换东西」。只要他开口就马上给，不要求说得完整、说得好听。',
      prepare:
        '选 3-5 样他真喜欢的东西（吃的、玩的），放进透明罐或高架子，让他看得见、拿不到。桌面其他东西全收走，只留这一次的目标物。',
      start: '举着东西不说话，等他。不要问「要不要」，不要晃给他看。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 给首字「{item.word}」的第一个音 → ② 完整示范「{item.word}」再等 3 秒 → ③ 手把手带他说一次。哪一级成功，下一次退回上一级；辅助只用来开头，不要一直给。',
      success: '10 个回合里 ≥8 次他自己说出目标词（构音不准也算）。到这个程度告诉老师。',
      fallback:
        '只留一样最强动机的东西，一次只练这一个词；出不了词就先接住任何声音（嗯、啊都算），再慢慢塑形。',
      dose: '一天 5-8 分钟，拆成 5-8 个自然时机，不要一口气连做 20 个回合。',
      avoid: '① 他一伸手你就给（说话就没必要了）　② 说「说对了才给」把请求变成考试　③ 一次换太多东西，前一个词还没稳就加新的',
    },
  },
  {
    id: 'G1',
    name: '看见就说',
    band: 'preschool',
    difficulty: 2,
    settings: ['home', 'desk', 'outdoor'],
    settingDifficulty: { desk: 2, home: 1, outdoor: 4 },
    modality: 'expressive',
    domain: '语言沟通',
    summary: '看到实物或图片，能说出它的名称',
    standard2: '常见名词、动词、形容词总量 ≥200，且能主动使用 ≥150',
    onePenalty: '认识但不说；总量 100-200',
    sessionSuccess: '10 张卡里 ≥8 张自己说出，换顺序还能说',
    opener: '你看，这是小狗。你也说说看。',
    vbMapp: {
      operant: 'Tact 命名',
      level: 1,
      milestone: 'Tact L1 · 第 1–5 里程碑（命名 2 → 10 个物品）',
      rationale:
        '命名和请求共用同一批词，但动机不同：命名是「看到就说」，没有东西可要。词汇量是后面所有句子的材料，ASD 孩子尤其需要大量、能泛化的命名练习。',
      tag: 'Tact L1',
    },
    materials: [
      {
        key: 'objects',
        label: '他认识的 3 样实物',
        options: [
          { name: '杯子、球、小车', note: '最常用的一组，名称稳定、不易说错' },
          { name: '碗、勺、毛巾', note: '生活自理类，家里一定有' },
          { name: '苹果、香蕉、饼干', note: '吃的动机强，但容易变成「要东西」而不是「命名」' },
        ],
        fallback: '拿手边三样他一定认识的东西就行，名称最好都是两个字。',
      },
      {
        key: 'cards',
        label: '一组同类图片卡（10 张）',
        options: [
          { name: '动物卡' },
          { name: '水果卡' },
          { name: '日常用品卡' },
        ],
        fallback: '没有卡片就用手机相册里的照片，或者把实物摆一排、一块布盖着，一张一张露出来。',
      },
      {
        key: 'actions',
        label: '动作图片',
        options: [
          { name: '喝水、跑、睡觉' },
          { name: '洗手、吃饭、跳' },
        ],
        fallback: '没有动作图就真人做动作让他说，或者拍他平时做这几件事的照片。',
      },
      {
        key: 'food',
        label: '一样他爱吃、能切开的东西（t5）',
        options: [
          { name: '苹果', note: '最常见，切一片举起来问' },
          { name: '香蕉' },
          { name: '西瓜' },
        ],
        fallback: '用他正在吃的那样东西就行；切不开的（饼干、葡萄）直接举起来也一样。',
      },
      {
        key: 'color',
        label: '一组颜色分明的积木或卡片（t8）',
        options: [
          { name: '红黄蓝积木', note: '三原色最不容易混' },
          { name: '红黄蓝绿卡片' },
        ],
        fallback: '衣服、玩具、餐具上都有颜色，指着他自己的东西问也一样。',
      },
    ],
    tasks: [
      {
        id: 'G1-t1',
        ask: '（桌上放 3 样他认识的实物：{objects}。你指一样，等他说）',
        hint: '说出你指的那样东西的名字，一次只说一个',
        checks: ['3 样里 ≥2 样独立说出', '说出的是名称，不是「这个」', '不用等提示'],
      },
      {
        id: 'G1-t2',
        ask: '（摆 10 张{cards}，一张一张举起来）',
        hint: '说出举起来的这一张是什么',
        checks: ['≥8 张独立说出', '打乱顺序也能说', '没有一张重复问'],
      },
      {
        id: 'G1-t3',
        ask: '（出示动作图片：{actions}）',
        hint: '「他在做什么」',
        checks: ['说出动作词', '能带上谁在做', '≥2 张独立说出'],
      },
      {
        id: 'G1-t4',
        ask: '（走到窗边或玩具架前，指给他看）',
        hint: '「那是大树」',
        checks: ['在自然情境里主动说', '不是只在桌面卡上说', '一次活动里 ≥3 次'],
      },
      {
        id: 'G1-t5',
        ask: '（切水果时举起一片{food}）你看，这是什么？',
        hint: '「这是{food}」',
        checks: ['说出名称', '不是在说「要吃」', '≥2 次独立说出'],
      },
      {
        id: 'G1-t6',
        ask: '（在教室里走一圈，指门、窗、桌子、灯，一个一个问）',
        hint: '「这是门」',
        checks: ['≥3 样说对', '说的是名称不是「这个」', '换地方还能说'],
      },
      {
        id: 'G1-t7',
        ask: '（指着自己的身体部位问：这是什么？）',
        hint: '「这是鼻子」',
        checks: ['≥3 个部位说对', '指哪说哪', '不用提示'],
      },
      {
        id: 'G1-t8',
        ask: '（出示{color}的积木或卡片）这是什么颜色？',
        hint: '「红色的」',
        checks: ['≥3 个颜色说对', '不混着说「那个颜色」', '换东西还能说对'],
      },
    ],
    familyGuide: {
      what: '练「看见就说名字」。不是考他，是你在旁边不停地说，让他跟着说。',
      prepare: '10 张一组图片卡（同一类，比如动物），再配 3 样实物；桌面只留这一组，别的一概收走。',
      start: '拿起一张，说「你看，小狗。」然后停住，看他 3 秒。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 说首字「小…」→ ② 完整说一遍让他仿说 → ③ 手把手或口型辅助。仿说成功也算一次，但要马上退到上一级。',
      success: '10 张里 ≥8 张他自己说出；同一组换顺序还能说；换个人问也能说。',
      fallback: '从 3 张开始，只练这 3 张；还不行就只练 1 张，一天练 10 遍，练熟了再添第二张。',
      dose: '一天 5-8 分钟，一组 10 张过 2 遍。',
      avoid: '① 连问「这是什么」十遍，变成考试　② 纠正发音（「是狗狗不是斗斗」）　③ 旧卡还没稳就换新一批',
    },
  },
  {
    id: 'G2',
    name: '把词连成句',
    band: 'preschool',
    difficulty: 3,
    settings: ['desk', 'home', 'floor'],
    modality: 'expressive',
    domain: '语言沟通',
    summary: '把两个词连成三个词以上的一句话',
    standard2: '自发说出三词以上简单句 ≥5 次/次观察',
    onePenalty: '以双词句为主；需仿说',
    sessionSuccess: '10 个来回里 ≥5 次自己说出三词以上',
    opener: '我说短的，你把它说长一点。',
    vbMapp: {
      operant: 'Linguistic 语言结构',
      level: 2,
      milestone: 'L2 · 双词到三词组合（前置是 Tact L2 的双词组合）',
      rationale:
        '句长是语言结构的门槛。发育迟缓的孩子常停在双词句，需要成人给出「多一个词」的支架；只说「说长一点」他听不懂，要直接给那一两个词的形状。',
      tag: 'Linguistic L2',
    },
    materials: [
      {
        key: 'pair',
        label: '两样颜色不同的东西',
        options: [
          { name: '红车和蓝球', note: '颜色对比强，先说颜色最顺' },
          { name: '红积木和蓝杯子', note: '形状不同，逼他先说颜色而不是先说形状' },
          { name: '黄香蕉和绿苹果', note: '吃的，动机强' },
        ],
        fallback: '随便找两样颜色明显不一样的东西，只要颜色是他已经会说的词。',
      },
      {
        key: 'action',
        label: '当场做的动作',
        options: [
          { name: '喝水' },
          { name: '拍手' },
          { name: '洗手' },
        ],
        fallback: '你自己做动作就行，不需要任何道具；做慢一点、做大一点。',
      },
      {
        key: 'toy',
        label: '一只他认识的玩偶或小物件',
        options: [
          { name: '小熊' },
          { name: '小汽车' },
          { name: '杯子' },
        ],
        fallback: '拿任何一件他能叫出名字的东西都可以，位置词换成「桌子上面／椅子旁边」照样练。',
      },
      {
        key: 'sizePair',
        label: '大小或长短差很多的两样东西（t5）',
        options: [
          { name: '大球和小球', note: '差别够大，一眼能看出' },
          { name: '长铅笔和短铅笔' },
          { name: '大熊和小熊' },
        ],
        fallback: '任何两个大小差别明显的东西都行；没有就用两只手比「大／小」。',
      },
      {
        key: 'eventPic',
        label: '一张有人在做事的图（t6）',
        options: [
          { name: '阿姨做饭的图' },
          { name: '小朋友洗手的图' },
          { name: '叔叔开车的图' },
        ],
        fallback: '真人做动作也行：你在旁边扫地、擦桌子，让他说「老师在扫地」。',
      },
    ],
    tasks: [
      {
        id: 'G2-t1',
        ask: '（桌上放{pair}）你看这个，说成一句话：什么颜色的什么。',
        hint: '「红色的车」',
        checks: ['说出物品', '加上颜色或大小', '合成三词以上'],
      },
      {
        id: 'G2-t2',
        ask: '（做一个动作：{action}）说一句话，谁在做什么。',
        hint: '「宝宝在{action}」',
        checks: ['有主语', '有动作词', '三词以上'],
      },
      {
        id: 'G2-t3',
        ask: '（把{toy}放到桌子下面）{toy}在哪里？说成一句话。',
        hint: '「{toy}在桌子下面」',
        checks: ['说清位置', '用上「在」', '三词以上'],
      },
      {
        id: 'G2-t4',
        ask: '（回放刚才玩过的活动）刚才我们做了什么？说一句。',
        hint: '「我和老师玩小汽车」',
        checks: ['说出事件', '有对象', '三词以上'],
      },
      {
        id: 'G2-t5',
        ask: '（拿出{sizePair}）这两个比一比，说成一句话：什么样的什么。',
        hint: '「大球和小球」',
        checks: ['说出大小或长短', '带上物品名', '三词以上'],
      },
      {
        id: 'G2-t6',
        ask: '（出示一张有人在做事的图）说一句话：谁在做什么。',
        hint: '「阿姨在做饭」',
        checks: ['有主语', '有动作', '三词以上'],
      },
      {
        id: 'G2-t7',
        ask: '（把{toy}放进盒子，再拿出来）说一句话：{toy}在哪儿？',
        hint: '「{toy}在盒子里面」',
        checks: ['用上「在」', '说清里外', '三词以上'],
      },
      {
        id: 'G2-t8',
        ask: '（吃完点心后问）刚才你吃了什么？说一句完整的。',
        hint: '「我吃了饼干」',
        checks: ['有「我」', '说出食物名', '三词以上'],
      },
    ],
    familyGuide: {
      what: '在他已经会说的词上加一个词。不要求语法完整，不纠正顺序。',
      prepare: '只用他 100% 会说名字的 3 样东西；桌上别的都收走，减少分心。',
      start: '照这句说：「你说，这是什么颜色的什么？」说完就把嘴闭上。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 说前半句「这是小汽…」留最后一个词给他 → ② 二选一「是红色的还是蓝色的？」 → ③ 你说完整句让他仿说。哪一级做到了，下一次退回上一级。',
      success: '10 个来回里 ≥5 次他自己说出三词以上的句子，中间不用你提示。',
      fallback: '先只加颜色（「红车」），做顺了再加位置或量词；还不行就退回两词句，只要求多一个字。',
      dose: '一天 8-10 分钟 1 次。他开始东张西望或走开就停，不加练。',
      avoid: '① 替他把句子说完　② 他说「车」你回「不对，要说红汽车」　③ 同一句问第二遍',
    },
  },
  {
    id: 'G3',
    name: '听两步指令',
    band: 'preschool',
    difficulty: 4,
    settings: ['floor', 'desk', 'home', 'outdoor'],
    settingDifficulty: { desk: 4, floor: 3, home: 3, outdoor: 5 },
    modality: 'receptive',
    domain: '语言沟通',
    summary: '听到「先…再…」两步指令，按顺序把两件事都做完',
    standard2: '「先…再…」两步指令顺序正确 ≥3/4 次',
    onePenalty: '只完成第一步；需重复',
    sessionSuccess: '4 个回合里 ≥3 次两步都做完、顺序正确',
    opener: '我说两件事，你按顺序做。',
    vbMapp: {
      operant: 'Listener 听者反应',
      level: 2,
      milestone: 'Listener L2 · 双成分指令（先…再…）',
      rationale:
        '两步指令考的是听懂加按顺序执行，不用自己组句，所以比开口表达容易起量。ASD 孩子常只听进最后一个词或只做第一步，先把「听完再动手」练稳，后面讲事情的顺序才有基础。',
      tag: 'Listener L2',
    },
    materials: [
      {
        key: 'takePair',
        label: '「拿」用的两样东西（t1）',
        options: [
          { name: '杯子和积木', parts: ['杯子', '积木'], note: '最稳的一组，名称都是两个字' },
          { name: '碗和勺子', parts: ['碗', '勺子'], note: '家里一定有，起居场景更自然' },
          { name: '杯子和毛巾', parts: ['杯子', '毛巾'], note: '动作差别大，不容易混' },
        ],
        fallback: '任何两样他叫得出名字的东西都行，只要两个动作清楚不一样。',
      },
      {
        key: 'playPair',
        label: '「拍 + 放」用的两样东西（t2）',
        options: [
          { name: '球和筐', parts: ['球', '筐'], note: '能拍能放，动作幅度大，最不容易只看不动' },
          { name: '沙包和篮子', parts: ['沙包', '篮子'], note: '拍不动就改成「扔进篮子」，指令跟着换' },
        ],
        fallback: '找一个能拍／能扔的东西 + 一个能装东西的容器，两样都没有就用纸团和纸篓。',
      },
      {
        key: 'deskPair',
        label: '「给我 + 收回」用的两样东西（t3）',
        options: [
          { name: '纸和笔', parts: ['纸', '笔'], note: '桌面静态，坐得住的孩子更合适' },
          { name: '本子和笔', parts: ['本子', '笔'] },
          { name: '毛巾和盒子', parts: ['毛巾', '盒子'] },
        ],
        fallback: '一样递给你、一样放回容器，随便两样都行，「放回盒子」可以换成「放进抽屉」。',
      },
    ],
    tasks: [
      {
        id: 'G3-t1',
        ask: '（桌上放{takePair}）听好：先拿{takePair.1}，再拿{takePair.2}。',
        hint: '「先拿{takePair.1}……再拿{takePair.2}」',
        checks: ['两步都做了', '顺序正确', '听完才开始动手'],
      },
      {
        id: 'G3-t2',
        ask: '（放好{playPair}）听好：先拍一下{playPair.1}，再把{playPair.1}放进{playPair.2}里。',
        hint: '「先拍{playPair.1}……再放进{playPair.2}」',
        checks: ['两步都做完', '顺序正确', '没有做到一半停下'],
      },
      {
        id: 'G3-t3',
        ask: '（桌上放{deskPair}）听好：先把{deskPair.1}拿给我，再把{deskPair.2}放回原处。',
        hint: '「先给我{deskPair.1}……再收{deskPair.2}」',
        checks: ['两步都做完', '顺序正确', '不用重复指令'],
      },
      {
        id: 'G3-t4',
        ask: '（什么都不用拿）听好：先站起来，再拍拍手。',
        hint: '「先站……再拍手」',
        checks: ['两步都做完', '顺序正确', '中间没等我再说一遍'],
      },
      {
        id: 'G3-t5',
        ask: '（什么都不用拿）听好：先关门，再坐下。',
        hint: '「先关门……再坐下」',
        checks: ['两步都做完', '顺序正确', '听完才开始动'],
      },
      {
        id: 'G3-t6',
        ask: '（桌上放{takePair}）听好：先摸一下{takePair.1}，再把{takePair.2}举起来。',
        hint: '「先摸{takePair.1}……再举{takePair.2}」',
        checks: ['两步都做完', '顺序正确', '没有只做第二步'],
      },
      {
        id: 'G3-t7',
        ask: '（什么都不用拿）听好：先拍拍腿，再摸摸头。',
        hint: '「先拍腿……再摸头」',
        checks: ['两步都做完', '顺序正确', '两个动作没混'],
      },
      {
        id: 'G3-t8',
        ask: '（吃点心前）听好：先擦手，再拿饼干。',
        hint: '「先擦手……再拿饼干」',
        checks: ['两步都做完', '顺序正确', '不用重复指令'],
      },
    ],
    familyGuide: {
      what: '练「听完两件事，按顺序做完」。只说一次，不要边说边做给他看。',
      prepare: '用现成的东西就够：杯子、积木、球、筐、笔、纸。桌上只放本次要用的两三样，别的收走。',
      start: '照这句说：「听好：先拿杯子，再拿积木。」说完闭嘴，退开一步等他动。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 只重复第二步的关键词「……再拿什么？」→ ② 说一步等一步（先拿杯子……好，再拿？）→ ③ 手把手带他做完两步，再退回上一级。',
      success: '4 个回合里 ≥3 次两步都做完、顺序正确，中间不用你提示。',
      fallback: '先退回一步指令（「拿杯子」），做顺了再合成两步；还不行就用两张图卡当视觉提示。',
      dose: '一天 5 分钟，8-10 个回合；指令内容天天换，别固定成一套背下来。',
      avoid: '① 边说边用手指（会变成模仿，不是听懂）　② 他没动就重复三遍　③ 一次给三步以上',
    },
  },
  {
    id: 'G4',
    name: '提问与回答',
    band: 'preschool',
    difficulty: 5,
    settings: ['home', 'desk'],
    settingDifficulty: { desk: 4, home: 3 },
    modality: 'expressive',
    domain: '语言沟通',
    summary: '能回答「什么/谁/在哪」，也能自己问一句',
    standard2: '能回答什么/谁/在哪；能主动问「这是什么」',
    onePenalty: '只回答不提问；需二选一',
    sessionSuccess: '回答类 10 个问题 ≥8 个对，且主动提问 ≥1 次',
    opener: '我问你，你也可以问我。我们轮流来。',
    vbMapp: {
      operant: 'Intraverbal 对话',
      level: 2,
      milestone: 'Intraverbal L2 · 第 8 里程碑（回答什么/谁/在哪）＋ Mand L2 提问',
      rationale:
        '对话是「听到话再说话」，眼前没有实物可指，难度高于命名和请求。先练答，答稳了再教问——问句是 Mand，比答更难。',
      tag: 'Intraverbal L2',
    },
    materials: [
      {
        key: 'picture',
        label: '一张他认识的物品图',
        options: [
          { name: '苹果', note: '最常见，几乎所有卡盒里都有' },
          { name: '香蕉' },
          { name: '小狗' },
        ],
        fallback: '用实物举起来问也一样，「这是什么」不依赖卡片。',
      },
      {
        key: 'photos',
        label: '家人照片（3 张以上）',
        options: [
          { name: '妈妈、爸爸、爷爷的照片', note: '称谓最稳定，孩子见得最多' },
          { name: '妈妈、老师、小朋友的照片', note: '教室里更好凑，但「小朋友」容易说成名字' },
        ],
        fallback: '用手机里现成的照片就行；实在没有就指着教室里真人问「这是谁」。',
      },
      {
        key: 'toy',
        label: '一件他认识的物品（练「在哪」）',
        options: [
          { name: '小熊' },
          { name: '小汽车' },
          { name: '水杯' },
        ],
        fallback: '随手拿一样东西藏起来就行，「在哪」问的是位置，不是这个东西本身。',
      },
      {
        key: 'bag',
        label: '一个看不见里面的袋子',
        options: [
          { name: '不透明袋子', note: '只露一角，最能勾出「这是什么」' },
          { name: '一只袜子', note: '临时替代，效果一样' },
        ],
        fallback: '用手捂着、用书挡着都行，关键是让他看不见全貌。',
      },
    ],
    tasks: [
      {
        id: 'G4-t1',
        ask: '（举起一张{picture}的图片）这是什么？',
        hint: '「这是{picture}」',
        checks: ['答出名称', '2 秒内回答', '不用二选一'],
      },
      {
        id: 'G4-t2',
        ask: '（出示{photos}）这是谁？',
        hint: '「这是妈妈」',
        checks: ['答出称谓', '≥3 张正确', '不用提示'],
      },
      {
        id: 'G4-t3',
        ask: '（把{toy}藏起来，问他位置）{toy}在哪里？',
        hint: '「在床上」',
        checks: ['答出地点', '用上「在」', '≥3 次正确'],
      },
      {
        id: 'G4-t4',
        ask: '（把一件他没见过的物品放进{bag}，只露一角）',
        hint: '「这是什么？」',
        checks: ['主动问 ≥1 次', '问的是「是什么」类', '问完等回答'],
      },
      {
        id: 'G4-t5',
        ask: '（把{bag}举高，他自己拿不到，也不说话）',
        hint: '「那是什么？」',
        checks: ['主动提问', '问的时候看着你', '问完等你回答'],
      },
      {
        id: 'G4-t6',
        ask: '（出示两张图，一张是{picture}，一张是别的）哪一个是{picture}？',
        hint: '指一下，再说「这个是」',
        checks: ['指对', '能说出名称', '不用二选一提示'],
      },
      {
        id: 'G4-t7',
        ask: '（问功能）我们用什么东西喝水？',
        hint: '「用杯子喝水」',
        checks: ['答出物品', '用上「用」', '≥2 个功能类问题答对'],
      },
      {
        id: 'G4-t8',
        ask: '（问地点）我们睡觉在哪里？',
        hint: '「在床上睡觉」',
        checks: ['答出地点', '用上「在」', '≥2 个地点类问题答对'],
      },
    ],
    familyGuide: {
      what: '先练答（什么/谁/在哪），再练问。问比答难，别一起上。',
      prepare: '一组图片卡（物品、家人、常见地点各 3 张），装在不透明袋里。',
      start: '抽一张问：「这是什么？」问完闭嘴等 3 秒，不要接着问第二遍。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 二选一「是苹果还是香蕉？」→ ② 说首字「苹…」→ ③ 示范完整答案让他仿说。',
      success: '回答类 10 个问题 ≥8 个对；主动提问 ≥1 次。',
      fallback: '只练「这是什么」一类，答稳了再加「谁」「在哪」；提问单独练，用他真不认识的物品才问得出来。',
      dose: '一天 5-8 分钟，10-15 个回合。',
      avoid: '① 连着问三个问题等他一起答　② 纠正问句语法（「应该说这是什么呀」）　③ 答错就换下一题（要先给正确答案，再让他试一次）',
    },
  },
  {
    id: 'G5',
    name: '语用四类',
    band: 'preschool',
    difficulty: 6,
    settings: ['home', 'outdoor', 'floor'],
    settingDifficulty: { home: 5, outdoor: 6 },
    modality: 'expressive',
    domain: '语言沟通',
    summary: '请求、拒绝、求助、打招呼，四类里能自己说出三类',
    standard2: '请求、拒绝、求助、打招呼四类中 ≥3 类能主动说出',
    onePenalty: '用哭闹或拉扯代替；需提示',
    sessionSuccess: '四个情境过一遍，≥3 类能自己主动说出',
    opener: '我们来演四个小场景：要东西、不要、求助、打招呼。',
    vbMapp: {
      operant: 'Mand + Social',
      level: 2,
      milestone: 'L2 · 社会行为与请求（四类语用综合）',
      rationale:
        '这是 G 段四类语用的综合检验：请求、拒绝、求助、打招呼都能自发用出来，才说明语言真的进了日常。K 段的 K2 拒绝、K3 求助是同一功能的学龄版（更独立、更少提示），所以这里只要求学前水平的三类就达标。',
      tag: 'Mand/Social L2',
    },
    materials: [
      {
        key: 'snack',
        label: '他喜欢的小点心（t2 请求）',
        options: [
          { name: '小饼干', note: '一口量，不会吃太久' },
          { name: '葡萄干' },
          { name: '果冻' },
        ],
        fallback: '他平时最爱吃的一口量就行；没有吃的就用玩具，重点是「看得到、要开口」。',
      },
      {
        key: 'unwanted',
        label: '一样他不想要的东西（t3 拒绝）',
        options: [
          { name: '一块生胡萝卜', note: '不喜欢但无害，拒绝得自然' },
          { name: '一块苦瓜' },
          { name: '一件他不玩的玩具' },
        ],
        fallback: '任何他不会主动要的东西都可以，只要不是他害怕的东西——怕的东西测不出「拒绝」这个词。',
      },
      {
        key: 'tightBox',
        label: '一个他自己打不开的容器（t4 求助）',
        options: [
          { name: '拧得很紧的瓶子', note: '最典型，求助动机强' },
          { name: '扣得很紧的盒子' },
          { name: '卡住的抽屉' },
        ],
        fallback: '拧紧、扣紧、卡住都行，关键是他试过、确认自己弄不开，才会想到叫人。',
      },
    ],
    tasks: [
      {
        id: 'G5-t1',
        ask: '（有人进门，你提示「看，谁来了」）',
        hint: '「老师好」',
        checks: ['主动开口', '看着对方', '音量能被听清'],
      },
      {
        id: 'G5-t2',
        ask: '（把{snack}放在透明盒里，放在他面前，不打开也不给勺子）',
        hint: '「请给我一个勺子」',
        checks: ['说出请求', '用上「给我」或「请」', '不是直接伸手'],
      },
      {
        id: 'G5-t3',
        ask: '（递给他{unwanted}）',
        hint: '「我不要」',
        checks: ['明确说「不要」', '没有推开', '语气平和'],
      },
      {
        id: 'G5-t4',
        ask: '（给他{tightBox}，他能看见里面是什么，但打不开）',
        hint: '「帮我打开」',
        checks: ['主动开口', '说清要什么', '等到回应再重复'],
      },
      {
        id: 'G5-t5',
        ask: '（早上进门，你站在门口看着他，不说话）',
        hint: '「老师早」',
        checks: ['主动打招呼', '看着人', '音量能被听清'],
      },
      {
        id: 'G5-t6',
        ask: '（他正画画，你把笔收进盒子，放在他够得到的地方）',
        hint: '「请给我笔」',
        checks: ['说出请求', '用上「给我」或「请」', '不是直接抢'],
      },
      {
        id: 'G5-t7',
        ask: '（夹一筷子他不爱吃的菜，递到他嘴边）',
        hint: '「我不要这个」',
        checks: ['明确说「不要」', '没有扭头推开', '说完等你收走'],
      },
      {
        id: 'G5-t8',
        ask: '（他鞋带被系成死结，自己解不开）',
        hint: '「帮我解开」',
        checks: ['主动求助', '说清卡在哪', '没有直接放弃'],
      },
    ],
    familyGuide: {
      what: '看四类语用能不能自己用出来：请求、拒绝、求助、打招呼，哪类还不能自发，就先集中补哪类。',
      prepare: '四个情境各准备一样道具：门口（打招呼）、点心盒（请求）、不爱的东西（拒绝）、紧盒子（求助）。',
      start: '一次只演一个情境，演完记一下他有没有主动说；不要四个一口气演完。',
      wait: WAIT_THREE_SECONDS,
      prompts: '① 情境本身提示（抬手、看着他）→ ② 说首字 → ③ 示范一遍让他仿说。',
      success: '四类里 ≥3 类能自己主动说出（不用提示），这条就算达标。',
      fallback: '先集中补最能起量的那一类（通常是请求），其他三类隔天再试。',
      dose: '一周 2 次，每次只过 2 个情境，5 分钟。',
      avoid: '① 一次问四类（他会乱）　② 用零食换他说「谢谢」　③ 当着外人说「他怎么不叫人」',
    },
  },
  {
    id: 'K1',
    name: '说清一件事',
    band: 'school',
    difficulty: 7,
    settings: ['desk', 'home'],
    settingDifficulty: { home: 8 },
    modality: 'expressive',
    domain: '语言表达',
    summary: '用「谁—在哪—做了什么—然后」讲清一件亲身经历',
    standard2: '用「谁—在哪—做了什么—然后」四要素讲述亲身经历，要素齐全率 ≥3/4',
    onePenalty: '需提示「后来呢」才补全；要素齐全但需追问',
    sessionSuccess: '讲 3 件事，其中 2 件四要素齐全，中间不用「后来呢」',
    opener: '跟我说说，刚才发生了什么？',
    vbMapp: {
      operant: 'Intraverbal 对话',
      level: 3,
      milestone: 'Intraverbal L3 · 叙述与顺序',
      rationale:
        '叙述要同时组织时间顺序和要素，是学龄段的核心。ASD 孩子常记得片段但连不成线，四要素就是给他的支架——缺哪个补哪个，不要笼统要求「说清楚」。',
      tag: 'Intraverbal L3',
    },
    materials: [
      {
        key: 'story',
        label: '一套三格图片故事（t3）',
        options: [
          { name: '洗脸三步图', note: '拧毛巾、擦脸、挂毛巾，动作清楚' },
          { name: '起床三步图' },
          { name: '手机里连续三张照片', note: '现拍也行，用他自己刚做的事更容易开口' },
        ],
        fallback: '没有成套图卡就把三张照片存手机里，或者现场拍三张；也可以用三样实物摆出顺序代替。',
      },
    ],
    tasks: [
      {
        id: 'K1-t1',
        ask: '今天在教室里你做了什么？说给我听。',
        hint: '「我先……然后……」',
        checks: ['有「谁」', '有「做了什么」', '有「然后」'],
      },
      {
        id: 'K1-t2',
        ask: '刚才我们玩的那个游戏，是怎么玩的？',
        hint: '「先把球扔进去，然后……」',
        checks: ['按顺序说', '≥2 个步骤', '不用追问「后来呢」'],
      },
      {
        id: 'K1-t3',
        ask: '（出示{story}）这三张图讲了什么？一张一张说。',
        hint: '「第一张……第二张……」',
        checks: ['三格都说到', '顺序正确', '有连接词'],
      },
      {
        id: 'K1-t4',
        ask: '周末你去哪了？跟谁去的？做了什么？',
        hint: '「我和妈妈去公园，玩了滑梯」',
        checks: ['有地点', '有同伴', '有事件'],
      },
      {
        id: 'K1-t5',
        ask: '（给他看刚才活动的照片或视频）你看，这是在做什么？',
        hint: '「这是我在玩滑梯」',
        checks: ['有「我」', '有动作', '有顺序词或「因为」'],
      },
      {
        id: 'K1-t6',
        ask: '今天最开心的一件事是什么？说给我听，从头说。',
        hint: '「先是……然后……最后……」',
        checks: ['有开头', '有经过', '有结尾'],
      },
      {
        id: 'K1-t7',
        ask: '（出示{story}）这几张图连起来讲一个故事，一张一张说。',
        hint: '「第一张……后来……最后……」',
        checks: ['每张都说到', '有连接词', '顺序对'],
      },
      {
        id: 'K1-t8',
        ask: '（讲一个他熟悉的故事开头，停住）后来怎么样了？你接着说。',
        hint: '「后来小兔子……」',
        checks: ['顺着情节接', '≥2 句', '不用提示'],
      },
    ],
    familyGuide: {
      what: '练「讲清楚」，四要素：谁—在哪—做了什么—然后。缺哪个就只补那个。',
      prepare: '用刚发生的真事（不要让他回忆很久以前）；三格图片故事一套。',
      start: '照这句问：「刚才我们做了什么？说给我听。」问完等 3 秒，不要马上补「后来呢」。',
      wait: WAIT_THREE_SECONDS,
      prompts: '① 提示「后来呢？」→ ② 给要素提示「谁？在哪？」→ ③ 你说前半句让他接。',
      success: '讲 3 件事，其中 2 件四要素齐全，中间不用「后来呢」。',
      fallback: '先只要求两要素（谁＋做了什么）；还不行就用图片当线索，讲一张说一句。',
      dose: '一天 5 分钟，讲 1-2 件事，别变成审问。',
      avoid: '① 中途打断纠正用词　② 替他把「然后」补上　③ 讲完追问细节考他',
    },
  },
  {
    id: 'K2',
    name: '拒绝与索回',
    band: 'school',
    difficulty: 8,
    settings: ['home', 'floor'],
    modality: 'expressive',
    domain: '语言表达',
    summary: '不想给就说「不要」，东西被拿走就说「还给我」',
    standard2: '角色扮演/真实情境中，3 次均能说出「不要」「还给我」，音量可被听清',
    onePenalty: '说了但声音过小；需教师示意才开口',
    sessionSuccess: '6 个回合里 ≥5 次在 1 秒内说出「不要」或「还给我」',
    opener: '不想要就说「不要」，我会停下来。',
    vbMapp: {
      operant: 'Mand 请求',
      level: 2,
      milestone: 'Mand L2 · 第 6–7 里程碑（拒绝/终止、索回）',
      rationale:
        '拒绝是使用频率最高的请求之一。ASD 孩子不会用词拒绝时，往往用推、哭、跑掉代替，问题行为多半从这里长出来——先给他一句好用的话，比事后纠正行为省力得多。',
      tag: 'Mand L2',
    },
    materials: [
      {
        key: 'unliked',
        label: '一样他确实不想要的东西（t1）',
        options: [
          { name: '一块生胡萝卜', note: '不喜欢但无害，拒绝得自然' },
          { name: '一块苦瓜' },
          { name: '一条凉毛巾' },
        ],
        fallback: '任何他不会主动要、也不害怕的东西都行；他害怕的东西测不出「不要」这个词，只会测出躲。',
      },
      {
        key: 'toy',
        label: '他正玩得起劲的玩具（t2）',
        options: [
          { name: '他手上的那一个', note: '不用另找，就在他手里' },
          { name: '小汽车' },
          { name: '积木' },
        ],
        fallback: '先用别的玩具把他带进状态，等他玩进去了再拿走——手里没东西的时候，索回就无从练起。',
      },
      {
        key: 'drawing',
        label: '他刚做出来的作品（t3）',
        options: [
          { name: '他刚画的画', note: '自己做的，护得最紧' },
          { name: '他刚搭的积木' },
          { name: '他刚拼好的拼图' },
        ],
        fallback: '没作品就用他刚摆好的东西，关键是「这是他做的」，被抢才有反应。',
      },
      {
        key: 'screen',
        label: '他正在看的东西（t4）',
        options: [
          { name: '正在放的动画片', note: '动机最强，但要事先说好只看一小段' },
          { name: '正在放的儿歌视频' },
          { name: '正在听的音频故事' },
        ],
        fallback: '没有屏幕就用他正在玩的玩具替代，把「关掉了」换成「收起来了」。',
      },
    ],
    tasks: [
      {
        id: 'K2-t1',
        ask: '（递给他{unliked}，说「给你」）',
        hint: '「不要」',
        checks: ['1 秒内说出「不要」', '音量能被听清', '没有推开或哭'],
      },
      {
        id: 'K2-t2',
        ask: '（把{toy}从他手上拿走，握在自己手里）',
        hint: '「还给我」',
        checks: ['说出「还给我」', '看着对方说', '说完伸手要回'],
      },
      {
        id: 'K2-t3',
        ask: '（假装抢走{drawing}，角色扮演）',
        hint: '「不要抢，还给我」',
        checks: ['组合成短句', '语气坚定', '没有直接动手'],
      },
      {
        id: 'K2-t4',
        ask: '（关掉{screen}，说「关掉了」）',
        hint: '「不要关，我还想看」',
        checks: ['说出「不要」', '补一句要求', '音量可听清'],
      },
      {
        id: 'K2-t5',
        ask: '（要给他剪指甲或洗头，拿起工具靠近）',
        hint: '「不要，我自己来」',
        checks: ['说出「不要」', '没有直接跑开', '能补一句理由'],
      },
      {
        id: 'K2-t6',
        ask: '（借走他的橡皮／铅笔，一直不还）',
        hint: '「还给我」',
        checks: ['说出「还给我」', '看着你要', '说完等你给'],
      },
      {
        id: 'K2-t7',
        ask: '（他正玩的游戏，你说「时间到了，收起来」）',
        hint: '「再玩一会儿」',
        checks: ['说出「不要」或「再玩」', '给出一个具体请求', '没有哭闹'],
      },
      {
        id: 'K2-t8',
        ask: '（把他坐的椅子挪走，自己坐下）',
        hint: '「这是我的座位」',
        checks: ['说出「还给我」或「这是我的」', '语气坚定', '说完等你让开'],
      },
    ],
    familyGuide: {
      what: '练「不想就要说出来」。这条比请求更容易起量，因为动机是现成的。',
      prepare: '准备 2 样他不喜欢的（不爱的零食、凉毛巾）和 1 样他正玩得起劲的玩具。',
      start: '递东西的同时说「给你。」然后闭嘴，等他。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 提示「不…」→ ② 示范「不要」再等 3 秒 → ③ 手把手带说。他一说「不要」，立刻收回东西并说「好，不要」——让他看到这句话真的有用。',
      success: '6 个回合里 ≥5 次在 1 秒内说出「不要」或「还给我」，音量能被听清。',
      fallback: '先只练「不要」这一个词，练稳了再加「还给我」；还不行就从摇头配「不」起步，再补全词。',
      dose: '一天 5 分钟，3-5 个回合就够，别把他惹急了。',
      avoid: '① 在他哭闹的时候练（会变成情绪对抗）　② 他说了「不要」你还继续给（下次他就不说了）　③ 要求他说「请您不要这样」这种长句',
    },
  },
  {
    id: 'K3',
    name: '主动求助',
    band: 'school',
    difficulty: 9,
    settings: ['home', 'desk'],
    settingDifficulty: { home: 8, desk: 9 },
    modality: 'expressive',
    domain: '语言表达',
    summary: '卡住了就找人开口说「帮我」，不自己硬撑也不放弃',
    standard2: '主动走向指定成人并开口「老师，我……」，完成一次求助',
    onePenalty: '需教师指方向或先叫名字',
    sessionSuccess: '5 次机会里 ≥4 次他自己走过来开口',
    opener: '打不开就说「帮我」，我马上来。',
    vbMapp: {
      operant: 'Mand 请求',
      level: 2,
      milestone: 'Mand L2 · 第 7 里程碑（请求他人做出动作）',
      rationale:
        '求助要先觉察「我卡住了」，再主动找人，比要东西难一层。这一条不通，孩子容易直接放弃或发脾气，学业和自理都会卡在同一个点上。',
      tag: 'Mand L2',
    },
    materials: [
      {
        key: 'tight',
        label: '一个他拧不开的零食罐（t1）',
        options: [
          { name: '拧紧的零食罐', note: '里面装他爱吃的，动机强' },
          { name: '扣紧的饭盒' },
          { name: '封口的饼干袋' },
        ],
        fallback: '任何他确定自己打不开的东西都行；关键是你能打开、他打不开，差距要明显。',
      },
      {
        key: 'highToy',
        label: '一样他想要、但够不到的玩具（t2）',
        options: [
          { name: '柜子顶上的玩具', note: '原地不动就能做成，最容易重复' },
          { name: '架子高层的盒子' },
        ],
        fallback: '不用真的有柜子，把东西放到他自己拿不到的高度就行。',
      },
      {
        key: 'brokenPen',
        label: '一样坏了／缺了的东西（t3）',
        options: [
          { name: '写不出水的笔', note: '安静地坏，必须他自己发现' },
          { name: '没电池的玩具' },
          { name: '断了的蜡笔' },
        ],
        fallback: '任何「看起来能用、实际用不了」的东西都行，重点是让他先动手试一次。',
      },
      {
        key: 'puzzle',
        label: '一个缺一块的拼图（t4）',
        options: [
          { name: '缺最后一块的拼图', note: '差一步就完成，最容易急' },
          { name: '缺一块的嵌板' },
        ],
        fallback: '任何「快完成但缺一件」的任务都可以，比如少一颗珠子的串珠。',
      },
    ],
    tasks: [
      {
        id: 'K3-t1',
        ask: '（把{tight}放在他面前，你退到两米外）',
        hint: '「老师，帮我」',
        checks: ['走过来找你', '开口叫了人', '说出要帮什么'],
      },
      {
        id: 'K3-t2',
        ask: '（把{highToy}放在他够不到的高处）',
        hint: '「我够不到，帮我拿」',
        checks: ['主动走向成人', '说出「帮我」', '没有自己爬高'],
      },
      {
        id: 'K3-t3',
        ask: '（给他{brokenPen}，让他自己试一次）',
        hint: '「这个坏了，帮我换」',
        checks: ['发现问题', '开口说明', '指出问题在哪'],
      },
      {
        id: 'K3-t4',
        ask: '（把{puzzle}的最后一块藏起来，他拼不上）',
        hint: '「少了一块，帮我找」',
        checks: ['说出卡在哪', '主动求助', '没有直接放弃'],
      },
      {
        id: 'K3-t5',
        ask: '（把他的书包拉链卡住，他自己拉不开）',
        hint: '「拉链卡住了，帮我」',
        checks: ['发现问题', '开口说明', '说清卡在哪'],
      },
      {
        id: 'K3-t6',
        ask: '（他做手工，胶带用完了／胶棒干了）',
        hint: '「没有胶了，帮我拿」',
        checks: ['主动开口', '说清缺什么', '没有自己翻柜子'],
      },
      {
        id: 'K3-t7',
        ask: '（给他一双系成死结的鞋，让他自己穿）',
        hint: '「鞋带解不开，帮我」',
        checks: ['试过一次才求助', '说出卡在哪', '语气平和'],
      },
      {
        id: 'K3-t8',
        ask: '（把水壶放在他够不到的架子上，他口渴了）',
        hint: '「我够不到，帮我拿」',
        checks: ['主动走过来', '说清要哪个', '没有自己搬椅子爬'],
      },
    ],
    familyGuide: {
      what: '练「卡住了就找人」。关键是让他知道：求助比放弃和发脾气都快。',
      prepare: '准备 3 个「一定会卡住」的小情境：拧紧的罐子、放高的玩具、写不出水的笔。',
      start: '你把东西给他，然后退开两步，不说话，等他自己来找你。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 你看向他、抬一下下巴示意 → ② 问「怎么了？」引出他说 → ③ 示范「帮我」让他仿说。',
      success: '5 次机会里 ≥4 次他自己走过来开口（只叫人、没叫名字也算）。',
      fallback: '先只练一个情境（拧罐子），天天同一个；还不行就把你的位置挪近一点，稳定后再慢慢拉远。',
      dose: '一天 3-5 次机会，散在自然活动里，不要集中练。',
      avoid: '① 他一哼你就把东西弄好（求助就没必要了）　② 说「你说话呀」　③ 他开口了你还在看手机',
    },
  },
  {
    id: 'K4',
    name: '复述通知',
    band: 'school',
    difficulty: 10,
    settings: ['home', 'desk'],
    modality: 'expressive',
    domain: '语言表达',
    summary: '听完一句通知，能把关键信息说出来',
    standard2: '听完 1-2 句通知后复述关键信息，正确率 ≥80%',
    onePenalty: '需重复一遍才能复述；漏掉时间或物品',
    sessionSuccess: '5 条通知里 ≥4 条关键信息复述正确',
    opener: '我说一句话，你听完再说给我听。',
    vbMapp: {
      operant: 'Intraverbal 对话',
      level: 3,
      milestone: 'Intraverbal L3 · 多要素听觉记忆与复述',
      rationale:
        '听一遍就要记住并说出来，工作记忆负荷最高之一。一次只加一个信息、比反复重复更有效——重复三遍再说，练的是「等」，不是「记」。',
      tag: 'Intraverbal L3',
    },
    materials: [
      {
        key: 'notice1',
        label: '第 1 条通知（一个信息）',
        options: [
          { name: '明天带水杯', note: '最常见，真实会发生' },
          { name: '明天带跳绳' },
          { name: '明天带作业本' },
        ],
        fallback: '用今天真的要通知的事，别编无意义的句子——编出来的他记不住也没用。',
      },
      {
        key: 'notice2',
        label: '第 2 条通知（两个信息）',
        options: [
          { name: '下午去操场玩，带上帽子', note: '地点 + 物品，难度刚好' },
          { name: '下午去图书角，带上借书卡' },
        ],
        fallback: '从「去哪 + 带什么」这个结构里随便挑一件真实的事。',
      },
      {
        key: 'notice3',
        label: '第 3 条通知（三个信息）',
        options: [
          { name: '妈妈五点在门口接你，别乱跑', note: '谁 + 几点 + 在哪，三要素齐' },
          { name: '爸爸四点半在校门口等你' },
        ],
        fallback: '换成今天真实接送的人和时间，越接近当天越容易记住。',
      },
    ],
    tasks: [
      {
        id: 'K4-t1',
        ask: '听好：{notice1}。你说一遍。',
        hint: '「明天带什么？」',
        checks: ['说出「水杯」', '说出「明天」', '一次就记住'],
      },
      {
        id: 'K4-t2',
        ask: '听好：{notice2}。你说一遍。',
        hint: '「先说去哪，再说带什么」',
        checks: ['两个信息都有', '顺序正确', '不用重复一遍'],
      },
      {
        id: 'K4-t3',
        ask: '听好：{notice3}。你说一遍。',
        hint: '「几点？在哪？」',
        checks: ['说出时间', '说出地点', '说出要求'],
      },
      {
        id: 'K4-t4',
        ask: '听好这句话，等会儿说给隔壁老师听：三班今天不上课。',
        hint: '「哪个班？今天怎么了？」',
        checks: ['记住并转达', '信息准确', '隔一会儿还能说'],
      },
      {
        id: 'K4-t5',
        ask: '听好：明天穿运动鞋，不穿皮鞋。你说一遍。',
        hint: '「明天穿什么？」',
        checks: ['说出「运动鞋」', '说出「明天」', '说清不要什么'],
      },
      {
        id: 'K4-t6',
        ask: '听好：午饭在小房间吃，不在教室。你说一遍。',
        hint: '「在哪吃？」',
        checks: ['说出地点', '说清「不在教室」', '一次就记住'],
      },
      {
        id: 'K4-t7',
        ask: '听好：老师说明天下午三点半放学。你说一遍。',
        hint: '「几点放学？」',
        checks: ['说出时间', '说出「放学」', '不用重复'],
      },
      {
        id: 'K4-t8',
        ask: '听好这句话，等会儿说给妈妈听：把这张纸交给妈妈。',
        hint: '「交给谁？交什么？」',
        checks: ['记住并转达', '对象说对', '隔一会儿还能说'],
      },
    ],
    familyGuide: {
      what: '练「听完记住再说出来」。一条只给 1-2 个信息，不要一次三句。',
      prepare: '用真实会发生的事当通知（带水杯、几点接），不要编无意义的句子。',
      start: '清楚说一遍，说完停 3 秒，不要自己重复。',
      wait: WAIT_THREE_SECONDS,
      prompts: '① 提问式提示「带什么？」→ ② 说前半句让他接 → ③ 完整重复一遍让他仿说。',
      success: '5 条通知里 ≥4 条关键信息复述正确。',
      fallback: '退回一个信息（只说「带水杯」）；还不行就配一张图卡当视觉提示。',
      dose: '一天 5 条，分散在不同时间，不要连续轰炸。',
      avoid: '① 说完自己马上重复一遍　② 一次给三句以上　③ 他说错立刻说「不对」',
    },
  },
  {
    id: 'K5',
    name: '电话说清三要素',
    band: 'school',
    difficulty: 11,
    settings: ['home', 'desk'],
    modality: 'expressive',
    domain: '语言表达',
    summary: '电话或当面对别人说清「我是谁、我在哪、我需要什么」',
    standard2: '依次说出「我是谁、我在哪、我需要什么」，不依赖提示卡',
    onePenalty: '需提示卡；漏说其中一项',
    sessionSuccess: '3 次通话里 2 次三要素齐全，不用卡片',
    opener: '假装打电话，你要告诉我三件事：你是谁、你在哪、你要什么。',
    vbMapp: {
      operant: 'Intraverbal + Social',
      level: 3,
      milestone: 'L3 · 跨对象、跨情境泛化',
      rationale:
        '电话没有表情和手势可用，是纯听觉的语言任务，最考验泛化——桌面练会了，换个通道就散架的情况很常见，所以放最后，专门练「换人换场景还能说」。',
      tag: 'Intraverbal L3',
    },
    materials: [
      {
        key: 'phone',
        label: '打电话用的工具（t1 / t4）',
        options: [
          { name: '真手机（走到另一个房间）', note: '真实感最强，看不到人，只能靠听' },
          { name: '玩具手机', note: '没有声卡的机构用这个，配一个人在对面对话' },
          { name: '手机开免提', note: '中间方案，能听到但看不见' },
        ],
        fallback: '没有手机就用两个纸杯穿线，或者隔着屏风／门说话——关键是「看不见人」。',
      },
      {
        key: 'scene',
        label: '模拟的紧急情境（t2）',
        options: [
          { name: '找不到妈妈了', note: '动机真实，三要素最容易说全' },
          { name: '在超市走散了' },
          { name: '放学没人来接' },
        ],
        fallback: '用他真实经历过的一次走散或等待，比虚构的情境更容易说清楚。',
      },
    ],
    tasks: [
      {
        id: 'K5-t1',
        ask: '（用{phone}演，你走到另一个房间当接电话的人）喂，你好。',
        hint: '「我是……我在……我要……」',
        checks: ['说出自己是谁', '说出在哪', '说出需要什么'],
      },
      {
        id: 'K5-t2',
        ask: '（演：{scene}，给老师打电话）',
        hint: '「老师，我是××，我在超市」',
        checks: ['三要素齐', '顺序正确', '语气能听清'],
      },
      {
        id: 'K5-t3',
        ask: '（走到另一位老师面前）把你刚才的事说给这位老师听。',
        hint: '「我是……我需要……」',
        checks: ['主动走过去', '三要素齐', '不看卡片'],
      },
      {
        id: 'K5-t4',
        ask: '（真打给一位熟悉的大人，说清一件事）',
        hint: '「先说是谁，再说要什么」',
        checks: ['真实情境能完成', '三要素齐', '对方听懂了'],
      },
      {
        id: 'K5-t5',
        ask: '（演：在商场找不到爸爸了，用{phone}打给爸爸）',
        hint: '「爸爸，我是××，我在商场一楼」',
        checks: ['说出自己是谁', '说出在哪', '说出要什么'],
      },
      {
        id: 'K5-t6',
        ask: '（演：老师让你打电话告诉妈妈，今天要带被子回家）',
        hint: '「妈妈，老师说要带被子」',
        checks: ['说清转达的事', '说出是谁让说的', '对方听懂了'],
      },
      {
        id: 'K5-t7',
        ask: '（演：你摔倒了，打给老师，说清在哪、怎么了）',
        hint: '「老师，我在操场，我摔了」',
        checks: ['说出地点', '说出发生了什么', '说出需要什么'],
      },
      {
        id: 'K5-t8',
        ask: '（演：到邻居家借一样东西，当面说清楚）',
        hint: '「阿姨，我是××，我想借一把伞」',
        checks: ['主动开口', '三要素齐', '说完道谢'],
      },
    ],
    familyGuide: {
      what: '这条最难，放在最后。三要素：我是谁、我在哪、我需要什么。',
      prepare: '用真手机演（不开免提也行），你走到另一个房间当接电话的人；准备一张写三个词的小卡片，但先不给。',
      start: '照这句说：「喂，你好。」然后等他开口。',
      wait: WAIT_THREE_SECONDS,
      prompts:
        '① 问「你是谁？」提示第一空 → ② 问「你在哪儿？」 → ③ 把卡片给他看，让他照着说。',
      success: '3 次通话里 2 次三要素齐全，不用卡片。',
      fallback: '先只练前两句（我是谁、我在哪）；还不行就把三句写在卡片上，读一遍，再练不看卡片。',
      dose: '一次 5 分钟，3 个来回，隔天 1 次。',
      avoid: '① 他刚说一句你就替他说完　② 要求他说「您好、请问、谢谢」这些客套　③ 在真有急事的时候练',
    },
  },
];

/** 难度档，只用于给孩子家长看的一句话说明 */
export type ExpressionTier = '入门' | '进阶' | '挑战';

/** 台阶 → 档位。1-3 入门，4-6 进阶，7-10 挑战 */
export function tierOf(difficulty: number): ExpressionTier {
  if (difficulty <= 3) return '入门';
  if (difficulty <= 6) return '进阶';
  return '挑战';
}

/** 学段：和 skill 的代码段一一对应，B 段 0-3 岁、G 段 3-6 岁、K 段 6-12 岁 */
export interface ExpressionStage {
  band: ExpressionBand;
  /** 代码段首字母，卡片上的编号用它 */
  code: 'B' | 'G' | 'K';
  ageLabel: string;
  domainLabel: string;
  /** 学段先后，数字小的先显示 */
  rank: number;
}

export const EXPRESSION_STAGES: ExpressionStage[] = [
  { band: 'infant', code: 'B', ageLabel: '0-3 岁', domainLabel: '语言沟通', rank: 0 },
  { band: 'preschool', code: 'G', ageLabel: '3-6 岁', domainLabel: '语言沟通', rank: 1 },
  { band: 'school', code: 'K', ageLabel: '6-12 岁', domainLabel: '语言表达', rank: 2 },
];

export function getStage(band: ExpressionBand): ExpressionStage {
  return EXPRESSION_STAGES.find((s) => s.band === band) ?? EXPRESSION_STAGES[1];
}

export function isStageBand(value: unknown): value is ExpressionBand {
  return EXPRESSION_STAGES.some((s) => s.band === value);
}

/** 只按难度排：用来看「全局哪条更容易」，不建议直接铺在界面上 */
export const EXPRESSION_TARGETS_BY_DIFFICULTY: ExpressionTarget[] = EXPRESSION_TARGETS.slice().sort(
  (a, b) => a.difficulty - b.difficulty,
);

/**
 * 界面上的正式顺序：先学段（B → G → K），学段内再由易到难。
 * 学前孩子打开时先看到 B/G，K 段排在后面，不会被夹在中间。
 */
export const EXPRESSION_TARGETS_BY_STAGE: ExpressionTarget[] = EXPRESSION_TARGETS.slice().sort(
  (a, b) => getStage(a.band).rank - getStage(b.band).rank || a.difficulty - b.difficulty,
);

export interface ExpressionStageGroup {
  stage: ExpressionStage;
  targets: ExpressionTarget[];
}

/** 按学段分组；传 'all' 或具体学段 */
export function stageGroups(only: ExpressionBand | 'all' = 'all'): ExpressionStageGroup[] {
  return EXPRESSION_STAGES.filter((s) => only === 'all' || s.band === only)
    .map((stage) => ({
      stage,
      targets: EXPRESSION_TARGETS_BY_STAGE.filter((t) => t.band === stage.band),
    }))
    .filter((g) => g.targets.length > 0);
}

/** 建议下一个练的目标：学段最靠前、学段内最容易、还没稳定的那个 */
export function suggestNextTarget(stableIds: string[]): ExpressionTarget | undefined {
  return EXPRESSION_TARGETS_BY_STAGE.find((t) => !stableIds.includes(t.id));
}

export function getExpressionTarget(id: string | undefined): ExpressionTarget | undefined {
  if (!id) return undefined;
  return EXPRESSION_TARGETS.find((t) => t.id === id);
}

export function targetsForBand(band: ExpressionBand): ExpressionTarget[] {
  return EXPRESSION_TARGETS_BY_STAGE.filter((t) => t.band === band);
}
