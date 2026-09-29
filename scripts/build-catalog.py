"""Derive the atlas subset from Stellarium's documented DSO TSV (GPL-2.0-or-later).
Usage: python scripts/build-catalog.py INPUT_TSV OUTPUT_JSON
No astronomical values are inferred from object names.
"""
import csv, json, sys
from pathlib import Path

rows = [r for r in csv.reader(open(sys.argv[1]), delimiter="\t") if len(r) >= 45 and not r[0].startswith("#")]
extra_ngc = {281, 891, 1300, 1365, 1499, 2024, 2237, 2238, 2244, 2264, 2359, 3628, 4038, 4039, 4565, 4725, 6334, 6357, 6888, 6992, 6960, 7000, 7023, 7635}
extra_ic = {405, 410, 434, 1396, 1805, 1848, 2118, 5070, 5146}
extra_sh = {101, 129, 132, 155, 240, 274, 275, 308}
names = {
 "M1":"Crab", "M8":"Lagoon", "M16":"Eagle", "M17":"Omega", "M20":"Trifid",
 "M27":"Dumbbell", "M31":"Andromeda", "M32":"Andromeda companion", "M33":"Triangulum",
 "M42":"Great Orion Nebula", "M43":"De Mairan's Nebula", "M45":"Pleiades",
 "M51":"Whirlpool", "M57":"Ring", "M63":"Sunflower", "M64":"Black Eye",
 "M76":"Little Dumbbell", "M78":"Reflection nebula", "M81":"Bode's Galaxy", "M82":"Cigar",
 "M83":"Southern Pinwheel", "M97":"Owl", "M101":"Pinwheel", "M104":"Sombrero",
 "M102":"Spindle", "M110":"Andromeda companion", "M13":"Great Hercules Cluster",
 "M44":"Beehive", "M40":"Winnecke 4 \u00b7 optical double", "M24":"Sagittarius Star Cloud",
 "C4":"Iris", "C9":"Cave", "C14":"Perseus Double Cluster", "C19":"Cocoon",
 "C20":"North America", "C27":"Crescent", "C33":"Eastern Veil", "C34":"Western Veil",
 "C39":"Eskimo", "C49":"Rosette", "C63":"Helix", "C65":"Sculptor", "C77":"Centaurus A",
 "C80":"Omega Centauri", "C92":"Carina", "C99":"Coalsack",
 "NGC281":"Pacman", "NGC1499":"California", "NGC2024":"Flame", "NGC2237":"Rosette",
 "NGC2264":"Cone and Christmas Tree", "NGC2359":"Thor's Helmet", "NGC3628":"Hamburger",
 "NGC4038":"Antennae", "NGC4039":"Antennae \u00b7 southern component", "NGC6334":"Cat's Paw",
 "NGC6357":"Lobster", "NGC7635":"Bubble", "IC405":"Flaming Star",
 "IC410":"Tadpoles", "IC434":"Veil behind the Horsehead", "IC1396":"Elephant's Trunk complex",
 "IC1805":"Heart", "IC1848":"Soul", "IC2118":"Witch Head", "IC5070":"Pelican",
 "B33":"Horsehead", "Sh2-101":"Tulip", "Sh2-129":"Flying Bat",
 "Sh2-132":"Lion", "Sh2-240":"Spaghetti", "Sh2-274":"Jellyfish", "Sh2-308":"Dolphin",
}
out = []
for r in rows:
    nums = [int(r[i] or 0) for i in [16,17,18,19,20,21]]
    ngc,ic,m,c,b,sh = nums
    if not (m or c or ngc in extra_ngc or ic in extra_ic or sh in extra_sh or b==33):
        continue
    aliases = []
    for prefix,n in zip(["NGC","IC","M","C","B","Sh2-"], nums):
        if n: aliases.append(f"{prefix}{n}")
    for index,prefix in [(22,"vdB"),(23,"RCW"),(24,"LDN"),(25,"LBN"),(28,"PGC"),(29,"UGC"),(31,"Arp")]:
        if r[index] and int(r[index]): aliases.append(f"{prefix}{int(r[index])}")
    key = f"M{m}" if m else f"C{c}" if c else (f"NGC{ngc}" if ngc else f"IC{ic}" if ic else f"B{b}" if b else f"Sh2-{sh}")
    rawtype = r[5]
    group = "galaxy" if rawtype in ["Gx","G","AGx","IG","RG"] else "cluster" if rawtype in ["OC","GC"] else "other" if rawtype in ["*","**","CL","SC","SA"] else "nebula"
    kind = {"Gx":"Galaxy","G":"Galaxy","AGx":"Active galaxy","IG":"Interacting galaxies","GC":"Globular cluster","OC":"Open cluster","C+N":"Cluster with nebulosity","HII":"Emission nebula · H II","EN":"Emission nebula","PN":"Planetary nebula","SNR":"Supernova remnant","RN":"Reflection nebula","DN":"Dark nebula","ISM":"Interstellar nebulosity","CL":"Star cloud","*":"Optical double","NB":"Nebula","BN":"Bright nebula"}.get(rawtype,"Nebulosity")
    distance = float(r[14])*3261.56 or None
    source = "Stellarium DSO 3.23"
    sourceUrl = "https://github.com/Stellarium/stellarium/blob/master/nebulae/default/catalog.txt"
    if m==65:
        distance=35000000; source="NASA/Hubble"; sourceUrl="https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-65/"
    if c==68:
        distance=400; kind="Reflection nebula"; rawtype="RN"; source="NASA/Hubble"; sourceUrl="https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-68/"
    v=float(r[4]); bv=float(r[3])
    magnitude=v if v<90 else bv if bv<90 else None
    # Dark-nebula catalog values can encode opacity, not integrated magnitude.
    if rawtype=="DN": magnitude=None
    major=float(r[7]) or None; minor=float(r[8]) or major
    out.append(dict(id="dso-"+r[0],key=key,name=names.get(key) or next((names[a] for a in aliases if a in names),key),aliases=aliases,ra=float(r[1]),dec=float(r[2]),type=rawtype,kind=kind,group=group,morphology=r[6],major=major,minor=minor,pa=float(r[9]),mag=magnitude,band="V" if v<90 else "B" if bv<90 else None,distance=distance,distanceSource=source,distanceUrl=sourceUrl,messier=m or None,caldwell=c or None))

# C14 denotes both components of the Double Cluster. Preserve both, with clear labels.
for o in out:
    if o["caldwell"]==14:
        component=next(a for a in o["aliases"] if a.startswith("NGC"))
        o["key"]="C14 · "+component; o["name"]="Double Cluster · "+component
    # M24 is a star cloud, not a physical bound cluster.
    if o["messier"]==24: o["group"]="other"; o["kind"]="Star cloud"
out.sort(key=lambda o: (0,o["messier"]) if o["messier"] else (1,o["caldwell"]) if o["caldwell"] else (2,o["key"]))
assert {o["messier"] for o in out if o["messier"]}==set(range(1,111))
assert {o["caldwell"] for o in out if o["caldwell"]}==set(range(1,110))
assert len({o["id"] for o in out})==len(out)
Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
print(json.dumps({"objects":len(out),"Messier":110,"Caldwell":109,"unknown_distances":[o["key"] for o in out if not o["distance"]],"groups":{g:sum(o["group"]==g for o in out) for g in ["galaxy","nebula","cluster","other"]}},ensure_ascii=False))
