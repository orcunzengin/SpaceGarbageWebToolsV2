// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — DÜNYA & SEVİYELER  (gp-world.js)
// ════════════════════════════════════════════════════════════════

const GP_LOC_TYPES = ['Hub Bölgesi','Zindan','Açık Alan','Şehir','Boss Odası','Gizli Alan','Tesis','Köy','Diğer'];
let gpWorldSelectedLoc = null;
let gpWorldTab = 'map'; // 'map' | 'locations' | 'levels'
let gpWorldPinMode = false;

window.gpRenderWorld = function() {
    const wrap = document.getElementById('gp-world-content');
    if (!wrap) return;
    if (!window.gpRequireProject(wrap)) return;

    wrap.innerHTML = `
    <div class="gp-page-hdr">
        <div><h1 class="gp-title">🗺️ Dünya & Seviyeler</h1></div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:18px;border-bottom:1px solid #2d2f45;padding-bottom:0;">
        <button class="gp-cat-btn ${gpWorldTab==='map'?'active':''}" onclick="gpWorldSetTab('map')" style="border-radius:6px 6px 0 0;">🗺️ Harita</button>
        <button class="gp-cat-btn ${gpWorldTab==='locations'?'active':''}" onclick="gpWorldSetTab('locations')" style="border-radius:6px 6px 0 0;">📍 Lokasyonlar</button>
        <button class="gp-cat-btn ${gpWorldTab==='levels'?'active':''}" onclick="gpWorldSetTab('levels')" style="border-radius:6px 6px 0 0;">🎮 Seviye Notları</button>
    </div>
    <div id="gp-world-body"></div>`;

    gpWorldRenderTab();
};

window.gpWorldSetTab = function(tab) {
    gpWorldTab = tab;
    document.querySelectorAll('#gp-world-content .gp-cat-btn').forEach((btn,i)=>{
        btn.classList.toggle('active',['map','locations','levels'][i]===tab);
    });
    gpWorldRenderTab();
};

function gpWorldRenderTab() {
    const body = document.getElementById('gp-world-body'); if(!body) return;
    if (gpWorldTab==='map')       gpWorldRenderMap(body);
    if (gpWorldTab==='locations') gpWorldRenderLocations(body);
    if (gpWorldTab==='levels')    gpWorldRenderLevels(body);
}

// ── HARİTA ─────────────────────────────────────────────────────
function gpWorldRenderMap(body) {
    const world = window.gpActiveProject?.world || {};
    const locs  = Object.values(world.locations||{});

    body.innerHTML = `
    <div style="display:flex;gap:20px;flex-wrap:wrap;">
        <div style="flex:1;min-width:300px;">
            <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
                ${world.mapBase64
                    ? `<button class="gp-btn-secondary" onclick="document.getElementById('gp-world-map-input').click()">🖼️ Haritayı Değiştir</button>
                       <button class="gp-btn-secondary" id="gp-pin-toggle" onclick="gpWorldTogglePinMode()" style="${gpWorldPinMode?'border-color:#a78bfa;color:#a78bfa;':''}">📍 ${gpWorldPinMode?'Pin Ekle (Haritaya Tıkla)':'Pin Modunu Aç'}</button>
                       <button class="gp-btn-danger" onclick="gpWorldDeleteMap()">🗑️ Haritayı Kaldır</button>`
                    : `<button class="gp-btn-primary" onclick="document.getElementById('gp-world-map-input').click()">🗺️ Harita Yükle</button>`
                }
                <input type="file" id="gp-world-map-input" accept="image/*" style="display:none;" onchange="gpWorldUploadMap(event)">
            </div>

            ${world.mapBase64
                ? `<div class="gp-map-container" id="gp-map-wrap" style="cursor:${gpWorldPinMode?'crosshair':'default'}" onclick="gpWorldHandleMapClick(event)">
                    <img src="${world.mapBase64}" id="gp-map-img" style="max-width:100%;display:block;">
                    ${locs.filter(l=>l.pinX!=null).map(l=>`
                    <div class="gp-map-pin" style="left:${l.pinX}%;top:${l.pinY}%;" onclick="event.stopPropagation();gpWorldSelectLoc('${l.id}')" title="${gpEsc(l.name||'')}">
                        <div class="gp-map-pin-inner">📍</div>
                    </div>`).join('')}
                   </div>`
                : `<div style="background:#1a1d2e;border:2px dashed #2d2f45;border-radius:12px;height:300px;display:flex;align-items:center;justify-content:center;color:#475569;flex-direction:column;gap:8px;">
                    <div style="font-size:48px;">🗺️</div>
                    <div>Harita görseli yükle</div>
                   </div>`
            }
        </div>
        <div style="flex:0 0 260px;" id="gp-world-loc-mini">
            <h3 style="color:#e2e8f0;margin:0 0 10px;font-size:14px;">Lokasyonlar</h3>
            ${locs.length===0
                ? `<div style="color:#475569;font-size:12px;">Henüz lokasyon yok.<br>Lokasyonlar sekmesinden ekle.</div>`
                : locs.map(l=>`<div class="gp-list-card" onclick="gpWorldSelectLoc('${l.id}')" style="margin-bottom:4px;">
                    <div class="gp-list-card-thumb" style="background:#a78bfa22;font-size:14px;">📍</div>
                    <div class="gp-list-card-info">
                        <div class="gp-list-card-name">${gpEsc(l.name||'İsimsiz')}</div>
                        <div class="gp-list-card-sub">${l.type||''} ${l.pinX!=null?'· Haritada':'· Haritada değil'}</div>
                    </div>
                   </div>`).join('')
            }
        </div>
    </div>

    <div id="gp-world-loc-detail" style="margin-top:16px;"></div>`;

    if (gpWorldSelectedLoc) gpWorldRenderLocDetail(gpWorldSelectedLoc);
}

