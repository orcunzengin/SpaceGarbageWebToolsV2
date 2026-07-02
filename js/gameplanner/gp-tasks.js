// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — GÖREV & ROADMAP  (gp-tasks.js)
// ════════════════════════════════════════════════════════════════

const GP_TASK_STATUSES = [
    { id:'idea',    label:'💡 Fikir Havuzu', color:'#64748b' },
    { id:'todo',    label:'📋 Yapılacak',    color:'#38bdf8' },
    { id:'doing',   label:'⚙️ Yapılıyor',    color:'#f59e0b' },
    { id:'done',    label:'✅ Tamamlandı',   color:'#10b981' }
];
const GP_TASK_PRIOS = [
    { id:'critical', label:'🔴 Kritik',  color:'#ef4444', cls:'gp-prio-critical' },
    { id:'high',     label:'🟠 Yüksek',  color:'#f59e0b', cls:'gp-prio-high'     },
    { id:'mid',      label:'🔵 Orta',    color:'#3b82f6', cls:'gp-prio-mid'      },
    { id:'low',      label:'⚪ Düşük',   color:'#475569', cls:'gp-prio-low'      }
];
const GP_TASK_CATS = ['Tasarım','Kod','Sanat','Ses','Test','Yazı','Diğer'];

let gpDraggedTaskId = null;

window.gpRenderTasks = function() {
    const wrap = document.getElementById('gp-tasks-content');
    if (!wrap) return;
    if (!window.gpRequireProject(wrap)) return;

    const milestones = Object.values(window.gpActiveProject?.tasks?.milestones||{}).sort((a,b)=>(a.order||0)-(b.order||0));
    const tasks      = window.gpActiveProject?.tasks || {};

    // ── Milestone şeridi ──
    const msBar = milestones.map(ms => {
        const msTaskCount = Object.values(tasks).filter(t=>t.id&&t.milestoneId===ms.id).length;
        const msDone      = Object.values(tasks).filter(t=>t.id&&t.milestoneId===ms.id&&t.status==='done').length;
        return `<div class="gp-milestone-chip ${msDone===msTaskCount&&msTaskCount>0?'active':''}">
            🏁 <strong>${gpEsc(ms.name)}</strong>
            <span style="font-size:10px;color:#475569;">${msDone}/${msTaskCount}</span>
            <button style="background:none;border:none;color:#475569;cursor:pointer;font-size:12px;" onclick="gpTaskDeleteMilestone('${ms.id}')">×</button>
        </div>`;
    }).join('');

    wrap.innerHTML = `
    <div class="gp-page-hdr">
        <div><h1 class="gp-title">✅ Görev & Roadmap</h1></div>
        <div style="display:flex;gap:8px;">
            <button class="gp-btn-secondary" onclick="gpTaskNewMilestone()">🏁 Milestone</button>
            <button class="gp-btn-primary"   onclick="gpTaskNew()">➕ Görev</button>
        </div>
    </div>

    <div class="gp-milestone-bar" style="margin-bottom:16px;">
        ${msBar || `<div style="color:#475569;font-size:12px;">Milestone yok — 🏁 Milestone butonuyla ekle.</div>`}
    </div>

    <div class="gp-kanban">
        ${GP_TASK_STATUSES.map(col => `
        <div class="gp-kanban-col">
            <div class="gp-kanban-col-hdr" style="border-bottom:3px solid ${col.color};">
                <span>${col.label}</span>
                <span class="gp-kanban-badge" id="gp-badge-${col.id}">0</span>
            </div>
            <div class="gp-kanban-body" id="gp-col-${col.id}"
                ondragover="event.preventDefault();this.classList.add('drag-over')"
                ondragleave="this.classList.remove('drag-over')"
                ondrop="gpTaskDrop(event,'${col.id}')">
            </div>
            <button class="gp-kanban-add" onclick="gpTaskNew('${col.id}')">+ Hızlı Ekle</button>
        </div>`).join('')}
    </div>`;

    gpTaskRenderAllCols(tasks);
};

