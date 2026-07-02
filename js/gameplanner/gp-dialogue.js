// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — DİYALOG EDİTÖRÜ  (gp-dialogue.js)
// ════════════════════════════════════════════════════════════════

let gpDialogueTab      = 'scenes';  // 'scenes' | 'trees'
let gpDialogueSelected = null;

window.gpRenderDialogue = function() {
    const wrap = document.getElementById('gp-dialogue-content');
    if (!wrap) return;
    if (!window.gpRequireProject(wrap)) return;

    wrap.innerHTML = `
    <div class="gp-page-hdr">
        <div><h1 class="gp-title">💬 Diyalog Editörü</h1></div>
        <div style="display:flex;gap:8px;">
            <button class="gp-btn-secondary" onclick="gpDialogueExportInk()">⬇️ .ink Export</button>
            <button class="gp-btn-primary"   onclick="gpDialogueNew()">➕ Yeni</button>
        </div>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:16px;border-bottom:1px solid #2d2f45;">
        <button class="gp-cat-btn ${gpDialogueTab==='scenes'?'active':''}" onclick="gpDialogueSetTab('scenes')" style="border-radius:6px 6px 0 0;">🎬 Sahneler</button>
        <button class="gp-cat-btn ${gpDialogueTab==='trees'?'active':''}"  onclick="gpDialogueSetTab('trees')"  style="border-radius:6px 6px 0 0;">🌳 Diyalog Ağaçları</button>
    </div>
    <div id="gp-dialogue-body"></div>`;

    gpDialogueRenderTab();
};

window.gpDialogueSetTab = function(tab) {
    gpDialogueTab=tab; gpDialogueSelected=null;
    document.querySelectorAll('#gp-dialogue-content .gp-cat-btn').forEach((b,i)=>b.classList.toggle('active',['scenes','trees'][i]===tab));
    gpDialogueRenderTab();
};

function gpDialogueRenderTab() {
    const body=document.getElementById('gp-dialogue-body'); if(!body) return;
    if (gpDialogueTab==='scenes') gpDialogueRenderScenes(body);
    else                           gpDialogueRenderTrees(body);
}

// ── SAHNELER ───────────────────────────────────────────────────
function gpDialogueRenderScenes(body) {
    const scenes = Object.values(window.gpActiveProject?.dialogue?.scenes||{}).sort((a,b)=>(a.order||0)-(b.order||0));
    const chars  = Object.values(window.gpActiveProject?.characters||{});

    body.innerHTML = `
    <div style="display:flex;gap:20px;">
        <div style="flex:0 0 240px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h3 style="margin:0;color:#e2e8f0;font-size:14px;">Sahneler</h3>
                <button class="gp-btn-primary" style="padding:5px 10px;font-size:12px;" onclick="gpDialogueNewScene()">➕</button>
            </div>
            ${scenes.map(s=>`
            <div class="gp-list-card ${gpDialogueSelected===s.id?'active':''}" onclick="gpDialogueSelectScene('${s.id}')" style="margin-bottom:4px;">
                <div class="gp-list-card-info">
                    <div class="gp-list-card-name">${gpEsc(s.title||'İsimsiz Sahne')}</div>
                    <div class="gp-list-card-sub">${(s.lines||[]).length} satır</div>
                </div>
            </div>`).join('')}
            ${scenes.length===0?`<div style="color:#475569;font-size:12px;text-align:center;padding:20px;">Henüz sahne yok.</div>`:''}
        </div>
        <div style="flex:1;" id="gp-scene-editor">
            ${gpDialogueSelected && (window.gpActiveProject?.dialogue?.scenes||{})[gpDialogueSelected]
                ? gpSceneEditorHTML((window.gpActiveProject.dialogue.scenes)[gpDialogueSelected], chars)
                : `<div class="gp-split-editor-placeholder"><div style="font-size:40px;">🎬</div><div>Bir sahne seç veya yeni oluştur</div></div>`
            }
        </div>
    </div>`;
}

