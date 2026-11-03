"""Combine the editable source files into the browser's offline snapshot."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
def read(path):
    return json.loads((root / path).read_text(encoding='utf-8'))

project = read('教师配置/项目.json')
for key, count in [('moleculeFiles', 6), ('stepFiles', 7)]:
    files = project[key]
    if len(files) != count or len(set(files)) != count or any(not isinstance(f, str) or '/' in f or '\\' in f or f.startswith('.') or not f.endswith('.json') for f in files):
        raise ValueError(f'{key} 中的文件清单无效')
bundle = {
    'project': project,
    'catalog': read('教师配置/分子参考.json'),
    'steps': [read('教师配置/步骤/' + f) for f in project['stepFiles']],
    'students': [read('教师配置/标准答案/' + f) for f in project['moleculeFiles']]
}
output = '// Generated from 教师配置/标准答案/ and 教师配置/. Do not edit this snapshot.\nwindow.CHEM_DEFAULT_FILES = ' + json.dumps(bundle, ensure_ascii=False, separators=(',', ':')) + ';\n'
(root / '程序/离线配置.js').write_text(output, encoding='utf-8')
print('已更新离线配置；原始分子文件和教师配置未被修改。')
