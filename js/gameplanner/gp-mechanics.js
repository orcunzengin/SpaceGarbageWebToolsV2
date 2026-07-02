// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — MEKANİKLER  (gp-mechanics.js)
// ════════════════════════════════════════════════════════════════

const GP_MECH_TYPES = ['Hareket','Savaş','Ekonomi','Progression','Crafting','Sosyal','Fizik','UI/UX','Meta','Diğer'];
const GP_MECH_PRIO  = ['Core Loop','Sekonder','Nice-to-have','İptal Edildi'];
const GP_MECH_PRIO_COLORS = { 'Core Loop':'#10b981','Sekonder':'#38bdf8','Nice-to-have':'#f59e0b','İptal Edildi':'#ef4444' };

let gpMechSelected = null;

window.gpRenderMechanics = function() {
    const wrap = document.getElementById('gp-mechanics-content');
    if (!wrap) return;
    if (!window.gpRequireProject({ innerHTML:'' })) {
        wrap.innerHTML=`<div class="gp-empty-state">Proje seçin...</div>`; return;
    }

    wrap.innerHTML = `
    <div class="gp-split">
        <div class="gp-split-list">
            <div class="gp-split-list-hdr">
                <h2>⚙️ Mekanikler</h2>
                <button class="gp-btn-primary" onclick="window.gpMechNew()" style="padding:6px 12px;font-size:12px;">➕</button>
            </div>
            <div class="gp-split-search">
                <input placeholder="Mekanik ara..." oninput="gpMechFilter(this.value)">
            </div>
            <div style="padding:8px 12px;border-bottom:1px solid #2d2f45;display:flex;gap:4px;flex-wrap:wrap;">
                <button class="gp-cat-btn active" id="gpmt-all" onclick="gpMechSetFilter('',this)">Tümü</button>
                ${GP_MECH_TYPES.slice(0,5).map(t=>`<button class="gp-cat-btn" id="gpmt-${t}" onclick="gpMechSetFilter('${t}',this)" style="padding:4px 8px;font-size:11px;">${t}</button>`).join('')}
            </div>
            <div class="gp-split-list-items" id="gp-mech-list"></div>
        </div>
        <div class="gp-split-editor" id="gp-mech-editor">
            <div class="gp-split-editor-placeholder">
                <div style="font-size:48px;">⚙️</div>
                <div>Bir mekanik seç veya yeni oluştur</div>
            </div>
        </div>
    </div>`;

    gpMechRenderList('', '');
};

let gpMechTypeFilter = '', gpMechSearchStr = '';

function gpMechFilter(val) { gpMechSearchStr=val.toLowerCase(); gpMechRenderList(gpMechTypeFilter, gpMechSearchStr); }
function gpMechSetFilter(type, btn) {
    gpMechTypeFilter=type;
    document.querySelectorAll('.gp-split-list .gp-cat-btn').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    gpMechRenderList(gpMechTypeFilter, gpMechSearchStr);
}
window.gpMechSetFilter = gpMechSetFilter;

function gpMechRenderList(typeFilter, search) {
    const el = document.getElementById('gp-mech-list'); if(!el) return;
    const mechs = Object.values(window.gpActiveProject?.mechanics||{})
        .filter(m => (!typeFilter||m.type===typeFilter) && (!search||(m.name||'').toLowerCase().includes(search)))
        .sort((a,b)=>{
            const prioOrder = { 'Core Loop':0,'Sekonder':1,'Nice-to-have':2,'İptal Edildi':3 };
            return (prioOrder[a.priority]??2)-(prioOrder[b.priority]??2);
        });

    if (!mechs.length) { el.innerHTML=`<div style="padding:20px;text-align:center;color:#475569;font-size:13px;">Mekanik yok</div>`; return; }

    el.innerHTML = mechs.map(m=>{
        const pc = GP_MECH_PRIO_COLORS[m.priority]||'#64748b';
        return `<div class="gp-list-card ${gpMechSelected===m.id?'active':''}" onclick="gpMechSelect('${m.id}')">
            <div class="gp-list-card-thumb" style="background:${pc}22;font-size:14px;color:${pc};">${m.type?m.type[0]:'⚙'}</div>
            <div class="gp-list-card-info">
                <div class="gp-list-card-name">${gpEsc(m.name||'İsimsiz')}</div>
                <div class="gp-list-card-sub"><span style="color:${pc};">${m.priority||''}</span> · ${m.type||''}</div>
            </div>
        </div>`;
    }).join('');
}

function gpMechSelect(id) {
    gpMechSelected=id;
    const m=(window.gpActiveProject?.mechanics||{})[id];
    if(m) gpMechRenderEditor(m);
}
window.gpMechSelect = gpMechSelect;

