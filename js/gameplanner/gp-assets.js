// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — ASSET GALERİSİ  (gp-assets.js)
// ════════════════════════════════════════════════════════════════

const GP_ASSET_CATS = ['Tümü','Karakter Sanatı','Çevre & Prop','UI & İkonlar','Efekt & VFX','Ses','Animasyon','Referans & Mood','3D Model','Diğer'];
const GP_ASSET_CAT_ICONS = { 'Tümü':'🎨','Karakter Sanatı':'👤','Çevre & Prop':'🏔️','UI & İkonlar':'🎯','Efekt & VFX':'✨','Ses':'🎵','Animasyon':'🎞️','Referans & Mood':'🖼️','3D Model':'🧊','Diğer':'📁' };

let gpAssetActiveCat = 'Tümü';
let gpAssetSearch    = '';
let gpAssetViewMode  = 'grid'; // 'grid' | 'list'

window.gpRenderAssets = function() {
    const wrap = document.getElementById('gp-assets-content');
    if (!wrap) return;
    if (!window.gpRequireProject({ innerHTML:'' })) {
        wrap.innerHTML=`<div class="gp-empty-state">Proje seçin...</div>`; return;
    }

    wrap.innerHTML = `
    <div class="gp-asset-layout">
        <div class="gp-asset-sidebar">
            <h3>Kategoriler</h3>
            ${GP_ASSET_CATS.map(cat=>`
            <button class="gp-cat-btn ${gpAssetActiveCat===cat?'active':''}" onclick="gpAssetSetCat('${cat}')">
                ${GP_ASSET_CAT_ICONS[cat]||'📁'} ${cat}
            </button>`).join('')}
            <div style="padding:12px;margin-top:auto;">
                <input type="file" id="gp-asset-upload" multiple accept="image/*,video/*,audio/*,.glb,.gltf,.obj,.json" style="display:none;" onchange="gpAssetUpload(event)">
                <button class="gp-btn-primary" onclick="document.getElementById('gp-asset-upload').click()" style="width:100%;font-size:12px;">📤 Yükle</button>
            </div>
        </div>
        <div class="gp-asset-main">
            <div class="gp-asset-toolbar">
                <input placeholder="Asset ara..." style="flex:1;background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:7px 12px;border-radius:6px;font-size:13px;" oninput="gpAssetSetSearch(this.value)">
                <button class="gp-btn-icon" onclick="gpAssetSetView('grid')" title="Izgara" style="${gpAssetViewMode==='grid'?'background:#334155;':''}" >⊞</button>
                <button class="gp-btn-icon" onclick="gpAssetSetView('list')" title="Liste"  style="${gpAssetViewMode==='list'?'background:#334155;':''}" >☰</button>
                <span style="color:#64748b;font-size:12px;" id="gp-asset-count"></span>
            </div>
            <div class="${gpAssetViewMode==='grid'?'gp-asset-grid':'gp-asset-list-view'}" id="gp-asset-grid"></div>
        </div>
    </div>`;

    gpAssetRenderGrid();
};

window.gpAssetSetCat  = function(cat)  { gpAssetActiveCat=cat;  window.gpRenderAssets(); };
window.gpAssetSetSearch=function(val)  { gpAssetSearch=val.toLowerCase(); gpAssetRenderGrid(); };
window.gpAssetSetView  = function(mode){ gpAssetViewMode=mode; window.gpRenderAssets(); };

