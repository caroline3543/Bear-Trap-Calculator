import sys; sys.path.insert(0,"/tmp/arc")
from gen import *

# ================= 1. TODAY (Arctic) — one flourish: ripples on the Bear Trap hero =================
hero_ripples = ripples(300, 40, [30,54,78,102,126,150], "#78C7D5", .10, w=342, h=300, vb="0 0 342 300", extra="")
today = f'''<div style="position:relative;width:390px;height:2060px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:32px">
  <div style="display:flex;flex-direction:column;gap:16px">
    {header("Thursday 24 Sep · Auckland","Today")}
    <div class="num" style="display:flex;gap:20px;font-size:14px;line-height:20px;font-weight:500;color:#5B7075">
      <span><b style="color:#17272B;font-weight:600">5:30 PM</b> local</span><span><b style="color:#17272B;font-weight:600">05:30</b> UTC</span><span><b style="color:#17272B;font-weight:600">8</b> to do</span></div>
  </div>

  <!-- LEVEL 1: Bear Trap. the single flourish = water ripples, kept away from the text -->
  <div style="position:relative;overflow:hidden;background:#244F5C;border-radius:24px;padding:24px;color:#fff;display:flex;flex-direction:column;gap:20px">
    <div style="position:absolute;right:-70px;top:-90px;width:342px;height:300px;pointer-events:none">{hero_ripples}</div>
    <div style="position:relative;display:flex;justify-content:space-between;align-items:center">
      <span class="eyebrow" style="color:#78C7D5;display:inline-flex;align-items:center;gap:8px">{paw("#78C7D5",1,18)}Bear Trap 1</span>
      <span class="num" style="font-size:14px;line-height:20px;font-weight:500;color:#CDE7EC">7:30 PM · 07:30 UTC</span>
    </div>
    <div style="position:relative">
      <div class="num" style="font-size:36px;line-height:42px;font-weight:700">in 1h 29m</div>
      <div style="margin-top:4px;font-size:15px;line-height:21px;font-weight:500;color:#CDE7EC">2 accounts still need a minister</div>
    </div>
    <div style="position:relative;display:flex;flex-direction:column;gap:8px;font-size:15px;line-height:21px;font-weight:500">
      {acct(A1,"Caroline","Minister set")}{acct(A2,"Farm 1","Needs a minister",True)}{acct(A3,"Farm 2","Needs a minister",True)}
    </div>
    <button class="btn" style="position:relative;width:100%;background:#78C7D5;color:#17272B">Book ministers · 2 accounts</button>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;align-items:center;gap:8px"><h2 style="font-size:24px;line-height:30px;font-weight:700">Needs you</h2><span class="chip num" style="background:#CDE7EC;font-weight:700">3</span></div>
    <div class="card" style="padding:4px 20px">
      <div class="rowline"><span class="ic">{icon("store")}</span><div style="flex:1;min-width:0"><div class="t16">Storehouse stamina +120</div><div class="t14">Ready to claim · 4 accounts</div></div><button class="btn-sec">Claimed</button></div>
      <div class="rowline"><span class="ic">{icon("bolt")}</span><div style="flex:1;min-width:0"><div class="t16">Farm 1 hits 200 in 30m</div><div class="t14">Spend some before it stops</div></div><button class="btn-sec">Update</button></div>
      <div class="rowline"><span class="ic warm">{icon("flame")}</span><div style="flex:1;min-width:0"><div class="t16">Camps idle · Farm 3</div><div class="t14">A full batch ends 11:50 PM</div></div><button class="btn-sec" style="background:#FDF1E3;color:#6B3F0C">Start</button></div>
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:16px">
    <div><h2 style="font-size:24px;line-height:30px;font-weight:700">Schedule</h2><p style="margin-top:4px;font-size:15px;line-height:21px;font-weight:500;color:#5B7075">Your day at a glance: upcoming events, free time, and personal tasks.</p></div>
    <div class="card" style="padding:12px 20px 20px">
      <div style="padding:8px 0 16px">
        <div class="eyebrow" style="margin-bottom:8px">Still to do</div>
        <div style="display:flex;align-items:center;gap:8px">
          <button aria-label="Mark Laundry done" style="width:44px;height:44px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="width:26px;height:26px;border-radius:50%;border:2px solid #397F91;display:block"></span></button>
          <div style="flex:1;min-width:0"><div class="t16">Laundry · 30m</div><div class="t14">Planned 2:00 PM</div></div>
          <button class="btn-sec" style="font-size:14px;padding:0 14px">Move to 8:00 PM</button></div>
      </div>
      <div class="now"><span class="p num">NOW · 5:30 PM</span><span class="l"></span></div>
      {gap(12,"20m free")}
      {row("5:50 PM","Stamina reaches 200",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A2}"></span>Farm 1 · spend some first</span>',utc="05:50 UTC")}
      {gap(26,"1h 10m free",True)}
      {row("7:00 PM","Minister of Education",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A1}"></span>Caroline · 30 min</span>',"warm","07:00 UTC",'<div style="margin-top:8px;font-size:14px;line-height:20px;font-weight:600;color:#8A5210">+50% speed · +200 capacity</div>')}
      {gap(16,"30m free")}
      {row("7:30 PM","Bear Trap 1 begins","2 accounts still need a minister",utc="07:30 UTC")}
      <div class="tl-row"><div class="tl-time num" style="padding-top:10px">8:00 PM</div><div class="tl-rail"><i class="tl-dot" style="border-style:dashed"></i></div>
        <div style="padding:8px 0"><div style="min-height:56px;border-radius:14px;background:#E8F3F5;padding:8px 12px;display:flex;align-items:center;gap:8px">
          <button aria-label="Mark Make dinner done" style="width:44px;height:44px;margin:-8px 0 -8px -12px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="width:26px;height:26px;border-radius:50%;border:2px solid #397F91;display:block"></span></button>
          <div><div class="t16">Make dinner</div><div class="t14">8:00–8:30 PM · 30m</div></div></div></div></div>
      {gap(52,"2h 50m free",True)}
      {row("11:20 PM","All camps finish",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A2}"></span>Farm 1 · Infantry, Lancer, Marksman</span>',"warm","11:20 UTC")}
      <div style="border-top:1px solid #DCE9EC;margin-top:8px;padding-top:16px"><div class="eyebrow" style="margin-bottom:8px">After midnight</div>
        <div style="display:flex;justify-content:space-between;font-size:15px;line-height:21px;font-weight:500"><span>Storehouse stamina +120</span><span class="num" style="color:#5B7075">12:00 AM</span></div>
        <div style="display:flex;justify-content:space-between;font-size:15px;line-height:21px;font-weight:500;margin-top:8px"><span>Trek supplies +10</span><span class="num" style="color:#5B7075">4:00 AM</span></div></div>
    </div>
  </div>
  {tabs("Today")}
</div>'''

