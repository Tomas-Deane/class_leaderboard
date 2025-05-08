import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

const usernames = [
  "tomasdeane", "SSkullee", "DaraHeaphy", "LelouchYagami0",
  "EliteGrandmasterTom", "naem_haqofficial", "hazDaG", "NikScorch", "ushen"
];

// Normalize name for API (lowercase)
function apiName(u) {
  return u.toLowerCase();
}

// Fetch rating + games for a given mode
async function fetchStats(username, mode) {
  const res = await fetch(`https://api.chess.com/pub/player/${apiName(username)}/stats`);
  if (!res.ok) return { username, rating:0, games:0 };
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

// Immediately clear table to placeholders
function clearBoard() {
  const tbody = document.getElementById('board-body');
  tbody.innerHTML = usernames.map((u,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${u}</td>
      <td>—</td>
      <td>—</td>
    </tr>
  `).join('');
}

// Populate the leaderboard table
async function updateBoard(mode) {
  clearBoard();
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

// Clear inspector details to placeholders
function clearDetails() {
  const detailsDiv = document.getElementById('player-details');
  detailsDiv.innerHTML = `
    <div class="profile-header">
      <img src="" alt="">
    </div>
    <table class="details-table">
      <tr><th>Username</th><td>—</td></tr>
      <tr><th>Name</th><td>—</td></tr>
      <tr><th>Title</th><td>—</td></tr>
      <tr><th>Status</th><td>—</td></tr>
      <tr><th>Location</th><td>—</td></tr>
      <tr><th>Country</th><td>—</td></tr>
      <tr><th>Joined</th><td>—</td></tr>
      <tr><th>Last Online</th><td>—</td></tr>
      <tr><th>Followers</th><td>—</td></tr>
    </table>
  `;
}

// Inspector: list + detail view
function initInspector() {
  const listBody = document.querySelector('#player-list tbody');
  listBody.innerHTML = usernames.map(u =>
    `<tr><td data-user="${u}">${u}</td></tr>`
  ).join('');

  const cells = document.querySelectorAll('#player-list td');
  cells.forEach(cell => {
    cell.addEventListener('click', async () => {
      cells.forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      clearDetails();
      await showDetails(cell.dataset.user);
    });
  });
  if (cells[0]) cells[0].click();
}

// Fetch & render full profile + stats
async function showDetails(username) {
  const profRes = await fetch(`https://api.chess.com/pub/player/${apiName(username)}`);
  const statsRes = await fetch(`https://api.chess.com/pub/player/${apiName(username)}/stats`);
  const profile = profRes.ok ? await profRes.json() : {};
  const stats   = statsRes.ok ? await statsRes.json() : {};

  const joined     = profile.joined     ? new Date(profile.joined * 1000).toLocaleDateString() : '—';
  const lastOnline = profile.last_online ? new Date(profile.last_online * 1000).toLocaleString() : '—';

  const fields = [
    ['Username',   profile.username || '—'],
    ['Name',       profile.name       || '—'],
    ['Title',      profile.title      || '—'],
    ['Status',     profile.status     || '—'],
    ['Location',   profile.location   || '—'],
    ['Country',    profile.country ? profile.country.split('/').pop() : '—'],
    ['Joined',     joined],
    ['Last Online',lastOnline],
    ['Followers',  profile.followers  ?? '—']
  ];

  ['rapid','blitz','bullet'].forEach(m => {
    const e = stats[`chess_${m}`] || {};
    const last = e.last || {};
    const best = e.best || {};
    const rec  = e.record || {};
    const total = (rec.win||0)+(rec.loss||0)+(rec.draw||0);
    const cap = m[0].toUpperCase()+m.slice(1);
    fields.push([`${cap} Rating`, last.rating || '—']);
    fields.push([`${cap} Best`,   best.rating || '—']);
    fields.push([`${cap} Games`,  total]);
  });

  const detailsDiv = document.getElementById('player-details');
  detailsDiv.innerHTML = `
    <div class="profile-header">
      <img src="${profile.avatar || ''}" alt="${username}">
    </div>
    <table class="details-table">
      ${fields.map(([k,v]) =>
        `<tr><th>${k}</th><td>${v}</td></tr>`
      ).join('')}
    </table>
  `;
}

// 3D background: very thick, much faster spin
function initThree() {
  const canvas   = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(
    60, (window.innerWidth/2)/window.innerHeight, 0.1, 1000
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

  // thicker wireframe icosahedron
  const geo = new THREE.IcosahedronGeometry(1.2, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00fffc,
    wireframe: true,
    wireframeLinewidth: 8
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  (function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.04;   // much faster
    mesh.rotation.y += 0.03;
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
