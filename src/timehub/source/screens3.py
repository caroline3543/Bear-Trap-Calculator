import sys; sys.path.insert(0,"/tmp/arc")
from gen3 import *

B=lambda t:f"<b style='color:#17272B;font-weight:600'>{t}</b>"

# ---------- hero: crisp UI, world layer = a small painted pool in the corner ----------
def hero_pool():
    i=('<defs><clipPath id="hp"><path d="M0 0H160V150C120 160 60 120 0 70Z"/></clipPath></defs>'
       '<g clip-path="url(#hp)"><rect width="160" height="150" fill="#2F6E80"/>'
       +water(10,160,150,["#4E97A9","#3F869A","#33788C","#2A6A7E"])+
       '<ellipse cx="88" cy="70" rx="40" ry="8" fill="#E46C83" opacity=".18" filter="url(#brush)"/>'
       +bear_head(56,10,.62,"calm")+water(58,160,150,["#4E97A9","#3F869A","#33788C"]).replace('<g filter','<g opacity=".98" filter')
       +ripple_lines(88,62,[34,52,72,94],"#DFF3F6",.5)+'</g>')
    return f'<svg viewBox="0 0 160 150" width="160" height="150" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{DEFS}{i}</svg>'
hero=f'''<div style="position:relative;overflow:hidden;background:#244F5C;border-radius:24px;padding:24px;color:#fff;display:flex;flex-direction:column;gap:20px">
  <div style="position:absolute;right:0;top:0;width:160px;height:150px;pointer-events:none">{hero_pool()}</div>
  <div style="position:relative;padding-right:120px">
    <span class="eyebrow" style="color:#9ED5DF">Bear Trap 1</span>
    <div class="count" style="margin-top:8px">in 1h 29m</div>
    <div class="num" style="margin-top:4px;font-size:14px;line-height:20px;font-weight:500;color:#CDE7EC">7:30 PM · 07:30 UTC</div>
  </div>
  <div style="position:relative;display:flex;flex-direction:column;gap:8px;font-size:15px;line-height:21px;font-weight:500">
    {acct(A1,"Caroline","Minister set")}{acct(A2,"Farm 1","Needs a minister",True)}{acct(A3,"Farm 2","Needs a minister",True)}</div>
  <button class="btn" style="position:relative;width:100%;background:#78C7D5;color:#17272B">Book ministers · 2 accounts</button>
</div>'''