# ================= 2. QUIET STATE — the only flourish: sleeping bear in distant snow =================
specks = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity="{o}"/>' for x,y,r,o in [(30,28,1.6,.9),(74,52,1.2,.8),(118,22,1.8,.9),(168,44,1.2,.7),(222,26,1.6,.9),(268,58,1.2,.8),(312,30,1.8,.9),(48,84,1.2,.7),(146,70,1.4,.8),(250,86,1.2,.7)])
scene = f'''<svg viewBox="0 0 342 210" width="342" height="210" role="img" aria-label="A polar bear sleeping in distant snow" xmlns="http://www.w3.org/2000/svg">
<rect width="342" height="210" fill="#E8F3F5"/>{specks}
<path d="M0 116q50-34 110-14t118-8q60 6 114-16V210H0z" fill="#CDE7EC"/>
<path d="M0 150q70-30 150-8t192-14V210H0z" fill="#F4F8F8"/>
<g transform="translate(150,116) scale(.62)">{bear_sleeping().replace('<svg viewBox="0 0 220 124" role="img" aria-label="Polar bear sleeping in the snow" xmlns="http://www.w3.org/2000/svg">','<g>').replace('</svg>','</g>')}</g>
<g transform="translate(40,170) scale(.4)">{paw("#397F91",.14,16,-25).replace('<svg viewBox="0 0 40 44" width="16" role="img" aria-label="" xmlns="http://www.w3.org/2000/svg">','<g>').replace('</svg>','</g>')}</g>
</svg>'''
quiet = f'''<div style="position:relative;width:390px;height:1000px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:32px">
  {header("Thursday 24 Sep · Auckland","Today")}
  <div style="border-radius:24px;overflow:hidden;border:1px solid #DCE9EC">{scene}</div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-top:-8px">
    <h2 style="font-size:30px;line-height:36px;font-weight:700">Quiet for now.</h2>
    <p style="font-size:16px;line-height:23px;font-weight:500;color:#5B7075">Your next event is <b style="color:#17272B;font-weight:600">Bear Trap 1</b> at 6:00 PM (18:00 UTC), in <b class="num" style="color:#17272B;font-weight:600">4h 12m</b>.</p>
  </div>
  <div class="card" style="padding:12px 20px 16px">
    <div class="eyebrow" style="padding:8px 0">Coming up</div>
    {row("6:00 PM","Bear Trap 1 begins","All accounts covered",utc="18:00 UTC")}
    {gap(64,"4h free",True)}
    {row("10:20 PM","Research Center finishes",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A4}"></span>Farm 3</span>',utc="10:20 UTC")}
  </div>
  {tabs("Today")}
</div>'''

