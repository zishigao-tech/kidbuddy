import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MAX_KID_LEVEL } from '@/config/aiGame';
import {
  createPuzzleRun,
  isPuzzleSolved,
  pieceBackground,
  placePuzzlePiece,
  puzzleCheer,
  puzzleLevelFor,
  puzzlePlacedCount,
  puzzleStars,
  takePuzzlePieceBack,
  type PuzzleBand,
  type PuzzleRun,
} from '@/config/kidPuzzle';
import { useKid, type KidCompanion } from './KidContext';
import { CompanionAvatar } from './components/ChatBubble';
import { StarRow } from './components/StarRow';

/** 一整块拼图的样子：用 background-position 从整图里“取景”出这一格 */
function pieceStyle(level: ReturnType<typeof puzzleLevelFor>, pieceId: number) {
  return pieceBackground(level.scene, pieceId, level.rows, level.cols);
}

export function PuzzleSession({
  levelNumber,
  band,
  host,
  onReplay,
}: {
  levelNumber: number;
  band: PuzzleBand;
  host: KidCompanion;
  onReplay: () => void;
}) {
  const navigate = useNavigate();
  const { recordGame } = useKid();
  const level = useMemo(() => puzzleLevelFor(levelNumber, band), [levelNumber, band]);
  const [run, setRun] = useState<PuzzleRun>(() => createPuzzleRun(level.pieces));
  const [selected, setSelected] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongSlot, setWrongSlot] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [result, setResult] = useState<{ stars: number; starsGained: number } | null>(null);

  const placed = puzzlePlacedCount(run);
  const cheer = result ? '拼好啦！' : puzzleCheer(placed, level.pieces, mistakes);
  const nextLevel = level.levelNumber < MAX_KID_LEVEL ? level.levelNumber + 1 : null;

  // 高亮“放错了”的格子，400ms 后自己消失
  useEffect(() => {
    if (wrongSlot === null) return;
    const timer = window.setTimeout(() => setWrongSlot(null), 450);
    return () => window.clearTimeout(timer);
  }, [wrongSlot]);

  // 看整图 4 秒后自动收起，避免孩子一直盯着底图抄
  useEffect(() => {
    if (!preview) return;
    const timer = window.setTimeout(() => setPreview(false), 4000);
    return () => window.clearTimeout(timer);
  }, [preview]);

  const finish = (stars: number) => {
    const starsGained = recordGame({
      gameId: 'puzzle',
      levelId: level.id,
      levelNumber: level.levelNumber,
      stars,
    });
    setResult({ stars, starsGained });
  };

  const attempt = (pieceId: number, slot: number) => {
    if (result) return;
    const outcome = placePuzzlePiece(run, pieceId, slot);
    if (!outcome.correct) {
      setMistakes((value) => value + 1);
      setWrongSlot(slot);
      setSelected(null);
      return;
    }
    setRun(outcome.run);
    setSelected(null);
    if (isPuzzleSolved(outcome.run)) finish(puzzleStars(level, { mistakes, hintsUsed }));
  };

  const handleSlot = (slot: number) => {
    if (result) return;
    if (run.board[slot] !== null) {
      // 已经放上去的块，点一下拿回小筐
      setRun(takePuzzlePieceBack(run, slot));
      return;
    }
    if (selected === null) return;
    attempt(selected, slot);
  };

  const reshuffle = () => {
    if (result) return;
    setRun(createPuzzleRun(level.pieces));
    setSelected(null);
  };

  const openPreview = () => {
    if (result) return;
    setHintsUsed((value) => value + 1);
    setPreview(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="kid-puzzle" data-level={level.levelNumber}>
      <div className="flex shrink-0 items-center gap-3 px-4 pb-2">
        <Link to={`/games/puzzle`} aria-label="返回" className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-sm">
          ←
        </Link>
        <CompanionAvatar companion={host} size={48} />
        <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold">
          第 {level.levelNumber} 关 · {level.emoji} {level.title}
        </h1>
      </div>

      <div className="mx-4 mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-3xl bg-amber-100/80 px-5 py-3 text-lg text-amber-800" data-testid="puzzle-status">
        <span>
          已拼 <b>{placed}</b> / {level.pieces} 块
        </span>
        <span className="text-amber-700">放错 {mistakes} 次</span>
        <span className="ml-auto text-base text-amber-700">{level.rows} × {level.cols}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
        <div className="mx-auto w-full max-w-[520px]">
          {/* 底板：淡淡的整图做底，给孩子一个参照 */}
          <div className="relative aspect-square w-full overflow-hidden rounded-[28px] bg-white shadow-inner" data-testid="puzzle-board">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.18]"
              style={{
                backgroundImage: pieceStyle(level, 0).backgroundImage,
                backgroundSize: '100% 100%',
              }}
            />
            <div
              className="absolute inset-0 grid gap-1 p-1"
              style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}
            >
              {run.board.map((pieceId, slot) => {
                const isWrong = wrongSlot === slot;
                const filled = pieceId !== null;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleSlot(slot)}
                    onDragOver={(event) => {
                      if (filled) return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const raw = event.dataTransfer.getData('text/plain');
                      if (raw === '') return;
                      const dropped = Number(raw);
                      if (!Number.isInteger(dropped)) return;
                      attempt(dropped, slot);
                    }}
                    aria-label={filled ? `第 ${slot + 1} 格已放好，点一下取回` : `第 ${slot + 1} 格，空`}
                    data-testid={`puzzle-slot-${slot}`}
                    data-filled={filled ? '1' : '0'}
                    className={`aspect-square min-h-12 overflow-hidden rounded-xl border-2 transition ${
                      filled
                        ? 'border-white bg-white shadow-sm'
                        : isWrong
                          ? 'border-rose-400 bg-rose-50'
                          : 'border-dashed border-slate-300 bg-slate-100/60'
                    }`}
                    style={filled ? pieceStyle(level, pieceId) : undefined}
                  >
                    {filled ? <span className="sr-only">{`第 ${slot + 1} 块`}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 rounded-3xl bg-white/90 px-4 py-3 text-center text-lg text-slate-600" data-testid="puzzle-cheer">
            <span className="mr-1" aria-hidden>{host.meta.emoji}</span>
            {cheer}
          </div>

          {!result && (
            <div className="mt-3 rounded-[28px] bg-white p-3 shadow-md">
              <div className="mb-2 flex items-center justify-between px-1 text-base text-slate-500">
                <span>小筐里的碎片</span>
                <span>还剩 {run.tray.length} 块</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2" data-testid="puzzle-tray">
                {run.tray.map((pieceId) => (
                  <button
                    key={pieceId}
                    type="button"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', String(pieceId))}
                    onClick={() => setSelected(selected === pieceId ? null : pieceId)}
                    aria-label={`碎片 ${pieceId + 1}`}
                    aria-pressed={selected === pieceId}
                    data-testid={`puzzle-piece-${pieceId}`}
                    className={`h-16 w-16 min-h-12 overflow-hidden rounded-xl border-2 shadow-sm transition active:scale-95 ${
                      selected === pieceId ? 'border-amber-400 ring-4 ring-amber-200' : 'border-white'
                    }`}
                    style={pieceStyle(level, pieceId)}
                  />
                ))}
              </div>
              {run.tray.length === 0 && <p className="py-3 text-center text-base text-slate-500">碎片都放上去啦～</p>}
            </div>
          )}

          {result && (
            <div className="mx-auto mt-3 flex max-w-md flex-col items-center gap-3 rounded-[32px] bg-white p-6 text-center shadow-lg" data-testid="game-result">
              <div className="text-3xl font-extrabold">{result.stars > 0 ? '拼好啦！' : '没关系，再来一次！'}</div>
              <StarRow count={result.stars} size={44} />
              {result.starsGained > 0 && <div className="text-lg text-amber-600">获得 {result.starsGained} 颗新星星</div>}
              <div className="mt-2 grid w-full grid-cols-2 gap-3">
                <button type="button" onClick={onReplay} className="h-14 rounded-2xl bg-slate-100 text-lg font-bold text-slate-600">
                  再玩一次
                </button>
                {result.stars > 0 && nextLevel ? (
                  <button
                    type="button"
                    data-testid="next-level"
                    onClick={() => navigate(`/games/puzzle/${nextLevel}`)}
                    className="h-14 rounded-2xl bg-amber-400 text-lg font-bold text-white"
                  >
                    下一关
                  </button>
                ) : (
                  <Link to="/games/puzzle" className="flex h-14 items-center justify-center rounded-2xl bg-amber-400 text-lg font-bold text-white">
                    选关卡
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!result && (
        <div className="flex shrink-0 gap-3 px-4 pb-3">
          <button
            type="button"
            onClick={openPreview}
            data-testid="puzzle-preview"
            className="h-14 flex-1 rounded-2xl bg-white text-lg font-bold text-indigo-600 shadow-sm"
          >
            👀 看看整幅画
          </button>
          <button
            type="button"
            onClick={reshuffle}
            data-testid="puzzle-reshuffle"
            className="h-14 flex-1 rounded-2xl bg-white text-lg font-bold text-slate-500 shadow-sm"
          >
            🔀 重新打乱
          </button>
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6"
          role="dialog"
          aria-label="整幅画预览"
          data-testid="puzzle-preview-modal"
          onClick={() => setPreview(false)}
        >
          <div className="w-full max-w-md rounded-[32px] bg-white p-4 shadow-2xl">
            <div
              className="aspect-square w-full rounded-2xl"
              style={{
                backgroundImage: pieceStyle(level, 0).backgroundImage,
                backgroundSize: '100% 100%',
              }}
            />
            <p className="mt-3 text-center text-lg text-slate-600">记住它，待会儿就靠你啦～</p>
            <button type="button" onClick={() => setPreview(false)} className="mt-3 h-14 w-full rounded-2xl bg-amber-400 text-lg font-bold text-white">
              开始拼
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