snowflake='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#397F91" stroke-width="1.6" stroke-linecap="round" opacity=".4" aria-hidden="true"><path d="M12 2v20M4 7l16 10M20 7L4 17"/></svg>'
free_deco=f'<div style="position:absolute;right:-6px;top:50%;transform:translateY(-50%);opacity:.5"><svg viewBox="0 0 120 56" width="120" height="56" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{DEFS}{footprints([(6,40,-70),(30,32,-60),(56,24,-45),(84,18,-35)],"#5F8FA0",.55)}</svg></div>'
today=f'''<div style="position:relative;width:390px;height:2560px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:32px">
  <div style="display:flex;flex-direction:column;gap:16px">
    {header("Today's log · Thu 24 Sep · Auckland","Today")}
    <div class="num" style="position:relative;display:flex;gap:20px;font-size:14px;line-height:20px;font-weight:500;color:#5B7075"><span>{B("5:30 PM")} local</span><span>{B("05:30")} UTC</span><span>{B("8")} to do</span></div>
  </div>
  {hero}
  <div style="display:flex;flex-direction:column;gap:12px">
    <div><div class="eyebrow">Field notes</div><div style="display:flex;align-items:center;gap:8px;margin-top:2px"><h2 class="sect">Needs you</h2><span class="chip num" style="background:#CDE7EC;font-weight:700">3</span></div></div>
    <div class="card" style="padding:4px 20px">
      <div class="rowline"><span class="ic">{icon("store")}</span><div style="flex:1;min-width:0"><div class="t16">Storehouse stamina +120</div><div class="t14">Ready to claim · 4 accounts</div></div><button class="btn-sec">Claimed</button></div>
      <div class="rowline"><span class="ic">{icon("bolt")}</span><div style="flex:1;min-width:0"><div class="t16">Farm 1 hits 200 in 30m</div><div class="t14">Spend some before it stops</div></div><button class="btn-sec">Update</button></div>
      <div class="rowline"><span class="ic warm">{icon("flame")}</span><div style="flex:1;min-width:0"><div class="t16">Camps idle · Farm 3</div><div class="t14">A full batch ends 11:50 PM</div></div><button class="btn-sec" style="background:#FFF4E6;color:#6B3F0C">Start</button></div>
    </div>
  </div>
  <!-- the one painted transition on this screen -->
  <div style="margin:0 -24px;margin-top:-8px">
    {snow_edge("#EDF5F6")}
    <div style="background:#EDF5F6;padding:0 24px 32px;display:flex;flex-direction:column;gap:16px">
      <div><div class="eyebrow">Coming up</div><h2 class="sect" style="margin-top:2px">Schedule</h2><p style="margin-top:4px;font-size:15px;line-height:21px;font-weight:450;color:#5B7075">Your day at a glance: upcoming events, free time, and personal tasks.</p></div>
      <div class="card" style="padding:12px 20px 20px">
        <div style="display:flex;align-items:center;gap:8px;min-height:44px;color:#5B7075;font-size:14px;font-weight:600">{snowflake}11 completed · Show</div>
        <div style="padding:8px 0 16px"><div class="eyebrow" style="margin-bottom:8px">Still to do</div>
          <div style="display:flex;align-items:center;gap:8px">
            <button aria-label="Mark Laundry done" style="width:44px;height:44px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="width:26px;height:26px;border-radius:50%;border:2px solid #397F91;display:block"></span></button>
            <div style="flex:1;min-width:0"><div class="t16">Laundry · 30m</div><div class="t14">Planned 2:00 PM</div></div>
            <button class="btn-sec" style="font-size:14px;padding:0 14px">Move to 8:00 PM</button></div></div>
        <div class="now"><span class="p num">NOW · 5:30 PM</span><span class="l"></span></div>
        {gap(12,"20m free")}
        {row("5:50 PM","Stamina reaches 200",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A2}"></span>Farm 1 · spend some first</span>',"circle","05:50 UTC",v=0)}
        {gap(26,"1h 10m free",True)}
        {row("7:00 PM","Minister of Education",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A1}"></span>Caroline · 30 min</span>',"star","07:00 UTC",'<div style="margin-top:8px;font-size:14px;line-height:20px;font-weight:600;color:#8A5210">+50% speed · +200 capacity</div>'+annot("good training window"),v=1)}
        {gap(16,"30m free")}
        {row("7:30 PM","Bear Trap 1 begins","2 accounts still need a minister","paw","07:30 UTC",v=2)}
        <div class="tl-row"><div class="tl-time num" style="padding-top:10px">8:00 PM</div>{rail("dashed",0)}
          <div style="padding:8px 0"><div style="min-height:56px;border-radius:14px;background:#E8F3F5;padding:8px 12px;display:flex;align-items:center;gap:8px">
            <button aria-label="Mark Make dinner done" style="width:44px;height:44px;margin:-8px 0 -8px -12px;border-radius:50%;background:transparent;display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="width:26px;height:26px;border-radius:50%;border:2px solid #397F91;display:block"></span></button>
            <div><div class="t16">Make dinner</div><div class="t14">8:00–8:30 PM · 30m</div></div></div></div></div>
        {gap(88,"2h 50m free",True,free_deco)}
        <div style="margin:-18px 0 0 104px"><span class="hand">quiet for a while</span></div>
        {row("11:20 PM","All camps finish",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A2}"></span>Farm 1 · Infantry, Lancer, Marksman</span>',"flame","11:20 UTC",v=1)}
        <div style="border-top:1px solid #DCE9EC;margin-top:8px;padding-top:16px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><div class="eyebrow">After midnight</div><span class="hand">overnight</span></div>
          <div style="display:flex;justify-content:space-between;font-size:15px;line-height:21px;font-weight:500"><span>Storehouse stamina +120</span><span class="num" style="color:#5B7075">12:00 AM</span></div>
          <div style="display:flex;justify-content:space-between;font-size:15px;line-height:21px;font-weight:500;margin-top:8px"><span>Trek supplies +10</span><span class="num" style="color:#5B7075">4:00 AM</span></div></div>
      </div>
    </div>
  </div>
  {tabs("Today")}
</div>'''