# ================= 3. TIMERS — flourish: furnace glow behind the running training =================
glow = 'background:radial-gradient(circle at 18% 100%,rgba(242,166,90,.15),rgba(242,166,90,0) 62%),#FFFAF3'
def secrow(ic, warm, title, sum_, badge="", act=False):
    b = f'<span style="height:24px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;background:{"#FDF1E3;color:#6B3F0C" if act else "#E8F3F5;color:#244F5C"}">{badge}</span>' if badge else ""
    return f'''<button style="display:flex;align-items:center;gap:16px;padding:16px 20px;min-height:88px;background:none;width:100%;text-align:left;color:inherit;border-top:1px solid #DCE9EC"><span class="ic{" warm" if warm else ""}">{icon(ic)}</span>
<span style="flex:1;min-width:0"><span style="display:flex;align-items:center;gap:8px"><span style="font-size:18px;line-height:24px;font-weight:650">{title}</span>{b}</span><span style="display:block;font-size:15px;line-height:21px;font-weight:500;color:#5B7075;margin-top:2px">{sum_}</span></span>{icon("chev",20)}</button>'''
timers = f'''<div style="position:relative;width:390px;height:1140px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:24px">
  {header("4 accounts","Timers")}
  <div style="display:flex;gap:8px;margin:0 -24px;padding:0 24px;overflow:hidden">
    <button class="seg on">All accounts</button><button class="seg"><span class="dot" style="background:{A1}"></span>Caroline</button><button class="seg"><span class="dot" style="background:{A2}"></span>Farm 1</button><button class="seg"><span class="dot" style="background:{A3}"></span>Farm 2</button></div>

  <!-- LEVEL 1: running training = warm. glow stays subtle and off the digits' edge -->
  <div style="position:relative;overflow:hidden;border-radius:24px;padding:24px;border:1px solid #F3DDBF;{glow};display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow" style="color:#8A5210;display:inline-flex;align-items:center;gap:8px">{icon("flame",18)}Training · finishes next</span>
      <span style="display:inline-flex;align-items:center;gap:8px;font-size:14px;line-height:20px;font-weight:500;color:#5B7075"><span class="dot" style="background:{A3}"></span>Farm 2</span></div>
    <div><div style="font-size:22px;line-height:28px;font-weight:700">All camps</div>
      <div class="num" style="font-size:36px;line-height:42px;font-weight:700;color:#244F5C;margin-top:4px">02:08:59</div>
      <div class="num" style="font-size:15px;line-height:21px;font-weight:500;color:#5B7075;margin-top:4px">Finishes 7:39 PM · 07:39 UTC</div></div>
  </div>

  <div class="card" style="padding:0;overflow:hidden">
    {secrow("bolt",False,"Chief stamina","<b style='color:#17272B;font-weight:600'>Farm 1</b> hits 200 in 20m","Action",True)}
    {secrow("flask",False,"Tundra Trek","Next claim <b style='color:#17272B;font-weight:600'>8:00 PM</b>")}
    {secrow("flame",True,"Training camps","Next <b class='num' style='color:#17272B;font-weight:600'>02:08:59</b> · <b style='color:#17272B;font-weight:600'>3 idle</b>","6",True)}
    {secrow("flask",False,"Research","Next <b style='color:#17272B;font-weight:600'>Dawn Academy</b> · <b class='num' style='color:#17272B;font-weight:600'>03:56:59</b>","2")}
    {secrow("heart",False,"Contributions","<b style='color:#17272B;font-weight:600'>3 full</b> · next +1 in <b class='num' style='color:#17272B;font-weight:600'>09:59</b>","3 full",True)}
  </div>
  <button class="btn" style="width:100%;background:#244F5C;color:#fff">Spend all · 3 full accounts</button>
  {tabs("Timers")}
</div>'''

