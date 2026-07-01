// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — CORE  (gp-core.js)
//  Proje yönetimi · Modül sistemi · Sihirbaz · Sidebar · Ortak yardımcılar
//  Bu dosya, app.js'in window'a açtığı Firebase referanslarını kullanır
//  (window.spaceGarbageDB / firebaseRef / firebaseSet / firebaseOnValue / firebaseGet)
// ════════════════════════════════════════════════════════════════

// ── Modül tanımları ────────────────────────────────────────────
// 'overview' listede yok çünkü her projede otomatik ve sabittir.
window.GP_MODULE_DEFS = {
    story:      { label: 'Hikaye & Lore',        icon: '📖', tool: 'gp-story-tool',      desc: 'Evren, bölümler, lore ansiklopedisi' },
    characters: { label: 'Karakterler',           icon: '👥', tool: 'gp-characters-tool', desc: 'Kahramanlar, NPC, ilişkiler' },
    mechanics:  { label: 'Mekanikler',            icon: '⚙️', tool: 'gp-mechanics-tool',  desc: 'Core loop, oyun sistemleri' },
    world:      { label: 'Dünya & Seviyeler',     icon: '🗺️', tool: 'gp-world-tool',      desc: 'Harita, lokasyonlar, seviye notları' },
    assets:     { label: 'Asset Galerisi',        icon: '🎨', tool: 'gp-assets-tool',     desc: '2D/3D görsel, ses, animasyon arşivi' },
    dialogue:   { label: 'Diyalog Editörü',       icon: '💬', tool: 'gp-dialogue-tool',   desc: 'Sahne senaryosu & diyalog ağacı' },
    moodboard:  { label: 'Mood Board & Palet',    icon: '🎭', tool: 'gp-moodboard-tool',  desc: 'Referans görseller, renk paleti' },
    tasks:      { label: 'Görev & Roadmap',       icon: '✅', tool: 'gp-tasks-tool',      desc: 'Kanban pano, milestone takibi' },
    technical:  { label: 'Teknik Notlar',         icon: '🔧', tool: 'gp-technical-tool',  desc: 'Engine, mimari, kararlar' }
};

window.GP_GENRE_PRESETS = {
    'RPG':            ['story', 'characters', 'dialogue', 'world', 'assets', 'tasks', 'technical'],
    'Aksiyon':        ['mechanics', 'characters', 'world', 'assets', 'tasks', 'technical'],
    'Puzzle':         ['mechanics', 'assets', 'tasks', 'technical'],
    'Strateji':       ['mechanics', 'world', 'assets', 'tasks', 'technical'],
    'Visual Novel':   ['story', 'characters', 'dialogue', 'moodboard', 'assets', 'tasks', 'technical'],
    'Sandbox':        ['world', 'mechanics', 'characters', 'story', 'assets', 'tasks', 'technical'],
    'Hyper Casual':   ['mechanics', 'assets', 'tasks', 'technical'],
    'Manuel':         ['tasks', 'technical']
};

window.GP_GENRE_ICONS = {
    'RPG': '🗡️', 'Aksiyon': '⚡', 'Puzzle': '🧩', 'Strateji': '🏰',
    'Visual Novel': '📚', 'Sandbox': '🌌', 'Hyper Casual': '⚡', 'Manuel': '🔧'
};

// ── Durum ───────────────────────────────────────────────────────
window.gpProjects = {};            // tüm projeler (DB'den canlı senkronize)
window.gpActiveProjectId = null;
window.gpActiveProject = null;     // o anki seçili projenin tam datası
let gpWizardStep = 1;
let gpWizardSelectedModules = new Set();

// ── Firebase kısayolları (app.js tarafından expose edilmiş) ────
function gpDb()  { return window.spaceGarbageDB; }
function gpRef(path) { return window.firebaseRef(gpDb(), path); }
function gpSet(path, val) { return window.firebaseSet(gpRef(path), val); }

