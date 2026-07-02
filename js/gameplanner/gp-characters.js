// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — KARAKTERLER  (gp-characters.js)
// ════════════════════════════════════════════════════════════════

const GP_CHAR_ROLES = ['Protagonist','Antagonist','Yardımcı Kahraman','NPC','Boss','Rakip','Gizemli','Diğer'];
const GP_CHAR_ROLE_COLORS = {
    'Protagonist':'#10b981','Antagonist':'#ef4444','Yardımcı Kahraman':'#38bdf8',
    'NPC':'#94a3b8','Boss':'#f59e0b','Rakip':'#f97316','Gizemli':'#a78bfa','Diğer':'#64748b'
};
const GP_REL_TYPES = ['Müttefik','Düşman','Aile','Usta-Öğrenci','Rakip','Sevgili','Koruyucu','Gizli Bağ'];

let gpCharSelected = null;   // seçili karakter ID
let gpCharSearch   = '';

window.gpRenderCharacters = function() {
    const wrap = document.getElementById('gp-characters-content');
    if (!wrap) return;
    if (!window.gpRequireProject({ innerHTML: '' })) {
        wrap.innerHTML = `<div class="gp-empty-state">Proje seçin...</div>`; return;
    }

    const proj = window.gpActiveProject;
    const chars = proj.characters || {};

    wrap.innerHTML = `
    <div class="gp-split">
        <div class="gp-split-list">
            <div class="gp-split-list-hdr">
                <h2>👥 Karakterler</h2>
                <button class="gp-btn-primary" onclick="window.gpCharNew()" style="padding:6px 12px;font-size:12px;">➕</button>
            </div>
            <div class="gp-split-search">
                <input placeholder="Karakter ara..." oninput="gpCharFilter(this.value)">
            </div>
            <div class="gp-split-list-items" id="gp-char-list"></div>
        </div>
        <div class="gp-split-editor" id="gp-char-editor">
            <div class="gp-split-editor-placeholder">
                <div style="font-size:48px;">👤</div>
                <div>Bir karakter seç veya yeni oluştur</div>
            </div>
        </div>
    </div>`;

    gpCharRenderList(chars);
    if (gpCharSelected && chars[gpCharSelected]) gpCharRenderEditor(chars[gpCharSelected]);
};

function gpCharFilter(val) {
    gpCharSearch = val.toLowerCase();
    gpCharRenderList(window.gpActiveProject?.characters || {});
}

function gpCharRenderList(chars) {
    const el = document.getElementById('gp-char-list'); if (!el) return;
    const arr = Object.values(chars)
        .filter(c => !gpCharSearch || (c.name||'').toLowerCase().includes(gpCharSearch))
        .sort((a,b) => (a.name||'').localeCompare(b.name||''));

    if (arr.length === 0) {
        el.innerHTML = `<div style="padding:20px;text-align:center;color:#475569;font-size:13px;">Karakter yok</div>`; return;
    }

    el.innerHTML = arr.map(c => {
        const roleColor = GP_CHAR_ROLE_COLORS[c.role] || '#64748b';
        const thumb = c.imageBase64
            ? `<div class="gp-list-card-thumb"><img src="${c.imageBase64}"></div>`
            : `<div class="gp-list-card-thumb" style="background:${roleColor}22;">${(c.name||'?')[0].toUpperCase()}</div>`;
        return `<div class="gp-list-card ${gpCharSelected===c.id?'active':''}" onclick="gpCharSelect('${c.id}')">
            ${thumb}
            <div class="gp-list-card-info">
                <div class="gp-list-card-name">${gpEsc(c.name||'İsimsiz')}</div>
                <div class="gp-list-card-sub" style="color:${roleColor};">${c.role||'Rol yok'}</div>
            </div>
        </div>`;
    }).join('');
}

function gpCharSelect(id) {
    gpCharSelected = id;
    const c = (window.gpActiveProject?.characters||{})[id];
    if (c) gpCharRenderEditor(c);
    // Listeyi aktif olarak işaretle
    document.querySelectorAll('#gp-char-list .gp-list-card').forEach(el=>el.classList.remove('active'));
    document.querySelectorAll(`#gp-char-list .gp-list-card`).forEach(el=>{
        if (el.onclick.toString().includes(id)) el.classList.add('active');
    });
}

