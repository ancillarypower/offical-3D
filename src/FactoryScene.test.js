import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import gsap from 'gsap';
import * as THREE from 'three';
import FactoryScene, { BUILDINGS, FOCUS_DIRECTION, fitDistance, pickBuilding, updateVehicleVisibility } from './FactoryScene';

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
      // The real controls orient the camera towards the target on every update.
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

// A tiny model: one 2×2×2 box centred at the origin, plus `clipCount` clips.
function fakeGltf(clipCount = 0) {
  const scene = new THREE.Group();
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial()));
  // An empty Ground keeps the scene's bounds unchanged and avoids the missing-ground warning.
  const ground = new THREE.Object3D();
  ground.name = 'Ground';
  scene.add(ground);
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
  expect(mockLoads[0].url).toMatch(/\/models\/factory0\.glb$/);
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

// A model shaped like factory0.glb: 160×160 ground, vehicles and a non-vehicle.
function fakeFactory({ withGround = true } = {}) {
  const scene = new THREE.Group();
  if (withGround) {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(160, 0.1, 160), new THREE.MeshBasicMaterial());
    ground.name = 'Ground';
    scene.add(ground);
  }
  const node = (name, x, z) => {
    const object = new THREE.Group();
    object.name = name;
    object.position.set(x, 0, z);
    scene.add(object);
    return object;
  };
  return {
    scene,
    animations: [],
    carE0: node('CarE0', 0, 52.5),
    carW0: node('CarW0', 88, 47.5),
    smoke: node('Smoke0_0', 200, 0),
  };
}

test.each([
  [0, 52.5, true],
  [80, 52.5, true],
  [80.1, 52.5, false],
  [-88.3, 47.5, false],
  [20, 16.5, true],
  [0, 81, false],
])('updateVehicleVisibility follows the ground extent (%f, %f → %s)', (x, z, visible) => {
  const groundBox = new THREE.Box3(new THREE.Vector3(-80, -0.1, -80), new THREE.Vector3(80, 0, 80));
  const vehicle = new THREE.Object3D();
  vehicle.position.set(x, 0, z);
  updateVehicleVisibility([vehicle], groundBox);
  expect(vehicle.visible).toBe(visible);
});

test('hides vehicles whose origin is off the ground after load', () => {
  render(<FactoryScene />);
  const model = fakeFactory();
  act(() => mockLoads[0].onLoad(model));

  expect(model.carE0.visible).toBe(true);
  expect(model.carW0.visible).toBe(false);
  expect(model.smoke.visible).toBe(true);
});

test('re-evaluates visibility every frame', () => {
  const frames = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
  render(<FactoryScene />);
  const model = fakeFactory();
  act(() => mockLoads[0].onLoad(model));
  expect(model.carE0.visible).toBe(true);

  model.carE0.position.x = 81;
  frames[frames.length - 1]();

  expect(model.carE0.visible).toBe(false);
});

test('warns once and hides nothing without a Ground node', () => {
  const frames = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  render(<FactoryScene />);
  const model = fakeFactory({ withGround: false });
  act(() => mockLoads[0].onLoad(model));
  frames[frames.length - 1]();
  frames[frames.length - 1]();

  expect(model.carE0.visible).toBe(true);
  expect(model.carW0.visible).toBe(true);
  expect(warn).toHaveBeenCalledTimes(1);
  expect(warn.mock.calls[0][0]).toMatch(/Ground/);
});

test('exposes the dev debug handle and removes it on unmount', () => {
  const { unmount } = render(<FactoryScene />);
  const model = fakeFactory();
  act(() => mockLoads[0].onLoad(model));

  // Jest runs with NODE_ENV=test, which counts as a non-production build.
  expect(window.__FACTORY_SCENE__.vehicles).toEqual([model.carE0, model.carW0]);
  expect(window.__FACTORY_SCENE__.groundBox.max.x).toBeCloseTo(80);
  expect(window.__FACTORY_SCENE__.camera).toBe(mockControls[0].camera);
  expect(window.__FACTORY_SCENE__.controls).toBe(mockControls[0]);
  expect(window.__FACTORY_SCENE__.buildings).toEqual([]);
  expect(window.__FACTORY_SCENE__.getFocus()).toEqual({ focusedId: null, flying: false });

  unmount();
  expect(window.__FACTORY_SCENE__).toBeUndefined();
});

