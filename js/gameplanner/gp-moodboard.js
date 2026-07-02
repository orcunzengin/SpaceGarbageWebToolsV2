// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — MOOD BOARD & RENK PALETİ  (gp-moodboard.js)
// ════════════════════════════════════════════════════════════════

window.gpRenderMoodboard = function() {
    const wrap = document.getElementById('gp-moodboard-content');
    if (!wrap) return;
    if (!window.gpRequireProject(wrap)) return;

    const mb      = window.gpActiveProject?.moodboard || {};
    const images  = Object.values(mb.images || {}).sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
    const palette = mb.palette || [];
    const vibe    = mb.vibe || '';

    wrap.innerHTML = `
    <div class="gp-page-hdr">
        <div><h1 class="gp-title">🎭 Mood Board & Renk Paleti</h1></div>
        <div style="display:flex;gap:8px;">
            <input type="file" id="gp-mb-upload" multiple accept="image/*" style="display:none;" onchange="gpMoodUpload(event)">
            <button class="gp-btn-primary" onclick="document.getElementById('gp-mb-upload').click()">🖼️ Görsel Ekle</button>
        </div>
    </div>

    <!-- Vibe notu -->
    <div class="gp-editor-section" style="margin-bottom:16px;">
        <div class="gp-editor-section-hdr">🎯 Bu Oyunun Hissi</div>
        <div class="gp-editor-section-body">
            <div class="gp-richtext" contenteditable="true"
                placeholder="Bu oyun nasıl hissettirmeli? Sıfatlar, duygular, atmosfer notları... (Örn: 'Yalnız ama umut dolu, steampunk estetiği, amber renkler')"
                onblur="gpMoodSaveVibe(this.innerHTML)"
                style="min-height:60px;">${vibe}</div>
        </div>
    </div>

    <!-- Renk Paleti -->
    <div class="gp-editor-section" style="margin-bottom:16px;">
        <div class="gp-editor-section-hdr">
            🎨 Resmi Renk Paleti
            <div style="display:flex;gap:6px;align-items:center;">
                <input type="color" id="gp-palette-picker" value="#a78bfa" style="width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:4px;">
                <button class="gp-btn-icon" onclick="gpMoodAddColor()" style="font-size:12px;width:auto;padding:4px 10px;">+ Ekle</button>
            </div>
        </div>
        <div class="gp-editor-section-body">
            <div class="gp-palette-row" id="gp-palette-row">
                ${palette.length===0
                    ? `<div style="color:#475569;font-size:12px;">Henüz renk eklenmemiş. Renk seç → + Ekle.</div>`
                    : palette.map((c,i)=>`
                    <div style="position:relative;display:inline-block;">
                        <div class="gp-palette-chip" style="background:${c};" title="${c}" onclick="navigator.clipboard.writeText('${c}')"></div>
                        <button onclick="gpMoodDeleteColor(${i})" style="position:absolute;top:-5px;right:-5px;background:#ef4444;color:white;border:none;width:16px;height:16px;border-radius:50%;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">×</button>
                        <div style="font-size:9px;color:#64748b;text-align:center;margin-top:2px;">${c}</div>
                    </div>`).join('')
                }
            </div>
            ${palette.length>0?`<div style="font-size:11px;color:#475569;margin-top:8px;">Renk kutusuna tıklayarak HEX kodu kopyalanır.</div>`:''}
        </div>
    </div>

    <!-- Görsel Grid -->
    <div class="gp-moodboard-grid" id="gp-mb-grid">
        ${images.length===0
            ? `<div style="grid-column:1/-1;color:#475569;text-align:center;padding:40px;">
                Henüz görsel yok. 🖼️ Görsel Ekle butonuyla referans görseller ekle.
               </div>`
            : images.map(img=>gpMoodImgCard(img)).join('')
        }
    </div>`;
};

function gpMoodImgCard(img) {
    return `
    <div class="gp-mood-img-card" onclick="gpMoodPreview('${img.id}')">
        <img src="${img.dataUrl}" alt="${gpEsc(img.note||'')}">
        <div style="padding:8px;">
            <div style="font-size:11px;color:#94a3b8;">${gpEsc(img.note||'')}</div>
        </div>
        <button onclick="event.stopPropagation();gpMoodDeleteImg('${img.id}')"
            style="position:absolute;top:6px;right:6px;background:rgba(239,68,68,0.85);color:white;border:none;width:22px;height:22px;border-radius:50%;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        ${img.dominantColors?.length
            ? `<div style="display:flex;gap:3px;padding:0 8px 8px;">
                ${img.dominantColors.map(c=>`<div style="width:20px;height:8px;background:${c};border-radius:2px;" title="${c}"></div>`).join('')}
               </div>`
            : ''}
    </div>`;
}

