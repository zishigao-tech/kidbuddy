import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { unlockParentArea } from '@/config/parentGate';
import { isLessonAreaUnlocked, lessonUnlockLeftMinutes, unlockLessonArea } from '@/config/lessonGate';
import { COGNITION_MODULE, EXPRESSION_MODULE } from '@/config/lessonModules';
import { LIFE_MODULE, type LessonCardModule } from '@/config/chainModule';
import { chainNextUp, dttNextUp, type NextUp } from '@/config/nextUp';
import { useKid } from './KidContext';
import { CompanionAvatar } from './components/ChatBubble';
import { LongPressRing, ParentGateDialog, useLongPress } from './components/ParentGate';
import { PLAYGROUND_CHAT_ID } from './kidRoutes';

/**
 * 训练模块卡片：孩子不能自己进。
 * 没验证过只能长按 1.5 秒弹出验证（短按只给提示，防孩子误触）；验证过之后单击直接进。
 */
function GatedLessonCard({
  module,
  gradient,
  testId,
  next,
}: {
  module: LessonCardModule;
  gradient: string;
  testId: string;
  /** 下次练什么。没账本或全稳了给 null / 全稳提示，这一行就不渲染 */
  next?: NextUp | null;
}) {
  const navigate = useNavigate();
  const unlocked = isLessonAreaUnlocked();
  const left = lessonUnlockLeftMinutes();
  const [open, setOpen] = useState(false);
  const [tapHint, setTapHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completedRef = useRef(false);

  const press = useLongPress(() => {
    completedRef.current = true;
    clearTimeout(hintTimerRef.current);
    setTapHint(false);
    if (!isLessonAreaUnlocked()) setOpen(true);
  });

  useEffect(() => () => clearTimeout(hintTimerRef.current), []);

  const handleClick = () => {
    if (isLessonAreaUnlocked()) {
      navigate(module.basePath);
      return;
    }
    if (completedRef.current) {
      completedRef.current = false;
      return;
    }
    setTapHint(true);
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setTapHint(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        data-testid={testId}
        aria-label={`${module.title}（长按 1.5 秒，需家长或老师验证）`}
        title="长按 1.5 秒进入 · 需家长或老师验证"
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none', WebkitTouchCallout: 'none' }}
        onPointerDown={(e) => {
          completedRef.current = false;
          if (!isLessonAreaUnlocked()) {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            press.start();
          }
        }}
        onPointerUp={press.cancel}
        onPointerCancel={press.cancel}
        onLostPointerCapture={press.cancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isLessonAreaUnlocked()) navigate(module.basePath);
            else setOpen(true);
          }
        }}
        onClick={handleClick}
        className={`relative flex min-h-14 select-none items-center gap-3.5 overflow-hidden rounded-[28px] p-4 text-left transition active:scale-[0.99] ${
          unlocked
            ? `bg-gradient-to-r ${gradient} text-white shadow-md`
            : 'border-2 border-slate-200/90 bg-white text-slate-800 shadow-sm hover:border-slate-300'
        }`}
      >
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${
            unlocked ? 'bg-white/20' : `${module.accent.icon}`
          }`}
          aria-hidden
        >
          {module.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-extrabold">{module.title}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                unlocked ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {unlocked ? `🔓 已解锁 · 剩 ${left} 分` : '🔒 长按 1.5 秒'}
            </span>
          </div>
          {/**
           * 第二行三选一：长按/误触的临时提示 > 下次练什么 > 模块介绍。
           * 练过之后「下次练什么」比宣传语有用，所以让它顶掉那行，
           * 不再多占一行——三列卡本来就只有 250px 宽，叠四行会挤到看不清。
           */}
          {press.pressing || tapHint ? (
            <div
              className={`mt-0.5 truncate text-sm font-bold ${
                press.pressing ? (unlocked ? 'text-white' : module.accent.text) : 'text-amber-600'
              }`}
            >
              {press.pressing ? '别松手，马上进入验证…' : '为防孩子误触，请长按 1.5 秒进入验证'}
            </div>
          ) : next ? (
            <div
              data-testid={`${testId}-next`}
              className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${unlocked ? 'text-white' : 'text-slate-600'}`}
            >
              <span aria-hidden>🎯</span>
              <span className="truncate">下次练 {next.label}</span>
              <span className={`ml-auto shrink-0 text-[11px] font-semibold ${unlocked ? 'text-white/70' : 'text-slate-400'}`}>
                {next.meta}
              </span>
            </div>
          ) : (
            <div className={`mt-0.5 truncate text-sm ${unlocked ? 'text-white/90' : 'text-slate-500'}`}>
              {module.tagline}
            </div>
          )}
        </div>
        <span className={`text-xl font-extrabold ${unlocked ? 'text-white' : 'text-slate-300'}`} aria-hidden>
          →
        </span>
        <LongPressRing pressing={press.pressing} className="rounded-[28px]" />
      </button>

      {open && (
        <ParentGateDialog
          title="课堂入口验证"
          description={`${module.title}是老师带孩子练的训练台，请家长或老师验证后进入。验证后 30 分钟内不用再验证。`}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            unlockLessonArea();
            setOpen(false);
            navigate(module.basePath);
          }}
        />
      )}
    </>
  );
}

