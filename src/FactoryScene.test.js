import { act, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import FactoryScene, { fitDistance } from './FactoryScene';

// jsdom has no WebGL, so the renderer, loader and controls are faked. Plain classes,
// not jest.fn(), because CRA's resetMocks would wipe mock implementations.
const mockLoads = [];
const mockRenderers = [];
const mockControls = [];
const mockWebgl = { fail: false };
const mockObservers = [];

// jsdom has no ResizeObserver; tests fire `trigger()` after changing the mount size.
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.disconnected = false;
    mockObservers.push(this);
  }
  observe(target) {
    this.target = target;
  }
  disconnect() {
    this.disconnected = true;
  }
  trigger() {
    this.callback([{ target: this.target }]);
  }
}

jest.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(url, onLoad, onProgress, onError) {
      mockLoads.push({ url, onLoad, onError });
    }
  },
}));

jest.mock('three/examples/jsm/controls/OrbitControls.js', () => {
  const { Vector3 } = jest.requireActual('three');
  return {
    OrbitControls: class {
      constructor(camera, domElement) {
        Object.assign(this, { camera, domElement, target: new Vector3(), disposed: false });
        mockControls.push(this);
      }
      update() {}
      dispose() {
        this.disposed = true;
      }
    },
  };
});

jest.mock('three', () => {
  const actual = jest.requireActual('three');
  return {
    ...actual,
    WebGLRenderer: class {
      constructor(options) {
        if (mockWebgl.fail) throw new Error('WebGL unavailable');
        this.options = options;
        this.domElement = global.document.createElement('canvas');
        this.disposed = false;
        this.pixelRatios = [];
        this.clearColors = [];
        this.lastScene = null;
        mockRenderers.push(this);
      }
      setPixelRatio(ratio) {
        this.pixelRatios.push(ratio);
      }
      setSize() {}
      setClearColor(color, alpha) {
        this.clearColors.push([color, alpha]);
      }
      render(scene) {
        this.lastScene = scene;
      }
      dispose() {
        this.disposed = true;
      }
    },
  };
});

// A tiny model: one 2×2×2 box centred at the origin, plus `clipCount` clips.
function fakeGltf(clipCount = 0) {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial()));
  const animations = Array.from({ length: clipCount }, (_, i) => new THREE.AnimationClip(`clip${i}`, 1, []));
  return { scene, animations };
}

beforeEach(() => {
  mockLoads.length = 0;
  mockRenderers.length = 0;
  mockControls.length = 0;
  mockWebgl.fail = false;
  mockObservers.length = 0;
  global.ResizeObserver = FakeResizeObserver;
});

