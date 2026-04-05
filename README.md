# DR Log Analysis Dashboard

A real-time web dashboard for monitoring and correlating Disturbance Record (DR) files across three industrial systems: **FTP Logs**, **OTI (ETAP Notifier) Logs**, and **FaultLocation Logs**.

## Features

- 📊 **Device-level summary** — Groups DR files per device (Device ID + IP)
- 🟢 **3-way matching** — Tracks DRs across FTP, OTI, and FaultLocation simultaneously
- 🔴 **Missing file highlighting** — Rows and DR names are highlighted in red when missing in any source
- ⚡ **FaultLocation relay mapping** — Shows the FaultLocation relay name alongside the FTP Device ID
- 🔄 **60-second auto-polling** — Automatically re-reads log files every 60 seconds
- 🎨 **Premium dark UI** — Glassmorphism design with smooth animations

## Tech Stack

- **Backend**: Python + Flask
- **Frontend**: Vanilla HTML, CSS, JavaScript (no frameworks)

## Project Structure

```
dashboard/
├── app.py              # Flask server & log parsers
├── requirements.txt    # Python dependencies
└── static/
    ├── index.html      # Main UI
    ├── style.css       # Styling (dark mode + glassmorphism)
    └── script.js       # Polling logic & table rendering
```

## Setup & Run

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the server

```bash
python app.py
```

### 3. Open in browser

Navigate to: [http://127.0.0.1:5000](http://127.0.0.1:5000)

## Usage

1. Enter the three file/folder paths in the input fields:
   - **FTP File Path** — path to the FTP `.exe_X` or equivalent log file
   - **OTI File Path** — path to the `etap-notifier-*.log` file
   - **FaultLocation Folder Path** — path to a folder containing `FaultLocation-*.log` files (or a single log file)

2. Click **Start Polling (60s)** to begin automatic polling every 60 seconds.

3. The table will display one row per **Device ID** with:
   - Lists of DR files found in each source (green = matched, red = missing)
   - FaultLocation relay name(s) displayed under the Device ID
   - Overall status badge (`All Good` or error description)

## Log Formats Supported

| Source | Detection Pattern |
|--------|-------------------|
| FTP | `From path: ftp://IP:21/...` + file listing with `drec_XXX.zip` |
| OTI | `ftp://IP:21/.../drec_XXX` in log lines |
| FaultLocation | `AFAS: NEW DR DETECTED ... relay=... cfg=drec_XXX.cfg` |

> **Note:** Files ending in `h` (e.g. `drec_293h.zip`) are automatically excluded as they are header-only DR files.