function gpMechRenderEditor(m) {
    const ed=document.getElementById('gp-mech-editor'); if(!ed) return;
    const refs = m.referenceGames||[];
    const deps = m.dependsOn||[];
    const allMechs = Object.values(window.gpActiveProject?.mechanics||{}).filter(x=>x.id!==m.id);

    ed.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <div>
            <span class="gp-tag" style="background:${GP_MECH_PRIO_COLORS[m.priority]||'#64748b'}22;color:${GP_MECH_PRIO_COLORS[m.priority]||'#64748b'};border-color:${GP_MECH_PRIO_COLORS[m.priority]||'#64748b'}44;">${m.priority||'Öncelik yok'}</span>
            <span class="gp-tag gp-tag-info" style="margin-left:4px;">${m.type||'Tür yok'}</span>
        </div>
        <button class="gp-btn-danger" onclick="gpMechDelete('${m.id}')">🗑️ Sil</button>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">📋 Temel Bilgiler</div>
        <div class="gp-editor-section-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Mekanik Adı</label>
                <input type="text" value="${gpEsc(m.name||'')}" onchange="gpMechSave('${m.id}','name',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Tür</label>
                <select onchange="gpMechSave('${m.id}','type',this.value)">
                    ${GP_MECH_TYPES.map(t=>`<option value="${t}" ${m.type===t?'selected':''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="gp-form-group">
                <label>Öncelik</label>
                <select onchange="gpMechSave('${m.id}','priority',this.value)">
                    ${GP_MECH_PRIO.map(p=>`<option value="${p}" ${m.priority===p?'selected':''}>${p}</option>`).join('')}
                </select>
            </div>
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Kısa Açıklama</label>
                <input type="text" value="${gpEsc(m.description||'')}" placeholder="Bu mekanik ne yapar?" onchange="gpMechSave('${m.id}','description',this.value)">
            </div>
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">📝 Detaylı Açıklama</div>
        <div class="gp-editor-section-body">
            ${window.gpRichToolbarHTML('gp-mech-detail')}
            <div class="gp-richtext" id="gp-mech-detail" contenteditable="true"
                placeholder="Bu mekanik nasıl çalışır? Adım adım açıkla..."
                onblur="gpMechSave('${m.id}','details',this.innerHTML)">${m.details||''}</div>
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">
            🎮 Referans Oyunlar
            <button class="gp-btn-icon" style="font-size:12px;width:auto;padding:4px 10px;" onclick="gpMechAddRef('${m.id}')">+ Ekle</button>
        </div>
        <div class="gp-editor-section-body" id="gp-mech-refs">
            ${refs.length===0 ? `<div style="color:#475569;font-size:12px;">Henüz referans yok.</div>` :
                refs.map((r,i)=>`
                <div style="display:flex;gap:10px;align-items:center;padding:8px;background:#0f172a;border-radius:6px;margin-bottom:6px;">
                    <span style="font-size:13px;font-weight:600;color:#e2e8f0;flex:0 0 auto;">${gpEsc(r.name||'')}</span>
                    <span style="font-size:12px;color:#64748b;flex:1;">${gpEsc(r.diff||'')}</span>
                    <button style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="gpMechDeleteRef('${m.id}',${i})">×</button>
                </div>`).join('')}
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">
            🔗 Bağımlı Olduğu Mekanikler
            <button class="gp-btn-icon" style="font-size:12px;width:auto;padding:4px 10px;" onclick="gpMechAddDep('${m.id}')">+ Ekle</button>
        </div>
        <div class="gp-editor-section-body">
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${deps.map((depId,i)=>{
                    const dep=allMechs.find(x=>x.id===depId);
                    return `<div style="display:flex;align-items:center;gap:4px;">
                        <span class="gp-tag">${gpEsc(dep?.name||depId)}</span>
                        <button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:0;" onclick="gpMechDeleteDep('${m.id}',${i})">×</button>
                    </div>`;
                }).join('')}
                ${deps.length===0?`<span style="color:#475569;font-size:12px;">Bağımlılık yok.</span>`:''}
            </div>
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">🖼️ Diyagram / Görsel</div>
        <div class="gp-editor-section-body">
            ${m.imageBase64
                ? `<img src="${m.imageBase64}" style="max-width:100%;border-radius:8px;cursor:pointer;border:1px solid #2d2f45;" onclick="window.gpOpenLightbox('<img src=&quot;${m.imageBase64}&quot; style=&quot;max-width:85vw;&quot;>')">`
                : `<div style="color:#475569;font-size:12px;margin-bottom:8px;">Henüz görsel yok.</div>`
            }
            <input type="file" id="gp-mech-img-input" accept="image/*" style="display:none;" onchange="gpMechUploadImg(event,'${m.id}')">
            <button class="gp-btn-secondary" onclick="document.getElementById('gp-mech-img-input').click()" style="margin-top:8px;">🖼️ Görsel Yükle / Değiştir</button>
        </div>
    </div>`;
}

// ── Core Loop Canvas ────────────────────────────────────────────
// (Basit, küçük bir döngü görselleştirici — gelişmiş canvas modülü ileride eklenebilir)
window.gpRenderCoreLoop = function() {
    const container = document.getElementById('gp-coreloop-canvas-wrap');
    if (!container) return;
    const mechs = Object.values(window.gpActiveProject?.mechanics||{}).filter(m=>m.priority==='Core Loop');
    if (mechs.length===0) { container.innerHTML=`<div class="gp-empty-state">Henüz Core Loop mekaniği yok.<br><small>Mekanikler sekmesinde bir mekaniğin önceliğini "Core Loop" yap.</small></div>`; return; }
    const radius=120, cx=200, cy=200;
    const total=mechs.length;
    const svgItems = mechs.map((m,i)=>{
        const angle=(2*Math.PI/total)*i - Math.PI/2;
        const x=cx+radius*Math.cos(angle), y=cy+radius*Math.sin(angle);
        const pc=GP_MECH_PRIO_COLORS['Core Loop'];
        return `<circle cx="${x}" cy="${y}" r="40" fill="#1a1d2e" stroke="${pc}" stroke-width="2"/>
            <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="#e2e8f0" font-size="10" font-family="sans-serif">${gpEsc(m.name||'').slice(0,12)}</text>
            ${i>0?`<line x1="${cx+radius*Math.cos((2*Math.PI/total)*(i-1)-Math.PI/2)}" y1="${cy+radius*Math.sin((2*Math.PI/total)*(i-1)-Math.PI/2)}" x2="${x}" y2="${y}" stroke="${pc}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.5"/>`:''}`;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 400 400" style="max-width:400px;display:block;margin:0 auto;">
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#2d2f45" stroke-dasharray="6,4"/>
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="#a78bfa" font-size="13" font-weight="bold" font-family="sans-serif">CORE LOOP</text>
        ${svgItems}
    </svg>`;
};

// ── CRUD ────────────────────────────────────────────────────────
window.gpMechNew = function() {
    if(!window.gpActiveProjectId) return;
    const id=window.gpGenId('mech');
    const obj={id,name:'Yeni Mekanik',type:'Hareket',priority:'Sekonder',description:'',details:'',referenceGames:[],dependsOn:[],imageBase64:null};
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/mechanics/${id}`),obj)
        .then(()=>{gpMechSelected=id;});
};

function gpMechSave(id,field,value) {
    if(!window.gpActiveProjectId) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/mechanics/${id}/${field}`),value);
}
window.gpMechSave=gpMechSave;

window.gpMechDelete=function(id){
    if(!confirm('Bu mekaniği silmek istediğine emin misin?')) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/mechanics/${id}`),null);
    if(gpMechSelected===id){gpMechSelected=null;const ed=document.getElementById('gp-mech-editor');if(ed)ed.innerHTML=`<div class="gp-split-editor-placeholder"><div style="font-size:48px;">⚙️</div><div>Bir mekanik seç</div></div>`;}
};