// Builds a model root with named top-level nodes; a dotted name such as
// 'CarE0.body' adds a child mesh under the top-level node 'CarE0'.
function pickScene(...names) {
  const root = new THREE.Group();
  const nodes = {};
  names.forEach((path) => {
    const [top, child] = path.split('.');
    if (!nodes[top]) {
      nodes[top] = new THREE.Group();
      nodes[top].name = top;
      root.add(nodes[top]);
    }
    if (child) {
      nodes[path] = new THREE.Mesh();
      nodes[path].name = child;
      nodes[top].add(nodes[path]);
    }
  });
  return { root, nodes };
}

test.each([
  ['OffWinF1_2', [], 'Office'],
  ['GuardHouse', [], 'GuardHouse'],
  ['Trunk3', ['Office'], null],
  ['CarE0.body', ['GuardHouse'], 'GuardHouse', { hidden: 'CarE0' }],
  [null, [], null],
])('pickBuilding resolves the first visible hit (%s first)', (first, behind, expected, options = {}) => {
  const names = [first, ...behind].filter(Boolean);
  const { root, nodes } = pickScene(...names);
  if (options.hidden) nodes[options.hidden].visible = false;
  const intersections = names.map((name, i) => ({ object: nodes[name], distance: i + 1 }));

  const picked = pickBuilding(intersections, root, BUILDINGS);

  expect(picked ? picked.id : null).toBe(expected);
});

test('BUILDINGS parts match the factory0.glb node names', () => {
  const partsOf = (id) => BUILDINGS.find((building) => building.id === id).parts;
  const office = [
    'Office', 'OfficeRoof', 'OfficeCanopy', 'OfficeEntrance', 'OfficeSolar0', 'OfficeSolar2',
    'OffWinF0_0', 'OffWinF3_3', 'OffWinS0_0', 'OffWinS3_2',
  ];
  office.forEach((name) => expect(partsOf('Office').test(name)).toBe(true));
  ['GuardHouse', 'GuardHouseWin'].forEach((name) => expect(partsOf('GuardHouse').test(name)).toBe(true));
  ['MainHall', 'Corridor', 'GuardHouseX'].forEach((name) => {
    expect(BUILDINGS.some((building) => building.parts.test(name))).toBe(false);
  });
  expect(BUILDINGS.map(({ id, label }) => [id, label])).toEqual([
    ['Office', 'Office'],
    ['GuardHouse', 'Guard House'],
  ]);
});

// A site shaped like factory0.glb around its two clickable buildings.
function fakeSite({ withBuildings = true } = {}) {
  const scene = new THREE.Group();
  const box = (name, [w, h, d], [x, y, z]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
    mesh.name = name;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };
  const site = { scene, animations: [] };
  site.ground = box('Ground', [160, 0.1, 160], [0, -0.05, 0]);
  if (withBuildings) {
    site.office = box('Office', [14, 14, 12], [-32, 7, 8]);
    site.guardHouse = box('GuardHouse', [3, 2.8, 3], [-22, 1.4, 38]);
  }
  return site;
}

const VIEW = { width: 1280, height: 800 };

function loadSite(site = fakeSite(), props = {}, size = VIEW) {
  const view = render(<FactoryScene {...props} />);
  sizeMount(view.container, size.width, size.height);
  act(() => mockLoads[0].onLoad(site));
  const canvas = mockRenderers[0].domElement;
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, ...size, right: size.width, bottom: size.height });
  const controls = mockControls[0];
  return { ...view, site, canvas, controls, camera: controls.camera, size };
}

const boxOf = (object) => new THREE.Box3().setFromObject(object);
const centreOf = (object) => boxOf(object).getCenter(new THREE.Vector3());
const radiusOf = (object) => boxOf(object).getSize(new THREE.Vector3()).length() / 2;

