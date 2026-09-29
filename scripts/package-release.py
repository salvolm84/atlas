"""Package a built portable release with its complete corresponding source."""
import hashlib, json, subprocess, zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
version = json.loads((root / "package.json").read_text())["version"]
name = f"atlas-v{version}"
runtime = root / "release-runtime"
if not (runtime / "index.html").is_file():
    raise SystemExit("Run pnpm build:portable first.")
out = root / "release-assets"
out.mkdir(exist_ok=True)
archive = out / f"{name}-ready-to-run.zip"
tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(runtime.rglob("*")):
        if p.is_file() and p.name not in {"atlas.js", "atlas-deep-sky.css"}:
            z.write(p, f"{name}/{p.relative_to(runtime)}")
    for relative in tracked:
        if relative and (root / relative).is_file():
            z.write(root / relative, f"{name}/source/{relative}")
checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
(out / "SHA256SUMS.txt").write_text(f"{checksum}  {archive.name}\n")
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert f"{name}/source/scripts/build-portable.mjs" in z.namelist()
print(f"{archive}\nSHA-256: {checksum}\nBytes: {archive.stat().st_size}")
