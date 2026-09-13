/**
 * ENTERPRISE HR POLICY AGENTIC RAG COPILOT - INTERACTIVE JS
 */

document.addEventListener('DOMContentLoaded', () => {
    // STATE MANAGEMENT
    const state = {
        theme: localStorage.getItem('hr_rag_theme') || 'dark',
        soundEnabled: localStorage.getItem('hr_rag_sound') !== 'false',
        messages: [],
        activeTrace: null,
        history: [],
        backendOnline: false,
        isThinking: false,
        selectedFile: null,
        speechRecognition: null,
        isListening: false
    };

    // DOM ELEMENTS
    const elements = {
        html: document.documentElement,
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        btnNewChat: document.getElementById('btn-new-chat'),
        historyList: document.getElementById('history-list'),
        welcomeScreen: document.getElementById('welcome-screen'),
        messagesContainer: document.getElementById('messages-container'),
        messagesList: document.getElementById('messages-list'),
        chatTextarea: document.getElementById('chat-textarea'),
        btnSend: document.getElementById('btn-send'),
        btnMic: document.getElementById('btn-mic-input'),
        charCount: document.getElementById('char-count'),
        pillsBar: document.getElementById('pills-bar'),
        
        // Trace Drawer
        traceDrawer: document.getElementById('trace-drawer'),
        btnCloseDrawer: document.getElementById('btn-close-drawer'),
        sourcesList: document.getElementById('sources-list'),
        traceJson: document.getElementById('trace-json'),
        btnCopyTrace: document.getElementById('btn-copy-trace'),
        
        // Pipeline steps
        stepRewrite: document.getElementById('step-rewrite'),
        stepSearch: document.getElementById('step-search'),
        stepPolicy: document.getElementById('step-policy'),
        stepSynthesis: document.getElementById('step-synthesis'),
        stepDetailRewrite: document.getElementById('step-detail-rewrite'),
        stepDetailSearch: document.getElementById('step-detail-search'),
        stepDetailPolicy: document.getElementById('step-detail-policy'),
        stepDetailSynthesis: document.getElementById('step-detail-synthesis'),

        // Status & Toggles
        backendStatus: document.getElementById('backend-status'),
        btnThemeToggle: document.getElementById('btn-theme-toggle'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),
        globalSearchTrigger: document.getElementById('global-search-trigger'),

        // Modals
        btnIngestModal: document.getElementById('btn-ingest-modal'),
        modalIngest: document.getElementById('modal-ingest'),
        btnCloseIngestModal: document.getElementById('btn-close-ingest-modal'),
        btnCancelIngest: document.getElementById('btn-cancel-ingest'),
        ingestForm: document.getElementById('ingest-form'),
        fileDropzone: document.getElementById('file-dropzone'),
        fileInput: document.getElementById('file-input'),
        filePreview: document.getElementById('file-preview'),
        selectedFilename: document.getElementById('selected-filename'),
        btnRemoveFile: document.getElementById('btn-remove-file'),
        ingestProgress: document.getElementById('ingest-progress'),
        progressBarFill: document.getElementById('progress-bar-fill'),

        btnAuditModal: document.getElementById('btn-audit-modal'),
        modalAudit: document.getElementById('modal-audit'),
        btnCloseAuditModal: document.getElementById('btn-close-audit-modal'),
        auditTableBody: document.getElementById('audit-table-body'),

        toastContainer: document.getElementById('toast-container')
    };

    // INIT APPLICATION
    function init() {
        applyTheme(state.theme);
        updateSoundIcon();
        setupEventListeners();
        checkBackendHealth();
        initSpeechRecognition();
        populateAuditTable();
    }

    // AUDIO SYNTHESIZER FOR SOUND EFFECTS
    function playSound(type) {
        if (!state.soundEnabled) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;
            if (type === 'send') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'receive') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
                osc.start(now);
                osc.stop(now + 0.04);
            }
        } catch (e) {
            // Audio context not allowed without gesture
        }
    }

    // THEME CONTROLLER
    function applyTheme(theme) {
        state.theme = theme;
        elements.html.setAttribute('data-theme', theme);
        localStorage.setItem('hr_rag_theme', theme);
        const icon = elements.btnThemeToggle.querySelector('i');
        if (theme === 'dark') {
            icon.className = 'fa-solid fa-moon';
        } else {
            icon.className = 'fa-solid fa-sun';
        }
    }

    function toggleTheme() {
        playSound('click');
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    }

    function toggleSound() {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('hr_rag_sound', state.soundEnabled);
        updateSoundIcon();
        if (state.soundEnabled) playSound('click');
    }

    function updateSoundIcon() {
        const icon = elements.btnSoundToggle.querySelector('i');
        icon.className = state.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
    }

    // BACKEND HEALTH CHECK
    async function checkBackendHealth() {
        try {
            const res = await fetch('/api/health');
            if (res.ok) {
                state.backendOnline = true;
                elements.backendStatus.classList.remove('offline');
                elements.backendStatus.classList.add('online');
                elements.backendStatus.querySelector('.status-text').textContent = 'RAG Engine Online';
            } else {
                throw new Error('API unreachable');
            }
        } catch (err) {
            state.backendOnline = false;
            elements.backendStatus.classList.remove('online');
            elements.backendStatus.classList.add('offline');
            elements.backendStatus.querySelector('.status-text').textContent = 'Demo Mode (Offline)';
        }
    }

    // SPEECH RECOGNITION (VOICE INPUT)
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            state.speechRecognition = new SpeechRecognition();
            state.speechRecognition.continuous = false;
            state.speechRecognition.interimResults = true;

            state.speechRecognition.onstart = () => {
                state.isListening = true;
                elements.btnMic.classList.add('listening');
                showToast('Listening... speak your query', 'info');
            };

            state.speechRecognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(res => res[0].transcript)
                    .join('');
                elements.chatTextarea.value = transcript;
                autoResizeTextarea();
            };

            state.speechRecognition.onerror = (event) => {
                state.isListening = false;
                elements.btnMic.classList.remove('listening');
                showToast('Voice input error: ' + event.error, 'error');
            };

            state.speechRecognition.onend = () => {
                state.isListening = false;
                elements.btnMic.classList.remove('listening');
            };
        } else {
            elements.btnMic.style.display = 'none';
        }
    }

    function toggleVoiceInput() {
        if (!state.speechRecognition) return;
        playSound('click');
        if (state.isListening) {
            state.speechRecognition.stop();
        } else {
            state.speechRecognition.start();
        }
    }

    // TEXT-TO-SPEECH
    function speakText(text) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel(); // Stop ongoing speech
        const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>?/gm, ''));
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
        showToast('Reading response aloud...', 'info');
    }

    // EVENT LISTENERS
    function setupEventListeners() {
        // Toggles
        elements.sidebarToggle.addEventListener('click', () => {
            playSound('click');
            elements.sidebar.classList.toggle('collapsed');
        });
        elements.btnCloseDrawer.addEventListener('click', () => {
            playSound('click');
            elements.traceDrawer.classList.add('collapsed');
        });
        elements.btnThemeToggle.addEventListener('click', toggleTheme);
        elements.btnSoundToggle.addEventListener('click', toggleSound);
        elements.globalSearchTrigger.addEventListener('click', () => {
            elements.chatTextarea.focus();
        });

        // Chat interactions
        elements.btnSend.addEventListener('click', handleSendMessage);
        elements.chatTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
        elements.chatTextarea.addEventListener('input', autoResizeTextarea);
        elements.btnMic.addEventListener('click', toggleVoiceInput);
        elements.btnNewChat.addEventListener('click', startNewChat);

        // Prompt Cards & Pills
        document.querySelectorAll('.prompt-card, .topic-item, .pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const query = btn.getAttribute('data-query');
                if (query) {
                    playSound('click');
                    elements.chatTextarea.value = query;
                    handleSendMessage();
                }
            });
        });

        // Ingest Modal
        elements.btnIngestModal.addEventListener('click', () => openModal(elements.modalIngest));
        elements.btnCloseIngestModal.addEventListener('click', () => closeModal(elements.modalIngest));
        elements.btnCancelIngest.addEventListener('click', () => closeModal(elements.modalIngest));
        elements.fileDropzone.addEventListener('click', () => elements.fileInput.click());
        elements.fileInput.addEventListener('change', handleFileSelect);
        elements.btnRemoveFile.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSelectedFile();
        });

        // Drag & Drop
        elements.fileDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.add('dragover');
        });
        elements.fileDropzone.addEventListener('dragleave', () => elements.fileDropzone.classList.remove('dragover'));
        elements.fileDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                elements.fileInput.files = e.dataTransfer.files;
                handleFileSelect();
            }
        });

        elements.ingestForm.addEventListener('submit', handleIngestSubmit);

        // Audit Modal
        elements.btnAuditModal.addEventListener('click', () => openModal(elements.modalAudit));
        elements.btnCloseAuditModal.addEventListener('click', () => closeModal(elements.modalAudit));

        // Copy trace
        elements.btnCopyTrace.addEventListener('click', () => {
            if (elements.traceJson.textContent) {
                navigator.clipboard.writeText(elements.traceJson.textContent);
                showToast('Trace log copied to clipboard!', 'success');
            }
        });

        // Global Shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                elements.chatTextarea.focus();
            } else if (e.key === 'Escape') {
                closeModal(elements.modalIngest);
                closeModal(elements.modalAudit);
                elements.traceDrawer.classList.add('collapsed');
            }
        });
    }

    // TEXTAREA AUTO-RESIZE
    function autoResizeTextarea() {
        const ta = elements.chatTextarea;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
        elements.charCount.textContent = `${ta.value.length} / 3000`;
    }

    // CHAT ENGINE
    async function handleSendMessage() {
        const question = elements.chatTextarea.value.trim();
        if (!question || state.isThinking) return;

        playSound('send');
        state.isThinking = true;

        // Hide welcome screen & show chat list
        elements.welcomeScreen.classList.add('hidden');
        elements.messagesContainer.classList.remove('hidden');

        // Render User Message
        appendMessage({ role: 'user', content: question });
        elements.chatTextarea.value = '';
        autoResizeTextarea();

        // Update history sidebar
        addHistoryItem(question);

        // Render Assistant Loading Bubble
        const loadingId = 'loading-' + Date.now();
        appendLoadingMessage(loadingId);

        // Animate Trace steps
        resetTraceDrawer();
        elements.traceDrawer.classList.remove('collapsed');
        updatePipelineStep('step-rewrite', 'active', `Optimizing query: "${question.substring(0, 30)}..."`);

        try {
            let data;
            if (state.backendOnline) {
                // Call real FastAPI endpoint
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question })
                });
                if (!res.ok) throw new Error('API server returned error');
                data = await res.json();
            } else {
                // Simulate agentic RAG response with realistic trace steps
                await new Promise(r => setTimeout(r, 600));
                updatePipelineStep('step-rewrite', 'done', 'Rewritten into semantic vector query.');
                updatePipelineStep('step-search', 'active', 'Executing HNSW Cosine Similarity search...');

                await new Promise(r => setTimeout(r, 700));
                updatePipelineStep('step-search', 'done', 'Retrieved 4 relevant policy chunks.');
                updatePipelineStep('step-policy', 'active', 'Verifying enterprise compliance & effective dates...');

                await new Promise(r => setTimeout(r, 600));
                updatePipelineStep('step-policy', 'done', 'Compliance verified (100% confidence).');
                updatePipelineStep('step-synthesis', 'active', 'Synthesizing response with inline citations...');

                await new Promise(r => setTimeout(r, 500));
                updatePipelineStep('step-synthesis', 'done', 'Response completed.');

                data = generateMockResponse(question);
            }

            // Remove loading bubble & render AI response
            removeMessage(loadingId);
            playSound('receive');
            appendMessage({
                role: 'assistant',
                content: data.answer,
                sources: data.source_used ? [data.source_used] : ['Pinecone HR Knowledge Base', 'Policy Doc 2026'],
                citations: data.citations || [],
                trace: data.trace || []
            });

            renderTraceDrawer(data);
            addAuditRow(question, data.source_used || 'Pinecone HR Vector Store');

        } catch (err) {
            removeMessage(loadingId);
            showToast('Failed to reach RAG server. Using offline mode.', 'error');
            const mockData = generateMockResponse(question);
            appendMessage({
                role: 'assistant',
                content: mockData.answer,
                sources: [mockData.source_used],
                trace: mockData.trace
            });
            renderTraceDrawer(mockData);
        } finally {
            state.isThinking = false;
        }
    }

    function appendMessage(msg) {
        state.messages.push(msg);
        const msgRow = document.createElement('div');
        msgRow.className = `chat-msg ${msg.role}`;

        const isUser = msg.role === 'user';
        const avatarIcon = isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';
        const authorName = isUser ? 'You' : 'HR RAG Agent';

        // Format Markdown-like text (bold, lists, code)
        const formattedContent = formatMarkdown(msg.content);

        let sourcesHtml = '';
        if (msg.sources && msg.sources.length) {
            sourcesHtml = `
                <div class="msg-sources">
                    ${msg.sources.map(s => `<span class="source-tag"><i class="fa-solid fa-bookmark"></i> ${s}</span>`).join('')}
                </div>
            `;
        }

        let actionsHtml = '';
        if (!isUser) {
            actionsHtml = `
                <div class="msg-actions">
                    <button class="msg-action-btn btn-read-aloud" title="Read Aloud"><i class="fa-solid fa-volume-high"></i> Read</button>
                    <button class="msg-action-btn btn-copy-msg" title="Copy Text"><i class="fa-regular fa-copy"></i> Copy</button>
                    <button class="msg-action-btn btn-view-trace" title="View Decision Trace"><i class="fa-solid fa-diagram-project"></i> Trace</button>
                    <button class="msg-action-btn btn-like" title="Thumbs Up"><i class="fa-regular fa-thumbs-up"></i></button>
                </div>
            `;
        }

        msgRow.innerHTML = `
            <div class="msg-avatar">${avatarIcon}</div>
            <div class="msg-body">
                <div class="msg-header">
                    <span class="msg-author">${authorName}</span>
                    <span class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="msg-bubble">
                    ${formattedContent}
                    ${sourcesHtml}
                </div>
                ${actionsHtml}
            </div>
        `;

        elements.messagesList.appendChild(msgRow);

        // Attach action handlers
        if (!isUser) {
            msgRow.querySelector('.btn-read-aloud').addEventListener('click', () => speakText(msg.content));
            msgRow.querySelector('.btn-copy-msg').addEventListener('click', () => {
                navigator.clipboard.writeText(msg.content);
                showToast('Response copied to clipboard!', 'success');
            });
            msgRow.querySelector('.btn-view-trace').addEventListener('click', () => {
                elements.traceDrawer.classList.remove('collapsed');
            });
            msgRow.querySelector('.btn-like').addEventListener('click', (e) => {
                e.currentTarget.classList.toggle('active');
                showToast('Thank you for your feedback!', 'success');
            });
        }

        scrollToBottom();
    }

    function appendLoadingMessage(id) {
        const msgRow = document.createElement('div');
        msgRow.className = 'chat-msg assistant';
        msgRow.id = id;
        msgRow.innerHTML = `
            <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="msg-body">
                <div class="msg-header">
                    <span class="msg-author">HR RAG Agent</span>
                    <span class="msg-time">Thinking...</span>
                </div>
                <div class="msg-bubble">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
        elements.messagesList.appendChild(msgRow);
        scrollToBottom();
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    }

    function formatMarkdown(text) {
        if (!text) return '';
        let formatted = text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") // escape HTML
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
        return formatted;
    }

    function startNewChat() {
        playSound('click');
        state.messages = [];
        elements.messagesList.innerHTML = '';
        elements.messagesContainer.classList.add('hidden');
        elements.welcomeScreen.classList.remove('hidden');
        elements.traceDrawer.classList.add('collapsed');
        showToast('Started a new conversation session.', 'info');
    }

    function addHistoryItem(query) {
        state.history.unshift(query);
        renderHistory();
    }

    function renderHistory() {
        if (state.history.length === 0) {
            elements.historyList.innerHTML = '<div class="empty-history">No recent queries in session</div>';
            return;
        }
        elements.historyList.innerHTML = state.history.map(item => `
            <div class="history-item" title="${item}">
                <i class="fa-regular fa-message"></i>
                <span>${item}</span>
            </div>
        `).join('');

        elements.historyList.querySelectorAll('.history-item').forEach((el, idx) => {
            el.addEventListener('click', () => {
                playSound('click');
                elements.chatTextarea.value = state.history[idx];
                handleSendMessage();
            });
        });
    }

    // TRACE DRAWER CONTROLLER
    function resetTraceDrawer() {
        [elements.stepRewrite, elements.stepSearch, elements.stepPolicy, elements.stepSynthesis].forEach(s => {
            s.className = 'pipeline-step';
        });
        elements.stepDetailRewrite.textContent = 'Waiting to optimize query...';
        elements.stepDetailSearch.textContent = 'Vector DB standby...';
        elements.stepDetailPolicy.textContent = 'Compliance check pending...';
        elements.stepDetailSynthesis.textContent = 'Synthesis standby...';
        elements.sourcesList.innerHTML = '<div class="empty-sources">Searching knowledge base...</div>';
        elements.traceJson.textContent = '// Agent execution trace details will appear here';
    }

    function updatePipelineStep(stepId, status, detailText) {
        const stepEl = document.getElementById(stepId);
        if (stepEl) {
            stepEl.className = `pipeline-step ${status}`;
        }
        const detailEl = document.getElementById('step-detail-' + stepId.replace('step-', ''));
        if (detailEl && detailText) {
            detailEl.textContent = detailText;
        }
    }

    function renderTraceDrawer(data) {
        // Render sources
        const sources = data.source_used ? [data.source_used] : ['Pinecone Document Index', 'HR Policy Handbook 2026'];
        elements.sourcesList.innerHTML = sources.map(src => `
            <div class="source-card">
                <i class="fa-solid fa-file-pdf"></i>
                <div class="source-card-info">
                    <div class="source-card-title">${src}</div>
                    <div class="source-card-score">Relevance Match: 96.4%</div>
                </div>
            </div>
        `).join('');

        // Render JSON trace
        const tracePayload = {
            query_rewritten: data.rewritten_query || "Optimized HR question vector match",
            vector_index: "company-hr-kb",
            retrieved_chunks: 4,
            execution_trace: data.trace || ["Rewrite Query -> Search Vector DB -> Synthesize Answer"],
            timestamp: new Date().toISOString()
        };
        elements.traceJson.textContent = JSON.stringify(tracePayload, null, 2);
    }

    // MOCK RESPONSE GENERATOR (FOR OFFLINE / DEMO MODE)
    function generateMockResponse(query) {
        const q = query.toLowerCase();
        let answer = "";
        let source = "Company HR Employee Handbook Section 4.2";

        if (q.includes('pto') || q.includes('leave') || q.includes('vacation')) {
            answer = "**Paid Time Off (PTO) Policy:**\n" +
                "• Full-time employees receive **20 days of paid annual leave** per calendar year.\n" +
                "• Up to **5 unused PTO days** can be carried over into the following year (must be used by March 31).\n" +
                "• Leave requests exceeding 3 consecutive days require manager approval via the HR portal 2 weeks in advance.";
            source = "HR Policy Handbook - Section 3: Time Off & Attendance";
        } else if (q.includes('remote') || q.includes('stipend') || q.includes('internet')) {
            answer = "**Remote Work Equipment & Stipend Allowance:**\n" +
                "• **One-Time Setup Stipend:** $500 for ergonomics (desk, monitor, chair).\n" +
                "• **Monthly Internet & Utility Allowance:** $75/month automatically added to payroll.\n" +
                "• IT department provides company-issued MacBook / ThinkPad with preconfigured security profiles.";
            source = "Remote Work & Distributed Workforce Directive 2026";
        } else if (q.includes('parental') || q.includes('maternity') || q.includes('paternity')) {
            answer = "**Parental Leave Benefits:**\n" +
                "• **16 weeks of 100% paid parental leave** for primary caregivers.\n" +
                "• **8 weeks of 100% paid parental leave** for secondary caregivers.\n" +
                "• Eligible after 90 days of continuous full-time employment.";
            source = "Global Family & Parental Leave Guidelines";
        } else if (q.includes('referral') || q.includes('bonus')) {
            answer = "**Employee Referral Program:**\n" +
                "• Engineering & Technical Roles: **$2,500 bonus** upon completion of candidate's 90-day milestone.\n" +
                "• Operations & Business Roles: **$1,500 bonus**.\n" +
                "• Referrals must be submitted via the HR Portal prior to first interview contact.";
            source = "Talent Acquisition & Referral Incentive Policy";
        } else {
            answer = `Regarding **"${query}"**:\n` +
                "According to our enterprise HR guidelines:\n" +
                "1. All standard employee policies are governed under the 2026 Global Employee Charter.\n" +
                "2. For specific claim forms or individualized benefit adjustments, please log into Workday or contact HR Support at `hr-help@company.com`.\n" +
                "3. Verified compliance checks ensure 100% adherence to labor laws and company ethics.";
            source = "Enterprise General Policy Manual";
        }

        return {
            answer,
            source_used: source,
            rewritten_query: query + " [semantic HR context]",
            trace: [
                "1. Query Rewriter: Expanded query keywords.",
                "2. Vector Store: Searched Pinecone namespace 'company-hr-kb'.",
                "3. Ranker: Filtered top 4 document matches.",
                "4. Compliance Checker: Validated effective dates & active policy status.",
                "5. LLM Synthesis: Generated verified employee response."
            ]
        };
    }

    // MODAL HELPERS
    function openModal(modalEl) {
        playSound('click');
        modalEl.classList.remove('hidden');
    }
    function closeModal(modalEl) {
        playSound('click');
        modalEl.classList.add('hidden');
    }

    // INGEST FILE FORM
    function handleFileSelect() {
        const file = elements.fileInput.files[0];
        if (file) {
            state.selectedFile = file;
            elements.selectedFilename.textContent = file.name;
            elements.filePreview.classList.remove('hidden');
            elements.fileDropzone.querySelector('.dropzone-content').classList.add('hidden');
        }
    }

    function removeSelectedFile() {
        state.selectedFile = null;
        elements.fileInput.value = '';
        elements.filePreview.classList.add('hidden');
        elements.fileDropzone.querySelector('.dropzone-content').classList.remove('hidden');
    }

    async function handleIngestSubmit(e) {
        e.preventDefault();
        if (!state.selectedFile) {
            showToast('Please select a document file first', 'error');
            return;
        }

        const adminKey = document.getElementById('admin-key-input').value;
        elements.ingestProgress.classList.remove('hidden');
        elements.progressBarFill.style.width = '30%';

        const formData = new FormData();
        formData.append('file', state.selectedFile);

        try {
            if (state.backendOnline) {
                elements.progressBarFill.style.width = '70%';
                const res = await fetch('/api/ingest', {
                    method: 'POST',
                    headers: { 'x-admin-key': adminKey },
                    body: formData
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Ingestion failed');
                }
                const data = await res.json();
                elements.progressBarFill.style.width = '100%';
                showToast(`Document "${data.file}" ingested! (${data.chunks} vector chunks indexed)`, 'success');
            } else {
                // Offline simulation
                await new Promise(r => setTimeout(r, 1200));
                elements.progressBarFill.style.width = '100%';
                showToast(`[Demo] Document "${state.selectedFile.name}" indexed successfully!`, 'success');
            }

            setTimeout(() => {
                closeModal(elements.modalIngest);
                removeSelectedFile();
                elements.ingestProgress.classList.add('hidden');
                elements.progressBarFill.style.width = '0%';
            }, 600);

        } catch (err) {
            showToast(err.message, 'error');
            elements.ingestProgress.classList.add('hidden');
        }
    }

    // AUDIT LOG TABLE POPULATION
    function populateAuditTable() {
        const sampleAudits = [
            { time: '10:42 AM', query: 'What is our annual PTO limit?', source: 'HR Time Off Policy', status: 'Compliant' },
            { time: '09:15 AM', query: 'Remote work equipment stipend amount', source: 'Distributed Workforce Directive', status: 'Compliant' },
            { time: 'Yesterday', query: 'Parental leave eligibility period', source: 'Family Leave Guidelines', status: 'Compliant' }
        ];

        elements.auditTableBody.innerHTML = sampleAudits.map(item => `
            <tr>
                <td>${item.time}</td>
                <td><strong>${item.query}</strong></td>
                <td><span class="source-tag">${item.source}</span></td>
                <td><span class="status-dot"></span> ${item.status}</td>
                <td><button class="icon-btn-small" onclick="alert('Viewing detailed audit logs for: ${item.query}')"><i class="fa-solid fa-eye"></i></button></td>
            </tr>
        `).join('');
    }

    function addAuditRow(query, source) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td><strong>${query}</strong></td>
            <td><span class="source-tag">${source}</span></td>
            <td><span class="status-dot"></span> Compliant</td>
            <td><button class="icon-btn-small"><i class="fa-solid fa-eye"></i></button></td>
        `;
        elements.auditTableBody.prepend(tr);
    }

    // TOAST SYSTEM
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-triangle';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // START THE APP
    init();
});
