#!/usr/bin/env python3
"""Turn a release POSTS.md (## Post N sections) into Discord embed messages.

  python3 tools/discord_update_posts.py POSTS.md --parts 1-2,3-5 \
      --banner https://collared.app/assets/a.png --banner https://collared.app/assets/b.png \
      [--image 1=https://.../board1.png] [--out payloads.json] [--send]

- Each part = a banner image message, then one text embed (banner above the text,
  because Discord always draws embed images at the bottom).
- Webhook URL comes from env COLLARED_UPDATES_WEBHOOK; never put it in a file.
- No role ping. Last embed gets the //tox sign-off and footer. Dry run unless --send.
- Writes the posted message ids next to --out so posts can be edited/deleted later.
"""
import argparse, json, os, re, sys, time, datetime, urllib.request
EMOJI=re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200d]')
def clean(t): return re.sub(r'  +',' ',EMOJI.sub('',t)).strip()
AV="https://collared.app/assets/collared-avatar.png"; PFP="https://collared.app/assets/tox-pfp.png"
ap=argparse.ArgumentParser(); ap.add_argument('md'); ap.add_argument('--parts',required=True)
ap.add_argument('--banner',action='append',default=[]); ap.add_argument('--image',action='append',default=[])
ap.add_argument('--out',default='payloads.json'); ap.add_argument('--send',action='store_true'); o=ap.parse_args()
text=EMOJI.sub('',open(o.md).read())
posts={}
for m in re.finditer(r'^## Post (\d+)[^\n]*\n(.*?)(?=^## Post \d+|\Z)',text,re.S|re.M): posts[int(m.group(1))]=m.group(2).strip()
def parse(block):
    intro=[]; secs=[]; cur=None; tail=[]
    for l in block.split('\n'):
        s=l.strip()
        if not s: continue
        if s.startswith('# '): continue
        if s.startswith('## '): cur={'name':s[3:].strip(),'items':[]}; secs.append(cur); continue
        if cur is None: intro.append(s)
        elif s.startswith('•'): cur['items'].append(s)
        elif cur['items'] and not s.startswith('•'): 
            (tail if s.startswith('**') else cur['items']).append(s)
        else: cur['items'].append(s)
    return intro,secs,tail
def chunks(items,limit=1000):
    out=[];buf=[];n=0
    for it in items:
        if buf and n+len(it)+1>limit: out.append('\n'.join(buf));buf=[];n=0
        buf.append(it);n+=len(it)+1
    if buf: out.append('\n'.join(buf))
    return out
def size(e): return len(e.get('description',''))+len(e['author']['name'])+len(e.get('footer',{}).get('text',''))+sum(len(f['name'])+len(f['value']) for f in e['fields'])
now=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
parts=[]
rng=o.parts.split(',')
for pi,r in enumerate(rng):
    a,b=(r.split('-')+[r])[:2] if '-' in r else (r,r); ids=range(int(a),int(b)+1)
    e={'author':{'name':'Collared App','icon_url':AV,'url':'https://collared.app'},'color':0x7444FF,'fields':[]}
    tails=[]
    for k in ids:
        intro,secs,tail=parse(posts[k]); tails+=tail
        if intro: e['description']=' '.join(intro)
        for s in secs:
            for i,c in enumerate(chunks(s['items'])): e['fields'].append({'name':clean(s['name']) if i==0 else s['name']+' (continued)','value':c})
    tries=[re.sub(r'^\*\*Try it:\*\*\s*','',t) for t in tails]
    for im in o.image:
        n,u=im.split('=',1)
        if int(n)==pi+1: e['image']={'url':u}
    if pi==len(rng)-1:
        e['fields'].append({'name':'Try it','value':(tries[0]+'\n\n' if tries else '')+'//tox'})
        e['footer']={'text':'tox · Collared','icon_url':PFP}; e['timestamp']=now
    assert size(e)<=5900 and all(len(f['value'])<=1024 and len(f['name'])<=256 for f in e['fields']),'embed too large'
    parts.append(e)
msgs=[]
for i,e in enumerate(parts):
    if i<len(o.banner): msgs.append({'username':'Collared','avatar_url':AV,'content':o.banner[i]})
    msgs.append({'username':'Collared','avatar_url':AV,'embeds':[e]})
json.dump(msgs,open(o.out,'w'),indent=2,ensure_ascii=False)
raw=text
print('messages:',len(msgs),'| embed sizes:',[size(e) for e in parts],'| em dash:','—' in raw,'| tables:',bool(re.search(r'^\|',raw,re.M)))
if o.send:
    url=os.environ['COLLARED_UPDATES_WEBHOOK']+'?wait=true'; ids=[]
    for m in msgs:
        req=urllib.request.Request(url,json.dumps(m).encode(),{'Content-Type':'application/json','User-Agent':'CollaredAnnounce/1.0'})
        with urllib.request.urlopen(req) as r: ids.append(json.load(r)['id']); print('sent',ids[-1])
        time.sleep(2)
    json.dump(ids,open(o.out.replace('.json','-ids.json'),'w'))
