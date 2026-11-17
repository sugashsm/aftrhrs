import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Loading, Logo } from './components/ui';
import { useAuth } from './lib/store';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/AuthPage';
import { Onboarding } from './pages/Onboarding';
import { HomePage } from './pages/Home';
import { Discover } from './pages/Discover';
import { MoodAI } from './pages/MoodAI';
import { Create } from './pages/Create';
import { RoomPage, Rooms } from './pages/Rooms';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';
import { DropPage, NotificationsPage, PlaylistPage, SearchPage } from './pages/Misc';

function Protected() {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="flex min-h-screen items-center justify-center"><Loading /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return <Shell />;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="text-sm text-mute" />
      <h1 className="display mt-10 text-6xl sm:text-7xl">This track skipped.</h1>
      <p className="mt-4 max-w-sm text-mute">The page you were looking for is not here. It may have moved, or never existed.</p>
      <Link to="/" className="btn-primary mt-8">Back to the start</Link>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Protected />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/ai" element={<MoodAI />} />
        <Route path="/create" element={<Create />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/:slug" element={<RoomPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/u/:username" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/drop/:id" element={<DropPage />} />
        <Route path="/playlist/:id" element={<PlaylistPage />} />
        <Route path="/search" element={<SearchPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
