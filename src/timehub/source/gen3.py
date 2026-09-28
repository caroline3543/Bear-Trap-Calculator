import sys, itertools; sys.path.insert(0,"/tmp/arc")
from gen import icon, OUT, A1, A2, A3, A4
_uid = itertools.count(1)
def uid(p="u"): return f"{p}{next(_uid)}"

FONTS='<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Nunito:wght@600..800&family=Figtree:wght@600..800&family=Bricolage+Grotesque:wght@600..800&family=Kalam:wght@400;700&family=Caveat:wght@500..700&family=Patrick+Hand&display=swap" rel="stylesheet">'
CSS = FONTS + """
<style>
body{margin:0;background:#F4F8F8;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;font-weight:450;color:#17272B;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}
h1,h2,h3,p,ul{margin:0;padding:0}
button,input{font-family:inherit}
button{cursor:pointer;border:0}
.eyebrow{font-size:13px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#5B7075}
.num{font-variant-numeric:tabular-nums}
.title{font-family:Nunito,Inter,sans-serif;font-size:32px;line-height:36px;font-weight:700;letter-spacing:-.4px}
.count{font-family:Nunito,Inter,sans-serif;font-size:36px;line-height:42px;font-weight:800;letter-spacing:-.6px;font-variant-numeric:tabular-nums}
.sect{font-family:Nunito,Inter,sans-serif;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-.2px}
.hand{font-family:Kalam,Caveat,cursive;font-size:17px;line-height:22px;font-weight:400;color:#2F6577}
.card{background:#fff;border:1px solid #DCE9EC;border-radius:24px;padding:20px}
.iconbtn{width:44px;height:44px;border-radius:14px;background:#fff;border:1px solid #DCE9EC;display:inline-flex;align-items:center;justify-content:center;color:#244F5C}
.btn{height:52px;border-radius:14px;font-size:16px;font-weight:600;padding:0 20px;display:inline-flex;align-items:center;justify-content:center;gap:8px}
.btn-sec{height:44px;border-radius:14px;background:#E8F3F5;color:#244F5C;font-size:15px;font-weight:600;padding:0 16px;display:inline-flex;align-items:center}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
.chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;font-size:14px;font-weight:500;background:#E8F3F5;color:#17272B}
.seg{height:44px;padding:0 16px;border-radius:999px;font-size:15px;font-weight:600;background:#fff;border:1px solid #DCE9EC;color:#17272B;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;flex-shrink:0}
.seg.on{background:#244F5C;border-color:#244F5C;color:#fff}
.rowline{display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid #DCE9EC}
.rowline:first-of-type{border-top:0}
.ic{width:44px;height:44px;border-radius:50%;background:#E8F3F5;color:#397F91;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ic.warm{background:#FFF4E6;color:#8A5210}
.t16{font-size:16px;line-height:23px;font-weight:600}
.t14{font-size:14px;line-height:20px;font-weight:500;color:#5B7075}
.tl-row{display:grid;grid-template-columns:76px 20px 1fr;column-gap:8px;position:relative}
.tl-time{padding:14px 0;font-size:16px;line-height:23px;font-weight:600}
.tl-utc{font-size:14px;line-height:20px;font-weight:500;color:#5B7075}
.tl-rail{position:relative;align-self:stretch}
.tl-rail svg.line{position:absolute;left:0;top:0;width:20px;height:100%}
.mk{position:absolute;left:0;top:15px;width:20px;height:20px;z-index:1}
.tl-body{padding:14px 0}
.tl-title{font-size:16px;line-height:23px;font-weight:600}
.tl-meta{font-size:14px;line-height:20px;font-weight:500;color:#5B7075;margin-top:2px}
.gap-body{position:relative}
.gap-inner{position:absolute;left:0;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:12px;height:44px;white-space:nowrap}
.gap-free{font-size:14px;line-height:20px;font-weight:600;color:#244F5C}
.addtask{height:44px;padding:0 14px;border-radius:14px;background:#E8F3F5;color:#244F5C;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
.now{display:flex;align-items:center;gap:12px;padding:8px 0 4px}
.now span.p{height:28px;padding:0 12px;border-radius:999px;background:#CDE7EC;color:#244F5C;font-size:13px;line-height:28px;font-weight:700;letter-spacing:1.4px}
.now span.l{flex:1;height:2px;background:#78C7D5;border-radius:2px}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;color:#5B7075;font-size:13px;font-weight:600;padding:8px 0;height:64px;justify-content:center}
.tab .pill{position:relative;width:56px;height:32px;display:flex;align-items:center;justify-content:center}
.tab .pill svg.floe{position:absolute;inset:0}
.tab.on{color:#244F5C}
</style>
"""