// Screen position of an object's centre with the camera as the controls left it.
function screenPointOf(object, { camera, controls, size = VIEW }) {
  controls.update();
  camera.updateMatrixWorld();
  const p = centreOf(object).project(camera);
  return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
}

// jsdom 16 has no PointerEvent; a MouseEvent with the pointer type carries clientX/Y.
function click(canvas, at, moveBy = 0) {
  act(() => {
    canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: at.x, clientY: at.y, bubbles: true }));
    canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: at.x + moveBy, clientY: at.y, bubbles: true }));
  });
}

const pressEscape = () => act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
const poseOf = ({ camera, controls }) => ({ position: camera.position.clone(), target: controls.target.clone() });

function expectPose({ camera, controls }, pose) {
  ['x', 'y', 'z'].forEach((axis) => {
    expect(camera.position[axis]).toBeCloseTo(pose.position[axis], 2);
    expect(controls.target[axis]).toBeCloseTo(pose.target[axis], 2);
  });
}

const flights = () => gsap.globalTimeline.getChildren();
const finishFlight = () => act(() => flights().forEach((tween) => tween.progress(1)));

function expectFocusedOn(object, { camera, controls }) {
  const centre = centreOf(object);
  const distance = fitDistance(radiusOf(object), camera.fov, camera.aspect) * 1.2;
  const position = centre.clone().addScaledVector(FOCUS_DIRECTION, distance);
  ['x', 'y', 'z'].forEach((axis) => {
    expect(controls.target[axis]).toBeCloseTo(centre[axis], 2);
    expect(camera.position[axis]).toBeCloseTo(position[axis], 2);
  });
}

test('clicking a building flies the camera to it', () => {
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.office, scene));

  expect(scene.controls.autoRotate).toBe(false);
  expect(scene.controls.enabled).toBe(false);
  finishFlight();

  expectFocusedOn(scene.site.office, scene);
  expect(scene.controls.autoRotate).toBe(false);
  expect(scene.controls.enabled).toBe(true);
  expect(scene.controls.minDistance).toBeCloseTo(radiusOf(scene.site.office));
});

test('a 6 px drag is not a click', () => {
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.guardHouse, scene), 6);

  expect(flights()).toHaveLength(0);
  expect(scene.controls.autoRotate).toBe(true);
});

test('a 5 px move still counts as a click', () => {
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.guardHouse, scene), 5);

  expect(flights()).toHaveLength(1);
  finishFlight();
  expectFocusedOn(scene.site.guardHouse, scene);
});

test('clicking the other building switches focus and keeps the overview pose', () => {
  const scene = loadSite();
  const overview = poseOf(scene);
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();
  click(scene.canvas, screenPointOf(scene.site.guardHouse, scene));
  finishFlight();

  expectFocusedOn(scene.site.guardHouse, scene);
  expect(scene.controls.minDistance).toBeCloseTo(radiusOf(scene.site.guardHouse));

  pressEscape();
  finishFlight();
  expectPose(scene, overview);
});

test('clicks during a flight are ignored', () => {
  const scene = loadSite();
  const guardHouseAt = screenPointOf(scene.site.guardHouse, scene);
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  click(scene.canvas, guardHouseAt);

  expect(flights()).toHaveLength(1);
  finishFlight();
  expectFocusedOn(scene.site.office, scene);
});

test('clicking the focused building again changes nothing', () => {
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();
  click(scene.canvas, screenPointOf(scene.site.office, scene));

  expect(flights()).toHaveLength(0);
  expectFocusedOn(scene.site.office, scene);
});

test('a model without building nodes has nothing clickable', () => {
  const scene = loadSite(fakeSite({ withBuildings: false }));
  click(scene.canvas, { x: VIEW.width / 2, y: VIEW.height / 2 });

  expect(flights()).toHaveLength(0);
  expect(scene.controls.autoRotate).toBe(true);
});

