"""Assemble the public website and verify every release file before publishing."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request

origin = 'https://paulus-wang.paulussamvel.chatgpt.site/'
manifest = json.loads(Path('asset-manifest.json').read_text())
output = Path('_site')

def prepare(item):
    name, expected = item
    local = Path(name)
    if name.startswith('assets/') and not local.is_file():
        request = urllib.request.Request(origin + name, headers={'User-Agent': 'Paulus-Portfolio-Publisher/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
    else:
        data = local.read_bytes()
    if hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError('Release checksum mismatch: ' + name)
    target = output / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return name

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    files = list(pool.map(prepare, manifest.items()))
print('Verified and prepared', len(files), 'website files')
