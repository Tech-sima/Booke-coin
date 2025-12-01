// Флаг для отслеживания инициализации iconReplace
let iconReplaceInitialized = false;

document.addEventListener('DOMContentLoaded',()=>{
    // Предотвращаем повторную инициализацию
    if (iconReplaceInitialized) {
        return;
    }
  const icons=document.querySelectorAll('i[class*="fa-"]:not([data-no-replace])');
  icons.forEach(el=>{
    const cls=Array.from(el.classList).find(c=>c.startsWith('fa-')&&!c.startsWith('fa-solid'))||Array.from(el.classList).find(c=>c.startsWith('fa-')&&c!=='fa-solid');
    if(!cls) return;
    const name=cls.replace('fa-','');
    const img=document.createElement('img');
    img.src=`assets/icons/${name}.svg`;
    img.alt=name;
    img.className='icon';
    el.replaceWith(img);
      });
    
    iconReplaceInitialized = true;

  // Инлайним три SVG иконки слева для максимальной четкости
  inlineLeftPanelSvgs();
}); 

// Инлайнинг SVG для трех иконок слева (#info-panel)
async function inlineLeftPanelSvgs(){
  try{
    const container=document.getElementById('info-panel');
    if(!container) return;

    const targets=[
      'assets/svg/rbc-icon.svg',
      'assets/svg/bc-icon.svg',
      'assets/svg/ref-icon.svg'
    ];

    const imgs=Array.from(container.querySelectorAll('img.info-icon'))
      .filter(img=>{
        try{ return targets.some(t=>img.getAttribute('src')?.endsWith(t)); }catch(_){ return false; }
      });

    await Promise.all(imgs.map(async (img)=>{
      const src=img.getAttribute('src');
      if(!src) return;
      try{
        const res=await fetch(src,{credentials:'same-origin'});
        if(!res.ok){ console.warn('SVG fetch failed',src,res.status); return; }
        const text=await res.text();
        // Парсим как DOM
        const parser=new DOMParser();
        const doc=parser.parseFromString(text,'image/svg+xml');
        let svg=doc.documentElement;
        if(!svg || svg.nodeName.toLowerCase()!=='svg'){ return; }

        // Копируем размеры из <img>
        const w=img.style.width||img.getAttribute('width')||'24px';
        const h=img.style.height||img.getAttribute('height')||'24px';
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);
        // Качество рендеринга
        svg.setAttribute('shape-rendering','geometricPrecision');
        svg.setAttribute('text-rendering','optimizeLegibility');
        svg.setAttribute('image-rendering','auto');
        svg.style.transform='translateZ(0)';
        svg.style.backfaceVisibility='hidden';
        svg.style.filter='saturate(1.05) contrast(1.08) brightness(1.03)';
        svg.style.display='inline-block';
        svg.style.verticalAlign='middle';
        svg.classList.add('inline-svg-icon');
        // Сохраняем классы
        (img.className||'').split(/\s+/).filter(Boolean).forEach(c=>svg.classList.add(c));

        // Заменяем в DOM
        img.replaceWith(svg);
      }catch(err){
        console.warn('Inline SVG failed for',src,err);
      }
    }));
  }catch(err){
    console.warn('inlineLeftPanelSvgs error',err);
  }
}