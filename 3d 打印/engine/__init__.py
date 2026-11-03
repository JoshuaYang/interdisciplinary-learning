# engine/__init__.py
from .stl_writer import export_cone_stl

# 保持兼容别名
export_stl = export_cone_stl

__all__ = ["export_cone_stl", "export_stl"]
