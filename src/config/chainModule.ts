/**
 * 「生活小能手」模块配置
 *
 * 和说说小课堂 / 认知理解不同，这个模块**不是** LessonModule：
 * LessonModule.targets 是 ExpressionTarget[]，绑死了 DTT 的 tasks[]（题）；
 * 这个模块的目标是 ChainTarget，单位是「步」不是「题」。硬套会被类型挡住，
 * 也会让 lessonModules.ts 里那些按题数、讲抽题的逻辑全部失效。
 *
 * 但首页卡片、路由、解锁守卫这些外壳是共用的，所以这里只描述外壳需要的字段，
 * 内层数据走 chainTargets.ts / chainTraining.ts。
 */

import type { LessonModule } from './lessonModules';

/**
 * 首页卡片要的字段。GatedLessonCard 只认这几个，
 * 让 ChainModule 和 LessonModule 都能用同一张卡。
 */
export type LessonCardModule = Pick<LessonModule, 'title' | 'emoji' | 'basePath' | 'tagline' | 'accentColor' | 'accent'>;

export interface ChainModule extends LessonCardModule {
  id: 'life';
  /** localStorage 前缀：孩子名、带练人挂在这下面 */
  storagePrefix: string;
  /** 课堂记录账本 key。和语言表达分开存，但结构共用（靠 runs 区分是不是链式课） */
  bookKey: string;
  /** 页面头部渐变 */
  headerGradient: string;
  /** 练习台上的称呼 */
  coachName: string;
}

export const LIFE_MODULE: ChainModule = {
  id: 'life',
  title: '生活小能手',
  emoji: '🧸',
  basePath: '/life',
  tagline: '洗手、收拾书包、用钱买东西，遇到事知道先做什么——一条一条按顺序练下来，每一步都记清楚。',
  storagePrefix: 'kidbuddy.life',
  bookKey: 'kidbuddy.life.book.v1',
  headerGradient: 'from-sky-400 to-teal-400',
  accentColor: '#0EA5E9',
  coachName: '生活老师',
  accent: {
    solid: 'bg-sky-500',
    ring: 'border-sky-400',
    soft: 'bg-sky-50',
    softBorder: 'border-sky-200',
    text: 'text-sky-600',
    textStrong: 'text-sky-700',
    icon: 'bg-sky-100 text-sky-600',
    focusRing: 'focus:border-sky-400',
  },
};
