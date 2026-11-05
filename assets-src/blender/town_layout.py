"""
城鎮空間配置 (blockout) 生成腳本

用法：
  blender --background --python town_layout.py
環境變數：
  TOWN_PREVIEW=1     低解析度快速預覽
  TOWN_NO_RENDER=1   只存 .blend 不渲染
輸出：town_layout.blend、town_layout_top.png (正上方俯視)、town_layout_aerial.png (斜角鳥瞰)

世界座標規格：
  1 unit = 1 m；+X 東、+Y 北、+Z 上；原點 = 城鎮中心
  城鎮 2km × 2km (±1000)；格網 200m (160m 用地 + 道路走廊)，格中心 = 200 × (i, j)，i, j ∈ -4..4
  陸地 z = 0、海面 z = -2；海岸線 y = -700 (第 -4 列全為海)
  區塊在本地座標建模、以格中心為原點，用 Collection Instance 放到世界座標
"""
import bpy
import math
import os
import random

from mathutils import Euler, Vector

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
PREVIEW = os.environ.get("TOWN_PREVIEW") == "1"
FONT_PATH = "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc"

TILE = 200          # 格距
LOT = 160           # 用地大小
HALF_TOWN = 1000
COAST_Y = -700
SEA_Z = -2
random.seed(11)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.context.preferences.filepaths.save_version = 0


