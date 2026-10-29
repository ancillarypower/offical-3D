import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from './App';
import { STORAGE_KEY } from './auth/AuthContext';

jest.mock('./FactoryScene', () => () => <div data-testid="factory-scene" />);
jest.mock('./ArchimedesScene', () => () => <div data-testid="archimedes-scene" />);

function LocationDisplay() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

function renderApp(path = '/', { user } = {}) {
  if (user) window.sessionStorage.setItem(STORAGE_KEY, user);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationDisplay />
    </MemoryRouter>
  );
}

const currentPath = () => screen.getByTestId('location').textContent;

afterEach(() => {
  window.sessionStorage.clear();
});

describe('login page', () => {
  test('signs in with valid credentials', () => {
    renderApp('/login');
    expect(screen.getByText('Demo login — any username and password')).toBeInTheDocument();
    userEvent.type(screen.getByLabelText('Username'), 'amy');
    userEvent.type(screen.getByLabelText('Password'), 'secret');
    userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(currentPath()).toBe('/');
    expect(screen.getByTestId('factory-scene')).toBeInTheDocument();
  });

  test.each([
    ['', 'secret'],
    ['amy', '   '],
  ])('shows error for missing field (%j, %j)', (username, password) => {
    renderApp('/login');
    if (username) userEvent.type(screen.getByLabelText('Username'), username);
    if (password) userEvent.type(screen.getByLabelText('Password'), password);
    userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(currentPath()).toBe('/login');
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter username and password');
  });
});

describe('route guards', () => {
  test('redirects anonymous visitor from /profile to /login', () => {
    renderApp('/profile');
    expect(currentPath()).toBe('/login');
  });

  test('signed-out visitor sees Home with factory scene', () => {
    renderApp('/');
    expect(currentPath()).toBe('/');
    expect(screen.getAllByTestId('factory-scene')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: '以 AI 驅動虛擬電廠引領臺灣能源轉型' })).toBeInTheDocument();
  });

  test('redirects signed-in user from /login to /', () => {
    renderApp('/login', { user: 'amy' });
    expect(currentPath()).toBe('/');
  });
});

describe('navigation bar', () => {
  test('nav shows Home, Archimedes, Profile, Logout in order', () => {
    renderApp('/', { user: 'amy' });
    const list = screen.getByRole('navigation').querySelector('#main-nav-links');
    const items = Array.from(list.querySelectorAll('a, button')).map((el) => el.textContent);
    expect(items).toEqual(['Home', 'Archimedes', 'Profile', 'Logout']);
  });

  test('nav for signed-out visitor shows Home, Archimedes, Profile, Log in', () => {
    renderApp('/');
    const list = screen.getByRole('navigation').querySelector('#main-nav-links');
    const items = Array.from(list.querySelectorAll('a, button')).map((el) => el.textContent);
    expect(items).toEqual(['Home', 'Archimedes', 'Profile', 'Log in']);
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
  });

  test('no nav on /login', () => {
    renderApp('/login');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  test('Profile link has aria-current on /profile', () => {
    renderApp('/profile', { user: 'amy' });
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });
});

test('logout returns to Home with Log in shown and /profile then redirects to /login', () => {
  const { unmount } = renderApp('/profile', { user: 'amy' });
  userEvent.click(screen.getByRole('button', { name: 'Logout' }));
  expect(currentPath()).toBe('/');
  expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument();
  expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  unmount();
  renderApp('/profile');
  expect(currentPath()).toBe('/login');
});

test('factory scene present on Home and absent on Profile', () => {
  renderApp('/', { user: 'amy' });
  expect(screen.getAllByTestId('factory-scene')).toHaveLength(1);
  userEvent.click(screen.getByRole('link', { name: 'Profile' }));
  expect(screen.queryByTestId('factory-scene')).not.toBeInTheDocument();
  userEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(screen.getAllByTestId('factory-scene')).toHaveLength(1);
  expect(screen.getByTestId('factory-scene').closest('.HomePage')).toBeInTheDocument();
});

describe('Archimedes page', () => {
  test('signed-out visitor sees the Archimedes scene with its link current', () => {
    renderApp('/archimedes');
    expect(currentPath()).toBe('/archimedes');
    expect(screen.getAllByTestId('archimedes-scene')).toHaveLength(1);
    expect(screen.getByTestId('archimedes-scene').closest('.ArchimedesPage')).toBeInTheDocument();
    expect(screen.queryByTestId('factory-scene')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Archimedes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  test('navigating Home → Archimedes → Home swaps the scenes', () => {
    renderApp('/');
    userEvent.click(screen.getByRole('link', { name: 'Archimedes' }));
    expect(currentPath()).toBe('/archimedes');
    expect(screen.getAllByTestId('archimedes-scene')).toHaveLength(1);
    expect(screen.queryByTestId('factory-scene')).not.toBeInTheDocument();

    userEvent.click(screen.getByRole('link', { name: 'Home' }));
    expect(currentPath()).toBe('/');
    expect(screen.getAllByTestId('factory-scene')).toHaveLength(1);
    expect(screen.queryByTestId('archimedes-scene')).not.toBeInTheDocument();
  });
});

test('profile shows username amy', () => {
  renderApp('/profile', { user: 'amy' });
  expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  expect(screen.getByText('amy')).toBeInTheDocument();
});

test('unknown path redirects to /', () => {
  renderApp('/does-not-exist', { user: 'amy' });
  expect(currentPath()).toBe('/');
});

test('unknown path redirects to / when signed out', () => {
  renderApp('/does-not-exist');
  expect(currentPath()).toBe('/');
});

test('menu toggles aria-expanded and closes after clicking Profile', () => {
  renderApp('/', { user: 'amy' });
  const toggle = screen.getByRole('button', { name: 'Menu' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  userEvent.click(screen.getByRole('link', { name: 'Profile' }));
  expect(currentPath()).toBe('/profile');
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('menu toggle shows a hamburger icon and is named Menu', () => {
  renderApp('/');
  const toggle = screen.getByRole('button', { name: 'Menu' });
  expect(toggle).toHaveTextContent('☰');
  expect(screen.queryByText('Menu')).not.toBeInTheDocument();
});
