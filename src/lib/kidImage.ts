/**
 * 魔法画室与绘本共创的客户端桥接：生图、Prompt 润色、SQLite 持久化与高清长图导出。
 */
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { loadAgeProfile } from '@/config/ageProfile';
import { buildChildSafetyRules } from '@/config/childPrompt';
import {
  STORYBOOK_TOTAL_PAGES,
  buildCoverPlanPrompt,
  buildDrawingEnhancePrompt,
  buildSafeImagePrompt,
  buildStoryPagePrompt,
  buildStorybookSlideAnimatePrompt,
  buildVideoAnimatePrompt,
  parseBookPages,
  parseCoverPlanResponse,
  parseStoryPageResponse,
  type ArtStyleId,
  type KidArtworkRecord,
  type KidStorybookRecord,
  type StoryCoverPlan,
  type StoryPagePlan,
} from '@/config/kidArt';
import { buildBilingualBookPrompt, parseBilingualBookResponse } from '@/config/kidBilingualBook';
import { loadImageConfig } from '@/config/tokenPlan';
import { resolveCompanionCredentials } from '@/utils/companionCredentials';
import { isTauri } from '@/utils/isTauri';
import { llmChatComplete } from '@/utils/llmClient';
import { buildA4JpegPdf, type PdfJpegPage } from './pdfBuilder';
import { normalizeArrayBuffer } from './speech/pcm';

export interface GenerateKidImageInput {
  subject: string;
  style?: ArtStyleId | string;
  isSketch?: boolean;
  isContinuation?: boolean;
  heroDesc?: string;
  referenceImagePath?: string;
  referenceImageDataUrl?: string;
  size?: string;
}

export interface GeneratedKidImage {
  path: string;
  mimeType: string;
}

const ARTWORKS_LS_KEY = 'kid_artworks_preview';
const BOOKS_LS_KEY = 'kid_storybooks_preview';

function ensureDesktopNotice(): string {
  return '画画模型需要在桌面端应用中使用，请通过桌面安装包或 npm run tauri dev 启动后体验。';
}

export function resolveArtworkSrc(pathOrUrl: string): string {
  const val = (pathOrUrl || '').trim();
  if (!val) return '';
  if (val.startsWith('data:') || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/img/')) {
    return val;
  }
  return isTauri ? convertFileSrc(val) : val;
}

export async function saveSketchDataUrl(dataUrl: string): Promise<string> {
  if (!isTauri) return dataUrl;
  return invoke<string>('artwork_save_data_url', { dataUrl });
}

export async function readArtworkDataUrl(path: string): Promise<string> {
  if (!path) return '';
  if (path.startsWith('data:')) return path;
  if (!isTauri) return path;
  return invoke<string>('artwork_read_data_url', { path });
}

export async function generateKidImage(input: GenerateKidImageInput): Promise<GeneratedKidImage> {
  if (!isTauri) {
    throw new Error(ensureDesktopNotice());
  }
  const cfg = loadImageConfig();
  if (!cfg.model) {
    throw new Error('还没有配置绘本插画模型，请先到家长中心完成一键配置。');
  }
  const prompt = buildSafeImagePrompt({
    subject: input.subject,
    style: input.style,
    isSketch: input.isSketch,
    isContinuation: input.isContinuation,
    heroDesc: input.heroDesc,
  });

  return invoke<GeneratedKidImage>('image_http_generate', {
    args: {
      prompt,
      model: cfg.model,
      size: input.size || '1K',
      baseUrl: cfg.httpBase,
      providerId: cfg.providerId || undefined,
      referenceImagePath: input.referenceImagePath || undefined,
      referenceImageDataUrl: input.referenceImageDataUrl || undefined,
    },
  });
}

