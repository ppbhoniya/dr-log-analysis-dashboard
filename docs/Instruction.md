# DR Log Analysis Dashboard - Instructions

## Overview

This is a real-time web dashboard for monitoring and correlating **Disturbance Records (DR)** across three log sources
used in industrial protection relay systems (ETAP-based environments).

## Getting Started

### Step 1 — Start the Server

Open a terminal in the `dashboard` folder and run:

```bash
python app.py
```

The server will start at `http://127.0.0.1:5000`.

### Step 2 — Open the Dashboard

Navigate to `http://127.0.0.1:5000` in your browser.

### Step 3 — Enter Log File Paths

Provide the three input paths on the dashboard:

| Input | Description | Example |
|-------|-------------|---------|
| **1. FTP File Path** | Full path to the FTP application log file | `D:\Logs\FTP.exe_1` |
| **2. OTI File Path** | Full path to the ETAP Notifier log file | `D:\Logs\etap-notifier-20260319_0.log` |
| **3. FaultLocation Folder/File** | Path to a folder containing FaultLocation `.log` files, or a single log file | `D:\Logs\FaultLocation\` |

### Step 4 — Start Polling

Click **Start Polling (60s)**. The dashboard will:
- Immediately parse all three log files
- Display results in the table
- Automatically refresh every **60 seconds**

Click **Stop Polling** to pause.

---

## How Results Are Displayed

### Summary Cards (Top)

| Card | Meaning |
|------|---------|
| **Total DR Files Processed** | Total unique DR files found across all three sources |
| **Matched in All** | DR files found in FTP, OTI, AND FaultLocation |
| **Missing / Errors** | DR files that are absent in at least one of the three sources |

### Log Details Table

One row per **Device (Relay)**. Columns are:

| Column | Description |
|--------|-------------|
| **Device ID** | Device name extracted from the FTP log. FaultLocation relay name shown below in purple (⚡) |
| **IP Address** | IP address of the relay device (from FTP or OTI log) |
| **Total DRs** | Total unique DR files seen for this device |
| **FTP DRs** | DR files listed in the FTP log for this device (green = matched, red = missing in other sources) |
| **OTI DRs** | DR files in the OTI log linked to this device |
| **FaultLocation DRs** | DR files from FaultLocation for this device. Hover over a DR name to see the relay name |
| **Matched** | Count of DRs present in all three sources |
| **Status** | `All Good` / `Missing in FaultLocation` / `Missing in OTI` / `Multiple Errors/Missing` |

### Color Coding

- 🟢 **Green** — DR file matched in all three sources
- 🔴 **Red** — DR file missing in one or more sources
- 🟣 **Purple ⚡** — FaultLocation relay name (different naming convention to FTP Device ID)
- 🟥 **Red row highlight** — Entire device row is highlighted if it has any mismatches

---

## Excluded Files

DR files ending in `h` (e.g., `drec_293h.zip`) are **automatically excluded** because they are header-only companion files and do not represent full Disturbance Records.