function gpSceneEditorHTML(s, chars) {
    const lines = s.lines||[];
    return `
    <div class="gp-editor-section">
        <div class="gp-editor-section-hdr">
            Sahne Düzenle
            <button class="gp-btn-danger" onclick="gpDialogueDeleteScene('${s.id}')" style="font-size:11px;padding:4px 8px;">Sil</button>
        </div>
        <div class="gp-editor-section-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div class="gp-form-group">
                    <label>Sahne Başlığı</label>
                    <input type="text" value="${gpEsc(s.title||'')}" onchange="gpDialogueSave('scenes','${s.id}','title',this.value)">
                </div>
                <div class="gp-form-group">
                    <label>Lokasyon</label>
                    <input type="text" value="${gpEsc(s.location||'')}" placeholder="Nerede geçiyor?" onchange="gpDialogueSave('scenes','${s.id}','location',this.value)">
                </div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Diyalog Satırları</label>
                <button class="gp-btn-icon" style="font-size:11px;width:auto;padding:4px 10px;" onclick="gpSceneAddLine('${s.id}')">+ Satır</button>
            </div>

            <div id="gp-scene-lines">
                ${lines.map((line,i)=>`
                <div class="gp-dialogue-node ${line.type==='choice'?'choice':'narration'}" style="margin-bottom:8px;">
                    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                        <select style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:12px;" onchange="gpSceneUpdateLine('${s.id}',${i},'type',this.value)">
                            <option value="narration" ${line.type!=='choice'?'selected':''}>🎭 Anlatı</option>
                            <option value="choice"    ${line.type==='choice'?'selected':''}>❓ Seçenek</option>
                            <option value="action"    ${line.type==='action'?'selected':''}>⚡ Aksiyon</option>
                        </select>
                        <select style="background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:4px 8px;border-radius:4px;font-size:12px;flex:0 0 130px;" onchange="gpSceneUpdateLine('${s.id}',${i},'speaker',this.value)">
                            <option value="">— Karakter —</option>
                            ${chars.map(c=>`<option value="${gpEsc(c.name)}" ${line.speaker===c.name?'selected':''}>${gpEsc(c.name)}</option>`).join('')}
                            <option value="NARRATOR" ${line.speaker==='NARRATOR'?'selected':''}>📢 Anlatıcı</option>
                        </select>
                        <button style="background:none;border:none;color:#ef4444;cursor:pointer;margin-left:auto;" onclick="gpSceneDeleteLine('${s.id}',${i})">×</button>
                    </div>
                    <textarea style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;padding:8px;border-radius:4px;font-size:13px;resize:vertical;box-sizing:border-box;" rows="2"
                        placeholder="${line.type==='choice'?'Seçenek metni...':line.type==='action'?'Aksiyon açıklaması...':'Konuşma / anlatı...'}"
                        onblur="gpSceneUpdateLine('${s.id}',${i},'text',this.value)">${gpEsc(line.text||'')}</textarea>
                </div>`).join('')}
                ${lines.length===0?`<div style="color:#475569;font-size:12px;">Henüz satır yok. + Satır butonuyla ekle.</div>`:''}
            </div>
        </div>
    </div>`;
}

function gpDialogueSelectScene(id) {
    gpDialogueSelected=id;
    gpDialogueRenderScenes(document.getElementById('gp-dialogue-body'));
}
window.gpDialogueSelectScene=gpDialogueSelectScene;

window.gpDialogueNewScene = function() {
    if(!window.gpActiveProjectId) return;
    const id=window.gpGenId('sc');
    const exist=Object.values(window.gpActiveProject?.dialogue?.scenes||{});
    const maxOrd=exist.length?Math.max(...exist.map(s=>s.order||0)):0;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/dialogue/scenes/${id}`),
        {id,title:'Yeni Sahne',location:'',lines:[],order:maxOrd+1})
        .then(()=>{gpDialogueSelected=id;});
};

window.gpDialogueDeleteScene=function(id){if(!confirm('Sahneyi sil?'))return;window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/dialogue/scenes/${id}`),null);gpDialogueSelected=null;};

