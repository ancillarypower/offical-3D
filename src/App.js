import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './auth/AuthContext';
import { RedirectIfAuthed, RequireAuth } from './auth/guards';
import AppLayout from './layout/AppLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
