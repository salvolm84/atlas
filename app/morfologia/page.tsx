"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  Aperture,
  ArrowUpRight,
  Camera,
  CircleDot,
  Clock3,
  Focus,
  Orbit,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Galaxy = {
  id: string;
  label: string;
  code: string;
  example: string;
  catalog: string;
  summary: string;
  clue: string;
  image: string;
  source: string;
  credit: string;
  distance: string;
  magnitude: string;
  angular: string;
  stars: string;
  gas: string;
  lens: string;
  integration: string;
  filters: string;
  processing: string;
  accent: string;
};

const galaxies: Galaxy[] = [
  {
    id: "spirale",
    label: "Spiral",
    code: "SA",
    example: "Andromeda Galaxy",
    catalog: "M31 · SA(s)b",
    summary:
      "A rotating disc with a central bulge and arms rich in gas, dust and young blue stars. The arms are not rigid structures: they are regions of higher density passing through the disc.",
    clue: "Look for continuous arms, H II knots and dust lanes around a bright nucleus.",
    image: "https://cdn.esahubble.org/archives/images/screen/opo9940b.jpg",
    source: "https://esahubble.org/images/opo9940b/",
    credit: "ESA/Hubble · Tony and Daphne Hallas",
    distance: "2.54 Mly",
    magnitude: "3.44",
    angular: "190′ × 60′",
    stars: "Young and old populations",
    gas: "Abundant in the disc",
    lens: "135–400 mm",
    integration: "2–6 h",
    filters: "RGB/OSC; UV/IR-cut",
    processing: "A mosaic or a wide framing; protect the core while stretching.",
    accent: "#73d7ff",
  },
  {
    id: "barred",
    label: "Barred spiral",
    code: "SB",
    example: "NGC 1365",
    catalog: "NGC 1365 · SB(s)b",
    summary:
      "A bar of stars crosses the nucleus and feeds the arms from its own ends. The bar redistributes angular momentum and can funnel gas towards the central regions.",
    clue: "Find the straight bar, then follow the two arms leaving its ends.",
    image: "https://cdn.eso.org/images/wallpaper5/eso1038a.jpg",
    source: "https://www.eso.org/public/images/eso1038a/",
    credit: "ESO/P. Grosbøl · VLT/HAWK-I, infrared",
    distance: "≈ 56 Mly",
    magnitude: "10.3",
    angular: "11.2′ × 6.2′",
    stars: "Blue in the arms, old in the bulge",
    gas: "Channelled along the bar",
    lens: "800–1500 mm",
    integration: "6–12 h",
    filters: "L-RGB or OSC; Hα optional",
    processing: "Moderate deconvolution to separate bar, inner ring and arms.",
    accent: "#9d8cff",
  },
  {
    id: "elliptical",
    label: "Elliptical",
    code: "E",
    example: "Virgo A",
    catalog: "M87 · E0–E1 pec",
    summary:
      "A system dominated by old stars, with little cold gas and almost no spiral structure. The shape runs from nearly spherical (E0) to strongly elongated (E7).",
    clue: "A smooth, regular profile, warm colour, no arms and no widespread star formation.",
    image:
      "https://science.nasa.gov/wp-content/uploads/2023/04/m87-full_jpg-jpg.webp?format=png&w=4096",
    source:
      "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/",
    credit: "NASA, ESA and the Hubble Heritage Team",
    distance: "≈ 54 Mly",
    magnitude: "8.6",
    angular: "7.2′ × 6.8′",
    stars: "Predominantly old",
    gas: "Little cold gas",
    lens: "800–1600 mm",
    integration: "4–10 h",
    filters: "L-RGB o OSC broadband",
    processing: "A gentle stretch keeps the halo gradient; the jet needs high resolution.",
    accent: "#ffc879",
  },
  {
    id: "lenticular",
    label: "Lenticular",
    code: "S0",
    example: "Sombrero Galaxy",
    catalog: "M104 · SA(s)a / S0",
    summary:
      "A transitional form: it has a disc and a bulge but no well-developed arms. M104 is a borderline case, often described as an early spiral with a lenticular appearance.",
    clue: "Look for a dominant bulge, a regular disc and a sharp dust lane, but faint arms.",
    image: "https://cdn.esahubble.org/archives/images/wallpaper5/opo0328a.jpg",
    source: "https://esahubble.org/images/opo0328a/",
    credit: "NASA/ESA · Hubble Heritage Team",
    distance: "≈ 30 Mly",
    magnitude: "8.0",
    angular: "8.7′ × 3.5′",
    stars: "Old, in the large bulge",
    gas: "Limited, dust in the disc",
    lens: "800–1500 mm",
    integration: "4–8 h",
    filters: "L-RGB o OSC broadband",
    processing: "Mask the core and raise local contrast on the dust lane.",
    accent: "#ff9f7d",
  },
  {
    id: "irregular",
    label: "Irregular",
    code: "Irr",
    example: "Cigar Galaxy",
    catalog: "M82 · I0 starburst",
    summary:
      "It follows no ordered symmetry. In M82, interaction with M81 triggered ferocious star formation and a galactic wind emerging from the plane of the disc.",
    clue: "An asymmetric shape, intense H II regions, chaotic dust, and jets or filaments outside the disc.",
    image: "https://cdn.esahubble.org/archives/images/screen/heic0604a.jpg",
    source: "https://esahubble.org/images/heic0604a/",
    credit: "NASA, ESA and the Hubble Heritage Team",
    distance: "≈ 12 Mly",
    magnitude: "8.4",
    angular: "11.2′ × 4.3′",
    stars: "Extreme star formation",
    gas: "An Hα-rich wind",
    lens: "500–1200 mm",
    integration: "3–8 h",
    filters: "RGB/OSC + Hα or dual-band",
    processing: "Blend Hα carefully to bring out the filaments without saturating the core.",
    accent: "#ff6b81",
  },
  {
    id: "interacting",
    label: "Interacting",
    code: "Pec",
    example: "Antennae Galaxies",
    catalog: "NGC 4038/39 · Arp 244",
    summary:
      "Two galaxies deformed by each other's gravity. Tidal tails, bridges of matter and starbursts show a merger in progress, one of the main engines of galactic evolution.",
    clue: "Look for double nuclei, distorted arcs, tidal tails and blue or pink regions of new star formation.",
    image: "https://supernova.eso.org/static/archives/exhibitionimages/screen/antennae_hst.jpg",
    source: "https://supernova.eso.org/exhibition/images/antennae_hst/",
    credit: "ESA/Hubble and NASA",
    distance: "≈ 45 Mly",
    magnitude: "10.9",
    angular: "5.2′ × 3.1′",
    stars: "Compression-driven starburst",
    gas: "Tails and disturbed clouds",
    lens: "1000–2000 mm",
    integration: "8–16 h",
    filters: "L-RGB/OSC; Hα useful",
    processing: "A dark sky and a deep stretch are needed to recover the faint tidal tails.",
    accent: "#7fffd0",
  },
];

