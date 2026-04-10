    /* ============================================================
       STATE & CONSTANTS
       ============================================================ */
    const STORAGE_KEY = 'carecompanion_logs';   // localStorage key
    let currentFilter = 7;                       // default filter: 7 days
    let painChartInst = null;                    // Chart.js instance references
    let tempChartInst = null;

    /* ============================================================
       UTILITY FUNCTIONS
       ============================================================ */

    /** Load all entries from localStorage. Returns array (newest first). */
    function loadEntries() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      } catch { return []; }
    }

    /** Save entries array to localStorage. */
    function saveEntries(arr) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    }

    /** Format ISO timestamp to readable date string. */
    function fmtDate(iso) {
      return new Date(iso).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      });
    }

    /** Format ISO timestamp to time string. */
    function fmtTime(iso) {
      return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    /** Show a brief toast notification. */
    function showToast(msg = '✓ Saved!') {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2600);
    }

    /** Filter entries to the last N days (0 = all). */
    function filterByDays(entries, days) {
      if (!days) return entries;
      const cutoff = Date.now() - days * 86400000;
      return entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    }

    /* ============================================================
       STATUS LOGIC
       Determines "ok / warn / danger" based on readings.
       ============================================================ */
    function getStatus(entry) {
      if (entry.pain > 8 || entry.temp > 38.5 || entry.wound === 'Bad') return 'danger';
      if (entry.pain > 6 || entry.temp > 37.8 || entry.wound === 'Normal') return 'warn';
      return 'ok';
    }

    /** Build alert messages for a given entry. Returns array of {type, msg}. */
    function getAlerts(entry) {
      const alerts = [];
      if (entry.temp > 38.5) alerts.push({ type: 'danger', msg: `🌡️ High fever detected: ${entry.temp}°C — consult your doctor immediately.` });
      if (entry.pain > 8) alerts.push({ type: 'danger', msg: `⚠️ Severe pain level: ${entry.pain}/10 — please contact your healthcare provider.` });
      if (entry.temp > 37.8 && entry.temp <= 38.5) alerts.push({ type: 'warning', msg: `🌡️ Slightly elevated temperature: ${entry.temp}°C — monitor closely.` });
      if (entry.pain > 6 && entry.pain <= 8) alerts.push({ type: 'warning', msg: `🩹 Moderate-high pain: ${entry.pain}/10 — consider speaking to your doctor.` });
      if (entry.wound === 'Bad') alerts.push({ type: 'danger', msg: '🩹 Wound condition marked as "Bad" — seek medical attention.' });
      return alerts;
    }

    /* ============================================================
       STREAK CALCULATOR
       Counts consecutive days (back from today) with at least 1 entry.
       ============================================================ */
    function calcStreak(entries) {
      if (!entries.length) return 0;

      // Build a set of unique date strings
      const dates = new Set(entries.map(e => {
        const d = new Date(e.timestamp);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }));

      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (dates.has(key)) streak++;
        else break;
      }
      return streak;
    }

    /* ============================================================
       PAIN SLIDER — live colour update
       ============================================================ */
    function updatePain(val) {
      val = parseInt(val);
      const badge = document.getElementById('painBadge');
      const slider = document.getElementById('painSlider');

      // Update badge text
      badge.textContent = val;

      // Colour the badge based on severity
      badge.className = 'pain-value ' + (val <= 4 ? 'pain-low' : val <= 7 ? 'pain-medium' : 'pain-high');

      // Update slider gradient fill (CSS custom property)
      const pct = ((val - 1) / 9 * 100).toFixed(1);
      slider.style.setProperty('--val', pct + '%');
    }

    /* Initialise slider fill on page load */
    updatePain(document.getElementById('painSlider').value);

    /* ============================================================
       SAVE ENTRY
       ============================================================ */
    function saveEntry() {
      const pain = parseInt(document.getElementById('painSlider').value);
      const temp = parseFloat(document.getElementById('tempInput').value);
      const wound = document.getElementById('woundSelect').value;
      const activity = document.getElementById('activitySelect').value;
      const notes = document.getElementById('notesInput').value.trim();

      // Validation
      if (isNaN(temp) || temp < 35 || temp > 42) {
        alert('Please enter a valid temperature between 35°C and 42°C.');
        return;
      }
      if (!wound) { alert('Please select wound condition.'); return; }
      if (!activity) { alert('Please select activity level.'); return; }

      // Build entry object
      const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        pain, temp, wound, activity, notes
      };

      // Prepend to array (newest first) and persist
      const entries = loadEntries();
      entries.unshift(entry);
      saveEntries(entries);

      // Update streak badge in header
      updateStreakBadge(entries);

      // Show alerts from this entry
      renderLatestAlerts(entry);

      // Reset form (except slider)
      document.getElementById('tempInput').value = '';
      document.getElementById('woundSelect').value = '';
      document.getElementById('activitySelect').value = '';
      document.getElementById('notesInput').value = '';

      showToast('✓ Entry saved successfully!');
    }

    /* ============================================================
       UPDATE STREAK BADGE
       ============================================================ */
    function updateStreakBadge(entries) {
      document.getElementById('streakCount').textContent = calcStreak(entries);
    }

    /* ============================================================
       ALERTS — render latest entry's alerts in check-in view
       ============================================================ */
    function renderLatestAlerts(entry) {
      const wrapper = document.getElementById('latestAlerts');
      if (!entry) {
         wrapper.style.display = 'none';
         wrapper.innerHTML = '';
         return;
      }
      const alerts = getAlerts(entry);
      if (alerts.length === 0) {
         wrapper.style.display = 'none';
         wrapper.innerHTML = '';
      } else {
         wrapper.style.display = 'block';
         wrapper.innerHTML = alerts.map(a => `
    <div class="alert-item ${a.type}">
      <div class="alert-dot"></div>
      <div>${a.msg}</div>
    </div>
  `).join('');
      }
    }

    /* ============================================================
       NAVIGATION — switch between pages
       ============================================================ */
    function showPage(id, btn) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('page-' + id).classList.add('active');
      btn.classList.add('active');

      // Lazy-render page content when navigated to
      if (id === 'dashboard') renderDashboard();
      if (id === 'charts') renderCharts();
      if (id === 'report') {
        // Small delay ensures the display:block layout is fully computed before Chart.js draws
        setTimeout(() => {
          renderReport();
        }, 50);
      }
    }

    /* ============================================================
       FILTER — dashboard day filter
       ============================================================ */
    function setFilter(days, btn) {
      currentFilter = days;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDashboard();
    }

    /* ============================================================
       DASHBOARD RENDER
       ============================================================ */
    function renderDashboard() {
      const all = loadEntries();
      const filtered = filterByDays(all, currentFilter);

      // Stats
      document.getElementById('totalEntries').textContent = all.length;
      if (filtered.length) {
        const avgP = (filtered.reduce((s, e) => s + e.pain, 0) / filtered.length).toFixed(1);
        const avgT = (filtered.reduce((s, e) => s + e.temp, 0) / filtered.length).toFixed(1);
        document.getElementById('avgPain').textContent = avgP;
        document.getElementById('avgTemp').textContent = avgT;
      } else {
        document.getElementById('avgPain').textContent = '—';
        document.getElementById('avgTemp').textContent = '—';
      }

      updateStreakBadge(all);

      // Log list
      const list = document.getElementById('logList');
      if (!filtered.length) {
        list.innerHTML = `
      <div class="empty-state" style="padding: 30px 20px;">
        <div class="empty-icon" style="font-size: 40px; margin-bottom: 10px;">📭</div>
        <h3>No recovery data yet</h3>
        <p>No check-in logs found for this period.</p>
      </div>`;
        return;
      }

      list.innerHTML = filtered.map((e, idx) => {
        const status = getStatus(e);
        const pillClass = { ok: 'pill-ok', warn: 'pill-warn', danger: 'pill-danger' }[status];
        const statusLabel = { ok: '● Normal', warn: '● Warning', danger: '● Danger' }[status];
        const isLatest = idx === 0 ? '<span style="font-size:10px; background:var(--c-primary-bg); color:var(--c-primary); border-radius:50px; padding:2px 8px; font-weight:600; margin-left:6px;">Latest</span>' : '';

        return `
      <div class="log-card status-${status}">
        <div class="log-header">
          <div>
            <div class="log-date">${fmtDate(e.timestamp)} ${isLatest}</div>
            <div class="log-time">${fmtTime(e.timestamp)}</div>
          </div>
          <div class="status-pill ${pillClass}">${statusLabel}</div>
        </div>
        <div class="log-metrics">
          <div class="metric">
            <div class="metric-val">${e.pain}/10</div>
            <div class="metric-lbl">Pain</div>
          </div>
          <div class="metric">
            <div class="metric-val">${e.temp}°C</div>
            <div class="metric-lbl">Temp</div>
          </div>
          <div class="metric">
            <div class="metric-val">${e.wound}</div>
            <div class="metric-lbl">Wound</div>
          </div>
          <div class="metric">
            <div class="metric-val">${e.activity}</div>
            <div class="metric-lbl">Activity</div>
          </div>
        </div>
        ${e.notes ? `<div class="log-notes">"${e.notes}"</div>` : ''}
      </div>`;
      }).join('');
    }

    /* ============================================================
       CHARTS RENDER
       ============================================================ */
    function renderCharts() {
      const all = loadEntries();
      // Use last 30 entries for charts (oldest first for chronological display)
      const entries = all.slice(0, 30).reverse();

      const labels = entries.map(e => fmtDate(e.timestamp));
      const painData = entries.map(e => e.pain);
      const tempData = entries.map(e => e.temp);

      /* ------ Pain Chart ------ */
      if (painChartInst) painChartInst.destroy();
      painChartInst = new Chart(document.getElementById('painChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Pain Level',
            data: painData,
            borderColor: '#C0392B',
            backgroundColor: 'rgba(192,57,43,.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#C0392B',
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              min: 0, max: 10,
              ticks: { stepSize: 2, color: '#8FAD9C' },
              grid: { color: 'rgba(0,0,0,.05)' }
            },
            x: {
              ticks: { color: '#8FAD9C', maxRotation: 45, font: { size: 11 } },
              grid: { display: false }
            }
          }
        }
      });

      /* ------ Temperature Chart ------ */
      if (tempChartInst) tempChartInst.destroy();
      tempChartInst = new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Temperature (°C)',
              data: tempData,
              borderColor: '#2471A3',
              backgroundColor: 'rgba(36,113,163,.08)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#2471A3',
              pointRadius: 5,
              pointHoverRadius: 7,
              borderWidth: 2.5
            },
            {
              // Fever threshold reference line at 38.5°C
              label: 'Fever threshold',
              data: entries.map(() => 38.5),
              borderColor: '#C0392B',
              borderDash: [6, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              min: 35, max: 42,
              ticks: { stepSize: 1, color: '#8FAD9C', callback: v => v + '°C' },
              grid: { color: 'rgba(0,0,0,.05)' }
            },
            x: {
              ticks: { color: '#8FAD9C', maxRotation: 45, font: { size: 11 } },
              grid: { display: false }
            }
          }
        }
      });
    }

    /* ============================================================
       REPORT RENDER
       ============================================================ */
    let rPainChart = null;
    let rTempChart = null;

    function renderReport() {
      const entries = loadEntries();
      const streak = calcStreak(entries);

      // Patient Name
      const ptNode = document.querySelector('#page-checkin .patient-header span[contenteditable]');
      if (ptNode) document.getElementById('reportPatientName').textContent = ptNode.textContent || 'Unknown';

      // Date Generated
      document.getElementById('reportGenDate').textContent = "Generated: " + new Date().toLocaleString('en-GB');

      // Summary Stats
      if (entries.length) {
        const oldest = fmtDate(entries[entries.length - 1].timestamp);
        const newest = fmtDate(entries[0].timestamp);
        document.getElementById('reportDateRange').textContent = `Report Period: ${oldest} to ${newest}`;
        
        document.getElementById('rTotalEntries').textContent = entries.length;
        document.getElementById('rStreak').textContent = streak;
        document.getElementById('rAvgPain').textContent = (entries.reduce((s, e) => s + e.pain, 0) / entries.length).toFixed(1);
        document.getElementById('rAvgTemp').textContent = (entries.reduce((s, e) => s + e.temp, 0) / entries.length).toFixed(1) + '°C';
      } else {
        document.getElementById('reportDateRange').textContent = 'No entries recorded for this period.';
        document.getElementById('rTotalEntries').textContent = '0';
        document.getElementById('rStreak').textContent = '0';
        document.getElementById('rAvgPain').textContent = '—';
        document.getElementById('rAvgTemp').textContent = '—';
      }

      // Critical Alerts
      const allAlerts = entries.filter(e => getStatus(e) === 'danger')
                               .flatMap(e => getAlerts(e).filter(a => a.type === 'danger')
                               .map(a => `<div style="margin-bottom:4px;"><strong>${fmtDate(e.timestamp)}:</strong> ${a.msg}</div>`));
      
      const alertWrap = document.getElementById('reportAlertsWrapper');
      if (allAlerts.length > 0) {
         alertWrap.style.display = 'block';
         document.getElementById('reportAlertsContent').innerHTML = allAlerts.join('');
      } else {
         alertWrap.style.display = 'none';
         document.getElementById('reportAlertsContent').innerHTML = '';
      }

      // Logs Table
      const logDiv = document.getElementById('reportLog');
      if (!entries.length) {
        logDiv.innerHTML = '<div style="background:var(--c-bg); padding:16px; border-radius:var(--radius-sm); color:var(--c-text-hint); text-align:center; font-size:13px; border:1px solid var(--c-border);">No recovery data available.</div>';
      } else {
        logDiv.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; margin-bottom: 24px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--c-border); color: var(--c-text-muted);">
                <th style="padding: 10px 8px; font-weight: 600;">Date & Time</th>
                <th style="padding: 10px 8px; font-weight: 600;">Pain</th>
                <th style="padding: 10px 8px; font-weight: 600;">Temp</th>
                <th style="padding: 10px 8px; font-weight: 600;">Wound</th>
                <th style="padding: 10px 8px; font-weight: 600;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map(e => `
                <tr style="border-bottom: 1px solid rgba(0,0,0,.05);">
                  <td style="padding: 10px 8px; font-weight: 500;">${fmtDate(e.timestamp)}<br><span style="color:var(--c-text-hint); font-size:11px;">${fmtTime(e.timestamp)}</span></td>
                  <td style="padding: 10px 8px; font-weight: 600; color: ${e.pain > 7 ? 'var(--c-danger)' : 'var(--c-text)'};">${e.pain}/10</td>
                  <td style="padding: 10px 8px; font-weight: 600; color: ${e.temp > 38.5 ? 'var(--c-danger)' : 'var(--c-text)'};">${e.temp}°C</td>
                  <td style="padding: 10px 8px; color: ${e.wound === 'Bad' ? 'var(--c-danger)' : 'inherit'}; font-weight: 500;">${e.wound}</td>
                  <td style="padding: 10px 8px; color: var(--c-text-muted); font-style: italic;">${e.notes ? '"'+e.notes+'"' : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      // Charts in Report (last 30)
      const chartEntries = entries.slice(0, 30).reverse();
      const labels = chartEntries.map(e => fmtDate(e.timestamp));
      
      const pCtx = document.getElementById('reportPainChart');
      if (rPainChart) rPainChart.destroy();
      rPainChart = new Chart(pCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{ data: chartEntries.map(e => e.pain), borderColor: '#C0392B', backgroundColor: 'rgba(192,57,43,.1)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2, pointHoverRadius: 4 }]
        },
        options: {
          animation: false,
          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 10, ticks: { stepSize: 2 } }, x: { display: false } }
        }
      });

      const tCtx = document.getElementById('reportTempChart');
      if (rTempChart) rTempChart.destroy();
      rTempChart = new Chart(tCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [{ data: chartEntries.map(e => e.temp), borderColor: '#2471A3', backgroundColor: 'rgba(36,113,163,.08)', fill: true, tension: 0.4, borderWidth: 2, pointRadius: 2, pointHoverRadius: 4 },
                     { data: chartEntries.map(() => 38.5), borderColor: '#C0392B', borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0, fill: false }]
        },
        options: {
          animation: false,
          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { y: { min: 35, max: 42, ticks: { stepSize: 1 } }, x: { display: false } }
        }
      });
    }

    /* ============================================================
       WHATSAPP SHARING (PDF)
       ============================================================ */
    async function shareToWhatsApp() {
      const entries = loadEntries();
      if (!entries.length) {
        alert("No data available to share yet.");
        return;
      }
      
      const ptNode = document.getElementById('reportPatientName');
      const pName = ptNode && ptNode.textContent !== 'Unknown' ? ptNode.textContent.replace(/[^a-z0-9]/gi, '_') : 'Patient';
      const filename = `CareCompanion_Report_${pName}.pdf`;

      const element = document.querySelector('#page-report .card');

      // Hide actions temporarily for PDF render
      const actions = element.querySelector('.report-actions');
      if (actions) actions.style.display = 'none';

      // Ensure report page is active briefly so layout is correct for html2canvas
      document.querySelector('#page-report').classList.add('active');
      renderReport();
      
      const opt = {
        margin:       [0.5, 0.5, 0.5, 0.5],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      try {
        showToast('Generating PDF... Please wait.');
        
        // Generate blob
        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        if (actions) actions.style.display = 'flex'; // restore buttons

        const file = new File([pdfBlob], filename, { type: "application/pdf" });

        // Check if device supports sharing files directly (Mobile & Windows 11/Modern macOS)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'CareCompanion Report',
            text: 'Here is the medical recovery report.',
            files: [file]
          });
        } else {
          // Fallback algorithm for older Windows / unsupported desktop browsers
          showToast('Downloading PDF! Please attach it manually in WhatsApp.');
          
          // Trigger download automatically
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Open WhatsApp web API asking them to upload the downloaded file
          const msg = encodeURIComponent(`*🩺 CareCompanion Recovery Report*\nThe PDF medical report has been downloaded to my device. I am attaching it to this message!`);
          setTimeout(() => {
            window.open(`https://wa.me/?text=${msg}`, '_blank');
          }, 1500);
        }
      } catch (e) {
        if (actions) actions.style.display = 'flex';
        console.error(e);
        alert('Failed to generate PDF for WhatsApp.');
      }
    }

    /* ============================================================
       CLEAR ALL DATA
       ============================================================ */
    function clearAllData() {
      if (!confirm('⚠️ Are you sure? This will permanently delete ALL your recovery logs.')) return;
      localStorage.removeItem(STORAGE_KEY);
      updateStreakBadge([]);
      document.getElementById('latestAlerts').innerHTML = '';
      renderDashboard();
      showToast('All data cleared.');
    }

    /* ============================================================
       INITIALISE ON PAGE LOAD
       ============================================================ */
    (function init() {
      const entries = loadEntries();
      updateStreakBadge(entries);

      // If there's a recent entry, show any alerts for it on the dashboard
      if (entries.length) {
        const latest = entries[0];
        const today = new Date();
        const entryDate = new Date(latest.timestamp);
        const sameDay = (
          entryDate.getFullYear() === today.getFullYear() &&
          entryDate.getMonth() === today.getMonth() &&
          entryDate.getDate() === today.getDate()
        );
        if (sameDay) {
           renderLatestAlerts(latest);
        } else {
           renderLatestAlerts(null);
        }
      } else {
        renderLatestAlerts(null);
      }

      // Initialise the dashboard as it is now the home page
      renderDashboard();

      // Listen for print to ensure report is rendered before printing
      window.addEventListener('beforeprint', () => { 
        document.getElementById('page-report').classList.add('active'); // guarantee dimensions
        renderReport(); 
      });
    })();

    /* ============================================================
       AUDIO INTAKE & TRANSLATION
       ============================================================ */
    let recognition;
    let isRecording = false;

    function initSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition API is not supported in this browser.");
        return false;
      }
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = function() {
        isRecording = true;
        document.getElementById('micBtn').innerHTML = '⏹ Stop';
        document.getElementById('micBtn').style.background = 'var(--c-danger-bg)';
        document.getElementById('micBtn').style.color = 'var(--c-danger)';
        document.getElementById('micStatus').style.display = 'block';
        document.getElementById('micStatus').textContent = 'Listening... (Speech will be translated to English)';
      };

      recognition.onresult = async function(event) {
        const transcript = event.results[0][0].transcript;
        const lang = document.getElementById('audioLangSelect').value;
        const sourceLang = lang.split('-')[0];
        
        document.getElementById('micStatus').textContent = 'Processing & translating...';
        
        try {
          let translatedText = transcript;
          if (sourceLang !== 'en') {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=en&dt=t&q=${encodeURIComponent(transcript)}`);
            const data = await res.json();
            translatedText = data[0].map(item => item[0]).join('');
          }
          
          const notesInput = document.getElementById('notesInput');
          notesInput.value = (notesInput.value + ' ' + translatedText).trim();
          showToast('✓ Audio note added & translated!');
        } catch (error) {
          console.error('Translation error:', error);
          showToast('Translation failed. Appended original text.');
          const notesInput = document.getElementById('notesInput');
          notesInput.value = (notesInput.value + ' ' + transcript).trim();
        }
      };

      recognition.onerror = function(event) {
        console.error("Speech recognition error", event.error);
        if(event.error !== 'no-speech') {
          showToast('Error during speech recognition.');
        }
        stopDictation();
      };

      recognition.onend = function() {
        stopDictation();
      };
      
      return true;
    }

    function toggleAudioIntake() {
      if (!recognition) {
        if (!initSpeechRecognition()) return;
      }
      
      if (isRecording) {
        recognition.stop();
      } else {
        const lang = document.getElementById('audioLangSelect').value;
        recognition.lang = lang;
        try {
          recognition.start();
        } catch(e) {
          console.error(e);
        }
      }
    }

    function stopDictation() {
        isRecording = false;
        document.getElementById('micBtn').innerHTML = '🎤 Dictate';
        document.getElementById('micBtn').style.background = '';
        document.getElementById('micBtn').style.color = '';
        document.getElementById('micStatus').style.display = 'none';
        document.getElementById('micStatus').textContent = 'Listening... (will translate to English)';
    }