// ════════════════════════════════════════════════════════════════
//  INIT — Firebase canlı dinleme
// ════════════════════════════════════════════════════════════════
function gpInit() {
    window.firebaseOnValue(gpRef('gamePlannerProjects'), (snapshot) => {
        const data = snapshot.val();
        window.gpProjects = data || {};
        window.gpRenderProjectsGrid();

        if (window.gpActiveProjectId) {
            if (window.gpProjects[window.gpActiveProjectId]) {
                window.gpActiveProject = window.gpProjects[window.gpActiveProjectId];
                window.gpRenderSidebarModules();
                // Aktif görünümdeki içerik varsa onu da tazele
                const overviewEl = document.getElementById('gp-overview-tool');
                if (overviewEl && overviewEl.classList.contains('active') && window.gpRenderOverview) window.gpRenderOverview();
                if (window.gpRefreshAllModuleViews) window.gpRefreshAllModuleViews();
            } else {
                // Proje silinmiş (başka bir oturumdan)
                window.gpActiveProjectId = null;
                window.gpActiveProject = null;
                window.gpRenderSidebarModules();
            }
        }
    });

    // Son seçili projeyi hatırla
    try {
        const lastId = localStorage.getItem('gp_last_project');
        if (lastId) { window.gpActiveProjectId = lastId; }
    } catch(e) {}
}

// Admin değilse GamePlanner bölümünü görünmez yap (app.js bu fonksiyonu çağırıyor)
window.gpSetAdminVisible = function(isAdmin) {
    const section = document.querySelector('.gp-section-hdr');
    const body = document.getElementById('body-gp');
    const divider = section ? section.previousElementSibling : null;
    [section, body].forEach(el => { if(el) el.style.display = isAdmin ? '' : 'none'; });
    if (!isAdmin) {
        // Admin değilse ve şu an bir GP aracındaysa item-tool'a dön
        const active = document.querySelector('.tool-section.active');
        if (active && active.id.startsWith('gp-') && window.openTool) window.openTool('item-tool');
    }
};

// ════════════════════════════════════════════════════════════════
//  GENEL NAVİGASYON YARDIMCISI
// ════════════════════════════════════════════════════════════════
window.gpRenderModule = function(key) {
    const fnName = 'gpRender' + key.charAt(0).toUpperCase() + key.slice(1);
    if (typeof window[fnName] === 'function') window[fnName]();
};

window.gpGetActiveProject = function() {
    return window.gpActiveProject;
};

window.gpRequireProject = function(containerEl) {
    if (!window.gpActiveProject) {
        containerEl.innerHTML = `<div class="gp-empty-state">🗂️ Önce bir proje seçmelisin.<br><small>Projelerim sekmesinden bir proje aç veya yeni proje oluştur.</small></div>`;
        return false;
    }
    return true;
};

// ════════════════════════════════════════════════════════════════
//  PROJE LİSTESİ (Grid)
// ════════════════════════════════════════════════════════════════
window.gpRenderProjectsGrid = function() {
    const grid = document.getElementById('gp-projects-grid');
    if (!grid) return;

    const projects = Object.entries(window.gpProjects || {});
    let html = '';

    if (projects.length === 0) {
        html = `<div class="gp-empty-state" style="grid-column:1/-1;">Henüz proje yok.<br><small>Yeni proje oluşturmak için ➕ butonuna tıkla.</small></div>`;
    } else {
        projects
            .sort((a, b) => (b[1].meta?.updatedAt || 0) - (a[1].meta?.updatedAt || 0))
            .forEach(([id, proj]) => {
                const m = proj.meta || {};
                const genreIcon = window.GP_GENRE_ICONS[m.genre] || '🎮';
                const cover = m.coverBase64
                    ? `<img class="gp-project-cover" src="${m.coverBase64}">`
                    : `<div class="gp-project-cover-placeholder">${genreIcon}</div>`;
                html += `
                <div class="gp-project-card" onclick="window.gpSelectProject('${id}')">
                    ${cover}
                    <div class="gp-project-body">
                        <div class="gp-project-genre">${genreIcon} ${m.genre || 'Oyun'}</div>
                        <h3 class="gp-project-name">${m.name || 'İsimsiz Proje'}</h3>
                        <p class="gp-project-pitch">${m.pitch || 'Henüz pitch yazılmamış.'}</p>
                    </div>
                    <div class="gp-project-footer">
                        <span class="gp-status-badge">${m.status || 'Fikir'}</span>
                        <span style="font-size:11px;color:#475569;">${m.engine || ''}</span>
                    </div>
                </div>`;
            });
        html += `<div class="gp-add-card" onclick="window.gpOpenWizard()"><div style="font-size:34px;">➕</div><span>Yeni Proje</span></div>`;
    }
    grid.innerHTML = html;
};

