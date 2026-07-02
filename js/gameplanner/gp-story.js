// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — HİKAYE & LORE  (gp-story.js)
// ════════════════════════════════════════════════════════════════

let gpStoryActiveChapter = null;
let gpStoryActiveLore    = null;
let gpStoryTab           = 'world'; // 'world' | 'chapters' | 'lore'

window.gpRenderStory = function() {
    const wrap = document.getElementById('gp-story-content');
    if (!wrap) return;
    if (!window.gpRequireProject(wrap)) return;

    const proj = window.gpActiveProject;
    const story = proj.story || {};

    wrap.innerHTML = `
    <div class="gp-page-hdr">
        <div><h1 class="gp-title">📖 Hikaye & Lore</h1></div>
    </div>

    <div style="display:flex;gap:6px;margin-bottom:18px;border-bottom:1px solid #2d2f45;padding-bottom:0;">
        <button class="gp-cat-btn ${gpStoryTab==='world'?'active':''}" id="gp-story-tab-world" onclick="gpStorySetTab('world')" style="border-radius:6px 6px 0 0;">🌍 Evren</button>
        <button class="gp-cat-btn ${gpStoryTab==='chapters'?'active':''}" id="gp-story-tab-chapters" onclick="gpStorySetTab('chapters')" style="border-radius:6px 6px 0 0;">📚 Bölümler</button>
        <button class="gp-cat-btn ${gpStoryTab==='lore'?'active':''}" id="gp-story-tab-lore" onclick="gpStorySetTab('lore')" style="border-radius:6px 6px 0 0;">🗂️ Lore Ansiklopedisi</button>
    </div>

    <div id="gp-story-body"></div>`;

    gpStoryRenderTab();
};

window.gpStorySetTab = function(tab) {
    gpStoryTab = tab;
    ['world','chapters','lore'].forEach(t => {
        const btn = document.getElementById(`gp-story-tab-${t}`);
        if (btn) btn.classList.toggle('active', t===tab);
    });
    gpStoryRenderTab();
};

function gpStoryRenderTab() {
    const body = document.getElementById('gp-story-body'); if (!body) return;
    if (gpStoryTab === 'world')    gpStoryRenderWorld(body);
    if (gpStoryTab === 'chapters') gpStoryRenderChapters(body);
    if (gpStoryTab === 'lore')     gpStoryRenderLore(body);
}

// ── EVREN ──────────────────────────────────────────────────────
function gpStoryRenderWorld(body) {
    const overview = window.gpActiveProject?.story?.worldOverview || '';
    body.innerHTML = `
    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">🌍 Dünya / Evren Genel Bakışı</div>
        <div class="gp-editor-section-body">
            ${window.gpRichToolbarHTML('gp-story-world-rt')}
            <div class="gp-richtext" id="gp-story-world-rt" contenteditable="true"
                placeholder="Bu oyunun dünyası nasıl? Fizik kuralları, tarih, factions, büyü sistemi..."
                onblur="gpStorySaveField('worldOverview',this.innerHTML)"
                style="min-height:300px;">${overview}</div>
        </div>
    </div>`;
}

// ── BÖLÜMLER ───────────────────────────────────────────────────
function gpStoryRenderChapters(body) {
    const chapters = Object.values(window.gpActiveProject?.story?.chapters||{}).sort((a,b)=>a.order-b.order);
    body.innerHTML = `
    <div style="display:flex;gap:20px;">
        <div style="flex:0 0 280px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0;color:#e2e8f0;font-size:14px;">Bölümler</h3>
                <button class="gp-btn-primary" style="padding:5px 12px;font-size:12px;" onclick="gpStoryNewChapter()">➕ Bölüm</button>
            </div>
            <div class="gp-chapter-list" id="gp-chapter-list">
                ${chapters.length===0
                    ? `<div style="color:#475569;font-size:13px;text-align:center;padding:20px;">Henüz bölüm yok.</div>`
                    : chapters.map(ch=>`
                    <div class="gp-chapter-card ${gpStoryActiveChapter===ch.id?'active':''}" onclick="gpStorySelectChapter('${ch.id}')">
                        <div class="gp-chapter-num">Bölüm ${ch.order||''}</div>
                        <div class="gp-chapter-title">${gpEsc(ch.title||'İsimsiz Bölüm')}</div>
                        <div class="gp-chapter-sum">${gpEsc((ch.summary||'').slice(0,60))}${(ch.summary||'').length>60?'...':''}</div>
                    </div>`).join('')
                }
            </div>
        </div>
        <div style="flex:1;" id="gp-chapter-editor">
            ${gpStoryActiveChapter && (window.gpActiveProject?.story?.chapters||{})[gpStoryActiveChapter]
                ? gpStoryChapterEditorHTML((window.gpActiveProject.story.chapters)[gpStoryActiveChapter])
                : `<div class="gp-split-editor-placeholder"><div style="font-size:40px;">📖</div><div>Bir bölüm seç veya yeni oluştur</div></div>`
            }
        </div>
    </div>`;
}

