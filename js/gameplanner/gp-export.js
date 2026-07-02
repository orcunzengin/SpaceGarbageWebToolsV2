// ════════════════════════════════════════════════════════════════
//  GAME PLANNER — EXPORT SİSTEMİ  (gp-export.js)
// ════════════════════════════════════════════════════════════════

// ── Tam GDD HTML Export ────────────────────────────────────────
window.gpExportHTML = function() {
    const proj = window.gpActiveProject; if(!proj) return;
    const m    = proj.meta||{};
    const html = gpBuildFullHTML(proj, m);
    const blob = new Blob([html], {type:'text/html;charset=utf-8'});
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${(m.name||'GamePlan').replace(/\s+/g,'_')}_GDD.html`;
    a.click();
    document.getElementById('gp-export-modal').style.display='none';
};

function gpBuildFullHTML(proj, m) {
    const palette = (proj.moodboard?.palette||[]).map(c=>`<span style="display:inline-block;width:28px;height:28px;background:${c};border-radius:6px;margin:2px;" title="${c}"></span>`).join('');
    const chars   = Object.values(proj.characters||{});
    const mechs   = Object.values(proj.mechanics||{});
    const chapters= Object.values(proj.story?.chapters||{}).sort((a,b)=>(a.order||0)-(b.order||0));
    const locs    = Object.values(proj.world?.locations||{});
    const levels  = Object.values(proj.world?.levels||{}).sort((a,b)=>(a.order||0)-(b.order||0));
    const tasks   = Object.values(proj.tasks||{}).filter(t=>t.id);
    const assets  = Object.values(proj.assets||{});
    const tech    = proj.technical||{};
    const scenes  = Object.values(proj.dialogue?.scenes||{}).sort((a,b)=>(a.order||0)-(b.order||0));

    const section = (icon,title,content) => `
    <section style="margin-bottom:40px;page-break-inside:avoid;">
        <h2 style="color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:8px;">${icon} ${title}</h2>
        ${content}
    </section>`;

    const card = (title,content,accent='#7c3aed') => `
    <div style="background:#f8f7ff;border:1px solid #e5e7eb;border-left:4px solid ${accent};border-radius:8px;padding:16px;margin-bottom:12px;">
        ${title?`<h3 style="margin:0 0 8px;color:#1e1b4b;">${title}</h3>`:''}
        ${content}
    </div>`;

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${m.name||'Oyun'} — GDD</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',sans-serif;color:#1e1b4b;background:#fff;max-width:900px;margin:0 auto;padding:30px 20px;}
h1{font-size:2.2rem;margin-bottom:4px;}
h2{font-size:1.4rem;margin-bottom:12px;}
h3{font-size:1.1rem;margin-bottom:6px;}
p{line-height:1.7;color:#374151;margin-bottom:8px;}
img{max-width:100%;border-radius:8px;}
table{width:100%;border-collapse:collapse;margin-bottom:12px;}
th,td{padding:8px 12px;border:1px solid #e5e7eb;text-align:left;font-size:13px;}
th{background:#f3f4f6;font-weight:700;}
.badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:#ede9fe;color:#5b21b6;margin:2px;}
@media print{section{page-break-inside:avoid;}a{text-decoration:none;}}
</style>
</head>
<body>

<!-- KAPAK -->
<div style="text-align:center;padding:40px 0 30px;border-bottom:2px solid #7c3aed;margin-bottom:40px;">
    ${m.coverBase64?`<img src="${m.coverBase64}" style="width:200px;height:200px;object-fit:cover;border-radius:16px;margin-bottom:20px;border:3px solid #7c3aed;">`:`<div style="width:120px;height:120px;background:linear-gradient(135deg,#4c1d95,#7c3aed);border-radius:16px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:48px;">🎮</div>`}
    <h1>${m.name||'İsimsiz Oyun'}</h1>
    <p style="color:#7c3aed;font-weight:700;font-size:16px;">${m.genre||''} · ${m.platform||''} · ${m.engine||''}</p>
    <span class="badge" style="font-size:13px;padding:4px 14px;">${m.status||'Fikir'}</span>
    <p style="margin-top:16px;max-width:600px;margin-left:auto;margin-right:auto;color:#6b7280;">${m.pitch||''}</p>
    <div style="margin-top:16px;">${palette}</div>
</div>

<!-- İÇİNDEKİLER -->
<section style="margin-bottom:30px;">
    <h2 style="color:#7c3aed;">📋 İçindekiler</h2>
    <ol style="color:#4b5563;padding-left:20px;line-height:2;">
        ${chapters.length?'<li><a href="#story" style="color:#7c3aed;">Hikaye & Lore</a></li>':''}
        ${chars.length?'<li><a href="#characters" style="color:#7c3aed;">Karakterler</a></li>':''}
        ${mechs.length?'<li><a href="#mechanics" style="color:#7c3aed;">Mekanikler</a></li>':''}
        ${locs.length||levels.length?'<li><a href="#world" style="color:#7c3aed;">Dünya & Seviyeler</a></li>':''}
        ${scenes.length?'<li><a href="#dialogue" style="color:#7c3aed;">Diyaloglar</a></li>':''}
        ${assets.length?'<li><a href="#assets" style="color:#7c3aed;">Assetler</a></li>':''}
        ${tasks.length?'<li><a href="#tasks" style="color:#7c3aed;">Görevler</a></li>':''}
        ${tech.engine?'<li><a href="#technical" style="color:#7c3aed;">Teknik Notlar</a></li>':''}
    </ol>
</section>

${chapters.length||proj.story?.worldOverview?section('📖','Hikaye & Lore',`
<div id="story"></div>
${proj.story?.worldOverview?card('🌍 Dünya Genel Bakışı',`<div>${proj.story.worldOverview}</div>`):''}
${chapters.map(ch=>card(`Bölüm ${ch.order}: ${ch.title||''}`,`
    <p>${ch.summary||''}</p>
    ${ch.narrative?`<div style="margin-top:8px;">${ch.narrative}</div>`:''}
    ${(ch.events||[]).length?`<ul style="margin-top:8px;padding-left:20px;">${(ch.events||[]).map(e=>`<li>${e}</li>`).join('')}</ul>`:''}`,'#4f46e5')).join('')}
`):''}

${chars.length?section('👥','Karakterler',`
<div id="characters"></div>
<table>
<thead><tr><th>Ad</th><th>Rol</th><th>Yaş/Tür</th><th>Köken</th><th>Gameplay Rolü</th></tr></thead>
<tbody>
${chars.map(c=>`<tr>
    <td><strong>${c.name||''}</strong></td>
    <td><span class="badge">${c.role||''}</span></td>
    <td>${c.ageType||''}</td>
    <td>${c.origin||''}</td>
    <td>${c.gameplayRole||''}</td>
</tr>`).join('')}
</tbody>
</table>
${chars.filter(c=>c.backstory).map(c=>card(c.name,`<div>${c.backstory}</div>`,'#7c3aed')).join('')}
`):''}

${mechs.length?section('⚙️','Mekanikler',`
<div id="mechanics"></div>
<table>
<thead><tr><th>Mekanik</th><th>Tür</th><th>Öncelik</th><th>Açıklama</th></tr></thead>
<tbody>
${mechs.map(m=>`<tr>
    <td><strong>${m.name||''}</strong></td>
    <td>${m.type||''}</td>
    <td><span class="badge" style="background:${m.priority==='Core Loop'?'#d1fae5':m.priority==='İptal Edildi'?'#fee2e2':'#ede9fe'};color:${m.priority==='Core Loop'?'#065f46':m.priority==='İptal Edildi'?'#7f1d1d':'#4c1d95'};">${m.priority||''}</span></td>
    <td>${m.description||''}</td>
</tr>`).join('')}
</tbody>
</table>
${mechs.filter(m=>m.details).map(m=>card(m.name,`<div>${m.details}</div>`,'#0d9488')).join('')}
`):''}

${locs.length||levels.length?section('🗺️','Dünya & Seviyeler',`
<div id="world"></div>
${proj.world?.mapBase64?`<img src="${proj.world.mapBase64}" style="max-width:100%;margin-bottom:16px;"><br>`:''}
${locs.length?`<h3 style="margin-bottom:10px;">Lokasyonlar</h3>
<table><thead><tr><th>Lokasyon</th><th>Tür</th><th>Atmosfer</th><th>Gameplay Notu</th></tr></thead>
<tbody>${locs.map(l=>`<tr><td><strong>${l.name||''}</strong></td><td>${l.type||''}</td><td>${l.atmosphere||''}</td><td>${l.gameplayNote||''}</td></tr>`).join('')}</tbody></table>`:''}
${levels.length?`<h3 style="margin:16px 0 10px;">Seviye Tasarım Notları</h3>
<table><thead><tr><th>Sıra</th><th>Seviye</th><th>Zorluk</th><th>Hedef</th><th>Öğrettiği Mekanik</th></tr></thead>
<tbody>${levels.map(l=>`<tr><td>${l.order||''}</td><td><strong>${l.name||''}</strong></td><td>${l.difficulty||''}/10</td><td>${l.goal||''}</td><td>${l.teachMechanic||''}</td></tr>`).join('')}</tbody></table>`:''}
`):''}

${scenes.length?section('💬','Diyaloglar',`
<div id="dialogue"></div>
${scenes.map(s=>card(`🎬 ${s.title||''} ${s.location?`<span style="font-size:11px;color:#6b7280;">— ${s.location}</span>`:''}`,`
${(s.lines||[]).map(line=>`
<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #f3f4f6;">
    <span style="font-weight:700;min-width:100px;color:#4f46e5;">${line.speaker||'ANLATICI'}</span>
    <span style="color:${line.type==='choice'?'#d97706':line.type==='action'?'#6b7280':'#1e1b4b'};">${line.type==='choice'?'▶ ':line.type==='action'?'[AKSİYON] ':''}${line.text||''}</span>
</div>`).join('')}
`,'#f59e0b')).join('')}
`):''}

${assets.length?section('🎨','Asset Listesi',`
<div id="assets"></div>
<table><thead><tr><th>Asset</th><th>Kategori</th><th>Not</th></tr></thead>
<tbody>${assets.map(a=>`<tr><td>${a.name||''}</td><td>${a.category||''}</td><td>${a.notes||''}</td></tr>`).join('')}</tbody></table>
`):''}

${tasks.filter(t=>t.id).length?section('✅','Görevler',`
<div id="tasks"></div>
<table><thead><tr><th>Görev</th><th>Durum</th><th>Öncelik</th><th>Kategori</th></tr></thead>
<tbody>${tasks.map(t=>`<tr>
    <td>${t.title||''}</td>
    <td>${t.status||''}</td>
    <td>${t.priority||''}</td>
    <td>${t.category||''}</td>
</tr>`).join('')}</tbody></table>
`):''}

${tech.engine?section('🔧','Teknik Notlar',`
<div id="technical"></div>
${card('',`
<table><tbody>
    <tr><th>Engine</th><td>${tech.engine||''}</td></tr>
    <tr><th>Platformlar</th><td>${(tech.platforms||[]).join(', ')||''}</td></tr>
    <tr><th>Mimari</th><td>${tech.architecture||''}</td></tr>
    <tr><th>Hedef FPS</th><td>${tech.targetFPS||''}</td></tr>
    <tr><th>Çözünürlük</th><td>${tech.resolution||''}</td></tr>
    <tr><th>Min. Gereksinim</th><td>${tech.sysReq||''}</td></tr>
</tbody></table>
${tech.notes?`<div style="margin-top:12px;">${tech.notes}</div>`:''}`)}
${(tech.dependencies||[]).length?card('Bağımlılıklar',`<ul style="padding-left:20px;">${(tech.dependencies||[]).map(d=>`<li><strong>${d.name}</strong>${d.purpose?` — ${d.purpose}`:''}</li>`).join('')}</ul>`):''}
${Object.values(tech.decisions||{}).length?card('Karar Günlüğü',Object.values(tech.decisions||{}).sort((a,b)=>(b.date||0)-(a.date||0)).map(d=>`<div style="margin-bottom:8px;"><strong>${d.title}</strong><br><span style="color:#6b7280;font-size:12px;">${d.reason||''}</span></div>`).join('')):''}
`):''}

<footer style="margin-top:60px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;text-align:center;">
    ${m.name||'Oyun'} GDD · Oluşturulma: ${new Date().toLocaleDateString('tr-TR')} · GamePlanner
</footer>
</body></html>`;
}

