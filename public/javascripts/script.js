
// ─────────────────────────────────────────────
//  CONFIG — change base URL to your backend
// ─────────────────────────────────────────────
const API = 'http://localhost:4000';  // ← your Express server URL
let token = localStorage.getItem('np_token') || '';
let currentUser = JSON.parse(localStorage.getItem('np_user') || 'null');
let txnMethod = 'credit';
let transferMode = 'direct';
let histPage = 1, histAllData = [];
let forgotPhone = '';


// ─────────────────────────────────────────────
//  UTILS
// ─────────────────────────────────────────────
function fmt(n){ return '₹' + Number(n).toLocaleString('en-IN',{minimumFractionDigits:0}) }
function fmtDate(d){ return new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'}) }

async function api(method, path, body){
  const opts = {
    method,
    headers:{'Content-Type':'application/json'},
  };
  if(token) opts.headers['Authorization'] = 'Bearer '+token;
  if(body) opts.body = JSON.stringify(body);
  const r = await fetch(API+path, opts);

  return r.json();
}

function toast(msg, type='info'){
  const d = document.createElement('div');
  d.className = 'toast-msg ' + (type==='error'?'error':type==='success'?'success':'');
  d.innerHTML = `<span>${type==='success'?'✓':type==='error'?'✕':'ℹ'}</span> ${msg}`;
  document.getElementById('toast').appendChild(d);
  setTimeout(()=>d.remove(), 4000);
}

function openModal(id){ document.getElementById(id).classList.add('open') }
function closeModal(id){ document.getElementById(id).classList.remove('open') }

// ─────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────
function switchAuth(tab){
  document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
  document.querySelectorAll('.auth-tab-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(tab+'-form').classList.add('active');
  const tabs = ['login','register','forgot'];
  document.querySelectorAll('.auth-tab-btn')[tabs.indexOf(tab)].classList.add('active');
}

async function doLogin(e){
  debugger;e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-pass').value;
  try {
    const r = await api('POST','/users/login',{email, password ,phone:email});
    if(r.success && r.token){
      token = r.token;
      currentUser = r.data;
      localStorage.setItem('np_token', token);
      localStorage.setItem('np_user', JSON.stringify(currentUser));
      initApp();
    } else {
      toast(r.error || r.message || 'Login failed', 'error');
    }
  } catch(err){ toast('Cannot reach server. Make sure backend is running.','error') }
}


async function doRegister(e){
  e.preventDefault();
  const body = {
    name: document.getElementById('reg-name').value,
    accountNo: +document.getElementById('reg-acc').value,
    email: document.getElementById('reg-email').value,
    phone: +document.getElementById('reg-phone').value,
    password: document.getElementById('reg-pass').value,
  };
  try {
    const r = await api('POST','/users/post', body);
    if(r.success){ toast('Account created! Please sign in.','success'); switchAuth('login'); }
    else toast(r.error || r.message,'error');
  } catch(err){ toast('Cannot reach server','error') }
}

async function sendOtp(){
  forgotPhone = document.getElementById('fp-phone').value;
  if(!forgotPhone){ toast('Enter phone number','error'); return; }
  try {
    const r = await api('POST','/users/forgotpassword',{phone:+forgotPhone});
    if(r.success){ toast('OTP sent to registered email','success'); document.getElementById('forgot-step1').style.display='none'; document.getElementById('forgot-step2').style.display='block'; }
    else toast(r.message,'error');
  } catch{ toast('Cannot reach server','error') }
}

async function verifyOtp(){
  const otp = document.getElementById('fp-otp').value;
  try {
    const r = await api('POST','/users/verifyotp',{phone:+forgotPhone, otp:+otp});
    if(r.success){ document.getElementById('forgot-step2').style.display='none'; document.getElementById('forgot-step3').style.display='block'; }
    else toast(r.message,'error');
  } catch{ toast('Cannot reach server','error') }
}

async function resetPass(){
  const password = document.getElementById('fp-newpass').value;
  try {
    const r = await api('POST','/users/resetpassword',{phone:+forgotPhone, password});
    if(r.success){ toast('Password reset! Please sign in.','success'); switchAuth('login'); }
    else toast(r.message,'error');
  } catch{ toast('Cannot reach server','error') }
}

function logout(){
  token=''; currentUser=null;
  localStorage.removeItem('np_token'); localStorage.removeItem('np_user');
  document.getElementById('app').style.display='none';
  document.getElementById('auth-screen').style.display='flex';
}

// ─────────────────────────────────────────────
//  APP INIT
// ─────────────────────────────────────────────
function initApp(){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  if(currentUser){
    const initials = (currentUser.name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    document.getElementById('sidebar-avatar').textContent = initials;
    document.getElementById('sidebar-name').textContent = currentUser.name||'User';
    document.getElementById('sidebar-role').textContent = currentUser.role||'user';
    document.getElementById('profile-avatar').textContent = initials;
    document.getElementById('txn-holder').value = currentUser.id||'';

    const hour = new Date().getHours();
    const greet = hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
    document.getElementById('dash-date').textContent = greet + ', ' + (currentUser.name||'') + ' — here\'s your overview';
  }
  loadDashboard();
  loadBeneficiaries();
  loadProfile();
}

// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
function gotoPage(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{
    if(n.textContent.trim().toLowerCase().includes(page)||
      (page==='transaction'&&n.textContent.includes('Transaction'))||
      (page==='transfer'&&n.textContent.includes('Transfer'))||
      (page==='history'&&n.textContent.includes('History'))||
      (page==='beneficiaries'&&n.textContent.includes('Beneficiar'))||
      (page==='profile'&&n.textContent.includes('Profile'))||
      (page==='dashboard'&&n.textContent.includes('Dashboard'))
    ) n.classList.add('active');
  });
  if(page==='history') loadHistory(1);
  if(page==='dashboard') loadDashboard();
  if(page==='transfer') loadTransferBalanceAndBens();
}

// ─────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────
async function loadDashboard(){
  try {
    const r = await api('GET','/transaction/alldata?page=1&limit=10');
    if(r.success){
      const bal = r.currentBalance||0;
      document.getElementById('stat-balance').textContent = fmt(bal);
      document.getElementById('card-balance').textContent = fmt(bal);
      document.getElementById('stat-count').textContent = r.pagination?.totaltransactions||0;
      document.getElementById('txn-balance-display').textContent = fmt(bal);
      document.getElementById('transfer-avail').textContent = fmt(bal);

      // calc credits/debits from data
      let credits=0, debits=0;
      (r.result||[]).forEach(t=>{ if(t.method==='credit') credits+=t.transaction; else debits+=t.transaction; });
      document.getElementById('stat-credits').textContent = fmt(credits);
      document.getElementById('stat-debits').textContent = fmt(debits);

      if(currentUser){
        const name = currentUser.name||'—';
        document.getElementById('card-name').textContent = name;
        document.getElementById('card-number').textContent = `**** **** **** ${(currentUser.accountNo||'0000').toString().slice(-4)}`;
      }

      // Recent tbody
      const tbody = document.getElementById('recent-tbody');
      const data = r.result||[];
      if(!data.length){ tbody.innerHTML='<tr><td colspan="3"><div class="empty"><p>No transactions yet</p></div></td></tr>'; return; }
      tbody.innerHTML = data.map(t=>`
        <tr>
          <td style="color:var(--text-dim);font-size:12px">${fmtDate(t.createdAt)}</td>
          <td><span class="badge badge-${t.method}">${t.method}</span></td>
          <td class="amount amount-${t.method}">${t.method==='credit'?'+':'-'}${fmt(t.transaction)}</td>
        </tr>`).join('');
    }
  } catch(e){ console.error(e); toast('Dashboard load failed','error') }
}

// ─────────────────────────────────────────────
//  TRANSACTION
// ─────────────────────────────────────────────
function setMethod(m){
  txnMethod = m;
  document.getElementById('opt-credit').classList.toggle('selected', m==='credit');
  document.getElementById('opt-debit').classList.toggle('selected', m==='debit');
  document.getElementById('opt-debit').classList.toggle('debit', m==='debit');
  document.getElementById('opt-credit').classList.remove('debit');
}

async function doTransaction(){
  const amount = +document.getElementById('txn-amount').value;
  if(!amount||amount<=0){ toast('Enter a valid amount','error'); return; }
  try {
    const r = await api('POST','/transaction/transaction',{
      account_Holdername: currentUser.id,
      transaction: amount,
      method: txnMethod
    });
    if(r.success){
      toast(`${txnMethod==='credit'?'Credit':'Debit'} of ${fmt(amount)} successful!`,'success');
      document.getElementById('txn-amount').value='';
      document.getElementById('txn-balance-display').textContent = fmt(r.currentBalance||0);
      loadDashboard();
    } else toast(r.error||r.message,'error');
  } catch{ toast('Cannot reach server','error') }
}

// ─────────────────────────────────────────────
//  HISTORY
// ─────────────────────────────────────────────
let histFilter = '';
function filterHistory(v){ histFilter = v; loadHistory(1); }

async function loadHistory(page=1){
  histPage = page;
  document.getElementById('history-tbody').innerHTML = '<tr><td colspan="5"><div class="loading-overlay"><div class="spinner"></div> Loading...</div></td></tr>';
  try {

    const r = await api('GET',`/transaction/history/:${currentUser.id}?page=${page}&limit=10`);
    console.log(r);
    if(r.success){
      const info = `Page ${page} of ${r.pagination?.totalPages||1} — ${r.pagination?.totalTransactions||0} transactions`;
      document.getElementById('hist-info').textContent = info;
      let data = r.transactions||[];
      if(histFilter) data = data.filter(t=>t.method===histFilter);
      const tbody = document.getElementById('history-tbody');
      if(!data.length){ tbody.innerHTML='<tr><td colspan="5"><div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><p>No transactions found</p></div></td></tr>'; return; }
      tbody.innerHTML = data.map((t,i)=>{
        const holder = Array.isArray(t.account_Holdername) ? (t.account_Holdername[0]?.name||'—') : (t.account_Holdername?.name||currentUser?.name||'—');
        return `<tr>
          <td style="color:var(--text-muted);font-family:'DM Mono',monospace;font-size:12px">${(page-1)*10+i+1}</td>
          <td style="font-size:12px;color:var(--text-dim)">${fmtDate(t.createdAt)}</td>
          <td style="font-size:13px">${holder}</td>
          <td><span class="badge badge-${t.method}">${t.method}</span></td>
          <td class="amount amount-${t.method}">${t.method==='credit'?'+':'-'}${fmt(t.transaction)}</td>
        </tr>`;
      }).join('');
      renderPagination('hist-pagination', page, r.pagination?.totalPages||1, loadHistory);
    }
  } catch{ toast('Cannot reach server','error') }
}

function renderPagination(id, current, total, cb){
  const el = document.getElementById(id);
  if(total<=1){ el.innerHTML=''; return; }
  let html = '';
  if(current>1) html += `<button class="page-btn" onclick="${cb.name}(${current-1})">‹</button>`;
  for(let i=1;i<=Math.min(total,7);i++){
    if(total>7 && i>3 && i<total-1 && Math.abs(i-current)>1){ if(html.slice(-3)!='...') html+='<span class="page-info">…</span>'; continue; }
    html += `<button class="page-btn${i===current?' active':''}" onclick="${cb.name}(${i})">${i}</button>`;
  }
  if(current<total) html += `<button class="page-btn" onclick="${cb.name}(${current+1})">›</button>`;
  el.innerHTML = html;
}

// ─────────────────────────────────────────────
//  DOWNLOAD STATEMENT
// ─────────────────────────────────────────────
async function downloadStatement(){
  try {
    const r = await fetch(API+'/transaction/statement',{headers:{'Authorization':'Bearer '+token}});
    if(!r.ok){ toast('No transactions found','error'); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='statement.csv'; a.click();
    toast('Statement downloaded','success');
  } catch{ toast('Cannot reach server','error') }
}

// ─────────────────────────────────────────────
//  TRANSFER
// ─────────────────────────────────────────────
function setTransferMode(mode){
  transferMode = mode;
  document.getElementById('t-direct').classList.toggle('active', mode==='direct');
  document.getElementById('t-ben').classList.toggle('active', mode==='beneficiary');
  document.getElementById('transfer-direct-section').style.display = mode==='direct'?'block':'none';
  document.getElementById('transfer-ben-section').style.display = mode==='beneficiary'?'block':'none';
}

async function loadTransferBalanceAndBens(){
  try {
    const r = await api('GET','/transaction/alldata?page=1&limit=1');
    if(r.success) document.getElementById('transfer-avail').textContent = fmt(r.currentBalance||0);
  } catch{}
  // populate beneficiary dropdown
  try {
    const bens = JSON.parse(localStorage.getItem('np_bens')||'[]');
    const sel = document.getElementById('transfer-ben-select');
    sel.innerHTML = '<option value="">-- Select a beneficiary --</option>' +
      bens.map(b=>`<option value="${b._id}">${b.beneficiaryName} (${b.accountNo})</option>`).join('');
  } catch{}
}

async function doTransfer(){
  const amount = +document.getElementById('transfer-amount').value;
  if(!amount||amount<=0){ toast('Enter a valid amount','error'); return; }
  const body = { amount };
  if(transferMode==='direct'){
    const acc = +document.getElementById('transfer-accno').value;
    if(!acc){ toast('Enter receiver account number','error'); return; }
    body.receiverAccountNo = acc;
  } else {
    const benId = document.getElementById('transfer-ben-select').value;
    if(!benId){ toast('Select a beneficiary','error'); return; }
    body.beneficiaryId = benId;
  }
  try {
    const r = await api('POST','/transaction/transfer', body);
    if(r.success){
      toast(`Transfer of ${fmt(amount)} successful!`,'success');
      document.getElementById('transfer-amount').value='';
      document.getElementById('transfer-avail').textContent = fmt(r.currentBalance||0);
      loadDashboard();
    } else toast(r.error||r.message,'error');
  } catch{ toast('Cannot reach server','error') }
}

// ─────────────────────────────────────────────
//  BENEFICIARIES
// ─────────────────────────────────────────────
async function loadBeneficiaries(){
  // The API doesn't expose a list endpoint, so we cache locally
  const bens = JSON.parse(localStorage.getItem('np_bens')||'[]');
  renderBenList(bens);
}

function renderBenList(bens){
  const el = document.getElementById('beneficiary-list');
  if(!bens.length){ el.innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg><p>No beneficiaries added yet</p></div>'; return; }
  el.innerHTML = bens.map((b,i)=>{
    const initials = (b.beneficiaryName||'B').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    return `<div class="beneficiary-item">
      <div class="avatar" style="width:40px;height:40px">${initials}</div>
      <div class="ben-info">
        <div class="ben-name">${b.beneficiaryName||'—'}</div>
        <div class="ben-acc">${(''+b.accountNo).replace(/(\d{4})/g,'$1 ').trim()}</div>
      </div>
      <button class="btn btn-outline btn-sm" onclick="removeBen(${i})">Remove</button>
    </div>`;
  }).join('');
}

function openAddBen(){ openModal('add-ben-modal'); }

async function doAddBen(){
  const name = document.getElementById('ben-name').value;
  const accno = +document.getElementById('ben-accno').value;
  if(!name||!accno){ toast('Fill all fields','error'); return; }
  try {
    const r = await api('POST','/transaction/add-beneficiary',{name, accountNo:accno});
    if(r.success){
      const bens = JSON.parse(localStorage.getItem('np_bens')||'[]');
      bens.push(r.data||{_id:Date.now(),beneficiaryName:name,accountNo:accno});
      localStorage.setItem('np_bens', JSON.stringify(bens));
      renderBenList(bens);
      closeModal('add-ben-modal');
      document.getElementById('ben-name').value='';
      document.getElementById('ben-accno').value='';
      toast('Beneficiary added!','success');
    } else toast(r.error||r.message,'error');
  } catch{ toast('Cannot reach server','error') }
}

function removeBen(idx){
  const bens = JSON.parse(localStorage.getItem('np_bens')||'[]');
  bens.splice(idx,1);
  localStorage.setItem('np_bens', JSON.stringify(bens));
  renderBenList(bens);
  toast('Beneficiary removed','info');
}

// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────
async function loadProfile(){
  if(!currentUser) return;
  document.getElementById('profile-name').textContent = currentUser.name||'—';
  document.getElementById('profile-email').textContent = currentUser.email||'—';
  document.getElementById('upd-name').value = currentUser.name||'';
  document.getElementById('upd-email').value = currentUser.email||'';

  // Try to load full profile
  try {
    const r = await api('GET','/users/getusers');
    if(r.success && r.data){
      const me = r.data.find(u=>u._id===currentUser.id || u.email===currentUser.email);
      if(me){
        document.getElementById('profile-acc').textContent = me.accountNo||'—';
        document.getElementById('profile-phone').textContent = me.phone||'—';
        document.getElementById('profile-role').textContent = me.role||'user';
        document.getElementById('profile-joined').textContent = me.createdAt ? new Date(me.createdAt).toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'}) : '—';
      }
    }
  } catch{}
}

async function doUpdateProfile(){
  const body = {};
  const name = document.getElementById('upd-name').value;
  const email = document.getElementById('upd-email').value;
  const pass = document.getElementById('upd-pass').value;
  if(name) body.name = name;
  if(email) body.email = email;
  if(pass) body.password = pass;
  try {
    const r = await api('PATCH',`/users/${currentUser.id}`, body);
    if(r.success){
      toast('Profile updated!','success');
      if(name) currentUser.name = name;
      if(email) currentUser.email = email;
      localStorage.setItem('np_user', JSON.stringify(currentUser));
      document.getElementById('sidebar-name').textContent = currentUser.name;
      document.getElementById('profile-name').textContent = currentUser.name;
      document.getElementById('upd-pass').value='';
    } else toast(r.error||r.message,'error');
  } catch{ toast('Cannot reach server','error') }
}

// ─────────────────────────────────────────────
//  STARTUP
// ─────────────────────────────────────────────
(function(){
  if(token && currentUser){
    initApp();
  } else {
    document.getElementById('auth-screen').style.display='flex';
    document.getElementById('app').style.display='none';
  }
})();
