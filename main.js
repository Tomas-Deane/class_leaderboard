import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

const usernames = [
  "tomasdeane","SSkullee","DaraHeaphy","LelouchYagami0",
  "EliteGrandmasterTom","naem_haqofficial","hazDaG","NikScorch","ushen"
];

function apiName(u){ return u.toLowerCase(); }

// --- Leaderboard & Inspector as before, with placeholders ---
async function fetchStats(user, mode) {
  const res = await fetch(`https://api.chess.com/pub/player/${apiName(user)}/stats`);
  if(!res.ok) return {username:user,rating:0,games:0};
  const d = await res.json();
  const e = d[`chess_${mode}`]||{}, last=e.last||{}, r=e.record||{};
  return {username:user,rating:last.rating||0,games:(r.win||0)+(r.loss||0)+(r.draw||0)};
}

function clearBoard(){
  document.getElementById('board-body').innerHTML =
    usernames.map((u,i)=>`
      <tr><td>${i+1}</td><td>${u}</td><td>—</td><td>—</td></tr>
    `).join('');
}

async function updateBoard(mode){
  clearBoard();
  const stats = await Promise.all(usernames.map(u=>fetchStats(u,mode)));
  stats.sort((a,b)=>b.rating-a.rating);
  document.getElementById('board-body').innerHTML = stats.map((p,i)=>`
    <tr><td>${i+1}</td><td>${p.username}</td><td>${p.rating}</td><td>${p.games}</td></tr>
  `).join('');
}

function initControls(){
  const btns = document.querySelectorAll('#controls button');
  btns.forEach(b=>{
    b.addEventListener('click',()=>{
      btns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      updateBoard(b.dataset.mode);
    });
  });
}

function clearDetails(){
  document.getElementById('player-details').innerHTML = `
    <div class="profile-header"><img src="" alt=""></div>
    <table class="details-table">
      ${['Username','Name','Title','Status','Location','Country','Joined','Last Online','Followers']
        .map(k=>`<tr><th>${k}</th><td>—</td></tr>`).join('')}
    </table>`;
}

function initInspector(){
  const tb = document.querySelector('#player-list tbody');
  tb.innerHTML = usernames.map(u=>`<tr><td data-user="${u}">${u}</td></tr>`).join('');
  const cells = document.querySelectorAll('#player-list td');
  cells.forEach(c=>c.addEventListener('click',async()=>{
    cells.forEach(x=>x.classList.remove('selected'));
    c.classList.add('selected');
    clearDetails();
    await showDetails(c.dataset.user);
  }));
  if(cells[0]) cells[0].click();
}

async function showDetails(user){
  const [pRes,sRes] = await Promise.all([
    fetch(`https://api.chess.com/pub/player/${apiName(user)}`),
    fetch(`https://api.chess.com/pub/player/${apiName(user)}/stats`)
  ]);
  const p = pRes.ok?await pRes.json():{};
  const s = sRes.ok?await sRes.json():{};
  const j = p.joined?new Date(p.joined*1000).toLocaleDateString():'—';
  const lo= p.last_online?new Date(p.last_online*1000).toLocaleString():'—';
  const fields = [
    ['Username',p.username||'—'],
    ['Name',p.name||'—'],
    ['Title',p.title||'—'],
    ['Status',p.status||'—'],
    ['Location',p.location||'—'],
    ['Country',p.country? p.country.split('/').pop():'—'],
    ['Joined',j],
    ['Last Online',lo],
    ['Followers',p.followers??'—']
  ];
  ['rapid','blitz','bullet'].forEach(m=>{
    const e = s[`chess_${m}`]||{}, last=e.last||{}, best=e.best||{}, r=e.record||{};
    const total=(r.win||0)+(r.loss||0)+(r.draw||0);
    const cap=m[0].toUpperCase()+m.slice(1);
    fields.push([`${cap} Rating`,last.rating||'—']);
    fields.push([`${cap} Best`,best.rating||'—']);
    fields.push([`${cap} Games`,total]);
  });
  document.getElementById('player-details').innerHTML = `
    <div class="profile-header">
      <img src="${p.avatar||''}" alt="${user}">
    </div>
    <table class="details-table">
      ${fields.map(([k,v])=>`<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
    </table>`;
}

// --- Tournament & mode toggle ---
const container = document.getElementById('container');
const btnTourn  = document.getElementById('toggle-tournament');
const btnOnline = document.getElementById('toggle-online');
btnTourn.addEventListener('click',()=>{
  container.classList.add('tournament');
  document.getElementById('controls').style.display = 'none';
  document.getElementById('leaderboard-table').style.display = 'none';
  document.getElementById('inspector').style.display = 'none';
  document.getElementById('tournament-info').style.display = 'block';
  btnTourn.style.display  = 'none';
  btnOnline.style.display = 'block';
});
btnOnline.addEventListener('click',()=>{
  container.classList.remove('tournament');
  document.getElementById('controls').style.display = '';
  document.getElementById('leaderboard-table').style.display = '';
  document.getElementById('inspector').style.display = 'flex';
  document.getElementById('tournament-info').style.display = 'none';
  btnOnline.style.display = 'none';
  btnTourn.style.display   = 'block';
});

// --- 3D background ---
function initThree(){
  const canvas = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true});
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60, (window.innerWidth/2)/window.innerHeight, 0.1, 1000
  );
  camera.position.z = 4;

  function resize(){
    const w = window.innerWidth/2, h = window.innerHeight;
    renderer.setSize(w,h);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const geo = new THREE.IcosahedronGeometry(1.2,0);
  const mat = new THREE.MeshBasicMaterial({
    color:0x00fffc, wireframe:true, wireframeLinewidth:8
  });
  const mesh = new THREE.Mesh(geo,mat);
  scene.add(mesh);

  (function animate(){
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.04;
    mesh.rotation.y += 0.03;
    renderer.render(scene,camera);
  })();
}

// --- Entry point ---
window.addEventListener('DOMContentLoaded', ()=>{
  initControls();
  updateBoard('rapid');
  initInspector();
  initThree();
});