# ---------- QUIET: immersive-lite (illustration ~40%) ----------
quiet=f'''<div style="position:relative;width:390px;height:1000px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:24px">
  {header("Today's log · Thu 24 Sep","Today",False)}
  <div style="margin:0 -24px;position:relative">{S_distant(390,205).replace('viewBox="0 0 390 205"','viewBox="0 0 342 180" preserveAspectRatio="xMidYMid slice"')}</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <h2 class="title">Quiet out here.</h2>
    <p style="font-size:16px;line-height:23px;font-weight:450;color:#5B7075">Nothing needs your attention until <b style="color:#17272B;font-weight:600">7:00 PM</b> (07:00 UTC), in <b class="num" style="color:#17272B;font-weight:600">1h 29m</b>.</p>
    <span class="hand" style="margin-top:4px">quiet until 7</span>
  </div>
  <div class="card" style="padding:12px 20px 16px"><div class="eyebrow" style="padding:8px 0">Coming up</div>
    {row("7:00 PM","Minister of Education",f'<span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A1}"></span>Caroline · 30 min</span>',"star","07:00 UTC",v=0)}
    {gap(24,"30m free")}
    {row("7:30 PM","Bear Trap 1 begins","All accounts covered","paw","07:30 UTC",v=1)}</div>
  {tabs("Today")}
</div>'''

# ---------- CAMP: everything running overnight (night scene, ~40%) ----------
camp=f'''<div style="position:relative;width:390px;height:1000px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:24px">
  {header("Camp status · Thu 24 Sep","Timers",False)}
  <div style="margin:0 -24px;position:relative">{S_night(390,205).replace('viewBox="0 0 390 205"','viewBox="0 0 342 180" preserveAspectRatio="xMidYMid slice"')}</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <h2 class="title">Camp's quiet.</h2>
    <p style="font-size:16px;line-height:23px;font-weight:450;color:#5B7075">Everything is running overnight. Next finish <b class="num" style="color:#17272B;font-weight:600">4:45 AM</b> (16:45 UTC).</p></div>
  <div class="card" style="padding:4px 20px">
    <div class="rowline"><span class="ic warm">{icon("flame")}</span><div style="flex:1"><div class="t16">Training camps</div><div class="t14">All camps · Farm 1 · finish 4:45 AM</div></div></div>
    <div class="rowline"><span class="ic">{icon("flask")}</span><div style="flex:1"><div class="t16">Research</div><div class="t14">Dawn Academy · 1d 23:47:06</div></div></div>
    <div class="rowline"><span class="ic">{icon("heart")}</span><div style="flex:1"><div class="t16">Contributions</div><div class="t14">20 / 20 · all accounts</div></div></div></div>
  {tabs("Timers")}
</div>'''

# ---------- TIMERS with a painted furnace vignette ----------
def furnace_vignette():
    i=(f'<defs><clipPath id="fv"><path d="M0 0H130V96C96 100 40 84 0 50Z"/></clipPath><radialGradient id="fg"><stop offset="0" stop-color="#F2A65A" stop-opacity=".45"/><stop offset="1" stop-color="#F2A65A" stop-opacity="0"/></radialGradient></defs>'
       '<g clip-path="url(#fv)"><rect width="130" height="100" fill="#FBEBD3"/><circle cx="76" cy="52" r="52" fill="url(#fg)"/>'
       '<g filter="url(#gouache)"><path d="M46 84V50Q46 30 76 30T106 50V84Z" fill="#4E6F7C"/><rect x="88" y="14" width="10" height="22" rx="2" fill="#4E6F7C"/><path d="M60 84V62Q60 52 76 52T92 62V84Z" fill="#F2A65A"/><path d="M68 84V68Q68 60 76 60T84 68V84Z" fill="#F8C98F"/></g>'
       '<g filter="url(#gouache)"><path d="M0 84C40 76 90 80 130 76V100H0Z" fill="#F6FAFA"/></g></g>')
    return f'<svg viewBox="0 0 130 100" width="130" height="100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">{DEFS}{i}</svg>'