function gpDialogueSave(section,id,field,value){
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/dialogue/${section}/${id}/${field}`),value);
}
window.gpDialogueSave=gpDialogueSave;

window.gpSceneAddLine=function(sceneId){
    const lines=[...(window.gpActiveProject?.dialogue?.scenes?.[sceneId]?.lines||[]),{type:'narration',speaker:'',text:''}];
    gpDialogueSave('scenes',sceneId,'lines',lines);
};
window.gpSceneUpdateLine=function(sceneId,idx,field,value){
    const lines=[...(window.gpActiveProject?.dialogue?.scenes?.[sceneId]?.lines||[])];
    if(!lines[idx]) lines[idx]={};
    lines[idx][field]=value;
    gpDialogueSave('scenes',sceneId,'lines',lines);
};
window.gpSceneDeleteLine=function(sceneId,idx){
    const lines=[...(window.gpActiveProject?.dialogue?.scenes?.[sceneId]?.lines||[])];
    lines.splice(idx,1);
    gpDialogueSave('scenes',sceneId,'lines',lines);
};

// ── DİYALOG AĞAÇLARI ─────────────────────────────────────────
function gpDialogueRenderTrees(body) {
    const trees=Object.values(window.gpActiveProject?.dialogue?.trees||{});
    body.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h3 style="margin:0;color:#e2e8f0;">Diyalog Ağaçları</h3>
        <button class="gp-btn-primary" onclick="gpDialogueNewTree()">➕ Yeni Ağaç</button>
    </div>
    ${trees.map(t=>`
    <div class="gp-editor-section" style="margin-bottom:12px;">
        <div class="gp-editor-section-hdr">
            <span>🌳 ${gpEsc(t.title||'İsimsiz Ağaç')}</span>
            <button class="gp-btn-danger" onclick="gpDialogueDeleteTree('${t.id}')" style="font-size:11px;padding:4px 8px;">Sil</button>
        </div>
        <div class="gp-editor-section-body">
            <div class="gp-form-group">
                <label>Ağaç Adı</label>
                <input type="text" value="${gpEsc(t.title||'')}" onchange="gpDialogueSave('trees','${t.id}','title',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Tetikleyen Koşul</label>
                <input type="text" value="${gpEsc(t.trigger||'')}" placeholder="Örn: Oyuncu NPC'ye yaklaştığında" onchange="gpDialogueSave('trees','${t.id}','trigger',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Notlar / Açıklama</label>
                <textarea rows="2" onblur="gpDialogueSave('trees','${t.id}','notes',this.value)"
                    placeholder="Bu diyalog ağacının amacı, dalları, sonuçları...">${gpEsc(t.notes||'')}</textarea>
            </div>
        </div>
    </div>`).join('')}
    ${trees.length===0?`<div style="color:#475569;text-align:center;padding:40px;">Henüz diyalog ağacı yok.</div>`:''}`;
}

window.gpDialogueNewTree=function(){if(!window.gpActiveProjectId)return;const id=window.gpGenId('tree');window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/dialogue/trees/${id}`),{id,title:'Yeni Ağaç',trigger:'',notes:''});};
window.gpDialogueDeleteTree=function(id){if(!confirm('Diyalog ağacını sil?'))return;window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/dialogue/trees/${id}`),null);};
window.gpDialogueNew = function(){gpDialogueTab==='scenes'?window.gpDialogueNewScene():window.gpDialogueNewTree();};

// ── INK EXPORT ────────────────────────────────────────────────
window.gpDialogueExportInk = function() {
    const scenes = Object.values(window.gpActiveProject?.dialogue?.scenes||{}).sort((a,b)=>(a.order||0)-(b.order||0));
    if (!scenes.length) { alert('Dışa aktarılacak sahne yok.'); return; }
    let ink = `// ${window.gpActiveProject?.meta?.name||'Oyun'} — Diyalog Export (Ink Format)\n// Oluşturulma: ${new Date().toLocaleDateString('tr-TR')}\n\n`;
    scenes.forEach(s=>{
        ink += `=== ${(s.title||'sahne').toLowerCase().replace(/[^a-z0-9]/g,'_')} ===\n`;
        if (s.location) ink += `// Lokasyon: ${s.location}\n`;
        (s.lines||[]).forEach(line=>{
            if (line.type==='choice') ink += `* [${line.text||'...'}]\n`;
            else if (line.type==='action') ink += `// [AKSİYON] ${line.text||''}\n`;
            else ink += `${line.speaker?line.speaker+': ':''}${line.text||''}\n`;
        });
        ink += `-> END\n\n`;
    });
    const blob=new Blob([ink],{type:'text/plain'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=`${(window.gpActiveProject?.meta?.name||'dialogue').replace(/\s+/g,'_')}.ink`;
    a.click();
};
