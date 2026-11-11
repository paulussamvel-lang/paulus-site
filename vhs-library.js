(() => {
  const library=document.querySelector('.vhs-library');
  if(!library)return;
  const tapes=[...library.querySelectorAll('[data-tape]')];
  const panels=tapes.map(tape=>document.getElementById(tape.dataset.tape));
  if(panels.some(panel=>!panel))return;
  const consoleEl=library.querySelector('.vhs-console'),space=library.querySelector('.console-space');
  const screen=library.querySelector('.playback-screen'),recorder=library.querySelector('.recorder');
  const slot=library.querySelector('.recorder-slot'),display=library.querySelector('.recorder-display');
  const status=library.querySelector('.recorder-status'),title=library.querySelector('.playback-title');
  const buttons=Object.fromEntries([...library.querySelectorAll('[data-deck]')].map(button=>[button.dataset.deck,button]));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const staticMode=new URLSearchParams(location.search).get('motion')==='off';
  const effects=new Set(),ghosts=new Set();
  let selected=-1,pending=-1,revision=0,paused=false,docked=false,frame=0,manualUntil=0,settleTimer;
  const instant=()=>reduced.matches||staticMode;
  function cancelMotion(){effects.forEach(effect=>effect.cancel());effects.clear();ghosts.forEach(ghost=>ghost.remove());ghosts.clear();}
  async function motion(element,frames,options){
    if(instant()||!element.animate)return;
    const effect=element.animate(frames,{...options,fill:'forwards'});effects.add(effect);
    try{await effect.finished;}catch{}finally{effects.delete(effect);effect.cancel();}
  }
  function ghostFor(index){
    const face=tapes[index].querySelector('.tape-face');let bounds=face.getBoundingClientRect();
    // Mobile keeps the hardware compact; fly a small tape above its slot instead.
    const target=slot.getBoundingClientRect();
    if(!bounds.width)bounds={left:target.left+target.width/2-30,top:target.top-30,width:60,height:30};
    const ghost=face.cloneNode(true);ghost.className='tape-face tape-flight';ghost.setAttribute('aria-hidden','true');
    Object.assign(ghost.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px'});
    document.body.append(ghost);ghosts.add(ghost);
    return {ghost,x:target.left+target.width/2-bounds.left-bounds.width/2,y:target.top+target.height/2-bounds.top-bounds.height/2,scale:Math.min(1.7,target.width/bounds.width)};
  }
  function updateControls(){buttons.stop.disabled=paused;buttons.play.disabled=!paused;}
  function paint(){
    tapes.forEach((tape,i)=>{tape.classList.toggle('is-loading',i===pending);tape.setAttribute('aria-pressed',String(i===selected));tape.querySelector('.tape-state').textContent=i===pending?'正在装入…':i===selected?'正在浏览':'点击浏览';});
    recorder.dataset.loading=String(pending>=0);
    library.dataset.state=pending>=0?'loading':paused?'paused':selected>=0?'playing':'idle';
    display.textContent=pending>=0?'LOAD':paused?'PAUSE':selected>=0?'PLAY':'READY';
    const index=pending>=0?pending:selected;
    status.textContent=index<0?'向下浏览，录像带会跟随内容自动切换。':(pending>=0?'正在装入：':paused?'联动已暂停 · ':'正在浏览：')+tapes[index].dataset.title;
    if(index>=0)title.textContent=tapes[index].dataset.title;
    updateControls();
  }
  function goTo(index,hash){
    manualUntil=performance.now()+1800;
    const target=hash&&document.getElementById(hash.slice(1))||panels[index];
    target.scrollIntoView({behavior:instant()?'instant':'smooth',block:'start'});
    target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
  }
  async function select(index,{animate=true,scroll=false,writeHash=false,hash}={}){
    if(index<0||index>=tapes.length)return;
    if(scroll)manualUntil=performance.now()+3000;
    if(index===pending){if(scroll)goTo(index,hash);return;}
    if(index===selected&&pending<0){if(scroll)goTo(index,hash);return;}
    const ticket=++revision;cancelMotion();pending=index;paint();
    if(animate&&!instant()){
      if(selected>=0){
        const old=ghostFor(selected),end=`translate(${old.x}px,${old.y}px) scale(${old.scale},.12)`;
        await motion(old.ghost,[{transform:end,opacity:0},{transform:'translate(0,0) scale(1)',opacity:1}],{duration:docked?140:230,easing:'ease-out'});
        old.ghost.remove();ghosts.delete(old.ghost);
      }
      if(ticket!==revision)return;
      const flight=ghostFor(index),destination=`translate(${flight.x}px,${flight.y}px)`;
      await motion(flight.ghost,[
        {transform:'translate(0,0) scale(1)',opacity:1,offset:0},
        {transform:'translate(0,-14px) scale(1.06)',opacity:1,offset:.18},
        {transform:destination+` scale(${flight.scale},.36)`,opacity:1,offset:.76},
        {transform:destination+` scale(${flight.scale},.04)`,opacity:0,offset:1}
      ],{duration:docked?460:850,easing:'cubic-bezier(.22,.68,.24,1)'});
      flight.ghost.remove();ghosts.delete(flight.ghost);
    }
    if(ticket!==revision)return;
    selected=index;pending=-1;paint();
    if(writeHash&&location.hash!=='#'+tapes[index].dataset.tape)history.pushState(null,'','#'+tapes[index].dataset.tape);
    if(scroll)goTo(index,hash);
  }
  function setDock(next){
    if(next===docked)return;
    const before=consoleEl.getBoundingClientRect();cancelMotion();
    if(next)space.style.height=before.height+'px';
    docked=next;library.classList.toggle('is-docked',next);
    if(!next)space.style.height='';
    const after=consoleEl.getBoundingClientRect();
    // One bounded FLIP transition; the placeholder keeps the reading position stable.
    if(!instant()&&before.bottom>0&&before.top<innerHeight){
      void motion(consoleEl,[{transform:`translate(${before.left-after.left}px,${before.top-after.top}px) scale(${before.width/after.width})`,transformOrigin:'top left',opacity:.8},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)'});
    }
  }
  function syncScroll(){
    frame=0;
    const rail=space.getBoundingClientRect(),content=screen.getBoundingClientRect();
    setDock(rail.bottom<100&&content.bottom>140);
    if(paused||performance.now()<manualUntil)return;
    const readingLine=innerWidth<=1000?210:Math.min(innerHeight*.3,240);
    let active=-1;
    panels.forEach((panel,i)=>{if(panel.getBoundingClientRect().top<=readingLine)active=i;});
    if(active<0&&docked)active=0;
    if(active>=0&&(pending>=0?pending:selected)!==active)void select(active,{animate:docked});
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(syncScroll);clearTimeout(settleTimer);settleTimer=setTimeout(()=>{if(performance.now()>=manualUntil)scheduleOnce();},1900);}
  function scheduleOnce(){if(!frame)frame=requestAnimationFrame(syncScroll);}
  function returnToShelf(){manualUntil=performance.now()+1800;library.scrollIntoView({behavior:instant()?'instant':'smooth',block:'start'});(tapes[selected]||tapes[0]).focus({preventScroll:true});}
  tapes.forEach((tape,index)=>{
    tape.setAttribute('role','button');tape.setAttribute('aria-controls',panels[index].id);tape.setAttribute('aria-pressed','false');
    const choose=()=>{paused=false;void select(index,{scroll:true,writeHash:true});};
    tape.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();choose();});
    tape.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();choose();}});
  });
  buttons.previous.addEventListener('click',()=>{paused=false;void select((Math.max(0,pending>=0?pending:selected)-1+tapes.length)%tapes.length,{scroll:true,writeHash:true});});
  buttons.next.addEventListener('click',()=>{paused=false;void select(((pending>=0?pending:selected)+1)%tapes.length,{scroll:true,writeHash:true});});
  buttons.play.addEventListener('click',()=>{paused=false;manualUntil=0;paint();scheduleOnce();});
  buttons.stop.addEventListener('click',()=>{paused=true;++revision;cancelMotion();pending=-1;paint();});
  buttons.eject.addEventListener('click',returnToShelf);
  library.querySelector('.return-to-tapes').addEventListener('click',returnToShelf);
  library.querySelector('.dock-return').addEventListener('click',returnToShelf);
  function indexForHash(hash){const target=document.getElementById(hash.slice(1));return panels.findIndex(panel=>panel===target||panel.contains(target));}
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#"]');if(!link||library.contains(link)||event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0)return;
    const index=indexForHash(link.hash);if(index<0)return;event.preventDefault();paused=false;void select(index,{scroll:true,writeHash:true,hash:link.hash});
  });
  function followHash(){const index=indexForHash(location.hash);if(index>=0)void select(index,{animate:false,scroll:true,hash:location.hash});else if(location.hash==='#tape-library')returnToShelf();}
  window.addEventListener('hashchange',followHash);
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('wheel',()=>{manualUntil=0;},{passive:true});
  window.addEventListener('touchstart',()=>{manualUntil=0;},{passive:true});
  reduced.addEventListener('change',()=>{if(reduced.matches)cancelMotion();});
  window.addEventListener('resize',()=>{cancelMotion();if(docked){library.classList.remove('is-docked');space.style.height=consoleEl.getBoundingClientRect().height+'px';library.classList.add('is-docked');}scheduleOnce();},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelMotion();});
  panels.forEach(panel=>panel.hidden=false);screen.classList.add('has-content');library.classList.add('vhs-ready');paint();followHash();scheduleOnce();
  document.addEventListener('identity:ready',()=>{if(location.hash)followHash();scheduleOnce();},{once:true});
})();