def secrow(ic,warm,title,sum_,badge="",act=False):
    b=f'<span style="height:24px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;background:{"#FFF4E6;color:#6B3F0C" if act else "#E8F3F5;color:#244F5C"}">{badge}</span>' if badge else ""
    return f'''<button style="display:flex;align-items:center;gap:16px;padding:16px 20px;min-height:88px;background:none;width:100%;text-align:left;color:inherit;border-top:1px solid #DCE9EC"><span class="ic{" warm" if warm else ""}">{icon(ic)}</span>
<span style="flex:1;min-width:0"><span style="display:flex;align-items:center;gap:8px"><span style="font-family:Nunito,Inter,sans-serif;font-size:18px;line-height:24px;font-weight:700">{title}</span>{b}</span><span style="display:block;font-size:15px;line-height:21px;font-weight:450;color:#5B7075;margin-top:2px">{sum_}</span></span>{icon("chev",20)}</button>'''
timers=f'''<div style="position:relative;width:390px;height:1180px;background:#F4F8F8;padding:24px 24px 0;display:flex;flex-direction:column;gap:24px">
  {header("Camp status · 4 accounts","Timers",True)}
  <div style="display:flex;gap:8px;margin:0 -24px;padding:0 24px;overflow:hidden"><button class="seg on">All accounts</button><button class="seg"><span class="dot" style="background:{A1}"></span>Caroline</button><button class="seg"><span class="dot" style="background:{A2}"></span>Farm 1</button><button class="seg"><span class="dot" style="background:{A3}"></span>Farm 2</button></div>
  <div style="position:relative;overflow:hidden;border-radius:24px;padding:24px;border:1px solid #F3DDBF;background:#FFF4E6;display:flex;flex-direction:column;gap:16px">
    <div style="position:absolute;right:0;top:0;width:130px;height:100px;pointer-events:none">{furnace_vignette()}</div>
    <div style="position:relative;padding-right:110px"><span class="eyebrow" style="color:#8A5210">Training · finishes next</span>
      <div style="font-family:Nunito,Inter,sans-serif;font-size:22px;line-height:28px;font-weight:700;margin-top:6px">All camps</div></div>
    <div style="position:relative"><div class="count" style="color:#244F5C">02:08:59</div>
      <div class="num" style="font-size:15px;line-height:21px;font-weight:500;color:#5B7075;margin-top:4px">Finishes 7:39 PM · 07:39 UTC · <span style="display:inline-flex;align-items:center;gap:6px"><span class="dot" style="background:{A3}"></span>Farm 2</span></div></div>
    <span class="hand" style="position:relative">remember to restart</span>
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

# ---------- ONBOARDING: immersive (~50% illustration) ----------
def onboard_scene():
    w,h=390,430
    i=(sky(w,h,"#DCEBF0","#F1F6F6")+moon(322,58,13)+
       '<g filter="url(#gouache)" opacity=".85"><path d="M0 230L70 160 130 200 200 140 270 196 330 158 390 204V270H0Z" fill="#BCD3DC"/><path d="M200 140L270 196 224 200 186 186Z" fill="#A5C2CE" opacity=".6"/></g>'+
       iceberg(250,150,.9,"bright")+settlement(40,206,1.2)+
       water(250,w,h,["#8CC9D2","#6FB3C1","#4D96A8","#357B8E","#2A6376"])+
       '<g filter="url(#gouache)"><path d="M30 350C30 322 60 316 200 316S360 322 360 352V430H30Z" fill="#DCEBEF"/><path d="M30 352C30 336 60 330 200 330S360 336 360 350C360 342 330 338 200 338S30 342 30 352Z" fill="#fff" opacity=".9"/><path d="M30 392C140 402 260 402 360 392V430H30Z" fill="#A9CBD5" opacity=".6"/></g>'+
       bear_head(138,246,1.2,"curious")+paw_blob(146,324,1.5)+paw_blob(204,324,1.5)+
       footprints([(300,398,-20),(324,384,-12),(346,372,-8)],"#5F8FA0",.5)+
       snow_specks([(40,40,1.5),(96,80,1.2),(160,30,1.4),(250,64,1.2),(360,110,1.4),(60,120,1.1)]))
    return f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="A polar bear peeking over an ice ledge at dusk" xmlns="http://www.w3.org/2000/svg">{DEFS}{i}</svg>'
onboard=f'''<div style="position:relative;width:390px;height:844px;background:#F4F8F8;overflow:hidden">
  <div style="position:absolute;left:0;top:0">{onboard_scene()}</div>
  <div style="position:absolute;left:0;right:0;top:390px;height:50px;background:linear-gradient(to bottom,rgba(244,248,248,0),#F4F8F8)"></div>
  <div style="position:absolute;left:24px;right:24px;top:440px;display:flex;flex-direction:column;gap:12px">
    <div class="eyebrow">Field journal · step 1 of 8</div>
    <h1 class="title">Make Time Hub yours</h1>
    <p style="font-size:16px;line-height:23px;font-weight:450;color:#5B7075">A minute of setup makes the schedule, reminders and camp suggestions fit your account. You can skip any step.</p>
    <span class="hand">a minute, no more</span>
  </div>
  <div style="position:absolute;left:24px;right:24px;bottom:32px;display:flex;flex-direction:column;gap:12px">
    <button class="btn" style="width:100%;background:#244F5C;color:#fff">Let's go</button>
    <button style="height:44px;background:none;color:#244F5C;font-size:15px;font-weight:600">Skip for now</button>
  </div>