test('the flight swings around instead of passing through the target', () => {
  const scene = loadSite();
  const centre = centreOf(scene.site.office);
  // Look at the Office from the far side (FOCUS_DIRECTION mirrored in x and z), 60 units away.
  const farSide = new THREE.Vector3(-FOCUS_DIRECTION.x, FOCUS_DIRECTION.y, -FOCUS_DIRECTION.z);
  scene.controls.target.copy(centre);
  scene.camera.position.copy(centre).addScaledVector(farSide, 60);
  scene.controls.update(); // as the next frame would
  click(scene.canvas, { x: VIEW.width / 2, y: VIEW.height / 2 });
  expect(flights()).toHaveLength(1);
  const focusDistance = fitDistance(radiusOf(scene.site.office), scene.camera.fov, scene.camera.aspect) * 1.2;

  act(() => flights().forEach((tween) => tween.progress(0.5)));

  // Swinging keeps the camera about halfway between the two distances from the target;
  // a straight line would cut across to well under 0.9 × the shorter one.
  expect(scene.camera.position.distanceTo(scene.controls.target)).toBeGreaterThan(
    Math.min(60, focusDistance) * 0.9,
  );
  finishFlight();
  expectFocusedOn(scene.site.office, scene);
});

test('Esc returns to the saved overview', () => {
  const scene = loadSite();
  const overview = poseOf(scene);
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();

  pressEscape();
  expect(flights()).toHaveLength(1);
  expect(scene.controls.enabled).toBe(false);
  finishFlight();

  expectPose(scene, overview);
  expect(scene.controls.autoRotate).toBe(true);
  expect(scene.controls.enabled).toBe(true);
  expect(scene.controls.minDistance).toBeCloseTo(radiusOf(scene.site.scene));
});

test('clicking empty space returns to the overview', () => {
  const scene = loadSite();
  const overview = poseOf(scene);
  click(scene.canvas, screenPointOf(scene.site.guardHouse, scene));
  finishFlight();

  // Bottom-right corner: the ground in front of the Guard House.
  click(scene.canvas, { x: VIEW.width - 1, y: VIEW.height - 1 });
  finishFlight();

  expectPose(scene, overview);
  expect(scene.controls.autoRotate).toBe(true);
});

test('Esc during the fly-in is ignored', () => {
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  pressEscape();

  expect(flights()).toHaveLength(1);
  finishFlight();
  expectFocusedOn(scene.site.office, scene);
});

test('Esc in the overview does nothing', () => {
  const scene = loadSite();
  const overview = poseOf(scene);
  pressEscape();

  expect(flights()).toHaveLength(0);
  expectPose(scene, overview);
  expect(scene.controls.autoRotate).toBe(true);
});

// Runs the scene's latest animation frame (gsap's ticker also queues frames, so pick ours).
function captureFrames() {
  const frames = [];
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
  return () => act(() => frames.filter((frame) => frame.name === 'animate').pop()());
}

const visibleLabels = (container) =>
  [...container.querySelectorAll('.FactoryScene-label')]
    .filter((label) => label.style.display !== 'none')
    .map((label) => label.textContent);

test("shows the focused building's name after the flight", () => {
  const renderFrame = captureFrames();
  const scene = loadSite();
  expect(scene.container.querySelectorAll('.FactoryScene-label')).toHaveLength(2);
  expect(visibleLabels(scene.container)).toEqual([]);

  click(scene.canvas, screenPointOf(scene.site.office, scene));
  renderFrame();
  expect(visibleLabels(scene.container)).toEqual([]);

  finishFlight();
  renderFrame();
  expect(visibleLabels(scene.container)).toEqual(['Office']);
});

test('switching buildings switches the label', () => {
  const renderFrame = captureFrames();
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();

  click(scene.canvas, screenPointOf(scene.site.guardHouse, scene));
  renderFrame();
  expect(visibleLabels(scene.container)).toEqual([]);

  finishFlight();
  renderFrame();
  expect(visibleLabels(scene.container)).toEqual(['Guard House']);
});

