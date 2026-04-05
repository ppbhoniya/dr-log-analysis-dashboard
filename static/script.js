document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const ftpPathInput = document.getElementById('ftp-path');
    const otiPathInput = document.getElementById('oti-path');
    const flPathInput = document.getElementById('fl-path');
    const statusIndicator = document.getElementById('status-indicator');
    
    // Summary nodes
    const countTotalNode = document.getElementById('count-total');
    const countMatchedNode = document.getElementById('count-matched');
    const countMissingNode = document.getElementById('count-missing');
    const lastUpdatedNode = document.getElementById('last-updated');
    const tableBody = document.getElementById('table-body');

    let isPolling = false;
    let pollInterval = null;

    startBtn.addEventListener('click', () => {
        if (isPolling) {
            stopPolling();
        } else {
            startPolling();
        }
    });

    function startPolling() {
        if (!ftpPathInput.value || !otiPathInput.value || !flPathInput.value) {
            alert('Please provide all three paths.');
            return;
        }

        isPolling = true;
        startBtn.textContent = 'Stop Polling';
        startBtn.classList.add('polling');
        statusIndicator.textContent = 'Polling Active';
        statusIndicator.style.color = 'var(--green-success)';

        fetchData(); 
        pollInterval = setInterval(fetchData, 60000); // 60s
    }

    function stopPolling() {
        isPolling = false;
        clearInterval(pollInterval);
        startBtn.textContent = 'Start Polling (60s)';
        startBtn.classList.remove('polling');
        statusIndicator.textContent = 'Idle';
        statusIndicator.style.color = 'var(--text-secondary)';
    }

    async function fetchData() {
        try {
            const payload = {
                ftp_path: ftpPathInput.value,
                oti_path: otiPathInput.value,
                fl_path: flPathInput.value
            };

            const response = await fetch('/api/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (result.success) {
                renderData(result.data);
                lastUpdatedNode.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
            } else {
                console.error("Error from backend");
            }
        } catch (err) {
            console.error("Fetch error: ", err);
            statusIndicator.textContent = 'Connection Error!';
            statusIndicator.style.color = 'var(--red-alert)';
        }
    }

    function renderData(data) {
        let matchedCount = 0;
        let missingCount = 0;
        
        tableBody.innerHTML = '';

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No files processed yet. Check paths.</td></tr>';
            return;
        }

        const deviceMap = {};

        data.forEach(row => {
            if (row.status === "Matched in All") {
                matchedCount++;
            } else {
                missingCount++;
            }

            const devId = row.device_id || "Unknown";
            if (!deviceMap[devId]) {
                deviceMap[devId] = {
                    device_id: devId,
                    ip: row.ip !== "N/A" ? row.ip : "Unknown",
                    total: 0,
                    matched: 0,
                    missing_oti: 0,
                    missing_fl: 0,
                    missing_ftp: 0,
                    missing_both: 0,
                    other_errors: 0,
                    ftp_drs: [],
                    oti_drs: [],
                    fl_drs: [],
                    fl_relays: new Set()
                };
            }

            if (deviceMap[devId].ip === "Unknown" && row.ip !== "N/A") {
                deviceMap[devId].ip = row.ip;
            }

            deviceMap[devId].total++;
            
            if (row.in_ftp) deviceMap[devId].ftp_drs.push({ name: row.dr_name, status: row.status });
            if (row.in_oti) deviceMap[devId].oti_drs.push({ name: row.dr_name, status: row.status });
            if (row.in_fl) {
                deviceMap[devId].fl_drs.push({ name: row.dr_name, status: row.status, relay: row.fl_relay || '' });
                if (row.fl_relay) deviceMap[devId].fl_relays.add(row.fl_relay);
            }
            // Also track DRs that exist in FTP/OTI but are missing in FL (so they appear red in FL column)
            if (!row.in_fl && (row.in_ftp || row.in_oti)) deviceMap[devId].fl_drs.push({ name: row.dr_name, status: row.status, relay: '' });
            
            if (row.status === "Matched in All") deviceMap[devId].matched++;
            else if (row.status === "Missing in OTI") deviceMap[devId].missing_oti++;
            else if (row.status === "Missing in FaultLocation") deviceMap[devId].missing_fl++;
            else if (row.status === "Missing in FTP") deviceMap[devId].missing_ftp++;
            else if (row.status === "Missing in Both") deviceMap[devId].missing_both++;
            else deviceMap[devId].other_errors++;
        });

        // Update headers to reflect Device ID grouping
        const thead = document.querySelector('thead tr');
        thead.innerHTML = `
            <th>Device ID</th>
            <th>IP Address</th>
            <th>Total DRs</th>
            <th>FTP DRs</th>
            <th>OTI DRs</th>
            <th>FaultLocation DRs</th>
            <th>Matched</th>
            <th>Status</th>
        `;

        const deviceData = Object.values(deviceMap);
        deviceData.sort((a, b) => a.device_id.localeCompare(b.device_id));

        deviceData.forEach(dev => {
            const tr = document.createElement('tr');
            
            let badgeClass = 'status-matched';
            let statusText = 'All Good';
            let isHighlight = false;

            if (dev.matched < dev.total) {
                badgeClass = 'status-missing';
                if (dev.missing_fl > 0 && dev.missing_oti === 0 && dev.missing_ftp === 0) {
                    statusText = 'Missing in FaultLocation';
                } else if (dev.missing_oti > 0 && dev.missing_fl === 0 && dev.missing_ftp === 0) {
                    statusText = 'Missing in OTI';
                } else if (dev.missing_ftp > 0 && dev.missing_fl === 0 && dev.missing_oti === 0) {
                    statusText = 'Missing in FTP';
                } else {
                    statusText = 'Multiple Errors/Missing';
                }
                isHighlight = true;
            }

            if (isHighlight) {
                tr.classList.add('highlight-row');
            }
            
            const formatDrs = (drsArray, showRelay = false) => {
                drsArray.sort((a, b) => a.name.localeCompare(b.name));
                return drsArray.map(d => {
                    const color = d.status === "Matched in All" ? "var(--green-success)" : "var(--red-alert)";
                    const title = showRelay && d.relay ? ` title="Relay: ${d.relay}"` : '';
                    return `<span style="color: ${color}; font-size: 0.8rem; margin-right: 6px; display: inline-block; cursor: default;"${title}>${d.name}</span>`;
                }).join("");
            };

            const ftpHtml = formatDrs(dev.ftp_drs);
            const otiHtml = formatDrs(dev.oti_drs);
            const flHtml = formatDrs(dev.fl_drs, true);

            tr.innerHTML = `
                <td>
                    <strong>${dev.device_id}</strong>
                    ${[...dev.fl_relays].map(r => `<br><span style="font-size:0.75rem; color: #a78bfa;" title="FaultLocation Relay">⚡ ${r}</span>`).join('')}
                </td>
                <td>${dev.ip}</td>
                <td><strong>${dev.total}</strong></td>
                <td style="max-width: 200px; line-height: 1.4;">${ftpHtml}</td>
                <td style="max-width: 200px; line-height: 1.4;">${otiHtml}</td>
                <td style="max-width: 200px; line-height: 1.4;">${flHtml}</td>
                <td><span style="color: var(--green-success); font-weight: bold">${dev.matched}</span></td>
                <td><span class="status-badge ${badgeClass}">${statusText}</span></td>
            `;
            
            tableBody.appendChild(tr);
        });

        animateValue(countTotalNode, parseInt(countTotalNode.textContent) || 0, data.length, 600);
        animateValue(countMatchedNode, parseInt(countMatchedNode.textContent) || 0, matchedCount, 600);
        animateValue(countMissingNode, parseInt(countMissingNode.textContent) || 0, missingCount, 600);
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        if(isNaN(start)) start = 0;
        if (start === end) {
            obj.innerHTML = end;
            return;
        }
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
