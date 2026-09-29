"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Aperture, ArrowUpRight, Camera, CircleDot, Clock3, Focus, Orbit, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Galaxy = {
  id: string; label: string; code: string; example: string; catalog: string;
  summary: string; clue: string; image: string; source: string; credit: string;
  distance: string; magnitude: string; angular: string; stars: string; gas: string;
  lens: string; integration: string; filters: string; processing: string; accent: string;
};

const galaxies: Galaxy[] = [
  {
    id: "spirale", label: "Spirale", code: "SA", example: "Galassia di Andromeda", catalog: "M31 · SA(s)b",
    summary: "Un disco rotante con rigonfiamento centrale e bracci ricchi di gas, polveri e giovani stelle blu. I bracci non sono strutture rigide: sono regioni di maggiore densità che attraversano il disco.",
    clue: "Cerca bracci continui, nodi H II e bande di polvere attorno a un nucleo luminoso.",
    image: "https://cdn.esahubble.org/archives/images/screen/opo9940b.jpg", source: "https://esahubble.org/images/opo9940b/", credit: "ESA/Hubble · Tony e Daphne Hallas",
    distance: "2,54 Mly", magnitude: "3,44", angular: "190′ × 60′", stars: "Popolazioni giovani e antiche", gas: "Abbondante nel disco",
    lens: "135–400 mm", integration: "2–6 h", filters: "RGB/OSC; UV/IR-cut", processing: "Mosaico o inquadratura larga; proteggi il nucleo durante lo stretch.", accent: "#73d7ff",
  },
  {
    id: "barrata", label: "Spirale barrata", code: "SB", example: "NGC 1365", catalog: "NGC 1365 · SB(s)b",
    summary: "Una barra di stelle attraversa il nucleo e alimenta i bracci dalle proprie estremità. La barra redistribuisce momento angolare e può convogliare gas verso le regioni centrali.",
    clue: "Individua la barra lineare, poi segui i due bracci che partono dalle sue estremità.",
    image: "https://cdn.eso.org/images/wallpaper5/eso1038a.jpg", source: "https://www.eso.org/public/images/eso1038a/", credit: "ESO/P. Grosbøl · VLT/HAWK-I, infrarosso",
    distance: "≈ 56 Mly", magnitude: "10,3", angular: "11,2′ × 6,2′", stars: "Blu nei bracci, antiche nel bulge", gas: "Canalizzato lungo la barra",
    lens: "800–1500 mm", integration: "6–12 h", filters: "L-RGB o OSC; Hα opzionale", processing: "Deconvoluzione moderata per separare barra, anello interno e bracci.", accent: "#9d8cff",
  },
  {
    id: "ellittica", label: "Ellittica", code: "E", example: "Virgo A", catalog: "M87 · E0–E1 pec",
    summary: "Un sistema dominato da stelle vecchie, con poco gas freddo e quasi nessuna struttura a spirale. La forma va da quasi sferica (E0) a molto allungata (E7).",
    clue: "Profilo liscio e regolare, colore caldo, assenza di bracci e formazione stellare diffusa.",
    image: "https://science.nasa.gov/wp-content/uploads/2023/04/m87-full_jpg-jpg.webp?format=png&w=4096", source: "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-87/", credit: "NASA, ESA e Hubble Heritage Team",
    distance: "≈ 54 Mly", magnitude: "8,6", angular: "7,2′ × 6,8′", stars: "Prevalentemente antiche", gas: "Poco gas freddo",
    lens: "800–1600 mm", integration: "4–10 h", filters: "L-RGB o OSC broadband", processing: "Stretch dolce per mantenere il gradiente dell'alone; il jet richiede alta risoluzione.", accent: "#ffc879",
  },
  {
    id: "lenticolare", label: "Lenticolare", code: "S0", example: "Galassia Sombrero", catalog: "M104 · SA(s)a / S0",
    summary: "Una forma di transizione: possiede disco e bulge, ma non bracci ben sviluppati. M104 è un caso di confine, spesso descritta come spirale precoce con aspetto lenticolare.",
    clue: "Cerca un bulge dominante, un disco regolare e una netta banda di polvere, ma bracci poco evidenti.",
    image: "https://cdn.esahubble.org/archives/images/wallpaper5/opo0328a.jpg", source: "https://esahubble.org/images/opo0328a/", credit: "NASA/ESA · Hubble Heritage Team",
    distance: "≈ 30 Mly", magnitude: "8,0", angular: "8,7′ × 3,5′", stars: "Antiche nel grande bulge", gas: "Limitato, polveri nel disco",
    lens: "800–1500 mm", integration: "4–8 h", filters: "L-RGB o OSC broadband", processing: "Maschera il nucleo e aumenta il contrasto locale sulla banda di polvere.", accent: "#ff9f7d",
  },
  {
    id: "irregolare", label: "Irregolare", code: "Irr", example: "Galassia Sigaro", catalog: "M82 · I0 starburst",
    summary: "Non segue una simmetria ordinata. In M82 l'interazione con M81 ha innescato una violentissima formazione stellare e un vento galattico che emerge dal piano del disco.",
    clue: "Forma asimmetrica, regioni H II intense, polveri caotiche e getti o filamenti fuori dal disco.",
    image: "https://cdn.esahubble.org/archives/images/screen/heic0604a.jpg", source: "https://esahubble.org/images/heic0604a/", credit: "NASA, ESA e Hubble Heritage Team",
    distance: "≈ 12 Mly", magnitude: "8,4", angular: "11,2′ × 4,3′", stars: "Formazione stellare estrema", gas: "Vento ricco di Hα",
    lens: "500–1200 mm", integration: "3–8 h", filters: "RGB/OSC + Hα o dual-band", processing: "Integra Hα con cautela per evidenziare i filamenti senza saturare il nucleo.", accent: "#ff6b81",
  },
  {
    id: "interagente", label: "Interagente", code: "Pec", example: "Galassie Antenne", catalog: "NGC 4038/39 · Arp 244",
    summary: "Due galassie deformate dalla reciproca gravità. Code mareali, ponti di materia e starburst mostrano una fusione in corso, uno dei principali motori dell'evoluzione galattica.",
    clue: "Cerca nuclei doppi, archi deformati, code mareali e regioni blu o rosate di nuova formazione stellare.",
    image: "https://supernova.eso.org/static/archives/exhibitionimages/screen/antennae_hst.jpg", source: "https://supernova.eso.org/exhibition/images/antennae_hst/", credit: "ESA/Hubble e NASA",
    distance: "≈ 45 Mly", magnitude: "10,9", angular: "5,2′ × 3,1′", stars: "Starburst da compressione", gas: "Code e nubi disturbate",
    lens: "1000–2000 mm", integration: "8–16 h", filters: "L-RGB/OSC; Hα utile", processing: "Servono cielo scuro e stretch profondo per recuperare le deboli code mareali.", accent: "#7fffd0",
  },
];