test('returning hides the label', () => {
  const renderFrame = captureFrames();
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();

  pressEscape();
  renderFrame();
  expect(visibleLabels(scene.container)).toEqual([]);

  finishFlight();
  renderFrame();
  expect(visibleLabels(scene.container)).toEqual([]);
});

test('the label layer does not block pointer events', () => {
  const scene = loadSite();
  const layer = scene.container.querySelector('.FactoryScene-label').parentElement;

  expect(layer).not.toBe(scene.canvas);
  expect(layer.style.pointerEvents).toBe('none');
});

test('the cursor is a hand over a building only', () => {
  const scene = loadSite();
  const move = (at, buttons = 0) =>
    act(() => {
      scene.canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: at.x, clientY: at.y, buttons }));
    });

  move(screenPointOf(scene.site.office, scene));
  expect(scene.canvas.style.cursor).toBe('pointer');

  move({ x: VIEW.width - 1, y: VIEW.height - 1 });
  expect(scene.canvas.style.cursor).toBe('');

  // While dragging, the cursor is left alone.
  move(screenPointOf(scene.site.office, scene), 1);
  expect(scene.canvas.style.cursor).toBe('');
});

test('resize while focused keeps the camera and rescales the return pose', () => {
  const scene = loadSite();
  const overview = poseOf(scene);
  const overviewDirection = overview.position.clone().sub(overview.target).normalize();
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();
  const focusedPosition = scene.camera.position.clone();

  sizeMount(scene.container, 375, 611);
  act(() => mockObservers[0].trigger());
  ['x', 'y', 'z'].forEach((axis) => expect(scene.camera.position[axis]).toBeCloseTo(focusedPosition[axis], 6));

  pressEscape();
  finishFlight();
  const offset = scene.camera.position.clone().sub(scene.controls.target);
  const direction = offset.clone().normalize();
  ['x', 'y', 'z'].forEach((axis) => expect(direction[axis]).toBeCloseTo(overviewDirection[axis], 6));
  expect(offset.length()).toBeCloseTo(fitDistance(radiusOf(scene.site.scene), 45, 375 / 611), 4);
});

test('resize during the return flight lands on the re-fitted overview', () => {
  const scene = loadSite();
  const overview = poseOf(scene);
  const overviewDirection = overview.position.clone().sub(overview.target).normalize();
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();

  pressEscape();
  act(() => flights().forEach((tween) => tween.progress(0.5)));
  sizeMount(scene.container, 375, 611);
  act(() => mockObservers[0].trigger());
  finishFlight();

  const offset = scene.camera.position.clone().sub(scene.controls.target);
  const direction = offset.clone().normalize();
  ['x', 'y', 'z'].forEach((axis) => expect(direction[axis]).toBeCloseTo(overviewDirection[axis], 6));
  expect(offset.length()).toBeCloseTo(fitDistance(radiusOf(scene.site.scene), 45, 375 / 611), 4);
});

// MouseEvent has no pointerId in jsdom 16; set it so touches can be told apart.
function pointer(canvas, type, at, { id = 1, button = 0 } = {}) {
  const event = new MouseEvent(type, { clientX: at.x, clientY: at.y, button, bubbles: true });
  Object.defineProperty(event, 'pointerId', { value: id });
  canvas.dispatchEvent(event);
}

test('right and middle clicks do not focus a building', () => {
  const scene = loadSite();
  const at = screenPointOf(scene.site.office, scene);
  [1, 2].forEach((button) => {
    act(() => {
      pointer(scene.canvas, 'pointerdown', at, { button });
      pointer(scene.canvas, 'pointerup', at, { button });
    });
  });

  expect(flights()).toHaveLength(0);
  expect(scene.controls.autoRotate).toBe(true);
});

