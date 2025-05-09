// main.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { getAuth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink }
  from "https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js";
import {
  getDatabase, ref, push, query, orderByChild, equalTo, get,
  onValue, set
} from "https://www.gstatic.com/firebasejs/11.7.1/firebase-database.js";

// --- ONLINE LEADERBOARD SETUP ---
const usernames = [
  "tomasdeane","SSkullee","DaraHeaphy","LelouchYagami0",
  "EliteGrandmasterTom","naem_haqofficial","hazDaG","NikScorch","ushen"
];
function apiName(u){ return u.toLowerCase(); }

async function fetchStats(user, mode) {
  const res = await fetch(`https://api.chess.com/pub/player/${apiName(user)}/stats`);
  if (!res.ok) return { username:user, rating:0, games:0 };
  const d = await res.json();
  const e = d[`chess_${mode}`]||{}, last=e.last||{}, r=e.record||{};
  return {
    username:user,
    rating: last.rating||0,
    games: (r.win||0)+(r.loss||0)+(r.draw||0)
  };
}

async function updateBoard(mode) {
  const body = document.getElementById('board-body');
  body.innerHTML = usernames.map((u,i)=>`
    <tr><td>${i+1}</td><td>${u}</td><td>—</td><td>—</td></tr>
  `).join('');
  const stats = await Promise.all(usernames.map(u=>fetchStats(u, mode)));
  stats.sort((a,b)=>b.rating-a.rating);
  body.innerHTML = stats.map((p,i)=>`
    <tr><td>${i+1}</td><td>${p.username}</td>
        <td>${p.rating}</td><td>${p.games}</td></tr>
  `).join('');
}

function initControls() {
  const btns = document.querySelectorAll('#controls button');
  btns.forEach(b=>b.addEventListener('click', () => {
    btns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    updateBoard(b.dataset.mode);
  }));
}

function clearDetails() {
  const div = document.getElementById('player-details');
  div.innerHTML = `<div class="profile-header"><img src="" alt=""></div>
    <table class="details-table">
      ${['Username','Name','Title','Status','Location','Country','Joined','Last Online','Followers']
      .map(k=>`<tr><th>${k}</th><td>—</td></tr>`).join('')}
    </table>`;
}

