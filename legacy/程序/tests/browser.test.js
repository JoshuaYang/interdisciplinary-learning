/* Run with Playwright available; CHEM_URL defaults to the local preview server. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=process.env.CHEM_URL||'http://127.0.0.1:8765';
const {root,config,bundle}=require('./fixtures.cjs');
const shots=process.env.CHEM_SCREENSHOTS||'/private/tmp/chem-qa';
fs.mkdirSync(shots,{recursive:true});
const molecule=id=>structuredClone(bundle.students.find(d=>d.formula.replace(/[·.]$/,'')===id));
const failures=[];
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  page.on('pageerror',e=>failures.push(e.message));
  await page.goto(url);
  assert.equal(await page.locator('#load-error').isVisible(),false);

  // 阶段一门禁检查：默认已预填 6 个分子配置，可直接点击下一步
  assert.equal(await page.locator('#gate-screen').isVisible(),true);
  assert.equal(await page.locator('#main-stage').isVisible(),false);
  await page.waitForFunction(()=>window.chemLab?.getState().gatePassed===6);
  assert.equal(await page.locator('#enter-stage-btn').isDisabled(),false);
  assert.equal(await page.locator('.gate-card.status-valid').count(),6);

  // 点击进入三维反应演示
  await page.locator('#enter-stage-btn').click();
  await page.waitForFunction(()=>window.chemLab?.getState().isStageUnlocked);
  assert.equal(await page.locator('#gate-screen').isVisible(),false);
  assert.equal(await page.locator('#main-stage').isVisible(),true);
  await page.evaluate(()=>window.chemLab.unlockAllSteps());

  for(let i=0;i<7;i++) {
   await page.locator(`.step-button[data-index="${i}"]`).click();
   const state=await page.evaluate(()=>window.chemLab.getState());assert.equal(state.index,i);assert.equal(Object.keys(state.atoms).length,9);assert.equal(state.progress,1);
   assert.equal(await page.locator('.step-button[aria-current="step"]').getAttribute('data-index'),String(i));
   if([0,1,3,5,6].includes(i))await page.screenshot({path:path.join(shots,`desktop-step-${i+1}.png`)});
  }
  await page.locator('.step-button[data-index="3"]').click();
  if(await page.locator('#measure-toggle').count()) await page.locator('#measure-toggle').click();
  assert.match(await page.locator('#measurement-strip').innerText(),/120\.00°/);
  await page.screenshot({path:path.join(shots,'desktop-measurements.png')});
  await page.locator('#replay').click();await page.waitForFunction(()=>window.chemLab.getState().progress>.12);
  await page.locator('#play').click();
  const paused=await page.evaluate(()=>window.chemLab.getState());assert.equal(paused.playing,false);assert(paused.progress>0&&paused.progress<1);
  await page.waitForTimeout(300);assert.equal((await page.evaluate(()=>window.chemLab.getState())).progress,paused.progress);
  assert.match(await page.locator('#measurement-strip').innerText(),/过渡中/);
  await page.locator('#progress').evaluate(el=>{el.value='500';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const mid=await page.evaluate(()=>window.chemLab.getState());assert.equal(mid.progress,.5);assert(mid.bonds['C|H4'].weight>0&&mid.bonds['C|H4'].weight<1);
  await page.screenshot({path:path.join(shots,'desktop-mid-reaction.png')});
  await page.locator('#progress').evaluate(el=>{el.value='1000';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.match(await page.locator('#measurement-strip').innerText(),/120\.00°/);
  // Import one small group file, then merge several without overwriting other work.
  await page.locator('#config-open').click();
  const altered=molecule('Br2');altered['bondLengths']['Br-Br']=2.28;
  const upload=(data,name)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await page.locator('#file-input').setInputFiles(upload(altered,'group-a.json'));
  await page.waitForFunction(()=>window.chemLab.getState().sourceName==='已导入：Br2');
  assert.match(await page.locator('#validation-result').innerText(),/2\.28/);
  const loaded=await page.evaluate(()=>window.chemLab.getState());assert.equal(loaded.index,0);
  assert(Math.abs(loaded.atoms.BrA.position[0]+4.14)<.01);
  await page.locator('#file-input').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{"positions": ,}')});
  await page.waitForFunction(()=>document.getElementById('validation-result').textContent.includes('JSON 读取失败'));
  assert.equal((await page.evaluate(()=>window.chemLab.getState())).sourceName,'已导入：Br2');
  const invalid=molecule('CH4');delete invalid['bondLengths'];
  const otherwiseGood=molecule('Br2');otherwiseGood['bondLengths']['Br-Br']=2.40;
  await page.locator('#file-input').setInputFiles([upload(otherwiseGood,'good.json'),upload(invalid,'missing-atom.json')]);
  await page.waitForFunction(()=>document.getElementById('validation-result').textContent.includes('请填写「bondLengths」'));
  assert.equal((await page.evaluate(()=>window.chemLab.getState())).sourceName,'已导入：Br2');
  assert(Math.abs((await page.evaluate(()=>window.chemLab.getState())).atoms.BrA.position[0]+4.14)<.01);
  const ch3=molecule('CH3');ch3.name='小组甲基';ch3.description='学生填写的结构说明';ch3['bondLengths']['C-H']=1.08;
  const hbr=molecule('HBr');hbr['bondLengths']['H-Br']=1.41;
  await page.locator('#file-input').setInputFiles([upload(ch3,'group-b.json'),upload(hbr,'group-c.json')]);
  await page.waitForFunction(()=>window.chemLab.getState().sourceName==='已导入：CH3、HBr');
  assert(Math.abs((await page.evaluate(()=>window.chemLab.getState())).atoms.BrA.position[0]+4.14)<.01);
  await page.locator('#export-molecule').selectOption('CH3');
  const downloadPromise=page.waitForEvent('download');await page.locator('#download-config').click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'CH3.json');
  const downloaded=await download.path(),downloadText=fs.readFileSync(downloaded,'utf8');
  assert.deepEqual(JSON.parse(downloadText),ch3);assert(downloadText.trim().split('\n').length<=12);
  await page.locator('[data-close="config-dialog"]').click();await page.locator('.step-button[data-index="3"]').click();assert.match(await page.locator('#molecule-profiles').textContent(),/小组甲基.*sp2.*学生填写的结构说明/s);await page.locator('#config-open').click();
  // Re-reading an edited source file must change the scene, not use the offline snapshot.
  await page.route('**/Br2.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(otherwiseGood)}));
  await page.locator('#reload-config').click();await page.waitForFunction(()=>window.chemLab.getState().sourceName==='分文件配置');
  assert(Math.abs((await page.evaluate(()=>window.chemLab.getState())).atoms.BrA.position[0]+4.20)<.01);
  await page.unroute('**/Br2.json');await page.locator('#reload-config').click();
  await page.waitForFunction(()=>Math.abs(window.chemLab.getState().atoms.BrA.position[0]+4.1405)<.01);
  await page.screenshot({path:path.join(shots,'configuration.png')});await page.locator('[data-close="config-dialog"]').click();
  if(await page.locator('#measure-toggle').count()) await page.locator('#measure-toggle').click();
  // Drag changes camera pixels, reset brings it back; playback remains under user control.
  const stage=await page.locator('#viewport').boundingBox();await page.mouse.move(stage.x+stage.width*.5,stage.y+stage.height*.4);await page.mouse.down();await page.mouse.move(stage.x+stage.width*.5+80,stage.y+stage.height*.4+30,{steps:6});await page.mouse.up();await page.locator('#reset-view').click();
  await page.locator('#speed').selectOption('2');await page.locator('#restart').click();await page.locator('#play').click();
  await page.waitForFunction(()=>window.chemLab.getState().index===6&&!window.chemLab.getState().playing&&window.chemLab.getState().progress===1,{},{timeout:60000});
  assert.equal(await page.locator('#animation-status').innerText(),'演示完成');assert.match(await page.locator('#step-note').innerText(),/不是链终止/);
  console.log('Desktop: seven stages, pause, scrub, replay, measurements, JSON import/rejection/reload/download and full continuous playback passed.');
  // Common laptop and mobile layouts must not introduce horizontal overflow.
  for(const viewport of [{width:1280,height:800},{width:390,height:844},{width:768,height:1024}]) {
   await page.setViewportSize(viewport);await page.locator('#restart').click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`horizontal overflow at ${viewport.width}`);
   await page.screenshot({path:path.join(shots,`layout-${viewport.width}.png`),fullPage:true});
   await page.locator('.step-button[data-index="6"]').click();assert.equal((await page.evaluate(()=>window.chemLab.getState())).index,6);
  }
  const offline=await browser.newContext({offline:true,viewport:{width:1280,height:800}}),filePage=await offline.newPage();
  filePage.on('pageerror',e=>failures.push(e.message));
  await filePage.goto(pathToFileURL(path.join(root,'index.html')).href);
  assert.equal(await filePage.locator('#gate-screen').isVisible(),true);
  await filePage.waitForFunction(()=>window.chemLab?.getState().gatePassed===6);
  await filePage.locator('#enter-stage-btn').click();
  await filePage.waitForFunction(()=>window.chemLab?.getState().isStageUnlocked);
  await filePage.evaluate(()=>window.chemLab.unlockAllSteps());
  assert.equal(await filePage.locator('#load-error').isVisible(),false);
  await filePage.locator('.step-button[data-index="3"]').click();
  assert.equal((await filePage.evaluate(()=>window.chemLab.getState())).atoms.C.radical,1);
  await filePage.locator('#config-open').click();await filePage.locator('#file-input').setInputFiles({name:'offline-student.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(altered))});
  await filePage.waitForFunction(()=>window.chemLab.getState().sourceName==='已导入：Br2');
  assert.equal((await filePage.evaluate(()=>window.chemLab.getState())).sourceName,'已导入：Br2');
  assert.deepEqual(failures,[]);console.log('Laptop/mobile/tablet layout and fully offline file opening/import passed. No page errors.');
  console.log('Screenshots:',shots);
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
