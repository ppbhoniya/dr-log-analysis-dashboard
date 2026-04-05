import os
import re
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

def parse_ftp(filepath):
    # Extracts mapping: IP -> Device ID, IP -> List[DR_FILE]
    ip_to_device = {}
    ip_files = {} # Dict[IP, List[DR_FILENAME]]
    
    if not os.path.exists(filepath):
        return {}

    current_ip = None
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            list_dir_match = re.search(r"for '([^']+)' (?:on|from) path: ftp://([^:]+):21", line)
            if list_dir_match:
                device_id = list_dir_match.group(1).split('#')[0]
                ip = list_dir_match.group(2)
                ip_to_device[ip] = device_id
            
            from_path_match = re.search(r"From path: ftp://([^:]+):21", line)
            if from_path_match:
                current_ip = from_path_match.group(1)
                
            if current_ip and ('.zip' in line or '.cfg' in line or '.dat' in line):
                file_match = re.search(r'(drec_\d+)[hH]?\.(?:zip|cfg|dat)', line)
                if file_match:
                    dr_name = file_match.group(1)
                    if dr_name + 'h' not in line.lower():
                        if current_ip not in ip_files:
                            ip_files[current_ip] = []
                        if dr_name not in ip_files[current_ip]:
                            ip_files[current_ip].append(dr_name)

    results = {}
    for ip, files in ip_files.items():
        dev_id = ip_to_device.get(ip, "Unknown")
        for f_name in files:
            results[f_name] = {'ip': ip, 'device_id': dev_id}
            
    return results

def parse_oti(filepath):
    results = {}
    if not os.path.exists(filepath):
        return results

    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            match = re.search(r"ftp://([^:]+):21/.*/(drec_\d+)", line)
            if match:
                ip = match.group(1)
                dr_name = match.group(2)
                if not dr_name.endswith('h') and not dr_name.endswith('H'):
                    results[dr_name] = {'ip': ip}
                    
    return results

def parse_fl(folderpath):
    results = {}
    if not os.path.exists(folderpath):
        return results

    files_to_parse = []
    if os.path.isfile(folderpath):
        files_to_parse.append(folderpath)
    else:
        for root, dirs, files in os.walk(folderpath):
            for file in files:
                if file.endswith('.log'):
                    files_to_parse.append(os.path.join(root, file))
                    
    for path in files_to_parse:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                if "NEW DR DETECTED" in line:
                    relay_match = re.search(r"relay=([^|\s]+)", line)
                    cfg_match = re.search(r"cfg=(drec_\d+)h?\.cfg", line)
                    if relay_match and cfg_match:
                        relay = relay_match.group(1).strip()
                        dr_name = cfg_match.group(1)
                        # Exclude header files (drec_XXXh)
                        if not dr_name.lower().endswith('h'):
                            results[dr_name] = {'device_id': relay}
                            
    return results

@app.route('/api/data', methods=['POST'])
def get_data():
    data = request.json
    ftp_path = data.get('ftp_path', '')
    oti_path = data.get('oti_path', '')
    fl_path = data.get('fl_path', '')

    ftp_data = parse_ftp(ftp_path)
    oti_data = parse_oti(oti_path)
    fl_data = parse_fl(fl_path)

    all_drs = set(list(ftp_data.keys()) + list(oti_data.keys()) + list(fl_data.keys()))
    
    response_data = []
    
    for dr in sorted(all_drs):
        in_ftp = dr in ftp_data
        in_oti = dr in oti_data
        in_fl = dr in fl_data
        
        ip = ftp_data.get(dr, {}).get('ip') or oti_data.get(dr, {}).get('ip') or "N/A"
        device_id = ftp_data.get(dr, {}).get('device_id') or fl_data.get(dr, {}).get('device_id') or "N/A"
        
        if in_ftp and in_oti and in_fl:
            status = "Matched in All"
        elif in_ftp and not in_oti and not in_fl:
            status = "Missing in Both"
        elif in_ftp and not in_oti:
            status = "Missing in OTI"
        elif in_ftp and not in_fl:
            status = "Missing in FaultLocation"
        else:
            status = "Missing in FTP"
            
        fl_relay = fl_data.get(dr, {}).get('device_id') or ""
            
        response_data.append({
            "dr_name": dr,
            "ip": ip,
            "device_id": device_id,
            "fl_relay": fl_relay,
            "in_ftp": in_ftp,
            "in_oti": in_oti,
            "in_fl": in_fl,
            "status": status
        })
        
    return jsonify({"success": True, "data": response_data})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
