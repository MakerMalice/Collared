#!/usr/bin/env python3
"""Dark "app update" banner for Discord posts (1600x640).

  python3 tools/announcement_banner.py OUT.png --num 45 --tag "Fitness is here." \
      [--label "A P P   U P D A T E"] [--sub "Beta build notes"] [--mock home|fitness|logo]

Uses the app's night palette and the supplied wordmark PNG (never a webfont).
Mock data is fictional ("Luna"). Needs Pillow and macOS's Avenir Next.
Always give a new build a NEW filename: Discord caches images by address.
"""
import argparse, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parent.parent
FONT='/System/Library/Fonts/Avenir Next.ttc'
BG=(26,24,32); CARD=(38,35,48); CARD2=(46,42,58); VIOLET=(116,68,255); VIOLET2=(139,97,255)
INK=(240,236,252); SUB=(160,154,182)
F=lambda sz,i=5: ImageFont.truetype(FONT,sz,index=i)
a=argparse.ArgumentParser(); a.add_argument('out'); a.add_argument('--num',required=True)
a.add_argument('--tag',required=True); a.add_argument('--label',default='A P P   U P D A T E')
a.add_argument('--sub',default='Beta build notes'); a.add_argument('--mock',default='home')
o=a.parse_args()
W,H=1600,640
img=Image.new('RGBA',(W,H),BG+(255,))
def glow(c,r,col,al):
    l=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(l).ellipse([c[0]-r,c[1]-r,c[0]+r,c[1]+r],fill=col+(al,))
    img.alpha_composite(l.filter(ImageFilter.GaussianBlur(r*0.55)))
glow((420,700),420,VIOLET,90); glow((1500,40),380,VIOLET2,70)
g=Image.new('RGBA',(W,H),(0,0,0,0)); gd=ImageDraw.Draw(g)
for x in range(0,W,64): gd.line([(x,0),(x,H)],fill=(255,255,255,9))
for y in range(0,H,64): gd.line([(0,y),(W,y)],fill=(255,255,255,9))
img.alpha_composite(g); d=ImageDraw.Draw(img)
wm=Image.open(ROOT/'assets/collared-logo-white.png').convert('RGBA'); wm=wm.crop(wm.getbbox())
LY=174
if o.mock!='logo': img.alpha_composite(wm.resize((250,int(wm.height*250/wm.width)),Image.LANCZOS),(96,80))
else: LY=96
d.rounded_rectangle([96,LY+2,102,LY+32],radius=3,fill=VIOLET2)
d.text((120,LY),o.label,font=F(26,2),fill=VIOLET2)
mask=Image.new('L',(W,H),0); ImageDraw.Draw(mask).text((88,172),o.num,font=F(300,2),fill=255)
grad=Image.new('RGBA',(W,H)); gp=grad.load()
for y in range(H):
    t=max(0,min(1,(y-210)/330)); c=tuple(int(p+(q-p)*t) for p,q in zip((255,255,255),VIOLET2))
    for x in range(0,780): gp[x,y]=c+(255,)
grad.putalpha(mask); img.alpha_composite(grad); d=ImageDraw.Draw(img)
d.text((100,508),o.tag,font=F(38,5),fill=INK); d.text((100,562),o.sub,font=F(26,5),fill=SUB)

def ring_grad(c,r,w,c1,c2,al,gap=40,start=-100):
    m=Image.new('L',(W,H),0); md=ImageDraw.Draw(m)
    md.arc([c[0]-r,c[1]-r,c[0]+r,c[1]+r],start=start+gap,end=start+360,fill=al,width=w)
    for ang in (start+gap,start+360):
        t=math.radians(ang); rr=r-w/2; x,y=c[0]+rr*math.cos(t),c[1]+rr*math.sin(t)
        md.ellipse([x-w/2,y-w/2,x+w/2,y+w/2],fill=al)
    g=Image.new('RGBA',(W,H)); gp=g.load()
    for yy in range(c[1]-r-4,c[1]+r+4):
        for xx in range(c[0]-r-4,c[0]+r+4):
            if 0<=xx<W and 0<=yy<H:
                t=max(0,min(1,((xx-(c[0]-r))+(yy-(c[1]-r)))/(4*r)))
                gp[xx,yy]=tuple(int(a+(b-a)*t) for a,b in zip(c1,c2))+(255,)
    g.putalpha(m); img.alpha_composite(g)
