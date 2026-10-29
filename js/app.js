import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, collection, addDoc, setDoc, doc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const validConfig = !firebaseConfig.apiKey.startsWith("YOUR_");
let db=null, auth=null, user=null;
if(validConfig){
  const app=initializeApp(firebaseConfig);
  auth=getAuth(app); db=getFirestore(app);
  onAuthStateChanged(auth,u=>{user=u; document.querySelector("#loginBtn").textContent=u?"Sign out":"Sign in"; if(u) loadData(); else resetData();});
}else{
  document.querySelector("#loginBtn").textContent="Firebase setup";
}

const state={tasks:[],goals:[],habits:[],habitChecks:[],sessions:[],prayers:[]};
const today=()=>new Date().toISOString().slice(0,10);
const fmtMin=m=>{m=Math.round(m||0); const h=Math.floor(m/60), x=m%60; return h?`${h}h ${x}m`:`${x}m`};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const toast=m=>{const t=document.querySelector("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)};
const uid=()=>user?.uid||"local";

function collectionRef(name){return collection(db,"users",uid(),name)}
async function add(name,data){ if(!db||!user){toast("Sign in to save your data.");return null} return addDoc(collectionRef(name),{...data,createdAt:serverTimestamp()}); }
async function put(name,id,data){return updateDoc(doc(db,"users",uid(),name,id),data)}
async function remove(name,id){return deleteDoc(doc(db,"users",uid(),name,id))}

async function loadData(){
  if(!db||!user)return;
  for(const name of ["tasks","goals","habits","habitChecks","sessions","prayers"]){
    const snap=await getDocs(collectionRef(name)); state[name]=snap.docs.map(d=>({id:d.id,...d.data()}));
  }
  renderAll();
}
function resetData(){for(const k in state)state[k]=[];renderAll()}

function renderAll(){renderTasks();renderGoals();renderHabits();renderSessions();renderPrayer();renderMetrics();renderReports();updateHeader()}

function updateHeader(){
  const d=new Date(); document.querySelector("#todayLabel").textContent=d.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const h=d.getHours(); document.querySelector("#greeting").textContent=h<12?"Good morning.":h<18?"Good afternoon.":"Good evening.";
  const ts=state.tasks.filter(x=>x.date===today()), done=ts.filter(x=>x.done).length;
  document.querySelector("#taskCount").textContent=`${done} / ${ts.length}`;
}

function renderTasks(){
  const ts=state.tasks.filter(x=>x.date===today()).sort((a,b)=>(a.start||"99").localeCompare(b.start||"99"));
  const html=ts.length?ts.map(taskHTML).join(""):`<div class="muted">No tasks yet. Add one when you know what matters.</div>`;
  document.querySelector("#todayList").innerHTML=html;
  document.querySelector("#planList").innerHTML=html;
}
function taskHTML(t){
  return `<div class="task">
    <div class="time-col">${esc(t.start||"")} ${t.end?`<br>– ${esc(t.end)}`:""}</div>
    <button class="check ${t.done?"done":""}" data-task="${t.id}">${t.done?"✓":""}</button>
    <div class="item-main"><div class="item-title ${t.done?"done-text":""}">${esc(t.title)} ${t.priority?" · <b>Priority</b>":""}</div><div class="meta">${esc(t.note||"")}</div></div>
    <div class="task-actions"><button class="small-btn" data-start-task="${t.id}">Start</button>${t.done?`<button class="small-btn" data-carry="${t.id}">Carry</button>`:""}</div>
  </div>`;
}
function renderGoals(){
  const gs=state.goals.filter(x=>x.date===today());
  document.querySelector("#goalList").innerHTML=gs.length?gs.map(g=>`<div class="list-item"><button class="check ${g.done?"done":""}" data-goal="${g.id}">${g.done?"✓":""}</button><div class="item-main"><div class="item-title ${g.done?"done-text":""}">${esc(g.title)}</div></div></div>`).join(""):`<div class="muted">Add 2–3 important goals for today.</div>`;
}
function renderHabits(){
  const hs=state.habits;
  document.querySelector("#habitList").innerHTML=hs.length?hs.map(h=>{
    const check=state.habitChecks.some(c=>c.habitId===h.id&&c.date===today());
    const streak=calcStreak(h.id);
    return `<div class="habit-item"><button class="check ${check?"done":""}" data-habit="${h.id}">${check?"✓":""}</button><div class="item-main"><div class="item-title">${esc(h.title)}</div><div class="meta">${streak} day streak${h.target?` · ${h.target} min target`:""}</div></div></div>`;
  }).join(""):`<div class="muted">No habits yet.</div>`;
}
function calcStreak(id){
  let n=0,d=new Date(); for(let i=0;i<365;i++){const key=d.toISOString().slice(0,10);if(state.habitChecks.some(c=>c.habitId===id&&c.date===key)){n++;d.setDate(d.getDate()-1)}else break}return n;
}
function renderSessions(){
  const ss=state.sessions.filter(s=>s.date===today()).sort((a,b)=>(b.startTs||0)-(a.startTs||0));
  document.querySelector("#sessionList").innerHTML=ss.length?ss.map(s=>`<div class="simple-item"><div class="item-main"><div class="item-title">${esc(s.subject||"Untitled")}</div><div class="meta">${esc(s.type)} · ${fmtMin(s.minutes)}</div></div></div>`).join(""):`<div class="muted">No sessions today.</div>`;
  const totals={study:0,coding:0,revision:0,other:0}; ss.forEach(s=>totals[s.type]=(totals[s.type]||0)+Number(s.minutes||0));
  document.querySelector("#studySummary").innerHTML=Object.entries(totals).map(([k,v])=>`<div class="summary-row"><span>${k[0].toUpperCase()+k.slice(1)}</span><b>${fmtMin(v)}</b></div>`).join("");
}
function renderPrayer(){
  const names=["Fajr","Dhuhr","Asr","Maghrib","Isha"];
  const ps=state.prayers.filter(p=>p.date===today());
  document.querySelector("#prayerList").innerHTML=names.map(name=>{
    const p=ps.find(x=>x.name===name)||{name,status:"Not prayed"};
    return `<div class="prayer-item"><div class="prayer-name">${name}</div><div class="prayer-status">${esc(p.status||"Not prayed")}${p.completedOn&&p.completedOn!==today()?` · completed ${esc(p.completedOn)}`:""}</div><div class="prayer-buttons">
      ${["On time","Late","Qaza","Not prayed"].map(s=>`<button data-prayer="${name}" data-status="${s}">${s}</button>`).join("")}</div></div>`;
  }).join("");
  const pending=state.prayers.filter(p=>p.status==="Qaza"&&!p.qazaCompleted);
  document.querySelector("#qazaSummary").innerHTML=`<b>Pending Qaza:</b> ${pending.length} ${pending.length?"· "+pending.map(p=>`${p.name} (${p.date})`).join(", "):"—"}`;
}
function renderMetrics(){
  const ss=state.sessions.filter(s=>s.date===today());const sum=t=>ss.filter(s=>s.type===t).reduce((a,b)=>a+Number(b.minutes||0),0);
  document.querySelector("#studyMetric").textContent=fmtMin(sum("study"));document.querySelector("#codingMetric").textContent=fmtMin(sum("coding"));document.querySelector("#revisionMetric").textContent=fmtMin(sum("revision"));
}
function renderReports(){
  const now=new Date(), start=new Date(now); start.setDate(now.getDate()-6);
  const inRange=s=>s.date>=start.toISOString().slice(0,10)&&s.date<=today();
  const weekSessions=state.sessions.filter(inRange), month=now.toISOString().slice(0,7), monthSessions=state.sessions.filter(s=>s.date?.startsWith(month));
  const taskWeek=state.tasks.filter(inRange), taskMonth=state.tasks.filter(s=>s.date?.startsWith(month));
  const cards=(sessions,tasks)=>[
    ["Study time",fmtMin(sessions.filter(s=>s.type==="study").reduce((a,b)=>a+Number(b.minutes||0),0))],
    ["Coding time",fmtMin(sessions.filter(s=>s.type==="coding").reduce((a,b)=>a+Number(b.minutes||0),0))],
    ["Revision time",fmtMin(sessions.filter(s=>s.type==="revision").reduce((a,b)=>a+Number(b.minutes||0),0))],
    ["Tasks",`${tasks.filter(t=>t.done).length} / ${tasks.length}`]
  ];
  const html=a=>a.map(x=>`<div class="report-card"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
  document.querySelector("#weeklyReport").innerHTML=html(cards(weekSessions,taskWeek));
  document.querySelector("#monthlyReport").innerHTML=html(cards(monthSessions,taskMonth));
}

document.addEventListener("click",async e=>{
  const tab=e.target.closest(".tab");if(tab){document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));document.querySelector("#view-"+tab.dataset.view).classList.add("active");return}
  const open=e.target.closest("[data-open]");if(open){openModal(open.dataset.open);return}
  if(e.target.closest("[data-close]")){closeModals();return}
  const t=e.target.closest("[data-task]");if(t){const id=t.dataset.task;const x=state.tasks.find(a=>a.id===id);await put("tasks",id,{done:!x.done});x.done=!x.done;renderAll();return}
  const g=e.target.closest("[data-goal]");if(g){const x=state.goals.find(a=>a.id===g.dataset.goal);await put("goals",x.id,{done:!x.done});x.done=!x.done;renderAll();return}
  const h=e.target.closest("[data-habit]");if(h){const exists=state.habitChecks.find(c=>c.habitId===h.dataset.habit&&c.date===today());if(exists){await remove("habitChecks",exists.id);state.habitChecks=state.habitChecks.filter(x=>x.id!==exists.id)}else{const r=await add("habitChecks",{habitId:h.dataset.habit,date:today()});if(r)state.habitChecks.push({id:r.id,habitId:h.dataset.habit,date:today()})}renderAll();return}
  const p=e.target.closest("[data-prayer]");if(p){await setPrayer(p.dataset.prayer,p.dataset.status);return}
  const carry=e.target.closest("[data-carry]");if(carry){const x=state.tasks.find(a=>a.id===carry.dataset.carry);const r=await add("tasks",{title:x.title,date:new Date(Date.now()+86400000).toISOString().slice(0,10),start:x.start||"",end:x.end||"",note:x.note||"",priority:x.priority||false,done:false});if(r){state.tasks.push({id:r.id,title:x.title,date:new Date(Date.now()+86400000).toISOString().slice(0,10),start:x.start||"",end:x.end||"",note:x.note||"",priority:x.priority||false,done:false});toast("Carried to tomorrow.");renderAll()}return}
  const st=e.target.closest("[data-start-task]");if(st){document.querySelector('[data-view="study"]').click();document.querySelector("#sessionSubject").value=state.tasks.find(x=>x.id===st.dataset.startTask)?.title||"";startTimer();return}
});

async function setPrayer(name,status){
  let p=state.prayers.find(x=>x.date===today()&&x.name===name);
  if(!p){const r=await add("prayers",{date:today(),name,status,completedOn:status==="Not prayed"?null:today(),qazaCompleted:false});if(r)state.prayers.push({id:r.id,date:today(),name,status,completedOn:status==="Not prayed"?null:today(),qazaCompleted:false})}
  else {await put("prayers",p.id,{status,completedOn:status==="Not prayed"?null:(p.completedOn||today())});p.status=status;p.completedOn=status==="Not prayed"?null:(p.completedOn||today())}
  renderPrayer();
}

function openModal(id){document.querySelector("#modalLayer").classList.remove("hidden");document.querySelectorAll(".modal").forEach(x=>x.classList.remove("open"));document.querySelector("#"+id).classList.add("open");if(id==="taskModal")document.querySelector("#taskDate").value=today()}
function closeModals(){document.querySelector("#modalLayer").classList.add("hidden")}
document.querySelector("#saveTask").onclick=async()=>{const data={date:document.querySelector("#taskDate").value,title:document.querySelector("#taskTitle").value.trim(),start:document.querySelector("#taskStart").value,end:document.querySelector("#taskEnd").value,note:document.querySelector("#taskNote").value.trim(),priority:document.querySelector("#taskPriority").checked,done:false};if(!data.title)return;const r=await add("tasks",data);if(r){state.tasks.push({id:r.id,...data});closeModals();renderAll();toast("Task added.")}};
document.querySelector("#saveGoal").onclick=async()=>{const title=document.querySelector("#goalTitle").value.trim();if(!title)return;const r=await add("goals",{date:today(),title,done:false});if(r){state.goals.push({id:r.id,date:today(),title,done:false});closeModals();renderAll()}};
document.querySelector("#saveHabit").onclick=async()=>{const title=document.querySelector("#habitTitle").value.trim();if(!title)return;const target=Number(document.querySelector("#habitTarget").value||0);const r=await add("habits",{title,target});if(r){state.habits.push({id:r.id,title,target});closeModals();renderAll()}};

let timerStart=null,timerInterval=null;
function timerText(ms){let s=Math.floor(ms/1000),h=Math.floor(s/3600);s%=3600;let m=Math.floor(s/60);s%=60;return [h,m,s].map((x,i)=>i===0?String(x).padStart(2,"0"):String(x).padStart(2,"0")).join(":")}
function updateTimer(){if(!timerStart)return;const x=timerText(Date.now()-timerStart);document.querySelector("#timer").textContent=x;document.querySelector("#focusTimer").textContent=x}
function startTimer(){if(timerStart)return;timerStart=Date.now();document.querySelector("#startTimer").disabled=true;document.querySelector("#endTimer").disabled=false;timerInterval=setInterval(updateTimer,500);updateTimer()}
async function endTimer(){if(!timerStart)return;const minutes=Math.max(1,Math.round((Date.now()-timerStart)/60000));const type=document.querySelector("#sessionType").value,subject=document.querySelector("#sessionSubject").value.trim()||"Untitled";const r=await add("sessions",{date:today(),type,subject,minutes,startTs:timerStart,endTs:Date.now()});if(r)state.sessions.push({id:r.id,date:today(),type,subject,minutes,startTs:timerStart,endTs:Date.now()});clearInterval(timerInterval);timerStart=null;document.querySelector("#timer").textContent="00:00:00";document.querySelector("#startTimer").disabled=false;document.querySelector("#endTimer").disabled=true;document.querySelector("#focusOverlay").classList.add("hidden");renderAll();toast(`${fmtMin(minutes)} recorded.`)}
document.querySelector("#startTimer").onclick=startTimer;document.querySelector("#endTimer").onclick=endTimer;
document.querySelector("#focusBtn").onclick=()=>{document.querySelector("#focusTitle").textContent=document.querySelector("#sessionSubject").value||"Focus";document.querySelector("#focusOverlay").classList.remove("hidden");if(!timerStart)startTimer()};
document.querySelector("#focusEnd").onclick=endTimer;document.querySelector("#exitFocus").onclick=()=>document.querySelector("#focusOverlay").classList.add("hidden");

document.querySelector("#loginBtn").onclick=async()=>{if(!validConfig){toast("Add Firebase config first.");return}if(user){await signOut(auth)}else{await signInWithPopup(auth,new GoogleAuthProvider())}};
document.querySelector("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("theme",document.body.classList.contains("dark")?"dark":"light")};
if(localStorage.getItem("theme")==="dark")document.body.classList.add("dark");

document.querySelector("#taskDate").value=today();
renderAll();
