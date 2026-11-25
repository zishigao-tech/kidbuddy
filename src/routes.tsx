import { createBrowserRouter, Navigate } from 'react-router-dom';
import BasicLayout from './layouts/BasicLayout';
import KidLayout from './pages/kid/KidLayout';
import KidHome from './pages/kid/KidHome';
import KidChat from './pages/kid/KidChat';
import KidDraw from './pages/kid/KidDraw';
import KidExpression from './pages/kid/KidExpression';
import KidExpressionPlay from './pages/kid/KidExpressionPlay';
import KidCognition from './pages/kid/KidCognition';
import KidCognitionPlay from './pages/kid/KidCognitionPlay';
import KidLife from './pages/kid/KidLife';
import KidLifePlay from './pages/kid/KidLifePlay';
import KidStorybooks from './pages/kid/KidStorybooks';
import KidStorybookCreate from './pages/kid/KidStorybookCreate';
import KidStorybookRead from './pages/kid/KidStorybookRead';
import { KidGameLevels, KidGameList } from './pages/kid/KidGames';
import KidGamePlay from './pages/kid/KidGamePlay';
import KidStars from './pages/kid/KidStars';
import { LessonGuard } from './pages/kid/components/ParentGate';
import ParentArea from './pages/parent';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <KidLayout />,
    children: [
      { index: true, element: <KidHome /> },
      { path: 'chat/:chatId', element: <KidChat /> },
      { path: 'draw', element: <KidDraw /> },
      { path: 'expression', element: <LessonGuard><KidExpression /></LessonGuard> },
      { path: 'expression/:targetId', element: <LessonGuard><KidExpressionPlay /></LessonGuard> },
      { path: 'cognition', element: <LessonGuard><KidCognition /></LessonGuard> },
      { path: 'cognition/:targetId', element: <LessonGuard><KidCognitionPlay /></LessonGuard> },
      { path: 'life', element: <LessonGuard><KidLife /></LessonGuard> },
      { path: 'life/:targetId', element: <LessonGuard><KidLifePlay /></LessonGuard> },
      { path: 'books', element: <KidStorybooks /> },
      { path: 'books/new', element: <KidStorybookCreate /> },
      { path: 'books/:bookId', element: <KidStorybookRead /> },
      { path: 'games', element: <KidGameList /> },
      { path: 'games/:gameId', element: <KidGameLevels /> },
      { path: 'games/:gameId/:level', element: <KidGamePlay /> },
      { path: 'stars', element: <KidStars /> },
    ],
  },
  {
    path: '/parent',
    element: <BasicLayout />,
    children: [{ index: true, element: <ParentArea /> }],
  },
  {
    path: '/login',
    element: <Navigate to="/" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
