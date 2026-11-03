# ============================================================
# engine/stl_writer.py
# 
# 专注圆锥 3D 实体模型生成引擎
# 包含：圆锥侧面网格 + 地面平整底圆盘 (100% 水密可打印实体)
# 学生无需修改此文件
# ============================================================

import math

EPSILON = 1e-12


def to_stl_coords(p):
    """
    将数学坐标 (X: 左右, Y: 垂直高度, Z: 前后)
    转换为 3D 打印工业标准坐标 (X: 左右, Y: 前后, Z: 垂直向上高度)
    采用刚体正交变换 (X, -Z, Y)，确保圆锥平稳直立贴在热床上！
    """
    return (p[0], -p[2], p[1])


def _write_facet(file, p1, p2, p3):
    """向 STL 写入一个三角面并自动计算单位法向量"""
    p1 = to_stl_coords(p1)
    p2 = to_stl_coords(p2)
    p3 = to_stl_coords(p3)

    ux, uy, uz = p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]
    vx, vy, vz = p3[0] - p1[0], p3[1] - p1[1], p3[2] - p1[2]

    nx = uy * vz - uz * vy
    ny = uz * vx - ux * vz
    nz = ux * vy - uy * vx

    length = math.sqrt(nx * nx + ny * ny + nz * nz)
    if length < EPSILON:
        return 0

    nx, ny, nz = nx / length, ny / length, nz / length
    file.write(f"  facet normal {nx} {ny} {nz}\n")
    file.write("    outer loop\n")
    file.write(f"      vertex {p1[0]} {p1[1]} {p1[2]}\n")
    file.write(f"      vertex {p2[0]} {p2[1]} {p2[2]}\n")
    file.write(f"      vertex {p3[0]} {p3[1]} {p3[2]}\n")
    file.write("    endloop\n")
    file.write("  endfacet\n")
    return 1


def export_cone_stl(
    output_filename,
    func_y,
    find_radius_fn,
    map_polar_fn,
    scale=10.0,
    resolution=120
):
    """
    生成正立圆锥 STL 模型
    """
    # 1. 调用学生关卡 1 求底圆半径
    base_radius = find_radius_fn(func_y)
    if base_radius <= 0:
        raise ValueError("底圆半径求解错误，必须大于 0！")

    ang_res = resolution * 2
    rad_res = resolution // 2

    # 2. 生成圆锥侧面点网格 (从尖顶 r=0 到地面 r=1)
    grid_points = []
    for i in range(rad_res):
        r = i / (rad_res - 1)
        row = []
        for j in range(ang_res):
            theta = 2.0 * math.pi * j / ang_res
            x, y, z = map_polar_fn(func_y, r, theta, base_radius)
            row.append((x * scale, y * scale, z * scale))
        grid_points.append(row)

    triangles = 0

    with open(output_filename, "w", encoding="utf-8") as file:
        file.write("solid math_cone_model\n")

        # 3. 缝合圆锥侧面三角网格
        for i in range(rad_res - 1):
            for j in range(ang_res):
                j_next = (j + 1) % ang_res
                p00 = grid_points[i][j]
                p01 = grid_points[i][j_next]
                p10 = grid_points[i + 1][j]
                p11 = grid_points[i + 1][j_next]

                # 顶端 r=0 时若退化为同一点，_write_facet 会自动忽略退化三角面
                triangles += _write_facet(file, p00, p01, p10)
                triangles += _write_facet(file, p01, p11, p10)

        # 4. 缝合地面平整圆盘底盖 (y = 0 处，平贴热床，法向朝下)
        base_center = (0.0, 0.0, 0.0)
        outer_rim = grid_points[-1]  # 底圆周各点
        for j in range(ang_res):
            j_next = (j + 1) % ang_res
            # 内部坐标以 Y 为高度；按圆周 j、j_next 连接，法向量朝 -Y。
            # 转成打印坐标后即朝 -Z，与侧面的边界方向相反。
            triangles += _write_facet(file, base_center, outer_rim[j], outer_rim[j_next])

        file.write("endsolid math_cone_model\n")

    return triangles, base_radius