const statIcons = [Orbit, Sparkles, Focus];

export default function Home() {
  const [selectedId, setSelectedId] = useState("spirale");
  const selected = useMemo(() => galaxies.find((g) => g.id === selectedId) ?? galaxies[0], [selectedId]);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="sky-noise" aria-hidden="true" />
      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-3" aria-label="Atlante delle Galassie, inizio pagina">
            <span className="brand-mark"><Orbit aria-hidden="true" /></span>
            <span className="font-display text-lg font-semibold tracking-tight">Atlante delle Galassie</span>
          </a>
          <div className="hidden items-center gap-5 text-sm text-slate-400 sm:flex">
            <span>Classificazione di Hubble</span><span className="h-1 w-1 rounded-full bg-cyan-300" /><span>Guida astrofotografica</span>
          </div>
        </div>
      </header>

      <section id="top" className="relative z-10 mx-auto max-w-[1500px] px-5 pb-10 pt-9 sm:px-8 lg:px-12 lg:pt-12">
        <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-end">
          <div>
            <p className="eyebrow">Morfologia · struttura · acquisizione</p>
            <h1 className="mt-3 max-w-4xl font-display text-[clamp(2.6rem,6vw,6.6rem)] font-semibold leading-[0.88] tracking-[-0.055em]">
              Leggere una galassia<span className="block text-slate-500">dalla sua luce.</span>
            </h1>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-300 lg:pb-1">
            Seleziona una famiglia morfologica per riconoscerne la struttura, confrontare un esempio reale e preparare una sessione di astrofotografia.
          </p>
        </div>

        <Tabs value={selectedId} onValueChange={setSelectedId} className="gap-0">
          <div className="scrollbar-none -mx-5 overflow-x-auto px-5 pb-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
            <TabsList aria-label="Tipologie di galassie" className="h-auto min-w-max gap-2 bg-transparent p-0">
              {galaxies.map((g) => (
                <TabsTrigger key={g.id} value={g.id} className="h-11 flex-none rounded-full border border-white/10 bg-white/[0.035] px-4 text-[0.9rem] text-slate-300 shadow-none data-[state=active]:border-cyan-300/60 data-[state=active]:bg-cyan-300 data-[state=active]:text-slate-950">
                  <span className="font-mono text-xs opacity-70">{g.code}</span>{g.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        <div className="galaxy-stage" style={{ "--galaxy-accent": selected.accent } as CSSProperties}>
          <div className="relative min-h-[420px] overflow-hidden lg:min-h-[570px]">
            <img key={selected.id} src={selected.image} alt={`${selected.example}, esempio di galassia ${selected.label.toLowerCase()}`} className="galaxy-image" />
            <div className="image-scrim" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5 sm:p-7">
              <span className="classification-badge">{selected.code}</span>
              <a className="source-link" href={selected.source} target="_blank" rel="noreferrer">Fonte immagine <ArrowUpRight aria-hidden="true" /></a>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">{selected.catalog}</p>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">{selected.example}</h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">{selected.credit}</p>
            </div>
          </div>

          <article className="flex flex-col bg-[#0c1324]/95 p-5 sm:p-8 lg:p-10">
            <div><p className="eyebrow">Profilo morfologico</p><h3 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{selected.label}</h3><p className="mt-4 leading-7 text-slate-300">{selected.summary}</p></div>
            <div className="my-7 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
              {[[selected.distance, "Distanza"], [selected.magnitude, "Mag. apparente"], [selected.angular, "Dimensione"]].map(([value, label], index) => {
                const Icon = statIcons[index];
                return <div key={label} className="bg-[#0c1324] p-3 sm:p-4"><Icon className="mb-3 h-4 w-4 text-cyan-300" aria-hidden="true" /><p className="font-display text-base font-semibold text-white sm:text-lg">{value}</p><p className="mt-1 text-[0.7rem] uppercase tracking-wider text-slate-500 sm:text-xs">{label}</p></div>;
              })}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-start gap-3"><CircleDot className="mt-1 h-4 w-4 shrink-0 text-[var(--galaxy-accent)]" aria-hidden="true" /><div><p className="text-sm font-semibold text-white">Come riconoscerla</p><p className="mt-1 text-sm leading-6 text-slate-400">{selected.clue}</p></div></div>
            </div>
            <dl className="mt-auto grid gap-3 pt-7 text-sm">
              <div className="fact-row"><dt>Popolazione stellare</dt><dd>{selected.stars}</dd></div>
              <div className="fact-row"><dt>Gas e polveri</dt><dd>{selected.gas}</dd></div>
            </dl>
          </article>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[0.75fr_1.25fr]">
          <div className="border-b border-white/10 px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
            <p className="eyebrow">Mappa evolutiva</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">La sequenza di Hubble non è una timeline.</h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-400">Il celebre “diapason” ordina l'aspetto delle galassie, non la loro età. Le trasformazioni reali dipendono da gas, massa, ambiente, fusioni e formazione stellare.</p>
          </div>
          <div className="hubble-map px-5 py-10 sm:px-8 lg:px-12 lg:py-14" aria-label="Schema semplificato della classificazione di Hubble">
            <div className="hubble-node hubble-start"><strong>E0–E7</strong><span>Ellittiche</span></div><div className="hubble-fork" aria-hidden="true" />
            <div className="hubble-branch"><div className="hubble-node"><strong>S0</strong><span>Lenticolari</span></div><div className="hubble-node"><strong>Sa → Sc</strong><span>Spirali</span></div></div>
            <div className="hubble-branch"><div className="hubble-node"><strong>S0</strong><span>Lenticolari</span></div><div className="hubble-node"><strong>SBa → SBc</strong><span>Barrate</span></div></div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1500px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="eyebrow">Scheda di acquisizione</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Pianifica lo scatto di {selected.example}</h2></div>
          <p className="max-w-md text-sm leading-6 text-slate-500">Valori orientativi per un setup deep-sky amatoriale; seeing, cielo e sensore possono cambiare radicalmente il risultato.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Focus, title: "Focale utile", value: selected.lens, note: "Adatta il campionamento al seeing" },
            { icon: Clock3, title: "Integrazione", value: selected.integration, note: "Più tempo per strutture deboli" },
            { icon: Aperture, title: "Filtri", value: selected.filters, note: "Broadband sotto cieli scuri" },
            { icon: Camera, title: "Sviluppo", value: "Workflow", note: selected.processing },
          ].map(({ icon: Icon, title, value, note }) => <article key={title} className="tech-card"><Icon className="h-5 w-5 text-cyan-300" aria-hidden="true" /><p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p><p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p><p className="mt-3 text-sm leading-6 text-slate-400">{note}</p></article>)}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-7 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Atlante visuale per astrofotografi curiosi.</p><p>Dati arrotondati · immagini accreditate alle rispettive missioni.</p></div>
      </footer>
    </main>
  );
}
