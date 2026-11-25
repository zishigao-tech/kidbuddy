import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

async function listSources(dirUrl) {
  const out = [];
  for (const entry of await readdir(dirUrl, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dirUrl);
    if (entry.isDirectory()) out.push(...(await listSources(url)));
    else if (/\.tsx?$/.test(entry.name)) out.push(url);
  }
  return out;
}

// 儿童端是默认首页，家长中心位于 /parent 并且需要先通过家长验证
const routes = await read('../../routes.tsx');
assert.match(routes, /path: '\/',\s*element: <KidLayout \/>/);
assert.match(routes, /index: true, element: <KidHome \/>/);
assert.match(routes, /path: 'draw'/);
assert.match(routes, /path: 'books'/);
assert.match(routes, /path: 'books\/new'/);
assert.match(routes, /path: 'books\/:bookId'/);
assert.match(routes, /path: '\/parent'/);
assert.match(routes, /<ParentArea \/>/);
assert.doesNotMatch(routes, /path: '',\s*element: <Chat \/>/, 'adult chat is completely removed');
// 英语岛模块整体下线：路由、页面、导航、首页卡片都不该再提到它
assert.doesNotMatch(routes, /english/i, '英语岛路由已移除');
await assert.rejects(access(new URL('./KidEnglish.tsx', import.meta.url)), { code: 'ENOENT' }, 'KidEnglish.tsx 已删除');
await assert.rejects(access(new URL('./KidEnglishPlay.tsx', import.meta.url)), { code: 'ENOENT' }, 'KidEnglishPlay.tsx 已删除');

const kidLayout = await read('./KidLayout.tsx');
assert.doesNotMatch(kidLayout, /english/i, '底部导航不再有英语岛');
assert.doesNotMatch(kidLayout, /\/expression/, '说说小课堂不放在儿童导航里，避免孩子随手点进去');
const kidHome = await read('./KidHome.tsx');
assert.doesNotMatch(kidHome, /english/i, '首页不再有英语岛入口');

