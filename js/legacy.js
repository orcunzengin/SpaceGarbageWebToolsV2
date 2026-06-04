window.iconCache = {}; 
        window.isGridSnap = true;
        window.connectModeTarget = null; // 'pre1' veya 'pre2' olacak
        window.lineMidpoints = [];

        // Debounce fonksiyonu, bir fonksiyonun belirli bir süre içinde tekrar tekrar çağrılmasını engeller.
        // Not defterine her harf yazdığımızda kaydetmek yerine, yazmayı bıraktıktan kısa bir süre sonra kaydeder.
        function debounce(func, wait, immediate) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        };

        window.getStatColor = function(statType) {
            if (!statType || statType === "None" || statType.trim() === "") return "#ffffff";
            let hash = 0; for (let i = 0; i < statType.length; i++) { hash = statType.charCodeAt(i) + ((hash << 5) - hash); }
            return `hsl(${Math.abs(hash % 360)}, 85%, 70%)`; 
        };
        
        window.toggleSidebar = function() {
            const sb = document.getElementById('sidebar-menu'); const btn = document.querySelector('.sidebar-toggle');
            if (sb.classList.contains('collapsed')) { sb.classList.remove('collapsed'); btn.innerText = '◀'; } else { sb.classList.add('collapsed'); btn.innerText = '▶'; }
            setTimeout(() => { if(window.resizeCanvas) window.resizeCanvas(); }, 300);
        };
        
        window.toggleGridSnap = function() {
            window.isGridSnap = !window.isGridSnap;
            const btn = document.getElementById('btn-grid-snap');
            btn.innerText = window.isGridSnap ? "🧲 Mıknatıs (AÇIK)" : "🧲 Serbest (KAPALI)";
            btn.style.background = window.isGridSnap ? "#f59e0b" : "#475569";
            btn.style.color = window.isGridSnap ? "#000" : "#fff";
        };

        window.toggleLoginModal = function() {
            const modal = document.getElementById('login-modal');
            if (modal.style.display === 'none' || modal.style.display === '') {
                modal.style.display = 'flex';
                document.getElementById('auth-error').style.display = 'none';
            } else {
                modal.style.display = 'none';
            }
        };

        window.startConnectMode = function(target) {
            window.connectModeTarget = target;
            document.getElementById('btn-pre1').classList.remove('active-link');
            document.getElementById('btn-pre2').classList.remove('active-link');
            if(target === 'pre1') document.getElementById('btn-pre1').classList.add('active-link');
            if(target === 'pre2') document.getElementById('btn-pre2').classList.add('active-link');
            
            const wrapper = document.getElementById('canvas-wrapper');
            if(wrapper) wrapper.style.cursor = 'crosshair';
        };

        window.cancelConnectMode = function() {
            window.connectModeTarget = null;
            document.getElementById('btn-pre1').classList.remove('active-link');
            document.getElementById('btn-pre2').classList.remove('active-link');
            const wrapper = document.getElementById('canvas-wrapper');
            if(wrapper) wrapper.style.cursor = 'default';
        };

        function openTool(toolId) {
            window.cancelConnectMode(); // Sekme değişince bağlantıyı iptal et
            document.getElementById('connect-ui-panel').style.display = 'none';
            document.querySelectorAll('.tool-section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(toolId).classList.add('active'); event.target.classList.add('active');
            if (toolId === 'tech-tool') { setTimeout(() => { if(window.resizeCanvas) window.resizeCanvas(); if(window.centerTechTree) window.centerTechTree(); }, 50); }
            if (toolId === 'stat-tool') { setTimeout(() => { if(window.recalculateStats) window.recalculateStats(); }, 50); }
            if (toolId === 'denge-tool') { setTimeout(() => { window.loadDmLayout(); }, 50); }
        }

        // ==========================================
        // KAPTANIN JURNALİ - SÜPER GÜÇLÜ NOT DEFTERİ
        // ==========================================
        const noteEditor = document.getElementById('note-editor');
        const syntaxTokens = {
            comment: /(\/\/.*|\/\*[\s\S]*?\*\/)/g,
            keyword: /\b(let|const|var|function|return|if|else|for|while|new|import|from|class|public|private|static|void|int|float|string|bool|true|false|null)\b/g,
            string: /(".*?"|'.*?'|`.*?`)/g,
            function: /(\w+)\s*(?=\()/g,
            number: /\b\d+(\.\d+)?\b/g,
            operator: /([+\-*/=<>!&|%]+)/g
        };

        window.deleteNoteBlock = (btn) => { btn.closest('.note-block-wrapper').remove(); window.debouncedSaveNote(); };
        window.copyCode = (btn) => { const code = btn.closest('.note-code-block').querySelector('code').innerText; navigator.clipboard.writeText(code).then(() => { btn.innerText = 'Kopyalandı!'; setTimeout(() => btn.innerText = 'Kopyala', 1500); }); };
        
        const highlightSyntax = (codeEl) => {
            let html = codeEl.innerText;
            html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Sanitize
            Object.keys(syntaxTokens).forEach(key => { html = html.replace(syntaxTokens[key], (match) => `<span class="token-${key}">${match}</span>`); });
            codeEl.innerHTML = html;
        };

        const parseSpecialLinks = (element) => {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while(node = walker.nextNode()) {
                if (node.parentElement.nodeName === 'A' || node.parentElement.closest('pre, summary')) continue;
                const text = node.nodeValue;
                const regex = /(#S(\d+)|#I(\d+))/g;
                if (regex.test(text)) {
                    const fragment = document.createDocumentFragment();
                    let lastIndex = 0;
                    text.replace(regex, (match, fullMatch, skillId, itemId, offset) => {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
                        const link = document.createElement('a');
                        link.className = 'note-link';
                        link.contentEditable = false;
                        if (skillId) {
                            const skill = Object.values(window.globalSkills).find(s => s.skillID == skillId);
                            link.innerText = skill ? skill.name : match;
                            link.title = `Yetenek Ağacında Göster: ${skill ? skill.name : 'Bilinmeyen'}`;
                            link.onclick = () => window.jumpToLink('skill', skillId);
                        } else if (itemId) {
                            const item = window.globalItems[itemId];
                            link.innerText = item ? item.name : match;
                            link.title = `Item Ayarlarında Göster: ${item ? item.name : 'Bilinmeyen'}`;
                            link.onclick = () => window.jumpToLink('item', itemId);
                        }
                        fragment.appendChild(link);
                        lastIndex = offset + match.length;
                    });
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                    node.parentElement.replaceChild(fragment, node);
                }
            }
        };

        const debouncedHighlight = debounce(() => { noteEditor.querySelectorAll('code').forEach(highlightSyntax); }, 300);
        const debouncedLinkParser = debounce(() => parseSpecialLinks(noteEditor), 500);
        window.handleNoteKeyUp = (event) => { window.debouncedSaveNote(); if (event.target.closest('code')) { debouncedHighlight(); } else { debouncedLinkParser(); } };

        const createBlockWrapper = (innerHtml) => `<div class="note-block-wrapper" contenteditable="false"><button class="block-delete-btn" onclick="window.deleteNoteBlock(this)" title="Bloğu Sil">❌</button>${innerHtml}</div>`;

        function ensureFocusAndInsert(htmlString) {
            const editor = document.getElementById('note-editor');
            editor.focus();
            let selection = window.getSelection();
            if (selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) {
                let range = document.createRange();
                range.selectNodeContents(editor);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            document.execCommand('insertHTML', false, htmlString);
            if(window.debouncedSaveNote) window.debouncedSaveNote();
        }

        window.insertTask = function() {
            const taskHtml = createBlockWrapper(`<div class="task-row"><input type="checkbox" onchange="window.debouncedSaveNote()"><div class="task-text" contenteditable="true">Yeni görev...</div></div>`);
            ensureFocusAndInsert(taskHtml + '<div><br></div>');
        };

        window.insertToggle = function() {
            const toggleHtml = createBlockWrapper(`<details class="note-toggle" open><summary contenteditable="true">Genişletilebilir Başlık</summary><div class="toggle-content" contenteditable="true"><p><br></p></div></details>`);
            ensureFocusAndInsert(toggleHtml + '<div><br></div>');
        };

        window.insertCodeBlock = function() {
            const codeBlockHtml = createBlockWrapper(`
                <details class="note-code-block" open>
                    <summary contenteditable="false">
                        <div class="code-header">
                            <span class="code-title" contenteditable="true">Kod Parçacığı</span>
                            <span class="code-lang">JS</span>
                            <button class="code-copy-btn" onclick="window.copyCode(this)">Kopyala</button>
                        </div>
                    </summary>
                    <pre><code contenteditable="true" onkeyup="window.handleNoteKeyUp(event)">// Kodunuzu buraya yazın...</code></pre>
                </details>`);
            ensureFocusAndInsert(codeBlockHtml + '<div><br></div>');
        };

        window.jumpToLink = (type, id) => {
            if (type === 'skill') {
                if (window.focusOnSkill) window.focusOnSkill(id);
            } else if (type === 'item') {
                const item = window.globalItems ? window.globalItems[id] : null; if (!item) return;
                document.querySelector('.nav-btn[onclick*="item-tool"]').click();
                setTimeout(() => { document.querySelector(`.tab-btn[onclick*="'${item.type}'"]`).click(); setTimeout(() => { const card = document.getElementById(`item-card-${id}`); if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.classList.add('highlighted'); setTimeout(() => card.classList.remove('highlighted'), 1500); } }, 100); }, 100);
            }
        };