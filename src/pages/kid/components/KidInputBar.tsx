import { useEffect, useRef, useState } from 'react';
import type { SpeechErrorCode, SpeechRecognizer } from '@/lib/speech';
import { compressImageFileToDataUrl } from '@/lib/visionImage';
import { useKid } from '../KidContext';

interface KidInputBarProps {
  disabled?: boolean;
  /** 按住说话是否禁用，默认同 disabled */
  talkDisabled?: boolean;
  placeholder?: string;
  onSend: (text: string, imageDataUrl?: string) => void;
  /** 一键发送的快捷话题 */
  suggestions?: string[];
  /** 替换默认的语音识别（实时语音对话） */
  recognizer?: SpeechRecognizer;
  /** 为 true 时语音结果不再走 onSend，由 recognizer 自己处理回复 */
  voiceRepliesItself?: boolean;
  /** 语音识别偏好语言，如 'zh-CN' / 'en-US' */
  speechLang?: string;
  /** 是否允许发送照片/画作让伙伴看图回答 */
  allowImage?: boolean;
  /** 附带图片后的快捷提问芯片 */
  imageSuggestions?: string[];
  /** 通知外层当前是否附带了待发送图片 */
  onPendingImageChange?: (hasImage: boolean) => void;
  /** 可选内容最大宽度（如 max-w-6xl），与上方双栏页面对齐 */
  maxWidthClass?: string;
}

const DEFAULT_IMAGE_SUGGESTIONS = ['这里面是什么呀？', '夸夸我的作品', '帮我讲讲这张图'];

const speechErrorText: Partial<Record<SpeechErrorCode, string>> = {
  'not-allowed': '麦克风没有打开，请让爸爸妈妈帮忙打开权限。',
  'no-speech': '没有听到声音，再按住说一次吧～',
  network: '网络不太好，可以先打字哦。',
};

function isEditableElement(el: EventTarget | null): boolean {
  if (!el || typeof (el as HTMLElement).tagName !== 'string') return false;
  const node = el as HTMLElement;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || node.isContentEditable;
}