// ── JSON Yedek ─────────────────────────────────────────────────
window.gpExportJSON = function() {
    const proj = window.gpActiveProject; if(!proj) return;
    const json = JSON.stringify(proj, null, 2);
    const blob = new Blob([json],{type:'application/json'});
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `${(proj.meta?.name||'GamePlan').replace(/\s+/g,'_')}_backup.json`;
    a.click();
    document.getElementById('gp-export-modal').style.display='none';
};

// ── ZIP Paketi (JSZip ile) ─────────────────────────────────────
window.gpExportZIP = async function() {
    const proj = window.gpActiveProject; if(!proj) return;
    const m    = proj.meta||{};

    // JSZip CDN'den yükle (ilk çağrıda bir kere)
    if (typeof JSZip === 'undefined') {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    const zip      = new JSZip();
    const projName = (m.name||'GamePlan').replace(/\s+/g,'_');
    const root     = zip.folder(projName);

    // GDD HTML
    root.file('GDD.html', gpBuildFullHTML(proj, m));
    // JSON yedek
    root.file('data.json', JSON.stringify(proj, null, 2));

    // Karakterler
    const charFolder = root.folder('characters');
    Object.values(proj.characters||{}).forEach(c=>{
        let txt = `Karakter: ${c.name||''}\nRol: ${c.role||''}\nYaş/Tür: ${c.ageType||''}\nKöken: ${c.origin||''}\n\nBackstory:\n${(c.backstory||'').replace(/<[^>]+>/g,'')}\n\nYetenekler:\n${(c.abilities||[]).join(', ')}`;
        charFolder.file(`${(c.name||'karakter').replace(/\s+/g,'_')}.txt`, txt);
        if (c.imageBase64) {
            const ext = c.imageBase64.includes('png')?'png':'jpg';
            charFolder.file(`${(c.name||'karakter').replace(/\s+/g,'_')}.${ext}`, c.imageBase64.split(',')[1], {base64:true});
        }
    });

    // Assetler — kategoriye göre klasörle
    const assetRoot = root.folder('assets');
    const catMap    = {};
    Object.values(proj.assets||{}).forEach(a=>{
        const cat = (a.category||'diger').replace(/[^a-zA-Z0-9\u00C0-\u024F]/g,'_');
        if (!catMap[cat]) catMap[cat] = assetRoot.folder(cat);
        if (a.dataUrl) {
            const ext = a.name.split('.').pop()||'bin';
            const b64 = a.dataUrl.includes(',') ? a.dataUrl.split(',')[1] : a.dataUrl;
            try { catMap[cat].file(a.name, b64, {base64:true}); } catch(e){}
        }
    });

    // Dünya haritası
    if (proj.world?.mapBase64) {
        const worldFolder=root.folder('world');
        const ext=proj.world.mapBase64.includes('png')?'png':'jpg';
        worldFolder.file(`harita.${ext}`, proj.world.mapBase64.split(',')[1],{base64:true});
    }

    // Mood board görselleri
    const mbImages = Object.values(proj.moodboard?.images||{});
    if (mbImages.length) {
        const mbFolder=root.folder('moodboard');
        mbImages.forEach((img,i)=>{
            if (!img.dataUrl) return;
            const ext=img.dataUrl.includes('png')?'png':'jpg';
            mbFolder.file(`mood_${i+1}.${ext}`, img.dataUrl.split(',')[1],{base64:true});
        });
    }

    // Diyalog .ink export
    const scenes=Object.values(proj.dialogue?.scenes||{}).sort((a,b)=>(a.order||0)-(b.order||0));
    if (scenes.length) {
        let ink=`// ${m.name||'Oyun'} — Diyalog\n\n`;
        scenes.forEach(s=>{
            ink+=`=== ${(s.title||'sahne').toLowerCase().replace(/[^a-z0-9]/g,'_')} ===\n`;
            (s.lines||[]).forEach(line=>{
                if(line.type==='choice') ink+=`* [${line.text||''}]\n`;
                else ink+=`${line.speaker?line.speaker+': ':''}${line.text||''}\n`;
            });
            ink+=`-> END\n\n`;
        });
        root.folder('dialogue').file('dialogue.ink', ink);
    }

    // Oluştur ve indir
    const blob = await zip.generateAsync({type:'blob', compression:'DEFLATE', compressionOptions:{level:6}});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${projName}_GamePlan.zip`;
    a.click();
    document.getElementById('gp-export-modal').style.display='none';
};

// ── Modül Bazlı Export ─────────────────────────────────────────
window.gpExportSingleModule = function(key) {
    const proj = window.gpActiveProject; if(!proj) return;
    const m    = proj.meta||{};
    const def  = window.GP_MODULE_DEFS[key]; if(!def) return;

    if (key==='assets') {
        const assets=Object.values(proj.assets||{});
        if(!assets.length){alert('Asset bulunamadı.');return;}
        let html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Assetler</title>
        <style>body{font-family:sans-serif;background:#111;color:#eee;padding:20px;}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;}
        .card{background:#1a1a2e;border-radius:8px;overflow:hidden;text-align:center;}
        .card img{width:100%;height:120px;object-fit:cover;} .card p{padding:6px;font-size:12px;}</style>
        </head><body><h1>${m.name||''} — Asset Galerisi</h1><div class="grid">`;
        assets.forEach(a=>{
            if(a.dataUrl&&['png','jpg','jpeg','gif','webp'].some(e=>a.name?.endsWith(e))){
                html+=`<div class="card"><img src="${a.dataUrl}"><p>${a.name||''}</p></div>`;
            }
        });
        html+=`</div></body></html>`;
        const blob=new Blob([html],{type:'text/html'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${(m.name||'oyun').replace(/\s+/g,'_')}_assets.html`;link.click();
    } else if (key==='tasks') {
        const tasks=Object.values(proj.tasks||{}).filter(t=>t.id);
        let md=`# ${m.name||''} — Görev Listesi\n\n`;
        ['done','doing','todo','idea'].forEach(status=>{
            const st=tasks.filter(t=>t.status===status);
            if(!st.length)return;
            const labels={'done':'✅ Tamamlandı','doing':'⚙️ Yapılıyor','todo':'📋 Yapılacak','idea':'💡 Fikir Havuzu'};
            md+=`## ${labels[status]}\n\n`;
            st.forEach(t=>{ md+=`- [${status==='done'?'x':' '}] **${t.title||''}** (${t.priority||''}) ${t.description?`\n  ${t.description}`:''}\n`; });
            md+='\n';
        });
        const blob=new Blob([md],{type:'text/markdown'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${(m.name||'oyun').replace(/\s+/g,'_')}_tasks.md`;link.click();
    } else if (key==='dialogue') {
        window.gpDialogueExportInk && window.gpDialogueExportInk();
    } else {
        // Genel modül: tek HTML sayfa
        const sectionContent = gpBuildFullHTML(proj, m);
        const blob=new Blob([sectionContent],{type:'text/html'});
        const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${(m.name||'oyun').replace(/\s+/g,'_')}_${key}.html`;link.click();
    }
    document.getElementById('gp-export-modal').style.display='none';
};