function gpTaskRenderAllCols(tasks) {
    GP_TASK_STATUSES.forEach(col => {
        const colEl  = document.getElementById(`gp-col-${col.id}`);
        const badge  = document.getElementById(`gp-badge-${col.id}`);
        if (!colEl) return;

        const colTasks = Object.values(tasks)
            .filter(t => t.id && t.status===col.id)
            .sort((a,b)=>{
                const po={'critical':0,'high':1,'mid':2,'low':3};
                return (po[a.priority]??2)-(po[b.priority]??2);
            });

        if (badge) badge.textContent = colTasks.length;

        colEl.innerHTML = colTasks.map(t => {
            const prio = GP_TASK_PRIOS.find(p=>p.id===t.priority) || GP_TASK_PRIOS[2];
            const milestone = (window.gpActiveProject?.tasks?.milestones||{})[t.milestoneId];
            return `
            <div class="gp-task-card ${prio.cls}" draggable="true"
                ondragstart="gpTaskDragStart(event,'${t.id}')"
                ondragend="gpTaskDragEnd(event)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                    <div class="gp-task-title">${gpEsc(t.title||'İsimsiz Görev')}</div>
                    <button style="background:none;border:none;color:#475569;cursor:pointer;font-size:16px;flex-shrink:0;padding:0;" onclick="gpTaskDelete('${t.id}')">×</button>
                </div>
                ${t.description?`<div style="font-size:11px;color:#64748b;margin-bottom:6px;">${gpEsc(t.description.slice(0,80))}</div>`:''}
                <div class="gp-task-meta">
                    <span class="gp-tag" style="background:${prio.color}22;color:${prio.color};border-color:${prio.color}44;font-size:10px;">${prio.label}</span>
                    ${t.category?`<span class="gp-tag" style="font-size:10px;">${gpEsc(t.category)}</span>`:''}
                    ${milestone?`<span class="gp-tag gp-tag-success" style="font-size:10px;">🏁 ${gpEsc(milestone.name)}</span>`:''}
                    <button style="background:none;border:none;color:#a78bfa;cursor:pointer;font-size:11px;margin-left:auto;" onclick="gpTaskEdit('${t.id}')">✏️</button>
                </div>
            </div>`;
        }).join('');
    });
}

// ── Sürükle-bırak ──────────────────────────────────────────────
window.gpTaskDragStart = function(e, id) {
    gpDraggedTaskId = id;
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
};
window.gpTaskDragEnd = function(e) {
    e.currentTarget.style.opacity = '1';
    document.querySelectorAll('.gp-kanban-body').forEach(c=>c.classList.remove('drag-over'));
};
window.gpTaskDrop = function(e, newStatus) {
    e.currentTarget.classList.remove('drag-over');
    if (!gpDraggedTaskId || !window.gpActiveProjectId) return;
    window.firebaseSet(
        window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/tasks/${gpDraggedTaskId}/status`),
        newStatus
    );
    gpDraggedTaskId = null;
};

// ── CRUD ────────────────────────────────────────────────────────
window.gpTaskNew = function(status='idea') {
    const title = prompt('Görev başlığı:'); if (!title) return;
    const id = window.gpGenId('task');
    const milestones = Object.values(window.gpActiveProject?.tasks?.milestones||{});
    let milestoneId = '';
    if (milestones.length) {
        const opts = milestones.map((m,i)=>`${i}: ${m.name}`).join('\n');
        const idx  = prompt(`Milestone ata (boş=ata):\n${opts}`);
        if (idx!==null && idx!=='') milestoneId = milestones[parseInt(idx)]?.id||'';
    }
    const pIdx = prompt('Öncelik:\n0: Kritik\n1: Yüksek\n2: Orta\n3: Düşük\n(boş=Orta)','2');
    const priority = GP_TASK_PRIOS[parseInt(pIdx??2)]?.id || 'mid';
    const category = prompt(`Kategori:\n${GP_TASK_CATS.join(', ')}\n(boş=Diğer)`,'')||'Diğer';

    const task = { id, title:title.trim(), description:'', priority, category, status, milestoneId, createdAt:Date.now() };
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/tasks/${id}`),task);
    window.registerAction && window.registerAction(`"${title}" görevi eklendi.`);
};

window.gpTaskEdit = function(id) {
    const t = (window.gpActiveProject?.tasks||{})[id]; if (!t) return;
    const title = prompt('Görev başlığı:',t.title||''); if (title===null) return;
    const desc  = prompt('Kısa açıklama:',t.description||'')||'';
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/tasks/${id}/title`),title.trim());
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/tasks/${id}/description`),desc);
};

window.gpTaskDelete = function(id) {
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/tasks/${id}`),null);
};

window.gpTaskNewMilestone = function() {
    const name = prompt('Milestone adı (Örn: Alpha, İlk Playtest):'); if (!name) return;
    const id   = window.gpGenId('ms');
    const existing = Object.values(window.gpActiveProject?.tasks?.milestones||{});
    const order = existing.length ? Math.max(...existing.map(m=>m.order||0))+1 : 1;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/tasks/milestones/${id}`),{id,name:name.trim(),order});
};

window.gpTaskDeleteMilestone = function(id) {
    if (!confirm('Milestone\'ı sil?')) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/tasks/milestones/${id}`),null);
};