# ---------------- painterly toolkit (texture lives ONLY in illustrations) ----------------
DEFS = '''<defs>
<filter id="gouache" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="r"/>
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.26  0 0 0 0 0.33  0 0 0 -1.1 0.62" result="ng"/>
<feComposite in="ng" in2="r" operator="in" result="gr"/>
<feMerge><feMergeNode in="r"/><feMergeNode in="gr"/></feMerge>
</filter>
<filter id="brush" x="-5%" y="-10%" width="110%" height="120%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.006 0.16" numOctaves="2" seed="4" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="7" xChannelSelector="R" yChannelSelector="G" result="r"/>
<feTurbulence type="fractalNoise" baseFrequency="0.02 0.9" numOctaves="2" seed="9" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -1.4 0.75" result="ng"/>
<feComposite in="ng" in2="r" operator="in" result="gr"/>
<feMerge><feMergeNode in="r"/><feMergeNode in="gr"/></feMerge>
</filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.4  0 0 0 0 0.45  0 0 0 -1.6 0.9"/>
</filter>
</defs>'''

CREAM="#FBF7EF"; SNOW="#F6FAFA"; SH="#B9D3DB"; SH2="#CFE3E8"; MUZ="#F0E7D6"; NOSE="#2A3A40"; PINK="#F2C2BE"

def bear_head(x=0,y=0,s=1,mood="calm",rot=0):
    if mood=="sleepy":
        eyes='<path d="M36 55q6 4 12 0M72 55q6 4 12 0" fill="none" stroke="#2A3A40" stroke-width="2.4" stroke-linecap="round"/>'
    elif mood=="curious":
        eyes='<ellipse cx="45" cy="53" rx="3" ry="3.5" fill="#2A3A40"/><ellipse cx="81" cy="53" rx="3" ry="3.5" fill="#2A3A40"/>'
    else:
        eyes='<ellipse cx="42" cy="54" rx="3" ry="3.4" fill="#2A3A40"/><ellipse cx="78" cy="54" rx="3" ry="3.4" fill="#2A3A40"/>'
    return f'''<g transform="translate({x},{y}) rotate({rot} 60 60) scale({s})" filter="url(#gouache)">
<path d="M22 34C14 22 24 10 37 14C46 17 47 27 43 33Z" fill="{CREAM}"/><path d="M27 30C24 24 29 19 34 21C38 23 38 28 36 31Z" fill="{PINK}"/>
<path d="M98 34C106 22 96 10 83 14C74 17 73 27 77 33Z" fill="{CREAM}"/><path d="M93 30C96 24 91 19 86 21C82 23 82 28 84 31Z" fill="{PINK}"/>
<path d="M60 18C86 16 106 34 105 60C104 86 84 99 60 99C36 99 15 87 15 60C14 34 34 20 60 18Z" fill="{CREAM}"/>
<path d="M62 99C88 98 106 84 105 60C104 70 96 86 82 90C74 93 66 92 62 99Z" fill="{SH}" opacity=".7"/>
<path d="M15 62C16 82 34 96 56 98C40 92 24 82 15 62Z" fill="{SH2}" opacity=".7"/>
<path d="M60 62C76 61 84 71 82 80C80 90 70 94 60 94C50 94 40 90 38 80C36 71 44 62 60 62Z" fill="{MUZ}"/>
<ellipse cx="34" cy="72" rx="8" ry="5" fill="#F2B8B4" opacity=".35"/><ellipse cx="86" cy="72" rx="8" ry="5" fill="#F2B8B4" opacity=".35"/>
<path d="M49 68C49 63 55 61 60 61C65 61 71 63 71 68C71 74 65 79 60 79C55 79 49 74 49 68Z" fill="{NOSE}"/><ellipse cx="56.5" cy="65.5" rx="3.2" ry="1.6" fill="#7E97A0" opacity=".7"/>
<path d="M60 79V84M60 84C57 88 52 88 50 85M60 84C63 88 68 88 70 85" stroke="{NOSE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>{eyes}</g>'''

