import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

const usernames = [
  "tomasdeane", "SSkullee", "DaraHeaphy", "LelouchYagami0",
  "EliteGrandmasterTom", "naem_haqofficial", "hazDaG", "NikScorch", "ushen"
];

// Fetch rating + games for a given mode
async function fetchStats(username, mode) {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/stats`);
  const data = await res.json();
  const e = data[`chess_${mode}`] || {};
  const last = e.last  || {};
  const rec  = e.record || {};
  return {
    username,
    rating: last.rating || 0,
    games: (rec.win||0) + (rec.loss||0) + (rec.draw||0)
  };
}

// Populate the leaderboard table
async function updateBoard(mode) {
  const stats = await Promise.all(usernames.map(u => fetchStats(u, mode)));
  stats.sort((a, b) => b.rating - a.rating);

  const tbody = document.getElementById('board-body');
  tbody.innerHTML = stats.map((p, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${p.username}</td>
      <td>${p.rating}</td>
      <td>${p.games}</td>
    </tr>
  `).join('');
}

// Set up mode buttons
function initControls() {
  const buttons = document.querySelectorAll('#controls button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateBoard(btn.dataset.mode);
    });
  });
}

// Inspector: list + detail view
function initInspector() {
  const listBody = document.querySelector('#player-list tbody');
  // build list
  listBody.innerHTML = usernames.map(u =>
    `<tr><td data-user="${u}">${u}</td></tr>`
  ).join('');

  const cells = document.querySelectorAll('#player-list td');
  cells.forEach(cell => {
    cell.addEventListener('click', async () => {
      cells.forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      await showDetails(cell.dataset.user);
    });
  });
  // auto-select first
  if (cells[0]) cells[0].click();
}

// Fetch & render full profile + stats
async function showDetails(username) {
  const [profRes, statsRes] = await Promise.all([
    fetch(`https://api.chess.com/pub/player/${username}`),
    fetch(`https://api.chess.com/pub/player/${username}/stats`)
  ]);
  const profile = await profRes.json();
  const stats   = await statsRes.json();

  // common fields
  const joined     = new Date(profile.joined * 1000).toLocaleDateString();
  const lastOnline = new Date(profile.last_online * 1000).toLocaleString();
  const fields = [
    ['Username',   profile.username],
    ['Name',       profile.name       || '—'],
    ['Title',      profile.title      || '—'],
    ['Status',     profile.status     || '—'],
    ['Location',   profile.location   || '—'],
    ['Country',    profile.country ? profile.country.split('/').pop() : '—'],
    ['Joined',     joined],
    ['Last Online',lastOnline],
    ['Followers',  profile.followers  ?? '—']
  ];

  // modes
  ['rapid','blitz','bullet'].forEach(m => {
    const e = stats[`chess_${m}`];
    if (e) {
      const cap = m[0].toUpperCase() + m.slice(1);
      fields.push([`${cap} Rating`, e.last.rating]);
      fields.push([`${cap} Best`,   e.best.rating]);
      const rec = e.record;
      const total = (rec.win||0)+(rec.loss||0)+(rec.draw||0);
      fields.push([`${cap} Games`, total]);
    }
  });

  // render
  const detailsDiv = document.getElementById('player-details');
  detailsDiv.innerHTML = `
    <div class="profile-header">
      <img src="${profile.avatar || 'https://via.placeholder.com/100'}"
           alt="${profile.username}">
    </div>
    <table class="details-table">
      ${fields.map(([k,v]) =>
        `<tr><th>${k}</th><td>${v}</td></tr>`
      ).join('')}
    </table>
  `;
}

// 3D background: thick, fast spinning wireframe
function initThree() {
  const canvas   = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(
    60, (window.innerWidth/2) / window.innerHeight, 0.1, 1000
  );
  camera.position.z = 4;

  function resize() {
    const w = window.innerWidth / 2;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // wireframe icosahedron
  const geo = new THREE.IcosahedronGeometry(1.2, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00fffc,
    wireframe: true,
    wireframeLinewidth: 4
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  (function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.02;  // faster
    mesh.rotation.y += 0.015;
    renderer.render(scene, camera);
  })();
}

// ENTRY
window.addEventListener('DOMContentLoaded', () => {
  initControls();
  updateBoard('rapid');
  initInspector();
  initThree();
});