test('lifting fingers after a two-finger touch is not a click', () => {
  const scene = loadSite();
  const at = screenPointOf(scene.site.office, scene);
  const other = { x: at.x + 2, y: at.y };
  act(() => {
    pointer(scene.canvas, 'pointerdown', at, { id: 1 });
    pointer(scene.canvas, 'pointerdown', other, { id: 2 });
    pointer(scene.canvas, 'pointerup', other, { id: 2 });
    pointer(scene.canvas, 'pointerup', at, { id: 1 });
  });
  expect(flights()).toHaveLength(0);

  // A later single tap still works.
  act(() => {
    pointer(scene.canvas, 'pointerdown', at, { id: 3 });
    pointer(scene.canvas, 'pointerup', at, { id: 3 });
  });
  expect(flights()).toHaveLength(1);
});

test('unmounting mid-flight leaves no label, tween or key listener', () => {
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.guardHouse, scene));
  expect(flights()).toHaveLength(1);
  const layer = scene.container.querySelector('.FactoryScene-label').parentElement;

  scene.unmount();

  // React drops the mount element anyway; the layer must also leave it.
  expect(layer.parentElement).toBeNull();
  expect(layer.querySelector('.FactoryScene-label')).toBeNull();
  expect(document.querySelector('.FactoryScene-label')).toBeNull();
  expect(flights()).toHaveLength(0);
  expect(() => pressEscape()).not.toThrow();
  expect(mockRenderers[0].disposed).toBe(true);
});

test('unmounting while focused removes the Esc listener', () => {
  const scene = loadSite();
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  finishFlight();

  scene.unmount();
  pressEscape();

  expect(flights()).toHaveLength(0);
});

test('the dev debug handle lists buildings and reports focus', () => {
  const scene = loadSite();
  const handle = window.__FACTORY_SCENE__;

  expect(handle.buildings.map(({ id, label }) => [id, label])).toEqual([
    ['Office', 'Office'],
    ['GuardHouse', 'Guard House'],
  ]);
  expect(handle.buildings[0].box.equals(boxOf(scene.site.office))).toBe(true);

  click(scene.canvas, screenPointOf(scene.site.office, scene));
  expect(handle.getFocus()).toEqual({ focusedId: null, flying: true });
  finishFlight();
  expect(handle.getFocus()).toEqual({ focusedId: 'Office', flying: false });
});

describe('onFocusChange', () => {
  const calls = (spy) => spy.mock.calls.map(([id]) => id);

  test.each([
    ['click Office', (scene) => click(scene.canvas, screenPointOf(scene.site.office, scene)), ['Office']],
    [
      'click Office, finish, click Guard House',
      (scene) => {
        click(scene.canvas, screenPointOf(scene.site.office, scene));
        finishFlight();
        click(scene.canvas, screenPointOf(scene.site.guardHouse, scene));
      },
      ['Office', 'GuardHouse'],
    ],
    [
      'click Office, finish, Esc',
      (scene) => {
        click(scene.canvas, screenPointOf(scene.site.office, scene));
        finishFlight();
        pressEscape();
      },
      ['Office', null],
    ],
    [
      'click Office, Esc during the flight',
      (scene) => {
        click(scene.canvas, screenPointOf(scene.site.office, scene));
        pressEscape();
      },
      ['Office'],
    ],
    ['Esc in the overview', () => pressEscape(), []],
  ])('%s', (_, run, expected) => {
    const onFocusChange = jest.fn();
    const scene = loadSite(fakeSite(), { onFocusChange });
    run(scene);
    expect(calls(onFocusChange)).toEqual(expected);
  });

  test('clicking the focused building again is not reported', () => {
    const onFocusChange = jest.fn();
    const scene = loadSite(fakeSite(), { onFocusChange });
    click(scene.canvas, screenPointOf(scene.site.office, scene));
    finishFlight();
    click(scene.canvas, screenPointOf(scene.site.office, scene));
    expect(calls(onFocusChange)).toEqual(['Office']);
  });

  test('a new listener is used without rebuilding the scene', () => {
    const first = jest.fn();
    const second = jest.fn();
    const scene = loadSite(fakeSite(), { onFocusChange: first });
    scene.rerender(<FactoryScene onFocusChange={second} />);

    click(scene.canvas, screenPointOf(scene.site.office, scene));
    expect(first).not.toHaveBeenCalled();
    expect(calls(second)).toEqual(['Office']);
    expect(mockRenderers).toHaveLength(1);
  });
});