const statIcons = [Orbit, Sparkles, Focus];

export default function Home() {
  const [selectedId, setSelectedId] = useState("spirale");
  const selected = useMemo(
    () => galaxies.find((g) => g.id === selectedId) ?? galaxies[0],
    [selectedId],
  );

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="sky-noise" aria-hidden="true" />
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-3" aria-label="Galaxy Atlas, top of page">
            <span className="brand-mark">
              <Orbit aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">Galaxy Atlas</span>
          </a>
          <div className="hidden items-center gap-5 text-sm text-slate-400 sm:flex">
            <span>Hubble classification</span>
            <span className="h-1 w-1 rounded-full bg-cyan-300" />
            <span>Astrophotography guide</span>
          </div>
        </div>
      </header>

      <section
        id="top"
        className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-9 sm:px-8 lg:px-12 lg:pt-12"
      >
        <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end">
          <div>
            <p className="eyebrow">Morphology · structure · acquisition</p>
            <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.6rem,6vw,6.6rem)] font-semibold leading-[0.88] tracking-[-0.055em]">
              Reading a galaxy<span className="block text-slate-500">from its light.</span>
            </h1>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-300 lg:pb-1">
            Pick a morphological family to learn its structure, compare a real example and plan an
            imaging session.
          </p>
        </div>

        <Tabs value={selectedId} onValueChange={setSelectedId} className="gap-0">
          <div className="scrollbar-none -mx-5 overflow-x-auto px-5 pb-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
            <TabsList
              aria-label="Galaxy types"
              className="h-auto min-w-max gap-2 bg-transparent p-0"
            >
              {galaxies.map((g) => (
                <TabsTrigger
                  key={g.id}
                  value={g.id}
                  className="h-11 flex-none rounded-full border border-white/10 bg-white/[0.035] px-4 text-[0.9rem] text-slate-300 shadow-none data-[state=active]:border-cyan-300/60 data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950"
                >
                  <span className="font-mono text-xs opacity-70">{g.code}</span>
                  {g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div
          className="galaxy-stage"
          style={{ "--galaxy-accent": selected.accent } as CSSProperties}
        >
          <div className="relative min-h-[420px] overflow-hidden lg:min-h-[570px]">
            {/* Photographs are hotlinked from ESA/NASA and the page also ships in
                the portable `file://` release, where next/image has no optimizer
                to call. A plain <img> is the correct element here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={selected.id}
              src={selected.image}
              alt={`${selected.example}, an example of a ${selected.label.toLowerCase()} galaxy`}
              className="galaxy-image"
            />
            <div className="image-scrim" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-7">
              <span className="classification-badge">{selected.code}</span>
              <a className="source-link" href={selected.source} target="_blank" rel="noreferrer">
                Fonte immagine <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">
                {selected.catalog}
              </p>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
                {selected.example}
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">{selected.credit}</p>
            </div>
          </div>

          <article className="flex flex-col bg-[#0c1324]/95 p-5 sm:p-8 lg:p-10">
            <div>
              <p className="eyebrow">Morphological profile</p>
              <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {selected.label}
              </h3>
              <p className="mt-4 leading-7 text-slate-300">{selected.summary}</p>
            </div>
            <div className="my-7 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
              {[
                [selected.distance, "Distance"],
                [selected.magnitude, "Apparent mag."],
                [selected.angular, "Angular size"],
              ].map(([value, label], index) => {
                const Icon = statIcons[index];
                return (
                  <div key={label} className="bg-[#0c1324] p-3 sm:p-4">
                    <Icon className="mb-3 h-4 w-4 text-cyan-300" aria-hidden="true" />
                    <p className="font-display text-base font-semibold text-white sm:text-lg">
                      {value}
                    </p>
                    <p className="mt-1 text-[0.7rem] uppercase tracking-wider text-slate-500 sm:text-xs">
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-start gap-3">
                <CircleDot
                  className="mt-1 h-4 w-4 shrink-0 text-[var(--galaxy-accent)]"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-white">How to recognise it</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{selected.clue}</p>
                </div>
              </div>
            </div>
            <dl className="mt-auto grid gap-3 pt-7 text-sm">
              <div className="fact-row">
                <dt>Stellar population</dt>
                <dd>{selected.stars}</dd>
              </div>
              <div className="fact-row">
                <dt>Gas and dust</dt>
                <dd>{selected.gas}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[0.75fr_1.25fr]">
          <div className="border-b border-white/10 px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
            <p className="eyebrow">Evolutionary map</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              The Hubble sequence is not a timeline.
            </h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-400">
              The famous “tuning fork” orders galaxies by appearance, not by age. Real
              transformations depend on gas, mass, environment, mergers and star formation.
            </p>
          </div>
          <div
            className="hubble-map px-5 py-10 sm:px-8 lg:px-12 lg:py-14"
            aria-label="Simplified diagram of the Hubble classification"
          >
            <div className="hubble-node hubble-start">
              <strong>E0–E7</strong>
              <span>Ellittiche</span>
            </div>
            <div className="hubble-fork" aria-hidden="true" />
            <div className="hubble-branch">
              <div className="hubble-node">
                <strong>S0</strong>
                <span>Lenticolari</span>
              </div>
              <div className="hubble-node">
                <strong>Sa → Sc</strong>
                <span>Spirali</span>
              </div>
            </div>
            <div className="hubble-branch">
              <div className="hubble-node">
                <strong>S0</strong>
                <span>Lenticolari</span>
              </div>
              <div className="hubble-node">
                <strong>SBa → SBc</strong>
                <span>Barrate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1500px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Acquisition sheet</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Pianifica lo scatto di {selected.example}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-500">
            Valori orientativi per un setup deep-sky amatoriale; seeing, cielo e sensore possono
            cambiare radicalmente il risultato.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Focus,
              title: "Useful focal length",
              value: selected.lens,
              note: "Match the sampling to the seeing",
            },
            {
              icon: Clock3,
              title: "Integration",
              value: selected.integration,
              note: "More time for faint structure",
            },
            {
              icon: Aperture,
              title: "Filters",
              value: selected.filters,
              note: "Broadband under dark skies",
            },
            { icon: Camera, title: "Processing", value: "Workflow", note: selected.processing },
          ].map(({ icon: Icon, title, value, note }) => (
            <article key={title} className="tech-card">
              <Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {title}
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">{note}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>A visual atlas for curious astrophotographers.</p>
          <p>Rounded figures · images credited to their respective missions.</p>
        </div>
      </footer>
    </main>
  );
}