export function KidInputBar({
  disabled,
  talkDisabled = disabled,
  placeholder = '想说点什么？',
  onSend,
  suggestions,
  recognizer: recognizerOverride,
  voiceRepliesItself,
  speechLang = 'zh-CN',
  allowImage = false,
  imageSuggestions,
  onPendingImageChange,
  maxWidthClass,
}: KidInputBarProps) {
  const { voice, setVoicePrefs, recognizer: defaultRecognizer, profile } = useKid();
  const recognizer = recognizerOverride || defaultRecognizer;
  const [text, setText] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [draggingImage, setDraggingImage] = useState(false);
  const [listening, setListening] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [partial, setPartial] = useState('');
  const [hint, setHint] = useState('');
  const listeningRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageRef = useRef<string | null>(null);
  pendingImageRef.current = pendingImage;

  const useVoice = voice.inputMode === 'voice' && recognizer.supported;
  const fontSize = profile.band === 'preschool' ? 22 : 19;

  useEffect(() => {
    onPendingImageChange?.(Boolean(pendingImage));
  }, [pendingImage, onPendingImageChange]);

  useEffect(() => () => recognizer.abort(), [recognizer]);

  const send = (value: string) => {
    const img = pendingImageRef.current || undefined;
    const content = value.trim() || (img ? '帮我看看这张图！' : '');
    if (!content || disabled) return;
    onSend(content, img);
    setText('');
    setPendingImage(null);
    setHint('');
  };

  const attachFile = async (file: File | Blob) => {
    if (!allowImage || disabled) return;
    try {
      setHint('');
      const compressed = await compressImageFileToDataUrl(file);
      setPendingImage(compressed);
    } catch (err) {
      setHint(err instanceof Error ? err.message : '图片没能读取成功，换一张试试吧');
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!allowImage) return;
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (file) {
      e.preventDefault();
      void attachFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    setDraggingImage(false);
    if (!allowImage) return;
    const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      void attachFile(file);
    }
  };

  const startListening = () => {
    if (talkDisabled || listeningRef.current) return;
    listeningRef.current = true;
    setListening(true);
    setPartial('');
    setHint('');
    recognizer.start(
      {
        onPartial: setPartial,
        onFinal: (result) => {
          listeningRef.current = false;
          spaceHeldRef.current = false;
          setListening(false);
          setRecognizing(false);
          setPartial('');
          if (voiceRepliesItself) return;
          if (result || pendingImageRef.current) send(result);
          else setHint(speechErrorText['no-speech'] || '');
        },
        onError: (error, message) => {
          listeningRef.current = false;
          spaceHeldRef.current = false;
          setListening(false);
          setRecognizing(false);
          setHint(message || speechErrorText[error] || '没听清楚，再试一次吧～');
        },
      },
      { lang: speechLang },
    );
  };

  const stopListening = () => {
    if (!listeningRef.current) return;
    setRecognizing(true);
    recognizer.stop();
  };

  const voiceRef = useRef({ talkDisabled, startListening, stopListening });
  voiceRef.current = { talkDisabled, startListening, stopListening };

  // PC 端：按住空格键说话，松开发送；窗口失焦时自动收尾避免卡住录音
  useEffect(() => {
    if (!useVoice) {
      spaceHeldRef.current = false;
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableElement(e.target)) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (voiceRef.current.talkDisabled || listeningRef.current) return;
      e.preventDefault();
      spaceHeldRef.current = true;
      voiceRef.current.startListening();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (!spaceHeldRef.current) return;
      e.preventDefault();
      spaceHeldRef.current = false;
      voiceRef.current.stopListening();
    };

    const onBlur = () => {
      if (!spaceHeldRef.current && !listeningRef.current) return;
      spaceHeldRef.current = false;
      voiceRef.current.stopListening();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [useVoice]);

  const activeImageChips = imageSuggestions?.length ? imageSuggestions : DEFAULT_IMAGE_SUGGESTIONS;

  return (
    <div
      className={`border-t-2 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition ${
        draggingImage ? 'border-amber-400 bg-amber-50/95' : 'border-amber-100 bg-white/90'
      }`}
      data-testid="kid-input-bar"
      onPaste={handlePaste}
      onDragOver={(e) => {
        if (!allowImage) return;
        e.preventDefault();
        setDraggingImage(true);
      }}
      onDragLeave={() => setDraggingImage(false)}
      onDrop={handleDrop}
    >
      <div className={maxWidthClass ? `mx-auto w-full ${maxWidthClass}` : 'w-full'}>
      {allowImage && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void attachFile(file);
          }}
        />
      )}

      {pendingImage && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-2.5" data-testid="pending-image-bar">
          <img src={pendingImage} alt="待发送图片" className="h-14 w-14 shrink-0 rounded-xl bg-white object-cover shadow-sm" />
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {activeImageChips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={disabled}
                onClick={() => send(chip)}
                className="min-h-12 shrink-0 rounded-full border-2 border-amber-200 bg-white px-3.5 text-sm font-bold text-amber-800 disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="kid-clear-image"
            onClick={() => setPendingImage(null)}
            className="flex h-12 shrink-0 items-center rounded-xl bg-rose-50 px-3 text-sm font-bold text-rose-600"
          >
            ✕ 移除
          </button>
        </div>
      )}

      {!pendingImage && suggestions && suggestions.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              onClick={() => send(s)}
              className="min-h-12 shrink-0 rounded-full border-2 border-amber-200 bg-amber-50 px-4 text-base font-medium text-amber-700 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {hint && <p className="mb-2 text-center text-sm text-rose-500">{hint}</p>}
      <div className="flex items-center gap-3">
        {recognizer.supported && (
          <button
            type="button"
            aria-label={useVoice ? '切换到打字' : '切换到说话'}
            onClick={() => setVoicePrefs({ inputMode: useVoice ? 'text' : 'voice' })}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl"
          >
            {useVoice ? '⌨️' : '🎤'}
          </button>
        )}
        {allowImage && (
          <button
            type="button"
            disabled={disabled}
            data-testid="kid-pick-image"
            aria-label="传图给伙伴看"
            title="传照片或画作让伙伴看图回答"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700 transition hover:bg-amber-200 disabled:opacity-40"
          >
            📷
          </button>
        )}
        {useVoice ? (
          <button
            type="button"
            disabled={talkDisabled}
            data-testid="push-to-talk"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              startListening();
            }}
            onPointerUp={stopListening}
            onLostPointerCapture={stopListening}
            onPointerCancel={stopListening}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex h-16 flex-1 select-none items-center justify-center gap-2 rounded-full text-xl font-bold text-white shadow-md transition disabled:opacity-50 ${
              listening ? 'scale-[1.02] bg-rose-400' : 'bg-amber-400'
            }`}
          >
            <span aria-hidden>{recognizing ? '🤔' : listening ? '👂' : '🎤'}</span>
            <span className="truncate">
              {recognizing
                ? partial || '我想想你说了什么…'
                : listening
                  ? partial || '我在听，说完松开～'
                  : pendingImage
                    ? typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                      ? '按住语音提问这张图'
                      : '按住语音提问这张图（或按空格键）'
                    : typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
                      ? '按住说话，松开发送'
                      : '按住说话（或长按空格键）'}
            </span>
          </button>
        ) : (
          <form
            className="flex flex-1 items-center gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={pendingImage ? '想让伙伴看图回答什么？（可直接点发送）' : placeholder}
              aria-label={placeholder}
              data-testid="kid-text-input"
              maxLength={200}
              className="h-14 min-w-0 flex-1 rounded-full border-2 border-amber-200 bg-white px-5 text-slate-700 outline-none focus:border-amber-400"
              style={{ fontSize }}
            />
            <button
              type="submit"
              disabled={disabled || (!text.trim() && !pendingImage)}
              aria-label="发送"
              data-testid="kid-send"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-400 text-2xl text-white shadow-md disabled:opacity-40"
            >
              ➤
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
