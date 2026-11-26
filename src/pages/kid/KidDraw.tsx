import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_ART_STYLE,
  DRAW_INSPIRATIONS,
  KID_ART_STYLES,
  getArtStyle,
  type ArtStyleId,
  type KidArtworkRecord,
} from '@/config/kidArt';
import {
  animateKidArtwork,
  deleteKidArtwork,
  downloadArtworkPng,
  enhanceDrawingIdea,
  generateKidImage,
  listKidArtworks,
  resolveArtworkSrc,
  saveKidArtwork,
  saveSketchDataUrl,
} from '@/lib/kidImage';
import { moduleVoiceKey } from '@/config/speechConfig';
import { useKid } from './KidContext';
import { KidInputBar } from './components/KidInputBar';
import { useReadAloud } from './hooks/useReadAloud';

const DRAW_SPEAKER_ID = 'kid-drawing-bunny';
const DRAW_VOICE_SCOPE = moduleVoiceKey('draw');

function buildDrawPraise(art: KidArtworkRecord): string {
  const styleLabel = getArtStyle(art.style).label;
  if (art.mode === 'sketch') {
    return `哇，你的涂鸦施完魔法变成《${art.title}》啦！用了${styleLabel}画风，真有想象力，画画兔已经帮你存进画廊咯！`;
  }
  return `哇，《${art.title}》画好啦！这幅${styleLabel}作品真棒，画画兔已经帮你存进画廊咯！`;
}

const SKETCH_COLORS = [
  { value: '#1E293B', label: '黑色' },
  { value: '#EF4444', label: '红色' },
  { value: '#F59E0B', label: '橙黄' },
  { value: '#10B981', label: '绿色' },
  { value: '#3B82F6', label: '蓝色' },
  { value: '#A855F7', label: '紫色' },
];

const BRUSH_SIZES = [
  { size: 4, label: '细笔' },
  { size: 10, label: '中笔' },
  { size: 18, label: '粗笔' },
];

const CANVAS_W = 800;
const CANVAS_H = 480;

