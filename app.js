'use strict';
const $=s=>document.querySelector(s),C=AlbumCore,album=PUBLIC_ALBUM,editing=false;
let typingTimer,viewerIndex=0;
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function editableNode(tag,cls,value,pageId,field){const n=el(tag,cls,value);n.dataset.page=pageId;n.dataset.field=field;if(editing){n.contentEditable='plaintext-only';n.spellcheck=false}return n}
function mediaSources(m){return {src:m.src,motion:m.motion,poster:m.poster,thumbnail:m.thumbnail}}
function makeCardButton(m,page){const b=el('button','media '+(m.kind==='empty'?'empty':''));b.dataset.media=m.id;b.dataset.page=page.id;b.setAttribute('aria-label',(editing?'替换素材：':m.kind==='empty'?'添加素材：':'全屏查看：')+m.caption);if(m.kind==='empty'){const mat=el('span','empty-mat');mat.append(el('i','','＋'),el('span','','留一帧给我们'),el('small','','PHOTO / LIVE / FILM'));b.append(mat)}else{const source=mediaSources(m);const image=el(m.kind==='video'&&!source.poster?'video':'img');image.src=source.thumbnail||source.poster||source.src;if(image.tagName==='VIDEO'){image.muted=true;image.playsInline=true;image.preload='metadata'}else{image.alt=m.caption;image.loading='eager';image.decoding='async';image.width=800;image.height=800}b.append(image);if(m.kind==='live')b.append(el('span','live-badge','◉ LIVE'));if(m.kind==='video')b.append(el('span','play','▷'));const label=el('span','media-label');label.append(el('span','',m.caption),el('b','','＋'));b.append(label)}if(m.kind==='live')attachLivePreview(b,m);return b}
function makeCard(m,page){
 const shell=el('div','frame-shell');shell.dataset.frame=m.id;shell.append(makeCardButton(m,page));
 if(editing){const actions=el('div','frame-actions');const index=page.media.indexOf(m);
 for(const[action,label]of [['earlier','前移'],['later','后移'],['remove','移除']]){const b=el('button','',label);b.dataset.frameAction=action;b.dataset.frameId=m.id;b.dataset.pageId=page.id;b.setAttribute('aria-label',label+'素材 '+(index+1)+' · '+page.chapter);b.disabled=action==='earlier'&&index===0||action==='later'&&index===page.media.length-1;actions.append(b)}shell.append(actions)}
 return shell;
}
function renderEnvelope(page){
 const scene=el('details','envelope-scene');scene.open=editing;
 const trigger=el('summary','envelope-trigger');trigger.setAttribute('aria-label','打开或合上写给小雨的信');
 trigger.append(el('span','envelope-back'),el('span','envelope-folds'),el('span','envelope-flap'),el('span','envelope-address',page.title||'写给小雨'),el('span','envelope-seal','✦'),el('span','envelope-hint','点击拆信'));
 const paper=el('article','letter-paper'),title=editableNode('h2','letter-title',page.title,page.id,'title'),body=editableNode('p','letter-body',page.body,page.id,'body'),signature=editableNode('small','letter-signature',page.note,page.id,'note');
 body.dataset.placeholder='在这里，写下想对她说的话。';signature.dataset.placeholder='落款（可选）';paper.append(title,body,signature);scene.append(trigger,paper);
 scene.addEventListener('toggle',()=>{trigger.querySelector('.envelope-hint').textContent=scene.open?'点击合上信封':'点击拆信'});
 return scene
}
function renderPages(){
 const fragment=document.createDocumentFragment();
 album.pages.forEach((p,i)=>{
  const collage=C.collageLayouts.includes(p.layout),section=el('section','album-page chapter layout-'+p.layout+(collage?' material-page':''));section.id=p.id;section.dataset.frameCount=String(p.media.length);section.classList.toggle('has-media',p.media.length>0);section.classList.toggle('has-extra-media',!collage&&p.media.length>2);
  const head=el('div','page-heading');head.append(editableNode('span','',p.chapter,p.id,'chapter'),el('span','chapter-caption',collage?'A COLLECTION OF US':'A LETTER IN THE DARK'));
  const body=el('div','page-composition'),copy=el('div','copy');copy.append(el('span','tiny-star','✦'),editableNode('h2','',p.title,p.id,'title'));
  if(!collage)copy.append(editableNode('p','',p.body,p.id,'body'),editableNode('small','page-note',p.note,p.id,'note'));
  const frames=el('div','frames');p.media.forEach(m=>frames.append(makeCard(m,p)));if(p.layout==='envelope'){body.append(renderEnvelope(p));if(p.media.length)body.append(frames)}else body.append(copy,frames);
  if(editing){const zone=el('div','paste-zone','点击此处粘贴图片，或拖入多份照片 / 视频');zone.tabIndex=0;zone.setAttribute('role','region');zone.setAttribute('aria-label','粘贴素材到 '+p.chapter);body.append(zone)}
  const number=el('span','page-number',C.roman(i+2));number.setAttribute('aria-label','第 '+(i+2)+' 页');section.append(head,body,number);
  if(editing){const tools=el('div','page-tools'),change=el('select');change.setAttribute('aria-label','本页排版：'+p.chapter);
   for(const[k,v]of Object.entries(C.layouts)){const o=el('option','',v);o.value=k;change.append(o)}change.value=p.layout;change.dataset.layout=p.id;tools.append(change);
   for(const[action,label]of [['upload','批量添加素材'],['live','导入 Apple Live'],['empty','加一个相框'],['restore','恢复移除素材'],['page','在此页后新增']]){const b=el('button','',label);b.dataset.pageAction=action;b.dataset.pageId=p.id;if(action==='restore')b.disabled=!p.removedMedia?.length;if(action==='empty')b.disabled=p.media.length>=C.MAX_FRAMES;if(action==='upload')b.disabled=p.media.filter(m=>m.kind!=='empty').length>=C.MAX_FRAMES;tools.append(b)}section.append(tools)}
  fragment.append(section)
 });$('#pages').replaceChildren(fragment);renderContents()
}
function renderCover(){document.querySelectorAll('[data-cover]').forEach(n=>{const k=n.dataset.cover;if(k==='title'){n.replaceChildren(...Array.from(album.cover.title,char=>el('span','',char)),el('b'));n.setAttribute('aria-label',album.cover.title)}else n.textContent=album.cover[k];if(editing){n.contentEditable='plaintext-only';n.spellcheck=false}else n.removeAttribute('contenteditable')});applyLook()}
function renderContents(){const list=$('#contentsList');list.replaceChildren();const cover=el('a','','I · '+album.cover.chapter);cover.href='#prologue';list.append(cover);album.pages.forEach((p,i)=>{const a=el('a','',C.roman(i+2)+' · '+p.chapter);a.href='#'+p.id;list.append(a)})}
function applyLook(){for(const [key,value]of Object.entries(album.look)){document.documentElement.style.setProperty('--'+key,key==='position'?value+'%':value/100)}}
function startTyping(){clearTimeout(typingTimer);const line=album.cover.line;$('#typewriter').textContent='';let i=0;function tick(){if(editing)return;$('#typewriter').textContent=line.slice(0,++i);if(i<line.length)typingTimer=setTimeout(tick,130)}typingTimer=setTimeout(tick,900)}
function attachLivePreview(button,media){let preview,timer;const start=()=>{if(editing||preview)return;const motion=mediaSources(media).motion;if(!motion)return;preview=el('video','live-inline-preview');preview.src=motion;preview.muted=true;preview.loop=true;preview.playsInline=true;preview.autoplay=true;preview.onloadeddata=()=>preview?.classList.add('ready');preview.onerror=()=>{preview?.remove();preview=null};button.append(preview);preview.play().catch(()=>{})};const stop=()=>{clearTimeout(timer);if(preview){preview.pause();preview.remove();preview=null}};button.addEventListener('mouseenter',start);button.addEventListener('mouseleave',stop);button.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')timer=setTimeout(()=>{button.dataset.suppressClick='1';start()},250)});button.addEventListener('pointerup',e=>{if(e.pointerType==='touch')stop()});button.addEventListener('pointercancel',stop);button.addEventListener('contextmenu',e=>{if(media.kind==='live'&&!editing)e.preventDefault()})}

const music=$('#backgroundMusic');music.loop=true;music.preload='none';music.volume=.38;let musicEnabled=false,musicChosen=false;
function updateMusic(){const playing=musicEnabled&&!music.paused;$('#music').classList.toggle('playing',playing);$('#music').setAttribute('aria-pressed',String(playing));$('#music').setAttribute('aria-label',playing?'静音 Einsam':'播放 Einsam');$('#music').title='Einsam (feat. Aeva Maurelle) — Nachtblut · 网易云音乐';$('#musicLabel').textContent=playing?'Einsam':'声音关闭'}
music.onplay=music.onpause=updateMusic;music.onerror=()=>{musicEnabled=false;$('#musicLabel').textContent='重试音乐';$('#music').setAttribute('aria-pressed','false')};
$('#music').onclick=async()=>{musicChosen=true;musicEnabled=!musicEnabled;if(musicEnabled){try{await music.play()}catch{musicEnabled=false;$('#musicLabel').textContent='点此播放'}}else music.pause();updateMusic()};
document.addEventListener('pointerdown',e=>{if(!musicChosen&&!e.target.closest('#music')){musicEnabled=true;music.play().catch(()=>{musicEnabled=false;updateMusic()})}},{once:true});
function allMedia(){return album.pages.flatMap(p=>p.media)}
function viewable(){return allMedia().filter(m=>m.kind!=='empty')}
function openViewer(id){const list=viewable();viewerIndex=list.findIndex(m=>m.id===id);const m=list[viewerIndex];if(!m)return;const source=mediaSources(m),node=el(m.kind==='image'?'img':'video');node.src=m.kind==='live'?source.motion:source.src;if(node.tagName==='VIDEO'){node.controls=true;node.playsInline=true;node.autoplay=true;node.loop=m.kind==='live';node.muted=m.kind==='live';if(source.poster)node.poster=source.poster}else node.alt=m.caption;$('#viewerContent').replaceChildren(node);$('#viewerCaption').textContent=m.caption;if(!$('#viewer').open)$('#viewer').showModal();document.body.style.overflow='hidden';if(m.kind==='video')music.pause();else if(musicEnabled)music.play().catch(()=>{});if(node.tagName==='VIDEO')node.play().catch(()=>{})}
function step(delta){const list=viewable();if(list.length)openViewer(list[(viewerIndex+delta+list.length)%list.length].id)}
$('#previous').onclick=()=>step(-1);$('#next').onclick=()=>step(1);$('#viewer').onclose=()=>{$('#viewerContent').replaceChildren();document.body.style.overflow='';if(musicEnabled)music.play().catch(()=>{})};document.addEventListener('keydown',e=>{if($('#viewer').open){if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1)}});
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('#viewer').onclick=e=>{if(e.target===$('#viewer'))$('#viewer').close()};
$('#pages').onclick=e=>{const b=e.target.closest('[data-media]');if(!b)return;if(b.dataset.suppressClick){delete b.dataset.suppressClick;return}const m=allMedia().find(m=>m.id===b.dataset.media);if(m&&m.kind!=='empty')openViewer(m.id)};
$('#contents').onclick=()=>{renderContents();$('#contentsDialog').showModal()};$('#contentsList').onclick=e=>{if(e.target.closest('a'))$('#contentsDialog').close()};
renderCover();renderPages();if(album.hero)$('.hero-picture').style.backgroundImage='url("'+album.hero+'")';startTyping();updateMusic();