window.gpSelectProject = function(id) {
    window.gpActiveProjectId = id;
    window.gpActiveProject = window.gpProjects[id];
    try { localStorage.setItem('gp_last_project', id); } catch(e) {}
    window.gpRenderSidebarModules();
    const btn = document.getElementById('nav-gp-overview');
    if (btn) btn.click();
};

// ════════════════════════════════════════════════════════════════
//  SIDEBAR — Aktif Projenin Modülleri
// ════════════════════════════════════════════════════════════════
window.gpRenderSidebarModules = function() {
    const wrap = document.getElementById('gp-active-modules');
    const overviewBtn = document.getElementById('nav-gp-overview');
    if (!wrap) return;

    if (!window.gpActiveProject) {
        wrap.innerHTML = `<div style="padding:8px 20px;font-size:11px;color:#475569;font-style:italic;">Proje seçin...</div>`;
        if (overviewBtn) overviewBtn.style.display = 'none';
        return;
    }

    if (overviewBtn) overviewBtn.style.display = 'block';

    const activeModules = (window.gpActiveProject.meta && window.gpActiveProject.meta.activeModules) || [];
    let html = '';
    Object.keys(window.GP_MODULE_DEFS).forEach(key => {
        if (!activeModules.includes(key)) return;
        const def = window.GP_MODULE_DEFS[key];
        html += `<button class="nav-btn sub-nav gp-nav" id="gp-modbtn-${key}" onclick="openTool('${def.tool}'); window.gpRenderModule('${key}')">${def.icon} ${def.label}</button>`;
    });
    wrap.innerHTML = html || `<div style="padding:8px 20px;font-size:11px;color:#475569;font-style:italic;">Bu projede aktif modül yok.<br>Proje Ayarları'ndan ekleyebilirsin.</div>`;
};

// Tüm modül görünümlerini (eğer render fonksiyonları tanımlıysa) tazele — Firebase güncellemesi geldiğinde
window.gpRefreshAllModuleViews = function() {
    Object.keys(window.GP_MODULE_DEFS).forEach(key => {
        const def = window.GP_MODULE_DEFS[key];
        const sec = document.getElementById(def.tool);
        if (sec && sec.classList.contains('active')) window.gpRenderModule(key);
    });
};

// ════════════════════════════════════════════════════════════════
//  PROJE OLUŞTURMA SİHİRBAZI
// ════════════════════════════════════════════════════════════════
window.gpOpenWizard = function() {
    gpWizardStep = 1;
    gpWizardSelectedModules = new Set();
    document.getElementById('gp-w-name').value = '';
    document.getElementById('gp-w-genre').value = 'RPG';
    document.getElementById('gp-w-platform').value = 'PC';
    document.getElementById('gp-w-engine').value = 'Unity';
    document.getElementById('gp-w-status').value = 'Fikir';
    document.getElementById('gp-w-pitch').value = '';
    gpWizardShowStep(1);
    document.getElementById('gp-wizard-modal').style.display = 'flex';
};

window.gpCloseWizard = function() {
    document.getElementById('gp-wizard-modal').style.display = 'none';
};