async function showDetails(user) {
  clearDetails();
  const [pRes,sRes] = await Promise.all([
    fetch(`https://api.chess.com/pub/player/${apiName(user)}`),
    fetch(`https://api.chess.com/pub/player/${apiName(user)}/stats`)
  ]);
  const p = pRes.ok ? await pRes.json() : {};
  const s = sRes.ok ? await sRes.json() : {};
  const joined = p.joined ? new Date(p.joined*1000).toLocaleDateString() : '—';
  const lastOnline = p.last_online
    ? new Date(p.last_online*1000).toLocaleString()
    : '—';
  let fields = [
    ['Username', p.username||'—'],
    ['Name',     p.name||'—'],
    ['Title',    p.title||'—'],
    ['Status',   p.status||'—'],
    ['Location', p.location||'—'],
    ['Country',  p.country ? p.country.split('/').pop() : '—'],
    ['Joined',   joined],
    ['Last Online', lastOnline],
    ['Followers', p.followers ?? '—']
  ];
  ['rapid','blitz','bullet'].forEach(m=>{
    const e = s[`chess_${m}`]||{}, last=e.last||{}, best=e.best||{}, r=e.record||{};
    const total = (r.win||0)+(r.loss||0)+(r.draw||0);
    const cap = m[0].toUpperCase()+m.slice(1);
    fields.push([`${cap} Rating`, last.rating||'—']);
    fields.push([`${cap} Best`,   best.rating||'—']);
    fields.push([`${cap} Games`,  total]);
  });
  const div = document.getElementById('player-details');
  div.innerHTML = `<div class="profile-header">
      <img src="${p.avatar||''}" alt="${user}">
    </div>
    <table class="details-table">
      ${fields.map(([k,v])=>`<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
    </table>`;
}

function initInspector() {
  const tb = document.querySelector('#player-list tbody');
  tb.innerHTML = usernames.map(u=>`<tr><td data-user="${u}">${u}</td></tr>`).join('');
  const cells = document.querySelectorAll('#player-list td');
  cells.forEach(c=>c.addEventListener('click', ()=>{
    cells.forEach(x=>x.classList.remove('selected'));
    c.classList.add('selected');
    showDetails(c.dataset.user);
  }));
  if(cells[0]) cells[0].click();
}

function initToggles() {
  const container = document.getElementById('container');
  document.getElementById('toggle-tournament')
    .addEventListener('click', ()=> container.classList.add('tournament'));
  document.getElementById('toggle-online')
    .addEventListener('click', ()=> container.classList.remove('tournament'));
}

function initThree() {
  const canvas   = document.getElementById('bg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true });
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(
    60, (window.innerWidth/2)/window.innerHeight, 0.1, 1000
  );
  camera.position.z = 4;
  function resize() {
    const w = window.innerWidth/2, h = window.innerHeight;
    renderer.setSize(w,h);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const geo = new THREE.IcosahedronGeometry(1.2, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00fffc,
    wireframe: true,
    wireframeLinewidth: 8
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  (function animate(){
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.02;
    mesh.rotation.y += 0.015;
    renderer.render(scene, camera);
  })();
}

// --- FIREBASE AUTH & DB SETUP ---
const auth = window.firebaseAuth;
const db   = window.firebaseDb;
const actionCodeSettings = window.actionCodeSettings;

function isValidULEmail(email) {
  return email.toLowerCase().endsWith('@studentmail.ul.ie');
}

function initRegistration() {
  const form = document.getElementById('registration-form');
  const usernameInput = document.getElementById('reg-username');
  const emailInput = document.getElementById('reg-email');
  const messageDiv = document.getElementById('reg-message');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    messageDiv.textContent = '';

    if (!username) {
      messageDiv.textContent = 'Please enter a username.';
      return;
    }
    if (!isValidULEmail(email)) {
      messageDiv.textContent = 'Email must end with @studentmail.ul.ie';
      return;
    }

    try {
      // check duplicate email
      const emailQ = query(ref(db, 'registrations'), orderByChild('email'), equalTo(email));
      const emailSnap = await get(emailQ);
      if (emailSnap.exists()) {
        messageDiv.textContent = 'This email is already registered.';
        return;
      }
      // check duplicate username
      const userQ = query(ref(db, 'registrations'), orderByChild('username'), equalTo(username));
      const userSnap = await get(userQ);
      if (userSnap.exists()) {
        messageDiv.textContent = 'This username is already registered.';
        return;
      }

      localStorage.setItem('registrationEmail', email);
      localStorage.setItem('registrationUsername', username);
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      messageDiv.textContent = 'Confirmation email sent. Check your inbox.';
    } catch (err) {
      console.error(err);
      messageDiv.textContent = 'Error sending confirmation email.';
    }
  });
}

async function handleEmailLink() {
  if (isSignInWithEmailLink(auth, window.location.href)) {
    const email = localStorage.getItem('registrationEmail');
    const username = localStorage.getItem('registrationUsername');
    const messageDiv = document.getElementById('reg-message');
    if (!email || !username) {
      messageDiv.textContent = 'No registration in progress.';
      return;
    }
    try {
      await signInWithEmailLink(auth, email, window.location.href);
      await push(ref(db, 'registrations'), {
        username, email, timestamp: new Date().toISOString()
      });
      messageDiv.textContent = 'Registration confirmed! Thank you.';
      localStorage.removeItem('registrationEmail');
      localStorage.removeItem('registrationUsername');
    } catch (err) {
      console.error(err);
      messageDiv.textContent = 'Error confirming registration.';
    }
  }
}

// --- BRACKET GENERATION & RENDERING ---
function listenRegistrations() {
  const regsRef = ref(db, 'registrations');
  onValue(regsRef, snap => {
    const data = snap.val() || {};
    const players = Object.values(data).map(r => r.username);
    renderRegistered(players);
    generateAndSaveBracket(players);
  });
}

function renderRegistered(players) {
  const ul = document.getElementById('registered-players');
  ul.innerHTML = players.map(u => `<li>${u}</li>`).join('');
}

function buildDoubleElim(players) {
  // next power of two
  const rounds = [];
  if (players.length < 2) return { winners: [], losers: [], final: null };
  const size = 2**Math.ceil(Math.log2(players.length));
  const shuffled = players.slice().sort(() => Math.random() - 0.5);
  while (shuffled.length < size) shuffled.push(null);
  // winners bracket rounds
  let current = shuffled;
  while (current.length > 1) {
    const matches = [];
    for (let i = 0; i < current.length; i += 2) {
      matches.push({ p1: current[i], p2: current[i+1], winner: null, loser: null });
    }
    rounds.push(matches);
    current = matches.map(m => m.winner);
  }
  // losers bracket only first-round losers
  const losers = [];
  if (rounds.length > 0) {
    const losersFirst = rounds[0].map(m => m.loser);
    const mList = [];
    for (let i = 0; i < losersFirst.length; i += 2) {
      mList.push({ p1: losersFirst[i], p2: losersFirst[i+1]||null, winner: null });
    }
    if (mList.length) losers.push(mList);
  }
  return { winners: rounds, losers, final: null };
}

function generateAndSaveBracket(players) {
  const bracket = buildDoubleElim(players);
  set(ref(db, 'bracket/current'), bracket);
}

function renderBracket(bracket) {
  const container = document.getElementById('bracket');
  container.innerHTML = '';
  // winners
  bracket.winners.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'round';
    col.innerHTML = `<h3>W R${ri+1}</h3>`;
    round.forEach((m, mi) => {
      const div = document.createElement('div');
      div.className = 'match';
      const p1 = `<span data-path="winners/${ri}/${mi}/p1">${m.p1||'—'}</span>`;
      const p2 = `<span data-path="winners/${ri}/${mi}/p2">${m.p2||'—'}</span>`;
      div.innerHTML = p1 + p2;
      container.appendChild(col).appendChild(div);
    });
  });
  // losers
  bracket.losers.forEach((round, ri) => {
    const col = document.createElement('div');
    col.className = 'round';
    col.innerHTML = `<h3>L R${ri+1}</h3>`;
    round.forEach((m, mi) => {
      const div = document.createElement('div');
      div.className = 'match';
      const p1 = `<span data-path="losers/${ri}/${mi}/p1">${m.p1||'—'}</span>`;
      const p2 = `<span data-path="losers/${ri}/${mi}/p2">${m.p2||'—'}</span>`;
      div.innerHTML = p1 + p2;
      container.appendChild(col).appendChild(div);
    });
  });
  // final
  if (bracket.final) {
    const col = document.createElement('div');
    col.className = 'round';
    col.innerHTML = `<h3>Final</h3>`;
    const div = document.createElement('div');
    div.className = 'match';
    const p1 = `<span data-path="final/p1">${bracket.final.p1||'—'}</span>`;
    const p2 = `<span data-path="final/p2">${bracket.final.p2||'—'}</span>`;
    div.innerHTML = p1 + p2;
    col.appendChild(div);
    container.appendChild(col);
  }
  attachMatchHandlers();
}

function attachMatchHandlers() {
  document.querySelectorAll('#bracket .match span').forEach(el => {
    el.addEventListener('click', async () => {
      const val = el.textContent;
      if (!val || val === '—') return;
      const path = el.getAttribute('data-path');
      const parts = path.split('/');
      const bracketRef = ref(db, 'bracket/current');
      const snap = await get(bracketRef);
      const b = snap.val();
      // find match object
      let match = b;
      for (let i = 0; i < parts.length - 1; i++) {
        match = match[parts[i]];
      }
      const field = parts.pop(); // 'p1' or 'p2'
      const [roundType, ri, mi] = parts;
      let mObj = b[roundType][ri][mi];
      const other = field === 'p1' ? mObj.p2 : mObj.p1;
      mObj.winner = val;
      mObj.loser = other;
      // save back
      await set(ref(db, `bracket/current/${roundType}/${ri}/${mi}`), mObj);
    });
  });
}

function listenBracket() {
  onValue(ref(db, 'bracket/current'), snap => {
    renderBracket(snap.val() || { winners: [], losers: [], final: null });
  });
}

// --- BOOTSTRAP ---
window.addEventListener('DOMContentLoaded', () => {
  initControls();
  updateBoard('rapid');
  initInspector();
  initToggles();
  initThree();
  initRegistration();
  handleEmailLink();
  listenRegistrations();
  listenBracket();
});
