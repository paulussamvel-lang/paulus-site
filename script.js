document.querySelector('#year').textContent = new Date().getFullYear();
// The work gallery unfolds from characters into their environments.
(() => {
  const links=[...document.querySelectorAll('#work figure a')];
  if(!links.length)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const effects=new Set();
  const animate=(element,keyframes,options)=>{
    if(reduced.matches||!element.animate)return;
    const effect=element.animate(keyframes,options);effects.add(effect);
    effect.onfinish=()=>effects.delete(effect);
  };
  const dialog=document.createElement('dialog');
  dialog.className='lightbox';dialog.setAttribute('aria-labelledby','lightbox-caption');
  dialog.innerHTML='<div class="lightbox-toolbar"><p id="lightbox-count" aria-live="polite"></p><button type="button" class="lightbox-close" aria-label="关闭大图"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="lightbox-stage"><img src="assets/shenbigong/zheng-xin-red.png" alt=""></div><div class="lightbox-footer"><button type="button" class="lightbox-prev" aria-label="上一张"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg></button><p id="lightbox-caption"></p><button type="button" class="lightbox-next" aria-label="下一张"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 5 7 7-7 7"/></svg></button></div>';
  document.body.append(dialog);
  const image=dialog.querySelector('img');
  const caption=dialog.querySelector('#lightbox-caption');
  const count=dialog.querySelector('#lightbox-count');
  let selected=0,revision=0,oldOverflow='',opener;
  async function show(index,direction=0){
    selected=(index+links.length)%links.length;
    const ticket=++revision;
    const source=links[selected].querySelector('img');
    image.src=links[selected].href;image.alt=source.alt;image.classList.toggle('young-portrait',source.classList.contains('young-portrait'));
    caption.textContent=links[selected].closest('figure').querySelector('figcaption').childNodes[0].textContent.trim();
    count.textContent=`${selected+1} / ${links.length}`;
    try{await image.decode();}catch{}
    if(ticket!==revision||!dialog.open)return;
    image.getAnimations().forEach(effect=>effect.cancel());
    animate(image,[{opacity:.3,transform:`translateX(${direction*22}px) scale(.975)`},{opacity:1,transform:'translateX(0) scale(1)'}],
      {duration:320,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  links.forEach((link,index)=>{
    link.setAttribute('aria-label',`查看大图：${link.querySelector('img').alt}`);
    link.addEventListener('click',event=>{
      if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0||typeof dialog.showModal!=='function')return;
      event.preventDefault();opener=document.activeElement?.closest('.exhibition')?document.activeElement:link;oldOverflow=document.body.style.overflow;
      dialog.showModal();document.body.style.overflow='hidden';show(index);
      animate(dialog,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'});
    });
  });
  dialog.querySelector('.lightbox-close').addEventListener('click',()=>dialog.close());
  dialog.querySelector('.lightbox-prev').addEventListener('click',()=>show(selected-1,-1));
  dialog.querySelector('.lightbox-next').addEventListener('click',()=>show(selected+1,1));
  dialog.addEventListener('keydown',event=>{
    if(event.key==='ArrowRight'){event.preventDefault();show(selected+1,1);}
    if(event.key==='ArrowLeft'){event.preventDefault();show(selected-1,-1);}
  });
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{revision++;document.body.style.overflow=oldOverflow;opener?.focus({preventScroll:true});});
  const gallery=document.createElement('section');
  gallery.className='exhibition';gallery.setAttribute('aria-label','神臂弓角色与场景画廊');
  const arrow=direction=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${direction==='prev'?'m14 5-7 7 7 7':'m10 5 7 7-7 7'}"/></svg>`;
  gallery.innerHTML=`<div class="exhibition-stage"><div class="exhibition-atmosphere" aria-hidden="true"></div><div class="exhibition-copy"><div aria-live="polite" aria-atomic="true"><h4></h4><p class="exhibition-kind"></p></div><p class="exhibition-description"></p><button type="button" class="exhibition-open">查看完整画面<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></button></div><div class="exhibition-art"><img src="assets/shenbigong/zheng-xin-red.png" alt="" width="720" height="900"></div></div><div class="exhibition-controls"><div class="exhibition-thumbs" role="group" aria-label="选择角色或场景"></div><div class="exhibition-pagination"><p></p><button type="button" class="exhibition-arrow exhibition-prev" aria-label="展示上一张">${arrow('prev')}</button><button type="button" class="exhibition-arrow exhibition-next" aria-label="展示下一张">${arrow('next')}</button></div></div>`;
  const art=gallery.querySelector('.exhibition-art img');
  const atmosphere=gallery.querySelector('.exhibition-atmosphere');
  const thumbs=gallery.querySelector('.exhibition-thumbs');
  let activeIndex=0,stageRevision=0;
  const items=links.map((link,index)=>{
    const figure=link.closest('figure');
    const name=figure.querySelector('figcaption').childNodes[0].textContent.trim();
    const button=document.createElement('button');button.type='button';button.className='exhibition-thumb';button.setAttribute('aria-label',`展示${name}`);
    const thumbnail=link.querySelector('img').cloneNode();thumbnail.alt='';thumbnail.removeAttribute('id');button.append(thumbnail);thumbs.append(button);
    button.addEventListener('click',()=>selectArt(index));
    return {link,name,button,kind:figure.querySelector('figcaption span').textContent,alt:link.querySelector('img').alt};
  });
  async function selectArt(index,initial=false){
    activeIndex=(index+items.length)%items.length;const item=items[activeIndex],ticket=++stageRevision;
    art.src=item.link.href;art.alt=item.alt;art.classList.toggle('young-portrait',item.link.querySelector('img').classList.contains('young-portrait'));
    atmosphere.style.backgroundImage=`url("${item.link.href}")`;
    gallery.querySelector('h4').textContent=item.name;
    gallery.querySelector('.exhibition-kind').textContent=item.kind==='角色定妆'?'角色定妆':`场景设计 · ${item.kind}`;
    gallery.querySelector('.exhibition-description').textContent=item.kind==='角色定妆'?'从人物的服饰、神态，建立故事的第一印象。':item.name==='张宅正房'?'晨光穿过木窗，故事从张宅正房开始。':'山间亭台与峡谷飞瀑，延伸故事的空间。';
    gallery.querySelector('.exhibition-pagination p').textContent=`${String(activeIndex+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}`;
    items.forEach((entry,i)=>entry.button.setAttribute('aria-pressed',String(i===activeIndex)));
    try{await art.decode();}catch{}
    if(ticket!==stageRevision||initial)return;
    art.getAnimations().forEach(effect=>effect.cancel());
    animate(art,[{opacity:.4,clipPath:'inset(0 0 16% 0)',filter:'blur(5px)',transform:'translateY(12px)'},{opacity:1,clipPath:'inset(0 0 0 0)',filter:'blur(0px)',transform:'translateY(0)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  gallery.querySelector('.exhibition-prev').addEventListener('click',()=>selectArt(activeIndex-1));
  gallery.querySelector('.exhibition-next').addEventListener('click',()=>selectArt(activeIndex+1));
  gallery.querySelector('.exhibition-open').addEventListener('click',()=>links[activeIndex].click());
  thumbs.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:activeIndex+(event.key==='ArrowRight'?1:-1);
    selectArt(next);items[activeIndex].button.focus();
  });
  const article=document.querySelector('#work article');article.append(gallery);selectArt(0,true);article.classList.add('gallery-ready');
  reduced.addEventListener('change',()=>{
    if(reduced.matches){effects.forEach(effect=>effect.cancel());effects.clear();}
  });
})();
