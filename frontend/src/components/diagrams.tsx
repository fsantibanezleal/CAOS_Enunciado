/**
 * Hand-authored teaching diagrams.
 *
 * Every figure in the doc pages lives here, drawn as inline SVG against the shell's `dg-*` classes
 * so it follows the theme with no script and no second asset. Inline is deliberate: an SVG loaded
 * through an `<img>` is a separate document and cannot read the page's custom properties, so a
 * themed figure delivered that way renders black on black in one of the two themes.
 *
 * They take `lang` rather than dual-tagging every label, because these are React components on a
 * page that already knows its language. The `l-en` / `l-es` pairing in ADR-0058 exists for the
 * architecture modal, whose SVGs are strings loaded outside React.
 */

type Lang = "en" | "es";

/** The arrowhead marker, defined once per figure that needs it. */
function Arrow({ id }: { id: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" className="dg-arrowhead" />
      </marker>
    </defs>
  );
}

/* ------------------------------------------------------------------ pipeline */

/** The end-to-end pipeline: statement in, four verdicts out. */
export function PipelineDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const stages: { title: string; sub: string }[] = es
    ? [
        { title: "Enunciado", sub: "texto libre" },
        { title: "Documento tipado", sub: "planteo.Problem" },
        { title: "Modelo emitido", sub: "Pyomo / LP" },
        { title: "Solucion", sub: "HiGHS" },
      ]
    : [
        { title: "Statement", sub: "free text" },
        { title: "Typed document", sub: "planteo.Problem" },
        { title: "Emitted model", sub: "Pyomo / LP" },
        { title: "Solution", sub: "HiGHS" },
      ];

  const layers = es
    ? ["ejecutable", "estructural", "propiedad", "juez (etiquetado)"]
    : ["executable", "structural", "property", "judge (labelled)"];

  return (
    <svg className="fig-svg wide" viewBox="0 0 760 290" role="img"
      aria-label={es ? "El proceso completo, del enunciado a los cuatro veredictos" : "The end-to-end pipeline, statement to four verdicts"}>
      <Arrow id="pipe-arrow" />

      {stages.map((stage, index) => {
        const x = 8 + index * 190;
        return (
          <g key={stage.title}>
            <rect x={x} y={20} width={162} height={54} rx="8" className={`dg-box${index === 1 ? " accent" : ""}`} />
            <text x={x + 81} y={42} textAnchor="middle" className={`dg-box-title${index === 1 ? " accent" : ""}`}>
              {stage.title}
            </text>
            <text x={x + 81} y={60} textAnchor="middle" className="dg-box-sub">
              {stage.sub}
            </text>
            {index < stages.length - 1 && (
              <line
                x1={x + 164}
                y1={47}
                x2={x + 186}
                y2={47}
                className="dg-edge"
                markerEnd="url(#pipe-arrow)"
              />
            )}
          </g>
        );
      })}

      {/* The reference formalization, which is what the structural layer compares against. */}
      <rect x={198} y={112} width={162} height={46} rx="8" className="dg-box good" />
      <text x={279} y={132} textAnchor="middle" className="dg-box-title">
        {es ? "Referencia" : "Reference"}
      </text>
      <text x={279} y={148} textAnchor="middle" className="dg-box-sub">
        {es ? "escrita a mano" : "authored by hand"}
      </text>
      <line x1={279} y1={110} x2={279} y2={78} className="dg-edge" markerEnd="url(#pipe-arrow)" />

      {/* The four verdict layers. */}
      {layers.map((layer, index) => {
        const x = 8 + index * 190;
        return (
          <g key={layer}>
            <rect
              x={x}
              y={198}
              width={162}
              height={40}
              rx="8"
              className={index === 3 ? "dg-box" : "dg-box accent"}
              opacity={index === 3 ? 0.7 : 1}
            />
            <text x={x + 81} y={223} textAnchor="middle" className="dg-box-sub">
              {layer}
            </text>
          </g>
        );
      })}

      <line x1={380} y1={162} x2={380} y2={194} className="dg-edge" markerEnd="url(#pipe-arrow)" />
      <text x={392} y={182} className="dg-edge-label">
        {es ? "se comparan" : "compared"}
      </text>

      <text x={380} y={262} textAnchor="middle" className="dg-note">
        {es
          ? "Los cuatro veredictos se informan por separado. Nunca se promedian en un solo numero."
          : "The four verdicts are reported separately. They are never averaged into one number."}
      </text>
      <text x={380} y={280} textAnchor="middle" className="dg-note">
        {es
          ? "La distancia entre el primero y los otros dos ES la medicion."
          : "The distance between the first and the next two IS the measurement."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------- oracle layers */

/** What each layer can conclude, and what it cannot. */
export function OracleLayersDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const rows = es
    ? [
        { name: "Ejecutable", can: "corrio, resolvio, compilo", cannot: "no dice nada sobre el significado", tone: "dg-box" },
        { name: "Estructural", can: "formas canonicas iguales => equivalentes", cannot: "formas distintas no prueban diferencia", tone: "dg-box accent" },
        { name: "Propiedad", can: "una relacion violada => refutado", cannot: "todas se mantienen no prueba correccion", tone: "dg-box accent" },
        { name: "Juez", can: "agregado calibrado, para comparar", cannot: "NO es un oraculo de equivalencia", tone: "dg-box" },
      ]
    : [
        { name: "Executable", can: "it ran, it solved, it compiled", cannot: "says nothing about meaning", tone: "dg-box" },
        { name: "Structural", can: "equal canonical forms => equivalent", cannot: "different forms do not prove difference", tone: "dg-box accent" },
        { name: "Property", can: "one violated relation => refuted", cannot: "all holding does not prove correct", tone: "dg-box accent" },
        { name: "Judge", can: "calibrated aggregate, for comparison", cannot: "NOT an equivalence oracle", tone: "dg-box" },
      ];

  return (
    <svg className="fig-svg wide" viewBox="0 0 760 246" role="img"
      aria-label={es ? "Lo que cada capa puede concluir" : "What each layer can conclude"}>
      <text x={20} y={16} className="dg-axis-label">{es ? "capa" : "layer"}</text>
      <text x={190} y={16} className="dg-axis-label">{es ? "concluye" : "concludes"}</text>
      <text x={470} y={16} className="dg-axis-label">{es ? "no concluye" : "does not conclude"}</text>

      {rows.map((row, index) => {
        const y = 28 + index * 52;
        return (
          <g key={row.name}>
            <rect x={12} y={y} width={160} height={42} rx="8" className={row.tone} opacity={index === 3 ? 0.7 : 1} />
            <text x={92} y={y + 26} textAnchor="middle" className="dg-box-title">
              {row.name}
            </text>
            <rect x={184} y={y} width={272} height={42} rx="6" className="dg-box" opacity="0.5" />
            <text x={196} y={y + 26} className="dg-box-sub">
              {row.can}
            </text>
            <rect x={468} y={y} width={280} height={42} rx="6" className="dg-box" opacity="0.5" />
            <text x={480} y={y + 26} className="dg-box-sub" style={{ fill: "var(--color-bad)" }}>
              {row.cannot}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------- refutation asymmetry */

/** The asymmetry: which comparisons conclude, and in which direction. */
export function RefutationDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const cases = es
    ? [
        { premise: "formas canonicas iguales", verdict: "EQUIVALENTE", good: true },
        { premise: "optimos distintos", verdict: "REFUTADO", good: true },
        { premise: "optimos iguales", verdict: "no concluye", good: false },
        { premise: "formas distintas", verdict: "no concluye", good: false },
      ]
    : [
        { premise: "canonical forms equal", verdict: "EQUIVALENT", good: true },
        { premise: "different optima", verdict: "REFUTED", good: true },
        { premise: "matching optima", verdict: "concludes nothing", good: false },
        { premise: "different forms", verdict: "concludes nothing", good: false },
      ];

  return (
    <svg className="fig-svg wide" viewBox="0 0 700 240" role="img"
      aria-label={es ? "Que comparaciones concluyen" : "Which comparisons conclude"}>
      <Arrow id="refute-arrow" />
      {cases.map((item, index) => {
        const y = 20 + index * 54;
        return (
          <g key={item.premise}>
            <rect x={8} y={y} width={250} height={40} rx="8" className="dg-box" />
            <text x={133} y={y + 25} textAnchor="middle" className="dg-box-sub">
              {item.premise}
            </text>
            <line x1={262} y1={y + 20} x2={330} y2={y + 20} className="dg-edge" markerEnd="url(#refute-arrow)" />
            <rect
              x={336}
              y={y}
              width={210}
              height={40}
              rx="8"
              className={item.good ? "dg-box accent" : "dg-box"}
              opacity={item.good ? 1 : 0.55}
            />
            <text
              x={441}
              y={y + 25}
              textAnchor="middle"
              className={item.good ? "dg-box-title accent" : "dg-box-sub"}
            >
              {item.verdict}
            </text>
            {!item.good && (
              <line x1={336} y1={y + 40} x2={546} y2={y} className="dg-asymptote" />
            )}
          </g>
        );
      })}
      <text x={350} y={232} textAnchor="middle" className="dg-note">
        {es
          ? "Un optimo que coincide nunca asciende un veredicto: errores que se compensan llegan al numero correcto."
          : "A matching optimum never promotes a verdict: compensating errors reach the right number."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------ dimension vector */

/** A dimension as an exponent vector, and what a mismatch looks like. */
export function DimensionDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const axes = ["m", "kg", "s", "A", "K", "mol", "cd", "¤", "#"];
  const good = [0, 0, -1, 0, 0, 0, 0, 1, 0];
  const bad = [0, 0, 0, 0, 0, 0, 0, 1, 0];

  const cell = (values: number[], y: number, tone: string) =>
    values.map((value, index) => (
      <g key={`${tone}-${index}`}>
        <rect
          x={108 + index * 56}
          y={y}
          width={50}
          height={32}
          rx="4"
          className={value !== 0 ? `dg-box ${tone}` : "dg-box"}
          opacity={value !== 0 ? 1 : 0.4}
        />
        <text
          x={133 + index * 56}
          y={y + 21}
          textAnchor="middle"
          className={value !== 0 ? "dg-node-label" : "dg-box-sub"}
        >
          {value}
        </text>
      </g>
    ));

  return (
    <svg className="fig-svg wide" viewBox="0 0 640 196" role="img"
      aria-label={es ? "Una dimension como vector de exponentes" : "A dimension as an exponent vector"}>
      {axes.map((axis, index) => (
        <text key={axis} x={133 + index * 56} y={22} textAnchor="middle" className="dg-tick">
          {axis}
        </text>
      ))}

      <text x={98} y={54} textAnchor="end" className="dg-axis-label">
        {es ? "gasto" : "spend rate"}
      </text>
      {cell(good, 32, "accent")}
      <text x={620} y={54} textAnchor="end" className="dg-box-sub">
        ¤·s⁻¹
      </text>

      <text x={98} y={104} textAnchor="end" className="dg-axis-label">
        {es ? "presupuesto" : "budget"}
      </text>
      {cell(bad, 82, "accent")}

      <line x1={108} y1={128} x2={612} y2={128} className="dg-grid" />

      <text x={98} y={156} textAnchor="end" className="dg-axis-label" style={{ fill: "var(--color-bad)" }}>
        {es ? "diferencia" : "difference"}
      </text>
      {cell(good.map((value, index) => value - bad[index]), 134, "")}

      <text x={320} y={190} textAnchor="middle" className="dg-note">
        {es
          ? "Un gasto igualado a un presupuesto difiere en uno en el eje del tiempo. Esa diferencia nombra el error."
          : "A spend rate equated to a budget differs by one in the time axis. That difference names the mistake."}
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------- architecture */

/** Where each thing runs: the offline bake, the committed artifact, the browser. */
export function ArchitectureDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <svg className="fig-svg wide" viewBox="0 0 760 320" role="img"
      aria-label={es ? "Donde corre cada parte" : "Where each part runs"}>
      <Arrow id="arch-arrow" />

      {/* Offline */}
      <rect x={8} y={26} width={236} height={186} rx="10" className="dg-box" />
      <text x={126} y={46} textAnchor="middle" className="dg-box-title">
        {es ? "Sin conexion, pesado" : "Offline, heavy"}
      </text>
      {[
        { t: "planteo", s: es ? "documento tipado" : "typed document" },
        { t: "Pyomo + HiGHS", s: es ? "resuelve la referencia" : "solves the reference" },
        { t: "copela", s: es ? "barrido y libro mayor" : "sweep and ledger" },
        { t: "bake.py", s: es ? "verifica cada caso" : "verifies every case" },
      ].map((item, index) => (
        <g key={item.t}>
          <rect x={22} y={56 + index * 38} width={208} height={32} rx="6" className="dg-box accent" />
          <text x={32} y={72 + index * 38} className="dg-box-title accent">
            {item.t}
          </text>
          <text x={224} y={72 + index * 38} textAnchor="end" className="dg-box-sub">
            {item.s}
          </text>
        </g>
      ))}

      {/* Artifact */}
      <rect x={272} y={80} width={186} height={78} rx="10" className="dg-box good" />
      <text x={365} y={104} textAnchor="middle" className="dg-box-title">
        {es ? "Artefacto versionado" : "Committed artifact"}
      </text>
      <text x={365} y={122} textAnchor="middle" className="dg-box-sub">
        cases.json + manifest.json
      </text>
      <text x={365} y={140} textAnchor="middle" className="dg-box-sub">
        221 KB
      </text>
      <line x1={246} y1={119} x2={268} y2={119} className="dg-edge" markerEnd="url(#arch-arrow)" />

      {/* Browser */}
      <rect x={486} y={26} width={266} height={186} rx="10" className="dg-box" />
      <text x={619} y={46} textAnchor="middle" className="dg-box-title">
        {es ? "Navegador, sin servidor" : "Browser, no server"}
      </text>
      {[
        { t: "React + shell", s: es ? "seis rutas" : "six routes" },
        { t: "highs.wasm", s: es ? "3.37 MB, carga diferida" : "3.37 MB, lazy" },
        { t: es ? "resolucion en vivo" : "live solve", s: es ? "sub-milisegundo" : "sub-millisecond" },
        { t: "uPlot + canvas", s: es ? "lectura en el cursor" : "read-out at the cursor" },
      ].map((item, index) => (
        <g key={item.t}>
          <rect x={500} y={56 + index * 38} width={238} height={32} rx="6" className="dg-box accent" />
          <text x={510} y={72 + index * 38} className="dg-box-title accent">
            {item.t}
          </text>
          <text x={732} y={72 + index * 38} textAnchor="end" className="dg-box-sub">
            {item.s}
          </text>
        </g>
      ))}
      <line x1={462} y1={119} x2={482} y2={119} className="dg-edge" markerEnd="url(#arch-arrow)" />

      {/* The boundary, stated. */}
      <line x1={262} y1={236} x2={262} y2={266} className="dg-marker" />
      <text x={380} y={252} textAnchor="middle" className="dg-marker-label">
        {es ? "el limite vivo / precalculado" : "the live / precomputed boundary"}
      </text>
      <text x={380} y={284} textAnchor="middle" className="dg-note">
        {es
          ? "Todo numero publicado viene del artefacto. Lo unico que se calcula al vuelo es lo que usted cambia."
          : "Every published number comes from the artifact. The only thing computed live is what you change."}
      </text>
      <text x={380} y={304} textAnchor="middle" className="dg-note">
        {es
          ? "Ningun secreto llega al navegador porque ninguna via lo necesita."
          : "No secret reaches the browser, because no lane needs one."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------ sweep protocol */

/**
 * The sweep protocol, including the anti-pattern it refuses.
 *
 * ADR-0017 section 2 asks the protocol figure to show the forbidden shape struck out, because a
 * protocol diagram that only shows the correct path does not tell a reader what was avoided.
 */
export function SweepProtocolDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <svg className="fig-svg wide" viewBox="0 0 760 300" role="img"
      aria-label={es ? "El protocolo del barrido" : "The sweep protocol"}>
      <Arrow id="sweep-arrow" />

      <rect x={8} y={30} width={150} height={52} rx="8" className="dg-box accent" />
      <text x={83} y={52} textAnchor="middle" className="dg-box-title accent">
        {es ? "Casos" : "Cases"}
      </text>
      <text x={83} y={69} textAnchor="middle" className="dg-box-sub">
        {es ? "20, escritos a mano" : "20, authored"}
      </text>

      <rect x={8} y={98} width={150} height={52} rx="8" className="dg-box accent" />
      <text x={83} y={120} textAnchor="middle" className="dg-box-title accent">
        {es ? "Modelos" : "Models"}
      </text>
      <text x={83} y={137} textAnchor="middle" className="dg-box-sub">
        {es ? "n proveedores" : "n providers"}
      </text>

      <rect x={8} y={166} width={150} height={52} rx="8" className="dg-box accent" />
      <text x={83} y={188} textAnchor="middle" className="dg-box-title accent">
        {es ? "Repeticiones" : "Repeats"}
      </text>
      <text x={83} y={205} textAnchor="middle" className="dg-box-sub">
        {es ? "sin determinismo" : "no determinism"}
      </text>

      <line x1={162} y1={124} x2={196} y2={124} className="dg-edge" markerEnd="url(#sweep-arrow)" />

      <rect x={200} y={92} width={168} height={64} rx="8" className="dg-box" />
      <text x={284} y={116} textAnchor="middle" className="dg-box-title">
        {es ? "Una llamada" : "One call"}
      </text>
      <text x={284} y={134} textAnchor="middle" className="dg-box-sub">
        {es ? "presupuesto antes" : "budget checked first"}
      </text>
      <text x={284} y={148} textAnchor="middle" className="dg-box-sub">
        {es ? "cerrojo exclusivo" : "exclusive lock"}
      </text>

      <line x1={372} y1={124} x2={406} y2={124} className="dg-edge" markerEnd="url(#sweep-arrow)" />

      <rect x={410} y={78} width={168} height={92} rx="8" className="dg-box good" />
      <text x={494} y={102} textAnchor="middle" className="dg-box-title">
        {es ? "Libro mayor" : "Ledger"}
      </text>
      <text x={494} y={120} textAnchor="middle" className="dg-box-sub">
        JSONL, append-only
      </text>
      <text x={494} y={136} textAnchor="middle" className="dg-box-sub">
        {es ? "huella del proveedor" : "provider fingerprint"}
      </text>
      <text x={494} y={152} textAnchor="middle" className="dg-box-sub">
        {es ? "extracto si fallo" : "excerpt on failure"}
      </text>

      <line x1={582} y1={124} x2={616} y2={124} className="dg-edge" markerEnd="url(#sweep-arrow)" />

      <rect x={620} y={92} width={132} height={64} rx="8" className="dg-box accent" />
      <text x={686} y={116} textAnchor="middle" className="dg-box-title accent">
        {es ? "Tasas" : "Rates"}
      </text>
      <text x={686} y={134} textAnchor="middle" className="dg-box-sub">
        {es ? "intervalo Wilson" : "Wilson interval"}
      </text>
      <text x={686} y={148} textAnchor="middle" className="dg-box-sub">
        {es ? "no medidos aparte" : "unmeasured apart"}
      </text>

      {/* The anti-pattern, struck out. */}
      <rect x={200} y={208} width={378} height={48} rx="8" className="dg-box" opacity="0.45" />
      <text x={389} y={230} textAnchor="middle" className="dg-box-sub">
        {es
          ? "descartar una respuesta que no parsea y volver a llamar"
          : "discard a response that did not parse, then call again"}
      </text>
      <text x={389} y={246} textAnchor="middle" className="dg-box-sub">
        {es ? "= una tasa sobre las corridas que funcionaron" : "= a rate over the runs that happened to work"}
      </text>
      <line x1={200} y1={256} x2={578} y2={208} className="dg-asymptote" />
      <line x1={200} y1={208} x2={578} y2={256} className="dg-asymptote" />

      <text x={380} y={282} textAnchor="middle" className="dg-note">
        {es
          ? "Cada llamada queda registrada, incluida la que fallo. Un fallo descartado es una tasa inflada en silencio."
          : "Every call is recorded, including the one that failed. A discarded failure is a silently inflated rate."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ provenance */

/** A span: offsets, the covered text, and what it produced. */
export function SpanDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const text = es
    ? "La planta puede procesar hasta 480 toneladas por hora."
    : "The plant can process up to 480 tonnes per hour.";
  const mark = es ? "480 toneladas por hora" : "480 tonnes per hour";
  const start = text.indexOf(mark);

  return (
    <svg className="fig-svg wide" viewBox="0 0 700 200" role="img"
      aria-label={es ? "Una referencia al texto de origen" : "A span back into the source text"}>
      <Arrow id="span-arrow" />

      <text x={16} y={40} className="dg-node-label" style={{ fontSize: 13 }}>
        {text.slice(0, start)}
        <tspan style={{ fill: "var(--color-accent)", fontWeight: 700 }}>{mark}</tspan>
        {text.slice(start + mark.length)}
      </text>

      <line x1={16 + start * 7.1} y1={48} x2={16 + (start + mark.length) * 7.1} y2={48} className="dg-curve" />
      <text x={16 + start * 7.1} y={66} className="dg-edge-label">
        start {start}
      </text>
      <text x={16 + (start + mark.length) * 7.1} y={66} textAnchor="end" className="dg-edge-label">
        end {start + mark.length}
      </text>

      <line x1={16 + (start + mark.length / 2) * 7.1} y1={74} x2={16 + (start + mark.length / 2) * 7.1} y2={100} className="dg-edge" markerEnd="url(#span-arrow)" />

      <rect x={130} y={104} width={440} height={62} rx="8" className="dg-box accent" />
      <text x={146} y={126} className="dg-box-sub">
        name: <tspan style={{ fill: "var(--color-accent)" }}>throughput_cap</tspan>
      </text>
      <text x={146} y={142} className="dg-box-sub">
        dimension: kg·s⁻¹   role: parameter
      </text>
      <text x={146} y={158} className="dg-box-sub">
        span.text: "{mark}"
      </text>

      <text x={350} y={190} textAnchor="middle" className="dg-note">
        {es
          ? "El desplazamiento y el texto se guardan juntos: una referencia guardada puede comprobarse, no solo creerse."
          : "The offsets and the text are stored together, so a stored span can be checked rather than trusted."}
      </text>
    </svg>
  );
}

/* --------------------------------------------------------------- metamorphic */

/** A metamorphic relation: transform the input, know the effect in advance, check it. */
export function MetamorphicDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <svg className="fig-svg wide" viewBox="0 0 700 240" role="img"
      aria-label={es ? "Una relacion metamorfica" : "A metamorphic relation"}>
      <Arrow id="meta-arrow" />

      <rect x={20} y={30} width={180} height={50} rx="8" className="dg-box accent" />
      <text x={110} y={52} textAnchor="middle" className="dg-box-title accent">P</text>
      <text x={110} y={69} textAnchor="middle" className="dg-box-sub">
        {es ? "el problema" : "the problem"}
      </text>

      <rect x={20} y={140} width={180} height={50} rx="8" className="dg-box" />
      <text x={110} y={162} textAnchor="middle" className="dg-box-title">P'</text>
      <text x={110} y={179} textAnchor="middle" className="dg-box-sub">
        {es ? "objetivo x 3" : "objective x 3"}
      </text>

      <line x1={110} y1={84} x2={110} y2={136} className="dg-edge" markerEnd="url(#meta-arrow)" />
      <text x={120} y={114} className="dg-edge-label">T</text>

      <line x1={204} y1={55} x2={288} y2={55} className="dg-edge" markerEnd="url(#meta-arrow)" />
      <line x1={204} y1={165} x2={288} y2={165} className="dg-edge" markerEnd="url(#meta-arrow)" />

      <rect x={292} y={30} width={180} height={50} rx="8" className="dg-box" />
      <text x={382} y={60} textAnchor="middle" className="dg-box-sub">
        argmin(P) = x*
      </text>

      <rect x={292} y={140} width={180} height={50} rx="8" className="dg-box" />
      <text x={382} y={170} textAnchor="middle" className="dg-box-sub">
        argmin(P') = ?
      </text>

      <line x1={382} y1={84} x2={382} y2={136} className="dg-marker" />
      <text x={392} y={114} className="dg-marker-label">
        {es ? "debe ser igual" : "must be equal"}
      </text>

      <rect x={496} y={84} width={184} height={52} rx="8" className="dg-box good" />
      <text x={588} y={106} textAnchor="middle" className="dg-box-title">
        {es ? "Se comprueba" : "Checked"}
      </text>
      <text x={588} y={124} textAnchor="middle" className="dg-box-sub">
        {es ? "sin conocer x*" : "without knowing x*"}
      </text>
      <line x1={476} y1={110} x2={492} y2={110} className="dg-edge" markerEnd="url(#meta-arrow)" />

      <text x={350} y={222} textAnchor="middle" className="dg-note">
        {es
          ? "No hace falta la respuesta correcta: hace falta saber de antemano como TIENE que cambiar."
          : "The right answer is not needed: what is needed is knowing in advance how it HAS to change."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ IR shape */

/** The intermediate representation: what a typed document is made of. */
export function DocumentDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const parts = es
    ? [
        { t: "quantities", s: "nombre, papel, dimension, dominio, cotas, span" },
        { t: "relations", s: "compare / logical / forall, con span" },
        { t: "objectives", s: "sentido + expresion" },
        { t: "assumptions", s: "lo que se asumio, y de donde" },
        { t: "open_questions", s: "lo que el texto NO determino" },
        { t: "narrative", s: "texto, idioma, digest" },
      ]
    : [
        { t: "quantities", s: "name, role, dimension, domain, bounds, span" },
        { t: "relations", s: "compare / logical / forall, each with a span" },
        { t: "objectives", s: "sense + expression" },
        { t: "assumptions", s: "what was assumed, and from where" },
        { t: "open_questions", s: "what the text did NOT determine" },
        { t: "narrative", s: "text, language, digest" },
      ];

  return (
    <svg className="fig-svg wide" viewBox="0 0 700 280" role="img"
      aria-label={es ? "La representacion intermedia" : "The intermediate representation"}>
      <rect x={8} y={8} width={684} height={228} rx="10" className="dg-box accent" opacity="0.35" />
      <text x={24} y={30} className="dg-box-title accent">
        planteo.Problem
      </text>
      <text x={676} y={30} textAnchor="end" className="dg-box-sub">
        schema_version 1.0
      </text>

      {parts.map((part, index) => {
        const y = 44 + index * 31;
        return (
          <g key={part.t}>
            <rect x={24} y={y} width={652} height={26} rx="5" className="dg-box" />
            <text x={36} y={y + 18} className="dg-box-title">
              {part.t}
            </text>
            <text x={664} y={y + 18} textAnchor="end" className="dg-box-sub">
              {part.s}
            </text>
          </g>
        );
      })}

      <text x={350} y={258} textAnchor="middle" className="dg-note">
        {es
          ? "open_questions es lo que distingue este documento de un esquema JSON cualquiera: registra lo que el enunciado dejo sin decidir."
          : "open_questions is what separates this document from any JSON schema: it records what the statement left undecided."}
      </text>
      <text x={350} y={274} textAnchor="middle" className="dg-note">
        {es
          ? "Un formalizador que nunca abre una pregunta esta adivinando en silencio."
          : "A formalizer that never opens a question is guessing silently."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------- canonical form */

/**
 * One pair, two canonicalisers, two verdicts, and both honest.
 *
 * The product has two canonical forms and it matters which is which. The published verdict uses
 * planteo's, over the typed document: it renames by structure, sorts terms and orients comparator
 * sides, and it keeps the objective sense, so this pair comes out NOT PROVEN. The workbench computes
 * a stronger form over the linear rows, which fixes the sense and moves every term, so the same pair
 * comes out EQUIVALENT. Neither can call two different models equivalent.
 */
export function CanonicalDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <svg className="fig-svg wide" viewBox="0 0 760 330" role="img"
      aria-label={es ? "El mismo par ante dos formas canonicas" : "One pair under two canonical forms"}>
      <Arrow id="canon-arrow" />

      {/* The pair. */}
      <rect x={10} y={46} width={230} height={214} rx="9" className="dg-box accent" />
      <text x={24} y={68} className="dg-box-title accent">{es ? "El par" : "The pair"}</text>
      <text x={24} y={94} className="dg-box-title">A</text>
      <text x={44} y={94} className="dg-box-sub">max 3x + 2y</text>
      <text x={44} y={112} className="dg-box-sub">x + y &lt;= 10</text>
      <text x={44} y={130} className="dg-box-sub">2x + y &lt;= 16</text>
      <line x1={24} y1={150} x2={226} y2={150} className="dg-grid" />
      <text x={24} y={176} className="dg-box-title">B</text>
      <text x={44} y={176} className="dg-box-sub">min -2y - 3x</text>
      <text x={44} y={194} className="dg-box-sub">16 &gt;= y + 2x</text>
      <text x={44} y={212} className="dg-box-sub">y + x &lt;= 10</text>
      <text x={24} y={242} className="dg-note">{es ? "el mismo modelo, escrito dos veces" : "the same model, written twice"}</text>

      {/* The published form. */}
      <line x1={244} y1={118} x2={290} y2={86} className="dg-edge" markerEnd="url(#canon-arrow)" />
      <rect x={294} y={34} width={250} height={100} rx="8" className="dg-box" />
      <text x={308} y={56} className="dg-box-title">{es ? "planteo: forma del documento" : "planteo: document form"}</text>
      <text x={308} y={76} className="dg-box-sub">{es ? "renombra por estructura, ordena terminos," : "renames by structure, sorts terms,"}</text>
      <text x={308} y={93} className="dg-box-sub">{es ? "orienta los lados del comparador;" : "orients comparator sides;"}</text>
      <text x={308} y={110} className="dg-box-sub" style={{ fill: "var(--color-warn)" }}>
        {es ? "conserva el sentido del objetivo" : "keeps the objective sense"}
      </text>
      <text x={308} y={126} className="dg-edge-label">{es ? "decide el veredicto publicado" : "decides the published verdict"}</text>
      <line x1={548} y1={84} x2={580} y2={84} className="dg-edge" markerEnd="url(#canon-arrow)" />
      <rect x={584} y={54} width={166} height={60} rx="8" className="dg-box" opacity="0.8" />
      <text x={667} y={80} textAnchor="middle" className="dg-box-title">{es ? "NO PROBADO" : "NOT PROVEN"}</text>
      <text x={667} y={100} textAnchor="middle" className="dg-box-sub">{es ? "max frente a min" : "max against min"}</text>

      {/* The workbench form. */}
      <line x1={244} y1={190} x2={290} y2={222} className="dg-edge" markerEnd="url(#canon-arrow)" />
      <rect x={294} y={174} width={250} height={100} rx="8" className="dg-box good" />
      <text x={308} y={196} className="dg-box-title">{es ? "banco: forma lineal" : "workbench: linear form"}</text>
      <text x={308} y={216} className="dg-box-sub">{es ? "fija el sentido en minimizar," : "fixes the sense to minimise,"}</text>
      <text x={308} y={233} className="dg-box-sub">{es ? "mueve todo termino a la izquierda," : "moves every term left,"}</text>
      <text x={308} y={250} className="dg-box-sub">{es ? "normaliza filas y signo; orden WL" : "normalises rows and sign; WL order"}</text>
      <text x={308} y={266} className="dg-edge-label">{es ? "se muestra, no se publica" : "shown, not published"}</text>
      <line x1={548} y1={224} x2={580} y2={224} className="dg-edge" markerEnd="url(#canon-arrow)" />
      <rect x={584} y={194} width={166} height={60} rx="8" className="dg-box good" />
      <text x={667} y={220} textAnchor="middle" className="dg-box-title accent">{es ? "EQUIVALENTE" : "EQUIVALENT"}</text>
      <text x={667} y={240} textAnchor="middle" className="dg-box-sub">{es ? "digest igual" : "equal digest"}</text>

      <text x={380} y={302} textAnchor="middle" className="dg-note">
        {es
          ? "Ninguna puede llamar equivalentes a dos modelos distintos: cada una solo aplica reescrituras que conservan el conjunto de soluciones."
          : "Neither can call two different models equivalent: each applies only rewrites that keep the solution set."}
      </text>
      <text x={380} y={320} textAnchor="middle" className="dg-note">
        {es
          ? "La mas debil se equivoca solo hacia lo seguro: un NO PROBADO de mas, nunca un EQUIVALENTE falso."
          : "The weaker one errs only in the safe direction: an extra NOT PROVEN, never a false EQUIVALENT."}
      </text>
    </svg>
  );
}

/* ----------------------------------------------------------------- sampling */

/** Why the interval, and not the point estimate, is the reported quantity. */
export function SamplingDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const runs = [
    { label: "pass 1", value: 0.35, low: 0.18, high: 0.57 },
    { label: "pass 2", value: 0.25, low: 0.11, high: 0.47 },
  ];
  const x = (v: number) => 120 + v * 500;

  return (
    <svg className="fig-svg wide" viewBox="0 0 700 190" role="img"
      aria-label={es ? "Dos pasadas sobre el corpus identico" : "Two passes over the identical corpus"}>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={x(tick)} x2={x(tick)} y1={26} y2={124} className="dg-grid" />
          <text x={x(tick)} y={142} textAnchor="middle" className="dg-tick">{tick.toFixed(2)}</text>
        </g>
      ))}

      {runs.map((run, index) => {
        const y = 52 + index * 42;
        return (
          <g key={run.label}>
            <text x={110} y={y + 4} textAnchor="end" className="dg-axis-label">{run.label}</text>
            <line x1={x(run.low)} x2={x(run.high)} y1={y} y2={y} className="dg-curve" />
            <line x1={x(run.low)} x2={x(run.low)} y1={y - 6} y2={y + 6} className="dg-curve" />
            <line x1={x(run.high)} x2={x(run.high)} y1={y - 6} y2={y + 6} className="dg-curve" />
            <circle cx={x(run.value)} cy={y} r="5" className="dg-bar" />
            <text x={x(run.value)} y={y - 12} textAnchor="middle" className="dg-edge-label">
              {run.value.toFixed(3)}
            </text>
          </g>
        );
      })}

      <rect x={x(0.18)} y={40} width={x(0.47) - x(0.18)} height={62} className="dg-fill-warn" opacity="0.35" />
      <text x={x(0.325)} y={118} textAnchor="middle" className="dg-marker-label">
        {es ? "solape" : "overlap"}
      </text>

      <text x={350} y={166} textAnchor="middle" className="dg-note">
        {es
          ? "Nada cambio entre las dos pasadas salvo el muestreo. La diferencia entre 0,350 y 0,250 esta dentro del solape."
          : "Nothing changed between the two passes but the sampling. The difference between 0.350 and 0.250 lies inside the overlap."}
      </text>
      <text x={350} y={182} textAnchor="middle" className="dg-note">
        {es
          ? "Por eso se publica el intervalo y no solo la tasa."
          : "That is why the interval is published, not only the rate."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------- judge */

/** The judge's standing: a calibrated aggregate, bounded by its own agreement figure. */
export function JudgeDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <svg className="fig-svg wide" viewBox="0 0 700 220" role="img"
      aria-label={es ? "La posicion del juez" : "The judge's standing"}>
      <Arrow id="judge-arrow" />

      <line x1={60} y1={150} x2={640} y2={150} className="dg-axis" />
      <text x={60} y={172} className="dg-axis-label">0%</text>
      <text x={640} y={172} textAnchor="end" className="dg-axis-label">100%</text>

      <rect x={60 + 0.821 * 580} y={60} width={(0.943 - 0.821) * 580} height={90} className="dg-fill-accent" />
      <line x1={60 + 0.897 * 580} x2={60 + 0.897 * 580} y1={52} y2={150} className="dg-curve" />
      <text x={60 + 0.897 * 580} y={44} textAnchor="middle" className="dg-node-label">89.7%</text>
      <text x={60 + 0.897 * 580} y={26} textAnchor="middle" className="dg-axis-label">
        {es ? "acuerdo con la mayoria humana" : "agreement with human majority"}
      </text>
      <text x={60 + 0.882 * 580} y={186} textAnchor="middle" className="dg-marker-label">
        95% CI 82.1 - 94.3
      </text>

      <rect x={60} y={100} width={0.821 * 580} height={50} className="dg-box" opacity="0.35" />
      <text x={60 + 0.4 * 580} y={130} textAnchor="middle" className="dg-box-sub">
        {es ? "el resto: donde el juez y las personas discrepan" : "the rest: where judge and people disagree"}
      </text>

      <text x={350} y={210} textAnchor="middle" className="dg-note">
        {es
          ? "Un agregado con 89,7% de acuerdo es util para comparar y no es un oraculo. Los propios autores lo dicen."
          : "An aggregate agreeing 89.7% of the time is useful for comparison and is not an oracle. Its own authors say so."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ holdout */

/**
 * The authoring protocol, with the two contaminating shortcuts struck out.
 *
 * The leakage risk here is not a train/test split: it is the reference. A reference written after
 * reading a model's answer, or a prompt tuned against the same cases the rates are reported over,
 * produces a number that measures the author's agreement with the model rather than the model's
 * agreement with the statement.
 */
export function HoldoutDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <svg className="fig-svg wide" viewBox="0 0 760 320" role="img"
      aria-label={es ? "El protocolo de escritura, con los atajos contaminantes tachados" : "The authoring protocol, with the contaminating shortcuts struck out"}>
      <Arrow id="hold-arrow" />

      <text x={16} y={20} className="dg-axis-label">{es ? "orden obligatorio" : "mandatory order"}</text>

      {[
        { t: es ? "1. Escribir el enunciado" : "1. Author the statement", s: es ? "prosa, con su trampa elegida" : "prose, with its chosen trap" },
        { t: es ? "2. Escribir la referencia" : "2. Author the reference", s: es ? "sin haber visto respuesta alguna" : "having seen no answer at all" },
        { t: es ? "3. Hornear y verificar" : "3. Bake and verify", s: es ? "resolver, comprobar el optimo, correr propiedades" : "solve, check the optimum, run properties" },
        { t: es ? "4. Congelar" : "4. Freeze", s: es ? "versionar; despues de esto no se edita" : "commit; after this it is not edited" },
        { t: es ? "5. Preguntar a los modelos" : "5. Ask the models", s: es ? "mismo prompt, n repeticiones" : "same prompt, n repeats" },
      ].map((step, index) => {
        const y = 30 + index * 48;
        return (
          <g key={step.t}>
            <rect x={16} y={y} width={420} height={38} rx="7" className={index === 3 ? "dg-box good" : "dg-box accent"} />
            <text x={30} y={y + 17} className="dg-box-title accent">{step.t}</text>
            <text x={30} y={y + 32} className="dg-box-sub">{step.s}</text>
            {index < 4 && <line x1={226} y1={y + 40} x2={226} y2={y + 46} className="dg-edge" markerEnd="url(#hold-arrow)" />}
          </g>
        );
      })}

      {/* Two forbidden back-edges. */}
      <path d="M 440 200 C 530 200 530 90 442 84" className="dg-asymptote" fill="none" />
      <text x={470} y={142} className="dg-box-sub" style={{ fill: "var(--color-bad)" }}>
        {es ? "editar la referencia" : "edit the reference"}
      </text>
      <text x={470} y={158} className="dg-box-sub" style={{ fill: "var(--color-bad)" }}>
        {es ? "tras leer una respuesta" : "after reading an answer"}
      </text>
      <line x1={452} y1={126} x2={556} y2={172} className="dg-asymptote" />
      <line x1={452} y1={172} x2={556} y2={126} className="dg-asymptote" />

      <path d="M 440 250 C 680 250 680 60 444 58" className="dg-asymptote" fill="none" />
      <text x={594} y={228} className="dg-box-sub" style={{ fill: "var(--color-bad)" }}>
        {es ? "ajustar el prompt" : "tune the prompt"}
      </text>
      <text x={594} y={244} className="dg-box-sub" style={{ fill: "var(--color-bad)" }}>
        {es ? "contra estos casos" : "against these cases"}
      </text>
      <line x1={588} y1={214} x2={700} y2={258} className="dg-asymptote" />
      <line x1={588} y1={258} x2={700} y2={214} className="dg-asymptote" />

      <text x={380} y={294} textAnchor="middle" className="dg-note">
        {es
          ? "Cualquiera de las dos aristas tachadas convierte la medicion en el acuerdo del autor con el modelo."
          : "Either struck-out edge turns the measurement into the author's agreement with the model."}
      </text>
      <text x={380} y={312} textAnchor="middle" className="dg-note">
        {es
          ? "Las veinte referencias se congelaron antes de la primera llamada, y el registro de git lo muestra."
          : "All twenty references were frozen before the first call, and the git record shows it."}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------ provider seam */

/**
 * What a run record can pin, and what it cannot.
 *
 * The honest half of the multi-model lane. Hosted inference is not reproducible bit for bit, so the
 * record states which controls were actually exercised rather than which were intended, and the
 * column on the right is the part no fingerprint can fix.
 */
export function ProviderSeamDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const pinned = es
    ? ["identificador del modelo", "version del modelo", "digest del prompt", "tope de tokens", "esfuerzo, si el modelo lo admite"]
    : ["model id", "model version", "prompt digest", "token cap", "effort, where the model takes it"];
  const unpinned = es
    ? ["tamano de lote del servicio", "nucleos de reduccion", "precision numerica", "uso de cache", "hardware y software del servidor"]
    : ["the service's batch size", "reduction kernels", "numerical precision", "cache use", "server hardware and software"];

  return (
    <svg className="fig-svg wide" viewBox="0 0 700 300" role="img"
      aria-label={es ? "Lo que un registro de corrida puede fijar" : "What a run record can pin"}>
      <Arrow id="seam-arrow" />

      <rect x={8} y={26} width={316} height={196} rx="10" className="dg-box accent" />
      <text x={166} y={50} textAnchor="middle" className="dg-box-title accent">
        {es ? "Se fija, y se registra" : "Pinned, and recorded"}
      </text>
      {pinned.map((item, index) => (
        <text key={item} x={28} y={78 + index * 27} className="dg-box-sub">
          {item}
        </text>
      ))}

      <rect x={376} y={26} width={316} height={196} rx="10" className="dg-box" />
      <text x={534} y={50} textAnchor="middle" className="dg-box-title">
        {es ? "No se puede fijar" : "Cannot be pinned"}
      </text>
      {unpinned.map((item, index) => (
        <text key={item} x={396} y={78 + index * 27} className="dg-box-sub" style={{ fill: "var(--color-bad)" }}>
          {item}
        </text>
      ))}

      <line x1={350} y1={40} x2={350} y2={212} className="dg-asymptote" />
      <text x={350} y={232} textAnchor="middle" className="dg-marker-label">
        {es ? "la costura del proveedor" : "the provider seam"}
      </text>

      <text x={350} y={262} textAnchor="middle" className="dg-note">
        {es
          ? "Por eso el registro informa n repeticiones con una banda de tolerancia, en vez de afirmar una reproduccion exacta que no tiene."
          : "That is why the record reports n repeats with a tolerance band, rather than claiming an exact reproduction it does not have."}
      </text>
      <text x={350} y={282} textAnchor="middle" className="dg-note">
        {es
          ? "Una huella que dijera temperature=0 para un proveedor que no la acepta seria reproducibilidad afirmada y no ejercida."
          : "A fingerprint claiming temperature=0 for a provider that does not accept it is reproducibility asserted and not exercised."}
      </text>
    </svg>
  );
}

/* ---------------------------------------------------------- WL refinement */

/**
 * Colour refinement on a small model's graph, round 0 and the round it stabilises.
 *
 * The model is min x + 2y + z subject to x + y <= 4 and y + z <= 4. Every variable starts alike
 * (same domain, same bounds) and both rows start alike (same comparator, same right-hand side). One
 * round of looking at neighbourhoods separates y, the variable in both rows; x and z never separate,
 * because swapping them is a symmetry of the model and refinement cannot break a symmetry.
 */
export function RefinementDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const A = "color-mix(in oklab, var(--color-accent) 55%, var(--color-surface))";
  const M = "color-mix(in oklab, var(--color-magenta) 60%, var(--color-surface))";
  const R = "color-mix(in oklab, var(--color-warn) 55%, var(--color-surface))";
  const O = "color-mix(in oklab, var(--color-good) 55%, var(--color-surface))";

  const panel = (ox: number, stable: boolean) => {
    const variables = [
      { id: "x", y: 100, fill: A },
      { id: "y", y: 168, fill: stable ? M : A },
      { id: "z", y: 236, fill: A },
    ];
    const rows = [
      { id: "r1", y: 134 },
      { id: "r2", y: 202 },
    ];
    const vx = ox + 62;
    const rx = ox + 262;
    const objective = { x: ox + 262, y: 62 };
    const edges: { from: [number, number]; to: [number, number]; w: string }[] = [
      { from: [vx, 100], to: [objective.x, objective.y], w: "1" },
      { from: [vx, 168], to: [objective.x, objective.y], w: "2" },
      { from: [vx, 236], to: [objective.x, objective.y], w: "1" },
      { from: [vx, 100], to: [rx, 134], w: "1" },
      { from: [vx, 168], to: [rx, 134], w: "1" },
      { from: [vx, 168], to: [rx, 202], w: "1" },
      { from: [vx, 236], to: [rx, 202], w: "1" },
    ];
    return (
      <g>
        <text x={ox} y={34} className="dg-box-title">
          {stable
            ? es
              ? "ronda 1: estable"
              : "round 1: stable"
            : es
              ? "ronda 0: semillas"
              : "round 0: seeds"}
        </text>
        {edges.map((edge, index) => {
          // The one weight that differs is drawn heavier and labelled ON its edge, over a halo, a
          // third of the way along: at the midpoint the label sat on a crossing and read as either
          // edge's, and beside the edge it sat on a third one.
          const lx = edge.from[0] + 0.35 * (edge.to[0] - edge.from[0]);
          const ly = edge.from[1] + 0.35 * (edge.to[1] - edge.from[1]);
          return (
            <g key={index}>
              <line
                x1={edge.from[0]}
                y1={edge.from[1]}
                x2={edge.to[0]}
                y2={edge.to[1]}
                className="dg-edge"
                style={edge.w === "2" ? { strokeWidth: 3.2 } : undefined}
              />
              {edge.w === "2" && (
                <>
                  <rect x={lx - 9} y={ly - 9} width={18} height={16} rx={4} style={{ fill: "var(--color-bg)" }} />
                  <text x={lx} y={ly + 3.5} textAnchor="middle" className="dg-node-label">
                    2
                  </text>
                </>
              )}
            </g>
          );
        })}
        {variables.map((node) => (
          <g key={node.id}>
            <circle cx={vx} cy={node.y} r={16} style={{ fill: node.fill }} stroke="var(--color-border)" />
            <text x={vx} y={node.y + 4} textAnchor="middle" className="dg-node-label">
              {node.id}
            </text>
          </g>
        ))}
        {rows.map((node) => (
          <g key={node.id}>
            <rect x={rx - 16} y={node.y - 16} width={32} height={32} rx={5} style={{ fill: R }} stroke="var(--color-border)" />
            <text x={rx} y={node.y + 4} textAnchor="middle" className="dg-node-label">
              {node.id}
            </text>
          </g>
        ))}
        <circle cx={objective.x} cy={objective.y} r={17} style={{ fill: O }} stroke="var(--color-border)" />
        <text x={objective.x} y={objective.y + 4} textAnchor="middle" className="dg-node-label">
          obj
        </text>
        <text x={ox} y={276} className="dg-box-sub">
          {stable
            ? es
              ? "4 clases: y se separa; x y z no se separaran nunca"
              : "4 classes: y separates; x and z never will"
            : es
              ? "3 clases: variables iguales, filas iguales, objetivo"
              : "3 classes: variables alike, rows alike, objective"}
        </text>
      </g>
    );
  };

  return (
    <svg className="fig-svg wide" viewBox="0 0 760 340" role="img"
      aria-label={es ? "Refinamiento de colores sobre el grafo de un modelo" : "Colour refinement on a model's graph"}>
      <text x={380} y={14} textAnchor="middle" className="dg-edge-label">
        min x + 2y + z   s.t.   r1: x + y &lt;= 4,   r2: y + z &lt;= 4
      </text>
      {panel(16, false)}
      <line x1={372} y1={30} x2={372} y2={282} className="dg-grid" />
      {panel(400, true)}
      <text x={380} y={306} textAnchor="middle" className="dg-note">
        {es
          ? "Cada ronda recolorea un nodo con su color y el multiconjunto de pares (peso, color vecino). Se detiene cuando nada se separa."
          : "Each round recolours a node from its colour and the multiset of (weight, neighbour colour) pairs. It stops when nothing splits."}
      </text>
      <text x={380} y={324} textAnchor="middle" className="dg-note">
        {es
          ? "Coloraciones estables distintas prueban grafos no isomorfos. Iguales no prueban nada: un ciclo de 6 y dos triangulos no se separan."
          : "Different stable colourings prove the graphs non-isomorphic. Equal ones prove nothing: a 6-cycle and two triangles never separate."}
      </text>
    </svg>
  );
}

/* ---------------------------------------------------------- LP duality */

/**
 * The geometry of an LP optimum and its dual certificate.
 *
 * max 2x + 3y subject to x + y <= 4, x + 3y <= 6, x <= 3.5. The optimum (3, 1) sits where the first
 * two rows bind, and the objective vector lies in the cone of their normals: c = 1.5 a1 + 0.5 a2.
 * Those coefficients ARE the shadow prices. The third row is slack, so its price is zero. The numbers
 * were solved with the same HiGHS build the site ships, not drawn from memory.
 */
export function DualityGeometryDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const px = (x: number) => 50 + x * 86;
  const py = (y: number) => 290 - y * 80;
  const polygon: [number, number][] = [
    [0, 0],
    [3.5, 0],
    [3.5, 0.5],
    [3, 1],
    [0, 2],
  ];
  const vertex = { x: px(3), y: py(1) };
  // Directions in screen space, from each data-space vector through the axis scales.
  const toward = (dx: number, dy: number, length: number) => {
    const sx = dx * 86;
    const sy = -dy * 80;
    const norm = Math.hypot(sx, sy);
    return { x: vertex.x + (sx / norm) * length, y: vertex.y + (sy / norm) * length };
  };
  const a1 = toward(1, 1, 74);
  const a2 = toward(1, 3, 74);
  const c = toward(2, 3, 92);
  const wedge1 = toward(1, 1, 104);
  const wedge2 = toward(1, 3, 104);

  return (
    <svg className="fig-svg wide" viewBox="0 0 760 330" role="img"
      aria-label={es ? "La geometria de un optimo lineal y su certificado dual" : "The geometry of an LP optimum and its dual certificate"}>
      <Arrow id="dual-arrow" />
      <text x={16} y={16} className="dg-edge-label">
        max 2x + 3y   s.t.   r1: x + y &lt;= 4,   r2: x + 3y &lt;= 6,   r3: x &lt;= 3.5
      </text>

      {/* Axes. */}
      <line x1={px(0)} y1={py(0)} x2={px(5)} y2={py(0)} className="dg-axis" />
      <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(3)} className="dg-axis" />
      <text x={px(5)} y={py(0) + 16} textAnchor="end" className="dg-axis-label">x</text>
      <text x={px(0) - 10} y={py(3) + 4} textAnchor="end" className="dg-axis-label">y</text>

      {/* The feasible polygon. */}
      <polygon points={polygon.map(([x, y]) => `${px(x)},${py(y)}`).join(" ")} className="dg-fill-accent" />

      {/* The three rows. */}
      <line x1={px(1)} y1={py(3)} x2={px(4)} y2={py(0)} className="dg-curve-faint" />
      <line x1={px(0)} y1={py(2)} x2={px(5)} y2={py(1 / 3)} className="dg-curve-faint" />
      <line x1={px(3.5)} y1={py(0)} x2={px(3.5)} y2={py(3)} className="dg-curve-faint" />
      <text x={px(1.55) + 8} y={py(2.45)} className="dg-edge-label">r1</text>
      <text x={px(5) - 4} y={py(1 / 3) - 8} textAnchor="end" className="dg-edge-label">r2</text>
      <text x={px(3.5) + 6} y={py(2.8)} className="dg-edge-label">r3 {es ? "holgada" : "slack"}</text>

      {/* The objective contour through the optimum. */}
      <line x1={px(0)} y1={py(3)} x2={px(4.5)} y2={py(0)} className="dg-marker" />
      <text x={px(0.3)} y={py(2.95)} className="dg-marker-label">2x + 3y = 9</text>

      {/* The cone of the binding normals, and c inside it. */}
      <polygon points={`${vertex.x},${vertex.y} ${wedge1.x},${wedge1.y} ${wedge2.x},${wedge2.y}`} className="dg-fill-warn" />
      <line x1={vertex.x} y1={vertex.y} x2={a1.x} y2={a1.y} className="dg-edge" markerEnd="url(#dual-arrow)" />
      <line x1={vertex.x} y1={vertex.y} x2={a2.x} y2={a2.y} className="dg-edge" markerEnd="url(#dual-arrow)" />
      <line x1={vertex.x} y1={vertex.y} x2={c.x} y2={c.y} className="dg-curve" markerEnd="url(#dual-arrow)" />
      <text x={a1.x + 6} y={a1.y + 10} className="dg-edge-label">a1</text>
      <text x={a2.x - 8} y={a2.y - 2} textAnchor="end" className="dg-edge-label">a2</text>
      <text x={c.x + 6} y={c.y} className="dg-node-label">c</text>

      <circle cx={vertex.x} cy={vertex.y} r={5.5} className="dg-bar" />
      <text x={vertex.x - 10} y={vertex.y + 18} textAnchor="end" className="dg-node-label">x* = (3, 1)</text>

      {/* The certificate, written out. */}
      <rect x={498} y={60} width={252} height={196} rx="9" className="dg-box" />
      <text x={512} y={84} className="dg-box-title">{es ? "El certificado" : "The certificate"}</text>
      <text x={512} y={108} className="dg-box-sub">primal   c·x* = 2(3) + 3(1) = 9</text>
      <text x={512} y={128} className="dg-box-sub">dual   b·y* = 4(1.5) + 6(0.5) + 3.5(0)</text>
      <text x={512} y={146} className="dg-box-sub">         = 9</text>
      <text x={512} y={172} className="dg-box-sub" style={{ fill: "var(--color-accent)" }}>
        c = 1.5 a1 + 0.5 a2
      </text>
      <text x={512} y={190} className="dg-box-sub">
        {es ? "los coeficientes son los precios" : "the coefficients are the prices"}
      </text>
      <text x={512} y={216} className="dg-box-sub">
        {es ? "r3 holgada, y3 = 0:" : "r3 slack, so y3 = 0:"}
      </text>
      <text x={512} y={234} className="dg-box-sub">
        {es ? "holgura complementaria" : "complementary slackness"}
      </text>

      <text x={380} y={318} textAnchor="middle" className="dg-note">
        {es
          ? "El optimo es un vertice donde c cae en el cono de las normales activas. Los pesos de esa combinacion son los precios sombra."
          : "The optimum is a vertex where c falls in the cone of the binding normals. The weights of that combination are the shadow prices."}
      </text>
    </svg>
  );
}

/* ---------------------------------------------------------- integrality */

/**
 * Why the LP relaxation bounds an integer program and does not solve it.
 *
 * max y subject to -x + y <= 1, 3x + 2y <= 12, 2x + 3y <= 12, x and y whole. The relaxation's
 * optimum is the vertex (1.8, 2.8); the integer optima are (1, 2) and (2, 2), which are not vertices
 * of the polygon at all, and rounding the relaxation's answer lands outside it. Solved with the
 * HiGHS build the site ships.
 */
export function IntegralityDiagram({ lang }: { lang: Lang }) {
  const es = lang === "es";
  const px = (x: number) => 50 + x * 90;
  const py = (y: number) => 290 - y * 70;
  const feasible = (x: number, y: number) =>
    -x + y <= 1 + 1e-9 && 3 * x + 2 * y <= 12 + 1e-9 && 2 * x + 3 * y <= 12 + 1e-9;
  const lattice: { x: number; y: number; ok: boolean }[] = [];
  for (let x = 0; x <= 4; x += 1) {
    for (let y = 0; y <= 3; y += 1) lattice.push({ x, y, ok: feasible(x, y) });
  }
  const polygon: [number, number][] = [
    [0, 0],
    [4, 0],
    [2.4, 2.4],
    [1.8, 2.8],
    [0, 1],
  ];

  return (
    <svg className="fig-svg wide" viewBox="0 0 760 330" role="img"
      aria-label={es ? "Por que la relajacion acota y no resuelve" : "Why the relaxation bounds and does not solve"}>
      <text x={16} y={16} className="dg-edge-label">
        max y   s.t.   -x + y &lt;= 1,   3x + 2y &lt;= 12,   2x + 3y &lt;= 12,   x, y {es ? "enteros" : "whole"}
      </text>

      <line x1={px(0)} y1={py(0)} x2={px(4.5)} y2={py(0)} className="dg-axis" />
      <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(3.4)} className="dg-axis" />
      <text x={px(4.5)} y={py(0) + 16} textAnchor="end" className="dg-axis-label">x</text>
      <text x={px(0) - 10} y={py(3.4) + 4} textAnchor="end" className="dg-axis-label">y</text>

      <polygon points={polygon.map(([x, y]) => `${px(x)},${py(y)}`).join(" ")} className="dg-fill-accent" />

      {/* The two optimum levels: where the relaxation stops, and where the integers do. */}
      <line x1={px(0)} y1={py(2.8)} x2={px(4.5)} y2={py(2.8)} className="dg-marker" />
      <line x1={px(0)} y1={py(2)} x2={px(4.5)} y2={py(2)} className="dg-curve-2" />
      <line x1={px(4.5) + 10} y1={py(2.8)} x2={px(4.5) + 10} y2={py(2)} className="dg-curve" />
      {/* Under the bracket, not beside it: beside it the Spanish label ran into the box. */}
      <text x={px(4.5) + 10} y={py(2) + 18} textAnchor="middle" className="dg-node-label">
        {es ? "brecha 0.8" : "gap 0.8"}
      </text>

      {lattice.map((point) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={px(point.x)}
          cy={py(point.y)}
          r={4}
          style={{
            fill: point.ok ? "var(--color-accent)" : "transparent",
            stroke: point.ok ? "var(--color-accent)" : "var(--color-fg-faint)",
          }}
        />
      ))}

      {/* The relaxation's vertex, the two integer optima, and the rounded point that falls out. */}
      <circle cx={px(1.8)} cy={py(2.8)} r={8} fill="none" stroke="var(--color-warn)" strokeWidth={2} />
      <text x={px(1.8) + 14} y={py(2.8) + 22} className="dg-marker-label">LP (1.8, 2.8)</text>
      {[1, 2].map((x) => (
        <circle key={x} cx={px(x)} cy={py(2)} r={7} style={{ fill: "var(--color-magenta)" }} />
      ))}
      <text x={px(1.5)} y={py(2) + 22} textAnchor="middle" className="dg-node-label">
        {es ? "optimos enteros" : "integer optima"}
      </text>
      <line x1={px(2) - 6} y1={py(3) - 6} x2={px(2) + 6} y2={py(3) + 6} stroke="var(--color-bad)" strokeWidth={2} />
      <line x1={px(2) - 6} y1={py(3) + 6} x2={px(2) + 6} y2={py(3) - 6} stroke="var(--color-bad)" strokeWidth={2} />
      <text x={px(2) + 12} y={py(3) - 14} className="dg-edge-label" style={{ fill: "var(--color-bad)" }}>
        {es ? "redondeo (2, 3): infactible" : "rounded (2, 3): infeasible"}
      </text>

      <rect x={528} y={60} width={222} height={200} rx="9" className="dg-box" />
      <text x={542} y={84} className="dg-box-title">{es ? "Lo que se lee" : "What it shows"}</text>
      <text x={542} y={108} className="dg-box-sub">{es ? "relajacion: z = 2.8" : "relaxation: z = 2.8"}</text>
      <text x={542} y={126} className="dg-box-sub">{es ? "enteros: z = 2, en (1, 2) y (2, 2)" : "integers: z = 2, at (1, 2), (2, 2)"}</text>
      <text x={542} y={150} className="dg-box-sub">{es ? "brecha 0.8: el 40% del optimo" : "gap 0.8: 40% of the optimum"}</text>
      <text x={542} y={174} className="dg-box-sub">{es ? "ningun optimo entero es" : "no integer optimum is"}</text>
      <text x={542} y={192} className="dg-box-sub">{es ? "un vertice del poligono" : "a vertex of the polygon"}</text>
      <text x={542} y={216} className="dg-box-sub">{es ? "redondear la respuesta" : "rounding the relaxed answer"}</text>
      <text x={542} y={234} className="dg-box-sub">{es ? "relajada sale del conjunto" : "leaves the feasible set"}</text>

      <text x={380} y={318} textAnchor="middle" className="dg-note">
        {es
          ? "La relajacion acota el optimo entero y no dice donde esta. Un modelo que olvida la integralidad informa la cota como si fuera la respuesta."
          : "The relaxation bounds the integer optimum and does not say where it is. A model that forgets integrality reports the bound as the answer."}
      </text>
    </svg>
  );
}