function gpWizardShowStep(step) {
    for (let i = 1; i <= 3; i++) {
        document.getElementById('gp-wizard-step-' + i).style.display = (i === step) ? 'block' : 'none';
        const dot = document.getElementById('gp-step-dot-' + i);
        dot.classList.remove('active', 'done');
        if (i < step) dot.classList.add('done');
        if (i === step) dot.classList.add('active');
    }
    document.getElementById('gp-wizard-back').style.display = (step === 1) ? 'none' : 'inline-block';
    document.getElementById('gp-wizard-next').innerText = (step === 3) ? '🚀 Projeyi Oluştur' : 'İleri →';
}

window.gpWizardNav = function(direction) {
    if (direction === 1) {
        if (gpWizardStep === 1) {
            const name = document.getElementById('gp-w-name').value.trim();
            if (!name) { alert('Lütfen bir oyun adı gir.'); return; }
            // Genre preset'i ön-seç
            const genre = document.getElementById('gp-w-genre').value;
            gpWizardSelectedModules = new Set(window.GP_GENRE_PRESETS[genre] || []);
            gpRenderModuleCheckboxes();
            gpWizardStep = 2;
            gpWizardShowStep(2);
        } else if (gpWizardStep === 2) {
            gpRenderWizardSummary();
            gpWizardStep = 3;
            gpWizardShowStep(3);
        } else if (gpWizardStep === 3) {
            window.gpCreateProject();
        }
    } else {
        if (gpWizardStep > 1) { gpWizardStep--; gpWizardShowStep(gpWizardStep); }
    }
};

function gpRenderModuleCheckboxes(targetId = 'gp-module-checkboxes', selectedSet = gpWizardSelectedModules, onChangeCb = null) {
    const container = document.getElementById(targetId);
    if (!container) return;
    let html = '';
    Object.entries(window.GP_MODULE_DEFS).forEach(([key, def]) => {
        const checked = selectedSet.has(key);
        html += `
        <label class="gp-module-check ${checked ? 'checked' : ''}" id="${targetId}-${key}">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="window.gpToggleModuleCheckbox('${targetId}', '${key}', this.checked)">
            <span class="gp-module-check-icon">${def.icon}</span>
            <span>
                <span class="gp-module-check-label">${def.label}</span><br>
                <span class="gp-module-check-desc">${def.desc}</span>
            </span>
        </label>`;
    });
    container.innerHTML = html;
    container.dataset.onchangeCb = onChangeCb || '';
}

window.gpToggleModuleCheckbox = function(targetId, key, isChecked) {
    const set = targetId === 'gp-module-checkboxes' ? gpWizardSelectedModules : gpSettingsSelectedModules;
    if (isChecked) set.add(key); else set.delete(key);
    const label = document.getElementById(targetId + '-' + key);
    if (label) label.classList.toggle('checked', isChecked);
};

function gpRenderWizardSummary() {
    const name = document.getElementById('gp-w-name').value.trim();
    const genre = document.getElementById('gp-w-genre').value;
    const platform = document.getElementById('gp-w-platform').value;
    const engine = document.getElementById('gp-w-engine').value;
    const status = document.getElementById('gp-w-status').value;
    const moduleList = Array.from(gpWizardSelectedModules).map(k => window.GP_MODULE_DEFS[k]?.label).filter(Boolean).join(', ') || 'Hiçbiri';

    document.getElementById('gp-wizard-summary').innerHTML = `
        <h4>${window.GP_GENRE_ICONS[genre] || '🎮'} ${name}</h4>
        <p><strong>Tür:</strong> ${genre} &nbsp;|&nbsp; <strong>Platform:</strong> ${platform} &nbsp;|&nbsp; <strong>Engine:</strong> ${engine}</p>
        <p><strong>Durum:</strong> ${status}</p>
        <p><strong>Aktif Modüller:</strong> ${moduleList}</p>
        <p style="margin-top:10px;color:#475569;font-size:11px;">Modülleri istediğin zaman Proje Ayarları'ndan değiştirebilirsin.</p>
    `;
}

