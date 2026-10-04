import os
import re
import json
import urllib.request

API_KEY = os.environ.get('YOUTUBE_API_KEY')
PRODUCTS_FILE = 'products.js'
STATS_FILE = 'stats.json'

if not API_KEY:
    print("Error: YOUTUBE_API_KEY environment variable is not set.")
    exit(1)

# Extract YouTube IDs from products.js
try:
    with open(PRODUCTS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
except Exception as e:
    print(f"Error reading {PRODUCTS_FILE}: {e}")
    exit(1)

# Look for yt_id: '...'
yt_ids = set(re.findall(r"yt_id:\s*'([^']+)'", content))
yt_ids = [vid for vid in yt_ids if vid]

if not yt_ids:
    print("No YouTube IDs found.")
    exit(0)

# Fetch stats from YouTube API
all_stats = {}
# YouTube API allows up to 50 ids per request
batch_size = 50
for i in range(0, len(yt_ids), batch_size):
    batch = yt_ids[i:i+batch_size]
    url = f"https://www.googleapis.com/youtube/v3/videos?part=statistics&id={','.join(batch)}&key={API_KEY}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            for item in data.get('items', []):
                vid_id = item.get('id')
                stats = item.get('statistics', {})
                all_stats[vid_id] = {
                    'views': int(stats.get('viewCount', 0)),
                    'likes': int(stats.get('likeCount', 0))
                }
    except Exception as e:
        print(f"Failed to fetch batch {batch}: {e}")

if all_stats:
    with open(STATS_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_stats, f, indent=2)
    print(f"Successfully updated stats for {len(all_stats)} videos.")
else:
    print("No stats were fetched.")
