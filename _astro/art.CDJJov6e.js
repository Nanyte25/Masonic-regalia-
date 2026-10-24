import{_ as e}from"./store.C79E7C3i.js";var t=`#FBFBF8`,n=`#E6E8EA`;function r(e,t){return e===`provincial`||e===`grand`?`#B48A3C`:t}function i(e,i,a,o=`mm`){let s=r(a,i);if(o===`ea`||o===`fc`)return`<path d="M8 50 q6 -4 12 0 h160 q6 -4 12 0" fill="none" stroke="#C9CFD6" stroke-width="3"/>
  <rect x="40" y="54" width="120" height="120" rx="3" fill="${t}" stroke="#C9CFD6" stroke-width="2"/>
  <path d="M40 55 L160 55 L100 92 Z" fill="${t}" stroke="#C9CFD6" stroke-width="2"/>${o===`fc`?[70,130].map(t=>`<circle cx="${t}" cy="140" r="10" fill="${e}"/><circle cx="${t}" cy="140" r="3.5" fill="#fff"/>`).join(``):``}`;let c=a===`member`||a===`officer`?[70,130].map(t=>`<circle cx="${t}" cy="140" r="10" fill="${e}"/><circle cx="${t}" cy="140" r="10" fill="none" stroke="${s}" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="${t}" cy="140" r="3.5" fill="${s}"/>`).join(``):``,l=a===`master`||a===`past-master`?`<g stroke="${s}" stroke-width="4" fill="none" stroke-linecap="round"><path d="M70 126v22h18M130 126v22h-18M93 132v16M107 132v16"/></g>`:``,u=a===`provincial`||a===`grand`?`<circle cx="100" cy="136" r="19" fill="${e}"/><circle cx="100" cy="136" r="19" fill="none" stroke="${s}" stroke-width="3"/><path d="M100 124 l-8 18 M100 124 l8 18 M90 136 h20" stroke="${s}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`:``,d=e=>`<rect x="${e-1.5}" y="66" width="3" height="54" fill="${s}"/>
     <path d="M${e-5} 120 h10 l2 18 h-14z" fill="${s}"/>
     <path d="M${e-5} 138 v6 M${e-2} 138 v7 M${e+1} 138 v7 M${e+4} 138 v6" stroke="${s}" stroke-width="1.2"/>`;return`
  <path d="M8 50 q6 -4 12 0 h160 q6 -4 12 0" fill="none" stroke="${e}" stroke-width="3"/>
  <rect x="38" y="48" width="124" height="8" rx="2" fill="${e}"/>
  <rect x="40" y="54" width="120" height="120" rx="3" fill="${t}" stroke="${n}"/>
  <rect x="45" y="59" width="110" height="110" rx="1" fill="none" stroke="${e}" stroke-width="9"/>
  <rect x="51" y="65" width="98" height="98" fill="none" stroke="${s}" stroke-width="1.5"/>
  ${d(58)}${d(142)}
  <path d="M40 55 L160 55 L100 92 Z" fill="${t}" stroke="${n}"/>
  <path d="M44 57 L100 89 L156 57" fill="none" stroke="${e}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M56 59 L100 84 L144 59" fill="none" stroke="${s}" stroke-width="1.2"/>
  <path d="M40 56 L100 93 L160 56" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="3" transform="translate(0 2)"/>
  ${c}${l}${u}`}function a(e,t,n){let i=r(n,t);return`
  <path d="M40 30 L100 150 L160 30" fill="none" stroke="${e}" stroke-width="26" stroke-linejoin="round"/>
  <path d="M40 30 L100 150 L160 30" fill="none" stroke="${i}" stroke-width="2" stroke-dasharray="0" transform="translate(0 -11)" opacity=".9"/>
  <path d="M40 30 L100 150 L160 30" fill="none" stroke="${i}" stroke-width="2" transform="translate(0 11)" opacity=".9"/>
  <circle cx="100" cy="168" r="14" fill="none" stroke="${i}" stroke-width="5"/>`}function o(e,t,n){let r=n===`provincial`||n===`grand`?`#B48A3C`:`#AEB5BD`;return`
  <rect x="88" y="20" width="24" height="40" fill="${e}"/>
  <circle cx="100" cy="66" r="6" fill="none" stroke="${r}" stroke-width="3"/>
  <polygon points="100,74 150,104 150,152 100,182 50,152 50,104" fill="${r}"/>
  <polygon points="100,88 136,110 136,146 100,168 64,146 64,110" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
  <path d="M100 100 L80 150 M100 100 L120 150 M78 134 h44" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>`}function s(e,t,n){let i=r(n,t),a=t=>`
    <path d="M${t} 50 h50 l8 110 h-66 z" fill="${e}"/>
    <path d="M${t} 50 h50 l8 110 h-66 z" fill="none" stroke="${i}" stroke-width="3"/>
    <circle cx="${t+25}" cy="108" r="12" fill="none" stroke="${i}" stroke-width="3"/>`;return a(28)+a(114)}function c(e,t){return`
  <rect x="52" y="26" width="104" height="150" rx="3" fill="${e}"/>
  <rect x="44" y="30" width="12" height="146" rx="2" fill="${e}" opacity=".75"/>
  <rect x="62" y="40" width="84" height="122" fill="none" stroke="${t}" stroke-width="1.5"/>
  <path d="M104 72 L88 112 M104 72 L120 112 M86 100 h36" stroke="${t}" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="78" y="128" width="52" height="3" fill="${t}"/><rect x="86" y="136" width="36" height="3" fill="${t}"/>
  <path d="M140 176 v18 l6 -5 l6 5 v-18" fill="#8E1B2A"/>`}function l(){return`
  <ellipse cx="100" cy="122" rx="56" ry="54" fill="none" stroke="#AEB5BD" stroke-width="14"/>
  <rect x="70" y="40" width="60" height="44" rx="10" fill="#AEB5BD"/>
  <rect x="78" y="48" width="44" height="28" rx="6" fill="#14284B"/>
  <path d="M100 52 L90 72 M100 52 L110 72 M88 66 h24" stroke="#B48A3C" stroke-width="3" fill="none" stroke-linecap="round"/>`}function u(e){let t=(t,n)=>`
    <circle cx="${t}" cy="${n}" r="32" fill="#AEB5BD"/><circle cx="${t}" cy="${n}" r="25" fill="${e}"/>
    <path d="M${t} ${n-14} L${t-10} ${n+8} M${t} ${n-14} L${t+10} ${n+8} M${t-12} ${n+2} h24" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`;return t(66,86)+t(134,118)}function d(e){return`<circle cx="100" cy="100" r="44" fill="${e}"/><circle cx="100" cy="100" r="44" fill="none" stroke="#B48A3C" stroke-width="5"/>
  <path d="M100 78 L86 118 M100 78 L114 118 M84 104 h32" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="96" y="144" width="8" height="26" fill="#AEB5BD"/>`}function f(e){return`
  <rect x="26" y="58" width="148" height="104" rx="8" fill="${e}"/>
  <rect x="26" y="58" width="148" height="18" rx="6" fill="#000" opacity=".15"/>
  <path d="M80 58 v-14 h40 v14" fill="none" stroke="${e}" stroke-width="8"/>
  <rect x="88" y="100" width="24" height="16" rx="2" fill="#B9C0C7"/>`}function p(){let e=e=>`<path d="M${e} 170 v-70 l-6 -50 a6 6 0 0 1 12 -1 l6 40 v-50 a6 6 0 0 1 12 0 v46 v-52 a6 6 0 0 1 12 0 v52 v-44 a6 6 0 0 1 12 0 v60 l10 -18 a6 6 0 0 1 10 6 l-18 46 v35 z" fill="#fff" stroke="#C9CFD6" stroke-width="2"/>`;return e(36)+e(104)}function m(e){return`<path d="M86 22 h28 l-4 18 l22 120 l-32 26 l-32 -26 l22 -120 z" fill="${e}"/>
  <path d="M86 22 h28 l-4 18 h-20z" fill="#000" opacity=".15"/>
  <path d="M100 96 l-6 14 M100 96 l6 14 M93 106 h14" stroke="#B48A3C" stroke-width="2" fill="none"/>`}function h(){return`<rect x="50" y="40" width="88" height="126" rx="6" fill="#AEB5BD"/>
  <path d="M138 70 h16 a14 14 0 0 1 14 14 v38 a14 14 0 0 1 -14 14 h-16" fill="none" stroke="#AEB5BD" stroke-width="12"/>
  <rect x="50" y="40" width="88" height="10" fill="#8C949C"/><rect x="50" y="156" width="88" height="10" fill="#8C949C"/>
  <path d="M94 84 L80 120 M94 84 L108 120 M78 108 h32" stroke="#14284B" stroke-width="3" fill="none" stroke-linecap="round"/>`}function g(t,n,r=`member`,g=``,_=``){let v=/-ea-/.test(_)?`ea`:/-fc-/.test(_)?`fc`:`mm`,{colour:y,trim:b}=e[n],x;switch(t){case`apron`:x=i(y,b,r,v);break;case`set`:x=`<g transform="translate(-14 10) scale(.82)">${i(y,b,r)}</g><g transform="translate(80 8) scale(.55)">${a(y,b,r)}</g>`;break;case`collar`:x=a(y,b,r);break;case`jewel`:x=o(y,b,r);break;case`gauntlets`:x=s(y,b,r);break;case`ritual`:case`book`:x=c(n===`general`?`#14284B`:y,t===`ritual`?`#C9CFD6`:`#B48A3C`);break;case`ring`:x=l();break;case`cufflinks`:x=u(n===`general`?`#7FA7D6`:y);break;case`pin`:x=d(n===`general`?`#14284B`:y);break;case`case`:x=f(`#26282B`);break;case`gloves`:x=p();break;case`tie`:x=m(`#14284B`);break;default:x=h()}return`<svg viewBox="0 0 200 200" role="img" aria-label="${g.replace(/"/g,``)}" xmlns="http://www.w3.org/2000/svg">${x}</svg>`}function _(e,t,n=`card`){if(e.image){let r=e.name.replace(/"/g,`&quot;`),i=n===`large`?`eager`:`lazy`;return`<img src="${t}${e.image}" alt="${r}" loading="${i}" decoding="async" class="photo">`}return g(e.kind,e.body,e.rank,e.name,e.id)}export{_ as n,g as t};