describe('building markers', () => {
  const markers = (container) => [...container.querySelectorAll('.FactoryScene-marker')];
  const visibleMarkers = (container) =>
    markers(container)
      .filter((marker) => marker.style.display !== 'none')
      .map((marker) => marker.getAttribute('aria-label'));
  const marker = (container, name) => markers(container).find((el) => el.getAttribute('aria-label') === name);

  test('every clickable building has a visible marker after load', () => {
    const scene = loadSite();
    expect(markers(scene.container).map((el) => el.tagName)).toEqual(['BUTTON', 'BUTTON']);
    expect(visibleMarkers(scene.container)).toEqual(['Office', 'Guard House']);
    expect(screen.getByRole('button', { name: 'Office' })).toBeInTheDocument();
  });

  test('clicking a marker focuses its building and hides only its marker', () => {
    const renderFrame = captureFrames();
    const scene = loadSite();
    act(() => marker(scene.container, 'Guard House').click());
    renderFrame();
    expect(visibleMarkers(scene.container)).toEqual(['Office']);

    finishFlight();
    renderFrame();
    expectFocusedOn(scene.site.guardHouse, scene);
    expect(visibleMarkers(scene.container)).toEqual(['Office']);
  });

  test('Enter on a marker switches focus to its building', () => {
    const renderFrame = captureFrames();
    const scene = loadSite();
    act(() => marker(scene.container, 'Guard House').click());
    finishFlight();

    userEvent.type(marker(scene.container, 'Office'), '{enter}');
    renderFrame();
    expect(visibleMarkers(scene.container)).toEqual(['Guard House']);
    finishFlight();
    expectFocusedOn(scene.site.office, scene);
  });

  test('returning to the overview shows every marker', () => {
    const renderFrame = captureFrames();
    const scene = loadSite();
    act(() => marker(scene.container, 'Office').click());
    finishFlight();

    pressEscape();
    renderFrame();
    expect(visibleMarkers(scene.container)).toEqual(['Office', 'Guard House']);
  });

  test('a marker click during a flight is ignored', () => {
    const scene = loadSite();
    click(scene.canvas, screenPointOf(scene.site.office, scene));
    act(() => marker(scene.container, 'Guard House').click());

    expect(flights()).toHaveLength(1);
    finishFlight();
    expectFocusedOn(scene.site.office, scene);
  });

  test("the focused building's marker changes nothing", () => {
    const onFocusChange = jest.fn();
    const scene = loadSite(fakeSite(), { onFocusChange });
    act(() => marker(scene.container, 'Office').click());
    finishFlight();
    act(() => marker(scene.container, 'Office').click());

    expect(flights()).toHaveLength(0);
    expect(onFocusChange).toHaveBeenCalledTimes(1);
  });

  test('a model without building nodes has no markers', () => {
    const scene = loadSite(fakeSite({ withBuildings: false }));
    expect(markers(scene.container)).toHaveLength(0);
  });

  test('markers take pointer input while their layer lets it through', () => {
    const scene = loadSite();
    const office = marker(scene.container, 'Office');
    expect(office.parentElement.style.pointerEvents).toBe('none');
    expect(office.style.pointerEvents).toBe('auto');
  });
});

test('a resize during the fly-in re-aims the flight for the new size', () => {
  const scene = loadSite();
  const resize = (width, height) => {
    sizeMount(scene.container, width, height);
    act(() => mockObservers[0].trigger());
  };
  resize(768, 800);
  click(scene.canvas, screenPointOf(scene.site.office, scene));

  const before = scene.camera.position.clone();
  resize(1280, 800);
  // The observer re-aims the flight but never moves the camera itself.
  expect(scene.camera.position.equals(before)).toBe(true);

  finishFlight();
  expect(scene.camera.aspect).toBeCloseTo(1280 / 800);
  expectFocusedOn(scene.site.office, scene);
});

