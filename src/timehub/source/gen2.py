import sys; sys.path.insert(0,"/tmp/arc")
from gen import bear_peeking, bear_floating, bear_sleeping, bear_alert, bear_celebrating, head, svg, icon, paw, ripples, CREAM, SHADE, MUZ, INK, A1, A2, A3, A4, OUT

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=DM+Sans:wght@500..800&family=Fredoka:wght@500..700&family=Manrope:wght@600..800&family=Nunito+Sans:wght@600..900&display=swap" rel="stylesheet">'
CSS2 = FONTS + """
<style>
body{margin:0;background:#F4F8F8;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;font-weight:450;color:#17272B;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}
h1,h2,h3,p,ul{margin:0;padding:0}
button,input{font-family:inherit}
button{cursor:pointer;border:0}
.disp{font-family:"DM Sans",Inter,-apple-system,sans-serif}
.eyebrow{font-size:13px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#5B7075}
.num{font-variant-numeric:tabular-nums}
.title{font-family:"DM Sans",Inter,sans-serif;font-size:32px;line-height:36px;font-weight:750;letter-spacing:-.6px}
.count{font-family:"DM Sans",Inter,sans-serif;font-size:36px;line-height:42px;font-weight:750;letter-spacing:-.8px;font-variant-numeric:tabular-nums}
.sect{font-family:"DM Sans",Inter,sans-serif;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-.3px}
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
.tab .pill svg.gl{position:relative}
.tab.on{color:#244F5C}
@keyframes ring{from{transform:scale(.72);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes breathe{0%,100%{opacity:.65}50%{opacity:1}}
.glow-breathe{animation:breathe 4.5s ease-in-out infinite}
.ring-once{transform-origin:center;transform-box:fill-box;animation:ring 2.8s ease-out 1 both}
@media (prefers-reduced-motion: reduce){.glow-breathe,.ring-once{animation:none}}
</style>
"""

# ---------- micro-illustration library ----------
def crystal(w=20):
    inner=('<polygon points="20,2 34,16 30,42 20,54 10,42 6,16" fill="#E46C83"/><polygon points="20,2 6,16 20,24" fill="#F29AA9"/>'
           '<polygon points="34,16 30,42 20,24" fill="#C8506A"/><polygon points="6,16 10,42 20,54 20,24" fill="#D95F79"/>')
    return svg("0 0 40 56", inner, w, None, "Fire crystal")