window.gpCreateProject = function() {
    const name = document.getElementById('gp-w-name').value.trim();
    if (!name) { alert('Lütfen bir oyun adı gir.'); return; }

    const id = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const now = Date.now();
    const meta = {
        name,
        genre: document.getElementById('gp-w-genre').value,
        platform: document.getElementById('gp-w-platform').value,
        engine: document.getElementById('gp-w-engine').value,
        status: document.getElementById('gp-w-status').value,
        pitch: document.getElementById('gp-w-pitch').value.trim(),
        coverBase64: null,
        createdAt: now,
        updatedAt: now,
        activeModules: Array.from(gpWizardSelectedModules)
    };

    gpSet('gamePlannerProjects/' + id + '/meta', meta).then(() => {
        window.gpActiveProjectId = id;
        window.gpActiveProject = { meta };
        try { localStorage.setItem('gp_last_project', id); } catch(e) {}
        window.gpCloseWizard();
        window.gpRenderSidebarModules();
        const btn = document.getElementById('nav-gp-overview');
        if (btn) btn.click();
        window.registerAction && window.registerAction(`"${name}" adlı yeni GamePlanner projesi oluşturuldu.`);
    }).catch(err => {
        console.error('GP project create error:', err);
        alert('Proje oluşturulurken bir hata oluştu.');
    });
};

// ════════════════════════════════════════════════════════════════
//  PROJE AYARLARI (modül ekle/çıkar, yeniden adlandır, sil)
// ════════════════════════════════════════════════════════════════
let gpSettingsSelectedModules = new Set();

window.gpOpenProjectSettings = function() {
    if (!window.gpActiveProject) return;
    const m = window.gpActiveProject.meta || {};
    document.getElementById('gp-set-name').value = m.name || '';
    document.getElementById('gp-set-status').value = m.status || 'Fikir';
    document.getElementById('gp-set-engine').value = m.engine || 'Unity';
    document.getElementById('gp-set-pitch').value = m.pitch || '';

    gpSettingsSelectedModules = new Set(m.activeModules || []);
    gpRenderModuleCheckboxes('gp-set-module-checkboxes', gpSettingsSelectedModules);

    document.getElementById('gp-settings-modal').style.display = 'flex';
};

window.gpSaveSettings = function() {
    if (!window.gpActiveProjectId) return;
    const id = window.gpActiveProjectId;
    const name = document.getElementById('gp-set-name').value.trim();
    if (!name) { alert('Proje adı boş olamaz.'); return; }

    const updates = {
        name,
        status: document.getElementById('gp-set-status').value,
        engine: document.getElementById('gp-set-engine').value,
        pitch: document.getElementById('gp-set-pitch').value.trim(),
        activeModules: Array.from(gpSettingsSelectedModules),
        updatedAt: Date.now()
    };

    const writes = Object.entries(updates).map(([field, val]) =>
        gpSet(`gamePlannerProjects/${id}/meta/${field}`, val)
    );

    Promise.all(writes).then(() => {
        document.getElementById('gp-settings-modal').style.display = 'none';
        window.registerAction && window.registerAction('Proje ayarları güncellendi.');
    }).catch(err => {
        console.error('GP settings save error:', err);
        alert('Ayarlar kaydedilirken hata oluştu.');
    });
};

window.gpUploadCover = function(event) {
    const file = event.target.files[0];
    if (!file || !window.gpActiveProjectId) return;
    window.fileToBase64(file).then(base64 => {
        gpSet(`gamePlannerProjects/${window.gpActiveProjectId}/meta/coverBase64`, base64);
        window.registerAction && window.registerAction('Proje kapak görseli güncellendi.');
    });
};

window.gpDeleteActiveProject = function() {
    if (!window.gpActiveProjectId) return;
    const name = window.gpActiveProject?.meta?.name || 'Bu proje';
    if (!confirm(`"${name}" projesini ve TÜM içeriğini (karakterler, assetler, görevler vb.) kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.`)) return;

    const id = window.gpActiveProjectId;
    gpSet('gamePlannerProjects/' + id, null).then(() => {
        window.gpActiveProjectId = null;
        window.gpActiveProject = null;
        try { localStorage.removeItem('gp_last_project'); } catch(e) {}
        document.getElementById('gp-settings-modal').style.display = 'none';
        window.gpRenderSidebarModules();
        const btn = document.getElementById('nav-gp-projects');
        if (btn) btn.click();
        window.registerAction && window.registerAction(`"${name}" projesi silindi.`);
    });
};