describe('covered area', () => {
  // Screen-space bounds of an object's bounding-box corners.
  function projectedBox(object, { camera, controls, size }) {
    controls.update();
    camera.updateMatrixWorld();
    const { min, max } = boxOf(object);
    const xs = [];
    const ys = [];
    [min.x, max.x].forEach((x) =>
      [min.y, max.y].forEach((y) =>
        [min.z, max.z].forEach((z) => {
          const p = new THREE.Vector3(x, y, z).project(camera);
          xs.push(((p.x + 1) / 2) * size.width);
          ys.push(((1 - p.y) / 2) * size.height);
        })
      )
    );
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  const offsetOf = ({ camera }) => (camera.view && camera.view.enabled ? [camera.view.offsetX, camera.view.offsetY] : [0, 0]);

  test('no covered area draws the model on the whole scene', () => {
    const scene = loadSite();
    expect(offsetOf(scene)).toEqual([0, 0]);
  });

  test('a left band frames and centres the model to its right', () => {
    const scene = loadSite(fakeSite(), { coveredArea: { left: 560, top: 0 } });
    expect(offsetOf(scene)).toEqual([-280, 0]);

    const box = projectedBox(scene.site.scene, scene);
    expect(box.left).toBeGreaterThanOrEqual(560);
    expect(box.right).toBeLessThanOrEqual(1280);
    expect(Math.abs(screenPointOf(scene.site.scene, scene).x - 920)).toBeLessThanOrEqual(36);
  });

  test('a top band frames the model below it and clicks still pick what is drawn', () => {
    const size = { width: 375, height: 667 };
    const scene = loadSite(fakeSite(), { coveredArea: { left: 0, top: 170 } }, size);
    expect(offsetOf(scene)).toEqual([0, -85]);

    const box = projectedBox(scene.site.scene, scene);
    expect(box.top).toBeGreaterThanOrEqual(170);
    expect(box.bottom).toBeLessThanOrEqual(667);

    click(scene.canvas, screenPointOf(scene.site.office, scene));
    finishFlight();
    expectFocusedOn(scene.site.office, scene);
  });

  test('removing the band moves the framing back without rebuilding the scene', () => {
    const scene = loadSite(fakeSite(), { coveredArea: { left: 560, top: 0 } });
    scene.rerender(<FactoryScene coveredArea={{ left: 0, top: 0 }} />);
    expect(offsetOf(scene)).toEqual([-280, 0]);

    finishFlight();
    expect(offsetOf(scene)).toEqual([0, 0]);
    expect(mockRenderers).toHaveLength(1);
  });

  test('a band as large as the scene is ignored', () => {
    const scene = loadSite(fakeSite(), { coveredArea: { left: 2000, top: 0 } });
    expect(offsetOf(scene)).toEqual([0, 0]);
  });
});

test('a resize redraws the scene at once instead of waiting for the next frame', () => {
  captureFrames();
  const scene = loadSite();
  const render = jest.spyOn(mockRenderers[0], 'render');
  sizeMount(scene.container, 768, 800);
  act(() => mockObservers[0].trigger());
  sizeMount(scene.container, 1280, 800);
  render.mockClear();

  act(() => mockObservers[0].trigger());
  expect(render).toHaveBeenCalledTimes(1);
});

test('removing the band during a fly-in ends with the building centred on the whole scene', () => {
  const scene = loadSite(fakeSite(), { coveredArea: { left: 560, top: 0 } });
  click(scene.canvas, screenPointOf(scene.site.office, scene));
  scene.rerender(<FactoryScene coveredArea={{ left: 0, top: 0 }} />);

  finishFlight();
  expect(scene.camera.view && scene.camera.view.enabled ? scene.camera.view.offsetX : 0).toBe(0);
  expectFocusedOn(scene.site.office, scene);
  scene.controls.update();
  scene.camera.updateMatrixWorld();
  const centre = centreOf(scene.site.office).project(scene.camera);
  expect(Math.abs(centre.x)).toBeLessThan(0.01);
});
