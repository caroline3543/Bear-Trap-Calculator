import os
OUT="/mnt/user-data/outputs/artifacts/a8550826-a9b2-410e-be43-15fa744c396c/project/"

# ---------- shared CSS (Arctic tokens; secondary text darkened for 4.5:1) ----------
CSS = """
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#F4F8F8;font-family:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",sans-serif;color:#17272B;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}
h1,h2,h3,p,ul{margin:0;padding:0}
button,input{font-family:inherit}
button{cursor:pointer;border:0}
.eyebrow{font-size:13px;line-height:18px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#5B7075}
.num{font-variant-numeric:tabular-nums}
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
.ic.warm{background:#FDF1E3;color:#8A5210}
.t16{font-size:16px;line-height:23px;font-weight:600}
.t14{font-size:14px;line-height:20px;font-weight:500;color:#5B7075}
.tl-row{display:grid;grid-template-columns:76px 20px 1fr;column-gap:8px;position:relative}
.tl-time{padding:14px 0;font-size:16px;line-height:23px;font-weight:600}
.tl-utc{font-size:14px;line-height:20px;font-weight:500;color:#5B7075}
.tl-rail{position:relative;align-self:stretch}
.tl-rail::before{content:"";position:absolute;top:0;bottom:0;left:9px;width:2px;background:#DCE9EC}
.tl-dot{position:absolute;left:4px;top:20px;width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid #397F91;z-index:1}
.tl-dot.warm{border-color:#F2A65A;background:#F2A65A}
.tl-body{padding:14px 0}
.tl-title{font-size:16px;line-height:23px;font-weight:600}
.tl-meta{font-size:14px;line-height:20px;font-weight:500;color:#5B7075;margin-top:2px}
.gap .tl-rail::before{background:none;width:0;border-left:2px dashed #BFD7DD}
.gap-body{position:relative}
.gap-inner{position:absolute;left:0;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:12px;height:44px;white-space:nowrap}
.gap-free{font-size:14px;line-height:20px;font-weight:600;color:#244F5C}
.addtask{height:44px;padding:0 14px;border-radius:14px;background:#E8F3F5;color:#244F5C;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:6px}
.now{display:flex;align-items:center;gap:12px;padding:8px 0 4px}
.now span.p{height:28px;padding:0 12px;border-radius:999px;background:#CDE7EC;color:#244F5C;font-size:13px;line-height:28px;font-weight:700;letter-spacing:1.4px}
.now span.l{flex:1;height:2px;background:#78C7D5}
.tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;color:#5B7075;font-size:13px;font-weight:600;padding:8px 0;height:64px;justify-content:center}
.tab .pill{width:56px;height:32px;border-radius:999px;display:flex;align-items:center;justify-content:center}
.tab.on{color:#244F5C}
.tab.on .pill{background:#CDE7EC}
</style>
"""