</div>'''

# ---------- SCENES SHEET ----------
def cell(title,use,art,pct):
    return f'''<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:12px"><div style="border-radius:16px;overflow:hidden;line-height:0">{art}</div>
<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div style="font-family:Nunito,Inter,sans-serif;font-size:18px;line-height:24px;font-weight:700">{title}</div><span class="t14">{pct}</span></div><div class="t14">{use}</div></div>'''
sc=''.join([
 cell("Floating bear","Bear Trap corner, water with a coral reflection.",S_floating(),"world layer"),
 cell("Peeking bear","Onboarding; behind an ice ledge or a card edge.",S_peeking(),"world layer"),
 cell("Distant bear","Empty day: tiny bear beside an iceberg.",S_distant(),"world layer"),
 cell("Sleeping bear","Camp quiet, resting in snow.",S_sleeping(),"world layer"),
 cell("Walking bear","Onboarding progress; footprints show the way.",S_walking(),"world layer"),
 cell("Looking bear","Points at an event or a distant settlement.",S_looking(),"world layer"),
 cell("Night bear","Overnight state, moonlight.",S_night(),"world layer"),
])
def sw(hexv,name,note): return f'<div style="display:flex;align-items:center;gap:10px;height:44px"><i style="width:32px;height:32px;border-radius:10px;background:{hexv};border:1px solid #DCE9EC;display:block;flex-shrink:0"></i><div><b style="display:block;font-size:14px;line-height:18px;font-weight:600">{name}</b><span class="num t14" style="display:block;line-height:16px">{hexv} · {note}</span></div></div>'
texture=lambda name,fil,note: f'<div><div style="height:96px;border-radius:14px;overflow:hidden;line-height:0"><svg viewBox="0 0 200 96" width="100%" height="96" preserveAspectRatio="none" aria-hidden="true">{DEFS}<rect width="200" height="96" fill="#EAF3F5"/><g filter="url(#{fil})"><path d="M0 48Q50 36 100 48T200 48V96H0Z" fill="#6FB3C1"/><path d="M0 68Q50 58 100 68T200 66V96H0Z" fill="#3F8598"/><circle cx="60" cy="30" r="20" fill="#FBF7EF"/></g></svg></div><b style="display:block;font-size:14px;line-height:20px;font-weight:600;margin-top:8px">{name}</b><span class="t14">{note}</span></div>'
sheet=f'''<div style="width:1240px;height:2520px;background:#F4F8F8;padding:48px;display:flex;flex-direction:column;gap:40px">
  <div><div class="eyebrow">Time Hub</div><h1 class="title" style="margin-top:4px;font-size:36px;line-height:42px">Arctic expedition journal</h1>
    <p style="margin-top:8px;font-size:16px;line-height:23px;color:#5B7075;max-width:760px">Two layers on purpose. The functional UI stays crisp; the painted field-journal world sits behind and beside it, never under text or on a control.</p></div>

  <div class="card" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:48px;align-items:center">
    <div><div class="eyebrow" style="margin-bottom:12px">Layer 1 · functional UI, crisp</div>
      <div style="display:flex;flex-direction:column;gap:12px;max-width:340px"><button class="btn" style="background:#244F5C;color:#fff">Book ministers · 2 accounts</button>
      <div style="display:flex;gap:8px"><span class="chip num">7:00 PM</span><span class="chip">Caroline</span></div><div class="t16 num">in 1h 29m</div></div></div>
    <div><div class="eyebrow" style="margin-bottom:12px">Layer 2 · field journal world, painterly</div><div style="border-radius:16px;overflow:hidden;line-height:0;max-width:342px">{S_floating()}</div></div>
  </div>

  <div><h2 class="sect" style="margin-bottom:16px">Seven bear scenes</h2><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">{sc}</div></div>

  <div class="card" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px">
    <div><h2 class="sect" style="margin-bottom:12px">Paint texture</h2><div style="display:grid;gap:16px">{texture("Gouache grain","gouache","Rough edge + speckle, on shapes only.")}{texture("Dry-brush water","brush","Stretched streaks for water bands.")}</div></div>
    <div><h2 class="sect" style="margin-bottom:12px">Illustration palette</h2>
      {sw("#8CC9D2","Pale aqua","water top")}{sw("#4D96A8","Glacier / turquoise","water body")}{sw("#2A6376","Deep teal","water depth")}{sw("#BCD3DC","Slate blue","mountains")}{sw("#16283A","Muted navy","night sky")}
      {sw("#FBF7EF","Cream","bear, snow")}{sw("#F6FAFA","Snow white","banks")}{sw("#B9D3DB","Blue-grey","shadow")}{sw("#F2A65A","Furnace amber","light")}{sw("#E46C83","Fire-crystal coral","reflections")}{sw("#F2C2BE","Dusty pink","ears, nose")}{sw("#B8A9D6","Muted lavender","dusk sky")}</div>
    <div><h2 class="sect" style="margin-bottom:12px">Rules of thumb</h2>
      <div class="t14" style="display:flex;flex-direction:column;gap:10px;color:#17272B;font-size:15px;line-height:21px">
        <span>Working screens: about 75–80% UI, 20–25% world.</span>
        <span>Immersive moments (onboarding, empty day, overnight, recap): 40–60% painting.</span>
        <span>Handwriting: 1–3 notes per screen, never on buttons, times, warnings or instructions.</span>
        <span>One painted transition per major screen.</span>
        <span>Whitespace in the timeline stays empty; footprints cross it, nothing fills it.</span></div>
      <div style="margin-top:20px;padding:16px;border-radius:16px;background:#FFF4E6;border:1px solid #F3DDBF"><b style="display:block;font-size:15px;line-height:21px;color:#6B3F0C">Production note</b><span style="display:block;margin-top:4px;font-size:14px;line-height:20px;font-weight:500;color:#5B4A2E">These mockups apply the texture with live SVG filters. In the app, ship each scene as a pre-rendered WebP or PNG: live filters made the earlier paper-grain overlay take about a second to redraw on iPhone.</span></div></div>
  </div>