// ── Renk çıkarma (Canvas API) ───────────────────────────────────
function gpExtractColors(dataUrl, count=5) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 50; canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img,0,0,50,50);
            const data = ctx.getImageData(0,0,50,50).data;
            const colorMap = {};
            for (let i=0; i<data.length; i+=4) {
                // Piksel rengini 32'ye yuvarla (kümeleme)
                const r=Math.round(data[i]/32)*32,
                      g=Math.round(data[i+1]/32)*32,
                      b=Math.round(data[i+2]/32)*32;
                if (data[i+3]<128) continue; // şeffaf pikselleri atla
                const key=`${r},${g},${b}`;
                colorMap[key]=(colorMap[key]||0)+1;
            }
            const sorted=Object.entries(colorMap).sort((a,b)=>b[1]-a[1]).slice(0,count);
            const colors=sorted.map(([key])=>{
                const [r,g,b]=key.split(',').map(Number);
                return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
            });
            resolve(colors);
        };
        img.src = dataUrl;
    });
}

// ── Upload ──────────────────────────────────────────────────────
window.gpMoodUpload = async function(event) {
    const files = Array.from(event.target.files); if(!files.length) return;
    for (const file of files) {
        const id      = window.gpGenId('mb');
        const dataUrl = await window.fileToBase64(file);
        const colors  = await gpExtractColors(dataUrl, 5);
        const note    = '';
        await window.firebaseSet(
            window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/moodboard/images/${id}`),
            { id, dataUrl, note, dominantColors:colors, addedAt:Date.now() }
        );
    }
    event.target.value='';
    window.registerAction && window.registerAction(`${files.length} mood board görseli eklendi.`);
};

window.gpMoodPreview = function(id) {
    const img = (window.gpActiveProject?.moodboard?.images||{})[id]; if(!img) return;
    const colorChips = (img.dominantColors||[]).map(c=>
        `<div style="width:32px;height:32px;background:${c};border-radius:6px;border:2px solid rgba(255,255,255,0.1);cursor:pointer;flex-shrink:0;" title="${c}" onclick="navigator.clipboard.writeText('${c}')"></div>`
    ).join('');
    const meta = `
        <div style="margin-bottom:8px;font-size:13px;color:#94a3b8;">${gpEsc(img.note||'')}</div>
        <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">${colorChips}</div>
        <div style="display:flex;gap:8px;">
            <input id="gp-mb-note-input" value="${gpEsc(img.note||'')}" placeholder="Görsel notu..."
                style="flex:1;background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:7px 12px;border-radius:6px;font-size:13px;">
            <button class="gp-btn-secondary" onclick="gpMoodSaveNote('${id}',document.getElementById('gp-mb-note-input').value)">Kaydet</button>
            <button class="gp-btn-secondary" onclick="gpMoodAddPaletteFrom('${id}')">🎨 Paletime Ekle</button>
            <button class="gp-btn-danger" onclick="gpMoodDeleteImg('${id}');window.gpCloseLightbox()">🗑️</button>
        </div>`;
    window.gpOpenLightbox(`<img src="${img.dataUrl}" style="max-width:85vw;max-height:70vh;object-fit:contain;border-radius:8px;">`, meta);
};

window.gpMoodAddPaletteFrom = function(id) {
    const img = (window.gpActiveProject?.moodboard?.images||{})[id]; if(!img) return;
    const current = [...(window.gpActiveProject?.moodboard?.palette||[])];
    (img.dominantColors||[]).forEach(c=>{ if(!current.includes(c)) current.push(c); });
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/moodboard/palette`),current);
    window.gpCloseLightbox();
};

window.gpMoodSaveNote = function(id, note) {
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/moodboard/images/${id}/note`),note);
};

window.gpMoodDeleteImg = function(id) {
    if (!confirm('Görseli sil?')) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/moodboard/images/${id}`),null);
};

window.gpMoodSaveVibe = function(html) {
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/moodboard/vibe`),html);
};

window.gpMoodAddColor = function() {
    const color = document.getElementById('gp-palette-picker')?.value; if(!color) return;
    const current = [...(window.gpActiveProject?.moodboard?.palette||[])];
    if (!current.includes(color)) current.push(color);
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/moodboard/palette`),current);
};

window.gpMoodDeleteColor = function(idx) {
    const current = [...(window.gpActiveProject?.moodboard?.palette||[])];
    current.splice(idx,1);
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/moodboard/palette`),current);
};