# ---------- illustration parts ----------
CREAM="#FBF8F1"; SHADE="#CDE7EC"; MUZ="#EFE9DC"; INK="#22343A"
def head(eye_dx=0, ear_dy=0, eyes="dot", smile=False, r=3.8):
    ears = f'<circle cx="31" cy="{33+ear_dy}" r="15" fill="{CREAM}"/><circle cx="31" cy="{33+ear_dy}" r="7.5" fill="{SHADE}"/><circle cx="89" cy="{33+ear_dy}" r="15" fill="{CREAM}"/><circle cx="89" cy="{33+ear_dy}" r="7.5" fill="{SHADE}"/>'
    if eyes=="dot":
        e = f'<circle cx="{43+eye_dx}" cy="58" r="{r}" fill="{INK}"/><circle cx="{77+eye_dx}" cy="58" r="{r}" fill="{INK}"/>'
        if r>4: e += f'<circle cx="{44.5+eye_dx}" cy="56.5" r="1.3" fill="#fff"/><circle cx="{78.5+eye_dx}" cy="56.5" r="1.3" fill="#fff"/>'
    elif eyes=="happy":
        e = f'<path d="M36 61q6-7 12 0M72 61q6-7 12 0" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
    else:
        e = f'<path d="M37 59q6 5 12 0M71 59q6 5 12 0" fill="none" stroke="{INK}" stroke-width="2.6" stroke-linecap="round"/>'
    mouth = f'<path d="M60 77.5v4M60 81.5q-5 4.5-9.5 1M60 81.5q5 4.5 9.5 1" fill="none" stroke="{INK}" stroke-width="1.7" stroke-linecap="round"/>'
    if smile: mouth = f'<path d="M60 77.5v3M45 83q15 15 30 0" fill="none" stroke="{INK}" stroke-width="1.9" stroke-linecap="round"/>'
    return (f'<ellipse cx="60" cy="70" rx="41" ry="37" fill="{SHADE}"/>{ears}<ellipse cx="60" cy="66" rx="41" ry="37" fill="{CREAM}"/>'
            f'<ellipse cx="60" cy="79" rx="18" ry="13.5" fill="{MUZ}"/><ellipse cx="60" cy="73" rx="6.2" ry="4.6" fill="{INK}"/>{mouth}{e}')

def svg(vb, inner, w=None, h=None, label=""):
    a = f' width="{w}"' if w else ""
    b = f' height="{h}"' if h else ""
    return f'<svg viewBox="{vb}"{a}{b} role="img" aria-label="{label}" xmlns="http://www.w3.org/2000/svg">{inner}</svg>'

def bear_peeking(w=None):
    inner = (f'<g transform="translate(0,-14)">{head()}</g>'
             f'<path d="M0 84q0-8 8-8h104q8 0 8 8v30H0z" fill="{SHADE}"/><path d="M6 78h108" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>'
             f'<ellipse cx="38" cy="76" rx="12" ry="7.5" fill="{CREAM}"/><ellipse cx="82" cy="76" rx="12" ry="7.5" fill="{CREAM}"/>')
    return svg("0 0 120 112", inner, w, None, "Polar bear peeking over an ice ledge")

def bear_floating(w=None):
    rings = ''.join(f'<ellipse cx="70" cy="82" rx="{rx}" ry="{ry}" fill="none" stroke="#78C7D5" stroke-width="1.2" opacity="{o}"/>' for rx,ry,o in [(64,14,.35),(50,10,.5),(38,7,.7)])
    inner = (f'<g transform="translate(15,4) scale(.9)">{head()}</g>'
             f'<path d="M0 80q17-6 35 0t35 0 35 0 35 0v34H0z" fill="{SHADE}" opacity=".95"/>{rings}')
    return svg("0 0 140 112", inner, w, None, "Polar bear floating in icy water")

def bear_sleeping(w=None):
    inner = (f'<ellipse cx="112" cy="112" rx="98" ry="9" fill="{SHADE}" opacity=".7"/>'
             f'<ellipse cx="128" cy="88" rx="72" ry="33" fill="{SHADE}"/><ellipse cx="128" cy="84" rx="72" ry="33" fill="{CREAM}"/>'
             f'<ellipse cx="86" cy="106" rx="17" ry="8" fill="{CREAM}"/>'
             f'<circle cx="46" cy="64" r="9" fill="{CREAM}"/><circle cx="46" cy="64" r="4.5" fill="{SHADE}"/>'
             f'<circle cx="54" cy="92" r="28" fill="{SHADE}"/><circle cx="54" cy="88" r="28" fill="{CREAM}"/>'
             f'<ellipse cx="36" cy="96" rx="13" ry="9.5" fill="{MUZ}"/><ellipse cx="27" cy="94" rx="4.6" ry="3.7" fill="{INK}"/>'
             f'<path d="M48 85q5 4.5 10 0" fill="none" stroke="{INK}" stroke-width="2.4" stroke-linecap="round"/>'
             f'<circle cx="190" cy="44" r="3" fill="#78C7D5" opacity=".55"/><circle cx="200" cy="32" r="2.2" fill="#78C7D5" opacity=".4"/><circle cx="208" cy="22" r="1.6" fill="#78C7D5" opacity=".3"/>')
    return svg("0 0 220 124", inner, w, None, "Polar bear sleeping in the snow")