</div>'''

# ---------- TYPE SHEET: three voices ----------
def dcol(name,fam,note,pick=False):
    b='<span style="height:24px;padding:0 10px;border-radius:999px;background:#244F5C;color:#fff;font-size:13px;font-weight:700;display:inline-flex;align-items:center">Pick</span>' if pick else ''
    return f'''<div class="card" style="display:flex;flex-direction:column;gap:12px;{'border:2px solid #244F5C;' if pick else ''}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">{name}</span>{b}</div>
<div style="font-family:{fam};font-size:32px;line-height:36px;font-weight:700;letter-spacing:-.4px">Today</div>
<div style="font-family:{fam};font-size:24px;line-height:30px;font-weight:700">Schedule · Training camps</div>
<div class="num" style="font-family:{fam};font-size:36px;line-height:42px;font-weight:800;letter-spacing:-.6px">02:08:59</div>
<div class="t14">{note}</div></div>'''
def hcol(name,fam,note,pick=False):
    b='<span style="height:24px;padding:0 10px;border-radius:999px;background:#244F5C;color:#fff;font-size:13px;font-weight:700;display:inline-flex;align-items:center">Pick</span>' if pick else ''
    return f'''<div class="card" style="display:flex;flex-direction:column;gap:12px;{'border:2px solid #244F5C;' if pick else ''}"><div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">{name}</span>{b}</div>
