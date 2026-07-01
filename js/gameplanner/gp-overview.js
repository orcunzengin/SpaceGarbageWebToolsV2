// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — GENEL BAKIŞ  (gp-overview.js)
//  Projenin vitrin ekranı: kimlik, durum, istatistikler, hızlı erişim
// ════════════════════════════════════════════════════════════════

const GP_STATUS_FLOW = ['Fikir', 'Pre-Production', 'Production', 'Alpha', 'Beta'];
const GP_STATUS_COLORS = {
    'Fikir': '#64748b', 'Pre-Production': '#f59e0b', 'Production': '#3b82f6',
    'Alpha': '#a78bfa', 'Beta': '#10b981'
};

window.gpRenderOverview = function() {
    const container = document.getElementById('gp-overview-content');
    if (!container) return;
    if (!window.gpRequireProject(container)) return;

    const proj = window.gpActiveProject;
    const m = proj.meta || {};
    const genreIcon = window.GP_GENRE_ICONS[m.genre] || '🎮';
    const statusColor = GP_STATUS_COLORS[m.status] || '#64748b';

    const stats = gpCalcProjectStats(proj);
    const activeModules = m.activeModules || [];

    container.innerHTML = `
        <div class="gp-page-hdr">
            <div style="display:flex;gap:16px;align-items:center;">
                ${m.coverBase64
                    ? `<img src="${m.coverBase64}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:1px solid #2d2f45;cursor:pointer;" onclick="window.gpOpenLightbox('<img src=&quot;${m.coverBase64}&quot; style=&quot;max-width:80vw;max-height:80vh;&quot;>','${gpEsc(m.name)}')">`
                    : `<div style="width:80px;height:80px;border-radius:12px;background:linear-gradient(135deg,#1e1b4b,#4c1d95);display:flex;align-items:center;justify-content:center;font-size:34px;">${genreIcon}</div>`
                }
                <div>
                    <div style="font-size:11px;color:#a78bfa;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${genreIcon} ${gpEsc(m.genre || '')} &nbsp;·&nbsp; ${gpEsc(m.platform || '')} &nbsp;·&nbsp; ${gpEsc(m.engine || '')}</div>
                    <h1 class="gp-title" style="font-size:26px;">${gpEsc(m.name || 'İsimsiz Proje')}</h1>
                </div>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="gp-btn-secondary" onclick="window.gpOpenProjectSettings()">⚙️ Ayarlar</button>
                <button class="gp-btn-primary" onclick="window.gpOpenExportModal()">📤 Dışa Aktar</button>
            </div>
        </div>

        <div class="gp-editor-section">
            <div class="gp-editor-section-hdr">
                📋 Pitch
                <select id="gp-ov-status-select" onchange="window.gpUpdateStatus(this.value)" style="background:#0f172a;border:1px solid ${statusColor};color:${statusColor};padding:5px 10px;border-radius:20px;font-weight:700;font-size:12px;cursor:pointer;">
                    ${GP_STATUS_FLOW.map(s => `<option value="${s}" ${m.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
            <div class="gp-editor-section-body">
                <p contenteditable="true" id="gp-ov-pitch" onblur="window.gpUpdatePitch(this.innerText)" style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0;min-height:24px;outline:none;">${gpEsc(m.pitch) || 'Pitch metni yazmak için tıkla...'}</p>
            </div>
        </div>

        <div class="gp-stat-grid">
            <div class="gp-stat-card"><div class="gp-stat-num">${stats.characters}</div><div class="gp-stat-label">👥 Karakter</div></div>
            <div class="gp-stat-card"><div class="gp-stat-num">${stats.mechanics}</div><div class="gp-stat-label">⚙️ Mekanik</div></div>
            <div class="gp-stat-card"><div class="gp-stat-num">${stats.chapters}</div><div class="gp-stat-label">📖 Bölüm</div></div>
            <div class="gp-stat-card"><div class="gp-stat-num">${stats.locations}</div><div class="gp-stat-label">🗺️ Lokasyon</div></div>
            <div class="gp-stat-card"><div class="gp-stat-num">${stats.assets}</div><div class="gp-stat-label">🎨 Asset</div></div>
            <div class="gp-stat-card"><div class="gp-stat-num">${stats.tasksDone}/${stats.tasksTotal}</div><div class="gp-stat-label">✅ Görev</div></div>
        </div>

        <div class="gp-editor-section">
            <div class="gp-editor-section-hdr">📈 Proje Doluluğu</div>
            <div class="gp-editor-section-body">
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-bottom:4px;">
                    <span>Genel İlerleme</span><span>${stats.completionPct}%</span>
                </div>
                <div class="gp-progress-bar"><div class="gp-progress-fill" style="width:${stats.completionPct}%;"></div></div>
            </div>
        </div>

        <div class="gp-editor-section">
            <div class="gp-editor-section-hdr">🧩 Aktif Modüller — Hızlı Erişim</div>
            <div class="gp-editor-section-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;">
                ${activeModules.length === 0
                    ? `<div style="color:#475569;font-size:13px;grid-column:1/-1;">Hiç modül aktif değil. ⚙️ Ayarlar'dan ekleyebilirsin.</div>`
                    : activeModules.map(key => {
                        const def = window.GP_MODULE_DEFS[key];
                        if (!def) return '';
                        return `<div class="gp-list-card" style="border:1px solid #2d2f45;border-radius:8px;flex-direction:column;align-items:flex-start;gap:6px;" onclick="document.getElementById('gp-modbtn-${key}')?.click()">
                            <div style="font-size:24px;">${def.icon}</div>
                            <div class="gp-list-card-name">${def.label}</div>
                            <div class="gp-list-card-sub">${def.desc}</div>
                        </div>`;
                    }).join('')
                }
            </div>
        </div>

        <div style="text-align:center;color:#334155;font-size:11px;margin-top:10px;">
            Oluşturulma: ${gpFormatDate(m.createdAt)} &nbsp;·&nbsp; Son güncelleme: ${gpFormatDate(m.updatedAt)}
        </div>
    `;
};

function gpCalcProjectStats(proj) {
    const characters = Object.keys(proj.characters || {}).length;
    const mechanics = Object.keys(proj.mechanics || {}).length;
    const chapters = Object.keys((proj.story && proj.story.chapters) || {}).length;
    const locations = Object.keys((proj.world && proj.world.locations) || {}).length;
    const assets = Object.keys(proj.assets || {}).length;

    const tasksObj = proj.tasks || {};
    const taskEntries = Object.entries(tasksObj).filter(([k]) => k !== 'milestones');
    const tasksTotal = taskEntries.length;
    const tasksDone = taskEntries.filter(([, t]) => t.status === 'done').length;

    // Çok kabaca bir doluluk yüzdesi: her dolu kategori için puan
    const activeModules = (proj.meta && proj.meta.activeModules) || [];
    let filledScore = 0, maxScore = activeModules.length || 1;
    if (activeModules.includes('characters')) filledScore += characters > 0 ? 1 : 0;
    if (activeModules.includes('mechanics')) filledScore += mechanics > 0 ? 1 : 0;
    if (activeModules.includes('story')) filledScore += chapters > 0 ? 1 : 0;
    if (activeModules.includes('world')) filledScore += locations > 0 ? 1 : 0;
    if (activeModules.includes('assets')) filledScore += assets > 0 ? 1 : 0;
    if (activeModules.includes('tasks')) filledScore += tasksTotal > 0 ? 1 : 0;
    if (activeModules.includes('technical')) filledScore += (proj.technical && proj.technical.engine) ? 1 : 0;
    if (activeModules.includes('dialogue')) filledScore += Object.keys((proj.dialogue && proj.dialogue.scenes) || {}).length > 0 ? 1 : 0;
    if (activeModules.includes('moodboard')) filledScore += Object.keys((proj.moodboard && proj.moodboard.images) || {}).length > 0 ? 1 : 0;

    const completionPct = Math.round((filledScore / maxScore) * 100);

    return { characters, mechanics, chapters, locations, assets, tasksDone, tasksTotal, completionPct };
}

window.gpUpdateStatus = function(newStatus) {
    if (!window.gpActiveProjectId) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/meta/status`), newStatus);
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/meta/updatedAt`), Date.now());
    window.registerAction && window.registerAction(`Proje durumu "${newStatus}" olarak güncellendi.`);
};

window.gpUpdatePitch = function(text) {
    if (!window.gpActiveProjectId) return;
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/meta/pitch`), text.trim());
    window.firebaseSet(window.firebaseRef(window.spaceGarbageDB, `gamePlannerProjects/${window.gpActiveProjectId}/meta/updatedAt`), Date.now());
};