def paw_blob(x,y,s=1):
    return f'<g transform="translate({x},{y}) scale({s})" filter="url(#gouache)"><path d="M0 8C0 -2 14 -5 24 0C34 5 34 18 22 21C10 24 0 20 0 8Z" fill="{CREAM}"/><path d="M4 16C10 21 24 22 30 14C30 22 20 26 10 24C6 23 4 20 4 16Z" fill="{SH}" opacity=".7"/></g>'

def bear_side(x=0,y=0,s=1,flip=False,mood="calm"):
    f = f'translate({x+160*s},{y}) scale({-s},{s})' if flip else f'translate({x},{y}) scale({s})'
    eye = '<path d="M28 44q4 3 8 0" fill="none" stroke="#2A3A40" stroke-width="2.2" stroke-linecap="round"/>' if mood=="sleepy" else '<ellipse cx="32" cy="43" rx="2.6" ry="3" fill="#2A3A40"/>'
    return f'''<g transform="{f}" filter="url(#gouache)">
<path d="M56 34C72 26 108 26 128 40C144 51 146 74 132 84C122 91 96 90 56 88C36 87 30 72 34 58C38 46 46 38 56 34Z" fill="{CREAM}"/>
<path d="M60 88C96 91 122 92 132 84C142 76 144 62 140 54C138 74 122 82 96 82C78 82 66 84 60 88Z" fill="{SH}" opacity=".75"/>
<path d="M92 34C104 30 118 32 126 38C112 34 100 36 92 40Z" fill="#fff" opacity=".7"/>
<path d="M38 96C38 86 52 84 60 88C68 92 66 102 54 103C44 104 38 102 38 96Z" fill="{CREAM}"/><path d="M110 96C110 86 124 84 132 88C140 92 138 102 126 103C116 104 110 102 110 96Z" fill="{CREAM}"/>
<path d="M14 54C14 40 26 32 40 34C50 36 56 46 54 58C52 70 40 76 28 74C18 72 14 64 14 54Z" fill="{CREAM}"/>
<path d="M28 34C24 26 30 20 38 22C44 24 44 32 42 36Z" fill="{CREAM}"/><path d="M31 32C30 27 34 25 37 27C39 29 38 32 37 34Z" fill="{PINK}"/>
<path d="M14 56C10 56 8 60 10 63C12 66 18 66 20 62Z" fill="{NOSE}"/><path d="M18 62C26 70 40 68 44 60C40 72 26 76 18 68Z" fill="{SH}" opacity=".7"/>{eye}</g>'''

def snow_specks(pts,color="#fff",op=.9):
    return ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" opacity="{op}"/>' for x,y,r in pts)

def scene(inner,w=342,h=180,radius=24,label="",bg=None):
    return f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{label}" xmlns="http://www.w3.org/2000/svg">{DEFS}{inner}</svg>'

def sky(w,h,top,bot):
    g=uid("sk"); return f'<defs><linearGradient id="{g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#{g})"/>'

def iceberg(x,y,s=1,tone="pale"):
    a,b,c=("#EAF5F7","#CFE6EB","#A9CBD5") if tone=="pale" else ("#F7FBFB","#D8EAEE","#9DC2CE")
    return f'''<g transform="translate({x},{y}) scale({s})" filter="url(#gouache)"><path d="M0 60L18 24L34 34L52 4L74 30L92 22L112 60Z" fill="{a}"/><path d="M52 4L74 30L92 22L112 60L64 60Z" fill="{b}"/><path d="M0 60L18 24L26 60Z" fill="{c}" opacity=".55"/><path d="M6 60H108V72C80 76 36 76 6 72Z" fill="{c}" opacity=".5"/></g>'''

def water(y,w,h,cols):
    out=''; n=len(cols); bh=(h-y)/n
    for i,c in enumerate(cols):
        yy=y+i*bh
        out+=f'<path d="M0 {yy:.1f}Q{w*.25:.1f} {yy-5:.1f} {w*.5:.1f} {yy:.1f}T{w} {yy:.1f}V{h}H0Z" fill="{c}"/>'
    return f'<g filter="url(#brush)">{out}</g>'

