import { act, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import FactoryScene from './FactoryScene';

// jsdom has no WebGL, so the renderer, loader and controls are faked. Plain classes,
// not jest.fn(), because CRA's resetMocks would wipe mock implementations.
const mockLoads = [];
const mockRenderers = [];
const mockControls = [];
const mockWebgl = { fail: false };

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
      constructor() {
        if (mockWebgl.fail) throw new Error('WebGL unavailable');
        this.domElement = global.document.createElement('canvas');
        this.disposed = false;
        mockRenderers.push(this);
      }
      setPixelRatio() {}
      setSize() {}
      render() {}
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
