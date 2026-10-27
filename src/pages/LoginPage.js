import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (login(username, password)) {
      navigate('/', { replace: true });
    } else {
      setError('Please enter username and password');
    }
  };

  return (
    <div className="LoginPage">
      <form className="LoginPage-form" onSubmit={handleSubmit} noValidate>
        <h1>Sign in</h1>
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="LoginPage-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit">Log in</button>
        <p className="LoginPage-hint">Demo login — any username and password</p>
      </form>
    </div>
  );
}

export default LoginPage;