<div style="font-family:{fam};font-size:17px;line-height:22px;color:#2F6577">good training window</div>
<div style="font-family:{fam};font-size:17px;line-height:22px;color:#2F6577">bear tonight · quiet until 7</div>
<div style="font-family:{fam};font-size:15px;line-height:20px;color:#2F6577">remember to restart (15px)</div>
<div class="t14">{note}</div></div>'''
types=f'''<div style="width:1240px;height:1120px;background:#F4F8F8;padding:48px;display:flex;flex-direction:column;gap:32px">
  <div><div class="eyebrow">Time Hub</div><h1 class="title" style="margin-top:4px;font-size:36px;line-height:42px">Three typographic voices</h1></div>
  <div><h2 class="sect" style="margin-bottom:12px">1 · UI · Inter</h2><div class="card" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:24px">
    <div><div style="font-size:16px;line-height:23px;font-weight:450">Body 16 / 23 / 450. Your day at a glance.</div></div>
    <div><div class="t14">Metadata 14 / 20 / 500</div></div>
    <div><button class="btn" style="background:#244F5C;color:#fff">Button 16 / 600</button></div>
    <div class="num" style="font-size:22px;line-height:28px;font-weight:700">7:39 PM · 02:08:59</div></div></div>
  <div><h2 class="sect" style="margin-bottom:12px">2 · Display · warm humanist / rounded</h2><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">
    {dcol("Nunito",'Nunito,sans-serif',"Rounded terminals, warm, calm at 700. Not heavy.",True)}
    {dcol("Figtree",'Figtree,sans-serif',"Friendly and clean, a little closer to generic SaaS.")}
    {dcol("Bricolage Grotesque",'"Bricolage Grotesque",sans-serif',"Most character, but it reads quirky-grotesque, not soft.")}</div></div>
  <div><h2 class="sect" style="margin-bottom:12px">3 · Journal handwriting · 15–18px, 1–3 per screen</h2><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px">
    {hcol("Kalam",'Kalam,cursive',"Neat pen, wide, readable at 15px.",True)}
    {hcol("Caveat",'Caveat,cursive',"Pretty but narrow; needs 18px or more.")}
    {hcol("Patrick Hand",'"Patrick Hand",cursive',"Very legible, a little schoolbook.")}</div>
    <p class="t14" style="margin-top:12px;color:#17272B;font-size:15px;line-height:21px">Handwriting colour is #2F6577 on white (about 6:1). Never used for times, buttons, warnings, calculations or instructions.</p></div>
</div>'''

files={
 "JnToday.dc.html":page("Today · Field journal",390,2560,today),
 "JnQuiet.dc.html":page("Empty day · Field journal",390,1000,quiet),
 "JnCamp.dc.html":page("Camp quiet · Field journal",390,1000,camp),
 "JnTimers.dc.html":page("Timers · Field journal",390,1180,timers),
 "JnOnboard.dc.html":page("Onboarding · Field journal",390,844,onboard),
 "JnScenes.dc.html":page("Arctic expedition journal",1240,2520,sheet),
 "JnType.dc.html":page("Three typographic voices",1240,1120,types),
}
for n,c in files.items():
    open(OUT+n,"w").write(c); print(n,len(c))