def ripple_lines(cx,cy,rxs,color="#E4F6F8",op=.7):
    return ''.join(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{rx*0.24:.1f}" fill="none" stroke="{color}" stroke-width="1.1" opacity="{op*(1-i*0.2):.2f}"/>' for i,rx in enumerate(rxs))

def settlement(x,y,s=1,glow=True):
    g=f'<circle cx="{x+16*s}" cy="{y+10*s}" r="{34*s}" fill="url(#amberglow)"/>' if glow else ''
    return f'''<defs><radialGradient id="amberglow"><stop offset="0" stop-color="#F2A65A" stop-opacity=".32"/><stop offset="1" stop-color="#F2A65A" stop-opacity="0"/></radialGradient></defs>{g}
<g transform="translate({x},{y}) scale({s})" filter="url(#gouache)"><path d="M0 22V12Q0 4 8 4T16 12V22Z" fill="#4E6F7C"/><rect x="18" y="8" width="3.6" height="10" rx="1" fill="#4E6F7C"/><path d="M22 22V15Q22 9 28 9T34 15V22Z" fill="#5C7E8A"/><rect x="5" y="13" width="5" height="5" rx="1.4" fill="#F2A65A"/><rect x="26" y="15" width="4" height="4" rx="1.2" fill="#F2A65A"/></g>'''

def moon(x,y,r=12,col="#F6EBC9"):
    return f'<circle cx="{x}" cy="{y}" r="{r*3}" fill="#F6EBC9" opacity=".08"/><circle cx="{x}" cy="{y}" r="{r*2}" fill="#F6EBC9" opacity=".1"/><g filter="url(#gouache)"><path d="M{x} {y-r}a{r} {r} 0 1 0 {r*.95:.1f} {r*1.45:.1f}A{r*.8:.1f} {r*.8:.1f} 0 0 1 {x} {y-r}z" fill="{col}"/></g>'

def footprints(pts,col="#5F8FA0",op=.5):
    out=''
    for i,(x,y,r) in enumerate(pts):
        o=op*(1-i*0.12)
        out+=f'<g transform="translate({x},{y}) rotate({r}) scale(.36)" opacity="{o:.2f}" filter="url(#gouache)"><g fill="{col}"><ellipse cx="20" cy="30" rx="10" ry="8.5"/><ellipse cx="7" cy="19" rx="4.2" ry="5.4" transform="rotate(-20 7 19)"/><ellipse cx="15" cy="10.5" rx="4.4" ry="5.6"/><ellipse cx="25" cy="10.5" rx="4.4" ry="5.6"/><ellipse cx="33" cy="19" rx="4.2" ry="5.4" transform="rotate(20 33 19)"/></g></g>'
    return out

# ---------------- the seven bear scenes ----------------
def S_floating(w=342,h=180):
    i=(sky(w,h,"#E5F2F4","#F3F8F7")+
       f'<g filter="url(#gouache)" opacity=".9"><path d="M0 100L40 62 74 84 118 50 160 88 210 58 262 90 310 66 342 84V110H0Z" fill="#BCD3DC"/><path d="M118 50L160 88 128 92 100 84Z" fill="#A5C2CE" opacity=".6"/></g>'
       +iceberg(232,44,.62)+settlement(20,92,.9)+
       water(100,w,h,["#8CC9D2","#6FB3C1","#4D96A8","#357B8E","#2A6376"])+
       '<ellipse cx="170" cy="132" rx="62" ry="12" fill="#E46C83" opacity=".16" filter="url(#brush)"/>'+
       bear_head(126,58,.72,"calm")+
       water(118,w,h,["#7DBFCA","#5BA5B6","#3F8A9D","#2C6B7E"]).replace('<g filter','<g opacity=".97" filter')+
       ripple_lines(170,120,[46,66,88,112])+snow_specks([(30,20,1.4),(86,34,1.1),(270,26,1.5),(310,48,1.1)]))
    return scene(i,w,h,label="A polar bear floating peacefully in turquoise water")

def S_peeking(w=342,h=180):
    i=(sky(w,h,"#E9F4F5","#F4F8F8")+
       f'<g filter="url(#gouache)"><path d="M0 120C50 96 110 106 170 98S290 92 342 106V180H0Z" fill="#DCEBEF"/></g>'+
       bear_head(114,20,.98,"curious")+
       '<g filter="url(#gouache)"><path d="M20 120C20 104 40 100 170 100S326 104 326 122V180H20Z" fill="#CFE6EB"/><path d="M20 120C20 108 40 104 170 104S326 108 326 120C326 112 300 108 170 108S20 112 20 120Z" fill="#fff" opacity=".85"/><path d="M20 150C120 158 240 158 326 150V180H20Z" fill="#A9CBD5" opacity=".6"/></g>'+
       paw_blob(122,94,1.2)+paw_blob(190,94,1.2)+snow_specks([(40,30,1.4),(96,52,1.1),(250,26,1.4),(300,60,1.1),(60,80,1)]))
    return scene(i,w,h,label="A polar bear peeking over an ice ledge")

def S_distant(w=342,h=180):
    i=(sky(w,h,"#E3F0F3","#F4F8F8")+
       f'<g filter="url(#gouache)" opacity=".85"><path d="M0 96L52 66 96 86 150 56 206 92 262 70 342 98V116H0Z" fill="#C4D9E1"/></g>'+
       iceberg(52,52,1.15,"bright")+
       water(112,w,h,["#9AD1D9","#78BAC7","#559EB0","#3B8397"])+
       '<ellipse cx="86" cy="164" rx="40" ry="6" fill="#E46C83" opacity=".12"/>'+
       '<g filter="url(#gouache)"><path d="M232 112C232 104 252 100 282 102C312 104 330 108 330 116C330 124 300 128 276 128C250 128 232 122 232 112Z" fill="#F1F8F9"/><path d="M232 118C250 126 300 130 330 118C326 128 300 132 274 132C250 132 234 126 232 118Z" fill="#B9D3DB" opacity=".7"/></g>'+
       bear_side(262,88,.26)+ripple_lines(100,150,[30,46,64],"#E4F6F8",.5)+snow_specks([(24,30,1.3),(300,30,1.4),(180,40,1.1)]))
    return scene(i,w,h,label="A tiny polar bear beside an iceberg")

def S_sleeping(w=342,h=180):
    i=(sky(w,h,"#E7F1F4","#F4F8F8")+
       '<g filter="url(#gouache)"><path d="M0 108C60 84 120 98 190 92S300 84 342 100V180H0Z" fill="#EAF3F5"/><path d="M0 140C80 122 160 132 240 126S320 120 342 128V180H0Z" fill="#fff"/><path d="M0 150C90 142 170 156 250 148S320 146 342 150V180H0Z" fill="#CFE3E8" opacity=".7"/></g>'+
       '<g transform="translate(96,86)" filter="url(#gouache)"><path d="M10 50C4 26 34 10 84 12C130 14 150 32 142 54C136 70 104 76 70 76C34 76 14 70 10 50Z" fill="#FBF7EF"/><path d="M14 62C40 78 110 80 138 62C132 76 100 82 70 82C38 82 18 74 14 62Z" fill="#B9D3DB" opacity=".75"/><path d="M60 14C88 8 122 14 136 30C118 22 92 20 60 24Z" fill="#fff" opacity=".7"/></g>'+
       bear_head(106,80,.5,"sleepy",-8)+
       '<g transform="translate(232,64)" opacity=".5"><path d="M0 8h10l-10 10h10" stroke="#5F8FA0" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 0h7l-7 7h7" stroke="#5F8FA0" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'+
       snow_specks([(30,26,1.4),(78,46,1.1),(270,30,1.5),(316,52,1.1),(140,30,1)]))
    return scene(i,w,h,label="A polar bear sleeping in the snow")

def S_walking(w=342,h=180):
    i=(sky(w,h,"#E6F2F4","#F4F8F8")+
       '<g filter="url(#gouache)" opacity=".8"><path d="M0 92L46 62 90 84 138 54 190 88 246 66 300 90 342 74V104H0Z" fill="#C4D9E1"/></g>'+
       '<g filter="url(#gouache)"><path d="M0 104C70 90 140 100 210 96S310 94 342 100V180H0Z" fill="#F0F7F8"/><path d="M0 138C90 124 170 140 250 130S320 128 342 134V180H0Z" fill="#fff"/><path d="M0 154C100 146 180 160 260 152S320 150 342 156V180H0Z" fill="#CFE3E8" opacity=".7"/></g>'+
       footprints([(40,158,-70),(70,146,-58),(102,138,-50),(136,132,-38),(170,126,-25)],"#5F8FA0",.55)+
       bear_side(196,76,.44)+snow_specks([(30,24,1.4),(88,40,1.1),(250,28,1.5),(318,50,1.1)]))
    return scene(i,w,h,label="A small polar bear walking, leaving footprints in the snow")

def S_looking(w=342,h=180):
    i=(sky(w,h,"#DDEBF0","#F1F6F6")+
       '<g filter="url(#gouache)" opacity=".85"><path d="M0 100L60 60 112 86 170 52 230 84 290 62 342 88V112H0Z" fill="#BCD3DC"/></g>'+
       '<g filter="url(#gouache)"><path d="M0 116C60 100 120 110 190 104S300 100 342 108V180H0Z" fill="#EEF5F7"/><path d="M0 150C90 138 180 152 342 144V180H0Z" fill="#fff"/></g>'+
       settlement(262,98,1.3)+bear_side(40,72,.5,flip=True)+snow_specks([(26,26,1.4),(110,44,1.1),(220,30,1.5),(312,40,1.1)]))
    return scene(i,w,h,label="A polar bear looking toward a distant settlement")

def S_night(w=342,h=180):
    i=(sky(w,h,"#16283A","#2B5666")+moon(268,42,14)+
       snow_specks([(30,26,1.4),(70,54,1),(120,20,1.6),(170,44,1),(214,22,1.3),(312,70,1.2),(52,84,1),(150,74,1.1)],"#F6EBC9",.85)+
       '<g filter="url(#gouache)"><path d="M0 116C70 100 140 110 210 104S310 100 342 108V180H0Z" fill="#8FB1C0"/><path d="M0 146C90 134 180 148 342 140V180H0Z" fill="#B9D3DB"/><path d="M0 162C100 154 200 166 342 160V180H0Z" fill="#DCEBEF" opacity=".8"/></g>'+
       '<ellipse cx="190" cy="150" rx="70" ry="9" fill="#F6EBC9" opacity=".14" filter="url(#brush)"/>'+
       bear_side(150,80,.5,flip=True))
    return scene(i,w,h,label="A polar bear beneath the moon")

# ---------------- header landscape (behind the title, fades out) ----------------
def header_landscape(w=390,h=110):
    i=(sky(w,h,"#E4F1F3","#F4F8F8")+
       '<g filter="url(#gouache)" opacity=".7"><path d="M0 82L40 66 88 76 140 58 196 80 252 62 306 78 358 64 390 72V110H0Z" fill="#CFE2E8"/></g>'+
       iceberg(232,42,.5)+settlement(320,66,.8)+
       '<g filter="url(#gouache)"><path d="M0 96C60 86 140 94 210 90S340 86 390 92V110H0Z" fill="#EEF5F7"/></g>'+
       snow_specks([(44,18,1.3),(150,30,1),(214,14,1.4),(298,26,1.1)])+
       '<rect width="390" height="110" filter="url(#grain)" opacity=".10"/>')
    return scene(i,w,h,label="")

# ---------------- crisp-layer helpers ----------------
WAVE=["M10 0C12 22 8 44 10 66S11.5 90 10 100","M10 0C8 24 12.4 46 10 68S8.6 92 10 100","M10 0C11.4 26 8.4 50 10 72S9 94 10 100"]
def mk(kind):
    g={"circle":'<circle cx="10" cy="10" r="5.2" fill="#fff" stroke="#397F91" stroke-width="2"/>',
     "dashed":'<circle cx="10" cy="10" r="5.2" fill="#fff" stroke="#5B7075" stroke-width="2" stroke-dasharray="2.4 2.4"/>',
     "paw":'<circle cx="10" cy="10" r="10" fill="#397F91"/><g fill="#fff"><ellipse cx="10" cy="12.6" rx="3.4" ry="2.9"/><ellipse cx="5.9" cy="9.2" rx="1.5" ry="1.9"/><ellipse cx="8.6" cy="6.4" rx="1.5" ry="1.9"/><ellipse cx="11.4" cy="6.4" rx="1.5" ry="1.9"/><ellipse cx="14.1" cy="9.2" rx="1.5" ry="1.9"/></g>',
     "flame":'<circle cx="10" cy="10" r="10" fill="#F2A65A"/><path d="M10 3.8c.7 2.3 3.2 3.4 3.2 6.4a3.2 3.2 0 0 1-6.4 0c0-1.3.6-2.2 1.3-2.9.1 1 .7 1.4 1.3 1.4C9.3 7.5 9.2 5.5 10 3.8z" fill="#4A2A06"/>',
     "star":'<circle cx="10" cy="10" r="10" fill="#F2A65A"/><path d="M10 4.2l1.5 3.7 3.9.3-3 2.5 1 3.9L10 12.4l-3.4 2.2 1-3.9-3-2.5 3.9-.3z" fill="#4A2A06"/>'}[kind]
    return f'<svg class="mk" viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{g}</svg>'
def rail(kind=None,v=0,gapline=False):
    line='<path d="M10 0V100" fill="none" stroke="#BFD7DD" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' if gapline else f'<path d="{WAVE[v%3]}" fill="none" stroke="#BFD7DD" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    return f'<div class="tl-rail"><svg class="line" viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{line}</svg>{mk(kind) if kind else ""}</div>'
def row(time,title,meta="",kind="circle",utc="",extra="",v=0):
    u=f'<div class="tl-utc">{utc}</div>' if utc else ""
    m=f'<div class="tl-meta">{meta}</div>' if meta else ""
    return f'<div class="tl-row"><div class="tl-time num">{time}{u}</div>{rail(kind,v)}<div class="tl-body"><div class="tl-title">{title}</div>{m}{extra}</div></div>'
def gap(h,label,add=False,deco=""):
    btn=f'<button class="addtask">{icon("plus",16)}Add task</button>' if add else ""
    return f'<div class="tl-row" style="height:{h}px"><div></div>{rail(gapline=True)}<div class="gap-body"><div class="gap-inner"><span class="gap-free num">{label}</span>{btn}</div>{deco}</div></div>'
def floe(fill="#CDE7EC"):
    return f'<svg class="floe" viewBox="0 0 56 32" width="56" height="32" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M7 3.5Q16 1 27 2.2T49 3.6Q54.6 6 54.2 16Q54.8 26.5 49 28.4Q27 31.4 8 29Q1.6 26.6 2 16Q1.4 6.2 7 3.5Z" fill="{fill}"/></svg>'
def tabs(active):
    out=''
    for n,i in [("Today","cal"),("Timers","timer"),("Events","home"),("Calculator","calc")]:
        on=n==active
        out+=f'<button class="tab{" on" if on else ""}"><span class="pill">{floe() if on else ""}<span style="position:relative;display:flex">{icon(i,24)}</span></span>{n}</button>'
    return f'<div style="position:absolute;left:0;right:0;bottom:0;height:80px;background:#fff;border-top:1px solid #DCE9EC;display:flex;padding:8px 12px">{out}</div>'
def acct(color,name,meta,warn=False):
    return f'<div style="display:flex;align-items:center;gap:10px"><span class="dot" style="background:{color}"></span><span>{name}</span><span style="margin-left:auto;color:{"#F8C98F" if warn else "#CDE7EC"};font-weight:{600 if warn else 500}">{meta}</span></div>'
def header(eyebrow,title,landscape=True):
    hz=''
    if landscape:
        hz=(f'<div style="position:absolute;left:-24px;right:-24px;top:-24px;height:110px;pointer-events:none;overflow:hidden">{header_landscape()}'
            '<div style="position:absolute;left:0;right:0;bottom:0;height:52px;background:linear-gradient(to bottom,rgba(244,248,248,0),#F4F8F8)"></div></div>')
    return f'''<div style="position:relative">{hz}<div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
  <div><div class="eyebrow">{eyebrow}</div><h1 class="title" style="margin-top:4px">{title}</h1></div>
  <button class="iconbtn" aria-label="Settings">{icon("gear")}</button></div></div>'''
def annot(text,arrow=True,style=""):
    a=('<svg width="26" height="20" viewBox="0 0 26 20" fill="none" stroke="#2F6577" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 2C3 9 6 14 22 15M17 10.5L22.5 15 16.5 18.5"/></svg>' if arrow else '')
    return f'<div style="display:flex;align-items:flex-start;gap:4px;margin-top:2px;{style}">{a}<span class="hand" style="margin-top:6px">{text}</span></div>'
def snow_edge(fill="#EDF5F6"):
    return f'<svg viewBox="0 0 390 22" preserveAspectRatio="none" width="390" height="22" style="display:block" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{DEFS}<g filter="url(#gouache)"><path d="M0 22V12C30 4 64 14 100 9S170 2 214 8 300 16 340 8 372 6 390 10V22Z" fill="{fill}"/><path d="M0 22V16C40 10 80 18 130 14S240 8 290 15 360 14 390 16V22Z" fill="#fff" opacity=".7"/></g></svg>'
def page(title,w,h,body):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{CSS}
</helmet>
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''
