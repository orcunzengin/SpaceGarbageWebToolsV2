// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — TEKNİK NOTLAR  (gp-technical.js)
// ════════════════════════════════════════════════════════════════

const GP_ENGINES    = ['Unity','Godot','Unreal Engine','GameMaker','Custom Engine','Diğer'];
const GP_PLATFORMS  = ['PC (Windows)','PC (Mac)','PC (Linux)','Mobile (iOS)','Mobile (Android)','WebGL','PlayStation','Xbox','Nintendo Switch'];

window.gpRenderTechnical = function() {
    const wrap = document.getElementById('gp-technical-content');
    if (!wrap) return;
    if (!window.gpRequireProject(wrap)) return;

    const tech = window.gpActiveProject?.technical || {};
    const decisions = Object.values(tech.decisions||{}).sort((a,b)=>(b.date||0)-(a.date||0));
    const deps      = tech.dependencies || [];
    const risks     = tech.risks        || [];
    const platforms = tech.platforms    || [];

    wrap.innerHTML = `
    <div class="gp-page-hdr">
        <div><h1 class="gp-title">🔧 Teknik Notlar</h1></div>
        <button class="gp-btn-secondary" onclick="gpTechSaveAll()">💾 Kaydet</button>
    </div>

    <div class="gp-tech-grid">

        <!-- Engine & Platform -->
        <div class="gp-tech-card">
            <h3>⚙️ Engine & Platform</h3>
            <div class="gp-form-group">
                <label>Game Engine</label>
                <select id="gp-tech-engine" onchange="gpTechSave('engine',this.value)">
                    ${GP_ENGINES.map(e=>`<option value="${e}" ${tech.engine===e?'selected':''}>${e}</option>`).join('')}
                </select>
            </div>
            <div class="gp-form-group">
                <label>Hedef Platformlar</label>
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;" id="gp-tech-platforms">
                    ${GP_PLATFORMS.map(p=>`
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#94a3b8;cursor:pointer;">
                        <input type="checkbox" ${platforms.includes(p)?'checked':''} onchange="gpTechTogglePlatform('${p}',this.checked)"
                            style="accent-color:#8b5cf6;">
                        ${p}
                    </label>`).join('')}
                </div>
            </div>
            <div class="gp-form-group" style="margin-top:10px;">
                <label>Mimari / Yapısal Kararlar</label>
                <input type="text" id="gp-tech-arch" value="${gpEsc(tech.architecture||'')}"
                    placeholder="Örn: ECS mimarisi, MVC pattern, ScriptableObjects..."
                    onblur="gpTechSave('architecture',this.value)">
            </div>
        </div>

        <!-- Performans Hedefleri -->
        <div class="gp-tech-card">
            <h3>🎯 Performans Hedefleri</h3>
            <div class="gp-form-group">
                <label>Hedef FPS</label>
                <input type="text" id="gp-tech-fps" value="${gpEsc(tech.targetFPS||'')}" placeholder="Örn: 60 FPS sabit, 30 FPS min" onblur="gpTechSave('targetFPS',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Çözünürlük / Ekran</label>
                <input type="text" id="gp-tech-res" value="${gpEsc(tech.resolution||'')}" placeholder="Örn: 1920x1080, 16:9, Responsive" onblur="gpTechSave('resolution',this.value)">
            </div>
            <div class="gp-form-group">
                <label>Min. Sistem Gereksinimleri</label>
                <textarea id="gp-tech-sysreq" rows="3" placeholder="RAM, CPU, GPU beklentileri..."
                    onblur="gpTechSave('sysReq',this.value)">${gpEsc(tech.sysReq||'')}</textarea>
            </div>
        </div>

        <!-- Bağımlılıklar -->
        <div class="gp-tech-card">
            <h3>📦 Bağımlılıklar & Kütüphaneler
                <button class="gp-btn-icon" style="font-size:11px;width:auto;padding:3px 8px;float:right;" onclick="gpTechAddDep()">+ Ekle</button>
            </h3>
            <div id="gp-tech-deps-list">
                ${deps.length===0
                    ? `<div style="color:#475569;font-size:12px;">Henüz bağımlılık yok.</div>`
                    : deps.map((d,i)=>`
                    <div style="display:flex;gap:8px;align-items:center;padding:6px 10px;background:#0f172a;border-radius:6px;margin-bottom:4px;">
                        <span style="font-weight:600;color:#e2e8f0;flex:0 0 auto;">${gpEsc(d.name)}</span>
                        <span style="font-size:11px;color:#475569;flex:1;">${gpEsc(d.purpose||'')}</span>
                        <button style="background:none;border:none;color:#ef4444;cursor:pointer;" onclick="gpTechDeleteDep(${i})">×</button>
                    </div>`).join('')
                }
            </div>
        </div>

        <!-- Teknik Riskler -->
        <div class="gp-tech-card">
            <h3>⚠️ Bilinen Teknik Riskler
                <button class="gp-btn-icon" style="font-size:11px;width:auto;padding:3px 8px;float:right;" onclick="gpTechAddRisk()">+ Ekle</button>
            </h3>
            <div id="gp-tech-risks-list">
                ${risks.length===0
                    ? `<div style="color:#475569;font-size:12px;">Henüz risk girilmemiş.</div>`
                    : risks.map((r,i)=>`
                    <div style="padding:8px 12px;background:#0f172a;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;margin-bottom:6px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span style="font-weight:600;color:#fbbf24;font-size:13px;">${gpEsc(r.title)}</span>
                            <button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;" onclick="gpTechDeleteRisk(${i})">×</button>
                        </div>
                        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${gpEsc(r.mitigation||'')}</div>
                    </div>`).join('')
                }
            </div>
        </div>

    </div>

    <!-- Genel Teknik Notlar -->
    <div class="gp-editor-section" style="margin-top:16px;">
        <div class="gp-editor-section-hdr">📝 Genel Teknik Notlar</div>
        <div class="gp-editor-section-body">
            ${window.gpRichToolbarHTML('gp-tech-notes')}
            <div class="gp-richtext" id="gp-tech-notes" contenteditable="true"
                placeholder="Genel teknik notlar, serbest alan..."
                onblur="gpTechSave('notes',this.innerHTML)"
                style="min-height:120px;">${tech.notes||''}</div>
        </div>
    </div>

    <!-- Karar Günlüğü -->
    <div class="gp-editor-section" style="margin-top:16px;">
        <div class="gp-editor-section-hdr">
            📔 Karar Günlüğü
            <button class="gp-btn-primary" style="font-size:12px;padding:5px 12px;" onclick="gpTechAddDecision()">+ Karar Ekle</button>
        </div>
        <div class="gp-editor-section-body">
            <div class="gp-decision-log">
                ${decisions.length===0
                    ? `<div style="color:#475569;font-size:12px;">Henüz karar girilmemiş.<br>Örn: "Neden Unity yerine Godot seçtim?"</div>`
                    : decisions.map((d,i)=>`
                    <div class="gp-decision-item">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong>${gpEsc(d.title)}</strong>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <span style="font-size:10px;color:#475569;">${window.gpFormatDate(d.date)}</span>
                                <button style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:13px;" onclick="gpTechDeleteDecision('${d.id}')">×</button>
                            </div>
                        </div>
                        <div style="margin-top:4px;">${gpEsc(d.reason||'')}</div>
                    </div>`).join('')
                }
            </div>
        </div>
    </div>`;
};