async function runTextHelper(system: string, user: string): Promise<string> {
  const creds = await resolveCompanionCredentials();
  const profile = loadAgeProfile();
  const safeSystem = `${buildChildSafetyRules(profile)}\n\n${system}`;
  return llmChatComplete({
    ...creds,
    messages: [
      { role: 'system', content: safeSystem },
      { role: 'user', content: user },
    ],
    emitDoneMarker: false,
  });
}

/** 润色孩子的画画描述；若文本模型暂不可用，降级为直接用原话生图 */
export async function enhanceDrawingIdea(idea: string, style: ArtStyleId, isSketch = false): Promise<string> {
  const trimmed = idea.trim();
  if (!trimmed) return '';
  if (!isTauri) return trimmed;
  try {
    const { system, user } = buildDrawingEnhancePrompt(trimmed, style, isSketch);
    const enhanced = (await runTextHelper(system, user)).trim();
    return enhanced || trimmed;
  } catch (err) {
    console.warn('[kidImage] enhanceDrawingIdea fallback to raw idea:', err);
    return trimmed;
  }
}

export async function planStorybookCover(input: {
  idea: string;
  heroName: string;
  style: ArtStyleId;
}): Promise<StoryCoverPlan> {
  const profile = loadAgeProfile();
  const fallback = { idea: input.idea, heroName: input.heroName };
  if (!isTauri) {
    return parseCoverPlanResponse('', fallback);
  }
  try {
    const { system, user } = buildCoverPlanPrompt({ ...input, band: profile.band });
    const raw = await runTextHelper(system, user);
    return parseCoverPlanResponse(raw, fallback);
  } catch (err) {
    console.warn('[kidImage] planStorybookCover fallback:', err);
    return parseCoverPlanResponse('', fallback);
  }
}

export async function planStorybookPage(input: {
  title: string;
  heroName: string;
  heroDesc: string;
  pageNumber: number;
  priorPages: Array<{ pageNumber: number; storyText: string }>;
  kidIdea: string;
}): Promise<StoryPagePlan> {
  const profile = loadAgeProfile();
  if (!isTauri) {
    return parseStoryPageResponse('', input.kidIdea);
  }
  try {
    const { system, user } = buildStoryPagePrompt({
      ...input,
      totalPages: STORYBOOK_TOTAL_PAGES,
      band: profile.band,
    });
    const raw = await runTextHelper(system, user);
    return parseStoryPageResponse(raw, input.kidIdea);
  } catch (err) {
    console.warn('[kidImage] planStorybookPage fallback:', err);
    return parseStoryPageResponse('', input.kidIdea);
  }
}

// ============ 本地画作 & 绘本存储 ============

export async function listKidArtworks(): Promise<KidArtworkRecord[]> {
  if (!isTauri) {
    try {
      const raw = localStorage.getItem(ARTWORKS_LS_KEY);
      return raw ? (JSON.parse(raw) as KidArtworkRecord[]) : [];
    } catch {
      return [];
    }
  }
  return invoke<KidArtworkRecord[]>('list_kid_artworks');
}

export async function saveKidArtwork(artwork: KidArtworkRecord): Promise<void> {
  if (!isTauri) {
    const list = (await listKidArtworks()).filter((a) => a.id !== artwork.id);
    localStorage.setItem(ARTWORKS_LS_KEY, JSON.stringify([artwork, ...list]));
    return;
  }
  await invoke('save_kid_artwork', { artwork });
}

export async function deleteKidArtwork(id: string): Promise<void> {
  if (!isTauri) {
    const list = (await listKidArtworks()).filter((a) => a.id !== id);
    localStorage.setItem(ARTWORKS_LS_KEY, JSON.stringify(list));
    return;
  }
  await invoke('delete_kid_artwork', { id });
}

export async function listKidStorybooks(): Promise<KidStorybookRecord[]> {
  if (!isTauri) {
    try {
      const raw = localStorage.getItem(BOOKS_LS_KEY);
      return raw ? (JSON.parse(raw) as KidStorybookRecord[]) : [];
    } catch {
      return [];
    }
  }
  return invoke<KidStorybookRecord[]>('list_kid_storybooks');
}

