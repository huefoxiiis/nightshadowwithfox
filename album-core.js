(function(root){
const layouts={split:'左文右图',reverse:'左图右文',cinema:'宽幅电影',diptych:'双帧对照',letter:'夜间书信',scatter:'错落胶片',contact:'胶片接触印样 · 六帧',scrapbook:'手作拼贴 · 五帧',mosaic:'大小错落 · 八帧',envelope:'信封尾声'};
const MAX_FRAMES=24,collageLayouts=['contact','scrapbook','mosaic'];
function frameCount(layout){return {contact:6,scrapbook:5,mosaic:8,diptych:2,scatter:2,letter:0,envelope:0}[layout]??1}
function roman(n){if(!Number.isInteger(n)||n<1||n>3999)throw Error('页码超出范围');let s='';for(const[v,c]of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){s+=c;n-=v}return s}
function uid(){return 'p-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2))}
function newFrame(){return{id:uid(),kind:'empty',caption:'留一帧给我们'}}
function makePage(chapter,layout='contact'){const collage=collageLayouts.includes(layout),minimal=collage||layout==='envelope';return{id:uid(),chapter:chapter||'新的章节',title:layout==='envelope'?'写给小雨':collage?'许多个，\n与你有关的瞬间。':'把这一刻，\n留给我们。',body:minimal?'':'有些话，还在慢慢写。\n有些故事，等你一起继续。',note:minimal?'':'留一帧给我们。',layout,media:Array.from({length:frameCount(layout)},newFrame)}}
function removePage(album,id){const index=album.pages.findIndex(p=>p.id===id);if(index<0)return false;const[page]=album.pages.splice(index,1);album.trash=album.trash||[];album.trash.push({page,index});return true}
function restorePage(album){const last=album.trash?.pop();if(!last)return false;album.pages.splice(Math.min(last.index,album.pages.length),0,last.page);return true}
function movePage(album,id,delta){const i=album.pages.findIndex(p=>p.id===id),j=i+delta;if(i<0||j<0||j>=album.pages.length)return false;[album.pages[i],album.pages[j]]=[album.pages[j],album.pages[i]];return true}
function removeFrame(page,id){const index=page.media.findIndex(m=>m.id===id);if(index<0)return false;const[media]=page.media.splice(index,1);page.removedMedia=page.removedMedia||[];page.removedMedia.push({media,index});return true}
function restoreFrame(page){if(page.media.length>=MAX_FRAMES)return false;const item=page.removedMedia?.pop();if(!item)return false;page.media.splice(Math.min(item.index,page.media.length),0,item.media);return true}
function moveFrame(page,id,delta){const i=page.media.findIndex(m=>m.id===id),j=i+delta;if(i<0||j<0||j>=page.media.length)return false;[page.media[i],page.media[j]]=[page.media[j],page.media[i]];return true}
function framesOf(album,includeTrash=false){return [...album.pages,...(includeTrash?(album.trash||[]).map(t=>t.page):[])].flatMap(p=>[...p.media,...(includeTrash?(p.removedMedia||[]).map(r=>r.media):[])])}
function upgradeCollages(album){if(album.collageVersion===1)return false;const presets=[['collage-contact','chapter-5','片刻集','光落下的地方。','contact'],['collage-scrapbook','chapter-10','日常底片','把日子，贴成一部电影。','scrapbook'],['collage-mosaic','chapter-15','记忆墙','许多个，与你有关的瞬间。','mosaic']];const allIDs=new Set([...album.pages,...(album.trash||[]).map(t=>t.page)].map(p=>p.id));for(const[id,anchor,chapter,title,layout]of presets){if(allIDs.has(id)||album.pages.length>=500)continue;const p=makePage(chapter,layout);p.id=id;p.title=title;const i=album.pages.findIndex(p=>p.id===anchor);album.pages.splice(i>=0?i+1:Math.floor(album.pages.length/2),0,p)}album.collageVersion=1;return true}
function curateAlbum(album,templateAlbum,hasAsset=()=>false){
 if(album.curationVersion===1)return false;
 const template=structuredClone(templateAlbum);upgradeCollages(template);
 const base=new Map(template.pages.map(p=>[p.id,p]));
 const normalize=v=>String(v||'').replace(/\s+/g,'');
 const personalMedia=(page,reference)=>page.media.some(m=>{
  if(m.kind==='empty')return false;
  if(hasAsset(m.id)||!m.src)return true;
  const original=reference?.media.find(v=>v.id===m.id);
  return !original||m.kind!==original.kind||m.src!==original.src||normalize(m.caption)!==normalize(original.caption)
 });
 const keep=[],removed=[];
 album.pages.forEach((page,index)=>{
  const reference=base.get(page.id),generic=reference||makePage(page.chapter,page.layout);
  const changedText=['chapter','title','body','note'].some(k=>normalize(page[k])&&normalize(page[k])!==normalize(generic[k]));
  const namedNewPage=!reference&&!['新的章节','新的素材页'].includes(page.chapter);
  if(personalMedia(page,reference)||changedText||namedNewPage)keep.push(page);
  else removed.push({page,index,reason:'unused-pages-curation-v1'})
 });
 album.trash=album.trash||[];album.trash.push(...removed);album.pages=keep;
 const ids=new Set([...album.pages,...album.trash.map(t=>t.page)].map(p=>p.id));
 const sleep=makePage('睡姿记录','contact');sleep.id=ids.has('sleep-records')?uid():'sleep-records';sleep.title='你的每一种睡姿。';sleep.body='';sleep.note='';
 const epilogue=makePage('尾声','envelope');epilogue.id=ids.has('epilogue-envelope')?uid():'epilogue-envelope';epilogue.title='写给小雨';epilogue.body='';epilogue.note='';
 album.pages.push(sleep,epilogue);album.curationVersion=1;album.collageVersion=1;
 return{kept:keep.length-2,removed:removed.length}
}
function validate(a){if(!a||a.version!==2||!a.cover||!a.look||!Array.isArray(a.pages)||a.pages.length>500)throw Error('相册格式不正确');const ids=new Set();const checkText=v=>{if(typeof v!=='string'||v.length>20000)throw Error('文案格式不正确')};for(const k of ['chapter','eyebrow','title','line','body','footnote'])checkText(a.cover[k]);const all=[...a.pages,...(a.trash||[]).map(t=>t.page)];if(all.length>1000)throw Error('备份页面过多');for(const p of all){if(typeof p.id!=='string'||ids.has(p.id))throw Error('页面标识重复');ids.add(p.id);if(!layouts[p.layout]||!Array.isArray(p.media)||p.media.length>MAX_FRAMES||p.removedMedia&&!Array.isArray(p.removedMedia))throw Error('页面排版不正确');for(const k of ['chapter','title','body','note'])checkText(p[k]);for(const m of [...p.media,...(p.removedMedia||[]).map(r=>r.media)]){if(typeof m.id!=='string'||ids.has(m.id)||!/^[a-zA-Z0-9_-]+$/.test(m.id))throw Error('素材标识不正确');ids.add(m.id);if(!['empty','image','video','live'].includes(m.kind))throw Error('素材类型不正确');checkText(m.caption);for(const k of ['src','motion','poster'])if(m[k]&&!/^assets\/[a-zA-Z0-9_.-]+$/.test(m[k]))throw Error('素材地址不正确')}}for(const[key,min,max]of [['brightness',40,120],['grain',0,20],['position',0,100]])if(!Number.isFinite(a.look[key])||a.look[key]<min||a.look[key]>max)throw Error('画面设置不正确');return a}
root.AlbumCore={roman,uid,makePage,newFrame,frameCount,removePage,restorePage,movePage,removeFrame,restoreFrame,moveFrame,framesOf,upgradeCollages,curateAlbum,validate,layouts,MAX_FRAMES,collageLayouts};if(typeof module!=='undefined')module.exports=root.AlbumCore;
})(globalThis);
