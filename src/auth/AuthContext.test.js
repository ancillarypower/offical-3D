import { act, renderHook } from '@testing-library/react';
import { AuthProvider, STORAGE_KEY, useAuth } from './AuthContext';

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

afterEach(() => {
  jest.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('credential validation', () => {
  test.each([
    ['amy', 'secret', 'amy'],
    ['  amy  ', 'x', 'amy'],
    ['', 'secret', null],
    ['amy', '   ', null],
  ])('login(%j, %j) signs in as %j', (username, password, expected) => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok;
    act(() => {
      ok = result.current.login(username, password);
    });
    expect(ok).toBe(expected !== null);
    expect(result.current.user).toBe(expected);
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe(expected);
  });
});

test('restores the user from sessionStorage on mount', () => {
  window.sessionStorage.setItem(STORAGE_KEY, 'amy');
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.user).toBe('amy');
});

test('ignores a blank stored value', () => {
  window.sessionStorage.setItem(STORAGE_KEY, '   ');
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.user).toBeNull();
});

test('logout clears memory and storage', () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  act(() => {
    result.current.login('amy', 'secret');
  });
  act(() => {
    result.current.logout();
  });
  expect(result.current.user).toBeNull();
  expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
});

test('falls back to memory when sessionStorage throws', () => {
  const boom = () => {
    throw new Error('blocked');
  };
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);

  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.user).toBeNull();
  act(() => {
    expect(result.current.login('amy', 'secret')).toBe(true);
  });
  expect(result.current.user).toBe('amy');
  act(() => {
    result.current.logout();
  });
  expect(result.current.user).toBeNull();
});

test('useAuth outside the provider fails loudly', () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
});
