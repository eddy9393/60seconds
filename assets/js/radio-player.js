
const vc=document.querySelector('.volume-control');
let t;
if(vc){
vc.addEventListener('mouseenter',()=>{vc.classList.add('active');clearTimeout(t)});
vc.addEventListener('mouseleave',()=>{t=setTimeout(()=>vc.classList.remove('active'),3000)});
}