// ── Yardımcılar ─────────────────────────────────────────────────
function gpTechSave(field, value) {
    if (!window.gpActiveProjectId) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/technical/${field}`),value);
}
window.gpTechSave = gpTechSave;

window.gpTechSaveAll = function() {
    gpTechSave('engine',       document.getElementById('gp-tech-engine')?.value||'');
    gpTechSave('architecture', document.getElementById('gp-tech-arch')?.value||'');
    gpTechSave('targetFPS',    document.getElementById('gp-tech-fps')?.value||'');
    gpTechSave('resolution',   document.getElementById('gp-tech-res')?.value||'');
    gpTechSave('sysReq',       document.getElementById('gp-tech-sysreq')?.value||'');
    window.registerAction && window.registerAction('Teknik notlar kaydedildi.');
};

window.gpTechTogglePlatform = function(platform, checked) {
    const current = [...(window.gpActiveProject?.technical?.platforms||[])];
    if (checked && !current.includes(platform)) current.push(platform);
    if (!checked) { const i=current.indexOf(platform); if(i>-1) current.splice(i,1); }
    gpTechSave('platforms', current);
};

window.gpTechAddDep = function() {
    const name    = prompt('Kütüphane / SDK adı:'); if (!name) return;
    const purpose = prompt('Ne için kullanılıyor?','')||'';
    const current = [...(window.gpActiveProject?.technical?.dependencies||[]), { name:name.trim(), purpose }];
    gpTechSave('dependencies', current);
};
window.gpTechDeleteDep = function(i) {
    const current=[...(window.gpActiveProject?.technical?.dependencies||[])]; current.splice(i,1); gpTechSave('dependencies',current);
};

window.gpTechAddRisk = function() {
    const title      = prompt('Risk başlığı:'); if (!title) return;
    const mitigation = prompt('Çözüm / Önlem:','')||'';
    const current    = [...(window.gpActiveProject?.technical?.risks||[]), { title:title.trim(), mitigation }];
    gpTechSave('risks', current);
};
window.gpTechDeleteRisk = function(i) {
    const current=[...(window.gpActiveProject?.technical?.risks||[])]; current.splice(i,1); gpTechSave('risks',current);
};

window.gpTechAddDecision = function() {
    const title  = prompt('"Neden X karar verdim?" — Başlık:'); if (!title) return;
    const reason = prompt('Gerekçe / detay:','')||'';
    const id     = window.gpGenId('dec');
    window.firebaseSet(
        window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/technical/decisions/${id}`),
        { id, title:title.trim(), reason, date:Date.now() }
    );
};
window.gpTechDeleteDecision = function(id) {
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB,`gamePlannerProjects/${window.gpActiveProjectId}/technical/decisions/${id}`),null);
};