# ================= 4. TRAINING with Education ACTIVE — warm = active boost =================
train = f'''<div style="position:relative;width:390px;height:1720px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:32px">
  <div style="display:flex;align-items:center;gap:12px">
    <button class="iconbtn" aria-label="Back to Timers">{icon("back")}</button>
    <div><div class="eyebrow">Timers</div><h1 style="font-size:30px;line-height:36px;font-weight:700;margin-top:2px">Training camps</h1></div></div>
  <div style="display:flex;gap:8px;margin:-8px -24px 0;padding:0 24px;overflow:hidden">
    <button class="seg"><span class="dot" style="background:{A1}"></span>Caroline</button><button class="seg"><span class="dot" style="background:{A2}"></span>Farm 1</button><button class="seg"><span class="dot" style="background:{A3}"></span>Farm 2</button><button class="seg on"><span class="dot" style="background:{A4}"></span>Farm 3</button></div>

  <!-- LEVEL 1: the boost is ON. warm glow = the one flourish -->
  <div style="position:relative;overflow:hidden;border-radius:24px;padding:24px;border:1px solid #F3DDBF;background:radial-gradient(circle at 85% 0%,rgba(242,166,90,.15),rgba(242,166,90,0) 60%),#FFFAF3;display:flex;flex-direction:column;gap:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="eyebrow" style="color:#8A5210;display:inline-flex;align-items:center;gap:8px">{icon("flame",18)}Education is on</span>
      <span class="num" style="height:28px;padding:0 12px;border-radius:999px;background:#FDF1E3;color:#6B3F0C;font-size:14px;line-height:28px;font-weight:700">ends in 19m</span></div>
    <div><div class="num t14">7:00–7:30 PM · 07:00 UTC</div>
      <h2 style="font-size:24px;line-height:30px;font-weight:700;margin-top:8px">What to do</h2>
      <p style="margin-top:8px;font-size:16px;line-height:23px;font-weight:500">Education is on now. Restart your camps before <b style="font-weight:700">7:25 PM</b> to use the buff.</p></div>
    <button class="btn" style="width:100%;background:#F2A65A;color:#2E1B05">Restart all camps · 3 ready</button>
  </div>

  <div class="card" style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">Right now</span><span class="num t14">7:11 PM</span></div>
    <div style="font-size:22px;line-height:28px;font-weight:700">3 camps ready to restart</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip">Infantry</span><span class="chip">Lancer</span><span class="chip">Marksman</span></div>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><h2 style="font-size:24px;line-height:30px;font-weight:700">Your plan</h2><span style="font-size:14px;line-height:20px;font-weight:600;color:#244F5C">1 check-in</span></div>
    <div class="card" style="padding:8px 20px 12px">
      <div class="now"><span class="p num">NOW · 7:11 PM</span><span class="l"></span></div>
      {row("7:11 PM","Restart all camps with the buff","Full batch 5h 40m","warm")}
      {gap(16,"19m")}
      {row("7:30 PM","Education ends","")}
      {gap(96,"9h 15m · no check-ins")}
      {row("4:45 AM","All camps finish training","Tomorrow morning","warm")}
    </div>
  </div>

  <div style="display:flex;flex-direction:column;gap:12px">
    <h2 style="font-size:18px;line-height:24px;font-weight:650">Plan for</h2>
    <div style="display:flex;background:#E8F3F5;border-radius:16px;padding:4px;gap:4px">
      <button style="flex:1;height:44px;border-radius:12px;background:#244F5C;color:#fff;font-size:14px;font-weight:600;padding:0 4px">Fewest check-ins</button>
      <button style="flex:1;height:44px;border-radius:12px;background:transparent;color:#17272B;font-size:14px;font-weight:600;padding:0 4px">Most training</button>
      <button style="flex:1;height:44px;border-radius:12px;background:transparent;color:#17272B;font-size:14px;font-weight:600;padding:0 4px">Finish at a time</button></div>
  </div>
  <button style="min-height:64px;border-radius:20px;background:#fff;border:1px solid #DCE9EC;padding:12px 20px;display:flex;align-items:center;gap:12px;text-align:left;width:100%;color:inherit">
    <span style="flex:1"><span style="display:block;font-size:16px;line-height:23px;font-weight:600">Training times</span><span style="display:block;font-size:14px;line-height:20px;font-weight:500;color:#5B7075">Full batch 5h 40m · add your Education time</span></span>{icon("chev",20)}</button>
  {tabs("Timers")}
</div>'''

