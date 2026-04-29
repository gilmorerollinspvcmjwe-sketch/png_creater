import requests, json, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

sid = f'test-ref-{int(time.time())}'
print(f'Testing with sessionId={sid}')

try:
    r = requests.post('http://localhost:8000/api/agent/chat/stream', 
        json={'message': '帮我做一个个人主页，我是 INTJ，推是绫波丽', 'sessionId': sid},
        stream=True, timeout=120)
    print(f'Status: {r.status_code}')
    line_count = 0
    for line in r.iter_lines(decode_unicode=True):
        if line:
            line_count += 1
            if line.startswith('data: '):
                d = json.loads(line[6:])
                t = d.get('type', '')
                msg = d.get('message', '')[:60]
                if t in ('reflection', 'generating', 'tool_call', 'validation') or msg:
                    print(f'  [{t}] {msg}')
    print(f'Total lines: {line_count}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