function gpCharRenderEditor(c) {
    const editor = document.getElementById('gp-char-editor'); if (!editor) return;
    const relations = c.relations || [];
    const chars = window.gpActiveProject?.characters || {};
    const abilities = c.abilities || [];

    editor.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
        <div style="display:flex;gap:14px;align-items:center;">
            <div id="gp-char-img-wrap" onclick="document.getElementById('gp-char-img-input').click()" style="width:72px;height:72px;border-radius:12px;background:${GP_CHAR_ROLE_COLORS[c.role]||'#1e293b'}22;border:2px dashed ${GP_CHAR_ROLE_COLORS[c.role]||'#334155'};display:flex;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;flex-shrink:0;">
                ${c.imageBase64 ? `<img src="${c.imageBase64}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="font-size:28px;color:#475569;">🖼️</div>`}
            </div>
            <input type="file" id="gp-char-img-input" accept="image/*" style="display:none;" onchange="gpCharUploadImage(event,'${c.id}')">
            <div>
                <div style="font-size:11px;color:${GP_CHAR_ROLE_COLORS[c.role]||'#64748b'};font-weight:700;text-transform:uppercase;">${c.role||''}</div>
                <h2 style="margin:4px 0 0;color:#e2e8f0;font-size:20px;">${gpEsc(c.name||'İsimsiz')}</h2>
            </div>
        </div>
        <div style="display:flex;gap:8px;">
            <button class="gp-btn-icon" title="Büyük görsel" onclick="c=window.gpActiveProject?.characters?.['${c.id}'];if(c?.imageBase64)window.gpOpenLightbox('<img src=&quot;'+c.imageBase64+'&quot;>')">🔍</button>
            <button class="gp-btn-danger" onclick="gpCharDelete('${c.id}')">🗑️ Sil</button>
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">📋 Temel Bilgiler</div>
        <div class="gp-editor-section-body" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Karakter Adı</label>
                <input type="text" value="${gpEsc(c.name||'')}" onchange="gpCharSaveField('${c.id}','name',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Rol</label>
                <select onchange="gpCharSaveField('${c.id}','role',this.value)">
                    ${GP_CHAR_ROLES.map(r=>`<option value="${r}" ${c.role===r?'selected':''}>${r}</option>`).join('')}
                </select>
            </div>
            <div class="gp-form-group">
                <label>Yaş / Tür</label>
                <input type="text" value="${gpEsc(c.ageType||'')}" placeholder="Örn: 28 / İnsan" onchange="gpCharSaveField('${c.id}','ageType',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Köken / Geçmiş</label>
                <input type="text" value="${gpEsc(c.origin||'')}" placeholder="Nereden geliyor?" onchange="gpCharSaveField('${c.id}','origin',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Ses Tonu / Kişilik</label>
                <input type="text" value="${gpEsc(c.voiceTone||'')}" placeholder="Örn: Soğuk, hesapçı, zeki" onchange="gpCharSaveField('${c.id}','voiceTone',this.value)">
            </div>
            <div class="gp-form-group" style="grid-column:1/-1;">
                <label>Gameplay Rolü (Ne iş yapar?)</label>
                <input type="text" value="${gpEsc(c.gameplayRole||'')}" placeholder="Örn: Oyuncuyu güçlendiren buff karakteri" onchange="gpCharSaveField('${c.id}','gameplayRole',this.value)">
            </div>
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">📖 Backstory</div>
        <div class="gp-editor-section-body">
            ${window.gpRichToolbarHTML('gp-char-backstory')}
            <div class="gp-richtext" id="gp-char-backstory" contenteditable="true"
                placeholder="Karakterin geçmişi, motivasyonu, önemli anları..."
                onblur="gpCharSaveField('${c.id}','backstory',this.innerHTML)">${c.backstory||''}</div>
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">
            ⚡ Yetenekler & Özellikler
            <button class="gp-btn-icon" style="font-size:12px;width:auto;padding:4px 10px;" onclick="gpCharAddAbility('${c.id}')">+ Ekle</button>
        </div>
        <div class="gp-editor-section-body">
            <div id="gp-char-abilities" style="display:flex;flex-wrap:wrap;gap:8px;">
                ${abilities.map((ab,i)=>`
                <div style="display:flex;align-items:center;gap:4px;">
                    <span class="gp-tag">${gpEsc(ab)}</span>
                    <button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:0;" onclick="gpCharDeleteAbility('${c.id}',${i})">×</button>
                </div>`).join('')}
                ${abilities.length===0?`<span style="color:#475569;font-size:12px;">Henüz yetenek yok. + Ekle butonuna bas.</span>`:''}
            </div>
        </div>
    </div>

    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">
            🔗 Karakter İlişkileri
            <button class="gp-btn-icon" style="font-size:12px;width:auto;padding:4px 10px;" onclick="gpCharAddRelation('${c.id}')">+ Ekle</button>
        </div>
        <div class="gp-editor-section-body">
            ${relations.length===0
                ? `<div style="color:#475569;font-size:12px;">Henüz ilişki tanımlanmamış.</div>`
                : relations.map((rel,i)=>{
                    const other = Object.values(chars).find(x=>x.id===rel.charId);
                    return `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:#0f172a;border-radius:6px;margin-bottom:6px;">
                        <span class="gp-tag gp-tag-info">${rel.type||'Bağlantı'}</span>
                        <span style="color:#e2e8f0;font-size:13px;">→ <strong>${gpEsc(other?.name||rel.charId||'?')}</strong></span>
                        <span style="color:#64748b;font-size:12px;flex:1;">${gpEsc(rel.note||'')}</span>
                        <button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;" onclick="gpCharDeleteRelation('${c.id}',${i})">×</button>
                    </div>`;
                }).join('')
            }
        </div>
    </div>`;
}

// ── CRUD fonksiyonları ──────────────────────────────────────────
window.gpCharNew = function() {
    if (!window.gpActiveProjectId) return;
    const id = window.gpGenId('char');
    const newChar = { id, name:'Yeni Karakter', role:'NPC', ageType:'', origin:'', voiceTone:'', gameplayRole:'', backstory:'', abilities:[], relations:[], imageBase64:null };
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/characters/${id}`), newChar)
        .then(()=>{ gpCharSelected=id; });
};

