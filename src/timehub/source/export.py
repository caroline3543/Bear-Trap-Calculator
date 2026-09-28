import sys, os, re, json, shutil
sys.path.insert(0,"/tmp/arc")
import io, contextlib
with contextlib.redirect_stdout(io.StringIO()):
    import gen3, screens3
from gen3 import *
OLD="0 0 0 0 0.16  0 0 0 0 0.26  0 0 0 0 0.33  0 0 0 -1.1 0.62"
NEW="0 0 0 0 0.34  0 0 0 0 0.46  0 0 0 0 0.54  0 0 0 -0.6 0.33"
assert OLD in gen3.DEFS
gen3.DEFS=gen3.DEFS.replace(OLD,NEW); screens3.DEFS=gen3.DEFS; DEFS=gen3.DEFS
from gen import icon
R="/tmp/handoff/timehub-journal-handoff/"
for d in ["assets/svg","assets/raster","tokens","mockups","source"]: os.makedirs(R+d,exist_ok=True)

def wrap(inner,vb,w,h,label=""):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" role="img" aria-label="{label}">{DEFS}{inner}</svg>'
def strip_scene(s):  # scene() output is already a full svg
    return s

illus = {
 # painted (need raster for Figma / production)
 "scene-floating-bear": S_floating(),
 "scene-peeking-bear": S_peeking(),
 "scene-distant-bear": S_distant(),
 "scene-sleeping-bear": S_sleeping(),
 "scene-walking-bear": S_walking(),
 "scene-looking-bear": S_looking(),
 "scene-night-bear": S_night(),
 "header-landscape": header_landscape(),
 "onboarding-scene": screens3.onboard_scene(),
 "hero-pool-corner": screens3.hero_pool(),
 "furnace-vignette": screens3.furnace_vignette(),
 "snow-edge": snow_edge(),
 "bear-head-calm": wrap(bear_head(0,0,1,"calm"),"0 0 120 110",240,220,"Polar bear head"),
 "bear-head-curious": wrap(bear_head(0,0,1,"curious"),"0 0 120 110",240,220,"Polar bear head, curious"),
 "bear-head-sleepy": wrap(bear_head(0,0,1,"sleepy"),"0 0 120 110",240,220,"Polar bear head, sleepy"),
 "bear-side": wrap(bear_side(0,0,1),"0 0 160 110",320,220,"Polar bear, side view"),
}
for n,s in illus.items():
    if not s.startswith("<svg xmlns"):
        s=s.replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" ',1) if 'xmlns=' not in s.split(">")[0] else s
    open(R+f"assets/svg/{n}.svg","w").write(s)

# crisp pieces (no filters)
def crisp(name,inner,vb,w,h):
    open(R+f"assets/svg/{name}.svg","w").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" role="img" aria-label="{name}">{inner}</svg>')
for k in ["circle","dashed","paw","flame","star"]:
    m=re.search(r'<svg class="mk" viewBox="0 0 20 20"[^>]*>(.*?)</svg>',mk(k),re.S).group(1)
    crisp("marker-"+k,m,"0 0 20 20",64,64)
crisp("marker-crystal",'<circle cx="10" cy="10" r="10" fill="#FBECEF"/><g transform="translate(5.4,3.2) scale(.23)"><polygon points="20,2 34,16 30,42 20,54 10,42 6,16" fill="#E46C83"/><polygon points="20,2 6,16 20,24" fill="#F29AA9"/><polygon points="34,16 30,42 20,24" fill="#C8506A"/></g>',"0 0 20 20",64,64)
crisp("fire-crystal",'<polygon points="20,2 34,16 30,42 20,54 10,42 6,16" fill="#E46C83"/><polygon points="20,2 6,16 20,24" fill="#F29AA9"/><polygon points="34,16 30,42 20,24" fill="#C8506A"/><polygon points="6,16 10,42 20,54 20,24" fill="#D95F79"/>',"0 0 40 56",80,112)
crisp("ice-floe-active-tab",'<path d="M7 3.5Q16 1 27 2.2T49 3.6Q54.6 6 54.2 16Q54.8 26.5 49 28.4Q27 31.4 8 29Q1.6 26.6 2 16Q1.4 6.2 7 3.5Z" fill="#CDE7EC"/>',"0 0 56 32",168,96)
crisp("arctic-night",'<path d="M13 3.5a8.5 8.5 0 1 0 8.6 11.6A7 7 0 0 1 13 3.5z" fill="#397F91" opacity=".55"/><circle cx="24" cy="6" r="1.3" fill="#78C7D5"/><circle cx="28.5" cy="12.5" r="1" fill="#78C7D5" opacity=".8"/><circle cx="19" cy="20" r=".9" fill="#78C7D5" opacity=".6"/>',"0 0 32 24",128,96)
crisp("paw-print",'<g fill="#397F91"><ellipse cx="20" cy="30" rx="10" ry="8.5"/><ellipse cx="7" cy="19" rx="4.2" ry="5.4" transform="rotate(-20 7 19)"/><ellipse cx="15" cy="10.5" rx="4.4" ry="5.6"/><ellipse cx="25" cy="10.5" rx="4.4" ry="5.6"/><ellipse cx="33" cy="19" rx="4.2" ry="5.4" transform="rotate(20 33 19)"/></g>',"0 0 40 44",80,88)
crisp("ripple-rings",''.join(f'<circle cx="130" cy="130" r="{r}" fill="none" stroke="#78C7D5" stroke-width="1" opacity=".10"/>' for r in [34,60,86,112,138]),"0 0 260 260",260,260)
manifest=[{"name":n} for n in illus]
json.dump(manifest,open("/tmp/handoff/manifest.json","w"))
print(len(illus),"painted svgs")