def bear_searching(w=None):
    inner = (f'<g transform="translate(0,4)">{head(eye_dx=-6)}</g>'
             f'<circle cx="106" cy="92" r="14" fill="#78C7D5" fill-opacity=".2" stroke="#397F91" stroke-width="3.2"/>'
             f'<path d="M116 102l12 12" stroke="#397F91" stroke-width="4.5" stroke-linecap="round"/>'
             f'<ellipse cx="98" cy="104" rx="9" ry="6.5" fill="{CREAM}"/>')
    return svg("0 0 140 120", inner, w, None, "Polar bear searching with a magnifier")

def bear_alert(w=None):
    inner = (f'<path d="M12 50q-8 10 0 20M2 44q-12 16 0 32" fill="none" stroke="#78C7D5" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>'
             f'<path d="M128 50q8 10 0 20M138 44q12 16 0 32" fill="none" stroke="#78C7D5" stroke-width="2.2" stroke-linecap="round" opacity=".8" transform="translate(0,0)"/>'
             f'<g transform="translate(10,6)">{head(ear_dy=-4, r=4.8)}</g>')
    return svg("0 0 140 120", inner, w, None, "Polar bear noticing something")

def bear_celebrating(w=None):
    inner = (f'<g transform="translate(10,10)">{head(eyes="happy", smile=True)}</g>'
             f'<ellipse cx="20" cy="68" rx="9" ry="13" fill="{CREAM}" transform="rotate(-28 20 68)"/><ellipse cx="120" cy="68" rx="9" ry="13" fill="{CREAM}" transform="rotate(28 120 68)"/>'
             f'<path d="M20 10l4 6-4 6-4-6z" fill="#78C7D5"/><path d="M122 18l3 4.5-3 4.5-3-4.5z" fill="#78C7D5" opacity=".7"/>')
    return svg("0 0 140 128", inner, w, None, "Polar bear celebrating quietly")

def bear_trap(w=None):
    rings = ''.join(f'<ellipse cx="128" cy="100" rx="{rx}" ry="{ry}" fill="none" stroke="#78C7D5" stroke-width="1.2" opacity="{o}"/>' for rx,ry,o in [(48,15,.6),(60,19,.4),(72,23,.25)])
    inner = (f'<ellipse cx="104" cy="112" rx="100" ry="16" fill="#E8F3F5"/>'
             f'<ellipse cx="128" cy="100" rx="38" ry="11" fill="#397F91"/><ellipse cx="128" cy="101" rx="30" ry="7" fill="#244F5C"/>{rings}'
             f'<g transform="translate(6,22) scale(.6)">{head(eye_dx=4)}</g>'
             f'<ellipse cx="86" cy="100" rx="9" ry="5.5" fill="{CREAM}"/>')
    return svg("0 0 204 130", inner, w, None, "Polar bear waiting at an ice hole")

def ripples(cx, cy, rs, color="#78C7D5", op=.06, w=None, h=None, vb="0 0 200 200", extra=""):
    c = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="1" opacity="{op}"/>' for r in rs)
    return svg(vb, c+extra, w, h, "")

def crystal(w=28):
    inner = ('<polygon points="20,2 34,16 30,42 20,54 10,42 6,16" fill="#E46C83"/>'
             '<polygon points="20,2 6,16 20,24" fill="#F08EA1"/><polygon points="34,16 30,42 20,24" fill="#C8506A"/>'
             '<polygon points="6,16 10,42 20,54 20,24" fill="#D95F79"/><polygon points="17,6 11,15 15,16" fill="#FBECEF" opacity=".75"/>')
    return svg("0 0 40 56", inner, w, None, "Fire crystal")