function gpCharSaveField(id, field, value) {
    if (!window.gpActiveProjectId) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/characters/${id}/${field}`), value);
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/meta/updatedAt`), Date.now());
}
window.gpCharSaveField = gpCharSaveField;

window.gpCharDelete = function(id) {
    if (!confirm('Bu karakteri silmek istediğine emin misin?')) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/characters/${id}`), null);
    if (gpCharSelected===id) { gpCharSelected=null; const ed=document.getElementById('gp-char-editor'); if(ed) ed.innerHTML=`<div class="gp-split-editor-placeholder"><div style="font-size:48px;">👤</div><div>Bir karakter seç</div></div>`; }
};

window.gpCharUploadImage = function(event, id) {
    const file = event.target.files[0]; if (!file) return;
    window.fileToBase64(file).then(b64=>{ gpCharSaveField(id,'imageBase64',b64); });
};

window.gpCharAddAbility = function(id) {
    const val = prompt('Yetenek / Özellik adı:'); if (!val) return;
    const chars = window.gpActiveProject?.characters||{};
    const abilities = [...(chars[id]?.abilities||[]), val.trim()];
    gpCharSaveField(id,'abilities',abilities);
};
window.gpCharDeleteAbility = function(id, idx) {
    const abilities = [...(window.gpActiveProject?.characters?.[id]?.abilities||[])];
    abilities.splice(idx,1); gpCharSaveField(id,'abilities',abilities);
};

window.gpCharAddRelation = function(id) {
    const chars = window.gpActiveProject?.characters||{};
    const others = Object.values(chars).filter(c=>c.id!==id);
    if (others.length===0) { alert('İlişki kurmak için başka karakter yok.'); return; }
    const options = others.map((c,i)=>`${i}: ${c.name}`).join('\n');
    const idxStr = prompt(`Hangi karakterle?\n${options}\n\nNumara gir:`);
    if (idxStr===null) return;
    const other = others[parseInt(idxStr)]; if (!other) return;
    const type = prompt(`İlişki türü:\n${GP_REL_TYPES.join(', ')}`)||'Bağlantı';
    const note = prompt('Kısa not (opsiyonel):')||'';
    const relations = [...(chars[id]?.relations||[]), { charId:other.id, type, note }];
    gpCharSaveField(id,'relations',relations);
};
window.gpCharDeleteRelation = function(id, idx) {
    const relations = [...(window.gpActiveProject?.characters?.[id]?.relations||[])];
    relations.splice(idx,1); gpCharSaveField(id,'relations',relations);
};
