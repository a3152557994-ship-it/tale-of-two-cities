#!/usr/bin/env python3
"""
Blender 5.2.2 LTS headless diorama builder for:
  - public/models/london_act1.glb  (London 1775: Order, Fog, Dover Mail & Soho Warmth)
  - public/models/paris_act1.glb   (Paris 1775: Hunger, Spilled Wine, Bastille & Guillotine)

Both dioramas share identical octagonal plinth dimensions and mirrored spatial landmarks
so the Golden Seam tear aligns cleanly across the same camera frustum.
"""

import math
import os
import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(PROJECT_ROOT, "public", "models")


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_material(
    name: str,
    base_color=(0.5, 0.5, 0.5, 1.0),
    metallic=0.0,
    roughness=0.7,
    emission_color=(0.0, 0.0, 0.0, 1.0),
    emission_strength=0.0,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = None
    for node in nt.nodes:
        if node.type == "BSDF_PRINCIPLED":
            bsdf = node
            break
    if bsdf is None:
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")

    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = base_color
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = metallic
    if "Roughness" in bsdf.inputs:
        bsdf.inputs["Roughness"].default_value = roughness
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = emission_color
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def assign_mat(obj, mat):
    if obj.data is None:
        return
    if len(obj.data.materials) == 0:
        obj.data.materials.append(mat)
    else:
        obj.data.materials[0] = mat


def apply_bevel_and_smooth(obj, width=0.03, segments=2, smooth=True):
    if obj.type != "MESH":
        return
    if width > 0.0:
        mod = obj.modifiers.new(name="Bevel", type="BEVEL")
        mod.width = width
        mod.segments = segments
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(32.0)
        mod.use_clamp_overlap = True
    if smooth:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.shade_smooth()
        obj.select_set(False)


def add_box(name, size, location, rotation=(0, 0, 0), mat=None, bevel=0.03):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        assign_mat(obj, mat)
    apply_bevel_and_smooth(obj, width=bevel, segments=2, smooth=True)
    return obj


def add_cylinder(
    name,
    radius,
    depth,
    location,
    rotation=(0, 0, 0),
    vertices=24,
    mat=None,
    bevel=0.02,
):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        assign_mat(obj, mat)
    apply_bevel_and_smooth(obj, width=bevel, segments=2, smooth=True)
    return obj


def add_cone(
    name,
    radius1,
    radius2,
    depth,
    location,
    rotation=(0, 0, 0),
    vertices=24,
    mat=None,
    bevel=0.015,
):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        assign_mat(obj, mat)
    apply_bevel_and_smooth(obj, width=bevel, segments=2, smooth=True)
    return obj


def add_sphere(name, radius, location, scale=(1, 1, 1), segments=24, rings=16, mat=None):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=radius, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        assign_mat(obj, mat)
    apply_bevel_and_smooth(obj, width=0.0, smooth=True)
    return obj


def add_torus(name, major_radius, minor_radius, location, rotation=(0, 0, 0), mat=None):
    bpy.ops.mesh.primitive_torus_add(
        major_segments=32,
        minor_segments=12,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        assign_mat(obj, mat)
    apply_bevel_and_smooth(obj, width=0.0, smooth=True)
    return obj


def add_curved_hull(name, points_xy_halfwidth, height, z_base, location, rotation=(0, 0, 0), mat=None):
    """Build a sculpted curved coach cabin or boat-like body using bmesh cross-sections."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()

    # Cross-section rings along X axis: (x, half_y, z_bot, z_top)
    rings = []
    for x, hy, zb, zt in points_xy_halfwidth:
        v0 = bm.verts.new((x, -hy, zb))
        v1 = bm.verts.new((x, hy, zb))
        v2 = bm.verts.new((x, hy * 0.92, zt))
        v3 = bm.verts.new((x, -hy * 0.92, zt))
        rings.append((v0, v1, v2, v3))

    for i in range(len(rings) - 1):
        a = rings[i]
        b = rings[i + 1]
        for k in range(4):
            kn = (k + 1) % 4
            bm.faces.new((a[k], a[kn], b[kn], b[k]))

    # Cap ends
    bm.faces.new(reversed(rings[0]))
    bm.faces.new(rings[-1])

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj.location = Vector(location) + Vector((0, 0, z_base))
    obj.rotation_euler = Euler(rotation)
    if mat:
        assign_mat(obj, mat)
    apply_bevel_and_smooth(obj, width=0.025, segments=2, smooth=True)
    return obj


def add_spoked_wheel(name_prefix, radius, rim_thickness, spokes, location, rotation, mat_wood, mat_iron):
    # Outer iron-rimmed tire
    add_torus(
        f"{name_prefix}_Rim",
        major_radius=radius,
        minor_radius=rim_thickness,
        location=location,
        rotation=rotation,
        mat=mat_iron,
    )
    add_torus(
        f"{name_prefix}_Felloe",
        major_radius=radius - rim_thickness * 1.1,
        minor_radius=rim_thickness * 0.85,
        location=location,
        rotation=rotation,
        mat=mat_wood,
    )
    # Hub
    add_cylinder(
        f"{name_prefix}_Hub",
        radius=radius * 0.17,
        depth=rim_thickness * 3.8,
        location=location,
        rotation=rotation,
        vertices=16,
        mat=mat_iron,
        bevel=0.01,
    )
    # Spokes in wheel local plane (torus default lies in XY, so rotate spokes inside local frame)
    rot_mat = Euler(rotation).to_matrix()
    for i in range(spokes):
        angle = (2.0 * math.pi * i) / spokes
        local_dir = Vector((math.cos(angle), math.sin(angle), 0.0))
        world_dir = rot_mat @ local_dir
        center = Vector(location) + world_dir * (radius * 0.5)
        # Cylinder axis is local Z; align local Z to world_dir
        q = Vector((0, 0, 1)).rotation_difference(world_dir)
        add_cylinder(
            f"{name_prefix}_Spoke_{i}",
            radius=rim_thickness * 0.42,
            depth=radius * 0.92,
            location=center,
            rotation=q.to_euler(),
            vertices=8,
            mat=mat_wood,
            bevel=0.004,
        )


def add_arched_window(prefix, location, rot_z, width, height, frame_mat, glass_mat):
    rot = (0, 0, rot_z)
    # Recessed sill
    add_box(
        f"{prefix}_Sill",
        (width * 1.18, 0.14, 0.07),
        (location[0], location[1], location[2] - height * 0.5 - 0.03),
        rotation=rot,
        mat=frame_mat,
        bevel=0.015,
    )
    # Glowing/dark pane
    add_box(
        f"{prefix}_Pane",
        (width * 0.86, 0.06, height * 0.85),
        (location[0], location[1], location[2] - height * 0.05),
        rotation=rot,
        mat=glass_mat,
        bevel=0.008,
    )
    # Arched top glass
    add_cylinder(
        f"{prefix}_ArchGlass",
        radius=width * 0.43,
        depth=0.06,
        location=(location[0], location[1], location[2] + height * 0.36),
        rotation=(math.pi * 0.5, 0, rot_z),
        vertices=16,
        mat=glass_mat,
        bevel=0.005,
    )
    # Mullions
    add_box(
        f"{prefix}_MullionV",
        (0.035, 0.09, height),
        location,
        rotation=rot,
        mat=frame_mat,
        bevel=0.005,
    )
    add_box(
        f"{prefix}_MullionH",
        (width * 0.92, 0.09, 0.035),
        location,
        rotation=rot,
        mat=frame_mat,
        bevel=0.005,
    )


def add_street_lamp(prefix, location, mat_iron, mat_glow):
    x, y, z = location
    add_cylinder(f"{prefix}_Base", 0.14, 0.35, (x, y, z + 0.175), vertices=12, mat=mat_iron, bevel=0.015)
    add_cylinder(f"{prefix}_Post", 0.055, 2.05, (x, y, z + 1.2), vertices=12, mat=mat_iron, bevel=0.008)
    add_cone(f"{prefix}_Cup", 0.11, 0.2, 0.18, (x, y, z + 2.3), vertices=8, mat=mat_iron, bevel=0.01)
    add_cylinder(f"{prefix}_Lantern", 0.16, 0.32, (x, y, z + 2.52), vertices=6, mat=mat_glow, bevel=0.01)
    add_cone(f"{prefix}_Cap", 0.22, 0.02, 0.2, (x, y, z + 2.78), vertices=6, mat=mat_iron, bevel=0.01)


def add_cloaked_figure(prefix, location, rot_z, mat_coat, mat_skin, scale=1.0, kneeling=False):
    x, y, z = location
    if kneeling:
        # Torso leaning forward
        add_cone(
            f"{prefix}_Cloak",
            0.26 * scale,
            0.13 * scale,
            0.62 * scale,
            (x, y, z + 0.30 * scale),
            rotation=(0.45, 0.0, rot_z),
            vertices=14,
            mat=mat_coat,
            bevel=0.02,
        )
        add_sphere(
            f"{prefix}_Head",
            0.11 * scale,
            (x + math.sin(rot_z) * 0.14 * scale, y - math.cos(rot_z) * 0.14 * scale, z + 0.62 * scale),
            mat=mat_skin,
        )
    else:
        add_cone(
            f"{prefix}_Cloak",
            0.27 * scale,
            0.13 * scale,
            0.92 * scale,
            (x, y, z + 0.46 * scale),
            rotation=(0.0, 0.0, rot_z),
            vertices=16,
            mat=mat_coat,
            bevel=0.02,
        )
        add_torus(
            f"{prefix}_Collar",
            0.14 * scale,
            0.045 * scale,
            (x, y, z + 0.88 * scale),
            mat=mat_coat,
        )
        add_sphere(
            f"{prefix}_Head",
            0.115 * scale,
            (x, y, z + 1.04 * scale),
            mat=mat_skin,
        )
        # Tricorne / tall 1775 hat
        add_cylinder(
            f"{prefix}_HatBrim",
            0.19 * scale,
            0.03 * scale,
            (x, y, z + 1.12 * scale),
            vertices=14,
            mat=mat_coat,
            bevel=0.008,
        )
        add_cylinder(
            f"{prefix}_HatCrown",
            0.105 * scale,
            0.14 * scale,
            (x, y, z + 1.20 * scale),
            vertices=14,
            mat=mat_coat,
            bevel=0.01,
        )


def add_gnarled_tree(prefix, location, mat_bark, seed_angle=0.0, scale=1.0):
    x, y, z = location
    add_cone(
        f"{prefix}_Trunk",
        0.22 * scale,
        0.10 * scale,
        1.55 * scale,
        (x, y, z + 0.77 * scale),
        rotation=(0.08, -0.06, seed_angle),
        vertices=10,
        mat=mat_bark,
        bevel=0.02,
    )
    branches = [
        (0.24, 0.12, 1.35, (0.65, 0.25, seed_angle + 0.4), 1.05),
        (-0.22, -0.15, 1.48, (-0.55, -0.45, seed_angle + 2.1), 0.95),
        (0.08, -0.24, 1.60, (0.35, -0.75, seed_angle + 4.0), 0.85),
        (-0.14, 0.22, 1.72, (-0.45, 0.65, seed_angle + 5.2), 0.78),
    ]
    for idx, (bx, by, bz, rot, blen) in enumerate(branches):
        add_cone(
            f"{prefix}_Branch_{idx}",
            0.08 * scale,
            0.022 * scale,
            blen * scale,
            (x + bx * scale, y + by * scale, z + bz * scale),
            rotation=rot,
            vertices=8,
            mat=mat_bark,
            bevel=0.01,
        )


def build_shared_plinth(city_prefix, mat_plinth, mat_brass, mat_cobble, mat_gutter):
    """Build identical octagonal museum plinth & stepped cobblestone streets for seamless seam mirroring."""
    # Lower stepped octagonal base
    add_cylinder(
        f"{city_prefix}_PlinthLower",
        radius=7.25,
        depth=0.45,
        location=(0, 0, -0.58),
        rotation=(0, 0, math.pi / 8.0),
        vertices=8,
        mat=mat_plinth,
        bevel=0.05,
    )
    # Brass museum rim band
    add_cylinder(
        f"{city_prefix}_PlinthBrass",
        radius=6.98,
        depth=0.14,
        location=(0, 0, -0.30),
        rotation=(0, 0, math.pi / 8.0),
        vertices=8,
        mat=mat_brass,
        bevel=0.02,
    )
    # Main stage deck
    add_cylinder(
        f"{city_prefix}_PlinthDeck",
        radius=6.82,
        depth=0.38,
        location=(0, 0, -0.12),
        rotation=(0, 0, math.pi / 8.0),
        vertices=8,
        mat=mat_cobble,
        bevel=0.04,
    )
    # Raised North-West & North-East sidewalk terraces
    add_box(
        f"{city_prefix}_Sidewalk_NW",
        (3.4, 3.3, 0.22),
        (-2.55, 1.35, 0.14),
        mat=mat_gutter,
        bevel=0.03,
    )
    add_box(
        f"{city_prefix}_Sidewalk_NE",
        (4.1, 3.0, 0.34),
        (2.45, 2.35, 0.20),
        mat=mat_gutter,
        bevel=0.04,
    )
    # Neat avenue stone curbstones flanking the central coach road
    for side_idx, (cx_base, cy_base, rot_z) in enumerate(
        [(-3.6, -1.15, -0.14), (-1.4, -1.45, -0.14), (1.1, -1.78, -0.14), (-3.8, -2.95, -0.10), (-1.2, -3.22, -0.10), (1.4, -3.45, -0.10)]
    ):
        add_box(
            f"{city_prefix}_CurbStone_{side_idx}",
            (1.95, 0.28, 0.12),
            (cx_base, cy_base, 0.08),
            rotation=(0, 0, rot_z),
            mat=mat_gutter,
            bevel=0.02,
        )


def build_london_diorama():
    reset_scene()

    # Materials: Slate-indigo stone, weathered Portland limestone, dark oak, tarnished brass, warm Soho amber, fog glow
    mat_plinth = make_material("Lon_Plinth", (0.09, 0.10, 0.13, 1.0), metallic=0.15, roughness=0.65)
    mat_brass = make_material("Lon_Brass", (0.72, 0.55, 0.28, 1.0), metallic=0.85, roughness=0.28)
    mat_cobble = make_material("Lon_Cobble", (0.20, 0.23, 0.28, 1.0), metallic=0.05, roughness=0.72)
    mat_stone = make_material("Lon_PortlandStone", (0.44, 0.46, 0.49, 1.0), metallic=0.0, roughness=0.68)
    mat_brick = make_material("Lon_GeorgianBrick", (0.29, 0.26, 0.27, 1.0), metallic=0.0, roughness=0.78)
    mat_slate = make_material("Lon_RoofSlate", (0.14, 0.17, 0.22, 1.0), metallic=0.1, roughness=0.55)
    mat_iron = make_material("Lon_WroughtIron", (0.11, 0.12, 0.14, 1.0), metallic=0.8, roughness=0.35)
    mat_wood = make_material("Lon_Mahogany", (0.25, 0.15, 0.10, 1.0), metallic=0.05, roughness=0.52)
    mat_coach = make_material("Lon_RoyalCoach", (0.14, 0.21, 0.27, 1.0), metallic=0.25, roughness=0.40)
    mat_amber = make_material(
        "Lon_WarmAmber",
        (0.95, 0.68, 0.28, 1.0),
        metallic=0.0,
        roughness=0.25,
        emission_color=(1.0, 0.66, 0.24, 1.0),
        emission_strength=3.6,
    )
    mat_cloak = make_material("Lon_Cloak", (0.13, 0.15, 0.19, 1.0), metallic=0.0, roughness=0.85)
    mat_skin = make_material("Lon_Skin", (0.68, 0.58, 0.50, 1.0), metallic=0.0, roughness=0.70)
    mat_bark = make_material("Lon_Bark", (0.18, 0.15, 0.13, 1.0), metallic=0.0, roughness=0.88)

    build_shared_plinth("London", mat_plinth, mat_brass, mat_cobble, mat_stone)

    # 1. NORTH-WEST QUARTER: Soho Manette Residence & Georgian Townhouse Terrace (Anchor 2 at ~(-2.6, 0.2, 1.3))
    add_box("Lon_SohoHouse_Main", (2.6, 2.0, 2.7), (-2.7, 1.2, 1.55), mat=mat_brick, bevel=0.04)
    add_box("Lon_SohoHouse_Cornice", (2.82, 2.22, 0.18), (-2.7, 1.2, 2.95), mat=mat_stone, bevel=0.03)
    # Pitched slate roof + chimney pots
    add_box(
        "Lon_SohoRoof",
        (2.75, 1.65, 0.9),
        (-2.7, 1.2, 3.25),
        rotation=(0.25, 0, 0),
        mat=mat_slate,
        bevel=0.03,
    )
    for cx in (-3.45, -2.0):
        add_box(f"Lon_Chimney_{cx}", (0.42, 0.42, 0.95), (cx, 1.55, 3.6), mat=mat_brick, bevel=0.02)
        add_cylinder(f"Lon_ChimneyPot_{cx}", 0.10, 0.34, (cx, 1.55, 4.18), vertices=12, mat=mat_stone, bevel=0.01)

    # Warm arched Georgian windows facing camera (-Y side) -> Lucie's golden thread refuge
    for wx in (-3.35, -2.70, -2.05):
        add_arched_window(f"Lon_SohoWin_Upper_{wx}", (wx, 0.19, 2.25), 0.0, 0.42, 0.72, mat_stone, mat_amber)
    add_arched_window("Lon_SohoWin_HearthL", (-3.35, 0.19, 1.15), 0.0, 0.45, 0.85, mat_stone, mat_amber)
    add_arched_window("Lon_SohoWin_HearthR", (-2.05, 0.19, 1.15), 0.0, 0.45, 0.85, mat_stone, mat_amber)
    # Fanlight portico door
    add_box("Lon_SohoDoor", (0.50, 0.14, 1.05), (-2.70, 0.21, 0.78), mat=mat_wood, bevel=0.015)
    add_box("Lon_SohoPorticoTop", (0.85, 0.40, 0.14), (-2.70, 0.08, 1.38), mat=mat_stone, bevel=0.02)
    add_cylinder("Lon_SohoColL", 0.06, 1.15, (-3.02, -0.02, 0.78), vertices=12, mat=mat_stone, bevel=0.01)
    add_cylinder("Lon_SohoColR", 0.06, 1.15, (-2.38, -0.02, 0.78), vertices=12, mat=mat_stone, bevel=0.01)

    # 2. NORTH-EAST HIGH GROUND: St. Paul's Cathedral Dome & Old Bailey Pediment (Anchor 3 at ~(2.6, 2.5, 3.2))
    add_box("Lon_CathedralBase", (2.9, 2.4, 1.55), (2.55, 2.45, 1.10), mat=mat_stone, bevel=0.04)
    # Old Bailey classical pediment facade
    add_cone(
        "Lon_OldBaileyPediment",
        1.55,
        0.06,
        0.55,
        (2.55, 1.32, 2.15),
        rotation=(0, 0, math.pi / 4.0),
        vertices=4,
        mat=mat_stone,
        bevel=0.02,
    )
    # Colonnade drum (12 classical columns around St. Paul's drum)
    drum_center = (2.6, 2.55)
    add_cylinder("Lon_DomeDrum", 0.96, 1.05, (drum_center[0], drum_center[1], 2.35), vertices=28, mat=mat_stone, bevel=0.02)
    for i in range(12):
        ang = (2.0 * math.pi * i) / 12.0
        px = drum_center[0] + math.cos(ang) * 1.08
        py = drum_center[1] + math.sin(ang) * 1.08
        add_cylinder(f"Lon_DrumCol_{i}", 0.065, 1.02, (px, py, 2.35), vertices=10, mat=mat_stone, bevel=0.01)
    add_torus("Lon_DomeGallery", 1.12, 0.08, (drum_center[0], drum_center[1], 2.90), mat=mat_stone)
    # Ribbed cupola dome
    add_sphere("Lon_StPaulsDome", 1.02, (drum_center[0], drum_center[1], 2.98), scale=(1.0, 1.0, 1.12), mat=mat_slate)
    add_cylinder("Lon_DomeLantern", 0.24, 0.65, (drum_center[0], drum_center[1], 4.28), vertices=12, mat=mat_stone, bevel=0.015)
    add_cone("Lon_DomeSpire", 0.22, 0.02, 0.50, (drum_center[0], drum_center[1], 4.82), vertices=12, mat=mat_brass, bevel=0.01)
    add_box("Lon_DomeCrossV", (0.06, 0.06, 0.36), (drum_center[0], drum_center[1], 5.18), mat=mat_brass, bevel=0.005)
    add_box("Lon_DomeCrossH", (0.24, 0.06, 0.06), (drum_center[0], drum_center[1], 5.24), mat=mat_brass, bevel=0.005)

    # 3. EAST / SOUTH-EAST: Tellson's Bank Portico & Galloping Fog Messenger (Anchor 4 at ~(2.3, -1.6, 1.1))
    add_box("Lon_TellsonsBank", (1.85, 1.45, 1.95), (3.1, -1.25, 1.05), rotation=(0, 0, -0.35), mat=mat_brick, bevel=0.03)
    add_box("Lon_BankCornice", (2.02, 1.62, 0.14), (3.1, -1.25, 2.06), rotation=(0, 0, -0.35), mat=mat_stone, bevel=0.025)
    add_box("Lon_BankRoof", (1.92, 1.38, 0.65), (3.1, -1.25, 2.38), rotation=(0.20, 0, -0.35), mat=mat_slate, bevel=0.03)
    add_box("Lon_BankChimney", (0.34, 0.34, 0.70), (3.45, -1.05, 2.68), rotation=(0, 0, -0.35), mat=mat_brick, bevel=0.02)
    add_arched_window("Lon_BankWin1", (2.46, -1.80, 1.35), -0.35, 0.38, 0.70, mat_stone, mat_amber)
    add_arched_window("Lon_BankWin2", (3.24, -2.08, 1.35), -0.35, 0.38, 0.70, mat_stone, mat_amber)
    add_box("Lon_BankLedgerSign", (0.75, 0.10, 0.28), (2.85, -1.95, 0.78), rotation=(0, 0, -0.35), mat=mat_brass, bevel=0.015)
    # Courier Horse Silhouette arriving at Tellson's (Jerry Cruncher's night dispatch)
    add_box("Lon_HorseBody", (0.85, 0.30, 0.36), (1.85, -1.95, 0.76), rotation=(0, -0.10, 0.30), mat=mat_cloak, bevel=0.06)
    add_cone("Lon_HorseNeck", 0.14, 0.08, 0.52, (1.42, -2.08, 1.05), rotation=(0.15, 0.65, 0.30), vertices=10, mat=mat_cloak, bevel=0.02)
    add_box("Lon_HorseHead", (0.28, 0.14, 0.16), (1.18, -2.14, 1.24), rotation=(0, 0.45, 0.30), mat=mat_cloak, bevel=0.03)
    for lx, ly, lrot in [(-0.28, -0.10, -0.25), (-0.28, 0.10, 0.35), (0.30, -0.10, 0.30), (0.30, 0.10, -0.35)]:
        add_cylinder(
            f"Lon_HorseLeg_{lx}_{ly}",
            0.045,
            0.62,
            (1.85 + lx, -1.95 + ly, 0.38),
            rotation=(0, lrot, 0.30),
            vertices=8,
            mat=mat_cloak,
            bevel=0.01,
        )
    add_cloaked_figure("Lon_CourierRider", (1.85, -1.95, 0.85), 0.30, mat_cloak, mat_skin, scale=0.72)

    # 4. CENTER AVENUE: 1775 Dover Royal Mail Coach (Anchor 1 at ~(-0.2, -2.0, 1.1))
    coach_pos = (-0.25, -1.85, 0.0)
    # Sculpted curved coach cabin
    cabin_profile = [
        (-0.88, 0.36, 0.58, 1.48),
        (-0.55, 0.54, 0.44, 1.62),
        (0.0, 0.58, 0.42, 1.66),
        (0.55, 0.54, 0.44, 1.62),
        (0.88, 0.38, 0.56, 1.50),
    ]
    add_curved_hull("Lon_CoachCabin", cabin_profile, 1.2, 0.12, coach_pos, rotation=(0, 0, -0.12), mat=mat_coach)
    # Brass roof rails & luggage trunk
    add_box("Lon_CoachTrunk", (0.58, 0.62, 0.32), (coach_pos[0] + 0.02, coach_pos[1], 1.88), rotation=(0, 0, -0.12), mat=mat_wood, bevel=0.03)
    add_box("Lon_CoachDriverBox", (0.38, 0.72, 0.34), (coach_pos[0] - 0.92, coach_pos[1] + 0.11, 1.34), rotation=(0, 0, -0.12), mat=mat_wood, bevel=0.03)
    # Glowing cabin windows & dual brass carriage lanterns
    add_box("Lon_CoachWinF", (0.52, 1.18, 0.40), (coach_pos[0], coach_pos[1], 1.28), rotation=(0, 0, -0.12), mat=mat_amber, bevel=0.01)
    add_cylinder("Lon_CoachLanternL", 0.08, 0.22, (coach_pos[0] - 0.88, coach_pos[1] - 0.42, 1.44), vertices=8, mat=mat_amber, bevel=0.01)
    add_cylinder("Lon_CoachLanternR", 0.08, 0.22, (coach_pos[0] - 0.76, coach_pos[1] + 0.58, 1.44), vertices=8, mat=mat_amber, bevel=0.01)
    # Four 12-spoke wheels
    wheel_rot = (math.pi * 0.5, 0, -0.12)
    add_spoked_wheel("Lon_WheelFL", 0.38, 0.042, 10, (coach_pos[0] - 0.68, coach_pos[1] - 0.52, 0.46), wheel_rot, mat_wood, mat_iron)
    add_spoked_wheel("Lon_WheelFR", 0.38, 0.042, 10, (coach_pos[0] - 0.56, coach_pos[1] + 0.66, 0.46), wheel_rot, mat_wood, mat_iron)
    add_spoked_wheel("Lon_WheelRL", 0.46, 0.045, 12, (coach_pos[0] + 0.68, coach_pos[1] - 0.62, 0.54), wheel_rot, mat_wood, mat_iron)
    add_spoked_wheel("Lon_WheelRR", 0.46, 0.045, 12, (coach_pos[0] + 0.82, coach_pos[1] + 0.56, 0.54), wheel_rot, mat_wood, mat_iron)
    # Mr. Jarvis Lorry stepping beside coach
    add_cloaked_figure("Lon_MrLorry", (-1.55, -1.95, 0.08), 0.35, mat_cloak, mat_skin, scale=0.98)

    # 5. Streetlamps & Autumn English Oak
    add_street_lamp("Lon_Lamp1", (-1.35, -0.45, 0.12), mat_iron, mat_amber)
    add_street_lamp("Lon_Lamp2", (1.35, -0.95, 0.12), mat_iron, mat_amber)
    add_street_lamp("Lon_Lamp3", (-3.85, -1.65, 0.10), mat_iron, mat_amber)
    add_gnarled_tree("Lon_Oak", (-4.35, 1.85, 0.20), mat_bark, seed_angle=0.7, scale=1.15)
    add_gnarled_tree("Lon_OakSmall", (4.55, -0.25, 0.10), mat_bark, seed_angle=2.3, scale=0.85)

    out_path = os.path.join(OUT_DIR, "london_act1.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )
    print(f"Exported London diorama -> {out_path}")


def build_paris_diorama():
    reset_scene()

    # Materials: Warm charcoal limestone, soot plaster, crimson wine/blood glow, iron, scarred oak
    mat_plinth = make_material("Par_Plinth", (0.10, 0.08, 0.09, 1.0), metallic=0.15, roughness=0.65)
    mat_brass = make_material("Par_Brass", (0.68, 0.48, 0.24, 1.0), metallic=0.85, roughness=0.30)
    mat_cobble = make_material("Par_Cobble", (0.21, 0.18, 0.19, 1.0), metallic=0.05, roughness=0.74)
    mat_stone = make_material("Par_BastilleStone", (0.37, 0.34, 0.33, 1.0), metallic=0.0, roughness=0.78)
    mat_plaster = make_material("Par_SootPlaster", (0.31, 0.27, 0.25, 1.0), metallic=0.0, roughness=0.84)
    mat_slate = make_material("Par_MansardSlate", (0.14, 0.13, 0.15, 1.0), metallic=0.08, roughness=0.60)
    mat_iron = make_material("Par_ForgedIron", (0.10, 0.09, 0.10, 1.0), metallic=0.82, roughness=0.38)
    mat_wood = make_material("Par_OakStave", (0.27, 0.16, 0.11, 1.0), metallic=0.02, roughness=0.64)
    mat_blade = make_material("Par_GuillotineSteel", (0.82, 0.85, 0.90, 1.0), metallic=0.95, roughness=0.18)
    mat_wine = make_material(
        "Par_SpilledWine",
        (0.28, 0.01, 0.025, 1.0),
        metallic=0.10,
        roughness=0.14,
        emission_color=(0.45, 0.015, 0.03, 1.0),
        emission_strength=0.60,
    )
    mat_crimson_wool = make_material(
        "Par_CrimsonWool",
        (0.32, 0.03, 0.045, 1.0),
        metallic=0.0,
        roughness=0.88,
        emission_color=(0.25, 0.02, 0.03, 1.0),
        emission_strength=0.18,
    )
    mat_fire = make_material(
        "Par_BrazierFire",
        (0.95, 0.34, 0.10, 1.0),
        metallic=0.0,
        roughness=0.30,
        emission_color=(1.0, 0.32, 0.08, 1.0),
        emission_strength=4.2,
    )
    mat_blood_text = make_material(
        "Par_BloodText",
        (0.68, 0.04, 0.07, 1.0),
        metallic=0.0,
        roughness=0.35,
        emission_color=(0.95, 0.08, 0.12, 1.0),
        emission_strength=2.6,
    )
    mat_rag = make_material("Par_PeasantRag", (0.18, 0.14, 0.14, 1.0), metallic=0.0, roughness=0.90)
    mat_skin = make_material("Par_Skin", (0.62, 0.51, 0.45, 1.0), metallic=0.0, roughness=0.72)
    mat_bark = make_material("Par_CharredBark", (0.14, 0.12, 0.11, 1.0), metallic=0.0, roughness=0.90)

    build_shared_plinth("Paris", mat_plinth, mat_brass, mat_cobble, mat_stone)

    # 1. NORTH-WEST QUARTER: Defarge Wine Shop & Saint-Antoine Tenement (Mirrors Soho House)
    add_box("Par_WineShop_Body", (2.65, 2.0, 2.55), (-2.7, 1.2, 1.48), rotation=(0, 0, 0.04), mat=mat_plaster, bevel=0.04)
    # Exposed half-timbered beams
    for tx in (-3.85, -3.10, -2.35, -1.60):
        add_box(f"Par_TimberV_{tx}", (0.10, 2.08, 2.55), (tx, 1.2, 1.48), rotation=(0, 0, 0.04), mat=mat_wood, bevel=0.01)
    add_box("Par_TimberH", (2.72, 2.10, 0.12), (-2.7, 1.2, 1.80), rotation=(0, 0, 0.04), mat=mat_wood, bevel=0.01)
    # Steep Mansard roof + dormer
    add_box("Par_Mansard", (2.55, 1.78, 1.05), (-2.7, 1.2, 3.15), rotation=(0.12, 0, 0.04), mat=mat_slate, bevel=0.04)
    add_box("Par_Dormer", (0.56, 0.65, 0.56), (-2.7, 0.50, 3.25), mat=mat_plaster, bevel=0.02)
    add_box("Par_DormerWin", (0.32, 0.10, 0.36), (-2.7, 0.18, 3.23), mat=mat_fire, bevel=0.005)
    # Wine shop arch entrance & glowing interior embers
    add_arched_window("Par_ShopWinL", (-3.45, 0.18, 1.15), 0.04, 0.42, 0.72, mat_wood, mat_fire)
    add_arched_window("Par_ShopWinR", (-1.95, 0.18, 1.15), 0.04, 0.42, 0.72, mat_wood, mat_fire)
    add_box("Par_ShopArch", (0.62, 0.18, 1.10), (-2.70, 0.18, 0.80), rotation=(0, 0, 0.04), mat=mat_wood, bevel=0.02)

    # Shattered Oak Wine Cask outside Defarge's + Spilled Crimson Wine Pool + Kneeling Jacques + BLOOD Wall (Anchor 2)
    barrel_origin = (-2.65, -0.82, 0.32)
    for i in range(8):
        ang = (2.0 * math.pi * i) / 8.0
        sx = barrel_origin[0] + math.cos(ang) * 0.42
        sy = barrel_origin[1] + math.sin(ang) * 0.42
        add_box(
            f"Par_CaskStave_{i}",
            (0.14, 0.06, 0.62),
            (sx, sy, barrel_origin[2] + (0.04 if i < 4 else -0.10)),
            rotation=(0.85 * math.sin(ang), -0.85 * math.cos(ang), ang),
            mat=mat_wood,
            bevel=0.01,
        )
    add_torus("Par_CaskHoop1", 0.44, 0.024, (barrel_origin[0], barrel_origin[1], 0.25), rotation=(0.18, 0.1, 0), mat=mat_iron)
    add_torus("Par_CaskHoop2", 0.48, 0.024, (barrel_origin[0] + 0.28, barrel_origin[1] - 0.18, 0.14), rotation=(-0.35, 0.2, 0.4), mat=mat_iron)
    # Multi-lobed glistening crimson wine spill in cobble crevices
    add_cylinder("Par_WinePool_Main", 1.18, 0.035, (-2.55, -1.05, 0.115), vertices=24, mat=mat_wine, bevel=0.005)
    add_cylinder("Par_WinePool_Tongue1", 0.58, 0.035, (-1.65, -1.38, 0.112), vertices=16, mat=mat_wine, bevel=0.005)
    add_cylinder("Par_WinePool_Tongue2", 0.46, 0.035, (-3.38, -1.55, 0.112), vertices=16, mat=mat_wine, bevel=0.005)
    # Kneeling desperate starving figures scooping wine
    add_cloaked_figure("Par_Jacques1", (-3.18, -1.25, 0.10), -0.6, mat_rag, mat_skin, scale=0.88, kneeling=True)
    add_cloaked_figure("Par_Jacques2", (-1.88, -0.78, 0.10), 1.9, mat_rag, mat_skin, scale=0.84, kneeling=True)

    # Scarred masonry wall with carved glowing "BLOOD"
    add_box("Par_BloodWall", (1.65, 0.28, 1.35), (-3.95, 0.35, 0.78), rotation=(0, 0, 0.42), mat=mat_stone, bevel=0.03)
    bpy.ops.object.text_add(location=(-3.82, 0.14, 0.92), rotation=(math.pi * 0.5, 0, 0.42))
    txt_obj = bpy.context.active_object
    txt_obj.name = "Par_BloodText"
    txt_obj.data.body = "BLOOD"
    txt_obj.data.extrude = 0.04
    txt_obj.data.size = 0.26
    txt_obj.data.align_x = "CENTER"
    bpy.ops.object.convert(target="MESH")
    assign_mat(txt_obj, mat_blood_text)

    # 2. NORTH-EAST HIGH GROUND: Bastille North Tower (105) & Guillotine Silhouette (Anchor 3)
    add_box("Par_BastilleWall", (3.0, 2.35, 1.30), (2.55, 2.45, 0.95), mat=mat_stone, bevel=0.04)
    # Bastille 105 North Tower cylinder + battlements + iron-barred cell slit
    tower_pos = (1.95, 2.65)
    add_cylinder("Par_BastilleTower", 0.92, 2.85, (tower_pos[0], tower_pos[1], 2.35), vertices=20, mat=mat_stone, bevel=0.03)
    for i in range(8):
        ang = (2.0 * math.pi * i) / 8.0
        mx = tower_pos[0] + math.cos(ang) * 0.80
        my = tower_pos[1] + math.sin(ang) * 0.80
        add_box(f"Par_Merlon_{i}", (0.30, 0.28, 0.36), (mx, my, 3.92), rotation=(0, 0, ang), mat=mat_stone, bevel=0.02)
    add_box("Par_Cell105Slit", (0.28, 0.14, 0.55), (tower_pos[0], tower_pos[1] - 0.88, 2.75), mat=mat_fire, bevel=0.005)
    add_box("Par_Cell105Bar1", (0.04, 0.18, 0.58), (tower_pos[0] - 0.06, tower_pos[1] - 0.91, 2.75), mat=mat_iron, bevel=0.004)
    add_box("Par_Cell105Bar2", (0.04, 0.18, 0.58), (tower_pos[0] + 0.06, tower_pos[1] - 0.91, 2.75), mat=mat_iron, bevel=0.004)

    # Raised Scaffold & Guillotine Frame beside Bastille
    gx, gy, gz = (3.45, 2.10, 1.62)
    add_box("Par_ScaffoldDeck", (1.65, 1.50, 0.28), (gx, gy, gz), mat=mat_wood, bevel=0.03)
    add_box("Par_GuillotineBase", (0.95, 0.34, 0.14), (gx, gy, gz + 0.20), mat=mat_wood, bevel=0.015)
    add_box("Par_GuillotinePostL", (0.12, 0.12, 2.35), (gx - 0.38, gy, gz + 1.38), mat=mat_wood, bevel=0.012)
    add_box("Par_GuillotinePostR", (0.12, 0.12, 2.35), (gx + 0.38, gy, gz + 1.38), mat=mat_wood, bevel=0.012)
    add_box("Par_GuillotineHeader", (0.96, 0.18, 0.16), (gx, gy, gz + 2.58), mat=mat_wood, bevel=0.015)
    add_box("Par_GuillotineLunette", (0.72, 0.10, 0.26), (gx, gy, gz + 0.82), mat=mat_wood, bevel=0.01)
    # Angled gleaming steel blade
    add_box(
        "Par_GuillotineBlade",
        (0.66, 0.05, 0.42),
        (gx, gy, gz + 1.98),
        rotation=(0, 0.32, 0),
        mat=mat_blade,
        bevel=0.005,
    )

    # 3. CENTER AVENUE: Marquis St. Evrémonde's Gilded Rococo Carriage & Roaring Brazier (Mirrors Dover Coach, Anchor 1)
    m_pos = (-0.15, -1.85, 0.05)
    m_rot = (0.04, 0.16, -0.22)  # Tilted dramatically at 0.16 rad over snapped axle
    rococo_profile = [
        (-0.92, 0.32, 0.56, 1.42),
        (-0.56, 0.52, 0.36, 1.62),
        (0.0, 0.58, 0.32, 1.68),
        (0.56, 0.52, 0.36, 1.62),
        (0.92, 0.34, 0.54, 1.44),
    ]
    add_curved_hull("Par_MarquisHull", rococo_profile, 1.25, 0.12, m_pos, rotation=m_rot, mat=mat_plaster)
    # Gilded roof trim & side glowing windows
    add_box("Par_MarquisRoofTrim", (1.28, 1.02, 0.10), (m_pos[0] + 0.12, m_pos[1], 1.82), rotation=m_rot, mat=mat_brass, bevel=0.02)
    add_box("Par_MarquisSideWin", (0.48, 1.18, 0.38), (m_pos[0] + 0.05, m_pos[1], 1.24), rotation=m_rot, mat=mat_fire, bevel=0.01)
    add_box("Par_MarquisAxle", (1.58, 0.12, 0.12), (-0.15, -1.85, 0.54), rotation=m_rot, mat=mat_iron, bevel=0.015)
    # Four 12-spoke gilded aristocratic wheels
    m_wheel_rot = (math.pi * 0.5, 0, -0.22)
    add_spoked_wheel("Par_MarquisWheelFL", 0.40, 0.042, 12, (m_pos[0] - 0.65, m_pos[1] - 0.52, 0.48), m_wheel_rot, mat_brass, mat_iron)
    add_spoked_wheel("Par_MarquisWheelFR", 0.40, 0.042, 12, (m_pos[0] - 0.50, m_pos[1] + 0.62, 0.48), m_wheel_rot, mat_brass, mat_iron)
    add_spoked_wheel("Par_MarquisWheelRL", 0.52, 0.046, 12, (m_pos[0] + 0.68, m_pos[1] - 0.62, 0.58), m_wheel_rot, mat_brass, mat_iron)
    add_spoked_wheel("Par_MarquisWheelRR", 0.52, 0.046, 12, (m_pos[0] + 0.82, m_pos[1] + 0.54, 0.58), m_wheel_rot, mat_brass, mat_iron)
    # Fallen cobblestone barricade beam
    add_box("Par_BarricadeBeam", (1.45, 0.16, 0.16), (0.35, -2.65, 0.18), rotation=(0.08, -0.14, 0.42), mat=mat_wood, bevel=0.02)
    # Iron fire brazier burning on cobbles
    add_cone("Par_BrazierBowl", 0.18, 0.40, 0.45, (-1.18, -2.05, 0.42), vertices=10, mat=mat_iron, bevel=0.015)
    add_sphere("Par_BrazierCoal", 0.28, (-1.18, -2.05, 0.66), scale=(1.0, 1.0, 0.72), mat=mat_fire)

    # 4. EAST / SOUTH-EAST: Madame Defarge's Knitting Stool, Spilled Crimson Yarn Register & Iron Lantern (Anchor 4)
    add_box("Par_TenementWallE", (1.85, 1.40, 1.85), (3.1, -1.25, 1.00), rotation=(0, 0, -0.35), mat=mat_plaster, bevel=0.04)
    add_box("Par_TenementCorniceE", (2.00, 1.56, 0.14), (3.1, -1.25, 1.98), rotation=(0, 0, -0.35), mat=mat_wood, bevel=0.02)
    add_box("Par_TenementMansardE", (1.88, 1.32, 0.68), (3.1, -1.25, 2.30), rotation=(0.18, 0, -0.35), mat=mat_slate, bevel=0.03)
    add_box("Par_TenementBeamE", (0.10, 1.48, 1.85), (2.78, -1.42, 1.00), rotation=(0, 0, -0.35), mat=mat_wood, bevel=0.01)
    add_arched_window("Par_EastSlit", (2.46, -1.80, 1.35), -0.35, 0.36, 0.68, mat_iron, mat_fire)
    add_arched_window("Par_EastSlit2", (3.24, -2.08, 1.35), -0.35, 0.36, 0.68, mat_iron, mat_fire)
    # Madame Defarge's bench & cascading knitted crimson register
    add_box("Par_DefargeBench", (0.95, 0.42, 0.48), (2.05, -1.92, 0.34), rotation=(0, 0, 0.25), mat=mat_wood, bevel=0.02)
    add_cylinder("Par_YarnBasket", 0.24, 0.36, (1.58, -1.98, 0.28), vertices=12, mat=mat_wood, bevel=0.015)
    add_box(
        "Par_KnittedShroud",
        (0.75, 0.36, 0.05),
        (1.65, -2.28, 0.16),
        rotation=(0.35, 0.12, 0.25),
        mat=mat_crimson_wool,
        bevel=0.01,
    )
    add_cloaked_figure("Par_MmeDefarge", (2.15, -1.90, 0.12), -0.4, mat_rag, mat_skin, scale=0.92)

    # Street torches & scorched skeletal trees
    add_street_lamp("Par_Torch1", (-1.35, -0.45, 0.12), mat_iron, mat_fire)
    add_street_lamp("Par_Torch2", (1.35, -0.95, 0.12), mat_iron, mat_fire)
    add_street_lamp("Par_Torch3", (-3.85, -1.65, 0.10), mat_iron, mat_fire)
    add_gnarled_tree("Par_CharredTree", (-4.35, 1.85, 0.20), mat_bark, seed_angle=0.7, scale=1.15)
    add_gnarled_tree("Par_CharredTreeE", (4.55, -0.25, 0.10), mat_bark, seed_angle=2.3, scale=0.85)

    out_path = os.path.join(OUT_DIR, "paris_act1.glb")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
    )
    print(f"Exported Paris diorama -> {out_path}")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    build_london_diorama()
    build_paris_diorama()
    print("ALL_MODELS_BUILT_SUCCESSFULLY")