if o.mock=='logo':
    C=(1180,320)
    glow(C,360,VIOLET,120); glow(C,200,VIOLET2,70)
    ring_grad(C,272,30,(255,255,255),VIOLET2,90,gap=40,start=-100)
    ring_grad(C,212,18,(255,255,255),VIOLET2,235,gap=46,start=70)
    big=wm.resize((318,int(wm.height*318/wm.width)),Image.LANCZOS)
    pos=(C[0]-big.width//2,C[1]-big.height//2)
    halo=Image.new('RGBA',(W,H),(0,0,0,0)); halo.alpha_composite(big,pos)
    img.alpha_composite(halo.filter(ImageFilter.GaussianBlur(14)))
    img.alpha_composite(big,pos)
else:
    px,py,pw,ph=860,70,640,500
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle([px,py+18,px+pw,py+ph+18],radius=44,fill=(0,0,0,150))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    pn=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(pn).rounded_rectangle([px,py,px+pw,py+ph],radius=44,fill=CARD,outline=(116,68,255,70),width=2)
    img.alpha_composite(pn); d=ImageDraw.Draw(img)
    d.text((px+36,py+30),"Good evening, Luna",font=F(30,2),fill=INK); d.text((px+36,py+72),"Today",font=F(22,5),fill=SUB)
    def ring_tile(x,y,w,h,label,val,frac):
        d.rounded_rectangle([x,y,x+w,y+h],radius=26,fill=CARD2); cx,cy,r=x+62,y+h//2,34
        d.ellipse([cx-r,cy-r,cx+r,cy+r],outline=(70,64,92),width=9)
        d.arc([cx-r,cy-r,cx+r,cy+r],start=-90,end=-90+360*frac,fill=VIOLET2,width=9)
        d.text((x+116,y+h//2-36),label,font=F(22,5),fill=SUB); d.text((x+116,y+h//2-4),val,font=F(32,2),fill=INK)
    def row(y,text,done):
        d.rounded_rectangle([px+36,y,px+pw-36,y+62],radius=20,fill=CARD2); c=(px+72,y+31)
        if done:
            d.ellipse([c[0]-14,c[1]-14,c[0]+14,c[1]+14],fill=VIOLET)
            d.line([(c[0]-6,c[1]),(c[0]-1,c[1]+6),(c[0]+8,c[1]-6)],fill=(255,255,255),width=4,joint='curve')
        else: d.ellipse([c[0]-14,c[1]-14,c[0]+14,c[1]+14],outline=(90,84,114),width=3)
        d.text((px+108,y+14),text,font=F(27,5),fill=SUB if done else INK)
    if o.mock=='fitness':
        ring_tile(px+36,py+120,282,112,"This week","11.4 mi",0.8); ring_tile(px+330,py+120,274,112,"Our goal","14 of 20",0.7)
        row(py+238,"Fastest mile  7:41",True); row(py+306,"Walk to 9,000 steps",False); new=set()
    else:
        ring_tile(px+36,py+120,282,112,"Water","48 oz",0.75); ring_tile(px+330,py+120,274,112,"Run","2.4 mi",0.6)
        row(py+238,"Morning stretch",True); row(py+306,"Take daily meds",False); new={"You","Us"}
    ty=py+ph-96; d.rounded_rectangle([px+24,ty,px+pw-24,ty+72],radius=36,fill=(30,28,38))
    tabs=["Home","Tasks","You","Us","Social"]; hi={"You"} if o.mock=='fitness' else new; seg=(pw-48)/5
    for i,t in enumerate(tabs):
        cx=px+24+seg*i+seg/2; on=t in hi
        if on: d.rounded_rectangle([cx-seg/2+8,ty+8,cx+seg/2-8,ty+64],radius=28,fill=VIOLET)
        f=F(24,2 if on else 5); w=d.textlength(t,font=f); d.text((cx-w/2,ty+21),t,font=f,fill=(255,255,255) if on else SUB)
    for i,t in enumerate(tabs):
        if t in new:
            cx=px+24+seg*i+seg/2; d.rounded_rectangle([cx-26,ty-30,cx+26,ty-6],radius=12,fill=(255,255,255))
            w=d.textlength("NEW",font=F(15,2)); d.text((cx-w/2,ty-28),"NEW",font=F(15,2),fill=VIOLET)
img.convert('RGB').save(o.out,optimize=True); print('wrote',o.out)
