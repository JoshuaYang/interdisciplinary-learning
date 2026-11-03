const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const project=read('教师配置/项目.json');
const bundle={project,catalog:read('教师配置/分子参考.json'),steps:project.stepFiles.map(f=>read('教师配置/步骤/'+f)),students:project.moleculeFiles.map(f=>read('教师配置/标准答案/'+f))};
const files=require('../config-files.js');
module.exports={root,read,bundle,config:files.assemble(bundle)};