# ================= 5. SHEET: mascot states, motifs, semantics, budget =================
def cell(title, use, art, bg="#E8F3F5"):
    return f'''<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px">
<div style="height:148px;border-radius:16px;background:{bg};display:flex;align-items:center;justify-content:center;overflow:hidden">{art}</div>
<div><div style="font-size:18px;line-height:24px;font-weight:650">{title}</div><div style="font-size:14px;line-height:20px;font-weight:500;color:#5B7075;margin-top:2px">{use}</div></div></div>'''
def sw(hex_, name, note):
    return f'<div style="display:flex;align-items:center;gap:12px;height:48px"><i style="width:40px;height:40px;border-radius:12px;border:1px solid #DCE9EC;background:{hex_};display:block;flex-shrink:0"></i><div><b style="display:block;font-size:15px;line-height:21px;font-weight:600">{name}</b><span class="num" style="display:block;font-size:14px;line-height:20px;font-weight:500;color:#5B7075">{hex_} · {note}</span></div></div>'
bear_row = ''.join([
  cell("Peeking","Onboarding, first-run hints",bear_peeking(120)),
  cell("Floating","Loading and search, quiet water",bear_floating(140)),
  cell("Sleeping","No events, quiet hours",bear_sleeping(190)),
  cell("Searching","Looking up slots or data",bear_searching(130)),
  cell("Alert","Rare contextual hint",bear_alert(130)),
  cell("Celebrating","Restrained success",bear_celebrating(130)),
  cell("Bear Trap","Bear Trap event only",bear_trap(200)),
])
ripple_box = lambda op,label: f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><div style="width:96px;height:96px;border-radius:16px;background:#fff;border:1px solid #DCE9EC;overflow:hidden">{ripples(48,48,[10,22,34,46,58,70],"#397F91",op,w=96,h=96,vb="0 0 96 96")}</div><span class="num" style="font-size:13px;line-height:18px;font-weight:600;color:#5B7075">{label}</span></div>'
sheet = f'''<div style="width:1240px;height:2160px;background:#F4F8F8;padding:48px;display:flex;flex-direction:column;gap:40px">
  <div><div class="eyebrow">Time Hub</div><h1 style="font-size:36px;line-height:42px;font-weight:700;margin-top:4px">Whiteout personality layer</h1>
    <p style="margin-top:8px;font-size:16px;line-height:23px;font-weight:500;color:#5B7075;max-width:680px">Cute Arctic survival companion. Clean first: about 85–90% quiet UI, 10–15% world. One flourish per viewport.</p></div>

  <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;align-items:start">
    <div class="card" style="display:flex;flex-direction:column;gap:8px">
      <h2 style="font-size:24px;line-height:30px;font-weight:700;margin-bottom:4px">Ice · blue</h2>
      <p class="t14" style="margin-bottom:4px">Normal interface, time, neutral information, inactive, navigation.</p>
      {sw("#F4F8F8","Background","page")}{sw("#FFFFFF","Surface","cards")}{sw("#E8F3F5","Surface ice","inputs, tasks")}{sw("#CDE7EC","Ice pale","selected, Now")}
      {sw("#397F91","Arctic primary","icons, dots, fills")}{sw("#244F5C","Arctic deep","hero, buttons, text accents")}{sw("#78C7D5","Frost accent","on dark, Now line")}
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:8px">
      <h2 style="font-size:24px;line-height:30px;font-weight:700;margin-bottom:4px">Warmth · amber</h2>
      <p class="t14" style="margin-bottom:4px">Furnace, training, active boost, anything currently running.</p>
      {sw("#F2A65A","Warmth","fills, dots, glow")}{sw("#FFFAF3","Warm surface","running hero")}{sw("#FDF1E3","Warm chip","badges")}{sw("#8A5210","Warm text","text on light; #F2A65A fails as text")}
      <div style="margin-top:8px;height:96px;border-radius:16px;border:1px solid #F3DDBF;background:radial-gradient(circle at 20% 100%,rgba(242,166,90,.15),rgba(242,166,90,0) 62%),#FFFAF3;display:flex;align-items:center;padding:0 20px;font-size:15px;line-height:21px;font-weight:600;color:#6B3F0C">Active furnace glow · 15% max</div>
    </div>
    <div class="card" style="display:flex;flex-direction:column;gap:8px">
      <h2 style="font-size:24px;line-height:30px;font-weight:700;margin-bottom:4px">Coral · fire crystal</h2>
      <p class="t14" style="margin-bottom:4px">Fire crystals and rare, high-value information only.</p>
      {sw("#E46C83","Fire crystal","the crystal itself")}{sw("#FBECEF","Pale surface","optional chip")}
      <div style="display:flex;align-items:flex-end;gap:20px;margin-top:8px;padding:16px;border-radius:16px;background:#FBECEF">{crystal(22)}{crystal(34)}{crystal(48)}<span style="font-size:14px;line-height:20px;font-weight:600;color:#7A2B3D;align-self:center;margin-left:auto">Faceted, one highlight</span></div>
      <p class="t14" style="margin-top:8px">Secondary text is #5B7075 (not #71868B) so small text stays above 4.5:1. #71868B and #9AABAF are for icons and large text only.</p>
    </div>
  </div>

  <div><h2 style="font-size:24px;line-height:30px;font-weight:700;margin-bottom:16px">Polar bear · 7 states</h2>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px">{bear_row}</div></div>

  <div class="card" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:48px">
    <div><h2 style="font-size:18px;line-height:24px;font-weight:650;margin-bottom:12px">Water ripples</h2>
      <div style="display:flex;gap:16px">{ripple_box(.03,"3%")}{ripple_box(.05,"5%")}{ripple_box(.06,"6%")}</div>
      <p class="t14" style="margin-top:12px">1px lines, 3–6% opacity. Never under body text, never on every card.</p></div>
    <div><h2 style="font-size:18px;line-height:24px;font-weight:650;margin-bottom:12px">Paw prints</h2>
      <div style="display:flex;gap:8px;align-items:flex-end;height:64px">{paw("#397F91",.15,26,-10)}{paw("#397F91",.12,26,12)}{paw("#397F91",.09,26,-8)}</div>
      <p class="t14" style="margin-top:12px">2–4 in a sequence, 8–15%. Onboarding, empty states. Never as bullets.</p>
      <h2 style="font-size:18px;line-height:24px;font-weight:650;margin:20px 0 12px">Snow specks</h2>
      <div style="height:48px;border-radius:12px;background:#E8F3F5;position:relative;overflow:hidden"><svg viewBox="0 0 200 48" width="200" height="48" aria-hidden="true">{''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff" opacity=".9"/>' for x,y,r in [(14,10,1.6),(46,32,1.2),(70,14,1.8),(104,28,1.2),(132,9,1.6),(160,34,1.4),(186,18,1.2)])}</svg></div>
      <p class="t14" style="margin-top:8px">Static only. No falling snow.</p></div>
    <div><h2 style="font-size:18px;line-height:24px;font-weight:650;margin-bottom:12px">Where the flourish goes</h2>
      <div style="display:flex;flex-direction:column;font-size:15px;line-height:21px;font-weight:500">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:0"><span>Today</span><b style="font-weight:600;color:#244F5C">ripples on Bear Trap</b></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #DCE9EC"><span>Timers</span><b style="font-weight:600;color:#8A5210">furnace glow</b></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #DCE9EC"><span>Training + Education on</span><b style="font-weight:600;color:#8A5210">boost glow</b></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #DCE9EC"><span>Nothing coming up</span><b style="font-weight:600;color:#244F5C">sleeping bear</b></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #DCE9EC"><span>Onboarding</span><b style="font-weight:600;color:#244F5C">peeking + paws</b></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid #DCE9EC"><span>Loading a search</span><b style="font-weight:600;color:#244F5C">searching bear</b></div>
      </div></div>
  </div>

  <div class="card" style="background:#E8F3F5;border-color:#CDE7EC">
    <h2 style="font-size:18px;line-height:24px;font-weight:650">The test</h2>
    <p style="margin-top:8px;font-size:16px;line-height:23px;font-weight:500">Remove every decoration: is it still an exceptionally clear interface? Put it back: does it unmistakably feel Arctic? If not, add exactly one flourish. Never a bear with snow, ice, crystals, glow and ripples on the same card.</p>
  </div>
</div>'''

files = {
 "ArcToday.dc.html": page("Today · Arctic",390,2060,today),
 "ArcQuiet.dc.html": page("Quiet state · Arctic",390,1000,quiet),
 "ArcTimers.dc.html": page("Timers · Arctic",390,1140,timers),
 "ArcTraining.dc.html": page("Training with Education on · Arctic",390,1720,train),
 "ArcSheet.dc.html": page("Whiteout personality layer",1240,2160,sheet),
}
for n,c in files.items():
    open(OUT+n,"w").write(c)
    print(n, len(c))
