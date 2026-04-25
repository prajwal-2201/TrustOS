document.addEventListener('DOMContentLoaded', () => {
    const navScanner = document.getElementById('nav-scanner');
    const navText = document.getElementById('nav-text');
    const navHistory = document.getElementById('nav-history');
    const sectionScanner = document.getElementById('scanner-section');
    const sectionText = document.getElementById('text-section');
    const sectionHistory = document.getElementById('history-section');
    const sectionResults = document.getElementById('results-section');
    const scanningOverlay = document.getElementById('scanning-overlay');

    // Action elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnScanText = document.getElementById('btn-scan-text');
    const textInputField = document.getElementById('text-input-field');
    const btnNewScan = document.getElementById('btn-new-scan');
    const btnCopyReport = document.getElementById('btn-copy-report');
    const btnRefreshHistory = document.getElementById('btn-refresh-history');
    const demoPills = document.querySelectorAll('.demo-pill');

    // Base URL for API
    const API_BASE = window.location.origin;

    // Navigation logic
    function showSection(sectionId) {
        [sectionScanner, sectionText, sectionHistory, sectionResults, scanningOverlay].forEach(s => s.classList.add('hidden'));
        [navScanner, navText, navHistory].forEach(n => n.classList.remove('active'));

        if (sectionId === 'scanner') {
            sectionScanner.classList.remove('hidden');
            navScanner.classList.add('active');
        } else if (sectionId === 'text') {
            sectionText.classList.remove('hidden');
            navText.classList.add('active');
        } else if (sectionId === 'history') {
            sectionHistory.classList.remove('hidden');
            navHistory.classList.add('active');
            loadHistory();
        } else if (sectionId === 'results') {
            sectionResults.classList.remove('hidden');
        } else if (sectionId === 'scanning') {
            scanningOverlay.classList.remove('hidden');
        }
    }

    navScanner.addEventListener('click', () => showSection('scanner'));
    navText.addEventListener('click', () => showSection('text'));
    navHistory.addEventListener('click', () => showSection('history'));
    btnNewScan.addEventListener('click', () => showSection('scanner'));

    // Text Scan Logic
    btnScanText.addEventListener('click', async () => {
        const text = textInputField.value.trim();
        if (!text) return alert('Please enter some text to scan.');
        
        startScanningAnimation();
        try {
            const res = await fetch(`${API_BASE}/analyze-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (!res.ok) throw new Error('Text analysis failed');
            const data = await res.json();
            // Map text scan data to standard result display
            displayResults({
                ...data,
                scan_type: 'Plain Text Analysis',
                confidence: data.scam_probability,
                reasons: [`ML Fraud Probability: ${data.scam_probability}%`],
                extracted_text: text,
                meta_data: { ml_scam_prob: data.scam_probability, ela_score: 'N/A', qr_links: [] }
            });
        } catch (err) {
            alert('Error connecting to engine.');
            showSection('text');
        }
    });

    // Upload logic
    dropZone.addEventListener('click', () => fileInput.click());
    
    // ... (drag drop logic same as before)
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-active'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('drag-active'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileUpload(e.target.files[0]);
    });

    // Demo Logic
    demoPills.forEach(pill => {
        pill.addEventListener('click', () => runDemo(pill.getAttribute('data-type')));
    });

    async function handleFileUpload(file) {
        startScanningAnimation();
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            displayResults(await res.json());
        } catch (err) {
            alert('Error connecting to engine.');
            showSection('scanner');
        }
    }

    async function runDemo(type) {
        startScanningAnimation();
        try {
            const res = await fetch(`${API_BASE}/demo?type=${encodeURIComponent(type)}`);
            displayResults(await res.json());
        } catch (err) {
            showSection('scanner');
        }
    }

    function populateResultsView(data) {
        document.getElementById('res-score').innerText = data.risk_score;
        document.getElementById('res-conf').innerText = `${data.confidence || 0}%`;
        document.getElementById('res-type').innerText = data.scan_type;
        document.getElementById('res-action').innerText = data.suggested_action;
        
        // Metadata fields
        const meta = data.meta_data || {};
        document.getElementById('meta-ela').innerText = meta.ela_score !== undefined ? meta.ela_score : 'N/A';
        document.getElementById('meta-ml').innerText = `${meta.ml_scam_prob || 0}%`;
        document.getElementById('meta-qr').innerText = (meta.qr_links && meta.qr_links.length) ? meta.qr_links.join(', ') : 'None';

        const badgeSpan = document.getElementById('res-badge');
        badgeSpan.innerText = data.result_badge;
        badgeSpan.className = 'badge';
        const badgeLower = (data.result_badge || '').toLowerCase();
        if (badgeLower.includes('danger')) badgeSpan.classList.add('dangerous');
        else if (badgeLower.includes('suspicious')) badgeSpan.classList.add('suspicious');
        else badgeSpan.classList.add('safe');

        // Circular progress
        const circle = document.querySelector('.progress-ring__circle');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (data.risk_score / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        
        if (data.risk_score < 40) circle.style.stroke = 'var(--danger)';
        else if (data.risk_score < 75) circle.style.stroke = 'var(--warning)';
        else circle.style.stroke = 'var(--success)';

        const actionCard = document.getElementById('res-action-card');
        actionCard.className = 'action-card';
        if (data.risk_score >= 75) actionCard.classList.add('safe');

        const reasonsUl = document.getElementById('res-reasons');
        reasonsUl.innerHTML = '';
        (data.reasons || []).forEach(r => {
            const li = document.createElement('li');
            li.innerText = r;
            if (data.risk_score >= 75) li.className = 'safe-item';
            else if (data.risk_score < 40) li.className = '';
            else li.className = 'warning-item';
            reasonsUl.appendChild(li);
        });

        document.getElementById('res-text').innerText = data.extracted_text || 'No text content.';
    }

    // Export Logic
    btnCopyReport.addEventListener('click', () => {
        const report = `Trust OS Analysis Report\nType: ${document.getElementById('res-type').innerText}\nRisk Score: ${document.getElementById('res-score').innerText}/100\nVerdict: ${document.getElementById('res-badge').innerText}\nAction: ${document.getElementById('res-action').innerText}`;
        navigator.clipboard.writeText(report).then(() => alert('Report copied to clipboard!'));
    });

    // ... (rest of the helper functions like startScanningAnimation, loadHistory, renderHistory)
    function startScanningAnimation() {
        showSection('scanning');
        const scanBar = document.getElementById('scan-bar');
        const scanSteps = document.getElementById('scan-steps');
        const steps = ['Extracting metadata...', 'Running forensic analysis...', 'Evaluating ML models...', 'Finalizing verdict...'];
        scanBar.style.width = '0%';
        let progress = 0;
        let stepIdx = 0;
        const interval = setInterval(() => {
            progress += 5;
            if (progress > 95) progress = 95;
            scanBar.style.width = `${progress}%`;
            if (progress % 25 === 0 && stepIdx < steps.length - 1) {
                stepIdx++;
                scanSteps.innerText = steps[stepIdx];
            }
        }, 150);
        window.scanInterval = interval;
    }

    function displayResults(data) {
        clearInterval(window.scanInterval);
        document.getElementById('scan-bar').style.width = '100%';
        setTimeout(() => {
            populateResultsView(data);
            showSection('results');
        }, 300);
    }

    async function loadHistory() {
        const listDiv = document.getElementById('history-list');
        listDiv.innerHTML = '<p style="text-align:center; color:var(--text-muted);">Loading history...</p>';
        try {
            const res = await fetch(`${API_BASE}/history`);
            renderHistory(await res.json());
        } catch(err) {
            listDiv.innerHTML = '<p style="text-align:center; color:var(--danger);">Error loading history</p>';
        }
    }

    function renderHistory(records) {
        const listDiv = document.getElementById('history-list');
        listDiv.innerHTML = '';
        if (!records.length) return listDiv.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 2rem;">No history found.</p>';
        records.forEach(r => {
            const div = document.createElement('div');
            div.className = 'history-item';
            let sClass = 'low-risk';
            if (r.risk_score < 40) sClass = 'high-risk';
            else if (r.risk_score < 75) sClass = 'med-risk';
            div.innerHTML = `<div class="hist-info"><h4>${r.scan_type}</h4><div class="hist-meta"><span>${r.filename}</span><span>&bull;</span><span>${new Date(r.timestamp).toLocaleDateString()}</span></div></div><div class="hist-actions"><div class="hist-score ${sClass}">${r.risk_score}</div></div>`;
            listDiv.appendChild(div);
        });
    }

    showSection('scanner');
});