def ArcticRipple(cx,cy,rs,op=.1,w=200,h=200,color="#78C7D5",once=False):
    c=''.join(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="1" opacity="{op}"{" class=ring-once" if (once and i==len(rs)-1) else ""}/>' for i,r in enumerate(rs))
    return f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{c}</svg>'

def SnowDrift(fill="#EDF5F6", w=390, h=14, seed=0):
    d=["M0 14V8C34 2 66 11 104 7s78-7 118-2 92 8 168 1V14Z","M0 14V6c46 6 82-4 128-1s84 8 130 3 84-5 132-1V14Z"][seed%2]
    return f'<svg viewBox="0 0 390 14" preserveAspectRatio="none" width="{w}" height="{h}" style="display:block" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="{d}" fill="{fill}"/></svg>'

def PawTrail(n=3, op=.15, w=20):
    ps=''.join(f'<span style="display:inline-block;margin-left:{i*6}px;transform:rotate({[-12,10,-8,12][i%4]}deg)">{paw("#397F91",op,w)}</span>' for i in range(n))
    return f'<span style="display:inline-flex;align-items:flex-end">{ps}</span>'

def FurnaceGlow(size=120):
    return f'<div class="glow-breathe" style="width:{size}px;height:{size}px;border-radius:50%;background:radial-gradient(circle,rgba(242,166,90,.15),rgba(242,166,90,0) 68%)"></div>'

def ArcticNight(w=32):
    return (f'<svg viewBox="0 0 32 24" width="{w}" height="{int(w*.75)}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
            '<path d="M13 3.5a8.5 8.5 0 1 0 8.6 11.6A7 7 0 0 1 13 3.5z" fill="#397F91" opacity=".55"/>'
            '<circle cx="24" cy="6" r="1.3" fill="#78C7D5"/><circle cx="28.5" cy="12.5" r="1" fill="#78C7D5" opacity=".8"/><circle cx="19" cy="20" r=".9" fill="#78C7D5" opacity=".6"/></svg>')

def IceFloe(w=56,h=32,fill="#CDE7EC"):
    return (f'<svg class="floe" viewBox="0 0 56 32" width="{w}" height="{h}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
            f'<path d="M7 3.5Q16 1 27 2.2T49 3.6Q54.6 6 54.2 16Q54.8 26.5 49 28.4Q27 31.4 8 29Q1.6 26.6 2 16Q1.4 6.2 7 3.5Z" fill="{fill}"/></svg>')

def ArcticHorizon(w=390,h=100):
    flakes=''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity="{o}"/>' for x,y,r,o in [(214,22,1.6,.9),(258,44,1.2,.8),(346,18,1.8,.9),(180,58,1.2,.7)])
    return (f'<svg viewBox="0 0 390 100" width="{w}" height="{h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
            '<path d="M0 78L36 70 92 74 150 62 214 72 276 58 336 68 390 60V100H0Z" fill="#DCEBEF" opacity=".55"/>'
            '<path d="M0 88L60 80 130 86 210 76 300 84 390 74V100H0Z" fill="#E6F1F3" opacity=".8"/>'
            '<g transform="translate(318,60)"><path d="M0 22V12q0-8 8-8t8 8v10z" fill="#BFD7DD" opacity=".9"/><rect x="18" y="6" width="3.6" height="10" rx="1" fill="#BFD7DD"/><rect x="4.5" y="13" width="5" height="5" rx="1.2" fill="#F2A65A" opacity=".9"/></g>'
            f'{flakes}</svg>')

def sleeper(w=40): return bear_sleeping(w)

# ---------- markers (20px, filled so they read on white) ----------
def mk(kind):
    g={
     "circle": '<circle cx="10" cy="10" r="5.2" fill="#fff" stroke="#397F91" stroke-width="2"/>',
     "dashed": '<circle cx="10" cy="10" r="5.2" fill="#fff" stroke="#5B7075" stroke-width="2" stroke-dasharray="2.4 2.4"/>',
     "paw":    '<circle cx="10" cy="10" r="10" fill="#397F91"/><g fill="#fff"><ellipse cx="10" cy="12.6" rx="3.4" ry="2.9"/><ellipse cx="5.9" cy="9.2" rx="1.5" ry="1.9"/><ellipse cx="8.6" cy="6.4" rx="1.5" ry="1.9"/><ellipse cx="11.4" cy="6.4" rx="1.5" ry="1.9"/><ellipse cx="14.1" cy="9.2" rx="1.5" ry="1.9"/></g>',
     "flame":  '<circle cx="10" cy="10" r="10" fill="#F2A65A"/><path d="M10 3.8c.7 2.3 3.2 3.4 3.2 6.4a3.2 3.2 0 0 1-6.4 0c0-1.3.6-2.2 1.3-2.9.1 1 .7 1.4 1.3 1.4C9.3 7.5 9.2 5.5 10 3.8z" fill="#4A2A06"/>',
     "star":   '<circle cx="10" cy="10" r="10" fill="#F2A65A"/><path d="M10 4.2l1.5 3.7 3.9.3-3 2.5 1 3.9L10 12.4l-3.4 2.2 1-3.9-3-2.5 3.9-.3z" fill="#4A2A06"/>',
     "crystal":'<circle cx="10" cy="10" r="10" fill="#FBECEF"/><g transform="translate(5.4,3.2) scale(.23)"><polygon points="20,2 34,16 30,42 20,54 10,42 6,16" fill="#E46C83"/><polygon points="20,2 6,16 20,24" fill="#F29AA9"/><polygon points="34,16 30,42 20,24" fill="#C8506A"/></g>',
    }[kind]
    return f'<svg class="mk" viewBox="0 0 20 20" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{g}</svg>'

WAVE=["M10 0C12 22 8 44 10 66S11.5 90 10 100","M10 0C8 24 12.4 46 10 68S8.6 92 10 100","M10 0C11.4 26 8.4 50 10 72S9 94 10 100"]
def rail(kind=None, v=0, gapline=False):
    if gapline:
        line='<path d="M10 0V100" fill="none" stroke="#BFD7DD" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    else:
        line=f'<path d="{WAVE[v%3]}" fill="none" stroke="#BFD7DD" stroke-width="1.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    return f'<div class="tl-rail"><svg class="line" viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{line}</svg>{mk(kind) if kind else ""}</div>'

def row(time,title,meta="",kind="circle",utc="",extra="",v=0):
    u=f'<div class="tl-utc">{utc}</div>' if utc else ""
    m=f'<div class="tl-meta">{meta}</div>' if meta else ""
    return f'<div class="tl-row"><div class="tl-time num">{time}{u}</div>{rail(kind,v)}<div class="tl-body"><div class="tl-title">{title}</div>{m}{extra}</div></div>'

def gap(h,label,add=False,deco=""):
    btn=f'<button class="addtask">{icon("plus",16)}Add task</button>' if add else ""
    return f'<div class="tl-row" style="height:{h}px"><div></div>{rail(gapline=True)}<div class="gap-body"><div class="gap-inner"><span class="gap-free num">{label}</span>{btn}</div>{deco}</div></div>'

def tabs(active):
    items=[("Today","cal"),("Timers","timer"),("Events","home"),("Calculator","calc")]
    out=''
    for n,i in items:
        on=n==active
        out+=f'<button class="tab{" on" if on else ""}"><span class="pill">{IceFloe() if on else ""}<span class="gl" style="position:relative;display:flex">{icon(i,24)}</span></span>{n}</button>'
    return f'<div style="position:absolute;left:0;right:0;bottom:0;height:80px;background:#fff;border-top:1px solid #DCE9EC;display:flex;padding:8px 12px">{out}</div>'

def acct(color,name,meta,warn=False):
    return f'<div style="display:flex;align-items:center;gap:10px"><span class="dot" style="background:{color}"></span><span>{name}</span><span style="margin-left:auto;color:{"#F8C98F" if warn else "#CDE7EC"};font-weight:{600 if warn else 500}">{meta}</span></div>'

def header(eyebrow,title,horizon=False):
    hz=''
    if horizon:
        hz=(f'<div style="position:absolute;left:-24px;right:-24px;top:-24px;height:100px;pointer-events:none;overflow:hidden">{ArcticHorizon(390,100)}'
            '<div style="position:absolute;left:0;right:0;bottom:0;height:46px;background:linear-gradient(to bottom,rgba(244,248,248,0),#F4F8F8)"></div></div>')
    return f'''<div style="position:relative">{hz}<div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
  <div><div class="eyebrow">{eyebrow}</div><h1 class="title" style="margin-top:4px">{title}</h1></div>
  <button class="iconbtn" aria-label="Settings">{icon("gear")}</button></div></div>'''

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
{CSS2}
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

# ---------- bear for the dark hero: swim, water tinted to the card ----------
def bear_swim_dark(w=84):
    rings=''.join(f'<ellipse cx="70" cy="82" rx="{rx}" ry="{ry}" fill="none" stroke="#78C7D5" stroke-width="1.2" opacity="{o}"/>' for rx,ry,o in [(64,14,.30),(50,10,.42),(38,7,.6)])
    inner=(f'<g transform="translate(15,4) scale(.9)">{head()}</g><path d="M0 80q17-6 35 0t35 0 35 0 35 0v34H0z" fill="#2D6172"/>{rings}')
    return svg("0 0 140 112",inner,w,None,"Polar bear swimming")

# ---------- Bear Trap hero ----------
def hero(scale_note=False):
    rp=ArcticRipple(130,130,[34,60,86,112,138],.10,260,260,"#78C7D5",once=True)
    return f'''<div style="position:relative;overflow:hidden;background:#244F5C;border-radius:24px;padding:24px;color:#fff;display:flex;flex-direction:column;gap:20px">
  <div style="position:absolute;right:-96px;top:-96px;width:260px;height:260px;pointer-events:none">{rp}</div>
  <div style="position:absolute;right:-6px;top:8px;width:84px;pointer-events:none">{bear_swim_dark(84)}</div>
  <div style="position:relative;padding-right:84px">
    <span class="eyebrow" style="color:#78C7D5;display:inline-flex;align-items:center;gap:8px">{paw("#78C7D5",1,18)}Bear Trap 1</span>
    <div class="count" style="margin-top:8px">in 1h 29m</div>
    <div class="num" style="margin-top:4px;font-size:14px;line-height:20px;font-weight:500;color:#CDE7EC">7:30 PM · 07:30 UTC</div>
  </div>
  <div style="position:relative;display:flex;flex-direction:column;gap:8px;font-size:15px;line-height:21px;font-weight:500">
    {acct(A1,"Caroline","Minister set")}{acct(A2,"Farm 1","Needs a minister",True)}{acct(A3,"Farm 2","Needs a minister",True)}</div>
  <button class="btn" style="position:relative;width:100%;background:#78C7D5;color:#17272B">Book ministers · 2 accounts</button>
</div>'''

# ================= BOARD 1: TODAY =================
snowflake = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#397F91" stroke-width="1.6" stroke-linecap="round" opacity=".4" aria-hidden="true"><path d="M12 2v20M4 7l16 10M20 7L4 17M9 4l3 2 3-2M9 20l3-2 3 2"/></svg>'
sleep_deco = f'<div style="position:absolute;right:0;top:50%;transform:translateY(-50%);opacity:.3;width:44px">{bear_sleeping(44)}</div>'
today = f'''<div style="position:relative;width:390px;height:2400px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:32px">
  <div style="display:flex;flex-direction:column;gap:16px">
    {header("Thursday 24 Sep · Auckland","Today",True)}
    <div class="num" style="position:relative;display:flex;gap:20px;font-size:14px;line-height:20px;font-weight:500;color:#5B7075">
      <span><b style="color:#17272B;font-weight:600">5:30 PM</b> local</span><span><b style="color:#17272B;font-weight:600">05:30</b> UTC</span><span><b style="color:#17272B;font-weight:600">8</b> to do</span></div>
  </div>

  {hero()}

  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:center;gap:8px"><h2 class="sect">Needs you</h2><span class="chip num" style="background:#CDE7EC;font-weight:700">3</span></div>
    <div class="card" style="padding:4px 20px">
      <div class="rowline"><span class="ic">{icon("store")}</span><div style="flex:1;min-width:0"><div class="t16">Storehouse stamina +120</div><div class="t14">Ready to claim · 4 accounts</div></div><button class="btn-sec">Claimed</button></div>
      <div class="rowline"><span class="ic">{icon("bolt")}</span><div style="flex:1;min-width:0"><div class="t16">Farm 1 hits 200 in 30m</div><div class="t14">Spend some before it stops</div></div><button class="btn-sec">Update</button></div>
      <div class="rowline"><span class="ic warm" style="box-shadow:0 0 20px rgba(242,166,90,.12)">{icon("flame")}</span><div style="flex:1;min-width:0"><div class="t16">Camps idle · Farm 3</div><div class="t14">A full batch ends 11:50 PM</div></div><button class="btn-sec" style="background:#FFF4E6;color:#6B3F0C">Start</button></div>
    </div>
  </div>

  <!-- snowdrift transition into the schedule band -->
  <div style="margin:0 -24px;margin-top:-8px">
    {SnowDrift("#EDF5F6")}
    <div style="background:#EDF5F6;padding:8px 24px 32px;display:flex;flex-direction:column;gap:16px">
      <div><h2 class="sect">Schedule</h2><p style="margin-top:4px;font-size:15px;line-height:21px;font-weight:450;color:#5B7075">Your day at a glance: upcoming events, free time, and personal tasks.</p></div>
      <div class="card" style="padding:12px 20px 20px">
        <div style="display:flex;align-items:center;gap:8px;min-height:44px;color:#5B7075;font-size:14px;font-weight:600">{snowflake}11 completed · Show</div>
        <div style="padding:8px 0 16px">
          <div class="eyebrow" style="margin-bottom:8px">Still to do</div>
          <div style="display:flex;align-items:center;gap:8px">
            <button aria-label="Mark Laundry done" style="width:44px;height:44px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="width:26px;height:26px;border-radius:50%;border:2px solid #397F91;display:block"></span></button>
            <div style="flex:1;min-width:0"><div class="t16">Laundry · 30m</div><div class="t14">Planned 2:00 PM</div></div>
            <button class="btn-sec" style="font-size:14px;padding:0 14px">Move to 8:00 PM</button></div>
        </div>
        <div class="now"><span class="p num">NOW · 5:30 PM</span><span class="l"></span></div>
        {gap(12,"20m free")}
        {row("5:50 PM","Stamina reaches 200",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A2}"></span>Farm 1 · spend some first</span>',"circle","05:50 UTC",v=0)}
        {gap(26,"1h 10m free",True)}
        {row("7:00 PM","Minister of Education",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A1}"></span>Caroline · 30 min</span>',"star","07:00 UTC",'<div style="margin-top:8px;font-size:14px;line-height:20px;font-weight:600;color:#8A5210">+50% speed · +200 capacity</div>',v=1)}
        {gap(16,"30m free")}
        {row("7:30 PM","Bear Trap 1 begins","2 accounts still need a minister","paw","07:30 UTC",v=2)}
        <div class="tl-row"><div class="tl-time num" style="padding-top:10px">8:00 PM</div>{rail("dashed",0)}
          <div style="padding:8px 0"><div style="min-height:56px;border-radius:14px;background:#E8F3F5;padding:8px 12px;display:flex;align-items:center;gap:8px">
            <button aria-label="Mark Make dinner done" style="width:44px;height:44px;margin:-8px 0 -8px -12px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="width:26px;height:26px;border-radius:50%;border:2px solid #397F91;display:block"></span></button>
            <div><div class="t16">Make dinner</div><div class="t14">8:00–8:30 PM · 30m</div></div></div></div></div>
        {gap(52,"2h 50m free",True,sleep_deco)}
        {row("11:20 PM","All camps finish",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A2}"></span>Farm 1 · Infantry, Lancer, Marksman</span>',"flame","11:20 UTC",v=1)}
        {gap(12,"20m free")}
        {row("11:40 PM","[Fire Crystal event]","Placeholder · rare reward","crystal","11:40 UTC",v=2)}
        <div style="border-top:1px solid #DCE9EC;margin-top:8px;padding-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div class="eyebrow">After midnight</div>{ArcticNight(32)}</div>
          <div style="display:flex;justify-content:space-between;font-size:15px;line-height:21px;font-weight:500"><span>Storehouse stamina +120</span><span class="num" style="color:#5B7075">12:00 AM</span></div>
          <div style="display:flex;justify-content:space-between;font-size:15px;line-height:21px;font-weight:500;margin-top:8px"><span>Trek supplies +10</span><span class="num" style="color:#5B7075">4:00 AM</span></div></div>
      </div>
    </div>
  </div>
  {tabs("Today")}
</div>'''

# ================= BOARD 2: TIMERS (warmth) =================
def secrow(ic,warm,title,sum_,badge="",act=False):
    b=f'<span style="height:24px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;background:{"#FFF4E6;color:#6B3F0C" if act else "#E8F3F5;color:#244F5C"}">{badge}</span>' if badge else ""
    return f'''<button style="display:flex;align-items:center;gap:16px;padding:16px 20px;min-height:88px;background:none;width:100%;text-align:left;color:inherit;border-top:1px solid #DCE9EC"><span class="ic{" warm" if warm else ""}">{icon(ic)}</span>
<span style="flex:1;min-width:0"><span style="display:flex;align-items:center;gap:8px"><span class="disp" style="font-size:18px;line-height:24px;font-weight:700">{title}</span>{b}</span><span style="display:block;font-size:15px;line-height:21px;font-weight:450;color:#5B7075;margin-top:2px">{sum_}</span></span>{icon("chev",20)}</button>'''
B=lambda t:f"<b style='color:#17272B;font-weight:600'>{t}</b>"
timers=f'''<div style="position:relative;width:390px;height:1140px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:24px">
  {header("4 accounts","Timers",True)}
  <div style="display:flex;gap:8px;margin:0 -24px;padding:0 24px;overflow:hidden">
    <button class="seg on">All accounts</button><button class="seg"><span class="dot" style="background:{A1}"></span>Caroline</button><button class="seg"><span class="dot" style="background:{A2}"></span>Farm 1</button><button class="seg"><span class="dot" style="background:{A3}"></span>Farm 2</button></div>
  <div style="position:relative;overflow:hidden;border-radius:24px;padding:24px;border:1px solid #F3DDBF;background:#FFF4E6;display:flex;flex-direction:column;gap:16px">
    <div class="glow-breathe" style="position:absolute;left:-40px;bottom:-70px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(242,166,90,.15),rgba(242,166,90,0) 68%);pointer-events:none"></div>
    <div style="position:relative;display:flex;justify-content:space-between;align-items:center"><span class="eyebrow" style="color:#8A5210;display:inline-flex;align-items:center;gap:8px">{icon("flame",18)}Training · finishes next</span>
      <span style="display:inline-flex;align-items:center;gap:8px;font-size:14px;line-height:20px;font-weight:500;color:#5B7075"><span class="dot" style="background:{A3}"></span>Farm 2</span></div>
    <div style="position:relative"><div class="disp" style="font-size:22px;line-height:28px;font-weight:700">All camps</div>
      <div class="count" style="color:#244F5C;margin-top:4px">02:08:59</div>
      <div class="num" style="font-size:15px;line-height:21px;font-weight:500;color:#5B7075;margin-top:4px">Finishes 7:39 PM · 07:39 UTC</div></div>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    {secrow("bolt",False,"Chief stamina",B("Farm 1")+" hits 200 in 20m","Action",True)}
    {secrow("flask",False,"Tundra Trek","Next claim "+B("8:00 PM"))}
    {secrow("flame",True,"Training camps","Next "+B("02:08:59")+" · "+B("3 idle"),"6",True)}
    {secrow("flask",False,"Research","Next "+B("Dawn Academy")+" · "+B("03:56:59"),"2")}
    {secrow("heart",False,"Contributions",B("3 full")+" · next +1 in "+B("09:59"),"3 full",True)}
  </div>
  <button class="btn" style="width:100%;background:#244F5C;color:#fff">Spend all · 3 full accounts</button>
  {tabs("Timers")}
</div>'''

# ================= BOARD 3: DETAIL (closeups) =================
zoom=lambda inner,w,h,s: f'<div style="width:{w*s}px;height:{h*s}px;overflow:hidden"><div style="width:{w}px;transform:scale({s});transform-origin:0 0">{inner}</div></div>'
markers_legend=''.join(f'<div style="display:flex;align-items:center;gap:16px;padding:10px 0;border-top:1px solid #DCE9EC"><div style="position:relative;width:40px;height:40px"><div style="transform:scale(2);transform-origin:0 0;width:20px;height:20px;position:relative">{mk(k).replace("class=\"mk\"","class=\"mk\" style=\"left:0;top:0\"")}</div></div><div><b style="display:block;font-size:15px;line-height:21px;font-weight:600">{n}</b><span class="t14">{u}</span></div></div>' for k,n,u in [("paw","Paw","Bear Trap"),("flame","Flame","Furnace, training running"),("star","Spark","Minister · active boost"),("crystal","Crystal","Fire crystal events"),("circle","Circle","Everything else"),("dashed","Dashed circle","Personal task")])
detail=f'''<div style="width:1240px;height:1180px;background:#F4F8F8;padding:48px;display:flex;flex-direction:column;gap:40px">
  <div><div class="eyebrow">Time Hub</div><h1 class="title" style="margin-top:4px;font-size:36px;line-height:42px">Identity details</h1>
    <p style="margin-top:8px;font-size:16px;line-height:23px;color:#5B7075;max-width:680px">Close-ups at 1.5×. Everything here is CSS and inline SVG; nothing is a bitmap.</p></div>
  <div style="display:grid;grid-template-columns:585px minmax(0,1fr);gap:64px;align-items:start">
    <div><h2 class="sect" style="margin-bottom:16px">Bear Trap hero</h2>{zoom(hero(),342,330,1.5)}</div>
    <div style="display:flex;flex-direction:column;gap:32px">
      <div class="card"><h2 class="sect" style="margin-bottom:8px">Timeline markers</h2>{markers_legend}</div>
      <div class="card" style="display:flex;gap:32px;align-items:center"><div>
        <h2 class="sect" style="margin-bottom:8px">Ice-floe tab</h2><p class="t14" style="max-width:280px">Same 56×32 footprint as a pill; edges wander 2–4px. Touch target stays 44+.</p></div>
        <div style="display:flex;gap:24px;align-items:center;transform:scale(1.5);transform-origin:0 50%;margin-left:16px">
          <div class="tab on" style="height:auto"><span class="pill">{IceFloe()}<span class="gl" style="position:relative;display:flex">{icon("cal",24)}</span></span>Today</div>
          <div class="tab" style="height:auto"><span class="pill"><span class="gl" style="position:relative;display:flex">{icon("timer",24)}</span></span>Timers</div></div></div>
    </div>
  </div>
</div>'''

# ================= BOARD 4: FONT TEST =================
FONT_LINK='<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500..700&family=Manrope:wght@600..800&family=Nunito+Sans:wght@600..900&display=swap" rel="stylesheet">'
def fcol(name,fam,note,pick=False):
    b='<span style="height:24px;padding:0 10px;border-radius:999px;background:#244F5C;color:#fff;font-size:13px;font-weight:700;display:inline-flex;align-items:center">Pick</span>' if pick else ''
    return f'''<div class="card" style="display:flex;flex-direction:column;gap:16px;{'border:2px solid #244F5C;' if pick else ''}">
<div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">{name}</span>{b}</div>
<div style="font-family:{fam};font-size:32px;line-height:36px;font-weight:750;letter-spacing:-.6px">Today</div>
<div class="num" style="font-family:{fam};font-size:36px;line-height:42px;font-weight:750;letter-spacing:-.8px;font-variant-numeric:tabular-nums">in 1h 29m</div>
<div class="num" style="font-family:{fam};font-size:36px;line-height:42px;font-weight:750;letter-spacing:-.8px;font-variant-numeric:tabular-nums;color:#244F5C">02:08:59</div>
<div style="font-family:{fam};font-size:24px;line-height:30px;font-weight:700">Needs you · Schedule</div>
<div style="font-size:16px;line-height:23px;font-weight:450;color:#5B7075">Body stays Inter. Your day at a glance: upcoming events, free time, and personal tasks.</div>
<div style="font-size:14px;line-height:20px;font-weight:500;color:#5B7075">{note}</div></div>'''
fonts=f'''<div style="width:1240px;height:820px;background:#F4F8F8;padding:48px;display:flex;flex-direction:column;gap:32px">
  <div><div class="eyebrow">Time Hub</div><h1 class="title" style="margin-top:4px;font-size:36px;line-height:42px">Display type test</h1>
    <p style="margin-top:8px;font-size:16px;line-height:23px;color:#5B7075;max-width:720px">Same sizes, weights and tracking in each face. Body copy and controls stay Inter.</p></div>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px">
    {fcol("Fredoka · current",'Fredoka,sans-serif',"Very round, a little playful; reads childish at 36px.")}
    {fcol("Nunito Sans",'"Nunito Sans",sans-serif',"Warm, but terminals are barely soft; close to the body face.")}
    {fcol("Manrope",'Manrope,sans-serif',"Crisp and technical; the tightest numerals, least friendly.")}
    {fcol("DM Sans",'"DM Sans",sans-serif',"Soft geometric bowls, friendly, steady tabular numerals.",True)}
  </div>
</div>'''

# ================= BOARD 5: LIBRARY =================
def lib(name,props,art,use,bg="#E8F3F5",h=140):
    return f'''<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
<div style="height:{h}px;border-radius:16px;background:{bg};display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">{art}</div>
<div><code style="display:block;font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:18px;font-weight:600;color:#244F5C">&lt;{name}{(' '+props) if props else ''} /&gt;</code><div class="t14" style="margin-top:4px">{use}</div></div></div>'''
horizon_demo=f'<div style="position:absolute;inset:0;background:#F4F8F8"></div><div style="position:absolute;left:0;right:0;bottom:0;height:100px">{ArcticHorizon(390,100)}<div style="position:absolute;left:0;right:0;bottom:0;height:46px;background:linear-gradient(to bottom,rgba(244,248,248,0),#F4F8F8)"></div></div><div style="position:absolute;left:20px;top:18px;font-size:24px;font-weight:750;letter-spacing:-.6px" class="disp">Today</div>'
drift_demo=f'<div style="width:100%;align-self:flex-end">{SnowDrift("#EDF5F6",330,14)}<div style="height:60px;background:#EDF5F6"></div></div>'
lib_grid=''.join([
 lib("PolarBear","variant=\"peek\"",bear_peeking(110),"Onboarding and first-run hints."),
 lib("PolarBear","variant=\"swim\"",bear_floating(130),"Bear Trap hero; the dark-card tint is a prop."),
 lib("PolarBear","variant=\"sleep\"",bear_sleeping(170),"Quiet states; tiny (24–40px, 15–30%) in long gaps."),
 lib("PolarBear","variant=\"alert\"",bear_alert(120),"Rare contextual hint. Never panicked."),
 lib("PolarBear","variant=\"celebrate\"",bear_celebrating(120),"Success, kept small and rare."),
 lib("ArcticRipple","rings={5} once",ArcticRipple(130,70,[26,44,62,80,98],.35,260,140,"#397F91"),"1px, 8–12% on dark. Expands once when Bear Trap is imminent; clipped by the card."),
 lib("SnowDrift","seed={0}",drift_demo,"8–16px contour between major sections. Colour difference barely there."),
 lib("PawTrail","n={3}",PawTrail(3,.3,30),"2–4 prints, 8–15% (shown stronger). Never bullets."),
 lib("FireCrystal","size={20|32|48}",'<div style="display:flex;gap:16px;align-items:flex-end">'+crystal(22)+crystal(34)+crystal(48)+'</div>',"Coral #E46C83 · facet #F29AA9 · pale #FBECEF. Flat facets, no gloss.","#FBECEF"),
 lib("FurnaceGlow","breathe",'<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#FFF4E6"><div style="position:absolute">'+FurnaceGlow(220)+'</div><span style="position:relative;font-size:15px;font-weight:600;color:#6B3F0C">Training running</span></div>',"#F2A65A at 15%. 4.5s slow breathe; off for reduced motion.","#FFF4E6"),
 lib("ArcticHorizon","",horizon_demo,"Behind the page header only. ≤100px, fades into the page.","#F4F8F8"),
 lib("IceFloe","",'<div style="display:flex;gap:20px;transform:scale(1.6)"><div style="position:relative;width:56px;height:32px">'+IceFloe()+'</div></div>',"Active tab shape. 2–4px wander, same footprint as a pill."),
 lib("ArcticNight","",ArcticNight(96),"After midnight only. Crescent and 1–3 stars, ≤32px.","#EAF3F5"),
])
library=f'''<div style="width:1240px;height:1860px;background:#F4F8F8;padding:48px;display:flex;flex-direction:column;gap:32px">
  <div><div class="eyebrow">Time Hub</div><h1 class="title" style="margin-top:4px;font-size:36px;line-height:42px">Micro-illustration library</h1>
    <p style="margin-top:8px;font-size:16px;line-height:23px;color:#5B7075;max-width:720px">Eight reusable pieces, inline SVG/CSS. Rule of thumb: one noticeable flourish plus one to three micro-details per viewport.</p></div>
  <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px">{lib_grid}</div>
  <div class="card" style="background:#E8F3F5;border-color:#CDE7EC;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px">
    <div><h2 class="disp" style="font-size:18px;line-height:24px;font-weight:700">Motion, all optional</h2>
      <p style="margin-top:8px;font-size:15px;line-height:21px;color:#17272B">Ripple: expands once (2.8s) when Bear Trap is imminent. Furnace glow: 4.5s breathe while training or a boost is active. Bear blink: rare. Never snow, never the timeline, never more than one card at a time. Everything stops under <code style="font-family:ui-monospace,Menlo,monospace">prefers-reduced-motion</code>.</p></div>
    <div><h2 class="disp" style="font-size:18px;line-height:24px;font-weight:700">The Time Hub test</h2>
      <p style="margin-top:8px;font-size:15px;line-height:21px;color:#17272B">Cover the name: could this be any productivity app? If yes, it is too generic. Does the theme slow down reading the schedule, timers or actions? If yes, it is too strong.</p></div>
  </div>
</div>'''

files={
 "IdToday.dc.html":page("Today · Identity",390,2400,today),
 "IdTimers.dc.html":page("Timers · Identity",390,1140,timers),
 "IdDetail.dc.html":page("Identity details",1240,1180,detail),
 "IdFonts.dc.html":page("Display type test",1240,820,fonts),
 "IdLibrary.dc.html":page("Micro-illustration library",1240,1860,library),
}
for n,c in files.items():
    open(OUT+n,"w").write(c); print(n,len(c))
