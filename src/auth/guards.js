import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export function RedirectIfAuthed({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}