def paw(fill="#397F91", op=.12, w=26, rot=0):
    inner = (f'<g fill="{fill}" opacity="{op}" transform="rotate({rot} 20 22)"><ellipse cx="20" cy="30" rx="10" ry="8.5"/><ellipse cx="7" cy="19" rx="4.2" ry="5.4" transform="rotate(-20 7 19)"/><ellipse cx="15" cy="10.5" rx="4.4" ry="5.6"/><ellipse cx="25" cy="10.5" rx="4.4" ry="5.6"/><ellipse cx="33" cy="19" rx="4.2" ry="5.4" transform="rotate(20 33 19)"/></g>')
    return svg("0 0 40 44", inner, w, None, "")

def icon(name, size=22):
    p = {
     "gear":'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
     "back":'<path d="M15 5l-7 7 7 7"/>',
     "chev":'<path d="M9 5l7 7-7 7"/>',
     "plus":'<path d="M12 5v14M5 12h14"/>',
     "cal":'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
     "timer":'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5"/>',
     "home":'<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6"/>',
     "calc":'<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 8h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01"/>',
     "bolt":'<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
     "flame":'<path d="M12 3c1 3.2 4.5 4.8 4.5 9a4.5 4.5 0 0 1-9 0c0-1.8.8-3 1.8-4 .2 1.4 1 2 1.8 2C11.4 7.6 11 5.4 12 3z"/>',
     "flask":'<path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/>',
     "heart":'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
     "store":'<path d="M4 9l1.5-5h13L20 9M5 9v11h14V9M9 20v-6h6v6"/>',
    }[name]
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{p}</svg>'

def tabs(active):
    items=[("Today","cal"),("Timers","timer"),("Events","home"),("Calculator","calc")]
    b=''.join(f'<button class="tab{" on" if n==active else ""}"><span class="pill">{icon(i,24)}</span>{n}</button>' for n,i in items)
    return f'<div style="position:absolute;left:0;right:0;bottom:0;height:80px;background:#fff;border-top:1px solid #DCE9EC;display:flex;padding:8px 12px">{b}</div>'

def row(time, title, meta="", dot="", utc="", extra="", pad=""):
    d = f'<i class="tl-dot {dot}"></i>'
    u = f'<div class="tl-utc">{utc}</div>' if utc else ""
    m = f'<div class="tl-meta">{meta}</div>' if meta else ""
    return f'<div class="tl-row"><div class="tl-time num">{time}{u}</div><div class="tl-rail">{d}</div><div class="tl-body"><div class="tl-title">{title}</div>{m}{extra}</div></div>'

def gap(h, label, add=False):
    btn = f'<button class="addtask">{icon("plus",16)}Add task</button>' if add else ""
    return f'<div class="tl-row gap" style="height:{h}px"><div></div><div class="tl-rail"></div><div class="gap-body"><div class="gap-inner"><span class="gap-free num">{label}</span>{btn}</div></div></div>'

def acct(color, name, meta, warn=False):
    col = "#78C7D5" if not warn else "#F2A65A"
    return f'<div style="display:flex;align-items:center;gap:10px"><span class="dot" style="background:{color}"></span><span>{name}</span><span style="margin-left:auto;color:{"#CDE7EC" if not warn else "#F8C98F"};font-weight:{600 if warn else 500}">{meta}</span></div>'

def page(title, w, h, body, prev=None):
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

def header(eyebrow, title):
    return f'''<div style="display:flex;justify-content:space-between;align-items:flex-start">
  <div><div class="eyebrow">{eyebrow}</div><h1 style="font-size:30px;line-height:36px;font-weight:700;margin-top:4px">{title}</h1></div>
  <button class="iconbtn" aria-label="Settings">{icon("gear")}</button></div>'''

A1,A2,A3,A4="#397F91","#5D73C9","#7A5FB0","#4E9F7B"