test('shows loading text until the model loads', () => {
  const { container } = render(<FactoryScene />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading factory…');
  expect(mockLoads).toHaveLength(1);
  expect(mockLoads[0].url).toMatch(/\/models\/factory\.glb$/);
  expect(container.querySelector('canvas')).toBeNull();

  act(() => mockLoads[0].onLoad(fakeGltf()));

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(container.querySelectorAll('canvas')).toHaveLength(1);
});

test('shows error text when loading fails', () => {
  const { container } = render(<FactoryScene />);
  act(() => mockLoads[0].onError(new Error('404')));

  expect(screen.getByRole('alert')).toHaveTextContent('Could not load the 3D model.');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  expect(container.querySelector('canvas')).toBeNull();
});

test('plays every clip on loop', () => {
  const play = jest.spyOn(THREE.AnimationAction.prototype, 'play');
  render(<FactoryScene />);
  act(() => mockLoads[0].onLoad(fakeGltf(3)));

  expect(play).toHaveBeenCalledTimes(3);
  const actions = play.mock.instances;
  expect(new Set(actions.map((a) => a.getClip().name))).toEqual(new Set(['clip0', 'clip1', 'clip2']));
  actions.forEach((action) => {
    expect(action.loop).toBe(THREE.LoopRepeat);
    expect(action.repetitions).toBe(Infinity);
    expect(action.isRunning()).toBe(true);
  });
});

test('frames the model and configures orbit controls', () => {
  render(<FactoryScene />);
  // Box 2×2×2 moved to centre (4, 1, -2): bounding radius = sqrt(12) / 2.
  const gltf = fakeGltf();
  gltf.scene.position.set(4, 1, -2);
  act(() => mockLoads[0].onLoad(gltf));

  expect(mockControls).toHaveLength(1);
  const controls = mockControls[0];
  const centre = new THREE.Vector3(4, 1, -2);
  const radius = Math.sqrt(12) / 2;
  const distance = radius / Math.sin(THREE.MathUtils.degToRad(controls.camera.fov / 2));

  expect(controls.domElement).toBe(mockRenderers[0].domElement);
  expect(controls.target.distanceTo(centre)).toBeCloseTo(0);
  expect(controls.camera.position.distanceTo(centre)).toBeCloseTo(distance);
  expect(controls).toMatchObject({
    autoRotate: true,
    autoRotateSpeed: 0.5,
    enableDamping: true,
    enablePan: false,
  });
  expect(controls.minDistance).toBeCloseTo(radius);
  expect(controls.maxDistance).toBeCloseTo(3 * distance);
});

test('disposes renderer, controls and canvas on unmount', () => {
  const { container, unmount } = render(<FactoryScene />);
  const gltf = fakeGltf(2);
  const mesh = gltf.scene.children[0];
  const geometryDispose = jest.spyOn(mesh.geometry, 'dispose');
  const materialDispose = jest.spyOn(mesh.material, 'dispose');
  const stopAll = jest.spyOn(THREE.AnimationMixer.prototype, 'stopAllAction');
  const cancel = jest.spyOn(window, 'cancelAnimationFrame');
  act(() => mockLoads[0].onLoad(gltf));
  const canvas = container.querySelector('canvas');
  expect(canvas).not.toBeNull();

  unmount();

  expect(cancel).toHaveBeenCalled();
  expect(stopAll).toHaveBeenCalled();
  expect(mockControls[0].disposed).toBe(true);
  expect(geometryDispose).toHaveBeenCalled();
  expect(materialDispose).toHaveBeenCalled();
  expect(mockRenderers[0].disposed).toBe(true);
  expect(canvas.isConnected).toBe(false);
  expect(mockObservers[0].disconnected).toBe(true);
});

test('ignores a model that loads after unmount', () => {
  const { unmount } = render(<FactoryScene />);
  const gltf = fakeGltf(1);
  const mesh = gltf.scene.children[0];
  const geometryDispose = jest.spyOn(mesh.geometry, 'dispose');
  const errors = jest.spyOn(console, 'error');
  unmount();

  expect(() => mockLoads[0].onLoad(gltf)).not.toThrow();
  expect(mockRenderers).toHaveLength(0);
  expect(document.querySelector('canvas')).toBeNull();
  expect(geometryDispose).toHaveBeenCalled();
  expect(errors).not.toHaveBeenCalled();
});

test('shows error text when WebGL is unavailable', () => {
  mockWebgl.fail = true;
  const { container } = render(<FactoryScene />);
  const gltf = fakeGltf(1);
  const geometryDispose = jest.spyOn(gltf.scene.children[0].geometry, 'dispose');
  act(() => mockLoads[0].onLoad(gltf));

  expect(screen.getByRole('alert')).toHaveTextContent('Could not load the 3D model.');
  expect(container.querySelector('canvas')).toBeNull();
  expect(geometryDispose).toHaveBeenCalled();
});

// Gives the scene's mount a layout size, which jsdom otherwise reports as 0×0.
function sizeMount(container, width, height) {
  const mount = container.querySelector('.FactoryScene');
  Object.defineProperty(mount, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(mount, 'clientHeight', { configurable: true, value: height });
}

test.each([
  [600, 600, 2.613],
  [1200, 600, 2.613],
  [300, 600, 4.931],
])('fitDistance fits the narrower field of view (%i×%i)', (width, height, expected) => {
  expect(fitDistance(1, 45, width / height)).toBeCloseTo(expected, 3);
});

test('fitDistance treats a 0 or NaN aspect as 1', () => {
  expect(fitDistance(1, 45, 0)).toBeCloseTo(fitDistance(1, 45, 1));
  expect(fitDistance(1, 45, NaN)).toBeCloseTo(fitDistance(1, 45, 1));
});

test('frames a portrait canvas so the whole model fits', () => {
  const { container } = render(<FactoryScene />);
  sizeMount(container, 375, 611);
  act(() => mockLoads[0].onLoad(fakeGltf()));

  const controls = mockControls[0];
  const radius = Math.sqrt(12) / 2;
  const fit = fitDistance(radius, 45, 375 / 611);
  expect(controls.camera.aspect).toBeCloseTo(375 / 611);
  expect(controls.camera.position.distanceTo(controls.target)).toBeCloseTo(fit);
  // Wider than the vertical-only fit, which would clip the sides.
  expect(fit).toBeGreaterThan(radius / Math.sin(THREE.MathUtils.degToRad(22.5)));
  expect(controls.maxDistance).toBeCloseTo(3 * fit);
});

test('re-fits after resize keeping direction and zoom ratio', () => {
  const { container } = render(<FactoryScene />);
  sizeMount(container, 1280, 744);
  act(() => mockLoads[0].onLoad(fakeGltf()));
  const { camera, target } = mockControls[0];
  const radius = Math.sqrt(12) / 2;
  const wideFit = fitDistance(radius, 45, 1280 / 744);

  // The user zooms out to 1.5× the fit distance before the resize.
  const direction = camera.position.clone().sub(target).normalize();
  camera.position.copy(target).addScaledVector(direction, 1.5 * wideFit);

  sizeMount(container, 375, 611);
  expect(mockObservers).toHaveLength(1);
  expect(mockObservers[0].target).toBe(container.querySelector('.FactoryScene'));
  act(() => mockObservers[0].trigger());

  const portraitFit = fitDistance(radius, 45, 375 / 611);
  const offset = camera.position.clone().sub(target);
  expect(camera.aspect).toBeCloseTo(375 / 611);
  expect(offset.clone().normalize().distanceTo(direction)).toBeCloseTo(0);
  expect(offset.length()).toBeCloseTo(1.5 * portraitFit);
  expect(mockControls[0].maxDistance).toBeCloseTo(3 * portraitFit);
  expect(camera.near).toBeCloseTo(portraitFit / 100);
  expect(camera.far).toBeCloseTo(portraitFit * 10);
});

test('ignores a resize to 0×0', () => {
  const { container } = render(<FactoryScene />);
  sizeMount(container, 1280, 744);
  act(() => mockLoads[0].onLoad(fakeGltf()));
  const { camera } = mockControls[0];
  const before = camera.position.clone();

  sizeMount(container, 0, 0);
  act(() => mockObservers[0].trigger());

  expect(camera.aspect).toBeCloseTo(1280 / 744);
  expect(camera.position.distanceTo(before)).toBeCloseTo(0);
});

test.each([
  [1, 1],
  [2, 2],
  [3, 2],
])('caps pixel ratio at 2 (devicePixelRatio %i → %i)', (deviceRatio, expected) => {
  const original = window.devicePixelRatio;
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: deviceRatio });
  try {
    const { container } = render(<FactoryScene />);
    sizeMount(container, 375, 611);
    act(() => mockLoads[0].onLoad(fakeGltf()));
    sizeMount(container, 611, 375);
    act(() => mockObservers[0].trigger());

    // Once on creation and once after the resize.
    expect(mockRenderers[0].pixelRatios).toEqual([expected, expected]);
  } finally {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: original });
  }
});

test('renders on a transparent canvas over the CSS gradient', () => {
  render(<FactoryScene />);
  act(() => mockLoads[0].onLoad(fakeGltf()));

  const renderer = mockRenderers[0];
  expect(renderer.options).toMatchObject({ antialias: true, alpha: true });
  expect(renderer.clearColors).toEqual([[0x000000, 0]]);
  expect(renderer.lastScene.background).toBeNull();
});