function gpStoryChapterEditorHTML(ch) {
    const events = ch.events || [];
    return `
    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">
            Bölüm Düzenle
            <button class="gp-btn-danger" onclick="gpStoryDeleteChapter('${ch.id}')" style="font-size:11px;padding:4px 8px;">Sil</button>
        </div>
        <div class="gp-editor-section-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="gp-form-group">
                    <label>Bölüm Numarası</label>
                    <input type="number" value="${ch.order||1}" onchange="gpStoryChapterSave('${ch.id}','order',parseInt(this.value))">
                </div>
                <div class="gp-form-group">
                    <label>Bölüm Başlığı</label>
                    <input type="text" value="${gpEsc(ch.title||'')}" onchange="gpStoryChapterSave('${ch.id}','title',this.value)">
                </div>
            </div>
            <div class="gp-form-group">
                <label>Özet</label>
                <textarea rows="2" onblur="gpStoryChapterSave('${ch.id}','summary',this.value)">${gpEsc(ch.summary||'')}</textarea>
            </div>
            <div class="gp-form-group">
                <label>Detaylı Anlatı</label>
                ${window.gpRichToolbarHTML('gp-ch-detail')}
                <div class="gp-richtext" id="gp-ch-detail" contenteditable="true"
                    placeholder="Bu bölümde ne oluyor? Detaylı anlat..."
                    onblur="gpStoryChapterSave('${ch.id}','narrative',this.innerHTML)"
                    style="min-height:150px;">${ch.narrative||''}</div>
            </div>
            <div style="margin-top:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Önemli Olaylar</label>
                    <button class="gp-btn-icon" style="font-size:11px;width:auto;padding:3px 8px;" onclick="gpStoryAddEvent('${ch.id}')">+ Olay</button>
                </div>
                ${events.map((ev,i)=>`
                <div style="display:flex;gap:8px;align-items:center;padding:6px 10px;background:#0f172a;border-radius:5px;margin-bottom:4px;border-left:3px solid #a78bfa;">
                    <span style="font-size:13px;color:#e2e8f0;flex:1;">${gpEsc(ev)}</span>
                    <button style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="gpStoryDeleteEvent('${ch.id}',${i})">×</button>
                </div>`).join('')}
                ${events.length===0?`<div style="color:#475569;font-size:12px;">Henüz önemli olay eklenmemiş.</div>`:''}
            </div>
        </div>
    </div>`;
}

function gpStorySelectChapter(id) {
    gpStoryActiveChapter = id;
    gpStoryRenderChapters(document.getElementById('gp-story-body'));
}
window.gpStorySelectChapter = gpStorySelectChapter;

window.gpStoryNewChapter = function() {
    if(!window.gpActiveProjectId) return;
    const id = window.gpGenId('ch');
    const existing = Object.values(window.gpActiveProject?.story?.chapters||{});
    const maxOrder = existing.length ? Math.max(...existing.map(c=>c.order||0)) : 0;
    const obj = { id, title:'Yeni Bölüm', order:maxOrder+1, summary:'', narrative:'', events:[] };
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/chapters/${id}`),obj)
        .then(()=>{gpStoryActiveChapter=id;});
};

function gpStoryChapterSave(id,field,value) {
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/chapters/${id}/${field}`),value);
}
window.gpStoryChapterSave=gpStoryChapterSave;