window.gpMechUploadImg=function(event,id){const f=event.target.files[0];if(!f)return;window.fileToBase64(f).then(b64=>gpMechSave(id,'imageBase64',b64));};

window.gpMechAddRef=function(id){
    const name=prompt('Referans oyun adı:'); if(!name) return;
    const diff=prompt('Bizim farkımız / aldığımız şey:','');
    const refs=[...(window.gpActiveProject?.mechanics?.[id]?.referenceGames||[]),{name:name.trim(),diff:diff||''}];
    gpMechSave(id,'referenceGames',refs);
};
window.gpMechDeleteRef=function(id,i){const r=[...(window.gpActiveProject?.mechanics?.[id]?.referenceGames||[])];r.splice(i,1);gpMechSave(id,'referenceGames',r);};

window.gpMechAddDep=function(id){
    const all=Object.values(window.gpActiveProject?.mechanics||{}).filter(x=>x.id!==id);
    if(!all.length){alert('Başka mekanik yok.');return;}
    const opts=all.map((m,i)=>`${i}: ${m.name}`).join('\n');
    const idx=prompt(`Hangi mekanik?\n${opts}\n\nNumara gir:`);
    if(idx===null)return;
    const dep=all[parseInt(idx)];if(!dep)return;
    const deps=[...(window.gpActiveProject?.mechanics?.[id]?.dependsOn||[]),dep.id];
    gpMechSave(id,'dependsOn',deps);
};
window.gpMechDeleteDep=function(id,i){const d=[...(window.gpActiveProject?.mechanics?.[id]?.dependsOn||[])];d.splice(i,1);gpMechSave(id,'dependsOn',d);};