export async function saveKidStorybook(book: KidStorybookRecord): Promise<void> {
  if (!isTauri) {
    const list = (await listKidStorybooks()).filter((b) => b.id !== book.id);
    localStorage.setItem(BOOKS_LS_KEY, JSON.stringify([book, ...list]));
    return;
  }
  await invoke('upsert_kid_storybook', { book });
}

export async function deleteKidStorybook(id: string): Promise<void> {
  if (!isTauri) {
    const list = (await listKidStorybooks()).filter((b) => b.id !== id);
    localStorage.setItem(BOOKS_LS_KEY, JSON.stringify(list));
    return;
  }
  await invoke('delete_kid_storybook', { id });
}

// ============ 图片下载 & 绘本长图/PDF/视频导出 ============

export function triggerFileDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadArtworkPng(artwork: KidArtworkRecord): Promise<void> {
  const dataUrl = await readArtworkDataUrl(artwork.imagePath);
  const safeName = (artwork.title || '魔法画作').replace(/[\\/:*?"<>|]/g, '_');
  triggerFileDownload(dataUrl, `${safeName}.png`);
}

export function loadCanvasImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('加载绘本图片失败'));
    img.src = src;
  });
}

export function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of Array.from(text)) {
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawCanvasRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function readArtworkVideoBlobUrl(path: string): Promise<string> {
  const trimmed = (path || '').trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  if (!isTauri) return trimmed;
  const bytes = await invoke<ArrayBuffer | Uint8Array | number[]>('artwork_read_video_bytes', { path: trimmed });
  return URL.createObjectURL(new Blob([normalizeArrayBuffer(bytes)], { type: 'video/mp4' }));
}

export async function animateStorybookSlide(
  book: KidStorybookRecord,
  slideIdx: number,
): Promise<KidStorybookRecord> {
  if (!isTauri) {
    throw new Error('AI 动画魔法需要在桌面端应用中使用，请通过桌面安装包或 npm run tauri dev 体验。');
  }
  const cfg = loadImageConfig();
  if (!cfg.videoModel) {
    throw new Error('还没有配置动画视频模型，请先到家长中心设置。');
  }
  const pages = parseBookPages(book.pagesJson);
  const isCover = slideIdx === 0;
  const targetPage = isCover ? null : pages[slideIdx - 1];
  if (!isCover && !targetPage) {
    throw new Error('没有找到对应的绘本页面');
  }
  const imagePath = isCover ? book.coverPath : targetPage!.imagePath;
  if (!imagePath) {
    throw new Error('这一页还没有插画，请先生成插画再做动画');
  }

  const prompt = buildStorybookSlideAnimatePrompt({
    bookTitle: book.title,
    heroDesc: book.heroDesc,
    isCover,
    storyText: targetPage?.storyText,
    imagePrompt: targetPage?.imagePrompt,
  });

  const video = await invoke<{ path: string; mimeType: string }>('video_http_animate', {
    args: {
      prompt,
      model: cfg.videoModel,
      imagePath,
      baseUrl: cfg.httpBase,
      providerId: cfg.providerId || undefined,
    },
  });

  const updated: KidStorybookRecord = isCover
    ? { ...book, coverVideoPath: video.path, updatedAt: Date.now() }
    : {
        ...book,
        pagesJson: JSON.stringify(
          pages.map((p, idx) => (idx === slideIdx - 1 ? { ...p, videoPath: video.path } : p)),
        ),
        updatedAt: Date.now(),
      };
  await saveKidStorybook(updated);
  return updated;
}

export async function animateWholeStorybook(
  initialBook: KidStorybookRecord,
  options: {
    onProgress?: (info: { current: number; total: number; label: string }) => void;
    shouldCancel?: () => boolean;
    onBookUpdated?: (updated: KidStorybookRecord) => void;
  } = {},
): Promise<KidStorybookRecord> {
  let currentBook = initialBook;
  const pages = parseBookPages(initialBook.pagesJson);
  const totalSlides = 1 + pages.length;

  for (let idx = 0; idx < totalSlides; idx += 1) {
    if (options.shouldCancel?.()) break;
    const latestPages = parseBookPages(currentBook.pagesJson);
    const alreadyAnimated =
      idx === 0 ? Boolean(currentBook.coverVideoPath?.trim()) : Boolean(latestPages[idx - 1]?.videoPath?.trim());
    if (alreadyAnimated) continue;

    const label = idx === 0 ? '封面' : `第 ${latestPages[idx - 1]?.pageNumber ?? idx} 页`;
    options.onProgress?.({ current: idx + 1, total: totalSlides, label });
    currentBook = await animateStorybookSlide(currentBook, idx);
    options.onBookUpdated?.(currentBook);
  }
  return currentBook;
}

/** 为已创作的中文绘本生成英文对照句并持久化 */
export async function translateStorybookToBilingual(book: KidStorybookRecord): Promise<KidStorybookRecord> {
  const pages = parseBookPages(book.pagesJson);
  if (pages.length === 0) return book;
  if (!isTauri) {
    throw new Error('生成双语绘本需要在桌面端连接文本模型后使用。');
  }

  const { system, user } = buildBilingualBookPrompt(book.title, pages);
  const raw = await runTextHelper(system, user);
  const { pageTexts } = parseBilingualBookResponse(raw, pages);
  if (Object.keys(pageTexts).length === 0) {
    throw new Error('英文翻译格式没解析成功，请再试一次。');
  }

  const updatedPages = pages.map((p) => ({
    ...p,
    bilingualText: pageTexts[p.pageNumber] || p.bilingualText,
  }));
  const updated: KidStorybookRecord = {
    ...book,
    pagesJson: JSON.stringify(updatedPages),
    updatedAt: Date.now(),
  };
  await saveKidStorybook(updated);
  return updated;
}

export async function animateKidArtwork(artwork: KidArtworkRecord): Promise<KidArtworkRecord> {
  if (!isTauri) {
    throw new Error('动画魔法需要在桌面端应用中使用，请通过桌面安装包或 npm run tauri dev 体验。');
  }
  const cfg = loadImageConfig();
  if (!cfg.videoModel) {
    throw new Error('还没有配置动画视频模型，请先到家长中心设置。');
  }
  const video = await invoke<{ path: string; mimeType: string }>('video_http_animate', {
    args: {
      prompt: buildVideoAnimatePrompt(artwork.title, artwork.prompt),
      model: cfg.videoModel,
      imagePath: artwork.imagePath,
      baseUrl: cfg.httpBase,
      providerId: cfg.providerId || undefined,
    },
  });
  const updated: KidArtworkRecord = {
    ...artwork,
    videoPath: video.path,
  };
  await saveKidArtwork(updated);
  return updated;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] || '';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

/** 导出绘本 A4 可打印 PDF（1240×1754 @150DPI，含封面 + 全部内页 + 中英文字） */
export async function exportStorybookPdf(book: KidStorybookRecord): Promise<void> {
  const pages = parseBookPages(book.pagesJson);
  const w = 1240;
  const h = 1754;
  const pad = 76;
  const cardW = w - pad * 2;
  const cardH = h - pad * 2;
  const imgSize = cardW - 96;
  const pdfPages: PdfJpegPage[] = [];

  const createPageCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#FFFBEB');
    grad.addColorStop(1, '#FFF1F2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FFFFFF';
    drawCanvasRoundedRect(ctx, pad, pad, cardW, cardH, 40);
    ctx.fill();
    return { canvas, ctx };
  };

  // 1. 封面页
  {
    const { canvas, ctx } = createPageCanvas();
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ 原创有声双语绘本 ✨', w / 2, pad + 88);

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 58px "PingFang SC", "Microsoft YaHei", sans-serif';
    const titleLines = wrapCanvasText(ctx, `《${book.title}》`, cardW - 96).slice(0, 2);
    let titleY = pad + 170;
    for (const line of titleLines) {
      ctx.fillText(line, w / 2, titleY);
      titleY += 72;
    }

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`作者：${book.author || '小朋友'} & 故事精灵`, w / 2, titleY + 12);

    const imgX = pad + 48;
    const imgY = titleY + 64;
    if (book.coverPath) {
      try {
        const coverUrl = await readArtworkDataUrl(book.coverPath);
        const img = await loadCanvasImage(coverUrl);
        ctx.save();
        drawCanvasRoundedRect(ctx, imgX, imgY, imgSize, imgSize, 32);
        ctx.clip();
        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();
      } catch {
        // ignore missing cover
      }
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('KidBuddy 绘本魔法屋 · A4 打印纪念版', w / 2, h - pad - 44);

    pdfPages.push({
      jpegBytes: dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.9)),
      width: w,
      height: h,
    });
  }

  // 2. 内页
  for (const item of pages) {
    const { canvas, ctx } = createPageCanvas();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`第 ${item.pageNumber} 页`, pad + 48, pad + 78);

    const imgX = pad + 48;
    const imgY = pad + 106;
    if (item.imagePath) {
      try {
        const pageUrl = await readArtworkDataUrl(item.imagePath);
        const img = await loadCanvasImage(pageUrl);
        ctx.save();
        drawCanvasRoundedRect(ctx, imgX, imgY, imgSize, imgSize, 28);
        ctx.clip();
        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
        ctx.restore();
      } catch {
        // ignore missing page image
      }
    }

    let textY = imgY + imgSize + 64;
    ctx.fillStyle = '#1E293B';
    ctx.font = '36px "PingFang SC", "Microsoft YaHei", sans-serif';
    const zhLines = wrapCanvasText(ctx, item.storyText, imgSize).slice(0, 6);
    for (const line of zhLines) {
      ctx.fillText(line, imgX, textY);
      textY += 54;
    }

    if (item.bilingualText) {
      textY += 16;
      ctx.fillStyle = '#0369A1';
      ctx.font = '28px "Plus Jakarta Sans", "PingFang SC", sans-serif';
      const enLines = wrapCanvasText(ctx, item.bilingualText, imgSize).slice(0, 5);
      for (const line of enLines) {
        ctx.fillText(line, imgX, textY);
        textY += 40;
      }
    }

    ctx.fillStyle = '#94A3B8';
    ctx.font = '26px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`《${book.title}》 · ${item.pageNumber} / ${pages.length}`, w / 2, h - pad - 44);

    pdfPages.push({
      jpegBytes: dataUrlToUint8Array(canvas.toDataURL('image/jpeg', 0.9)),
      width: w,
      height: h,
    });
  }

  const pdfBytes = buildA4JpegPdf(pdfPages);
  const blobUrl = URL.createObjectURL(new Blob([pdfBytes.slice().buffer], { type: 'application/pdf' }));
  const safeTitle = (book.title || '我的绘本').replace(/[\\/:*?"<>|]/g, '_');
  triggerFileDownload(blobUrl, `${safeTitle}-A4打印绘本.pdf`);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}

/** 导出绘本高清分享长图 PNG（封面 + 全部内页 + 署名） */
export async function exportStorybookPoster(book: KidStorybookRecord): Promise<void> {
  const pages = parseBookPages(book.pagesJson);
  const width = 1080;
  const pad = 64;
  const cardWidth = width - pad * 2;
  const imgSize = cardWidth - 64;

  const measureCanvas = document.createElement('canvas');
  const mctx = measureCanvas.getContext('2d')!;
  mctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';

  const pageLayouts = pages.map((p) => {
    const zhLines = wrapCanvasText(mctx, p.storyText, imgSize);
    mctx.font = '28px "Plus Jakarta Sans", "PingFang SC", sans-serif';
    const enLines = p.bilingualText ? wrapCanvasText(mctx, p.bilingualText, imgSize) : [];
    mctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
    const textHeight = Math.max(1, zhLines.length) * 48 + (enLines.length ? 16 + enLines.length * 40 : 0);
    return { page: p, zhLines, enLines, cardHeight: 60 + imgSize + 36 + textHeight + 40 };
  });

  const coverHeight = 220 + imgSize + 60;
  const totalHeight =
    pad +
    coverHeight +
    pageLayouts.reduce((sum, item) => sum + 40 + item.cardHeight, 0) +
    110;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;

  // 暖色纸张渐变背景
  const grad = ctx.createLinearGradient(0, 0, 0, totalHeight);
  grad.addColorStop(0, '#FFFBEB');
  grad.addColorStop(1, '#FFF1F2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, totalHeight);

  // 封面卡片
  let y = pad;
  ctx.fillStyle = '#FFFFFF';
  drawCanvasRoundedRect(ctx, pad, y, cardWidth, coverHeight, 36);
  ctx.fill();

  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 52px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`《${book.title}》`, width / 2, y + 84);

  ctx.fillStyle = '#F59E0B';
  ctx.font = 'bold 28px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`作者：${book.author || '小朋友'} & 故事精灵`, width / 2, y + 136);

  if (book.coverPath) {
    try {
      const coverUrl = await readArtworkDataUrl(book.coverPath);
      const img = await loadCanvasImage(coverUrl);
      ctx.save();
      drawCanvasRoundedRect(ctx, pad + 32, y + 176, imgSize, imgSize, 28);
      ctx.clip();
      ctx.drawImage(img, pad + 32, y + 176, imgSize, imgSize);
      ctx.restore();
    } catch {
      // ignore missing image
    }
  }

  y += coverHeight;

  // 内页卡片
  ctx.textAlign = 'left';
  for (const item of pageLayouts) {
    y += 40;
    ctx.fillStyle = '#FFFFFF';
    drawCanvasRoundedRect(ctx, pad, y, cardWidth, item.cardHeight, 36);
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 26px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`第 ${item.page.pageNumber} 页`, pad + 32, y + 44);

    if (item.page.imagePath) {
      try {
        const pageUrl = await readArtworkDataUrl(item.page.imagePath);
        const img = await loadCanvasImage(pageUrl);
        ctx.save();
        drawCanvasRoundedRect(ctx, pad + 32, y + 60, imgSize, imgSize, 24);
        ctx.clip();
        ctx.drawImage(img, pad + 32, y + 60, imgSize, imgSize);
        ctx.restore();
      } catch {
        // ignore missing image
      }
    }

    ctx.fillStyle = '#334155';
    ctx.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
    let textY = y + 60 + imgSize + 52;
    for (const line of item.zhLines) {
      ctx.fillText(line, pad + 32, textY);
      textY += 48;
    }
    if (item.enLines.length > 0) {
      textY += 12;
      ctx.fillStyle = '#475569';
      ctx.font = '28px "Plus Jakarta Sans", "PingFang SC", sans-serif';
      for (const line of item.enLines) {
        ctx.fillText(line, pad + 32, textY);
        textY += 40;
      }
    }

    y += item.cardHeight;
  }

  ctx.fillStyle = '#94A3B8';
  ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('由 KidBuddy 绘本魔法屋共创', width / 2, totalHeight - 44);

  const blobUrl = canvas.toDataURL('image/png');
  const safeTitle = (book.title || '我的绘本').replace(/[\\/:*?"<>|]/g, '_');
  triggerFileDownload(blobUrl, `${safeTitle}-绘本长图.png`);
}
