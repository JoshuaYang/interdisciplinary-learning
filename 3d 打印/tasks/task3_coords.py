# ============================================================
# 【关卡 3】极坐标参数方程映射 (task3_coords.py)
# 
# 数学知识点：【三角函数与圆的参数方程】
# 
# 任务目标：
#   根据归一化比例半径 r (0~1) 和旋转角度 theta (0~2pi)，
#   利用正圆参数方程计算出圆锥面上对应的三维真实坐标 (x, y, z)。
# 
# 单独测试此关卡命令: python3 tasks/task3_coords.py
# ============================================================

import math


def student_map_polar_point(func_y, r, theta, base_radius):
    """
    参数:
      func_y: 圆锥函数 y = f(x, z)
      r: 归一化比例半径 (0.0 表示尖顶，1.0 表示底圆边缘)
      theta: 旋转角度 (弧度制, 0 到 2*pi)
      base_radius: 圆锥底圆半径 R
    返回:
      (x, y, z): 空间真实三维坐标
    """
    # 步骤 1: 水平正圆参数方程 x = R * r * cos(theta),  z = R * r * sin(theta)
    x = base_radius * r * math.cos(theta)
    z = base_radius * r * math.sin(theta)

    # 步骤 2: 计算该水平点对应的垂直高度 y
    y = func_y(x, z)

    return x, y, z


# ------------------------------------------------------------
# 关卡独立自测入口
# ------------------------------------------------------------
if __name__ == "__main__":
    print("🔍 正在单独测试【关卡 3：极坐标参数方程映射】...")

    test_cone = lambda x, z: max(0.0, 2.0 - 2.0 * math.sqrt((x / 2.0)**2 + (z / 2.0)**2))

    # 1. 尖顶测试 (r = 0): 必须落在原点尖顶 (0.0, 2.0, 0.0) 处
    pt_top = student_map_polar_point(test_cone, r=0.0, theta=0.0, base_radius=2.0)
    assert abs(pt_top[0]) < 1e-3 and abs(pt_top[1] - 2.0) < 1e-3 and abs(pt_top[2]) < 1e-3, (
        f"❌ 尖顶测试失败！期望 (0.0, 2.0, 0.0)，得到 {pt_top}"
    )

    # 2. 底圆边缘测试 (r = 1.0, theta = 0): 必须落在地面 (2.0, 0.0, 0.0) 处
    pt_base = student_map_polar_point(test_cone, r=1.0, theta=0.0, base_radius=2.0)
    assert abs(pt_base[0] - 2.0) < 1e-3 and abs(pt_base[1]) < 1e-3 and abs(pt_base[2]) < 1e-3, (
        f"❌ 底圆测试失败！期望 (2.0, 0.0, 0.0)，得到 {pt_base}"
    )

    print(f"  👉 尖顶坐标 (r=0): {pt_top} (高 2.0，尖顶精确)")
    print(f"  👉 底圆边缘 (r=1): {pt_base} (高度 0.0，底面平齐)")
    print("🎉 恭喜！【关卡 3】代码逻辑完全正确，通过自测！\n")