window.gpStoryDeleteChapter=function(id){
    if(!confirm('Bölümü sil?')) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/chapters/${id}`),null);
    if(gpStoryActiveChapter===id) gpStoryActiveChapter=null;
};

window.gpStoryAddEvent=function(chId){const ev=prompt('Önemli olay:');if(!ev)return;const ch=window.gpActiveProject?.story?.chapters?.[chId];const events=[...(ch?.events||[]),ev.trim()];gpStoryChapterSave(chId,'events',events);};
window.gpStoryDeleteEvent=function(chId,i){const events=[...(window.gpActiveProject?.story?.chapters?.[chId]?.events||[])];events.splice(i,1);gpStoryChapterSave(chId,'events',events);};

// ── LORE ANSİKLOPEDİSİ ─────────────────────────────────────────
function gpStoryRenderLore(body) {
    const lore = window.gpActiveProject?.story?.lore || {};
    const cats = Object.keys(lore);
    body.innerHTML = `
    <div style="display:flex;gap:16px;">
        <div style="flex:0 0 220px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0;color:#e2e8f0;font-size:14px;">Kategoriler</h3>
                <button class="gp-btn-primary" style="padding:5px 10px;font-size:12px;" onclick="gpLoreNewCat()">+</button>
            </div>
            ${cats.map(cat=>`
            <div class="gp-list-card ${gpStoryActiveLore===cat?'active':''}" onclick="gpLoreSelectCat('${gpEsc(cat)}')" style="margin-bottom:4px;">
                <div class="gp-list-card-info"><div class="gp-list-card-name">${gpEsc(cat)}</div><div class="gp-list-card-sub">${Object.keys(lore[cat]||{}).length} madde</div></div>
            </div>`).join('')}
            ${cats.length===0?`<div style="color:#475569;font-size:12px;">Henüz kategori yok.</div>`:''}
        </div>
        <div style="flex:1;" id="gp-lore-entries">
            ${gpStoryActiveLore&&lore[gpStoryActiveLore]
                ? gpLoreEntriesHTML(gpStoryActiveLore,lore[gpStoryActiveLore])
                : `<div class="gp-split-editor-placeholder"><div style="font-size:40px;">🗂️</div><div>Bir kategori seç</div></div>`
            }
        </div>
    </div>`;
}

function gpLoreSelectCat(cat) { gpStoryActiveLore=cat; gpStoryRenderLore(document.getElementById('gp-story-body')); }
window.gpLoreSelectCat=gpLoreSelectCat;

function gpLoreEntriesHTML(cat, entries) {
    const arr = Object.entries(entries||{});
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="margin:0;color:#a78bfa;">${gpEsc(cat)}</h3>
        <div style="display:flex;gap:8px;">
            <button class="gp-btn-secondary" onclick="gpLoreDeleteCat('${gpEsc(cat)}')" style="font-size:12px;">Kategoriyi Sil</button>
            <button class="gp-btn-primary" style="font-size:12px;padding:5px 12px;" onclick="gpLoreNewEntry('${gpEsc(cat)}')">➕ Madde</button>
        </div>
    </div>
    ${arr.map(([id,entry])=>`
    <div class="gp-editor-section" style="margin-bottom:12px;">
        <div class="gp-editor-section-hdr">
            <input type="text" value="${gpEsc(entry.title||'')}" style="background:transparent;border:none;color:#e2e8f0;font-weight:700;flex:1;outline:none;" onblur="gpLoreSave('${gpEsc(cat)}','${id}','title',this.value)">
            <button style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="gpLoreDelete('${gpEsc(cat)}','${id}')">🗑️</button>
        </div>
        <div class="gp-editor-section-body">
            <div class="gp-richtext" contenteditable="true"
                placeholder="Bu lore maddesi hakkında yaz..."
                onblur="gpLoreSave('${gpEsc(cat)}','${id}','content',this.innerHTML)">${entry.content||''}</div>
        </div>
    </div>`).join('')}
    ${arr.length===0?`<div style="color:#475569;font-size:12px;text-align:center;padding:20px;">Bu kategoride henüz madde yok. ➕ Madde butonuna bas.</div>`:''}`;
}

window.gpLoreNewCat=function(){const name=prompt('Kategori adı (Örn: Factions, Büyü Sistemi, Tarih):');if(!name)return;gpStoryActiveLore=name.trim();window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/lore/${name.trim()}`),{});};
window.gpLoreDeleteCat=function(cat){if(!confirm(`"${cat}" kategorisini ve tüm maddelerini sil?`))return;window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/lore/${cat}`),null);gpStoryActiveLore=null;};
window.gpLoreNewEntry=function(cat){const id=window.gpGenId('lore');window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/lore/${cat}/${id}`),{title:'Yeni Madde',content:''});};
window.gpLoreSave=function(cat,id,field,value){window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/lore/${cat}/${id}/${field}`),value);};
window.gpLoreDelete=function(cat,id){window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/lore/${cat}/${id}`),null);};

function gpStorySaveField(field, value) {
    if(!window.gpActiveProjectId) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/story/${field}`),value);
}
window.gpStorySaveField=gpStorySaveField;
