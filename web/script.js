document.addEventListener('DOMContentLoaded', () => {
    // Nav elements
    const navScanner = document.getElementById('nav-scanner');
    const navHistory = document.getElementById('nav-history');
    const sectionScanner = document.getElementById('scanner-section');
    const sectionHistory = document.getElementById('history-section');
    const sectionResults = document.getElementById('results-section');
    const scanningOverlay = document.getElementById('scanning-overlay');

    // Action elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnNewScan = document.getElementById('btn-new-scan');
    const btnRefreshHistory = document.getElementById('btn-refresh-history');
    const demoPills = document.querySelectorAll('.demo-pill');

    // Base URL for API
    const API_BASE = window.location.origin;

    // Navigation logic
    function showSection(sectionId) {
        sectionScanner.classList.add('hidden');
        sectionHistory.classList.add('hidden');
        sectionResults.classList.add('hidden');
        scanningOverlay.classList.add('hidden');

        if (sectionId === 'scanner') {
            sectionScanner.classList.remove('hidden');
            navScanner.classList.add('active');
            navHistory.classList.remove('active');
        } else if (sectionId === 'history') {
            sectionHistory.classList.remove('hidden');
            navHistory.classList.add('active');
            navScanner.classList.remove('active');
            loadHistory();
        } else if (sectionId === 'results') {
            sectionResults.classList.remove('hidden');
        } else if (sectionId === 'scanning') {
            scanningOverlay.classList.remove('hidden');
        }
    }

    navScanner.addEventListener('click', () => showSection('scanner'));
    navHistory.addEventListener('click', () => showSection('history'));
    btnNewScan.addEventListener('click', () => showSection('scanner'));

    // Upload logic
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.boxShadow = '0 0 30px var(--primary-glow)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--glass-border)';
        dropZone.style.boxShadow = 'none';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--glass-border)';
        dropZone.style.boxShadow = 'none';
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Demo Logic
    demoPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const type = pill.getAttribute('data-type');
            runDemo(type);
        });
    });

    // ─── API CALLS ────────────────────────────────────────────────────────
    
    async function handleFileUpload(file) {
        startScanningAnimation();
        
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            displayResults(data);
        } catch (err) {
            alert('Error connecting to engine. Is the backend running?');
            showSection('scanner');
        }
    }

    async function runDemo(type) {
        startScanningAnimation();
        
        try {
            const res = await fetch(`${API_BASE}/demo?type=${encodeURIComponent(type)}`);
            if (!res.ok) throw new Error('Demo failed');
            const data = await res.json();
            displayResults(data);
        } catch (err) {
            alert('Error running demo. Is the backend running?');
            showSection('scanner');
        }
    }

    async function loadHistory() {
        const listDiv = document.getElementById('history-list');
        listDiv.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Loading...</p>';
        try {
            const res = await fetch(`${API_BASE}/history`);
            if (!res.ok) throw new Error('Failed to load history');
            const records = await res.json();
            renderHistory(records);
        } catch(err) {
            listDiv.innerHTML = '<p style="text-align:center; color:var(--danger);">Error loading history</p>';
        }
    }

    btnRefreshHistory.addEventListener('click', loadHistory);

    // ─── UTILS & UI UPDATES ───────────────────────────────────────────────

    function startScanningAnimation() {
        sectionScanner.classList.add('hidden');
        showSection('scanning');
        
        const scanBar = document.getElementById('scan-bar');
        const scanSteps = document.getElementById('scan-steps');
        const steps = ['Extracting metadata...', 'Running OCR engine...', 'Analyzing image artifacts...', 'Evaluating risk models...'];
        
        scanBar.style.width = '0%';
        let progress = 0;
        let stepIdx = 0;
        
        // Faux progress animation
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) progress = 95; // hold at 95% until req finishes
            scanBar.style.width = `${progress}%`;
            
            if (Math.random() > 0.6 && stepIdx < steps.length - 1) {
                stepIdx++;
                scanSteps.innerText = steps[stepIdx];
            }
        }, 300);

        // Store interval to clear later
        window.scanInterval = interval;
    }

    function displayResults(data) {
        clearInterval(window.scanInterval);
        document.getElementById('scan-bar').style.width = '100%';
        
        setTimeout(() => {
            populateResultsView(data);
            showSection('results');
        }, 400); // short delay to show 100%
    }

    function populateResultsView(data) {
        document.getElementById('res-score').innerText = data.risk_score;
        document.getElementById('res-conf').innerText = `${data.confidence || 0}%`;
        document.getElementById('res-type').innerText = data.scan_type;
        document.getElementById('res-action').innerText = data.suggested_action;
        
        const badgeSpan = document.getElementById('res-badge');
        badgeSpan.innerText = data.result_badge;
        badgeSpan.className = 'badge'; // reset
        const badgeLower = (data.result_badge || '').toLowerCase();
        if (badgeLower.includes('danger')) badgeSpan.classList.add('dangerous');
        else if (badgeLower.includes('suspicious')) badgeSpan.classList.add('suspicious');
        else badgeSpan.classList.add('safe');

        // Circular progress logic
        const circle = document.querySelector('.progress-ring__circle');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * MathPI;
        
        let percentage = (data.risk_score / 100) || 0;
        // Invert so high score = more red circle filled, wait risk score is low?
        // Wait, the API returns risk_score where 6 is dangerous, 48 is mild? 
        // Or wait, in demo data: "Dangerous" has risk_score: 12, 6, 4. "Mildly Suspicious" is 48.
        // Seems lower risk_score is higher risk in the earlier app logic?
        // Let me check main.py line 61: "if record.risk_score < 50 else ..." 
        // Actually earlier Flutter app showed risk_score as a percentage like 92% for danger.
        // Given main.py uses lower numbers for high risk (Wait, maybe it's just random or a bug from user previously? Let's treat risk_score as out of 100. Let's make the visual gauge fill proportional to (100 - risk_score) if low means danger.
        // Actually let's just show the number).
        
        // Actually, main.py line 60: `if record.risk_score < 50 else "Seems safe"`
        // So low = dangerous.
        let filledAmt = data.risk_score > 100 ? 100 : data.risk_score;
        let p = filledAmt / 100;
        const offset = circumference - p * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;

        if (data.risk_score < 20) circle.style.stroke = 'var(--danger)';
        else if (data.risk_score < 50) circle.style.stroke = 'var(--warning)';
        else circle.style.stroke = 'var(--success)';

        const actionCard = document.getElementById('res-action-card');
        actionCard.className = 'action-card';
        if (data.risk_score >= 50) actionCard.classList.add('safe');

        // Reasons
        const reasonsUl = document.getElementById('res-reasons');
        reasonsUl.innerHTML = '';
        if (data.reasons && data.reasons.length) {
            data.reasons.forEach(r => {
                const li = document.createElement('li');
                li.innerText = r;
                if (data.risk_score >= 50) li.className = 'safe-item';
                else if (data.risk_score < 20) li.className = ''; // default danger
                else li.className = 'warning-item';
                reasonsUl.appendChild(li);
            });
        } else {
            reasonsUl.innerHTML = '<li class="safe-item">No significant anomalies found.</li>';
        }

        // Extracted Text
        document.getElementById('res-text').innerText = data.extracted_text || 'No text extracted.';
    }

    function renderHistory(records) {
        const listDiv = document.getElementById('history-list');
        listDiv.innerHTML = '';
        if (!records || records.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 2rem;">No scans in history.</p>';
            return;
        }

        records.forEach(r => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            const date = new Date(r.timestamp).toLocaleString();
            let scoreClass = 'low-risk';
            if (r.risk_score < 20) scoreClass = 'high-risk';
            else if (r.risk_score < 50) scoreClass = 'med-risk';

            div.innerHTML = `
                <div class="hist-info">
                    <h4>${r.scan_type}</h4>
                    <div class="hist-meta">
                        <span>${r.filename}</span>
                        <span>&bull;</span>
                        <span>${date}</span>
                    </div>
                </div>
                <div class="hist-actions">
                    <div class="hist-score ${scoreClass}">
                        ${r.risk_score}
                    </div>
                    <button class="btn-delete" data-id="${r.id}" title="Delete scan">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
            listDiv.appendChild(div);
        });

        // Add delete listeners
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this scan?')) {
                    try {
                        const res = await fetch(`${API_BASE}/history/${id}`, { method: 'DELETE' });
                        if (res.ok) loadHistory();
                    } catch (err) {
                        alert('Failed to delete scan.');
                    }
                }
            });
        });
    }

    // Replace MathPI
    const MathPI = Math.PI;

    // Show scanner on initial load
    showSection('scanner');
});
