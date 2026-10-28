import { act, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import ArchimedesScene from './ArchimedesScene';
import { fitDistance } from './threeHelpers';

// jsdom has no WebGL, so the renderer, loader and controls are faked the same way as
// in FactoryScene.test.js. Plain classes, not jest.fn(), because CRA's resetMocks
// would wipe mock implementations.
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
      update() {
        this.camera.lookAt(this.target);
      }
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

// A tiny model: one 2×2×2 box centred at the origin (bounding radius √3), plus clips.
function fakeGltf(clipNames = []) {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial()));
  const animations = clipNames.map((name) => new THREE.AnimationClip(name, 7.2, []));
  return { scene, animations };
}
const RADIUS = Math.sqrt(3);

// Gives the scene's mount a layout size, which jsdom otherwise reports as 0×0.
function sizeMount(container, width, height) {
  const mount = container.querySelector('.ArchimedesScene');
  Object.defineProperty(mount, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(mount, 'clientHeight', { configurable: true, value: height });
}

beforeEach(() => {
  // CRA's resetMocks empties spies between tests without restoring them, so a second
  // spyOn on the same prototype method would get a no-op; restore the originals.
  jest.restoreAllMocks();
  mockLoads.length = 0;
  mockRenderers.length = 0;
  mockControls.length = 0;
  mockObservers.length = 0;
  mockWebgl.fail = false;
  global.ResizeObserver = FakeResizeObserver;
});

describe('loading and status', () => {
  test('loads Archimedes_opt_anim.glb and shows loading text until it arrives', () => {
    const { container } = render(<ArchimedesScene />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading Archimedes screw…');
    expect(mockLoads).toHaveLength(1);
    expect(mockLoads[0].url).toMatch(/\/models\/Archimedes_opt_anim\.glb$/);
    expect(container.querySelector('canvas')).toBeNull();

    act(() => mockLoads[0].onLoad(fakeGltf()));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.ArchimedesScene canvas')).toHaveLength(1);
  });

  test('shows the error text when loading fails', () => {
    const { container } = render(<ArchimedesScene />);
    act(() => mockLoads[0].onError(new Error('404')));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the 3D model.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
  });

  test('shows the error text and disposes the model when WebGL is unavailable', () => {
    mockWebgl.fail = true;
    const { container } = render(<ArchimedesScene />);
    const gltf = fakeGltf(['ScrewAndWaterFlow']);
    const geometryDispose = jest.spyOn(gltf.scene.children[0].geometry, 'dispose');
    act(() => mockLoads[0].onLoad(gltf));

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the 3D model.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
    expect(geometryDispose).toHaveBeenCalled();
  });
});

describe('resolution and background', () => {
  test('renders on a transparent canvas over the CSS gradient', () => {
    render(<ArchimedesScene />);
    act(() => mockLoads[0].onLoad(fakeGltf()));

    const renderer = mockRenderers[0];
    expect(renderer.options).toMatchObject({ antialias: true, alpha: true });
    expect(renderer.clearColors).toEqual([[0x000000, 0]]);
    expect(renderer.lastScene.background).toBeNull();
  });

  test.each([
    [1, 1],
    [2, 2],
    [3, 2],
  ])('caps pixel ratio at 2 (devicePixelRatio %i → %i)', (deviceRatio, expected) => {
    const original = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: deviceRatio });
    try {
      const { container } = render(<ArchimedesScene />);
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
});

describe('animation and camera', () => {
  test('loops the ScrewAndWaterFlow clip forever', () => {
    const play = jest.spyOn(THREE.AnimationAction.prototype, 'play');
    render(<ArchimedesScene />);
    act(() => mockLoads[0].onLoad(fakeGltf(['ScrewAndWaterFlow'])));

    expect(play).toHaveBeenCalledTimes(1);
    const [action] = play.mock.instances;
    expect(action.getClip().name).toBe('ScrewAndWaterFlow');
    expect(action.loop).toBe(THREE.LoopRepeat);
    expect(action.repetitions).toBe(Infinity);
    expect(action.isRunning()).toBe(true);
  });

  test('reduced motion still animates and auto-orbits', () => {
    const original = window.matchMedia;
    window.matchMedia = (query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
    try {
      const play = jest.spyOn(THREE.AnimationAction.prototype, 'play');
      render(<ArchimedesScene />);
      act(() => mockLoads[0].onLoad(fakeGltf(['ScrewAndWaterFlow'])));

      expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      const [action] = play.mock.instances;
      expect(action.isRunning()).toBe(true);
      expect(action.repetitions).toBe(Infinity);
      expect(mockControls[0].autoRotate).toBe(true);
    } finally {
      window.matchMedia = original;
    }
  });

  test('configures slow auto-orbit with drag and zoom, no pan', () => {
    render(<ArchimedesScene />);
    act(() => mockLoads[0].onLoad(fakeGltf()));

    const controls = mockControls[0];
    expect(controls.domElement).toBe(mockRenderers[0].domElement);
    expect(controls).toMatchObject({
      autoRotate: true,
      autoRotateSpeed: 0.5,
      enableDamping: true,
      enablePan: false,
    });
    expect(controls.minDistance).toBeCloseTo(RADIUS);
  });

  // Spec example, scaled by the fake model's radius √3: 2.613 and 4.059 at radius 1.
  test.each([
    [1280, 744, 2.613],
    [375, 611, 4.059],
  ])('frames the whole model at %i×%i', (width, height, unitDistance) => {
    const { container } = render(<ArchimedesScene />);
    sizeMount(container, width, height);
    const gltf = fakeGltf();
    gltf.scene.position.set(4, 1, -2);
    act(() => mockLoads[0].onLoad(gltf));

    const { camera, target, maxDistance } = mockControls[0];
    const distance = fitDistance(RADIUS, 45, width / height);
    expect(distance).toBeCloseTo(unitDistance * RADIUS, 2);
    expect(target.distanceTo(new THREE.Vector3(4, 1, -2))).toBeCloseTo(0);
    expect(camera.position.distanceTo(target)).toBeCloseTo(distance);
    const direction = camera.position.clone().sub(target).normalize();
    expect(direction.distanceTo(new THREE.Vector3(1, 0.6, 1).normalize())).toBeCloseTo(0);
    expect(maxDistance).toBeCloseTo(3 * distance);
  });

  test('re-fits after resize keeping direction and zoom ratio', () => {
    const { container } = render(<ArchimedesScene />);
    sizeMount(container, 1280, 744);
    act(() => mockLoads[0].onLoad(fakeGltf()));
    const { camera, target } = mockControls[0];
    const wideFit = fitDistance(RADIUS, 45, 1280 / 744);

    // The user zooms out to 1.5× the fit distance before the resize.
    const direction = camera.position.clone().sub(target).normalize();
    camera.position.copy(target).addScaledVector(direction, 1.5 * wideFit);

    sizeMount(container, 375, 611);
    expect(mockObservers[0].target).toBe(container.querySelector('.ArchimedesScene'));
    act(() => mockObservers[0].trigger());

    const portraitFit = fitDistance(RADIUS, 45, 375 / 611);
    const offset = camera.position.clone().sub(target);
    expect(camera.aspect).toBeCloseTo(375 / 611);
    expect(offset.clone().normalize().distanceTo(direction)).toBeCloseTo(0);
    expect(offset.length()).toBeCloseTo(1.5 * portraitFit);
    expect(mockControls[0].maxDistance).toBeCloseTo(3 * portraitFit);
    expect(camera.near).toBeCloseTo(portraitFit / 100);
    expect(camera.far).toBeCloseTo(portraitFit * 10);
  });
});

describe('cleanup', () => {
  test('unmount disposes renderer, controls, geometry and canvas', () => {
    const { container, unmount } = render(<ArchimedesScene />);
    const gltf = fakeGltf(['ScrewAndWaterFlow']);
    const mesh = gltf.scene.children[0];
    const geometryDispose = jest.spyOn(mesh.geometry, 'dispose');
    const materialDispose = jest.spyOn(mesh.material, 'dispose');
    const stopAll = jest.spyOn(THREE.AnimationMixer.prototype, 'stopAllAction');
    const uncache = jest.spyOn(THREE.AnimationMixer.prototype, 'uncacheRoot');
    const cancel = jest.spyOn(window, 'cancelAnimationFrame');
    act(() => mockLoads[0].onLoad(gltf));
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    unmount();

    expect(cancel).toHaveBeenCalled();
    expect(stopAll).toHaveBeenCalled();
    expect(uncache).toHaveBeenCalledWith(gltf.scene);
    expect(mockObservers[0].disconnected).toBe(true);
    expect(mockControls[0].disposed).toBe(true);
    expect(geometryDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalled();
    expect(mockRenderers[0].disposed).toBe(true);
    expect(canvas.isConnected).toBe(false);
  });

  test('unmount before load creates no canvas and raises nothing', () => {
    const { unmount } = render(<ArchimedesScene />);
    const gltf = fakeGltf(['ScrewAndWaterFlow']);
    const geometryDispose = jest.spyOn(gltf.scene.children[0].geometry, 'dispose');
    const errors = jest.spyOn(console, 'error');
    unmount();

    expect(() => mockLoads[0].onLoad(gltf)).not.toThrow();
    expect(mockRenderers).toHaveLength(0);
    expect(document.querySelector('canvas')).toBeNull();
    expect(geometryDispose).toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });
});
