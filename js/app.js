import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
        import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
        import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
        import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

        const firebaseConfig = { apiKey: "AIzaSyDtw5_Wj3qXYWDqZZyVIWwrDEtJFvpK-HI", authDomain: "spacegarbagetools.firebaseapp.com", databaseURL: "https://spacegarbagetools-default-rtdb.europe-west1.firebasedatabase.app", projectId: "spacegarbagetools", storageBucket: "spacegarbagetools.firebasestorage.app", messagingSenderId: "473849615318", appId: "1:473849615318:web:bf8bebd7bded133ef5ca77" };
        const app = initializeApp(firebaseConfig); 
        const database = getDatabase(app);
        const auth = getAuth(app);
        const storage = getStorage(app);

        window.currentUser = null;
        window.isAdmin = false;

        // AUTHENTICATION LOGIC
        window.handleLogin = function() {
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;
            signInWithEmailAndPassword(auth, email, password)
                .then((userCredential) => {
                    window.toggleLoginModal();
                })
                .catch((error) => {
                    document.getElementById('auth-error').style.display = 'block';
                    console.error("Login failed:", error);
                });
        };

        window.handleLogout = function() {
            signOut(auth).then(() => {
                console.log("Logged out");
            });
        };

        onAuthStateChanged(auth, (user) => {
            window.currentUser = user;
            const btn = document.getElementById('btn-login-logout');
            const info = document.getElementById('user-info');
            const adminDepoBtn = document.getElementById('btn-depo-kontrol');
            const adminUserSelector = document.getElementById('admin-user-selector');
            const uploadBtn = document.getElementById('btn-upload-file');
            
            if (user) {
                btn.innerText = "Çıkış Yap";
                btn.onclick = window.handleLogout;
                btn.style.background = "#ef4444";
                
                // Admin kontrolü
                get(ref(database, 'Admins/' + user.uid)).then((snapshot) => {
                    if (snapshot.exists() && snapshot.val() === true) {
                        window.isAdmin = true;
                        info.innerText = `Admin: ${user.email}`;
                        info.style.color = "#a78bfa";
                        adminDepoBtn.style.display = "block";
                        adminUserSelector.style.display = "flex";
                        uploadBtn.style.display = "block"; // Admin de dosya yükleyebilir
                        window.loadUserListForAdmin();
                        window.loadDepoFiles();
                    } else {
                        window.isAdmin = false;
                        info.innerText = `Kaptan: ${user.email}`;
                        info.style.color = "#10b981";
                        adminDepoBtn.style.display = "none";
                        adminUserSelector.style.display = "none";
                        uploadBtn.style.display = "block";
                    }
                    window.updateUIPermissions();
                    window.loadSelectedUserNote(); // Kendi notlarını yükle
                });
            } else {
                window.isAdmin = false;
                btn.innerText = "Giriş Yap";
                btn.onclick = window.toggleLoginModal;
                btn.style.background = "#3b82f6";
                info.innerText = "Misafir (Okuma Modu)";
                info.style.color = "#94a3b8";
                adminDepoBtn.style.display = "none";
                adminUserSelector.style.display = "none";
                uploadBtn.style.display = "none";
                window.updateUIPermissions();
            }
        });

        window.updateUIPermissions = function() {
            // Sadece Admin düzenleme yapabilir
            const inputs = document.querySelectorAll('input:not(#auth-email):not(#auth-password), select, button.btn-top, button.action-btn, button[onclick*="addNew"]');
            inputs.forEach(el => {
                if(el.id === 'user-file-upload' || el.id === 'user-notes-dropdown') return; // Bunları kapatma
                if(!window.isAdmin && el.closest('.tool-section') && el.closest('.tool-section').id !== 'note-tool' && el.closest('.tool-section').id !== 'sim-tool' && el.closest('.tool-section').id !== 'stat-tool') {
                    el.disabled = true;
                    el.style.opacity = '0.5';
                    el.style.cursor = 'not-allowed';
                } else {
                    el.disabled = false;
                    el.style.opacity = '1';
                    el.style.cursor = '';
                }
            });
            // Not defteri araçları, kullanıcılara açık olmalı
            if(window.currentUser) {
                document.querySelectorAll('.note-toolbar button').forEach(b => {
                    b.disabled = false; b.style.opacity = '1';
                });
            } else {
                document.querySelectorAll('.note-toolbar button').forEach(b => {
                    b.disabled = true; b.style.opacity = '0.5';
                });
            }
        };

        // NOT DEFTERİ (JURNAL) VERİTABANI - YENİ YAPI
        let currentNoteRef = null;
        let noteListener = null;
        const noteSaveStatus = document.getElementById('note-save-status');
        const noteEditorForDb = document.getElementById('note-editor');

        window.loadSelectedUserNote = function() {
            if (!window.currentUser) {
                if(noteEditorForDb) noteEditorForDb.innerHTML = "Lütfen notlarınızı görmek için giriş yapın.";
                if(noteEditorForDb) noteEditorForDb.contentEditable = "false";
                return;
            }
            
            let targetUserId = window.currentUser.uid;
            
            if (window.isAdmin) {
                const dropdown = document.getElementById('user-notes-dropdown');
                if (dropdown && dropdown.value !== 'my_notes') {
                    targetUserId = dropdown.value;
                }
            }

            if (noteListener && currentNoteRef) {
                // Eski listener'ı iptal et
            }

            currentNoteRef = ref(database, 'spaceGarbageNotes/users/' + targetUserId);
            if(noteEditorForDb) noteEditorForDb.contentEditable = (targetUserId === window.currentUser.uid || window.isAdmin) ? "true" : "false";

            noteListener = onValue(currentNoteRef, (snapshot) => {
                const data = snapshot.val();
                if (noteEditorForDb && data && noteEditorForDb.innerHTML !== data) { 
                    noteEditorForDb.innerHTML = data; 
                    noteEditorForDb.querySelectorAll('code').forEach(codeEl => highlightSyntax(codeEl)); 
                    parseSpecialLinks(noteEditorForDb); 
                } else if (noteEditorForDb && !data) {
                    noteEditorForDb.innerHTML = "";
                }
            });
        };

        window.loadUserListForAdmin = function() {
            const dropdown = document.getElementById('user-notes-dropdown');
            if (!dropdown) return;
            
            // Tüm not yazan kullanıcıları bul
            get(ref(database, 'spaceGarbageNotes/users')).then((snapshot) => {
                const users = snapshot.val();
                dropdown.innerHTML = '<option value="my_notes">Kendi Notlarım</option>';
                if (users) {
                    Object.keys(users).forEach(uid => {
                        if (uid !== window.currentUser.uid) {
                            dropdown.innerHTML += `<option value="${uid}">Kullanıcı: ${uid.substring(0,6)}...</option>`;
                        }
                    });
                }
            });
        };

        window.saveNote = function() {
            if (!noteEditorForDb || !noteSaveStatus || !currentNoteRef || !window.currentUser) return;
            // Eger Admin baska hesaba bakiyorsa ve degisiklik yaparsa kaydet
            noteSaveStatus.innerText = 'Kaydediliyor...';
            set(currentNoteRef, noteEditorForDb.innerHTML).then(() => {
                noteSaveStatus.innerText = 'Bulut ile senkronize!';
                setTimeout(() => { noteSaveStatus.innerText = 'Bulut ile senkronize...'; }, 2000);
            }).catch((error) => {
                noteSaveStatus.innerText = 'Kaydetme Hatası!';
                noteSaveStatus.style.color = '#ef4444';
                console.error("Note save error:", error);
            });
            window.registerAction("Not defteri güncellendi.");
        };
        window.debouncedSaveNote = debounce(window.saveNote, 1000);

        // ==========================================
        // DEPO KONTROL (STORAGE & DATABASE)
        // ==========================================
        window.uploadUserFile = function(event) {
            const file = event.target.files[0];
            if (!file || !window.currentUser) return;
            
            const btn = document.getElementById('btn-upload-file');
            btn.innerText = "Yükleniyor...";
            btn.disabled = true;

            const timestamp = Date.now();
            const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
            const storagePath = `uploads/${window.currentUser.uid}/${timestamp}_${safeName}`;
            const fileRef = storageRef(storage, storagePath);

            uploadBytes(fileRef, file).then((snapshot) => {
                // Metaveriyi database'e yaz
                const metaRef = ref(database, 'spaceGarbageDepo/' + timestamp);
                set(metaRef, {
                    uid: window.currentUser.uid,
                    email: window.currentUser.email,
                    fileName: file.name,
                    storagePath: storagePath,
                    timestamp: timestamp,
                    size: file.size
                }).then(() => {
                    btn.innerText = "📁 Dosya Yükle";
                    btn.disabled = false;
                    alert("Dosya başarıyla yüklendi!");
                    if(window.isAdmin) window.loadDepoFiles();
                });
            }).catch((error) => {
                console.error("Upload error:", error);
                btn.innerText = "Hata! Tekrar Dene";
                btn.disabled = false;
            });
            event.target.value = ''; // Reset input
        };

        window.loadDepoFiles = function() {
            if (!window.isAdmin) return;
            const listEl = document.getElementById('depo-files-list');
            if(!listEl) return;
            
            onValue(ref(database, 'spaceGarbageDepo'), (snapshot) => {
                listEl.innerHTML = '';
                const data = snapshot.val();
                if (!data) {
                    listEl.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:15px; color:#94a3b8;">Henüz yüklenmiş dosya yok.</td></tr>';
                    return;
                }
                
                // Tarihe göre ters sırala (en yeni en üstte)
                const files = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);
                
                files.forEach(f => {
                    const dateStr = new Date(f.timestamp).toLocaleString();
                    const sizeStr = (f.size / 1024).toFixed(2) + " KB";
                    listEl.innerHTML += `
                        <tr style="border-bottom: 1px solid #334155;">
                            <td style="padding: 10px; color: #38bdf8;">${f.email}</td>
                            <td style="padding: 10px;">${f.fileName} <br><span style="font-size:10px; color:#94a3b8;">${sizeStr}</span></td>
                            <td style="padding: 10px; color: #94a3b8; font-size: 12px;">${dateStr}</td>
                            <td style="padding: 10px;">
                                <button onclick="window.downloadDepoFile('${f.storagePath}')" style="background:#10b981; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; margin-right:5px;">İndir</button>
                                <button onclick="window.deleteDepoFile('${f.timestamp}', '${f.storagePath}')" style="background:#ef4444; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px;">Sil</button>
                            </td>
                        </tr>
                    `;
                });
            });
        };

        window.downloadDepoFile = function(path) {
            getDownloadURL(storageRef(storage, path))
                .then((url) => {
                    window.open(url, '_blank');
                })
                .catch((error) => {
                    console.error("Download error:", error);
                    alert("Dosya indirilemedi veya bulunamadı.");
                });
        };

        window.deleteDepoFile = function(timestamp, path) {
            if(!confirm("Bu dosyayı kalıcı olarak silmek istediğinize emin misiniz?")) return;
            
            // Önce Storage'dan sil
            deleteObject(storageRef(storage, path)).then(() => {
                // Sonra Database'den metadata'yı sil
                set(ref(database, 'spaceGarbageDepo/' + timestamp), null);
            }).catch((error) => {
                console.error("Delete error:", error);
                // Storage'da yoksa bile database'den silelim kalıntı kalmasın
                set(ref(database, 'spaceGarbageDepo/' + timestamp), null);
            });
        };

        // AFK & DURUM
        window.lastEditTime = Date.now(); window.lastEditText = "Sistem Başlatıldı.";
        window.registerAction = function(actionText) { window.lastEditTime = Date.now(); window.lastEditText = actionText; const afkEl = document.getElementById('afk-reminder'); if (afkEl) afkEl.style.display = 'none'; };
        setInterval(() => { const now = Date.now(); if (now - window.lastEditTime > 10 * 60 * 1000) { const afkEl = document.getElementById('afk-reminder'); if (afkEl && afkEl.style.display !== 'block') { afkEl.innerHTML = `⏳ <b>Kaptan Köşkü Uyarısı</b><br><br>10 dakikadır işlem yapılmadı.<br><span style="color:#fbc531; font-size:11px;">Son İşlem: ${window.lastEditText}</span>`; afkEl.style.display = 'block'; } } }, 60000); 
        onValue(ref(database, ".info/connected"), (snap) => { const statusDot = document.getElementById("status-indicator"); const statusText = document.getElementById("status-text"); if (snap.val() === true) { statusDot.classList.add("online"); statusText.innerText = "Firebase'e Bağlı (Canlı)"; statusText.style.color = "#10b981"; } else { statusDot.classList.remove("online"); statusText.innerText = "Çevrimdışı"; statusText.style.color = "#ef4444"; } });

        window.spaceGarbageDB = database; window.firebaseRef = ref; window.firebaseSet = set; window.firebaseOnValue = onValue;
        window.fileToBase64 = function(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); };

        // ==========================================
        // STAT SİMÜLATÖRÜ
        // ==========================================
        const initialStatsData = {
          "CargoCapacity": { "base": 10, "skills": [ { "id": 102, "name": "Kargo Kapasitesi I", "vals": [0,0,0,0,0] }, { "id": 106, "name": "Kargo Kapasitesi II", "vals": [0,0,0,0,0] }, { "id": 130, "name": "Kargo Kapasitesi III", "vals": [0,0,0,0,0] } ] },
          "VacuumRadius": { "base": 1.0, "skills": [ { "id": 103, "name": "Vakum Alani I", "vals": [0,0,0,0,0] }, { "id": 120, "name": "Vakum Alani II", "vals": [0,0,0,0,0] } ] },
          "ScannerLevel": { "base": 0, "skills": [ { "id": 104, "name": "Tarayici Kalibrasyonu", "vals": [0,0,0,0,0] }, { "id": 113, "name": "Tarayici Kalibrasyonu I", "vals": [0,0,0,0,0] }, { "id": 143, "name": "Tarayici Kalibrasyonu III", "vals": [0,0,0,0,0] } ] },
          "VacuumDamage": { "base": 15.0, "skills": [ { "id": 105, "name": "Vakum Hasari I", "vals": [0,0,0,0,0] }, { "id": 126, "name": "Vakum Hasari II", "vals": [0,0,0,0,0] }, { "id": 136, "name": "Vakum Hasari III", "vals": [0,0,0,0,0] } ] },
          "WeaponDamage": { "base": 10.0, "skills": [ { "id": 107, "name": "Silah Hasari I", "vals": [0,0,0,0,0] }, { "id": 109, "name": "Silah Hasari II", "vals": [0,0,0,0,0] }, { "id": 131, "name": "Silah Hasari III", "vals": [0,0,0,0,0] } ] },
          "DroneCount": { "base": 0, "skills": [ { "id": 110, "name": "Drone İstasyonu", "vals": [0,0,0,0,0] }, { "id": 123, "name": "Ekstra Drone I", "vals": [0,0,0,0,0] }, { "id": 134, "name": "Ekstra Drone II", "vals": [0,0,0,0,0] } ] },
          "VacuumPower": { "base": 1.0, "skills": [ { "id": 111, "name": "Vakum Gucu I", "vals": [0,0,0,0,0] }, { "id": 129, "name": "Vakum Gucu II", "vals": [0,0,0,0,0] } ] },
          "DroneSpeed": { "base": 1.0, "skills": [ { "id": 112, "name": "Drone Motoru I", "vals": [0,0,0,0,0] }, { "id": 137, "name": "Drone Motoru II", "vals": [0,0,0,0,0] } ] },
          "ActiveSlotCount": { "base": 1, "skills": [ { "id": 114, "name": "Aktif Modul Yuvasi I", "vals": [0,0,0,0,0] }, { "id": 119, "name": "Aktif Modul Yuvasi II", "vals": [0,0,0,0,0] } ] },
          "LootChanceRare": { "base": 0, "skills": [ { "id": 115, "name": "Rare Loot Avcisi", "vals": [0,0,0,0,0] } ] },
          "MaxHealth": { "base": 3, "skills": [ { "id": 116, "name": "Maksimum Can I", "vals": [0,0,0,0,0] }, { "id": 128, "name": "Maksimum Can II", "vals": [0,0,0,0,0] }, { "id": 148, "name": "Maksimum Can III", "vals": [0,0,0,0,0] } ] },
          "ShieldCapacity": { "base": 0, "skills": [ { "id": 117, "name": "Kalkan Kapasitesi I", "vals": [0,0,0,0,0] }, { "id": 135, "name": "Kalkan Kapasitesi II", "vals": [0,0,0,0,0] } ] },
          "ActiveCooldown": { "base": 0, "skills": [ { "id": 118, "name": "Aktif Modul Soğutmasi I", "vals": [0,0,0,0,0] }, { "id": 138, "name": "Aktif Modul Soğutmasi II", "vals": [0,0,0,0,0] } ] },
          "LootChanceEpic": { "base": 0, "skills": [ { "id": 121, "name": "Epic Loot Avcisi", "vals": [0,0,0,0,0] } ] },
          "DroneDamage": { "base": 10.0, "skills": [ { "id": 122, "name": "Drone Hasari I", "vals": [0,0,0,0,0] }, { "id": 125, "name": "Drone Hasari II", "vals": [0,0,0,0,0] } ] },
          "ActiveDuration": { "base": 0, "skills": [ { "id": 124, "name": "Aktif Modul Suresi I", "vals": [0,0,0,0,0] }, { "id": 142, "name": "Aktif Modul Suresi II", "vals": [0,0,0,0,0] } ] },
          "ShieldResistance": { "base": 0, "skills": [ { "id": 127, "name": "Kalkan Direnci I", "vals": [0,0,0,0,0] }, { "id": 132, "name": "Kalkan Direnci II", "vals": [0,0,0,0,0] } ] },
          "LootChanceLegendary": { "base": 0, "skills": [ { "id": 140, "name": "Legendary Loot Avcisi", "vals": [0,0,0,0,0] } ] }
        };

        const cats = {
          "📦 Lojistik & Gemi": ["CargoCapacity", "MaxHealth", "ScannerLevel"],
          "🌪️ Vakum Sistemi": ["VacuumRadius", "VacuumPower", "VacuumDamage"],
          "⚔️ Silahlar & Kalkan": ["WeaponDamage", "ShieldCapacity", "ShieldResistance"],
          "🤖 Dronelar": ["DroneCount", "DroneSpeed", "DroneDamage"],
          "⚙️ Aktif Modüller": ["ActiveSlotCount", "ActiveCooldown", "ActiveDuration"],
          "💎 Ganimet Şansı (Loot)": ["LootChanceRare", "LootChanceEpic", "LootChanceLegendary"]
        };

        let liveStatsData = {};

        onValue(ref(database, 'spaceGarbageSimulator'), (snapshot) => {
            const data = snapshot.val();
            if (!data) { set(ref(database, 'spaceGarbageSimulator'), initialStatsData); return; }
            liveStatsData = data;
            window.initStatTool();
            window.recalculateStats();
        });

        window.initStatTool = function() {
            const container = document.getElementById('stat-app-container');
            if(!container) return;
            let html = "";
            for(let cat in cats) {
                html += `<div class="stat-category"><h2>${cat}</h2>`;
                cats[cat].forEach(statKey => {
                    const stat = liveStatsData[statKey];
                    if(!stat) return;
                    html += `<div class="stat-card-box">
                        <h3><span>${statKey}</span><span>Taban Değer: <input type="number" step="any" class="base-input" data-stat="${statKey}" value="${stat.base}" onchange="window.updateStatBase('${statKey}', this.value)"></span></h3>
                        <table class="stat-table"><thead><tr><th>Yetenek</th><th>Lv 1</th><th>Lv 2</th><th>Lv 3</th><th>Lv 4</th><th>Lv 5</th></tr></thead><tbody>`;
                    
                    stat.skills.forEach((skill, sIdx) => {
                        html += `<tr><td>${skill.name}</td>`;
                        for(let i=0; i<5; i++) {
                            let val = (skill.vals && skill.vals[i]) ? skill.vals[i] : 0;
                            html += `<td><input type="number" step="any" class="skill-input" data-stat="${statKey}" value="${val}" onchange="window.updateSkillVal('${statKey}', ${sIdx}, ${i}, this.value)"></td>`;
                        }
                        html += `</tr>`;
                    });
                    html += `<tr class="total-row"><td colspan="5" style="text-align: right;">Toplam:</td><td class="grand-total-text" id="total-${statKey}">0</td></tr></tbody></table>`;
                    if(statKey === "VacuumRadius") html += `<div class="visualizer-box"><h4>📡 Huni Menzil Simülatörü</h4><canvas id="vacuumCanvas" width="400" height="300"></canvas></div>`;
                    html += `</div>`;
                });
                html += `</div>`;
            }
            container.innerHTML = html;
        };

        window.updateStatBase = function(statKey, val) { set(ref(database, `spaceGarbageSimulator/${statKey}/base`), parseFloat(val) || 0); window.registerAction(statKey + " taban değeri güncellendi."); };
        window.updateSkillVal = function(statKey, sIdx, vIdx, val) { set(ref(database, `spaceGarbageSimulator/${statKey}/skills/${sIdx}/vals/${vIdx}`), parseFloat(val) || 0); window.registerAction(statKey + " yetenek seviyesi güncellendi."); };

        window.recalculateStats = function() {
            let curRad = 1.0, baseRad = 1.0;
            for(let key in liveStatsData) {
                let total = parseFloat(liveStatsData[key].base) || 0;
                liveStatsData[key].skills.forEach(skill => { if(skill.vals) skill.vals.forEach(v => total += parseFloat(v) || 0); });
                const el = document.getElementById(`total-${key}`);
                if(el) el.innerText = Number.isInteger(total) ? total : parseFloat(total.toFixed(2));
                if(key === "VacuumRadius") { curRad = total; baseRad = parseFloat(liveStatsData[key].base) || 0; }
            }
            window.drawVacuumCone(curRad, baseRad);
        };

        window.drawVacuumCone = function(radius, baseRadius) {
            const cvs = document.getElementById('vacuumCanvas'); if(!cvs) return;
            const ctx = cvs.getContext('2d'); ctx.clearRect(0, 0, cvs.width, cvs.height);
            const cx = cvs.width / 2, cy = 40, scale = 25, angle = Math.PI / 4; 
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius * scale, Math.PI/2 - angle, Math.PI/2 + angle); ctx.lineTo(cx, cy);
            ctx.fillStyle = '#38bdf833'; ctx.fill(); ctx.setLineDash([]); ctx.strokeStyle = '#38bdf8'; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, baseRadius * scale, Math.PI/2 - angle, Math.PI/2 + angle); ctx.lineTo(cx, cy);
            ctx.strokeStyle = '#10b981'; ctx.setLineDash([5, 5]); ctx.stroke();
            ctx.fillStyle = "#fff"; ctx.fillRect(cx - 5, cy - 5, 10, 10); ctx.font = "14px Arial"; ctx.textAlign = "center";
            ctx.fillText("Hortum Ucu", cx, cy - 15); ctx.fillText(radius.toFixed(2) + " Birim Menzil", cx, cy + (radius * scale) + 20);
        };

        // ==========================================
        // ITEM AYARLARI MERKEZİ
        // ==========================================
        window.globalItems = {}; 
        let currentItemTab = 'Trash';
        const MAX_REQ = 3; 

        onValue(ref(database, 'spaceGarbageItems'), (snapshot) => {
            const data = snapshot.val(); window.globalItems = data ? data : {}; 
            window.renderItemsGrid(); if(window.renderDengeLists) window.renderDengeLists(); 
        });

        window.uploadItemIcons = async function(event) {
            const files = event.target.files; if(!files.length) return;
            let count = 0;
            for(let file of files) {
                const match = file.name.match(/Icon_(\d+)/i);
                if(match) {
                    const itemId = parseInt(match[1]);
                    if(window.globalItems[itemId]) {
                        const base64Str = await window.fileToBase64(file);
                        set(ref(database, `spaceGarbageItems/${itemId}/iconBase64`), base64Str); count++;
                    }
                }
            }
            alert(`✅ ${count} adet Eşya İkonu başarıyla yüklendi!`); event.target.value = ''; window.registerAction("Toplu eşya ikonu yüklendi.");
        };

        window.switchItemTab = function(tabName, btnElement) { currentItemTab = tabName; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active-tab')); btnElement.classList.add('active-tab'); window.renderItemsGrid(); };
        window.updateItemDB = function(itemId, fieldPath, value, isNum) { let finalValue = isNum ? parseFloat(value) || 0 : value; set(ref(database, `spaceGarbageItems/${itemId}/${fieldPath}`), finalValue); window.registerAction(itemId + " ID'li eşya güncellendi."); };
        window.showMoreReqs = function(itemId, currentVisible) { if (currentVisible < MAX_REQ) set(ref(database, `spaceGarbageItems/${itemId}/visibleReqs`), currentVisible + 1); };

        window.renderItemsGrid = function() {
            const grid = document.getElementById('items-grid-container'); if(!grid) return; grid.innerHTML = '';
            let itemsArray = Object.values(window.globalItems).sort((a, b) => a.id - b.id);
            itemsArray.forEach(item => {
                if(item.type !== currentItemTab) return;
                if(!item.reqs) { item.reqs = []; for(let i=0; i<MAX_REQ; i++) item.reqs.push({id:0, amt:0}); }
                let visReqs = item.visibleReqs || 3;
                const onChg = (field, isNum=false) => `onchange="window.updateItemDB(${item.id}, '${field}', this.value, ${isNum})"`;

                let imgHtml = item.iconBase64 ? `<img src="${item.iconBase64}" style="width:36px;height:36px;border-radius:6px;border:1px solid #475569;background:#000;object-fit:cover;">` : `<div style="width:36px;height:36px;background:#1e293b;border-radius:6px;border:1px dashed #475569;display:flex;align-items:center;justify-content:center;font-size:10px;color:#64748b;">Yok</div>`;

                let html = `
                <div id="item-card-${item.id}" class="item-card type-${item.type}">
                    <div class="card-header"><div style="display:flex; gap:10px; align-items:center;">${imgHtml}<div><span style="font-size:12px; color:#94a3b8;">${item.type === 'Trash' ? '🗑️ Çöp' : item.type === 'Loot' ? '👽 Ganimet' : '⚙️ Craft'}</span><br><strong style="color:white; font-size:15px;">${item.name}</strong></div></div><button style="background:#ef4444; color:white; border:none; border-radius:4px; padding:6px 10px; cursor:pointer;" onclick="window.deleteItemDB(${item.id})">Sil</button></div>
                    <div class="row"><div style="flex:0.3"><label>Item ID</label><input type="number" value="${item.id}" readonly style="background:#334155;"></div><div style="flex:0.7"><label>Eşya Adı (TR)</label><input type="text" value="${item.name}" ${onChg('name', false)}></div></div>
                    <div class="row"><div class="col"><label>Değerlilik (Rarity)</label><select ${onChg('rarity', false)}><option value="Common" ${item.rarity==='Common'?'selected':''}>Common</option><option value="Rare" ${item.rarity==='Rare'?'selected':''}>Rare</option><option value="Epic" ${item.rarity==='Epic'?'selected':''}>Epic</option><option value="Legendary" ${item.rarity==='Legendary'?'selected':''}>Legendary</option></select></div><div class="col"><label>Satış Fiyatı ($)</label><input type="number" value="${item.price || 0}" ${onChg('price', true)}></div></div>`;

                if (item.type === 'Trash' || item.type === 'Loot') html += `<div class="row" style="margin-top:15px;"><div class="col"><label>Can (HP)</label><input type="number" value="${item.hp || 0}" ${onChg('hp', true)}></div><div class="col"><label>Ağırlık</label><input type="number" value="${item.weight || 0}" ${onChg('weight', true)}></div><div class="col"><label>Vakum</label><input type="number" value="${item.vacuum || 0}" ${onChg('vacuum', true)}></div></div>`;
                if (item.type === 'Loot') html += `<div class="row"><div class="col" style="border-left: 3px solid #ef4444; padding-left:10px;"><label>Düşme İhtimali (%)</label><input type="number" step="0.1" value="${item.drop || 0}" ${onChg('drop', true)}></div></div>`;
                if (item.type === 'Craftable') {
                    html += `<div class="row" style="margin-top:10px;"><div class="col" style="border-left: 3px solid #10b981; padding-left:10px;"><label>Üretim Maliyeti ($)</label><input type="number" value="${item.craft_cost || 0}" ${onChg('craft_cost', true)}></div></div>
                    <div style="background: #1e293b; padding: 10px; border-radius: 6px; margin-top: 15px; border: 1px dashed #475569;"><div style="font-size: 12px; color: #10b981; margin-bottom: 10px; font-weight: bold; display: flex; justify-content: space-between;">Üretim Tarifi ${visReqs < MAX_REQ ? `<button style="background:#334155; color:white; border:1px solid #475569; padding:4px; cursor:pointer;" onclick="window.showMoreReqs(${item.id}, ${visReqs})">+ Aç</button>` : ''}</div>`;
                    for(let r=0; r<visReqs; r++) { let rId = item.reqs[r] ? item.reqs[r].id : 0, rAmt = item.reqs[r] ? item.reqs[r].amt : 0; html += `<div class="row" style="margin-bottom:5px;"><div class="col"><label>Mat ${r+1} (ID)</label><input type="number" value="${rId}" onchange="window.updateItemDB(${item.id}, 'reqs/${r}/id', this.value, true)"></div><div style="flex:0.4"><label>Adet</label><input type="number" value="${rAmt}" onchange="window.updateItemDB(${item.id}, 'reqs/${r}/amt', this.value, true)"></div></div>`; }
                    html += `</div>`;
                }
                html += `</div>`; grid.innerHTML += html;
            });
            let addText = currentItemTab === 'Trash' ? 'Uzay Çöpü Ekle' : currentItemTab === 'Loot' ? 'Loot Ekle' : 'Craft Eşyası Ekle';
            grid.innerHTML += `<div class="item-card add-new-card" onclick="window.addNewItemDB()"><div style="font-size: 40px;">+</div><strong>${addText}</strong></div>`;
        };

        window.addNewItemDB = function() {
            let startId = currentItemTab === 'Loot' ? 300 : currentItemTab === 'Craftable' ? 400 : 200;
            let currentItems = Object.values(window.globalItems).filter(i => i.type === currentItemTab);
            let nextId = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.id)) + 1 : startId + 1;
            let initialReqs = []; for(let i=0; i<MAX_REQ; i++) initialReqs.push({id: 0, amt: 0});
            let newItem = { id: nextId, name: "Yeni Eşya", type: currentItemTab, rarity: "Common", price: 0, craft_cost: 0, hp: 0, weight: 0, vacuum: 0, drop: 0, reqs: initialReqs, visibleReqs: 3 };
            set(ref(database, 'spaceGarbageItems/' + nextId), newItem); window.registerAction(nextId + " ID'li yeni eşya oluşturuldu.");
        };

        window.deleteItemDB = function(itemId) { if(confirm("Emin misin?")) { set(ref(database, 'spaceGarbageItems/' + itemId), null); window.registerAction(itemId + " ID'li eşya silindi."); } };

        window.exportFirebaseToCSV = function() {
            let itemsArray = Object.values(window.globalItems).sort((a, b) => a.id - b.id); if(itemsArray.length === 0) return;
            let headerStr = "Item_ID,Item_Name_TR,Item_Type,Rarity,Prefab_Name,Icon_Name,Sell_Price,Health,Float_Weight,Vacuum_Escape,Drop_Chance";
            for(let j=1; j<=MAX_REQ; j++) headerStr += `,Req_Item_${j}_ID,Req_Item_${j}_Amount`;
            headerStr += ",Craft_Cost";
            let csvLines = [headerStr];
            itemsArray.forEach(i => {
                let reqStr = ""; for(let j=0; j<MAX_REQ; j++) { let rId = (i.reqs && i.reqs[j] && i.reqs[j].id !== 0) ? i.reqs[j].id : ''; let rAmt = (i.reqs && i.reqs[j] && i.reqs[j].amt !== 0) ? i.reqs[j].amt : ''; reqStr += `,${rId},${rAmt}`; }
                let line = `${i.id},${i.name},${i.type},${i.rarity},${i.prefab || ''},${i.icon || ''},${i.price===0?'':i.price},${i.hp===0?'':i.hp},${i.weight===0?'':i.weight},${i.vacuum===0?'':i.vacuum},${i.drop===0?'':i.drop}${reqStr},${i.craft_cost===0?'':i.craft_cost}`;
                csvLines.push(line);
            });
            const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "SpaceGarbageItems_Live.csv"; link.click();
        };

        window.importCSVToFirebase = function(event) {
            const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); 
            reader.onload = function(e) { 
                let text = e.target.result, p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
                for (l of text) { if ('"' === l) { if (s && l === p) row[i] += l; s = !s; } else if (',' === l && s) l = row[++i] = ''; else if ('\n' === l && s) { if ('\r' === p) row[i] = row[i].slice(0, -1); row = ret[++r] = [l = '']; i = 0; } else row[i] += l; p = l; }
                if (ret[ret.length - 1][0] === '') ret.pop();
                let headers = ret[0].map(h => h ? h.trim() : ''), rows = ret.slice(1);
                const getCol = (name) => { let idx = headers.indexOf(name); return idx === -1 ? 999 : idx; };
                let cId = getCol('Item_ID'), cName = getCol('Item_Name_TR'), cType = getCol('Item_Type'), cRar = getCol('Rarity'), cPref = getCol('Prefab_Name'), cIcon = getCol('Icon_Name'), cPrice = getCol('Sell_Price'), cCraftCost = getCol('Craft_Cost'), cHp = getCol('Health'), cWgt = getCol('Float_Weight'), cVac = getCol('Vacuum_Escape'), cDrop = getCol('Drop_Chance');
                let cReqs = []; for(let j=1; j<=MAX_REQ; j++) cReqs.push({ idCol: getCol(`Req_Item_${j}_ID`), amtCol: getCol(`Req_Item_${j}_Amount`) });
                let newDbData = {};
                rows.forEach((rData) => {
                    if(rData.length < 2) return; let id = parseInt(rData[cId]) || 0; if(id === 0) return;
                    let reqList = []; let maxFilledReq = 3;
                    for(let j=0; j<MAX_REQ; j++) { let rId = parseInt(rData[cReqs[j].idCol]) || 0, rAmt = parseInt(rData[cReqs[j].amtCol]) || 0; reqList.push({ id: rId, amt: rAmt }); if(rId !== 0 || rAmt !== 0) maxFilledReq = Math.max(maxFilledReq, j + 1); }
                    newDbData[id] = { id: id, name: rData[cName] || "İsimsiz", type: rData[cType] || "Trash", rarity: rData[cRar] || "Common", prefab: rData[cPref] || "", icon: rData[cIcon] || "", price: parseFloat(rData[cPrice]) || 0, craft_cost: parseFloat(rData[cCraftCost]) || 0, hp: parseFloat(rData[cHp]) || 0, weight: parseFloat(rData[cWgt]) || 0, vacuum: parseFloat(rData[cVac]) || 0, drop: parseFloat(rData[cDrop]) || 0, reqs: reqList, visibleReqs: maxFilledReq, iconBase64: window.globalItems[id] ? window.globalItems[id].iconBase64 : null };
                });
                set(ref(database, 'spaceGarbageItems'), newDbData).then(() => { alert("CSV başarıyla Firebase'e entegre edildi!"); document.getElementById('csvFileInput').value = ''; });
            }; reader.readAsText(file);
        };

        // ==========================================
        // YENİ V7.1 İNTERAKTİF HARİTA (SÜRÜKLE-BIRAK & KUSURSUZ BAĞLANTI)
        // ==========================================
        window.globalSkills = {}; let selectedNodeId = null; const maxSupportedLevels = 5;
        const canvas = document.getElementById('tech-canvas'); const ctx = canvas ? canvas.getContext('2d') : null;
        let camX = 400, camY = 300, zoom = 1, isPanning = false, isDraggingNode = false, draggedNodeId = null;
        let startPointerX, startPointerY, startCamX, startCamY; 
        window.techTreeSpacing = 150; // Nodelar arası varsayılan mesafe

        window.updateTechTreeSettings = function() {
            const spacingInput = document.getElementById('tech-spacing-input');
            const zoomInput = document.getElementById('tech-zoom-input');
            
            if (spacingInput) window.techTreeSpacing = parseFloat(spacingInput.value) || 150;
            if (zoomInput) zoom = parseFloat(zoomInput.value) || 1.0;
            
            if(window.drawTechTree) window.drawTechTree();
        };

        // Not defterindeki akıllı linkin haritadaki bir yeteneğe odaklanmasını sağlayan fonksiyon
        window.focusOnSkill = (skillId) => {
            const skill = Object.values(window.globalSkills).find(s => s.skillID == skillId); if (!skill) return;
            document.querySelector('.nav-btn[onclick*="tech-tool"]').click();
            setTimeout(() => {
                selectedNodeId = skill.nodeID;
                window.loadNodeData(skill);
                document.getElementById('connect-ui-panel').style.display = 'block';
                const spacing = window.techTreeSpacing * zoom;
                camX = (canvas.width / 2) - (skill.gridX * spacing); camY = (canvas.height / 2) + (skill.gridY * spacing);
                window.drawTechTree();
            }, 200);
        };

        onValue(ref(database, 'spaceGarbageSkills'), (snapshot) => {
            const data = snapshot.val(); window.globalSkills = data ? data : {};
            Object.values(window.globalSkills).forEach(s => { if (s.iconBase64 && !window.iconCache['skill_'+s.skillID]) { const img = new Image(); img.src = s.iconBase64; window.iconCache['skill_'+s.skillID] = img; img.onload = () => { if(window.drawTechTree) window.drawTechTree(); }; } });
            window.updateSkillList(); window.drawTechTree(); if(window.renderDengeLists) window.renderDengeLists(); 
        });

        window.uploadSkillIcons = async function(event) {
            const files = event.target.files; if(!files.length) return; let count = 0;
            for(let file of files) {
                const match = file.name.match(/Skill_(\d+)/i);
                if(match) {
                    const skillId = parseInt(match[1]); const skillNode = Object.values(window.globalSkills).find(s => s.skillID === skillId);
                    if(skillNode) { const base64Str = await window.fileToBase64(file); set(ref(database, `spaceGarbageSkills/${skillNode.nodeID}/iconBase64`), base64Str); count++; }
                }
            }
            alert(`✅ ${count} adet Yetenek İkonu yüklendi!`); event.target.value = ''; window.registerAction("Toplu yetenek ikonu yüklendi.");
        };

        window.switchTechTab = function(tabId) {
            document.querySelectorAll('.tech-tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('.tech-tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById('tech-tab-' + tabId).classList.add('active'); document.getElementById('btn-tab-' + tabId).classList.add('active');
            if(tabId === 'list') window.updateSkillList();
        };

        window.updateSkillList = function() {
            const container = document.getElementById('skill-list-container'); if(!container) return; container.innerHTML = ""; let skillsArray = Object.values(window.globalSkills).sort((a,b) => a.nodeID - b.nodeID);
            if(skillsArray.length === 0) { container.innerHTML = "<p style='color:#94a3b8;'>Ağaç boş.</p>"; return; }
            skillsArray.forEach(s => {
                let div = document.createElement('div'); div.className = 'list-item';
                let imgHtml = s.iconBase64 ? `<img src="${s.iconBase64}" style="width:24px;height:24px;border-radius:4px;vertical-align:middle;margin-right:8px;">` : '';
                const sColor = window.getStatColor(s.statType);
                div.innerHTML = `<div>${imgHtml}<span style="font-weight:bold; color:${sColor}; vertical-align:middle;">${s.name || "İsimsiz"}</span></div> <span style="font-size:11px; color:#94a3b8; background:#1e293b; padding:3px 8px; border-radius:10px;">ID: ${s.skillID}</span>`;
                div.onclick = () => { 
                    selectedNodeId = s.nodeID; window.loadNodeData(s); window.switchTechTab('editor'); 
                    camX = (canvas.width / 2) - (s.gridX * 150 * zoom); camY = (canvas.height / 2) + (s.gridY * 150 * zoom); 
                    document.getElementById('connect-ui-panel').style.display = 'block'; window.drawTechTree(); 
                };
                container.appendChild(div);
            });
        };

        window.generateLevelInputs = function() {
            const container = document.getElementById('dynamic-levels-container'); const maxLvl = parseInt(document.getElementById('e-max-level').value) || 1; let currentSkill = window.globalSkills[selectedNodeId]; container.innerHTML = ""; 
            for (let i = 1; i <= maxLvl; i++) {
                let lvlData = (currentSkill && currentSkill.levels && currentSkill.levels[i]) ? currentSkill.levels[i] : {};
                container.innerHTML += `<div class="level-box"><h4>⭐ Level ${i}</h4><div class="flex-row"><div class="form-group" style="flex:1"><label>Stat Değeri</label><input type="text" id="l${i}-stat" value="${lvlData.stat || ''}"></div><div class="form-group" style="flex:1"><label>Maliyet ($)</label><input type="number" id="l${i}-money" value="${lvlData.money || ''}"></div></div><div class="flex-row"><div class="form-group" style="flex:2"><label>Mat. 1 (ID)</label><input type="text" id="l${i}-m1n" value="${lvlData.mat1Name || ''}"></div><div class="form-group" style="flex:1"><label>Adet</label><input type="number" id="l${i}-m1a" value="${lvlData.mat1Amt || ''}"></div></div><div class="flex-row"><div class="form-group" style="flex:2"><label>Mat. 2 (ID)</label><input type="text" id="l${i}-m2n" value="${lvlData.mat2Name || ''}"></div><div class="form-group" style="flex:1"><label>Adet</label><input type="number" id="l${i}-m2a" value="${lvlData.mat2Amt || ''}"></div></div><div class="flex-row"><div class="form-group" style="flex:2"><label>Mat. 3 (ID)</label><input type="text" id="l${i}-m3n" value="${lvlData.mat3Name || ''}"></div><div class="form-group" style="flex:1"><label>Adet</label><input type="number" id="l${i}-m3a" value="${lvlData.mat3Amt || ''}"></div></div></div>`;
            }
        };

        window.loadNodeData = function(s) {
            document.getElementById('e-node-id').value = s.nodeID; document.getElementById('e-skill-id').value = s.skillID; document.getElementById('e-grid-x').value = s.gridX; document.getElementById('e-grid-y').value = s.gridY; document.getElementById('e-name').value = s.name; document.getElementById('e-category').value = s.category; document.getElementById('e-stat').value = s.statType; document.getElementById('e-pre1').value = s.pre1; document.getElementById('e-pre2').value = s.pre2; document.getElementById('e-max-level').value = s.maxLevel || 1; window.generateLevelInputs(); 
        };

        window.saveNodeDataDB = function() {
            if(selectedNodeId === null) { alert("Lütfen önce bir yetenek seç!"); return; }
            let s = { nodeID: selectedNodeId, skillID: parseInt(document.getElementById('e-skill-id').value) || 0, gridX: parseFloat(document.getElementById('e-grid-x').value) || 0, gridY: parseFloat(document.getElementById('e-grid-y').value) || 0, name: document.getElementById('e-name').value, category: document.getElementById('e-category').value, statType: document.getElementById('e-stat').value, pre1: parseInt(document.getElementById('e-pre1').value) || 0, pre2: parseInt(document.getElementById('e-pre2').value) || 0, maxLevel: parseInt(document.getElementById('e-max-level').value) || 1, levels: {}, iconBase64: window.globalSkills[selectedNodeId] ? window.globalSkills[selectedNodeId].iconBase64 : null };
            for (let i = 1; i <= s.maxLevel; i++) {
                s.levels[i] = { stat: document.getElementById(`l${i}-stat`) ? document.getElementById(`l${i}-stat`).value : "", money: document.getElementById(`l${i}-money`) ? document.getElementById(`l${i}-money`).value : "", mat1Name: document.getElementById(`l${i}-m1n`) ? document.getElementById(`l${i}-m1n`).value : "", mat1Amt: document.getElementById(`l${i}-m1a`) ? document.getElementById(`l${i}-m1a`).value : "", mat2Name: document.getElementById(`l${i}-m2n`) ? document.getElementById(`l${i}-m2n`).value : "", mat2Amt: document.getElementById(`l${i}-m2a`) ? document.getElementById(`l${i}-m2a`).value : "", mat3Name: document.getElementById(`l${i}-m3n`) ? document.getElementById(`l${i}-m3n`).value : "", mat3Amt: document.getElementById(`l${i}-m3a`) ? document.getElementById(`l${i}-m3a`).value : "" };
            }
            set(ref(database, 'spaceGarbageSkills/' + selectedNodeId), s); window.registerAction(s.name + " yeteneği kaydedildi.");
        };

        window.addNewSkillNode = function() {
            let skillsArray = Object.values(window.globalSkills); const newID = skillsArray.length > 0 ? Math.max(...skillsArray.map(s => s.nodeID)) + 1 : 0; const newSkillID = skillsArray.length > 0 ? Math.max(...skillsArray.map(s => s.skillID)) + 1 : 100;
            const newNode = { nodeID: newID, skillID: newSkillID, gridX: 0, gridY: 0, name: "Yeni Yetenek", category: "Core", statType: "None", pre1: 0, pre2: 0, maxLevel: 1, levels: { 1: {stat:"", money:"", mat1Name:"", mat1Amt:"", mat2Name:"", mat2Amt:"", mat3Name:"", mat3Amt:""} } };
            set(ref(database, 'spaceGarbageSkills/' + newID), newNode); selectedNodeId = newID; setTimeout(() => { window.loadNodeData(newNode); window.switchTechTab('editor'); document.getElementById('connect-ui-panel').style.display = 'block'; }, 500); window.registerAction("Ağaca yeni yetenek eklendi.");
        };

        window.deleteSkillNode = function() { if(selectedNodeId === null) return; if(confirm("Emin misin?")) { set(ref(database, 'spaceGarbageSkills/' + selectedNodeId), null); selectedNodeId = null; document.getElementById('dynamic-levels-container').innerHTML = ""; document.getElementById('e-name').value = ""; document.getElementById('connect-ui-panel').style.display = 'none'; window.cancelConnectMode(); window.registerAction("Bir yetenek ağaçtan silindi.");} };

        window.resizeCanvas = function() { const wrapper = document.getElementById('canvas-wrapper'); if(wrapper && canvas) { canvas.width = wrapper.clientWidth; canvas.height = wrapper.clientHeight; window.drawTechTree(); } };
        window.addEventListener('resize', window.resizeCanvas); setTimeout(window.resizeCanvas, 500);

        // KUSURSUZ İNTERAKTİF HARİTA DİNAMİKLERİ (V7.1)
        const canvasWrapper = document.getElementById('canvas-wrapper');
        if(canvasWrapper) {
            canvasWrapper.addEventListener('pointerdown', (e) => {
                // Eğer tıklama, bağlantı panelinin kendisi veya içindeki bir eleman üzerinde ise,
                // harita etkileşimini (kaydırma, seçim iptali vb.) tetikleme ve fonksiyonu sonlandır.
                if (e.target.closest('#connect-ui-panel')) {
                    return;
                }
                const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left; const my = e.clientY - rect.top; const spacing = window.techTreeSpacing * zoom;
                
                // 1. MAKAS (KABLO KOPARMA VE KAYDIRMA) KONTROLÜ
                for(let mp of window.lineMidpoints) {
                    if(Math.hypot(mx - mp.x, my - mp.y) < 20 * zoom) {
                        const child = mp.childNode;
                        if(mp.preIndex === 1) {
                            // Eğer pre1 kesildiyse ve pre2 varsa, pre2'yi pre1'e kaydır (Shifting)
                            if(child.pre2 && child.pre2 !== 0) {
                                set(ref(database, `spaceGarbageSkills/${child.nodeID}/pre1`), child.pre2);
                                set(ref(database, `spaceGarbageSkills/${child.nodeID}/pre2`), 0);
                            } else {
                                set(ref(database, `spaceGarbageSkills/${child.nodeID}/pre1`), 0);
                            }
                        } else {
                            // pre2 kesildiyse sadece pre2'yi sıfırla
                            set(ref(database, `spaceGarbageSkills/${child.nodeID}/pre2`), 0);
                        }
                        window.registerAction("Bağlantı koparıldı.");
                        return; // Makas kesildi, işlemi bitir
                    }
                }

                // 2. YETENEK TIKLAMASI KONTROLÜ
                let clicked = null; let skillsArray = Object.values(window.globalSkills);
                for(let i=skillsArray.length-1; i>=0; i--) {
                    const s = skillsArray[i], x = camX + (s.gridX || 0) * spacing, y = camY - (s.gridY || 0) * spacing;
                    const radius = 35 * zoom;
                    if (Math.hypot(mx - x, my - y) < radius) { clicked = s; break; }
                }

                // 3. BAĞLANTI ÇEKME MODU AÇIKSA
                if(window.connectModeTarget !== null) {
                    if(clicked && selectedNodeId !== null && clicked.nodeID !== selectedNodeId) {
                        const parentSkillId = clicked.skillID; // Tıkladığımız yetenek "Baba (Prereq)" olacak
                        
                        // Hangi butona basıldıysa direkt veritabanına o satıra yaz (Güvenli Yöntem)
                        if(window.connectModeTarget === 'pre1') {
                            set(ref(database, `spaceGarbageSkills/${selectedNodeId}/pre1`), parentSkillId);
                            document.getElementById('e-pre1').value = parentSkillId;
                        } else {
                            set(ref(database, `spaceGarbageSkills/${selectedNodeId}/pre2`), parentSkillId);
                            document.getElementById('e-pre2').value = parentSkillId;
                        }
                        
                        window.cancelConnectMode();
                        window.registerAction("Yeni yetenek bağlantısı kuruldu.");
                    } else {
                        // Boşluğa basarsa iptal et
                        window.cancelConnectMode();
                    }
                    return; // Bağlantı modunda sürükleme/kaydırma iptal edilir
                }

                // 4. NORMAL SÜRÜKLEME VEYA KAYDIRMA BAŞLANGICI
                if(clicked) { 
                    selectedNodeId = clicked.nodeID; 
                    window.loadNodeData(clicked); 
                    window.switchTechTab('editor'); 
                    document.getElementById('connect-ui-panel').style.display = 'block';
                    isDraggingNode = true; 
                    draggedNodeId = clicked.nodeID; 
                } else { 
                    selectedNodeId = null; 
                    document.getElementById('connect-ui-panel').style.display = 'none';
                    window.cancelConnectMode(); 
                    
                    isPanning = true; 
                    startPointerX = e.clientX; startPointerY = e.clientY; 
                    startCamX = camX; startCamY = camY; 
                }
                window.drawTechTree();
            });

            window.addEventListener('pointermove', (e) => { 
                if(isDraggingNode && draggedNodeId !== null) {
                    const rect = canvas.getBoundingClientRect(); const mx = e.clientX - rect.left; const my = e.clientY - rect.top; const spacing = window.techTreeSpacing * zoom;
                    const s = window.globalSkills[draggedNodeId];
                    if(s) {
                        let newGridX = (mx - camX) / spacing; let newGridY = (camY - my) / spacing;
                        if(window.isGridSnap) { newGridX = Math.round(newGridX * 2) / 2; newGridY = Math.round(newGridY * 2) / 2; }
                        s.gridX = newGridX; s.gridY = newGridY;
                        window.loadNodeData(s); window.drawTechTree(); 
                    }
                } else if(isPanning) { 
                    camX = startCamX + (e.clientX - startPointerX); camY = startCamY + (e.clientY - startPointerY); window.drawTechTree(); 
                } 
            });

            window.addEventListener('pointerup', () => { 
                if(isDraggingNode && draggedNodeId !== null) {
                    const s = window.globalSkills[draggedNodeId];
                    if(s) {
                        set(ref(database, `spaceGarbageSkills/${s.nodeID}/gridX`), s.gridX);
                        set(ref(database, `spaceGarbageSkills/${s.nodeID}/gridY`), s.gridY);
                    }
                }
                isDraggingNode = false; draggedNodeId = null; isPanning = false; 
            });

            canvasWrapper.addEventListener('wheel', (e) => { e.preventDefault(); const zoomFactor = 0.1; if(e.deltaY < 0) zoom += zoomFactor; else zoom -= zoomFactor; zoom = Math.max(0.2, Math.min(zoom, 3)); const zoomInput = document.getElementById('tech-zoom-input'); if (zoomInput) zoomInput.value = zoom.toFixed(1); window.drawTechTree(); });
        }

        window.drawTechTree = function() {
            if(!ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); 
            const spacing = window.techTreeSpacing * zoom; 
            ctx.lineWidth = 3 * zoom; let skillsArray = Object.values(window.globalSkills);
            window.lineMidpoints = [];

            skillsArray.forEach(s => {
                const tx = camX + (s.gridX || 0) * spacing, ty = camY - (s.gridY || 0) * spacing;
                [s.pre1, s.pre2].forEach((pre, idx) => {
                    if(pre && pre !== 0) { 
                        const parent = skillsArray.find(p => p.skillID === pre); 
                        if(parent) { 
                            const px = camX + (parent.gridX || 0) * spacing, py = camY - (parent.gridY || 0) * spacing; 
                            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.strokeStyle = "rgba(245, 158, 11, 0.5)"; ctx.stroke(); 
                            
                            const mx = (px + tx) / 2; const my = (py + ty) / 2;
                            ctx.fillStyle = "#ef4444"; ctx.font = `${16*zoom}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                            ctx.fillText("✂️", mx, my);
                            window.lineMidpoints.push({x: mx, y: my, childNode: s, preIndex: idx + 1});
                        } 
                    }
                });
            });

            skillsArray.forEach(s => {
                const x = camX + (s.gridX || 0) * spacing, y = camY - (s.gridY || 0) * spacing;
                const radius = 35 * zoom;
                ctx.fillStyle = s.nodeID === selectedNodeId ? "#f59e0b" : "#1e293b"; ctx.strokeStyle = s.nodeID === selectedNodeId ? "#fff" : "#f59e0b"; ctx.lineWidth = 2 * zoom;
                ctx.beginPath(); ctx.arc(x, y, radius, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
                
                const cachedImg = window.iconCache['skill_'+s.skillID]; const sColor = window.getStatColor(s.statType); const textColor = s.nodeID === selectedNodeId ? "#000" : sColor;
                ctx.textAlign = "center"; ctx.textBaseline = "middle";

                if(cachedImg) { 
                    const imgSize = 32 * zoom;
                    ctx.drawImage(cachedImg, x - imgSize / 2, y - radius / 2 - 3 * zoom, imgSize, imgSize);
                    ctx.fillStyle = textColor; ctx.font = `bold ${9*zoom}px sans-serif`; ctx.fillText(s.name || "İsimsiz", x, y + 14 * zoom);
                    ctx.fillStyle = s.nodeID === selectedNodeId ? "#333" : "#94a3b8"; ctx.font = `normal ${8*zoom}px monospace`; ctx.fillText(`ID: ${s.skillID}`, x, y + 25 * zoom);
                } else { 
                    ctx.fillStyle = textColor; ctx.font = `bold ${11*zoom}px sans-serif`; ctx.fillText(s.name || "İsimsiz", x, y - 8 * zoom);
                    ctx.fillStyle = s.nodeID === selectedNodeId ? "#333" : "#94a3b8"; ctx.font = `normal ${10*zoom}px monospace`; ctx.fillText(`ID: ${s.skillID}`, x, y + 10 * zoom);
                }
            });
        };
        window.centerTechTree = function() { const wrapper = document.getElementById('canvas-wrapper'); if(wrapper) { camX = wrapper.clientWidth / 2; camY = wrapper.clientHeight / 2; zoom = 1; const zoomInput = document.getElementById('tech-zoom-input'); if (zoomInput) zoomInput.value = zoom.toFixed(1); window.drawTechTree(); } };
        setTimeout(() => { window.resizeCanvas(); window.centerTechTree(); }, 800);

        window.exportSkillsCSV = function() {
            let skillsArray = Object.values(window.globalSkills).sort((a,b) => a.nodeID - b.nodeID); if(skillsArray.length === 0) return;
            let csvContent = "Node_ID,Skill_ID,Grid_X,Grid_Y,Skill_Name_TR,Category,Stat_Type,Prereq_ID_1,Prereq_ID_2,Max_Level";
            for(let i=1; i<=maxSupportedLevels; i++) csvContent += `,Lv${i}_Stat,Lv${i}_Money,Lv${i}_Mat1_ID,Lv${i}_Mat1_Amt,Lv${i}_Mat2_ID,Lv${i}_Mat2_Amt,Lv${i}_Mat3_ID,Lv${i}_Mat3_Amt`; csvContent += "\n";
            skillsArray.forEach(s => { let row = `${s.nodeID},${s.skillID},${s.gridX},${s.gridY},${s.name},${s.category},${s.statType},${s.pre1},${s.pre2},${s.maxLevel}`; for(let i=1; i<=maxSupportedLevels; i++) { if(s.levels && s.levels[i]) { let lvl = s.levels[i]; row += `,${lvl.stat},${lvl.money},${lvl.mat1Name},${lvl.mat1Amt},${lvl.mat2Name},${lvl.mat2Amt},${lvl.mat3Name},${lvl.mat3Amt}`; } else { row += `,,,,,,,,`; } } csvContent += row + "\n"; });
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "SpaceGarbageSkills_Live.csv"; link.click();
        };

        window.importSkillsCSV = function(event) {
            const file = event.target.files[0]; if(!file) return; const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result; const rows = text.split('\n'); let newDbData = {};
                for(let i = 1; i < rows.length; i++) {
                    if(rows[i].trim() === "") continue; let v = []; let inQuotes = false; let current = "";
                    for(let char of rows[i]) { if(char === '"') inQuotes = !inQuotes; else if(char === ',' && !inQuotes) { v.push(current); current = ""; } else current += char; } v.push(current); if(v.length < 10) continue; 
                    let nodeID = parseInt(v[0]) || 0; let maxLvl = parseInt(v[9]) || 1;
                    let s = { nodeID: nodeID, skillID: parseInt(v[1]) || 0, gridX: parseFloat(v[2]) || 0, gridY: parseFloat(v[3]) || 0, name: v[4].trim(), category: v[5].trim(), statType: v[6].trim(), pre1: parseInt(v[7]) || 0, pre2: parseInt(v[8]) || 0, maxLevel: maxLvl, levels: {}, iconBase64: window.globalSkills[nodeID] ? window.globalSkills[nodeID].iconBase64 : null };
                    let col = 10;
                    for(let lvl = 1; lvl <= maxSupportedLevels; lvl++) { if (lvl <= maxLvl) { s.levels[lvl] = { stat: v[col] ? v[col].trim() : "", money: v[col+1] ? v[col+1].trim() : "", mat1Name: v[col+2] ? v[col+2].trim() : "", mat1Amt: v[col+3] ? v[col+3].trim() : "", mat2Name: v[col+4] ? v[col+4].trim() : "", mat2Amt: v[col+5] ? v[col+5].trim() : "", mat3Name: v[col+6] ? v[col+6].trim() : "", mat3Amt: v[col+7] ? v[col+7].trim() : "" }; } col += 8; }
                    newDbData[nodeID] = s;
                }
                set(ref(database, 'spaceGarbageSkills'), newDbData).then(() => { alert("Ağaç başarıyla tohumlandı!"); document.getElementById('csvTechInput').value = ""; });
            }; reader.readAsText(file);
        };

        // ==========================================
        // DENGE MERKEZİ KOKPİT SİSTEMİ
        // ==========================================
        window.makeDraggable = function(elmnt) {
            let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0; const handle = elmnt.querySelector('.dm-drag-handle'); if (handle) { handle.onmousedown = dragMouseDown; }
            function dragMouseDown(e) { if(!elmnt.classList.contains('unpinned') || e.target.closest('.dm-pin-btn')) return; e.preventDefault(); pos3 = e.clientX; pos4 = e.clientY; document.onmouseup = closeDragElement; document.onmousemove = elementDrag; document.querySelectorAll('.dm-column').forEach(c => c.style.zIndex = 10); elmnt.style.zIndex = 11; }
            function elementDrag(e) { e.preventDefault(); pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY; pos3 = e.clientX; pos4 = e.clientY; elmnt.style.top = (elmnt.offsetTop - pos2) + "px"; elmnt.style.left = (elmnt.offsetLeft - pos1) + "px"; }
            function closeDragElement() { document.onmouseup = null; document.onmousemove = null; window.saveDmLayout(elmnt.id); }
            elmnt.addEventListener('mouseup', () => { if(elmnt.classList.contains('unpinned')) window.saveDmLayout(elmnt.id); });
        };
        window.togglePin = function(id) { const el = document.getElementById(id); const btn = el.querySelector('.dm-pin-btn'); if(el.classList.contains('unpinned')) { el.classList.remove('unpinned'); btn.innerText = '📌'; btn.title = "Sabitlenmiş"; } else { el.classList.add('unpinned'); btn.innerText = '🔓'; btn.title = "Serbest"; document.querySelectorAll('.dm-column').forEach(c => c.style.zIndex = 10); el.style.zIndex = 11; } window.saveDmLayout(id); };
        window.saveDmLayout = function(id) { const el = document.getElementById(id); const data = { left: el.style.left || window.getComputedStyle(el).left, top: el.style.top || window.getComputedStyle(el).top, width: el.style.width || window.getComputedStyle(el).width, height: el.style.height || window.getComputedStyle(el).height, unpinned: el.classList.contains('unpinned') }; localStorage.setItem('dm_layout_' + id, JSON.stringify(data)); };
        window.loadDmLayout = function() { ['dm-colItems', 'dm-colSkills', 'dm-editorCol'].forEach(id => { const el = document.getElementById(id); if(!el) return; const saved = localStorage.getItem('dm_layout_' + id); if(saved) { const data = JSON.parse(saved); el.style.left = data.left; el.style.top = data.top; el.style.width = data.width; el.style.height = data.height; if(data.unpinned) { el.classList.add('unpinned'); el.querySelector('.dm-pin-btn').innerText = '🔓'; } else { el.classList.remove('unpinned'); el.querySelector('.dm-pin-btn').innerText = '📌'; } } window.makeDraggable(el); }); };

        window.currentDengeEditor = null;
        const rarityValues = { 'Common': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4 }; const rarityColors = { 'Common': '#94a3b8', 'Rare': '#38bdf8', 'Epic': '#c084fc', 'Legendary': '#fbc531' };

        window.renderDengeLists = function() {
            const craftContainer = document.getElementById('dm-craftablesList'), rawContainer = document.getElementById('dm-rawItemsList'), skillsContainer = document.getElementById('dm-skillsList'); if(!craftContainer) return;
            craftContainer.innerHTML = ''; rawContainer.innerHTML = ''; skillsContainer.innerHTML = '';
            Object.values(window.globalItems).sort((a,b)=>a.id - b.id).forEach(item => {
                const rColor = rarityColors[item.rarity] || '#fff'; const div = document.createElement('div'); div.className = 'dm-card';
                let imgHtml = item.iconBase64 ? `<img src="${item.iconBase64}" style="width:24px;height:24px;border-radius:4px;border:1px solid #475569;background:#000;object-fit:cover;">` : `<div style="width:24px;height:24px;background:#1e293b;border-radius:4px;border:1px dashed #475569;"></div>`;
                div.innerHTML = `${imgHtml} <div><strong style="color:${rColor}; font-size:13px;">${item.id} - ${item.name} <span class="dm-rarity-tag">${item.rarity}</span></strong><br><small style="color:#aaa;">Fiyat: ${item.price || 0} 💰</small></div>`;
                div.onclick = () => window.openDengeEditor('item', item.id);
                if (item.type === 'Craftable') craftContainer.appendChild(div); else rawContainer.appendChild(div);
            });
            Object.values(window.globalSkills).sort((a,b)=>a.skillID - b.skillID).forEach(skill => {
                const div = document.createElement('div'); div.className = 'dm-card';
                let imgHtml = skill.iconBase64 ? `<img src="${skill.iconBase64}" style="width:24px;height:24px;border-radius:4px;border:1px solid #475569;background:#000;object-fit:cover;">` : `<div style="width:24px;height:24px;background:#1e293b;border-radius:4px;border:1px dashed #475569;"></div>`;
                const sColor = window.getStatColor(skill.statType);
                div.innerHTML = `${imgHtml} <strong style="color:${sColor}">${skill.skillID} - ${skill.name}</strong>`;
                div.onclick = () => window.openDengeEditor('skill', skill.nodeID);
                skillsContainer.appendChild(div);
            });
            if(window.currentDengeEditor) { if(window.currentDengeEditor.type === 'skill') { const s = window.globalSkills[window.currentDengeEditor.id]; if(s) window.analyzeDengeSkill(s); } else if(window.currentDengeEditor.type === 'item') { const itm = window.globalItems[window.currentDengeEditor.id]; if(itm) window.analyzeDengeItem(itm); } }
        };

        window.openDengeEditor = function(type, id) {
            window.currentDengeEditor = { type, id }; document.getElementById('dm-editorPanel').style.display = 'flex'; let html = '';
            if (type === 'item') {
                const item = window.globalItems[id]; if(!item) return; document.getElementById('dm-editTitle').innerText = `Eşya: ${item.name}`;
                html += `<div class="dm-form-group"><label>Satış Fiyatı ($)</label><input type="number" value="${item.price||0}" onchange="window.updateItemDB(${item.id}, 'price', this.value, true);"></div>`;
                if (item.type === 'Craftable') {
                    html += `<div class="dm-form-group"><label>Üretim Parası</label><input type="number" value="${item.craft_cost||0}" onchange="window.updateItemDB(${item.id}, 'craft_cost', this.value, true);"></div><details open class="dm-details"><summary class="dm-summary">▶ Gereken Materyaller</summary><div class="dm-details-content">`;
                    for(let i=0; i<3; i++) { const rId = (item.reqs && item.reqs[i]) ? item.reqs[i].id : 0, rAmt = (item.reqs && item.reqs[i]) ? item.reqs[i].amt : 0; html += `<label style="font-size:0.8rem;color:#777;">Materyal ${i+1}</label><div class="flex-row"><input type="number" placeholder="Item ID" value="${rId}" onchange="window.updateItemDB(${item.id}, 'reqs/${i}/id', this.value, true);"><input type="number" placeholder="Adet" value="${rAmt}" onchange="window.updateItemDB(${item.id}, 'reqs/${i}/amt', this.value, true);"></div>`; } html += `</div></details>`;
                } else { html += `<div style="color:#aaa; font-size:0.85rem; margin-top:10px;">ℹ️ Toplanabilir eşya olduğu için üretim reçetesi yoktur.</div>`; }
                document.getElementById('dm-editFields').innerHTML = html; window.analyzeDengeItem(item); 
            } else {
                const skill = window.globalSkills[id]; if(!skill) return; document.getElementById('dm-editTitle').innerText = `Yetenek: ${skill.name}`;
                for(let lv=1; lv<=(skill.maxLevel || 1); lv++) {
                    const lvlData = (skill.levels && skill.levels[lv]) ? skill.levels[lv] : {}; html += `<details class="dm-details" ${lv===1 ? 'open':''}><summary class="dm-summary">▶ Seviye ${lv} Ayarları</summary><div class="dm-details-content"><div class="dm-form-group"><label>Maliyet ($)</label><input type="number" value="${lvlData.money||''}" onchange="window.updateSkillLevelDB(${skill.nodeID}, ${lv}, 'money', this.value);"></div>`;
                    for(let mat=1; mat<=3; mat++) { const mId = lvlData[`mat${mat}Name`] || '', mAmt = lvlData[`mat${mat}Amt`] || ''; html += `<label style="font-size:0.8rem;color:#777;">Materyal ${mat} (ID)</label><div class="flex-row"><input type="text" value="${mId}" onchange="window.updateSkillLevelDB(${skill.nodeID}, ${lv}, 'mat${mat}Name', this.value);"><input type="number" value="${mAmt}" onchange="window.updateSkillLevelDB(${skill.nodeID}, ${lv}, 'mat${mat}Amt', this.value);"></div>`; } html += `</div></details>`;
                }
                document.getElementById('dm-editFields').innerHTML = html; window.analyzeDengeSkill(skill);
            }
        };
        window.updateSkillLevelDB = function(nodeId, level, field, value) { set(ref(database, `spaceGarbageSkills/${nodeId}/levels/${level}/${field}`), value); window.registerAction(`Yetenek güncellendi (Lv: ${level})`); };

        function buildItemCostTree(itemId, amount, depth) {
            const item = Object.values(window.globalItems).find(i => i.id == itemId); 
            if (!item) return { html: `<div class="dm-tree-item"><span style="color:#ef4444;">${depth === 0 ? "🔹" : "└─"} ${amount}x [BULUNAMAYAN EŞYA ID: ${itemId}]</span></div>`, maxRarity: 1 };
            let maxRarity = rarityValues[item.rarity] || 1; const color = rarityColors[item.rarity] || "#aaa"; let prefix = depth === 0 ? "🔹" : "└─"; let typeIcon = item.type === 'Trash' ? '🗑️' : item.type === 'Loot' ? '👽' : '⚙️';
            let imgHtml = item.iconBase64 ? `<img src="${item.iconBase64}" style="width:16px;height:16px;border-radius:2px;border:1px solid #475569;margin:0 4px;vertical-align:text-bottom;">` : ``;
            let html = `<div class="dm-tree-item"><span style="color:${color}; font-weight:${depth===0?'bold':'normal'}">${prefix} ${imgHtml}${amount}x ${item.name} <span style="font-size:11px; opacity:0.8; color:#94a3b8;">[ID: ${item.id} | ${typeIcon} ${item.type} | ${item.rarity}]</span></span></div>`;
            if (item.type === 'Craftable' && item.reqs) { let subHtml = ""; for(let i=0; i<item.reqs.length; i++) { const reqId = item.reqs[i].id, reqAmt = item.reqs[i].amt; if (reqId && reqAmt && reqId != 0 && reqAmt != 0) { const subResult = buildItemCostTree(reqId, parseFloat(reqAmt) * parseFloat(amount), depth + 1); subHtml += subResult.html; if (subResult.maxRarity > maxRarity) maxRarity = subResult.maxRarity; } } if (subHtml !== "") html += `<div class="dm-tree-indent">${subHtml}</div>`; }
            return { html, maxRarity };
        }

        window.analyzeDengeSkill = function(skill) {
            let imgHtml = skill.iconBase64 ? `<img src="${skill.iconBase64}" style="width:20px;height:20px;border-radius:4px;vertical-align:middle;margin-right:6px;">` : ``; let logHtml = `<strong style="font-size:1.1em; color:#fff;">${imgHtml}[ ${skill.name} ] İhtiyaç Hiyerarşisi:</strong><br><br>`;
            const maxAllowed = ((id) => { const sid = parseInt(id); if (sid <= 104) return 1; if (sid <= 113) return 2; if (sid <= 143) return 3; return 4; })(skill.skillID);
            const rarityNames = {1:'Common', 2:'Rare', 3:'Epic', 4:'Legendary'}; logHtml += `<span style="color:#fbc531">Bu yeteneğin isteyebileceği en yüksek Nadirlik: ${rarityNames[maxAllowed]}</span><br><hr style="border-color:#444; margin:10px 0;">`;
            let isSoftlocked = false;
            for(let lv=1; lv<=(skill.maxLevel || 1); lv++) {
                let hasItem = false, levelHtml = "", levelHighestRarity = 1; const lvlData = (skill.levels && skill.levels[lv]) ? skill.levels[lv] : {};
                for(let mat=1; mat<=3; mat++) { const mId = lvlData[`mat${mat}Name`], mAmt = lvlData[`mat${mat}Amt`]; if (mId && mAmt && mId != 0 && mAmt != 0) { hasItem = true; const treeData = buildItemCostTree(mId, mAmt, 0); levelHtml += treeData.html; if (treeData.maxRarity > levelHighestRarity) levelHighestRarity = treeData.maxRarity; } }
                if (hasItem) { logHtml += `<div style="background:#1e293b; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #334155;"><strong style="color:#10b981">Seviye ${lv} Gereksinimleri:</strong><br><br>${levelHtml}`; if (levelHighestRarity > maxAllowed) { isSoftlocked = true; logHtml += `<br><span style="color:#ef4444; font-weight:bold;">❌ ÖLÜMCÜL HATA: Reçetenin alt dallarında ${rarityNames[levelHighestRarity]} eşya var!</span>`; } else { logHtml += `<br><span style="color:#4ecdc4; font-size:0.85em;">✅ Seviye ${lv} Temiz.</span>`; } logHtml += `</div>`; }
            }
            if(!isSoftlocked) logHtml += `<h3 style="color:#10b981; text-align:center;">BÜTÜN SEVİYELER GÜVENLİ!</h3>`;
            const logPanel = document.getElementById('dm-logPanel'); if(logPanel) logPanel.innerHTML = logHtml;
        };

        window.analyzeDengeItem = function(item) {
            const logPanel = document.getElementById('dm-logPanel'); if(!logPanel) return;
            let imgHtml = item.iconBase64 ? `<img src="${item.iconBase64}" style="width:20px;height:20px;border-radius:4px;vertical-align:middle;margin-right:6px;">` : ``;
            if (item.type !== 'Craftable') { logPanel.innerHTML = `<span style="color:#94a3b8;">${imgHtml}${item.name} üretilebilen bir eşya olmadığı için analiz yapılamaz.</span>`; return; }
            let logHtml = `<strong style="font-size:1.1em; color:#fff;">${imgHtml}[ ${item.name} ] Üretim Hiyerarşisi:</strong><br><br><span style="color:#fbc531">Kendi Nadirliği: ${item.rarity}</span><br><hr style="border-color:#444; margin:10px 0;">`;
            let hasItem = false, levelHtml = "", levelHighestRarity = 1;
            if (item.reqs) { for(let i=0; i<item.reqs.length; i++) { const reqId = item.reqs[i].id, reqAmt = item.reqs[i].amt; if (reqId && reqAmt && reqId != 0 && reqAmt != 0) { hasItem = true; const treeData = buildItemCostTree(reqId, reqAmt, 0); levelHtml += treeData.html; if (treeData.maxRarity > levelHighestRarity) levelHighestRarity = treeData.maxRarity; } } }
            if (hasItem) { logHtml += `<div style="background:#1e293b; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #334155;"><strong style="color:#10b981">Gereksinimler:</strong><br><br>${levelHtml}`; if (levelHighestRarity > (rarityValues[item.rarity] || 1)) { logHtml += `<br><span style="color:#ef4444; font-weight:bold;">❌ MANTIK HATASI: Alt dallarda daha nadir eşya isteniyor!</span>`; } else { logHtml += `<br><span style="color:#4ecdc4; font-size:0.85em;">✅ Üretim Temiz.</span>`; } logHtml += `</div>`; } 
            else { logHtml += `<span style="color:#94a3b8;">Üretim tarifi girilmemiş.</span>`; }
            logPanel.innerHTML = logHtml;
        };


        // ==========================================
        // V5.3 SİMÜLATÖR MOTORU (BİREBİR KORUNDU)
        // ==========================================
        window.startSimulation = function() {
            const runTimeMins = parseFloat(document.getElementById('sim-run-time').value) || 3;
            const radarChance = (parseFloat(document.getElementById('sim-encounter-chance').value) || 30);
            const baseHull = parseFloat(document.getElementById('sim-base-hull').value) || 10;
            const baseDmg = parseFloat(document.getElementById('sim-base-dmg').value) || 1;
            
            const logContainer = document.getElementById('sim-timeline-log');
            const insightsContainer = document.getElementById('sim-insights-container');
            
            logContainer.innerHTML = "<div style='color:#fbc531;'>Simülasyon Başlıyor... Motor ısınıyor.</div>";
            insightsContainer.innerHTML = "";

            let items = Object.values(window.globalItems);
            let skills = Object.values(window.globalSkills);

            if(skills.length === 0 || items.length === 0) {
                logContainer.innerHTML = "<div style='color:#ef4444;'>Hata: Veritabanı boş! Simülasyon yapılamaz.</div>"; return;
            }

            let trashItems = items.filter(i => i.type === 'Trash');
            
            let totalTimeMins = 0; let totalRuns = 0; let totalDeaths = 0; let totalMoneyEarned = 0; let currentMoney = 0;
            let inventory = {}; let unlockedSkills = []; let timeline = []; let bottlenecks = {}; let deathPenaltyActive = false;

            let currentStats = {
                maxCargo: 10, maxHull: baseHull, weaponDamage: baseDmg,
                bonusRare: 0, bonusEpic: 0, bonusLegendary: 0,
                sellBonus: 0, skillDiscount: 0, craftDiscount: 0, runTimeReduction: 0
            };

            let buyablePool = [];
            skills.forEach(s => {
                let maxLv = s.maxLevel || 1;
                for(let lv=1; lv<=maxLv; lv++) {
                    if(s.levels && s.levels[lv]) {
                        let sType = s.statType || ""; let prio = 50 - (lv * 5);

                        buyablePool.push({
                            nodeID: s.nodeID, skillID: s.skillID, name: s.name, level: lv,
                            pre1: s.pre1, pre2: s.pre2, moneyCost: parseFloat(s.levels[lv].money) || 0,
                            reqs: [
                                { id: parseInt(s.levels[lv].mat1Name), amt: parseFloat(s.levels[lv].mat1Amt)||0 },
                                { id: parseInt(s.levels[lv].mat2Name), amt: parseFloat(s.levels[lv].mat2Amt)||0 },
                                { id: parseInt(s.levels[lv].mat3Name), amt: parseFloat(s.levels[lv].mat3Amt)||0 }
                            ],
                            priority: prio, statType: sType
                        });
                    }
                }
            });

            const getAllRequiredItemIDs = (target) => {
                const allReqs = new Set();
                const findReqs = (reqs) => {
                    if (!reqs) return;
                    reqs.forEach(req => {
                        if (req.id && req.amt > 0) {
                            allReqs.add(req.id);
                            const cItem = items.find(i => i.id == req.id);
                            if (cItem && cItem.type === 'Craftable') {
                                findReqs(cItem.reqs);
                            }
                        }
                    });
                };
                findReqs(target.reqs);
                return allReqs;
            };

            const calculateRequirements = (target) => {
                let flatMats = {}; let totalMoneyNeeded = (target.moneyCost || 0) * (1 - currentStats.skillDiscount);
                const getBaseMats = (reqs, multiplier) => {
                    reqs.forEach(req => {
                        if (req.id && req.amt > 0) {
                            let cItem = items.find(i => i.id == req.id);
                            if (cItem && cItem.type === 'Craftable') {
                                totalMoneyNeeded += ((cItem.craft_cost || 0) * (1 - currentStats.craftDiscount)) * (req.amt * multiplier);
                                if (cItem.reqs) getBaseMats(cItem.reqs, req.amt * multiplier);
                            } else if (cItem) {
                                flatMats[req.id] = (flatMats[req.id] || 0) + (req.amt * multiplier);
                            }
                        }
                    });
                }; getBaseMats(target.reqs, 1); return { flatMats, totalMoneyNeeded };
            };

            const simulateSingleRun = (needsEnemyLoot) => {
                let runCargoCount = 0; let runRisk = 0; let gatheredItems = {}; let isDead = false;

                while(runCargoCount < currentStats.maxCargo) {
                    runCargoCount++;
                    
                    // Eğer düşman lootu gerekiyorsa ve bu son kargo slotuysa, çöp toplama. Yeri loota ayır.
                    if (needsEnemyLoot && runCargoCount === currentStats.maxCargo && currentStats.maxCargo > 0) {
                        // Çöp toplama, slotu boş bırak.
                    } else {
                        if (trashItems.length > 0) {
                            let randomTrash = trashItems[Math.floor(Math.random() * trashItems.length)];
                            gatheredItems[randomTrash.id] = (gatheredItems[randomTrash.id] || 0) + 1;
                        }
                    }

                    if (runCargoCount >= (currentStats.maxCargo * 0.5)) {
                        let radarRoll = Math.random() * 100;
                        if (radarRoll <= radarChance) {
                            let enemyHP = 10 + (runRisk * 2); 
                            let enemyDmg = 1 + Math.floor(runRisk / 2);

                            let hitsToKillEnemy = Math.ceil(enemyHP / (currentStats.weaponDamage * 2));
                            let hitsToKillPlayer = Math.ceil(currentStats.maxHull / (enemyDmg * 2));
                            let shouldFight = false;

                            if (needsEnemyLoot) {
                                shouldFight = hitsToKillPlayer > hitsToKillEnemy;
                            } else {
                                shouldFight = hitsToKillPlayer > hitsToKillEnemy * 1.5;
                            }

                            if (shouldFight) {
                                runRisk++;
                                if (hitsToKillPlayer <= hitsToKillEnemy) {
                                    isDead = true; 
                                    break;
                                } else {
                                    let lootCount = 0; let rarities = [];
                                    if(runRisk <= 2) { lootCount = Math.floor(Math.random()*2)+1; rarities.push("Common"); for(let i=1;i<lootCount;i++) rarities.push("Common"); }
                                    else if(runRisk <= 5) { lootCount = Math.floor(Math.random()*2)+2; rarities.push("Rare"); for(let i=1;i<lootCount;i++) rarities.push(Math.random()>0.3?"Common":"Rare"); }
                                    else if(runRisk <= 8) { lootCount = Math.floor(Math.random()*2)+3; rarities.push("Epic"); for(let i=1;i<lootCount;i++) { let r=Math.random(); rarities.push(r<0.6?"Common":(r<0.9?"Rare":"Epic")); } }
                                    else { lootCount = Math.floor(Math.random()*3)+4; rarities.push("Legendary"); for(let i=1;i<lootCount;i++) { let r=Math.random(); rarities.push(r<0.5?"Common":(r<0.8?"Rare":(r<0.95?"Epic":"Legendary"))); } }

                                    rarities.forEach(rar => {
                                        let finalRar = rar;
                                        if(finalRar==="Common" && Math.random() < currentStats.bonusRare) finalRar = "Rare";
                                        if(finalRar==="Rare" && Math.random() < currentStats.bonusEpic) finalRar = "Epic";
                                        if(finalRar==="Epic" && Math.random() < currentStats.bonusLegendary) finalRar = "Legendary";

                                        let canDrop = true;
                                        if (finalRar === "Rare" && !unlockedSkills.some(u => u.skillID === 113)) canDrop = false; 
                                        if (finalRar === "Epic" && !unlockedSkills.some(u => u.skillID === 143)) canDrop = false; 

                                        if (canDrop) {
                                            let possibleItems = items.filter(i => i.type === 'Loot' && i.rarity === finalRar);
                                            if(possibleItems.length > 0) {
                                                let dropItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                                                gatheredItems[dropItem.id] = (gatheredItems[dropItem.id] || 0) + 1;
                                            }
                                        }
                                    });
                                }
                            } else {
                                // Bot savaştan kaçtı, seferi bitir.
                                break;
                            }
                        }
                    }
                }
                return { dead: isDead, gathered: isDead ? {} : gatheredItems, riskTaken: runRisk };
            };

            let loopSafety = 0;
            
            while(buyablePool.length > 0 && loopSafety < 10000) {
                loopSafety++; // Sonsuz döngü koruması

                let availableTargets = buyablePool.filter(target => {
                    if(target.level > 1 && !unlockedSkills.some(u => u.nodeID === target.nodeID && u.level === (target.level - 1))) return false;
                    if(target.level === 1) {
                        if(target.pre1 != 0 && !unlockedSkills.some(u => u.skillID === target.pre1)) return false;
                        if(target.pre2 != 0 && !unlockedSkills.some(u => u.skillID === target.pre2)) return false;
                    }
                    return true;
                });

                if(availableTargets.length === 0) break; 

                availableTargets.forEach(t => {
                    t.currentPrio = t.priority;
                    if (deathPenaltyActive && (t.statType.includes("Weapon") || t.statType.includes("Hull") || t.statType.includes("MaxHealth"))) {
                        t.currentPrio += 500; // Ölüm cezası varsa hayatta kalma yeteneklerine dev öncelik ver.
                    }
                });

                availableTargets.sort((a,b) => (b.currentPrio - (b.moneyCost/2000)) - (a.currentPrio - (a.moneyCost/2000)));
                let target = availableTargets[0];

                const { flatMats, totalMoneyNeeded } = calculateRequirements(target);
                const needsEnemyLoot = Object.keys(flatMats).some(matId => { const item = items.find(i => i.id == matId); return item && item.type === 'Loot'; });

                let targetAcquired = false;
                let runsForThisSkill = 0;
                let lastMissingReason = "Hesaplanıyor..."; 
                let runResult; // Değişkeni döngünün dışında tanımlayarak kapsam sorununu çöz.

                while(!targetAcquired && runsForThisSkill < 5000) { 
                    totalRuns++; runsForThisSkill++;
                    
                    runResult = simulateSingleRun(needsEnemyLoot); // Sadece değer ata.
                    totalTimeMins += Math.max(0.5, runTimeMins - currentStats.runTimeReduction);

                    if(runResult.dead) {
                        totalDeaths++;
                        deathPenaltyActive = true;
                        timeline.push(`[Tur ${totalRuns}] 💀 <b>ÖLÜM!</b> Gemi patladı. Strateji gözden geçiriliyor...`);
                        break; // Bu hedef için farm yapmayı bırak, ana döngüye dön ve yeni hedef seç.
                    } else {
                        for(let id in runResult.gathered) {
                            inventory[id] = (inventory[id] || 0) + runResult.gathered[id];
                        }

                        // AKILLI SATIŞ: Sadece mevcut ve gelecekteki hedefler için GEREKMEYEN eşyaları sat.
                        const requiredItems = getAllRequiredItemIDs(target);
                        const futureTargets = availableTargets.filter(t => t.nodeID !== target.nodeID).slice(0, 3);
                        futureTargets.forEach(ft => {
                            getAllRequiredItemIDs(ft).forEach(id => requiredItems.add(id));
                        });
                        
                        for(let id in inventory) {
                            if (inventory[id] > 0 && !requiredItems.has(parseInt(id))) {
                                const itemToSell = items.find(i => i.id == id);
                                if (itemToSell) {
                                    const moneyGain = (inventory[id] * (itemToSell.price || 0)) * (1 + currentStats.sellBonus);
                                    currentMoney += moneyGain; totalMoneyEarned += moneyGain;
                                }
                                inventory[id] = 0; // Gereksiz tüm eşyaları sat.
                            }
                        }

                        let matsOk = true;
                        let missingResources = [];

                        if (currentMoney < totalMoneyNeeded) {
                            missingResources.push(`$${(totalMoneyNeeded - currentMoney).toFixed(0)} Kredi`);
                            matsOk = false;
                        }

                        for(let id in flatMats) {
                            let needed = flatMats[id];
                            let has = inventory[id] || 0;
                            if (has < needed) {
                                matsOk = false;
                                let itm = items.find(i => i.id == id);
                                missingResources.push(`${needed - has}x ${itm ? itm.name : id}`);
                            }
                        }

                        if (missingResources.length === 0) {
                            currentMoney -= totalMoneyNeeded;
                            for(let id in flatMats) {
                                inventory[id] -= flatMats[id];
                            }
                            targetAcquired = true;
                        } else {
                            lastMissingReason = missingResources.join(', '); 
                        }
                    }
                }

                if (runResult.dead) continue; // Ölüm durumunda ana döngünün başına dön.

                if(!targetAcquired) {
                    timeline.push(`<span style="color:#ef4444;">[Tur ${totalRuns}] 🛑 KİLİTLENDİ! '${target.name} Lv${target.level}' yeteneği 5000 sefer atılmasına rağmen açılamadı. Sebep: ${lastMissingReason}</span>`);
                    break;
                }

                unlockedSkills.push({ nodeID: target.nodeID, skillID: target.skillID, level: target.level });
                buyablePool = buyablePool.filter(p => !(p.nodeID === target.nodeID && p.level === target.level));

                // ===================================================================
                // YENİ: Yetenek Statlarını Veritabanından Dinamik Olarak Uygula
                // ===================================================================
                const statTypeToSimStat = { 'CargoCapacity': 'maxCargo', 'MaxHealth': 'maxHull', 'WeaponDamage': 'weaponDamage', 'LootChanceRare': 'bonusRare', 'LootChanceEpic': 'bonusEpic', 'LootChanceLegendary': 'bonusLegendary', 'DroneSpeed': 'runTimeReduction', 'SellPriceBonus': 'sellBonus', 'SkillCostReduction': 'skillDiscount', 'CraftCostReduction': 'craftDiscount' };
                const skillData = window.globalSkills[target.nodeID];
                if (skillData && skillData.levels && skillData.levels[target.level]) {
                    const levelData = skillData.levels[target.level];
                    const statString = (levelData.stat || "").trim();
                    const statType = skillData.statType;
                    const simStatKey = statTypeToSimStat[statType];

                    if (simStatKey && statString) {
                        let value = parseFloat(statString.replace(/[%*]/g, ''));
                        if (!isNaN(value)) {
                            if (statString.startsWith('+') || !isNaN(statString[0])) {
                                currentStats[simStatKey] += value;
                            } else if (statString.startsWith('-') && !statString.includes('%')) {
                                currentStats[simStatKey] -= value;
                            } else if (statString.includes('*%')) {
                                currentStats[simStatKey] *= (1 + value / 100);
                            } else if (statString.includes('-%') || statString.includes('/%')) {
                                currentStats[simStatKey] *= (1 - value / 100);
                            } else if (statString.startsWith('*')) {
                                currentStats[simStatKey] *= value;
                            } else if (statString.startsWith('/')) {
                                currentStats[simStatKey] /= value;
                            }
                        }
                    }
                }
                // ===================================================================

                // Eğer bir hayatta kalma yeteneği aldıysak, ölüm cezasını kaldır.
                if (deathPenaltyActive && (target.statType.includes("Weapon") || target.statType.includes("Hull") || target.statType.includes("MaxHealth"))) {
                    deathPenaltyActive = false;
                }

                let logMsg = `[Tur ${totalRuns}] 🔓 <b>${target.name} (Lv ${target.level})</b> açıldı.`;
                if(runsForThisSkill > 20) { 
                    logMsg += ` <span style="color:#fbc531;">(Bu yetenek için ${runsForThisSkill} tur eziyet çekildi! Son Eksik: ${lastMissingReason})</span>`;
                    bottlenecks[target.name] = { runs: runsForThisSkill, reason: lastMissingReason };
                }
                timeline.push(logMsg);
            }

            const hours = Math.floor(totalTimeMins / 60);
            const mins = Math.floor(totalTimeMins % 60);
            
            document.getElementById('sim-res-time').innerText = `${hours} Saat ${mins} Dk`;
            document.getElementById('sim-res-runs').innerText = totalRuns.toLocaleString();
            document.getElementById('sim-res-deaths').innerText = totalDeaths.toLocaleString();
            
            let totalPossible = skills.reduce((acc, s) => acc + (s.maxLevel || 1), 0);
            document.getElementById('sim-res-skills').innerText = `${unlockedSkills.length} / ${totalPossible}`;

            logContainer.innerHTML = timeline.join('<br>') + "<br><br><span style='color:#10b981;'>--- SİMÜLASYON TAMAMLANDI ---</span>";

            let insightsHtml = "";

            let bottleneckKeys = Object.keys(bottlenecks);
            if (bottleneckKeys.length > 0) {
                let worstBottleneckKey = bottleneckKeys.sort((a,b) => bottlenecks[b].runs - bottlenecks[a].runs)[0];
                const bottleneckInfo = bottlenecks[worstBottleneckKey];
                if(worstBottleneckKey) {
                    insightsHtml += `
                    <div class="sim-insight-card insight-danger">
                        <h4 style="color:#ef4444;">⚠️ Kritik Eziyet (Grind) Tespiti</h4>
                        <p>Oyuncu sadece <b>${worstBottleneckKey}</b> yeteneğini açabilmek için aralıksız <b>${bottleneckInfo.runs} Sefer (Run)</b> yapmak zorunda kaldı. <br><b>Darboğaz Sebebi:</b> <span style="color:#fbc531;">${bottleneckInfo.reason || 'Bilinmiyor'}</span></p>
                    </div>`;
                }
            }

            if(buyablePool.length > 0) {
                insightsHtml += `
                <div class="sim-insight-card insight-warning">
                    <h4 style="color:#fbc531;">👻 Kilitli/Ölü Yetenekler</h4>
                    <p>Oyuncu <b>${buyablePool.length} yeteneği</b> asla açamadı. İstedikleri materyaller bu botun oyun stiline göre düşmüyor (Örn: Hiç savaşmayan bot Legendary materyal istiyor).</p>
                </div>`;
            } else {
                insightsHtml += `
                <div class="sim-insight-card insight-success">
                    <h4 style="color:#10b981;">✅ Denge Kusursuz</h4>
                    <p>Tüm yetenekler ulaşılamaz olmadan, akıcı bir C# sefer döngüsü ile açılabildi.</p>
                </div>`;
            }

            if(currentMoney > (totalMoneyEarned * 0.4) && totalMoneyEarned > 500) {
                insightsHtml += `
                <div class="sim-insight-card insight-info">
                    <h4 style="color:#3b82f6;">📉 Sefer Sonu Enflasyonu</h4>
                    <p>Bot tüm yetenekleri açtıktan sonra elinde <b>$${Math.floor(currentMoney).toLocaleString()}</b> nakit kaldı. Parayı harcayacak Prestij içerikleri eklemelisin.</p>
                </div>`;
            }

            if(totalDeaths > (totalRuns * 0.2)) {
                insightsHtml += `
                <div class="sim-insight-card insight-danger">
                    <h4 style="color:#ef4444;">💀 Çok Yüksek Ölüm Oranı</h4>
                    <p>Oyuncu çıktığı seferlerin %20'sinden fazlasında öldü! Düşmanların canı (${currentStats.maxHull}) veya silah hasarı oyunun başında çok zorlayıcı olabilir.</p>
                </div>`;
            }

            insightsContainer.innerHTML = insightsHtml;
        };