# ---------------------------------------------------------------- 材質
def mat(name, color, rough=0.8, metal=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
    m.diffuse_color = (*color, alpha)
    return m


# 分區定義：代碼 → (中文名, 地面色)
ZONES = {
    "SEA":  ("海域",     (0.03, 0.15, 0.30)),
    "BCH":  ("海灘",     (0.75, 0.66, 0.45)),
    "PRK":  ("公園綠地", (0.12, 0.38, 0.10)),
    "HAR":  ("港口碼頭", (0.35, 0.37, 0.40)),
    "LOG":  ("物流倉儲", (0.45, 0.40, 0.32)),
    "IND":  ("工業區",   (0.40, 0.33, 0.25)),
    "COM":  ("商業區",   (0.55, 0.20, 0.18)),
    "CIV":  ("市政中心", (0.55, 0.50, 0.30)),
    "RES":  ("住宅區",   (0.60, 0.52, 0.30)),
    "SCH":  ("學校",     (0.30, 0.45, 0.60)),
    "HIL":  ("丘陵",     (0.10, 0.28, 0.08)),
}
ZM = {k: mat(f"MAT_Zone_{k}", c) for k, (_, c) in ZONES.items()}
M = {
    "terrain":  mat("MAT_Terrain", (0.13, 0.30, 0.08), 0.95),
    "sea":      mat("MAT_Sea", (0.02, 0.10, 0.22), 0.08, 0.2),
    "asphalt":  mat("MAT_Asphalt", (0.05, 0.05, 0.055), 0.9),
    "artery":   mat("MAT_Artery", (0.03, 0.03, 0.035), 0.9),
    "line":     mat("MAT_RoadLine", (0.85, 0.85, 0.85), 0.5),
    "quay":     mat("MAT_Quay", (0.50, 0.49, 0.46), 0.85),
    "bldg":     mat("MAT_Massing", (0.82, 0.82, 0.80), 0.7),
    "glass":    mat("MAT_GlassTower", (0.30, 0.45, 0.58), 0.15, 0.5),
    "house":    mat("MAT_House", (0.85, 0.78, 0.65), 0.8),
    "roof":     mat("MAT_RoofTile", (0.50, 0.18, 0.12), 0.7),
    "shed":     mat("MAT_Shed", (0.55, 0.58, 0.62), 0.4, 0.6),
    "tree":     mat("MAT_Tree", (0.06, 0.24, 0.05), 0.9),
    "crane":    mat("MAT_Crane", (0.85, 0.35, 0.05), 0.5, 0.3),
    "ship":     mat("MAT_Ship", (0.08, 0.12, 0.25), 0.5, 0.3),
    "track":    mat("MAT_Track", (0.65, 0.20, 0.15), 0.8),
    "label":    mat("MAT_Label", (1.0, 1.0, 1.0), 0.5),
    "grid":     mat("MAT_GridLabel", (1.0, 0.9, 0.3), 0.5),
}
M["sea"].diffuse_color = (0.15, 0.40, 0.70, 1)  # Solid 視窗用亮一點的藍，避免看起來一片黑
CONTAINER = [mat(f"MAT_Container{i}", c, 0.6) for i, c in enumerate([
    (0.65, 0.08, 0.05), (0.05, 0.20, 0.50), (0.80, 0.55, 0.05), (0.15, 0.45, 0.20)])]


# ---------------------------------------------------------------- 工具函式
def new_coll(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or scene.collection).children.link(c)
    return c


def box(name, loc, size, material, coll, rot=(0, 0, 0)):
    """size = 完整長寬高，loc = 中心點"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    for c in o.users_collection:
        c.objects.unlink(o)
    coll.objects.link(o)
    return o


def cone_tree(name, loc, h, coll):
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=h * 0.35, radius2=0, depth=h,
                                    location=(loc[0], loc[1], h / 2))
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(M["tree"])
    for c in o.users_collection:
        c.objects.unlink(o)
    coll.objects.link(o)
    return o


FONT = bpy.data.fonts.load(FONT_PATH) if os.path.exists(FONT_PATH) else None


def label(name, text, loc, size, material, coll):
    bpy.ops.object.text_add(location=loc)
    t = bpy.context.active_object
    t.name = name
    t.data.body = text
    t.data.size = size
    t.data.align_x = 'CENTER'
    t.data.align_y = 'CENTER'
    t.data.extrude = 0          # 平面字就好，立體中文字面數很高會拖慢視窗
    t.data.resolution_u = 2     # 降低字形曲線細分
    if FONT:
        t.data.font = FONT
    t.data.materials.append(material)
    t.visible_shadow = False  # 標籤浮在空中，不投影避免看起來重疊
    for c in t.users_collection:
        c.objects.unlink(t)
    coll.objects.link(t)
    return t


def join(objs, name):
    """把多個物件合併成一個，減少物件數讓視窗操作順暢"""
    objs = [o for o in objs if o.type == 'MESH']
    if not objs:
        return None
    if len(objs) > 1:
        with bpy.context.temp_override(active_object=objs[0], object=objs[0],
                                       selected_objects=objs, selected_editable_objects=objs):
            bpy.ops.object.join()
    objs[0].name = name
    return objs[0]


def tile_center(i, j):
    return i * TILE, j * TILE


# ---------------------------------------------------------------- 分區規劃 (i = 欄 西→東，j = 列 南→北)
def zone_of(i, j):
    if j == -4:
        return "SEA"
    if j == -3:
        if i <= -3: return "BCH"
        if i <= -1: return "PRK"
        if i <= 1:  return "HAR"
        return "LOG"
    if j == -2:
        return "IND"
    if j == 4:
        return "HIL"
    if (i, j) == (0, 0):
        return "CIV"
    if i == 0 and j in (1, 2):
        return "PRK"
    if (i, j) in ((-2, 2), (2, 3)):
        return "SCH"
    if j in (-1, 0) and -2 <= i <= 2:
        return "COM"
    if j == 1 and -1 <= i <= 1:
        return "COM"
    return "RES"


FACTORY_TILE = (-1, -2)
HARBOR_TILES = ((0, -3), (1, -3))

# ---------------------------------------------------------------- 地形 / 海
C_TERRAIN = new_coll("TOWN_Terrain")
mesh = bpy.data.meshes.new("Terrain")
step = 25
xs = list(range(-HALF_TOWN, HALF_TOWN + 1, step))
ys = list(range(COAST_Y, HALF_TOWN + 1, step))
verts, faces = [], []
for y in ys:
    for x in xs:
        z = 0.0
        if y > 700:  # 北側丘陵：從 y=700 往北升高到 ~40m
            t = (y - 700) / 300
            z = 40 * t * t * (0.75 + 0.25 * math.sin(x / 130) * math.cos(y / 90))
        verts.append((x, y, z - 0.05))
nx = len(xs)
for r in range(len(ys) - 1):
    for c in range(nx - 1):
        a = r * nx + c
        faces.append((a, a + 1, a + nx + 1, a + nx))
mesh.from_pydata(verts, [], faces)
terrain = bpy.data.objects.new("TOWN_Terrain", mesh)
terrain.data.materials.append(M["terrain"])
C_TERRAIN.objects.link(terrain)
for p in mesh.polygons:
    p.use_smooth = True

box("TOWN_Sea", (0, COAST_Y - 1300, SEA_Z), (6000, 2600, 0.1), M["sea"], C_TERRAIN)
box("TOWN_SeaFloor", (0, COAST_Y - 1300, -12), (6000, 2600, 0.1), ZM["SEA"], C_TERRAIN)
# 岸壁 (陸地邊緣垂直面)
box("TOWN_Seawall", (0, COAST_Y + 1, -6), (2000, 2, 12), M["quay"], C_TERRAIN)

# ---------------------------------------------------------------- 道路
C_ROAD = new_coll("TOWN_Roads")
ARTERY = {-100, 100}           # 主幹道 (x=±100、y=±100 圍住市政中心)
ROAD_LINES = list(range(-900, 901, 200))
y0, y1 = COAST_Y + 10, 900
for x in ROAD_LINES:
    w = 24 if x in ARTERY else 14
    m = M["artery"] if x in ARTERY else M["asphalt"]
    box(f"ROAD_NS_{x}", (x, (y0 + y1) / 2, 0.02), (w, y1 - y0, 0.04), m, C_ROAD)
for y in ROAD_LINES:
    if y < COAST_Y:
        continue
    w = 24 if y in ARTERY else 14
    m = M["artery"] if y in ARTERY else M["asphalt"]
    box(f"ROAD_EW_{y}", (0, y, 0.03), (1800 + w, w, 0.04), m, C_ROAD)
# 臨港道路 (沿海岸)
box("ROAD_Coastal", (0, COAST_Y + 15, 0.03), (1800, 14, 0.04), M["asphalt"], C_ROAD)
for x in ARTERY:  # 主幹道中線
    box(f"ROAD_Line_NS_{x}", (x, (y0 + y1) / 2, 0.06), (0.4, y1 - y0, 0.01), M["line"], C_ROAD)
for y in ARTERY:
    box(f"ROAD_Line_EW_{y}", (0, y, 0.06), (1800, 0.4, 0.01), M["line"], C_ROAD)

# ---------------------------------------------------------------- 分區地塊 + 量體
C_ZONES = new_coll("TOWN_Zones")
C_MASS = new_coll("TOWN_Massing")
C_LABEL = new_coll("TOWN_Labels")


def massing(code, i, j, cx, cy):
    """每種分區放簡單量體，只用來看尺度與密度"""
    tag = f"{code}_{i}_{j}"
    if code == "COM":
        for k in range(6):
            w, d = random.uniform(25, 40), random.uniform(25, 40)
            h = random.uniform(20, 70) * (1.6 if (abs(i) + abs(j)) <= 1 else 1.0)
            x = cx + (-40 if k % 2 == 0 else 40) + random.uniform(-6, 6)
            y = cy + (-50 + (k // 2) * 50)
            box(f"MASS_{tag}_{k}", (x, y, h / 2), (w, d, h), M["glass"], C_MASS)
    elif code == "CIV":
        box(f"MASS_{tag}_Hall", (cx, cy + 35, 12), (90, 40, 24), M["bldg"], C_MASS)
        box(f"MASS_{tag}_Plaza", (cx, cy - 30, 0.15), (120, 70, 0.1), M["quay"], C_MASS)
    elif code == "RES":
        for a in range(4):
            for b in range(4):
                x = cx - 60 + a * 40 + random.uniform(-3, 3)
                y = cy - 60 + b * 40 + random.uniform(-3, 3)
                h = random.choice((7, 10, 13))
                box(f"MASS_{tag}_{a}{b}", (x, y, h / 2), (16, 14, h), M["house"], C_MASS)
                box(f"MASS_{tag}_{a}{b}_R", (x, y, h + 0.4), (16.6, 14.6, 0.8), M["roof"], C_MASS)
    elif code in ("IND", "LOG"):
        for k in range(2):
            w = random.uniform(60, 120)
            d = random.uniform(40, 60)
            h = random.uniform(8, 16)
            box(f"MASS_{tag}_{k}", (cx + random.uniform(-10, 10), cy - 40 + k * 80, h / 2),
                (w, d, h), M["shed"], C_MASS)
    elif code == "SCH":
        box(f"MASS_{tag}_Bldg", (cx - 30, cy + 45, 8), (90, 20, 16), M["bldg"], C_MASS)
        box(f"MASS_{tag}_Track", (cx + 10, cy - 25, 0.12), (110, 70, 0.1), M["track"], C_MASS)
        box(f"MASS_{tag}_Field", (cx + 10, cy - 25, 0.18), (80, 45, 0.1), ZM["PRK"], C_MASS)
    elif code == "PRK":
        for k in range(14):
            cone_tree(f"MASS_{tag}_Tree{k}",
                      (cx + random.uniform(-70, 70), cy + random.uniform(-70, 70)),
                      random.uniform(8, 14), C_MASS)


for i in range(-4, 5):
    for j in range(-4, 5):
        code = zone_of(i, j)
        cx, cy = tile_center(i, j)
        if code != "SEA" and (i, j) != FACTORY_TILE and code != "HIL":
            box(f"ZONE_{code}_{i}_{j}", (cx, cy, 0.01), (LOT, LOT, 0.02), ZM[code], C_ZONES)
        if (i, j) != FACTORY_TILE and (i, j) not in HARBOR_TILES:
            before = set(C_MASS.objects)
            massing(code, i, j, cx, cy)
            join([o for o in C_MASS.objects if o not in before], f"MASS_{code}_{i}_{j}")
        if code == "SEA" or (i, j) == FACTORY_TILE or (i, j) in HARBOR_TILES:
            continue
        name = ZONES[code][0]
        lz = {"COM": 150, "HIL": 70}.get(code, 30)
        label(f"LBL_{i}_{j}", f"{name}\n({i},{j})", (cx, cy, lz), 30, M["label"], C_LABEL)
label("LBL_SEA", "海域 SEA  (第 -4 列)  海面 z=-2", (0, -800, 5), 40, M["label"], C_LABEL)

# ---------------------------------------------------------------- 港口區 HAR (本地座標建模，中心 = 兩格中點)
C_HAR = bpy.data.collections.new("HAR")  # 不直接放進場景，用 instance 擺放
HX, HY = 100, -600   # 兩格 (0,-3)+(1,-3) 的中心
HW = 2 * LOT + (TILE - LOT)  # 360m 寬 (兩格合併，中間不留路)
box("HAR_Apron", (0, -40, 0.03), (HW, 80, 0.06), M["quay"], C_HAR)          # 碼頭面 (沿岸 80m)
box("HAR_Yard", (0, 45, 0.02), (HW, 90, 0.04), ZM["HAR"], C_HAR)            # 堆場
# 突堤碼頭伸入海中
box("HAR_Pier", (-60, -170, -1), (60, 180, 2.1), M["quay"], C_HAR)
for k in range(3):  # 岸邊起重機
    x = -120 + k * 80
    for s in (-1, 1):
        box(f"HAR_Crane{k}_Leg{s}", (x + s * 8, -65, 20), (2, 2, 40), M["crane"], C_HAR)
    box(f"HAR_Crane{k}_Boom", (x, -85, 42), (4, 70, 4), M["crane"], C_HAR)
for r in range(5):  # 貨櫃堆
    for c in range(8):
        h = random.randint(1, 4)
        for l in range(h):
            box(f"HAR_Ctn_{r}_{c}_{l}", (-150 + c * 14, 15 + r * 16, 1.3 + l * 2.6),
                (12, 2.4, 2.6), random.choice(CONTAINER), C_HAR)
box("HAR_Warehouse", (110, 50, 7), (90, 40, 14), M["shed"], C_HAR)
box("HAR_Office", (30, 80, 6), (30, 15, 12), M["bldg"], C_HAR)
box("HAR_Gate", (0, 92, 3), (24, 3, 6), M["crane"], C_HAR)
# 貨櫃輪
box("HAR_Ship_Hull", (60, -120, 2), (180, 28, 14), M["ship"], C_HAR)
box("HAR_Ship_Bridge", (130, -120, 16), (16, 24, 16), M["bldg"], C_HAR)
for k in range(6):
    box(f"HAR_Ship_Ctn{k}", (-10 + k * 22, -120, 12), (18, 22, 6), random.choice(CONTAINER), C_HAR)
label("HAR_Label", "港口碼頭 HAR\n(0,-3)+(1,-3)", (0, 40, 70), 34, M["grid"], C_HAR)

bpy.ops.object.collection_instance_add(collection=C_HAR.name, location=(HX, HY, 0))
inst = bpy.context.active_object
inst.name = "INST_HAR"

# ---------------------------------------------------------------- 工業區 IND：引入現有工廠
fpath = os.path.join(OUT_DIR, "factory.blend")
if os.path.exists(fpath):
    with bpy.data.libraries.load(fpath, link=False) as (src, dst):
        dst.objects = list(src.objects)
    C_IND = bpy.data.collections.new("IND_Factory")
    for o in dst.objects:
        if o is None or o.type in {'CAMERA', 'LIGHT'}:
            continue
        C_IND.objects.link(o)
    fx, fy = tile_center(*FACTORY_TILE)
    bpy.ops.object.collection_instance_add(collection=C_IND.name, location=(fx, fy, 0))
    bpy.context.active_object.name = "INST_IND_Factory"
    label("IND_Label", "工廠 IND\n(-1,-2)", (fx, fy, 60), 34, M["grid"], C_LABEL)

# ---------------------------------------------------------------- 世界座標軸指示 (原點)
C_AXIS = new_coll("TOWN_Axis")
box("AXIS_X", (40, 0, 120), (80, 3, 3), mat("AxisX", (0.9, 0.1, 0.1)), C_AXIS)
box("AXIS_Y", (0, 40, 120), (3, 80, 3), mat("AxisY", (0.1, 0.8, 0.1)), C_AXIS)
box("AXIS_Z", (0, 0, 160), (3, 3, 80), mat("AxisZ", (0.1, 0.3, 0.9)), C_AXIS)
label("AXIS_N", "N ↑", (0, 980, 50), 40, M["grid"], C_AXIS)

# ---------------------------------------------------------------- 光源 / 天空
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.45, 0.6, 0.85, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
bpy.ops.object.light_add(type='SUN', rotation=(math.radians(40), 0, math.radians(30)))
bpy.context.active_object.data.energy = 4


# ---------------------------------------------------------------- 相機
def look_at(cam, target):
    d = cam.location - Vector(target)
    cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()


bpy.ops.object.camera_add(location=(0, 0, 3000))
top = bpy.context.active_object
top.name = "CAM_Top"
top.data.type = 'ORTHO'
top.data.ortho_scale = 2150
top.data.clip_end = 10000

bpy.ops.object.camera_add(location=(1250, -1750, 1100))
aerial = bpy.context.active_object
aerial.name = "CAM_Aerial"
aerial.data.lens = 32
aerial.data.clip_end = 10000
look_at(aerial, (-50, 0, 0))

# ---------------------------------------------------------------- 存檔 / 渲染
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 8 if PREVIEW else 32
scene.cycles.use_denoising = True
scene.render.resolution_x = scene.render.resolution_y = 800 if PREVIEW else 1800
scene.camera = top

# 開檔時的 3D 視窗：看得到整個城鎮 (預設只看原點附近 18m、1000m 外會被裁掉)
view_rot = Euler((math.radians(55), 0, math.radians(35))).to_quaternion()
for scr in bpy.data.screens:
    for area in scr.areas:
        if area.type != 'VIEW_3D':
            continue
        sp = area.spaces.active
        sp.clip_start = 1
        sp.clip_end = 10000
        sp.shading.type = 'SOLID'
        r = sp.region_3d
        r.view_perspective = 'PERSP'
        r.view_location = (0, -100, 0)
        r.view_distance = 2600
        r.view_rotation = view_rot
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT_DIR, "town_layout.blend"))

if os.environ.get("TOWN_NO_RENDER") != "1":
    for cam, res, name in ((top, (1800, 1800), "top"), (aerial, (2400, 1350), "aerial")):
        scene.camera = cam
        f = 0.45 if PREVIEW else 1.0
        scene.render.resolution_x, scene.render.resolution_y = int(res[0] * f), int(res[1] * f)
        scene.render.filepath = os.path.join(OUT_DIR, f"town_layout_{name}.png")
        bpy.ops.render.render(write_still=True)