window.gpWorldTogglePinMode = function() {
    gpWorldPinMode = !gpWorldPinMode;
    gpWorldRenderMap(document.getElementById('gp-world-body'));
};

window.gpWorldHandleMapClick = function(e) {
    if (!gpWorldPinMode) return;
    if (!gpWorldSelectedLoc) { alert('Önce bir lokasyon seç.'); return; }
    const wrap = document.getElementById('gp-map-wrap');
    const rect = wrap.getBoundingClientRect();
    const px = ((e.clientX-rect.left)/rect.width*100).toFixed(2);
    const py = ((e.clientY-rect.top)/rect.height*100).toFixed(2);
    gpWorldLocSave(gpWorldSelectedLoc,'pinX',parseFloat(px));
    gpWorldLocSave(gpWorldSelectedLoc,'pinY',parseFloat(py));
    gpWorldPinMode=false;
};

// ── LOKASYONLAR ────────────────────────────────────────────────
function gpWorldRenderLocations(body) {
    const locs = Object.values(window.gpActiveProject?.world?.locations||{});
    body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin:0;color:#e2e8f0;">Lokasyonlar (${locs.length})</h3>
        <button class="gp-btn-primary" onclick="gpWorldNewLoc()">➕ Yeni Lokasyon</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;" id="gp-locs-grid">
        ${locs.length===0?`<div style="color:#475569;grid-column:1/-1;text-align:center;padding:40px;">Henüz lokasyon yok.</div>`:
            locs.map(l=>`
            <div class="gp-editor-section" style="cursor:pointer;" onclick="gpWorldSelectLoc('${l.id}');gpWorldSetTab('map')">
                ${l.imageBase64?`<img src="${l.imageBase64}" style="width:100%;height:120px;object-fit:cover;border-radius:8px 8px 0 0;">`:
                    `<div style="width:100%;height:80px;background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:32px;">🏔️</div>`}
                <div class="gp-editor-section-body" style="padding:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                        <span class="gp-tag">${l.type||'Tür yok'}</span>
                        <button class="gp-btn-danger" onclick="event.stopPropagation();gpWorldDeleteLoc('${l.id}')" style="padding:3px 8px;font-size:11px;">Sil</button>
                    </div>
                    <div style="font-weight:700;color:#e2e8f0;font-size:15px;margin-bottom:4px;">${gpEsc(l.name||'İsimsiz')}</div>
                    <div style="font-size:12px;color:#64748b;">${gpEsc((l.atmosphere||'').slice(0,80))}</div>
                </div>
            </div>`).join('')
        }
    </div>`;
}

function gpWorldSelectLoc(id) {
    gpWorldSelectedLoc=id;
    if(gpWorldTab==='map') gpWorldRenderLocDetail(id);
}
window.gpWorldSelectLoc=gpWorldSelectLoc;

function gpWorldRenderLocDetail(id) {
    const detail=document.getElementById('gp-world-loc-detail'); if(!detail) return;
    const l=(window.gpActiveProject?.world?.locations||{})[id]; if(!l) return;
    detail.innerHTML=`
    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">📍 ${gpEsc(l.name||'İsimsiz')} — Detaylar
            <button class="gp-btn-danger" onclick="gpWorldDeleteLoc('${id}')" style="font-size:11px;padding:4px 8px;">Sil</button>
        </div>
        <div class="gp-editor-section-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Lokasyon Adı</label>
                <input type="text" value="${gpEsc(l.name||'')}" onchange="gpWorldLocSave('${id}','name',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Tür</label>
                <select onchange="gpWorldLocSave('${id}','type',this.value)">
                    ${GP_LOC_TYPES.map(t=>`<option value="${t}" ${l.type===t?'selected':''}>${t}</option>`).join('')}
                </select>
            </div>
            <div class="gp-form-group">
                <label>Atmosfer Notları</label>
                <input type="text" value="${gpEsc(l.atmosphere||'')}" placeholder="Örn: Karanlık, sisli, ıssız" onchange="gpWorldLocSave('${id}','atmosphere',this.value)">
            </div>
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Gameplay Notu (Hangi mekanikler aktif?)</label>
                <input type="text" value="${gpEsc(l.gameplayNote||'')}" placeholder="Örn: Platform mekaniği, gizlilik gerektiriyor" onchange="gpWorldLocSave('${id}','gameplayNote',this.value)">
            </div>
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Görsel</label>
                ${l.imageBase64?`<img src="${l.imageBase64}" style="max-width:100%;border-radius:6px;margin-bottom:6px;cursor:pointer;" onclick="window.gpOpenLightbox('<img src=&quot;${l.imageBase64}&quot; style=&quot;max-width:85vw;&quot;>')">`:``}
                <input type="file" id="gp-loc-img-${id}" accept="image/*" style="display:none;" onchange="gpWorldLocUploadImg(event,'${id}')">
                <button class="gp-btn-secondary" onclick="document.getElementById('gp-loc-img-${id}').click()">🖼️ Görsel Yükle</button>
            </div>
        </div>
    </div>`;
}

// ── SEVİYE NOTLARI ─────────────────────────────────────────────
function gpWorldRenderLevels(body) {
    const levels = Object.values(window.gpActiveProject?.world?.levels||{}).sort((a,b)=>(a.order||0)-(b.order||0));
    body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin:0;color:#e2e8f0;">Seviye Tasarım Notları</h3>
        <button class="gp-btn-primary" onclick="gpWorldNewLevel()">➕ Seviye</button>
    </div>
    ${levels.map(lv=>`
    <div class="gp-editor-section" style="margin-bottom:12px;">
        <div class="gp-editor-section-hdr">
            <span>Seviye ${lv.order||'?'}: ${gpEsc(lv.name||'İsimsiz')}</span>
            <button class="gp-btn-danger" onclick="gpWorldDeleteLevel('${lv.id}')" style="font-size:11px;padding:4px 8px;">Sil</button>
        </div>
        <div class="gp-editor-section-body" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
            <div class="gp-form-group">
                <label>Sıra</label>
                <input type="number" value="${lv.order||1}" onchange="gpWorldLevelSave('${lv.id}','order',parseInt(this.value))">
            </div>
            <div class="gp-form-group" style="grid-column:2/-1;">
                <label>Seviye Adı</label>
                <input type="text" value="${gpEsc(lv.name||'')}" onchange="gpWorldLevelSave('${lv.id}','name',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Zorluk (1-10)</label>
                <input type="number" min="1" max="10" value="${lv.difficulty||5}" onchange="gpWorldLevelSave('${lv.id}','difficulty',parseInt(this.value))">
            </div>
            <div class="gp-form-group">
                <label>Hedef</label>
                <input type="text" value="${gpEsc(lv.goal||'')}" placeholder="Bu seviyenin amacı" onchange="gpWorldLevelSave('${lv.id}','goal',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Öğrettiği Mekanik</label>
                <input type="text" value="${gpEsc(lv.teachMechanic||'')}" placeholder="Hangi mekaniği tanıtıyor?" onchange="gpWorldLevelSave('${lv.id}','teachMechanic',this.value)">
            </div>
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Notlar</label>
                <div class="gp-richtext" contenteditable="true" placeholder="Seviye tasarım detayları..." onblur="gpWorldLevelSave('${lv.id}','notes',this.innerHTML)">${lv.notes||''}</div>
            </div>
        </div>
    </div>`).join('')}
    ${levels.length===0?`<div style="color:#475569;text-align:center;padding:40px;">Henüz seviye notu yok.</div>`:''}`;
}

