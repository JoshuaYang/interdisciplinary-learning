import math


def create_open_cone_stl(filename, radius=20, height=50, segments=100):
    vertices = []
    faces = []

    # -------------------------
    # 创建底部圆周顶点
    # -------------------------
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = radius * math.cos(angle)
        y = radius * math.sin(angle)
        z = 0

        vertices.append((x, y, z))

    # -------------------------
    # 创建圆锥顶点
    # -------------------------
    apex_index = len(vertices)
    vertices.append((0, 0, height))

    # -------------------------
    # 创建圆锥侧面
    # -------------------------
    for i in range(segments):
        j = (i + 1) % segments

        faces.append((i, j, apex_index))

    # -------------------------
    # 补上圆锥底面
    # -------------------------
    # 底面圆心位于原点，记录它在顶点列表中的下标。
    center_index = len(vertices)
    vertices.append((0, 0, 0))

    # 每两个相邻的圆周顶点与圆心组成一个三角形。
    # 所有底面三角形拼在一起，就形成封闭圆锥的圆形底面。
    for i in range(segments):
        j = (i + 1) % segments  # 最后一个圆周点连接回第一个点

        # 按“圆心、j、i”的顺序连接，使法向量朝下（Z 轴负方向）。
        # 底面朝外的方向是向下，因此这里的圆周点顺序与侧面相反。
        faces.append((center_index, j, i))

    print("faces", faces)

    # -------------------------
    # 计算法向量
    # -------------------------
    def calculate_normal(v1, v2, v3):
        ax = v2[0] - v1[0]
        ay = v2[1] - v1[1]
        az = v2[2] - v1[2]

        bx = v3[0] - v1[0]
        by = v3[1] - v1[1]
        bz = v3[2] - v1[2]

        nx = ay * bz - az * by
        ny = az * bx - ax * bz
        nz = ax * by - ay * bx

        length = math.sqrt(nx**2 + ny**2 + nz**2)

        if length == 0:
            return 0, 0, 0

        return nx / length, ny / length, nz / length

    # -------------------------
    # 写入 STL
    # -------------------------
    with open(filename, "w", encoding="utf-8") as f:

        f.write("solid open_cone\n")

        for face in faces:
            v1 = vertices[face[0]]
            v2 = vertices[face[1]]
            v3 = vertices[face[2]]

            nx, ny, nz = calculate_normal(v1, v2, v3)

            f.write(
                f"  facet normal {nx:.6f} {ny:.6f} {nz:.6f}\n"
            )

            f.write("    outer loop\n")

            for v in (v1, v2, v3):
                f.write(
                    f"      vertex {v[0]:.6f} "
                    f"{v[1]:.6f} "
                    f"{v[2]:.6f}\n"
                )

            f.write("    endloop\n")
            f.write("  endfacet\n")

        f.write("endsolid open_cone\n")

create_open_cone_stl("open_cone.stl")
