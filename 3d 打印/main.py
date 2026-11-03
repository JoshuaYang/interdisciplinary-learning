# ============================================================
# 圆锥 3D 数学建模主程序入口 (main.py)
# 
# 运行命令: python3 main.py
# 
# 作用:
#   1. 运行 tasks/ 下的 3 个学生算法关卡测试
#   2. 测试通过后，调用底层引擎导出 model.stl 供 3D 打印
# ============================================================

import sys
import math
import config
from engine import export_cone_stl
from tasks.task1_boundary import student_find_boundary_radius
from tasks.task2_normal import student_calculate_normal
from tasks.task3_coords import student_map_polar_point


def run_all_checks():
    """综合测试 3 个关卡函数是否编写正确"""
    print("=" * 60)
    print("🚀 正在检验圆锥数学算法关卡代码...")
    print("=" * 60)

    # 标准测试圆锥：高 2.0，底圆半径 2.0
    test_func = lambda x, z: max(0.0, 2.0 - 2.0 * math.sqrt((x / 2.0)**2 + (z / 2.0)**2))

    # 1. 检验关卡 1：二分法求解底圆半径
    r_calc = student_find_boundary_radius(test_func)
    assert abs(r_calc - 2.0) < 1e-3, f"❌ 关卡 1 错误：期望底圆半径 2.0，实际得到 {r_calc:.4f}"
    print(f"  ✅ [关卡 1] 二分法底圆半径求解：通过！(算得半径 R = {r_calc:.4f})")

    # 2. 检验关卡 2：斜面法向量计算
    n = student_calculate_normal(test_func, 1.0, 0.0)
    vec_len = math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2)
    assert abs(vec_len - 1.0) < 1e-3, f"❌ 关卡 2 错误：法向量未归一化，模长为 {vec_len:.4f}"
    expected = 1.0 / math.sqrt(2.0)
    assert all(abs(actual - target) < 1e-3 for actual, target in zip(n, (expected, expected, 0.0))), f"❌ 关卡 2 法向方向错误：{n}"
    print(f"  ✅ [关卡 2] 微积分中心差分法向量算法：通过！(模长 = {vec_len:.4f})")

    # 3. 检验关卡 3：极坐标参数方程映射
    pt_top = student_map_polar_point(test_func, 0.0, 0.0, 2.0)
    pt_base = student_map_polar_point(test_func, 1.0, 0.0, 2.0)
    assert abs(pt_top[1] - 2.0) < 1e-3, f"❌ 关卡 3 错误：尖顶高度应为 2.0，得到 {pt_top}"
    assert abs(pt_base[0] - 2.0) < 1e-3, f"❌ 关卡 3 错误：底圆边缘坐标应为 2.0，得到 {pt_base}"
    print("  ✅ [关卡 3] 极坐标空间参数方程映射：通过！")

    print("\n🎉 太棒了！圆锥全部算法关卡自测通过，即将生成 3D 打印切片模型！\n")


def main():
    try:
        # 1. 运行自测
        run_all_checks()

        # 2. 导出 STL 模型
        print(f"📦 正在渲染圆锥几何体并生成 [{config.OUTPUT_FILE}]...")
        triangles, base_r = export_cone_stl(
            output_filename=config.OUTPUT_FILE,
            func_y=config.function_y,
            find_radius_fn=student_find_boundary_radius,
            map_polar_fn=student_map_polar_point,
            scale=config.SCALE,
            resolution=config.RESOLUTION
        )

        height_mm = config.H * config.SCALE
        diameter_mm = base_r * 2 * config.SCALE

        print("=" * 60)
        print("✨ 圆锥 3D 模型生成完毕！")
        print(f"   📁 输出文件: {config.OUTPUT_FILE}")
        print(f"   📐 几何形态: 正立正圆锥 (平底大圆，尖顶朝上)")
        print(f"   📏 数学尺寸: 尖顶高 H = {config.H:.2f}, 底圆半径 R = {base_r:.2f}")
        print(f"   🖨️ 打印实物: 高度 = {height_mm:.1f} mm, 底圆直径 = {diameter_mm:.1f} mm")
        print(f"   🔺 三角形面片数: {triangles:,} 个")
        print("=" * 60)
        print("💡 查看提示：")
        print(f"   - Mac 用户: 选中 {config.OUTPUT_FILE} 按键盘【空格键】即可 3D 旋转预览")
        print(f"   - 3D 打印: 直接拖入 Bambu Studio / Cura / PrusaSlicer 切片上机打印！\n")

    except AssertionError as ae:
        print(f"\n{ae}")
        print("💡 建议：你可以单独运行对应的 tasks/task*.py 文件排查调试哦！\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 生成出错: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