export default function KidDraw() {
  const navigate = useNavigate();
  const { voice, setVoicePrefs } = useKid();
  const readAloud = useReadAloud();
  const [mode, setMode] = useState<'text' | 'sketch'>('text');
  const [style, setStyle] = useState<ArtStyleId>(DEFAULT_ART_STYLE);
  const [busy, setBusy] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [showVideoLatest, setShowVideoLatest] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [artworks, setArtworks] = useState<KidArtworkRecord[]>([]);
  const [latest, setLatest] = useState<KidArtworkRecord | null>(null);
  const [preview, setPreview] = useState<KidArtworkRecord | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // 涂鸦画板状态
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);
  const [brushColor, setBrushColor] = useState(SKETCH_COLORS[0].value);
  const [isEraser, setIsEraser] = useState(false);
  const [brushSize, setBrushSize] = useState(10);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    void listKidArtworks().then(setArtworks);
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    historyRef.current = [ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)];
    setHasStroke(false);
  };

  useEffect(() => {
    if (mode === 'sketch') {
      // 等画布挂载后初始化白底
      const raf = requestAnimationFrame(() => initCanvas());
      return () => cancelAnimationFrame(raf);
    }
  }, [mode]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * CANVAS_W) / rect.width,
      y: ((e.clientY - rect.top) * CANVAS_H) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPoint(e);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#FFFFFF' : brushColor;
    ctx.lineWidth = isEraser ? brushSize * 2 : brushSize;
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setHasStroke(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    historyRef.current = [...historyRef.current.slice(-14), snapshot];
  };

  const handleUndo = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || historyRef.current.length <= 1) return;
    const nextHistory = historyRef.current.slice(0, -1);
    historyRef.current = nextHistory;
    ctx.putImageData(nextHistory[nextHistory.length - 1], 0, 0);
    setHasStroke(nextHistory.length > 1);
  };

  const handleGenerate = async (idea: string) => {
    const trimmed = idea.trim();
    if (!trimmed || busy) return;
    if (mode === 'sketch' && !hasStroke) {
      setErrorMsg('先在白色画板上随手画几笔，再让画画兔施魔法吧！');
      return;
    }

    readAloud.cancel();
    setBusy(true);
    setErrorMsg('');
    setStatusText('画画兔正在给你的想法加上色彩魔法……');

    try {
      let sketchDataUrl: string | undefined;
      let sketchPath: string | null = null;
      if (mode === 'sketch' && canvasRef.current) {
        sketchDataUrl = canvasRef.current.toDataURL('image/png');
      }

      const enhanced = await enhanceDrawingIdea(trimmed, style, mode === 'sketch');
      setStatusText('正在把奇思妙想画成精美插画，请稍等几秒……');

      const generated = await generateKidImage({
        subject: enhanced || trimmed,
        style,
        isSketch: mode === 'sketch',
        referenceImageDataUrl: sketchDataUrl,
      });

      if (sketchDataUrl) {
        sketchPath = await saveSketchDataUrl(sketchDataUrl);
      }

      const record: KidArtworkRecord = {
        id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: trimmed.slice(0, 24),
        prompt: enhanced || trimmed,
        style,
        mode,
        imagePath: generated.path,
        sketchPath,
        createdAt: Date.now(),
      };
      await saveKidArtwork(record);
      setLatest(record);
      setShowVideoLatest(false);
      setArtworks((prev) => [record, ...prev]);
      if (voice.autoReadAloud && readAloud.supported) {
        readAloud.speakNow(buildDrawPraise(record), DRAW_SPEAKER_ID, DRAW_VOICE_SCOPE);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setStatusText('');
    }
  };

  const handleAnimate = async (art: KidArtworkRecord, source: 'latest' | 'preview') => {
    if (animatingId || busy) return;
    readAloud.cancel();
    setAnimatingId(art.id);
    setErrorMsg('');
    try {
      const updated = await animateKidArtwork(art);
      setArtworks((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      if (latest?.id === updated.id) {
        setLatest(updated);
        if (source === 'latest') setShowVideoLatest(true);
      }
      if (preview?.id === updated.id) {
        setPreview(updated);
        if (source === 'preview') setShowVideoPreview(true);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setAnimatingId(null);
    }
  };

  const goToStorybook = (art: KidArtworkRecord) => {
    readAloud.cancel();
    navigate('/books/new', { state: { fromArtwork: art } });
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    await deleteKidArtwork(id);
    setArtworks((prev) => prev.filter((a) => a.id !== id));
    if (latest?.id === id) setLatest(null);
    if (preview?.id === id) setPreview(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="kid-draw-page">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* 顶部标题与模式切换 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800">🎨 画画兔魔法画室</h1>
              <p className="text-base text-slate-500">说出一句话，或者画几笔涂鸦，马上变成绘本大片</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2 rounded-full bg-white/80 p-1.5 shadow-sm">
                <button
                  type="button"
                  data-testid="draw-mode-text"
                  onClick={() => {
                    setMode('text');
                    setErrorMsg('');
                  }}
                  className={`flex h-12 items-center gap-2 rounded-full px-5 text-base font-bold transition ${
                    mode === 'text' ? 'bg-amber-400 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  ✨ 说话变画
                </button>
                <button
                  type="button"
                  data-testid="draw-mode-sketch"
                  onClick={() => {
                    setMode('sketch');
                    setErrorMsg('');
                  }}
                  className={`flex h-12 items-center gap-2 rounded-full px-5 text-base font-bold transition ${
                    mode === 'sketch' ? 'bg-amber-400 text-white shadow-sm' : 'text-slate-600'
                  }`}
                >
                  🖍️ 涂鸦变魔术
                </button>
              </div>
              {readAloud.supported && (
                <button
                  type="button"
                  data-testid="draw-voice-toggle"
                  onClick={() => {
                    if (voice.autoReadAloud) readAloud.cancel();
                    setVoicePrefs({ autoReadAloud: !voice.autoReadAloud });
                  }}
                  className={`flex h-12 items-center gap-1.5 rounded-full px-4 text-sm font-bold shadow-sm transition ${
                    voice.autoReadAloud ? 'bg-sky-400 text-white' : 'bg-white text-slate-500'
                  }`}
                >
                  <span aria-hidden>{voice.autoReadAloud ? '🔊' : '🔈'}</span>
                  <span>{voice.autoReadAloud ? '语音播报' : '播报关'}</span>
                </button>
              )}
            </div>
          </div>

          {/* 画风选择 */}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {KID_ART_STYLES.map((item) => {
              const active = style === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`style-${item.id}`}
                  onClick={() => setStyle(item.id)}
                  className={`flex min-h-14 items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-2 px-3 py-2 text-base font-bold shadow-sm transition active:scale-[0.98] ${
                    active ? 'bg-white text-slate-800 shadow-md' : 'border-transparent bg-white/70 text-slate-600'
                  }`}
                  style={{ borderColor: active ? item.accent : undefined, backgroundColor: active ? item.bg : undefined }}
                >
                  <span className="text-xl" aria-hidden>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* 错误或生成中提示 */}
          {errorMsg && (
            <div className="rounded-3xl border-2 border-rose-200 bg-rose-50 px-5 py-3 text-base font-medium text-rose-600">
              {errorMsg}
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[32px] bg-white p-8 text-center shadow-md">
              <div className="text-5xl animate-bounce" aria-hidden>🐰🎨</div>
              <div className="text-xl font-extrabold text-slate-700">{statusText || '画画兔正在施魔法…'}</div>
              <p className="text-sm text-slate-400">画好后会自动存进你的画廊，马上就好～</p>
            </div>
          )}

          {/* 最新作品大展示 */}
          {!busy && latest && (
            <div className="rounded-[32px] bg-white p-5 shadow-md" data-testid="latest-artwork">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xl font-extrabold text-slate-800">✨ 刚画好的作品：《{latest.title}》</div>
                <div className="flex flex-wrap gap-2">
                  {readAloud.supported && (
                    <button
                      type="button"
                      onClick={() => readAloud.speakNow(buildDrawPraise(latest), DRAW_SPEAKER_ID, DRAW_VOICE_SCOPE)}
                      className="flex h-12 items-center gap-1.5 rounded-2xl bg-amber-100 px-4 text-base font-bold text-amber-800 shadow-sm"
                    >
                      🔊 听画画兔夸夸
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="draw-to-storybook"
                    onClick={() => goToStorybook(latest)}
                    className="flex h-12 items-center gap-1.5 rounded-2xl bg-purple-500 px-4 text-base font-bold text-white shadow-sm"
                  >
                    📖 用它编绘本
                  </button>
                  {latest.videoPath ? (
                    <button
                      type="button"
                      onClick={() => setShowVideoLatest((v) => !v)}
                      className="flex h-12 items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 text-base font-bold text-white shadow-sm"
                    >
                      {showVideoLatest ? '🖼️ 看原图' : '🎬 播放动画'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="animate-artwork-btn"
                      disabled={Boolean(animatingId)}
                      onClick={() => void handleAnimate(latest, 'latest')}
                      className="flex h-12 items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 text-base font-bold text-white shadow-sm disabled:opacity-50"
                    >
                      {animatingId === latest.id ? '🎬 动画生成中…' : '🎬 让画动起来'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void downloadArtworkPng(latest)}
                    className="flex h-12 items-center gap-2 rounded-2xl bg-sky-500 px-5 text-base font-bold text-white shadow-sm"
                  >
                    ⬇️ 保存图片
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      readAloud.cancel();
                      setLatest(null);
                    }}
                    className="flex h-12 items-center rounded-2xl bg-slate-100 px-4 text-base font-bold text-slate-600"
                  >
                    收起
                  </button>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl bg-amber-50/50">
                {showVideoLatest && latest.videoPath ? (
                  <video
                    src={resolveArtworkSrc(latest.videoPath)}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="mx-auto max-h-[420px] w-auto rounded-2xl"
                  />
                ) : (
                  <img
                    src={resolveArtworkSrc(latest.imagePath)}
                    alt={latest.title}
                    className="mx-auto max-h-[420px] w-auto object-contain"
                  />
                )}
              </div>
            </div>
          )}

          {/* 涂鸦画板 */}
          {mode === 'sketch' && (
            <div className="rounded-[32px] bg-white p-4 shadow-md" data-testid="sketch-board">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {SKETCH_COLORS.map((c) => {
                  const selected = !isEraser && brushColor === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={`选择${c.label}`}
                      onClick={() => {
                        setBrushColor(c.value);
                        setIsEraser(false);
                      }}
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-4 transition ${
                        selected ? 'scale-105 border-amber-400 shadow-md' : 'border-slate-100'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  );
                })}
                <div className="mx-1 h-8 w-px bg-slate-200" />
                {BRUSH_SIZES.map((b) => (
                  <button
                    key={b.size}
                    type="button"
                    onClick={() => setBrushSize(b.size)}
                    className={`flex h-12 items-center rounded-2xl px-4 text-sm font-bold ${
                      brushSize === b.size ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsEraser((v) => !v)}
                  className={`flex h-12 items-center rounded-2xl px-4 text-sm font-bold ${
                    isEraser ? 'bg-rose-400 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  🧽 橡皮
                </button>
                <button
                  type="button"
                  onClick={handleUndo}
                  className="flex h-12 items-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-600"
                >
                  ↩️ 撤销
                </button>
                <button
                  type="button"
                  onClick={initCanvas}
                  className="flex h-12 items-center rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-600"
                >
                  🗑️ 清空
                </button>
              </div>
              <div className="mx-auto w-fit max-w-full overflow-hidden rounded-2xl border-2 border-dashed border-amber-200 bg-white">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={{ touchAction: 'none' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="block aspect-[5/3] h-[38vh] max-h-[380px] min-h-[240px] w-auto max-w-full cursor-crosshair"
                />
              </div>
              <p className="mt-2 text-center text-sm text-slate-400">
                在画板上画出大概轮廓后，在下方说出你想变成什么（如“变成在森林里探险的小恐龙”）
              </p>
            </div>
          )}

          {/* 说话变画灵感池 */}
          {mode === 'text' && (
            <div className="rounded-[28px] bg-white/80 p-4 shadow-sm">
              <div className="mb-2 text-sm font-bold text-slate-500">💡 没想好画什么？点一个灵感试试：</div>
              <div className="flex flex-wrap gap-2">
                {DRAW_INSPIRATIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleGenerate(item)}
                    className="min-h-12 rounded-full border-2 border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 我的画廊 */}
          <div>
            <h2 className="mb-3 text-xl font-extrabold text-slate-800">🖼️ 我的魔法画廊（{artworks.length}）</h2>
            {artworks.length === 0 ? (
              <div className="rounded-[28px] bg-white/70 p-8 text-center text-base text-slate-400">
                还没有画作，在下面说出你的第一个画面想法吧！
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {artworks.map((art) => {
                  const styleMeta = getArtStyle(art.style);
                  return (
                    <div key={art.id} className="flex flex-col overflow-hidden rounded-[24px] bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => {
                          setPreview(art);
                          setShowVideoPreview(Boolean(art.videoPath));
                        }}
                        className="relative flex min-h-40 w-full items-center justify-center overflow-hidden bg-slate-50"
                      >
                        <img
                          src={resolveArtworkSrc(art.imagePath)}
                          alt={art.title}
                          className="h-44 w-full object-cover"
                        />
                        {art.videoPath && (
                          <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-xs font-extrabold text-white shadow-sm">
                            🎬 动画
                          </span>
                        )}
                      </button>
                      <div className="flex flex-1 flex-col gap-2 p-3">
                        <div className="truncate text-base font-bold text-slate-800">{art.title}</div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>{styleMeta.emoji} {styleMeta.label}</span>
                          <span>{art.mode === 'sketch' ? '涂鸦魔术' : '说话变画'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDelete(art.id)}
                          className={`mt-auto flex h-12 w-full items-center justify-center rounded-xl text-xs font-bold ${
                            confirmDeleteId === art.id ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {confirmDeleteId === art.id ? '再点一次确认删除' : '删除'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <KidInputBar
        disabled={busy}
        placeholder={mode === 'sketch' ? '说说想把涂鸦变成什么…' : '告诉画画兔你想画什么…'}
        suggestions={mode === 'sketch' ? ['变成森林里探险的小动物', '变成梦幻绘本城堡', '变成发光的太空飞船'] : undefined}
        onSend={(text) => void handleGenerate(text)}
      />

      {/* 大图预览弹窗 */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 rounded-[32px] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="truncate text-2xl font-extrabold text-slate-800">{preview.title}</h3>
              <button
                type="button"
                onClick={() => {
                  readAloud.cancel();
                  setPreview(null);
                }}
                className="flex h-12 items-center rounded-2xl bg-slate-100 px-5 text-base font-bold text-slate-600"
              >
                关闭
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
              {showVideoPreview && preview.videoPath ? (
                <video
                  src={resolveArtworkSrc(preview.videoPath)}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="max-h-[60vh] w-auto rounded-2xl"
                />
              ) : (
                <img
                  src={resolveArtworkSrc(preview.imagePath)}
                  alt={preview.title}
                  className="max-h-[60vh] w-auto object-contain"
                />
              )}
            </div>
            <p className="text-sm text-slate-500">{preview.prompt}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {readAloud.supported && (
                <button
                  type="button"
                  onClick={() => readAloud.speakNow(buildDrawPraise(preview), DRAW_SPEAKER_ID, DRAW_VOICE_SCOPE)}
                  className="flex h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-amber-100 px-4 text-sm font-bold text-amber-800"
                >
                  🔊 听画画兔夸夸
                </button>
              )}
              <button
                type="button"
                onClick={() => goToStorybook(preview)}
                className="flex h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-purple-500 px-4 text-sm font-bold text-white"
              >
                📖 用它编绘本
              </button>
              {preview.videoPath ? (
                <button
                  type="button"
                  onClick={() => setShowVideoPreview((v) => !v)}
                  className="flex h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-emerald-500 px-4 text-sm font-bold text-white"
                >
                  {showVideoPreview ? '🖼️ 看原图' : '🎬 播放动画'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(animatingId)}
                  onClick={() => void handleAnimate(preview, 'preview')}
                  className="flex h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-emerald-500 px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  {animatingId === preview.id ? '🎬 动画生成中…' : '🎬 让画动起来'}
                </button>
              )}
              <button
                type="button"
                onClick={() => void downloadArtworkPng(preview)}
                className="flex h-12 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-sky-500 px-4 text-sm font-bold text-white"
              >
                ⬇️ 保存到本地
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(preview.id)}
                className={`ml-auto flex h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl px-4 text-sm font-bold ${
                  confirmDeleteId === preview.id ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'
                }`}
              >
                {confirmDeleteId === preview.id ? '确认删除' : '删除作品'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
