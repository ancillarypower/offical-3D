import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import gsap from 'gsap';
import HomePage from './HomePage';

// Stand-in scene that records its covered area and reports focus like FactoryScene.
const mockScene = { coveredArea: null };
jest.mock('../FactoryScene', () => ({ onFocusChange, coveredArea }) => {
  mockScene.coveredArea = coveredArea;
  return (
    <div data-testid="factory-scene">
      <button type="button" onClick={() => onFocusChange('Office')}>
        focus Office
      </button>
      <button type="button" onClick={() => onFocusChange(null)}>
        back to overview
      </button>
    </div>
  );
});

const SLOGAN = '以 AI 驅動虛擬電廠引領臺灣能源轉型';
const slogan = () => screen.queryByRole('heading', { level: 1, name: SLOGAN });

// jsdom has no layout: the card sits at x 48..512, y 300..500 on a 1280×800 page.
const RECTS = {
  HomePage: { left: 0, top: 0, right: 1280, bottom: 800, width: 1280, height: 800 },
  'HomePage-card': { left: 48, top: 300, right: 512, bottom: 500, width: 464, height: 200 },
};
let rectSpy;
let originalMatchMedia;
const useWideScreen = (wide, { motion = false } = {}) => {
  window.matchMedia = (query) => ({
    matches:
      (wide && query === '(min-width: 769px)') || (motion && query === '(prefers-reduced-motion: no-preference)'),
    media: query,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
};

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
  rectSpy = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function rect() {
      const name = [...this.classList].find((cls) => RECTS[cls]);
      return RECTS[name] || { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
    });
});

afterEach(() => {
  rectSpy.mockRestore();
  window.matchMedia = originalMatchMedia;
});

test('shows the slogan over the factory scene', () => {
  useWideScreen(true);
  render(<HomePage />);
  expect(slogan()).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByTestId('factory-scene')).toBeInTheDocument();
});

test('on a wide screen the card covers a left band up to its right edge', () => {
  useWideScreen(true);
  render(<HomePage />);
  expect(mockScene.coveredArea).toEqual({ left: 512, top: 0 });
});

test('on a narrow screen the card overlaps the scene and covers nothing', () => {
  useWideScreen(false);
  render(<HomePage />);
  expect(mockScene.coveredArea).toEqual({ left: 0, top: 0 });
});

test('hides the card and clears the covered area while a building is focused', () => {
  useWideScreen(true);
  render(<HomePage />);

  userEvent.click(screen.getByRole('button', { name: 'focus Office' }));
  expect(slogan()).not.toBeInTheDocument();
  expect(mockScene.coveredArea).toEqual({ left: 0, top: 0 });

  userEvent.click(screen.getByRole('button', { name: 'back to overview' }));
  expect(slogan()).toBeInTheDocument();
  expect(mockScene.coveredArea).toEqual({ left: 512, top: 0 });
});

test.each([
  ['fades the card when motion is allowed', true, 1],
  ['switches the card at once under reduced motion', false, 0],
])('%s', (_, motion, fades) => {
  useWideScreen(true, { motion });
  const fromTo = jest.spyOn(gsap, 'fromTo');
  const { container } = render(<HomePage />);
  const card = container.querySelector('.HomePage-card');

  userEvent.click(screen.getByRole('button', { name: 'focus Office' }));
  const cardTweens = fromTo.mock.calls.filter(([target]) => target === card);
  expect(cardTweens).toHaveLength(fades);
  if (fades) expect(cardTweens[0][2]).toMatchObject({ autoAlpha: 0 });
  fromTo.mockRestore();
});