function gpAssetRenderGrid() {
    const grid  = document.getElementById('gp-asset-grid'); if (!grid) return;
    const count = document.getElementById('gp-asset-count');
    const assets= Object.values(window.gpActiveProject?.assets||{})
        .filter(a=>
            (gpAssetActiveCat==='Tümü'||a.category===gpAssetActiveCat) &&
            (!gpAssetSearch||(a.name||'').toLowerCase().includes(gpAssetSearch))
        )
        .sort((a,b)=>(b.uploadedAt||0)-(a.uploadedAt||0));

    if (count) count.textContent = `${assets.length} asset`;

    if (assets.length===0) {
        grid.innerHTML=`<div class="gp-empty-state" style="grid-column:1/-1;">Henüz asset yok.<br><small>📤 Yükle butonuyla dosya ekle.</small></div>`;
        return;
    }

    if (gpAssetViewMode==='grid') {
        grid.innerHTML = assets.map(a=>gpAssetCardHTML(a)).join('');
    } else {
        grid.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="color:#64748b;text-align:left;border-bottom:1px solid #2d2f45;">
                <th style="padding:8px;">Dosya</th><th>Kategori</th><th>Tür</th><th>Tarih</th><th></th>
            </tr></thead><tbody>
            ${assets.map(a=>`
            <tr style="border-bottom:1px solid #1a1d2e;cursor:pointer;" onclick="gpAssetPreview('${a.id}')">
                <td style="padding:8px;display:flex;align-items:center;gap:8px;">
                    <span style="font-size:18px;">${window.gpFileTypeIcon(a.name,'')}</span>
                    <span style="color:#e2e8f0;">${gpEsc(a.name||'')}</span>
                </td>
                <td style="color:#a78bfa;">${gpEsc(a.category||'')}</td>
                <td style="color:#64748b;">${gpAssetType(a)}</td>
                <td style="color:#64748b;">${window.gpFormatDate(a.uploadedAt)}</td>
                <td><button class="gp-btn-danger" onclick="event.stopPropagation();gpAssetDelete('${a.id}')" style="padding:3px 8px;font-size:11px;">Sil</button></td>
            </tr>`).join('')}
            </tbody>
        </table>`;
    }
}

function gpAssetCardHTML(a) {
    const type = gpAssetType(a);
    let thumb = '';
    if (['image','gif'].includes(type) && a.dataUrl) {
        thumb = `<img class="gp-asset-thumb" src="${a.dataUrl}" loading="lazy">`;
    } else {
        const icons = { '3d':'🧊','video':'🎬','audio':'🎵','json':'🗂️','sprite':'🎞️' };
        thumb = `<div class="gp-asset-thumb-placeholder">${icons[type]||'📄'}</div>`;
    }
    return `
    <div class="gp-asset-card" onclick="gpAssetPreview('${a.id}')">
        ${thumb}
        <div class="gp-asset-info">
            <div class="gp-asset-name">${gpEsc(a.name||'')}</div>
            <div class="gp-asset-type">${gpEsc(a.category||'')} · ${type.toUpperCase()}</div>
        </div>
        <button class="gp-asset-del" onclick="event.stopPropagation();gpAssetDelete('${a.id}')">✕</button>
    </div>`;
}

function gpAssetType(a) {
    const ext = (a.name||'').split('.').pop().toLowerCase();
    if (['glb','gltf','obj','fbx'].includes(ext)) return '3d';
    if (['mp4','webm','mov'].includes(ext)) return 'video';
    if (['mp3','wav','ogg'].includes(ext)) return 'audio';
    if (ext === 'json') return 'json';
    if (ext === 'gif') return 'gif';
    if (['png','jpg','jpeg','webp','svg'].includes(ext)) return 'image';
    return 'file';
}

// ── ÖNIZLEME / LİGHTBOX ──────────────────────────────────────
window.gpAssetPreview = function(id) {
    const a = (window.gpActiveProject?.assets||{})[id]; if (!a) return;
    const type = gpAssetType(a);
    let body = '';
    let meta = `<strong>${gpEsc(a.name)}</strong> · ${gpEsc(a.category||'')}`;

    if (a.notes) meta += `<br><span style="color:#64748b;">${gpEsc(a.notes)}</span>`;

    if (type==='image' && a.dataUrl) {
        body = `<img src="${a.dataUrl}" style="max-width:85vw;max-height:75vh;border-radius:8px;object-fit:contain;">`;
    } else if (type==='gif' && a.dataUrl) {
        body = `<img src="${a.dataUrl}" style="max-width:85vw;max-height:75vh;border-radius:8px;">`;
    } else if (type==='video' && a.dataUrl) {
        body = `<video src="${a.dataUrl}" controls style="max-width:85vw;max-height:75vh;border-radius:8px;"></video>`;
    } else if (type==='audio' && a.dataUrl) {
        body = `<div style="padding:20px;text-align:center;"><div style="font-size:64px;margin-bottom:16px;">🎵</div><audio src="${a.dataUrl}" controls style="width:100%;max-width:400px;"></audio></div>`;
    } else if (type==='3d') {
        body = `<div style="padding:40px;text-align:center;color:#94a3b8;"><div style="font-size:80px;">🧊</div><p>3D önizleme için dosyayı indirip görüntüleyici kullanın.</p></div>`;
    } else {
        body = `<div style="padding:40px;text-align:center;color:#94a3b8;"><div style="font-size:80px;">${window.gpFileTypeIcon(a.name,'')}</div><p>${gpEsc(a.name)}</p></div>`;
    }

    // Not düzenleme alanı ekle
    const noteForm = `
    <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
        <input id="gp-asset-note-input" value="${gpEsc(a.notes||'')}" placeholder="Asset notu..."
            style="flex:1;background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:7px 12px;border-radius:6px;font-size:13px;">
        <button class="gp-btn-secondary" onclick="gpAssetSaveNote('${id}',document.getElementById('gp-asset-note-input').value)">Kaydet</button>
        <button class="gp-btn-danger" onclick="gpAssetDelete('${id}');window.gpCloseLightbox()">🗑️ Sil</button>
    </div>`;

    window.gpOpenLightbox(body, meta + noteForm);
};

window.gpAssetSaveNote = function(id, note) {
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/assets/${id}/notes`),note);
};