export default function KidHome() {
  const navigate = useNavigate();
  const { companions, companionsLoading, memory, aiConfigured, aiConfigChecked } = useKid();
  const [gateOpen, setGateOpen] = useState(false);
  const name = memory.nickname || '小朋友';

  /**
   * 三张卡各自的「下次练什么」。算一次就够：从别的页面回来时 KidHome 会重新挂载。
   * 账本读失败时返回 null，卡片上那一行直接不渲染。
   */
  const nextUps = useMemo(() => {
    try {
      return {
        expression: dttNextUp(EXPRESSION_MODULE, name),
        cognition: dttNextUp(COGNITION_MODULE, name),
        life: chainNextUp(name),
      };
    } catch {
      return { expression: null, cognition: null, life: null };
    }
  }, [name]);

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-2">
      <h1 className="mb-5 text-center text-3xl font-extrabold text-slate-800">
        嗨，{name}！今天想和谁玩？
      </h1>

      {aiConfigChecked && !aiConfigured && (
        <div
          data-testid="setup-guide-card"
          className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-4 rounded-[32px] border-2 border-amber-300 bg-white p-5 shadow-md"
        >
          <div className="min-w-0 flex-1">
            <div className="text-xl font-extrabold text-slate-800">🔑 欢迎！请爸爸妈妈先花 1 分钟配置服务</div>
            <p className="mt-1 text-base text-slate-500">
              只需填入 1 个千问 Token Plan Key，就能一次开启伙伴聊天、语音朗读、魔法画室与绘本共创。
            </p>
          </div>
          <button
            type="button"
            data-testid="go-quick-setup"
            onClick={() => {
              unlockParentArea();
              navigate('/parent');
            }}
            className="flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-amber-400 px-6 text-lg font-extrabold text-white shadow-sm active:scale-[0.98]"
          >
            去一键配置 →
          </button>
        </div>
      )}

      {/* 儿童创意玩耍主力入口：绘本魔法屋 & 魔法画室 */}
      <div className="mx-auto mb-5 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          to="/books"
          data-testid="books-card"
          className="flex items-center gap-4 rounded-[32px] bg-gradient-to-r from-violet-400 to-fuchsia-400 p-5 text-white shadow-lg transition hover:shadow-xl active:scale-[0.99]"
        >
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl" aria-hidden>
            📖
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold">绘本魔法屋</div>
            <div className="mt-0.5 text-sm opacity-95">共创 4 页中英双语有声绘本</div>
          </div>
          <span className="text-2xl font-extrabold" aria-hidden>→</span>
        </Link>

        <Link
          to="/draw"
          data-testid="draw-card"
          className="flex items-center gap-4 rounded-[32px] bg-gradient-to-r from-sky-400 to-cyan-500 p-5 text-white shadow-lg transition hover:shadow-xl active:scale-[0.99]"
        >
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-4xl" aria-hidden>
            🎨
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-extrabold">魔法画室</div>
            <div className="mt-0.5 text-sm opacity-95">说话与涂鸦变成绘本插画</div>
          </div>
          <span className="text-2xl font-extrabold" aria-hidden>→</span>
        </Link>
      </div>

      <Link
        to={`/chat/${PLAYGROUND_CHAT_ID}`}
        data-testid="playground-card"
        className="mx-auto mb-5 flex max-w-5xl items-center gap-4 rounded-[32px] bg-gradient-to-r from-amber-300 to-orange-300 p-5 text-white shadow-lg active:scale-[0.99]"
      >
        <div className="flex -space-x-4">
          {companions.map((c) => (
            <CompanionAvatar key={c.member.id} companion={c} size={64} />
          ))}
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-extrabold">小伙伴乐园</div>
          <div className="text-base opacity-90">大家一起聊天，谁最懂就谁来回答</div>
        </div>
        <span className="ml-auto text-4xl" aria-hidden>🎪</span>
      </Link>

      {companionsLoading && companions.length === 0 ? (
        <p className="text-center text-lg text-slate-500">小伙伴们正在赶来……</p>
      ) : (
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 lg:grid-cols-4">
          {companions.map((c) => (
            <Link
              key={c.member.id}
              to={`/chat/${c.member.id}`}
              data-testid={`companion-card-${c.member.id}`}
              className="flex flex-col items-center gap-3 rounded-[32px] border-4 bg-white p-5 text-center shadow-md active:scale-[0.98]"
              style={{ borderColor: `${c.meta.color}55` }}
            >
              <CompanionAvatar companion={c} size={112} />
              <div className="text-2xl font-extrabold" style={{ color: c.meta.color }}>
                {c.meta.emoji} {c.member.name}
              </div>
              <div className="text-base leading-snug text-slate-500">{c.member.description}</div>
              <div className="rounded-full px-3 py-1 text-sm font-medium" style={{ background: `${c.meta.color}18`, color: c.meta.color }}>
                “{c.meta.catchphrase}”
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        to="/games"
        className="mx-auto mt-5 flex max-w-5xl items-center justify-center gap-3 rounded-[32px] bg-white/80 p-5 text-2xl font-bold text-sky-600 shadow-md"
      >
        <span aria-hidden>🎲</span> 和小伙伴玩游戏
      </Link>

      {/* 成人带练训练专区：视觉与孩子娱乐区分隔，避免孩子随手点入打乱课堂账本 */}
      <section
        aria-label="老师与家长带练专区"
        className="mx-auto mt-6 max-w-5xl rounded-[32px] border-2 border-slate-200/80 bg-white/75 p-4 shadow-sm backdrop-blur"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-base font-extrabold text-slate-700">
            <span aria-hidden>👩‍🏫</span>
            <span>老师 / 家长带练专区</span>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            需长按 1.5 秒并验证进入 · 防孩子误触
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <GatedLessonCard
            module={EXPRESSION_MODULE}
            gradient="from-rose-400 to-orange-400"
            testId="expression-card"
            next={nextUps.expression}
          />
          <GatedLessonCard
            module={COGNITION_MODULE}
            gradient="from-indigo-400 to-violet-500"
            testId="cognition-card"
            next={nextUps.cognition}
          />
          <GatedLessonCard module={LIFE_MODULE} gradient="from-sky-400 to-teal-400" testId="life-card" next={nextUps.life} />
        </div>
      </section>

      <button
        type="button"
        data-testid="parent-entry"
        onClick={() => setGateOpen(true)}
        className="mx-auto mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-slate-400 transition hover:bg-white/70 hover:text-slate-600"
      >
        <span aria-hidden>⚙️</span> 家长中心（需家长验证）
      </button>

      {gateOpen && (
        <ParentGateDialog
          onClose={() => setGateOpen(false)}
          onSuccess={() => {
            unlockParentArea();
            setGateOpen(false);
            navigate('/parent');
          }}
        />
      )}
    </div>
  );
}