// 说说小课堂：孩子不能自己进，卡片要长按 1.5 秒 + 家长/老师验证
assert.doesNotMatch(kidHome, /to="\/expression"/, '卡片不能是可点的 Link');
assert.match(kidHome, /testId="expression-card"/);
assert.match(kidHome, /useLongPress\(/, '卡片走长按，不是单击');
assert.match(kidHome, /title="课堂入口验证"/, '要点明这是课堂入口验证');
assert.match(kidHome, /unlockLessonArea\(\)/, '验证通过才解锁课堂');
assert.match(routes, /<LessonGuard><KidExpression \/><\/LessonGuard>/, '目标列表要守卫');
assert.match(routes, /<LessonGuard><KidExpressionPlay \/><\/LessonGuard>/, '练习台要守卫');
assert.match(routes, /<LessonGuard><KidCognition \/><\/LessonGuard>/, '认知列表也要守卫');
assert.match(routes, /<LessonGuard><KidCognitionPlay \/><\/LessonGuard>/, '认知练习台也要守卫');
assert.match(kidHome, /testId="cognition-card"/, '首页要有认知理解卡片');
// 两个模块共用同一套页面与门禁，只换配置
const modules = await read('../../config/lessonModules.ts');
assert.match(modules, /export const EXPRESSION_MODULE/);
assert.match(modules, /export const COGNITION_MODULE/);
assert.match(modules, /kidbuddy\.expression\.book\.v1/);
assert.match(modules, /kidbuddy\.cognition\.book\.v1/, '认知要有自己的账本 key，不能和表达混');
const expressionPage = await read('./KidExpression.tsx');
assert.match(expressionPage, /data-testid="lock-lesson"/, '页面里要能手动结束课堂');
assert.match(expressionPage, /lockLessonArea\(\)/, '结束课堂要真的上锁');
const cognitionPage = await read('./KidCognition.tsx');
assert.match(cognitionPage, /LessonTargetsPage/, '认知列表复用同一个列表页');
const cognitionPlay = await read('./KidCognitionPlay.tsx');
assert.match(cognitionPlay, /LessonPlayPage/, '认知练习复用同一个练习台');

// 旧版成人角色群聊目录已彻底移除
await assert.rejects(access(new URL('../chat/', import.meta.url)), { code: 'ENOENT' }, 'src/pages/chat must be deleted');

const parent = await read('../parent/index.tsx');
assert.match(parent, /isParentAreaUnlocked\(\)/);
assert.match(parent, /<Navigate to="\/" replace \/>/);
assert.doesNotMatch(parent, /from '\.\.\/chat'/, 'parent area no longer reuses old adult chat');

const gate = await read('./components/ParentGate.tsx');
// 家长入口要长按 1.5 秒才弹验证（防孩子误触），角标上必须写明「长按」
assert.match(gate, /LONG_PRESS_MS = 1500/, '长按 1.5 秒');
assert.match(gate, /onPointerDown=/, '按住开始计时');
assert.match(gate, /onPointerUp=\{cancel\}|onPointerLeave=\{cancel\}/, '松手/移出要取消计时');
assert.match(gate, /BADGE_LABEL = '长按'/, '角标要写明「长按」，否则家长只会点一下');
assert.match(gate, /aria-label="家长中心（长按 1\.5 秒进入）"/, '无障碍名称要说清长按');
assert.match(gate, /checkChallengeAnswer/);
assert.match(gate, /unlockParentArea\(\)/);
assert.match(gate, /hasParentPin/);
assert.match(gate, /verifyParentPin/);
// 首页底部还要有一个文字入口，避免家长找不到左上角的角标
assert.match(kidHome, /data-testid="parent-entry"/, '首页要有家长中心文字入口');
assert.match(kidHome, /<ParentGateDialog/, '首页入口也要过验证');

// 护眼时长遮罩
const layout = await read('./KidLayout.tsx');
assert.match(layout, /TimeLimitOverlay/);
assert.match(layout, /time-limit-overlay/);

// 儿童端不用 antd 的后台组件，只用 Tailwind
const kidFiles = await listSources(new URL('./', import.meta.url));
assert.ok(kidFiles.length >= 8);
for (const url of kidFiles) {
  const source = await readFile(url, 'utf8');
  assert.doesNotMatch(source, /from 'antd'|from '@lobehub\/ui'/, `${url.pathname} should not import admin UI kits`);
}

// 触控区域：交互按钮至少 h-12（48px）
for (const url of kidFiles) {
  const source = await readFile(url, 'utf8');
  for (const match of source.matchAll(/<button\b[^<]*?className=[{]?[`"]([^`"]*)[`"]/g)) {
    const cls = match[1];
    if (/\b(?:h|min-h)-(?:1[2-9]|[2-9]\d)\b/.test(cls) || /relative flex h-14/.test(cls)) continue;
    assert.fail(`${url.pathname}: button without a 48px touch target: ${cls}`);
  }
}

// 聊天走共享的伙伴调度和守则
const chat = await read('./KidChat.tsx');
assert.match(chat, /pickCompanions\(/);
assert.match(chat, /capResponders\(/);
assert.match(chat, /rememberFromMessage\(text\)/);
const companionChat = await read('../../lib/companionChat.ts');
assert.match(companionChat, /request\('\/api\/chat'/);
assert.match(companionChat, /gamePrompt/);

// 游戏判定在本地，伙伴只负责陪玩
const play = await read('./KidGamePlay.tsx');
for (const fn of ['submitGuess', 'submitChainWord', 'acceptCompanionWord', 'submitStoryLine', 'recordGame']) {
  assert.match(play, new RegExp(`${fn}\\(`), `game page uses ${fn}`);
}

// 麦克风只在支持语音识别时出现，且支持空格键按住说话
const input = await read('./components/KidInputBar.tsx');
assert.match(input, /recognizer\.supported &&/);
assert.match(input, /voice\.inputMode === 'voice' && recognizer\.supported/);
assert.match(input, /addEventListener\('keydown'/);
assert.match(input, /Space/);

// 说说小课堂：目标按学段分组显示，但圆圈数字必须是全表台阶（target.difficulty），
// 不能按列表下标重新编号——否则段内会出现「4 比 6 容易」的错觉。
const exprHome = await read('./KidExpression.tsx');
assert.match(exprHome, /stageGroups\(/, '目标列表要按学段分组');
assert.match(exprHome, /expression-step-/, '目标卡要显示台阶编号');
assert.match(exprHome, /\{target\.difficulty\}/, '台阶编号必须直接用 difficulty');
assert.doesNotMatch(exprHome, /step=\{i \+ 1\}/, '不允许按列表下标重新编号');
assert.match(exprHome, /stage-filter-/, '要有学段筛选');
assert.match(exprHome, /\$\{scope\}\.stage/, '学段选择要记住（键挂在模块前缀下）');
assert.match(exprHome, /expression-modality-/, '卡片要显示听/说标记');
assert.match(exprHome, /MODALITY_LABEL/, '听/说标记要用统一文案');
// 台阶上限写成常量：曾经写死「/ 10」，补到 11 条后文案就错了。
assert.doesNotMatch(exprHome, /\/\s*10\b/, '台阶总数不能写死，要用 EXPRESSION_TARGETS_BY_STAGE.length');
const exprPlay = await read('./KidExpressionPlay.tsx');
assert.match(exprPlay, /MODALITY_LABEL/, '练习页也要显示听/说标记');
assert.match(exprPlay, /modality === 'receptive'/, '听者反应类目标要有「看动作不要求开口」的说明');
// 教具不能写死在题干里：一律走 fillSlots 替换，且选择要记住
assert.match(exprPlay, /fillSlots/, '题干必须经过教具槽位替换');
assert.match(exprPlay, /material-picker/, '练习页要能选今天的教具');
assert.match(exprPlay, /\$\{scope\}\.materials/, '教具选择要记住，换课不用重选');
assert.match(exprPlay, /materials: picks/, '记录里要存下实际用的教具');
// 题量控制：跳过不计分，且改遍数不能把已判定的试次清掉
assert.match(exprPlay, /skipCurrent/, '要有单题跳过');
assert.match(exprPlay, /skip-trial/, '跳过按钮要可点');
assert.match(exprPlay, /skipped: true/, '跳过要写进记录，不能只是界面消失');
// 改遍数不能整节课清空重来；「换一批」是重新抽题，清空是应该的，所以只查 changeRepeats 函数体
{
  const start = exprPlay.indexOf('const changeRepeats');
  const end = exprPlay.indexOf('const changeMaterial', start);
  assert.ok(start > 0 && end > start, '找不到 changeRepeats 函数');
  const body = exprPlay.slice(start, end);
  assert.doesNotMatch(body, /setIdx\(0\)/, '改遍数不允许把当前试次重置回第一题');
  assert.doesNotMatch(body, /setLines\(\[\]\)/, '改遍数不允许清空对话记录');
  assert.match(body, /kept/, '改遍数要保留已判定的试次');
}
// 反馈页不管对错都要能再练一遍
assert.doesNotMatch(exprPlay, /\{!feedbackCorrect && \(\s*<button/, '答对也要能加练一遍');

// 题库轮换：一节只抽 4 道，练过的往后排
assert.match(exprPlay, /pickSessionTasks/, '练习页要按轮换抽题');
assert.match(exprPlay, /task-pool/, '要显示本节抽到几道 / 题库共几道');
assert.match(exprPlay, /redraw-tasks/, '要有「换一批」');
assert.match(exprPlay, /\$\{scope\}\.rotation/, '轮换记录要存本地，不然每次都是同一批');
assert.doesNotMatch(exprPlay, /fillTasks\(target\.tasks/, '换教具时只能重填本节抽到的题，不能重填整个题库');

// 拼图：动手玩法，不走对话回合制；判定与星星都在本地
const puzzleBoard = await read('./KidPuzzleBoard.tsx');
assert.match(play, /PuzzleSession/, '游戏页遇到拼图要切到盘面组件');
assert.match(puzzleBoard, /data-testid="puzzle-board"/, '要有盘面');
assert.match(puzzleBoard, /data-testid="puzzle-tray"/, '要有碎片小筐');
assert.match(puzzleBoard, /placePuzzlePiece\(/, '放置规则交给 kidPuzzle 的纯函数');
assert.match(puzzleBoard, /puzzleStars\(/, '星星按放错次数算');
assert.match(puzzleBoard, /gameId: 'puzzle'/, '成绩要记到拼图这本账');
assert.match(puzzleBoard, /draggable/, '鼠标要能拖');
assert.match(puzzleBoard, /onClick=\{\(\) => setSelected/, '触屏要能点一下选中');
assert.match(puzzleBoard, /puzzle-preview/, '要给「看看整幅画」的提示');
assert.match(puzzleBoard, /puzzle-reshuffle/, '要能重新打乱');
// 拼图不许把答案直接标在碎片上（比如画序号），否则就失去意义了
assert.doesNotMatch(puzzleBoard, /\{pieceId \+ 1\}<\/span>/, '碎片上不能印编号');
const puzzleConfig = await read('../../config/kidPuzzle.ts');
assert.match(puzzleConfig, /PRESCHOOL_MAX_PIECES/, '小龄要限制块数');
assert.match(puzzleConfig, /backgroundColor|pieceBackground/, '切块靠 background-position');
assert.doesNotMatch(puzzleConfig, /from '.*\.(png|jpg|webp)'/, '画面必须是本地 SVG，不引外部图片');

// 训练场景：先选「在哪练」，再按难度排。老师和家长共用一套标签
assert.match(exprHome, /data-testid="expression-scene-filter"/, '要有场景筛选');
assert.match(exprHome, /scene-filter-\$\{option\.key\}/, '场景 chip 要可点');
assert.match(exprHome, /SETTINGS\.map/, '场景列表来自统一配置，不许页面里硬编码');
assert.match(exprHome, /\$\{scope\}\.scene/, '场景选择要记住（键挂在模块前缀下）');
assert.match(exprHome, /sceneDifficulty\(/, '场景内要按场景难度排序');
assert.match(exprHome, /isPrimaryScene\(/, '要区分主场和备选');
assert.match(exprHome, /data-testid="scene-primary"/, '主场目标单独一段');
assert.match(exprHome, /data-testid="scene-extra"/, '备选目标单独一段');
assert.match(exprHome, /data-testid="scene-extra-toggle"/, '备选段要能折叠，否则「桌面」一栏装 21/23 个目标');
assert.match(exprHome, /scene-tag-/, '卡片上要标明主场在哪个场景 / 本场景难度');
assert.match(exprHome, /showExtra/, '折叠要有状态');
// 场景筛选不能把台阶编号也重排（老坑：按场景重编会出现「4 比 6 难」的错觉）
assert.match(exprHome, /\{target\.difficulty\}/, '圆圈数字仍用全表台阶');
// 场景字段本身
const targetCfg = await read('../../config/expressionTargets.ts');
assert.match(targetCfg, /export type SettingId = 'desk' \| 'floor' \| 'home' \| 'outdoor'/);
assert.match(targetCfg, /export const SETTINGS: SettingMeta\[\]/);
assert.match(targetCfg, /export function sceneDifficulty/);

console.log('kidUi.test.mjs: ok');