// ── YÜKLEME ───────────────────────────────────────────────────
window.gpAssetUpload = async function(event) {
    const files = event.target.files; if(!files.length) return;
    const catPrompt = prompt(
        `Kategori seç:\n${GP_ASSET_CATS.slice(1).map((c,i)=>`${i+1}: ${c}`).join('\n')}\n\nNumara gir (boş = ${gpAssetActiveCat==='Tümü'?'Diğer':gpAssetActiveCat}):`,
        ''
    );
    let cat = gpAssetActiveCat==='Tümü'?'Diğer':gpAssetActiveCat;
    if (catPrompt) { const idx=parseInt(catPrompt)-1; if (GP_ASSET_CATS[idx+1]) cat=GP_ASSET_CATS[idx+1]; }

    let uploaded=0;
    for (const file of Array.from(files)) {
        const id = window.gpGenId('asset');
        const ext = file.name.split('.').pop().toLowerCase();
        // Büyük dosyalar (>2MB) için Firebase Storage kullan, küçükler için base64
        const MAX_B64 = 2*1024*1024;
        let dataUrl = null;
        if (file.size <= MAX_B64) {
            dataUrl = await window.fileToBase64(file);
        } else if (window.spaceGarbageStorage && window.uploadBytesFn && window.storageRefFn && window.getDownloadURLFn) {
            // Firebase Storage'a yükle
            try {
                const sRef = window.storageRefFn(window.spaceGarbageStorage, `gameplanner/${window.gpActiveProjectId}/${id}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_')}`);
                await window.uploadBytesFn(sRef, file);
                dataUrl = await window.getDownloadURLFn(sRef);
            } catch(e) {
                console.warn('Storage upload failed, falling back to base64:', e);
                dataUrl = await window.fileToBase64(file);
            }
        } else {
            dataUrl = await window.fileToBase64(file);
        }

        const meta = { id, name:file.name, category:cat, tags:[], notes:'', dataUrl, uploadedAt:Date.now(), size:file.size };
        await window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/assets/${id}`), meta);
        uploaded++;
    }
    event.target.value='';
    alert(`✅ ${uploaded} asset yüklendi!`);
    window.registerAction && window.registerAction(`${uploaded} asset yüklendi.`);
};

// ── SİL ────────────────────────────────────────────────────────
window.gpAssetDelete = function(id) {
    if (!confirm('Bu asset\'i sil?')) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/assets/${id}`),null);
};