// ════════════════════════════════════════════════════════════════
//  LIGHTBOX — Asset / Mood Board görsel önizleme (genel kullanım)
// ════════════════════════════════════════════════════════════════
window.gpOpenLightbox = function(bodyHtml, metaHtml = '') {
    document.getElementById('gp-lightbox-body').innerHTML = bodyHtml;
    document.getElementById('gp-lightbox-meta').innerHTML = metaHtml;
    document.getElementById('gp-lightbox').style.display = 'flex';
};

window.gpCloseLightbox = function(event) {
    if (event && event.target.closest('.gp-lightbox-inner') && event.type === 'click') return;
    document.getElementById('gp-lightbox').style.display = 'none';
    document.getElementById('gp-lightbox-body').innerHTML = '';
};

// ════════════════════════════════════════════════════════════════
//  ORTAK YARDIMCI FONKSİYONLAR (diğer GP modülleri kullanacak)
// ════════════════════════════════════════════════════════════════

// Benzersiz id üretici (Firebase push() kullanmadan basit yöntem)
window.gpGenId = function(prefix = 'id') {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
};

// HTML injection'a karşı temel kaçış
window.gpEsc = function(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
};

// Basit zengin-metin araç çubuğu üretici (story/technical/characters paylaşıyor)
window.gpRichToolbarHTML = function(targetId) {
    return `
    <div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;">
        <button type="button" class="gp-btn-icon" onmousedown="event.preventDefault();document.execCommand('bold',false,null)" title="Kalın"><b>K</b></button>
        <button type="button" class="gp-btn-icon" onmousedown="event.preventDefault();document.execCommand('italic',false,null)" title="Eğik"><i>E</i></button>
        <button type="button" class="gp-btn-icon" onmousedown="event.preventDefault();document.execCommand('underline',false,null)" title="Altı Çizili"><u>A</u></button>
        <button type="button" class="gp-btn-icon" onmousedown="event.preventDefault();document.execCommand('insertUnorderedList',false,null)" title="Liste">•≡</button>
    </div>`;
};

// Asset/modül tipi -> ikon eşlemesi (assets modülü ve lightbox tarafından kullanılacak)
window.gpFileTypeIcon = function(fileName, mimeType) {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (['png','jpg','jpeg','webp'].includes(ext)) return '🖼️';
    if (ext === 'gif') return '🎞️';
    if (['glb','gltf','obj','fbx'].includes(ext)) return '🧊';
    if (['mp4','webm','mov'].includes(ext)) return '🎬';
    if (['mp3','wav','ogg'].includes(ext)) return '🎵';
    if (ext === 'json') return '🗂️';
    return '📄';
};

// Tarih formatlama (TR)
window.gpFormatDate = function(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('tr-TR', { day:'2-digit', month:'short', year:'numeric' });
};

// ════════════════════════════════════════════════════════════════
//  EXPORT MODAL — modül listesini doldur (gerçek export gp-export.js'de)
// ════════════════════════════════════════════════════════════════
window.gpOpenExportModal = function() {
    if (!window.gpActiveProject) { alert('Önce bir proje seçmelisin.'); return; }
    const wrap = document.getElementById('gp-export-modules');
    if (wrap) {
        const activeModules = (window.gpActiveProject.meta?.activeModules) || [];
        wrap.innerHTML = activeModules.map(key => {
            const def = window.GP_MODULE_DEFS[key];
            if (!def) return '';
            return `<button class="gp-btn-secondary" onclick="window.gpExportSingleModule && window.gpExportSingleModule('${key}')">${def.icon} ${def.label}</button>`;
        }).join('');
    }
    document.getElementById('gp-export-modal').style.display = 'flex';
};

// ════════════════════════════════════════════════════════════════
//  BAŞLAT
// ════════════════════════════════════════════════════════════════
gpInit();
