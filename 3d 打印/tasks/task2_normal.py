# ============================================================
# 【关卡 2】微积分中心差分求法向量 (task2_normal.py)
# 
# 课标数学知识点：选择性必修/微积分【导数定义与空间向量】
# 
# 任务目标：
#   利用中心差分求圆锥斜面的偏导数（斜率），并计算曲面的【单位法向量】。
# 
# 单独测试此关卡命令: python3 tasks/task2_normal.py
# ============================================================

import math


def student_calculate_normal(func_y, x, z, h=1e-5):
    """
    参数:
      func_y: 圆锥函数 y = f(x, z)
      x, z: 采样点坐标
      h: 微积分微小步长 (用于差分求导)
    返回:
      (nx, ny, nz): 长度为 1 的单位法向量 (指向曲面上方外部)
    """
    # 步骤 1: 用微积分中心差分计算 x 与 z 方向的切线斜率 (偏导数)
    df_dx = (func_y(x + h, z) - func_y(x - h, z)) / (2.0 * h)
    df_dz = (func_y(x, z + h) - func_y(x, z - h)) / (2.0 * h)

    # 步骤 2: 空间隐函数 y - f(x, z) = 0 的法向分量为 (-df/dx, 1, -df/dz)
    nx = -df_dx
    ny = 1.0
    nz = -df_dz

    # 步骤 3: 向量归一化 (将模长缩放为 1 的单位向量)
    length = math.sqrt(nx * nx + ny * ny + nz * nz)
    if length < 1e-12:
        return 0.0, 1.0, 0.0

    return nx / length, ny / length, nz / length


# ------------------------------------------------------------
# 关卡独立自测入口
# ------------------------------------------------------------
if __name__ == "__main__":
    print("🔍 正在单独测试【关卡 2：中心差分法向量算法】...")

    test_cone = lambda x, z: max(0.0, 2.0 - 2.0 * math.sqrt((x / 2.0)**2 + (z / 2.0)**2))

    # 测试点 (1.0, 0.0)：此处在 X 轴斜面上，斜率 df/dx 应为 -1，法向应朝向 (+X, +Y)
    n = student_calculate_normal(test_cone, 1.0, 0.0)
    vec_len = math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2)

    assert abs(vec_len - 1.0) < 1e-3, f"❌ 向量未归一化！模长为 {vec_len}"
    assert n[0] > 0 and n[1] > 0, f"❌ 法向方向错误！得到 {n}"

    print(f"  👉 (1.0, 0.0) 处计算法向量: ({n[0]:.4f}, {n[1]:.4f}, {n[2]:.4f})")
    print(f"  👉 向量模长: {vec_len:.4f} (精确等于 1.0)")
    print("🎉 恭喜！【关卡 2】代码逻辑完全正确，通过自测！\n")
