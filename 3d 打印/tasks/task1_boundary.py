# ============================================================
# 【关卡 1】二分法求解圆锥底圆半径 (task1_boundary.py)
# 
# 数学知识点：【二分法与边界逼近】
# 
# 任务目标：
#   圆锥尖顶高度为 H，向外延伸至地面 y = 0。
#   请使用【二分法】寻找高度由正值变为 0 的边界半径 R。
#   本课 a = b = c = 2，截取高度 H = 2，底圆半径为 2；边界外函数也为 0。
# 
# 单独测试此关卡命令: python3 tasks/task1_boundary.py
# ============================================================

def student_find_boundary_radius(func_y, tolerance=1e-5):
    """
    参数:
      func_y: 圆锥函数 y = f(x, z)
      tolerance: 二分逼近精度
    返回:
      求出的底圆半径数值 R
    """
    low = 0.0
    high = 20.0  # 假设的搜索半径上限

    # 二分法参考实现（课堂任务：理解后独立补全循环）
    # 步骤提示：
    # 1. 取中点 mid = (low + high) / 2.0
    # 2. 计算当前半径处的高度 val = func_y(mid, 0)
    # 3. 如果 val > 0，说明还没降到地面，边界还在更外侧，令 low = mid
    # 4. 如果 val <= 0，说明已经降到地面，令 high = mid
    while (high - low) > tolerance:
        mid = (low + high) / 2.0
        val = func_y(mid, 0.0)
        if val > 0.0:
            low = mid
        else:
            high = mid

    # 返回零高度一侧的端点，确保生成的底圆周严格落在 y=0。
    return high


# ------------------------------------------------------------
# 关卡独立自测入口
# ------------------------------------------------------------
if __name__ == "__main__":
    import math
    print("🔍 正在单独测试【关卡 1：二分法求解底圆半径】...")

    # 测试圆锥: 高度为 2.0，理论底圆半径为 2.0
    test_cone = lambda x, z: max(0.0, 2.0 - 2.0 * math.sqrt((x / 2.0)**2 + (z / 2.0)**2))
    
    r_calc = student_find_boundary_radius(test_cone)
    assert abs(r_calc - 2.0) < 1e-3, f"❌ 测试失败！期望半径 2.0，得到 {r_calc:.4f}"

    print(f"  👉 算得底圆半径 R = {r_calc:.4f} (期望 2.0000)")
    print("🎉 恭喜！【关卡 1】代码逻辑完全正确，通过自测！\n")