// ── CRUD ────────────────────────────────────────────────────────
window.gpWorldUploadMap=function(e){const f=e.target.files[0];if(!f)return;window.fileToBase64(f).then(b64=>{window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/mapBase64`),b64);});};
window.gpWorldDeleteMap=function(){if(!confirm('Haritayı kaldır?'))return;window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/mapBase64`),null);};

window.gpWorldNewLoc=function(){const id=window.gpGenId('loc');window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/locations/${id}`),{id,name:'Yeni Lokasyon',type:'Diğer',atmosphere:'',gameplayNote:'',imageBase64:null,pinX:null,pinY:null});};
function gpWorldLocSave(id,f,v){window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/locations/${id}/${f}`),v);}
window.gpWorldLocSave=gpWorldLocSave;
window.gpWorldDeleteLoc=function(id){if(!confirm('Lokasyonu sil?'))return;window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/locations/${id}`),null);if(gpWorldSelectedLoc===id)gpWorldSelectedLoc=null;};
window.gpWorldLocUploadImg=function(e,id){const f=e.target.files[0];if(!f)return;window.fileToBase64(f).then(b64=>gpWorldLocSave(id,'imageBase64',b64));};

window.gpWorldNewLevel=function(){const id=window.gpGenId('lv');const exist=Object.values(window.gpActiveProject?.world?.levels||{});const maxOrd=exist.length?Math.max(...exist.map(l=>l.order||0)):0;window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/levels/${id}`),{id,name:'Yeni Seviye',order:maxOrd+1,difficulty:5,goal:'',teachMechanic:'',notes:''});};
function gpWorldLevelSave(id,f,v){window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/levels/${id}/${f}`),v);}
window.gpWorldLevelSave=gpWorldLevelSave;
window.gpWorldDeleteLevel=function(id){window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/world/levels/${id}`),null);};
