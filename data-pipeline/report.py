#!/usr/bin/env python
"""Build the published gap report from the run ledger and the corpus.

Everything the benchmark page shows comes out of this script. That matters more than it sounds: the
first version of `gap-report.json` was assembled by hand from a printed summary, and a hand-assembled
artifact cannot be checked against the ledger it claims to summarise. This one is a pure function of
two committed inputs, so a number on the page that disagrees with the ledger is a bug with a
reproduction rather than a discrepancy nobody can chase.

    python data-pipeline/report.py                      # rebuild from the default ledger
    python data-pipeline/report.py --ledger data/runs/optimization.jsonl --check

`--check` rebuilds and compares against the committed file without writing, which is what CI runs:
it is cheap, it needs no model call, and it fails when the artifact and the ledger have drifted.

Beyond the two headline rates, this adds the three breakdowns the page needs and the ledger already
supports: the rate against difficulty tier (the degradation curve), the rate against the trap each
case was built around, and the agreement between the executable layer and the faithfulness layers
(the confusion structure). None of them is a new measurement; all three are re-groupings of each
model's own records.

A model is its provider and its id together, `provider/model_id`, everywhere in the artifact:
copela's cells are per provider, and the breakdowns keyed by the id alone would merge one id served
by two providers while the cells kept them apart. The `models` list fixes one order, and every view
on the site draws in that order, so a model sits in the same row in every figure.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

from copela.ledger import Ledger
from copela.report import build
from copela.verdicts import Layer, Outcome, Rate
from corpus import cases as corpus_cases

REPO = Path(__file__).resolve().parent.parent
DEFAULT_LEDGER = REPO / "data" / "runs" / "optimization.jsonl"
#: The CANONICAL artifact, which is what deploy copies into the site. `frontend/public/data/` is a
#: working copy for the dev server and is not tracked, so writing only there produces a local site
#: that disagrees with the published one and nothing says so.
DEFAULT_OUT = REPO / "data" / "artifacts" / "gap-report.json"
DEV_COPY = REPO / "frontend" / "public" / "data" / "gap-report.json"
#: The per-case attempts, for the workbench's learned-model tools. A separate file because the
#: App needs it and the Benchmark does not, and because it carries the response excerpts, which
#: are most of its weight.
ATTEMPTS_OUT = REPO / "data" / "artifacts" / "attempts.json"
ATTEMPTS_DEV = REPO / "frontend" / "public" / "data" / "attempts.json"

#: The output cap every published sweep ran at. The ledger record does not carry the cap, so this
#: is the protocol stated once; a call that billed exactly this many output tokens is its evidence.
PROTOCOL_CAP = 8192

#: The order providers are drawn in: the hosted frontier first, the local lane last.
PROVIDER_ORDER = ("anthropic", "zai", "deepseek", "groq", "ollama")
LOCAL_PROVIDERS = frozenset({"ollama"})

#: What each provider lets a sweep pin, as the fingerprints record it, in both languages.
CONTROLS = {
    "anthropic": (
        "Claude takes no temperature and no seed, so none is recorded",
        "Claude no admite temperatura ni semilla, asi que no se registra ninguna",
    ),
    "zai": (
        (
            "GLM runs with greedy decoding (do_sample false), effort high where the model takes "
            "it, and no seed"
        ),
        (
            "GLM corre con decodificacion voraz (do_sample false), esfuerzo alto donde el modelo "
            "lo admite, y sin semilla"
        ),
    ),
    "deepseek": (
        "DeepSeek runs at effort high; its reasoning mode ignores temperature and it has no seed",
        (
            "DeepSeek corre con esfuerzo alto; su modo de razonamiento ignora la temperatura y no "
            "tiene semilla"
        ),
    ),
    "groq": (
        "Groq pins temperature and seed and returns a system fingerprint",
        "Groq fija temperatura y semilla y devuelve una huella del sistema",
    ),
    "ollama": (
        (
            "the local lane pins temperature 0 and a seed, with reasoning off where the model's "
            "template honours the switch"
        ),
        (
            "el carril local fija temperatura 0 y una semilla, con el razonamiento apagado donde "
            "la plantilla del modelo respeta el interruptor"
        ),
    ),
}

#: Every departure from the stated protocol, published as a caveat whenever its model is in the
#: ledger. A deviation that lives only in a commit message is one a reader of the page never sees.
PROTOCOL_NOTES = (
    {
        "model": "deepseek/deepseek-v4-pro",
        "en": (
            "The deepseek-v4-pro sweep reached its kill criterion, ten consecutive failures, after "
            "13 calls, and every one of the ten was a reply that spent the whole cap reasoning. It "
            "was resumed with the criterion at 20 to complete the corpus, because those failures "
            "were the measurement and not a fault of the harness."
        ),
        "es": (
            "El barrido de deepseek-v4-pro alcanzo su criterio de corte, diez fallos seguidos, tras "
            "13 llamadas, y cada uno de los diez fue una respuesta que gasto todo el tope "
            "razonando. Se reanudo con el criterio en 20 para completar el corpus, porque esos "
            "fallos eran la medicion y no una falla del arnes."
        ),
    },
)

#: copela's note, which the page prints, in the second language.
NOTE_ES = (
    "Las capas se informan por separado a proposito. No hay puntaje combinado: un solo numero "
    "dejaria que una tasa alta de 'corrio' oculte una tasa baja de 'fue correcto', que es la "
    "distancia que este informe existe para mostrar. Las tasas son sobre repeticiones con un "
    "intervalo de Wilson, porque fijar los controles que expone un proveedor no hace determinista "
    "la inferencia alojada, asi que una corrida sola no es un resultado."
)


def _caveat(en: str, es: str) -> dict[str, str]:
    return {"en": en, "es": es}


def caveats(records, models: list[dict[str, object]], failure: dict[str, dict[str, int]]) -> list:
    """What the measurement does not support, computed from the records rather than written down.

    The first version of this list was prose about two Claude models, and it went on saying so
    after the ledger held others. Every number below is read from the ledger; every sentence that
    names a provider appears only when that provider is in it.
    """
    out = []
    per_model = sorted({int(m["calls"]) for m in models})
    n = per_model[0]
    wilson = Rate(n // 2, n).to_json()
    out.append(
        _caveat(
            f"Each model ran {'/'.join(str(c) for c in per_model)} calls, one repeat per case, "
            f"which gives a wide interval: at n = {n} a rate of {wilson['value']:.2f} carries a Wilson "
            f"interval from {wilson['interval_low']:.2f} to {wilson['interval_high']:.2f}. Two models "
            "whose intervals overlap cannot be ranked against each other from this run.",
            f"Cada modelo corrio {'/'.join(str(c) for c in per_model)} llamadas, una repeticion "
            f"por caso, lo que da un intervalo ancho: con n = {n} una tasa de {wilson['value']:.2f} "
            f"lleva un intervalo de Wilson de {wilson['interval_low']:.2f} a {wilson['interval_high']:.2f}. "
            "Dos modelos cuyos intervalos se solapan no se pueden ordenar entre si con esta corrida.",
        )
    )
    if any(m["key"] == "anthropic/claude-haiku-4-5" for m in models):
        out.append(
            _caveat(
                "Run-to-run variation is real: an earlier pass of the identical corpus put "
                "claude-haiku-4-5 at ran 0.350, and the published pass puts it at 0.250, with "
                "nothing changed but the sampling. That is what the interval is for.",
                "La variacion entre corridas es real: una pasada anterior del mismo corpus puso a "
                "claude-haiku-4-5 en corrio 0.350, y la pasada publicada lo pone en 0.250, sin que "
                "cambiara nada salvo el muestreo. Para eso esta el intervalo.",
            )
        )
    out.append(
        _caveat(
            "The true statement is substituted before parsing and provenance offsets are "
            "recomputed from the quoted text. Both favour the model, and both are stated because "
            "the measurement is about formalization rather than transcription.",
            "El enunciado verdadero se sustituye antes de parsear y los desplazamientos de "
            "procedencia se recalculan desde el texto citado. Ambas cosas favorecen al modelo, y "
            "se declaran porque la medicion es sobre formalizacion y no sobre transcripcion.",
        )
    )
    present = [p for p in PROVIDER_ORDER if any(m["provider"] == p for m in models)]
    out.append(
        _caveat(
            "Providers expose different controls, and each record states the ones it pinned: "
            + "; ".join(CONTROLS[p][0] for p in present if p in CONTROLS)
            + ".",
            "Los proveedores exponen controles distintos, y cada registro declara los que fijo: "
            + "; ".join(CONTROLS[p][1] for p in present if p in CONTROLS)
            + ".",
        )
    )
    capped = sum(
        counts.get("truncated output", 0) + counts.get("no answer: the reasoning used the whole cap", 0)
        for counts in failure.values()
    )
    out.append(
        _caveat(
            f"One output cap for every model, {PROTOCOL_CAP} tokens. It binds on models that write "
            f"or reason at length: {capped} of the {len(records)} calls reached it, counted as "
            "'truncated output' or 'no answer: the reasoning used the whole cap'. A reasoning model "
            "spends the cap on reasoning first, so those are failures under this cap, not evidence "
            "about how it formalizes.",
            f"Un solo tope de salida para todos los modelos, {PROTOCOL_CAP} tokens. Muerde en los "
            f"modelos que escriben o razonan en extenso: {capped} de las {len(records)} llamadas lo "
            "alcanzaron, contadas como 'salida truncada' o 'sin respuesta: el razonamiento agoto el "
            "tope'. Un modelo que razona gasta el tope razonando primero, asi que esos son fallos "
            "bajo este tope, no evidencia de como formaliza.",
        )
    )
    out.append(
        _caveat(
            "The structural layer passes only when the canonical forms are equal, and refutes when "
            "the optima differ. A matching optimum never proves equivalence, because compensating "
            "errors reach the right number.",
            "La capa estructural aprueba solo cuando las formas canonicas son iguales, y refuta "
            "cuando los optimos difieren. Un optimo coincidente nunca prueba equivalencia, porque "
            "errores que se compensan llegan al numero correcto.",
        )
    )
    infeasible_ok = sum(counts.get("infeasible, as the case is", 0) for counts in failure.values())
    cases = ", ".join(sorted(_infeasible_cases()))
    out.append(
        _caveat(
            f"{cases} has no feasible point by design, and ran means reaching a feasible optimum, "
            "so it cannot be passed: a candidate that proves it infeasible, the right answer, is "
            f"recorded as not having run, and is classed 'infeasible, as the case is'. "
            f"{infeasible_ok} candidate(s) did so. Crediting it needs a structural check that can "
            "pass such a case, and is an open decision because it moves the published rates.",
            f"{cases} no tiene punto factible por diseno, y corrio significa alcanzar un optimo "
            "factible, asi que no se puede aprobar: un candidato que prueba que es infactible, la "
            "respuesta correcta, queda registrado como no ejecutado, y se clasifica 'infactible, "
            f"como el caso'. {infeasible_ok} candidato(s) lo hicieron. Acreditarlo requiere una "
            "comprobacion estructural capaz de aprobar un caso asi, y es una decision abierta "
            "porque mueve las tasas publicadas.",
        )
    )
    out.append(
        _caveat(
            "A candidate the configured solver cannot express is counted as unmeasured and excluded "
            "from both rates. Charging a limit of the instrument to the subject is the error this "
            "product exists to expose.",
            "Un candidato que el solucionador configurado no puede expresar se cuenta como no "
            "medido y se excluye de ambas tasas. Cargarle al sujeto un limite del instrumento es "
            "el error que este producto existe para exponer.",
        )
    )
    if any(m["provider"] == "zai" for m in models):
        out.append(
            _caveat(
                "The Z.AI calls were drawn from a GLM Coding Plan quota, so their cost is the "
                "list-price equivalent of the tokens, not what was billed.",
                "Las llamadas a Z.AI salieron de la cuota de un GLM Coding Plan, asi que su costo "
                "es el equivalente a precio de lista de los tokens, no lo facturado.",
            )
        )
    if any(m["lane"] == "local" for m in models):
        out.append(
            _caveat(
                "The local models ran on one laptop GPU with 8 GB of memory, each in a context "
                "that holds the prompt and the whole cap; their records carry that context and the "
                "digest of the weights behind each tag.",
                "Los modelos locales corrieron en una GPU de portatil con 8 GB de memoria, cada uno "
                "en un contexto que contiene el prompt y el tope completo; sus registros llevan ese "
                "contexto y el digest de los pesos detras de cada etiqueta.",
            )
        )
    keys = {m["key"] for m in models}
    for note in PROTOCOL_NOTES:
        if note["model"] in keys:
            out.append(_caveat(note["en"], note["es"]))
    free = [m for m in models if m["cost_usd"] == 0]
    if free:
        out.append(
            _caveat(
                f"The {len(free)} free models, those with no per-token price, ran with the kill "
                "criterion at 20, the corpus size, rather than 10: a free call costs nothing, and a "
                "completed corpus keeps their rows comparable with the rest.",
                f"Los {len(free)} modelos gratuitos, los que no tienen precio por token, corrieron "
                "con el criterio de corte en 20, el tamano del corpus, y no en 10: una llamada "
                "gratuita no cuesta nada, y un corpus completo mantiene sus filas comparables con el "
                "resto.",
            )
        )

    groups: dict[str, int] = defaultdict(int)
    for case in corpus_cases():
        groups[f"tier {int(case.tier)}"] += 1
        for trap in [str(t.value) for t in case.traps] or ["none"]:
            groups[f"trap {trap}"] += 1
    smallest, largest = min(groups.values()), max(groups.values())
    out.append(
        _caveat(
            f"The per-tier and per-trap rates are re-groupings of each model's own {n} records, so "
            f"their denominators run from {smallest} to {largest}. They indicate where to look "
            "next; they do not support a claim about any single tier or trap.",
            f"Las tasas por nivel y por trampa son reagrupaciones de los {n} registros propios de "
            f"cada modelo, asi que sus denominadores van de {smallest} a {largest}. Indican donde "
            "mirar despues; no sostienen una afirmacion sobre ningun nivel ni trampa.",
        )
    )
    return out


def model_key(record) -> str:
    """A model is its provider and its id: the same id served by two providers is two lanes."""
    return f"{record.key.provider}/{record.key.model_id}"


#: Ordered (substring, class) pairs, matched against the message HEAD only.
#:
#: Matching the whole message is what a first version of this function did, and it was wrong in a
#: way worth keeping a note about: the validator's message ends with the keys it actually found, as
#: in ``missing its 'unit' field; got keys ['dimension', 'tag', 'value']``. A generic test for the
#: word "dimension" then matched that key list, and five "a constant with no unit" failures were
#: filed as dimensional mismatches. The counts still summed to the right total, so nothing looked
#: wrong. Match the phrase the validator wrote, never a word that could appear in the data it quotes.
_CLASSES: tuple[tuple[str, str], ...] = (
    ("fabricated provenance", "fabricated provenance: words not in the statement"),
    ("missing its 'unit' field", "a constant with no unit"),
    # planteo 0.1.2 names the element that lacks a field; before it, the same defect reached the
    # ledger as a bare key, which _BARE_KEY catches, so both forms land in one class.
    ("an assumption is missing its 'span' field", "an assumption or open question with no span"),
    ("an open question is missing its 'span' field", "an assumption or open question with no span"),
    (" is missing its '", "a required field left out"),
    # planteo's closure check: "closure [demand]: referenced but never declared".
    ("referenced but never declared", "a name used but never declared"),
    # A parameter declared with no value passes validation and stops Pyomo when it builds the
    # model: "solving failed: No value for uninitialized ScalarParam object demand". The defect is
    # the formalization's, so it is named for that rather than filed as a solver failure.
    ("no value for uninitialized scalarparam", "a parameter left without a value"),
    ("is derived but no relation defines it", "a quantity declared derived and never defined"),
    ("cannot be compared", "dimensional mismatch"),
    # The same defect inside a sum: "dimensions [total_cost]: sum term 1 is USD/t*t but term 0 is
    # USD*t". It reached the catch-all the first time a local model wrote one.
    (": sum term ", "dimensional mismatch"),
    ("the json object is not closed", "truncated output"),
    # planteo's message is "quantity 'x' has lower 40.0 above upper 32.0". It used to fall through
    # to "unparseable output", and on the contradictory case it is not noise: it is the
    # contradiction, written into one variable, which the representation refuses.
    (" above upper ", "a variable whose lower bound is above its upper"),
)


@lru_cache(maxsize=1)
def _infeasible_cases() -> frozenset[str]:
    """The cases whose reference has no feasible point, read from the committed bake.

    Read rather than listed, so a case added to the corpus is classified by what its reference
    actually does. Only opt-019 today: opt-020 was authored as a contradiction and is not one.
    """
    cases_json = REPO / "data" / "artifacts" / "cases.json"
    baked = json.loads(cases_json.read_text(encoding="utf-8"))
    return frozenset(c["case_id"] for c in baked if not c["solution"]["feasible"])

#: A reply that was all reasoning and no answer. copela's providers return one sentence for it on
#: every lane (copela R-022), and the parser quotes the reply back as "It began: ...", so matching
#: from "it began:" means the sentence opened the response rather than appearing somewhere inside
#: a model's own text. The finish reason separates the cap running out, which is a truncation of a
#: different kind from a document cut off mid-way, from a model that reasoned and then stopped.
_BARE_KEY = re.compile(r"did not parse into a problem: '(?P<key>[a-z_]+)'$")

_NO_ANSWER = re.compile(
    r"it began: ['\"]\[no answer: the model emitted \d+ characters of reasoning and stopped "
    r"before answering(?: \(finish_reason (?P<reason>[a-z_]+)\))?"
)


def classify(record) -> str:
    """The failure class for one record, derived from its verdicts rather than assigned by hand."""
    verdicts = {v["layer"]: v for v in record.verdicts}
    executable = verdicts.get(Layer.EXECUTABLE.value)
    structural = verdicts.get(Layer.STRUCTURAL.value)

    if executable and executable["outcome"] == Outcome.NOT_APPLICABLE.value:
        return "not measured: the solver cannot express this model"

    if executable and executable["outcome"] == Outcome.FAIL.value:
        raw = executable.get("detail") or record.error or ""
        # Everything after "; got keys" is data the validator quoted back, not its diagnosis.
        head = raw.split("; got keys")[0].lower()

        # A bare KeyError from planteo, whose message is the missing key alone: "... problem:
        # 'span'". Only an assumption or an open question requires a span it can lack, so that
        # key names the element. These read as "unparseable output" until the first model outside
        # Anthropic left spans out three times.
        bare = _BARE_KEY.search(head)
        if bare:
            if bare.group("key") == "span":
                return "an assumption or open question with no span"
            return "a required field left out"
        no_answer = _NO_ANSWER.search(head)
        if no_answer:
            if no_answer.group("reason") == "length":
                return "no answer: the reasoning used the whole cap"
            return "no answer: it reasoned, then stopped"
        for needle, name in _CLASSES:
            if needle in head:
                return name
        if head.strip() == "infeasible":
            # On a case that has no feasible point, infeasible is the right answer, and the
            # executable layer still records it as a failure to run: ran means reaching a feasible
            # optimum, so a contradictory case cannot be passed. Both Claude runs of opt-019 were
            # filed as "the model it produced is infeasible", a class whose rule says "on a case
            # that has one", and that rule was false of every record it had ever held.
            if record.key.case_id in _infeasible_cases():
                return "infeasible, as the case is"
            return "the model it produced is infeasible"
        if head.strip() == "infeasibleorunbounded":
            # HiGHS reports the two together when its presolve cannot tell them apart.
            return "the model it produced is infeasible or unbounded"
        if "solving failed" in head:
            # The solver raised rather than returned a status. That is not infeasibility.
            return "the solver failed on the model it produced"
        if "the call failed" in head:
            return "the call itself failed"
        if "did not parse" in head:
            return "unparseable output"
        return "other executable failure"

    if structural and structural["outcome"] == Outcome.FAIL.value:
        # copela refutes on a feasibility mismatch as well as on a different optimum. On the
        # contradictory case a candidate that finds a feasible point has no optimum to differ from.
        if structural.get("detail", "").startswith("the reference is infeasible"):
            return "ran, then REFUTED: feasible where the case has no feasible point"
        return "ran, then REFUTED: solves to a different optimum"

    # The property layer can refute too, and a candidate on which neither strong layer decided has
    # not survived anything: it was never tested in a way that could have failed it. Both classes
    # are empty in the published ledger, and both used to fall through to "survived every check".
    prop = verdicts.get(Layer.PROPERTY.value)
    if prop and prop["outcome"] == Outcome.FAIL.value:
        return "ran, then REFUTED: a metamorphic relation failed"
    if not any(v is not None and v["outcome"] == Outcome.PASS.value for v in (structural, prop)):
        return "ran, and no layer decided"

    return "ran and survived every check"


def _ran(record) -> bool:
    executable = next((v for v in record.verdicts if v["layer"] == Layer.EXECUTABLE.value), None)
    return executable is not None and executable["outcome"] == Outcome.PASS.value


def _faithful(record) -> bool:
    """copela's rule, restated for the breakdowns: it ran, neither strong layer FAILED, and at least
    one of them PASSED.

    An earlier version dropped the last clause, so the breakdowns counted a candidate on which both
    strong layers were undecided as faithful while the headline rate, computed by copela, did not.
    The published ledger has no such candidate, so every published number is unchanged; the two
    definitions would have parted on the first one.
    """
    if not _ran(record):
        return False
    decided = False
    for layer in (Layer.STRUCTURAL.value, Layer.PROPERTY.value):
        found = next((v for v in record.verdicts if v["layer"] == layer), None)
        if found is not None and found["outcome"] == Outcome.FAIL.value:
            return False
        if found is not None and found["outcome"] == Outcome.PASS.value:
            decided = True
    return decided


def _unmeasured(record) -> bool:
    executable = next((v for v in record.verdicts if v["layer"] == Layer.EXECUTABLE.value), None)
    return executable is not None and executable["outcome"] == Outcome.NOT_APPLICABLE.value


def breakdowns(ledger: Ledger) -> dict[str, object]:
    """The three re-groupings, plus the failure taxonomy."""
    tier_of = {case.case_id: int(case.tier) for case in corpus_cases()}
    traps_of = {
        case.case_id: [str(trap.value) for trap in case.traps] or ["none"]
        for case in corpus_cases()
    }

    failure: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    by_tier: dict[str, dict[int, list[bool]]] = defaultdict(lambda: defaultdict(list))
    by_trap: dict[str, dict[str, list[bool]]] = defaultdict(lambda: defaultdict(list))
    agreement: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for record in ledger:
        model = model_key(record)
        failure[model][classify(record)] += 1

        if _unmeasured(record):
            continue

        ran, faithful = _ran(record), _faithful(record)
        tier = tier_of.get(record.key.case_id)
        if tier is not None:
            by_tier[model][tier].append(faithful)
        for trap in traps_of.get(record.key.case_id, ["none"]):
            by_trap[model][trap].append(faithful)

        # The four quadrants. The empty one is the interesting claim: faithful without running is
        # impossible by construction, and a nonzero count there would mean the definitions drifted.
        agreement[model][f"{'ran' if ran else 'did-not-run'}/{'faithful' if faithful else 'not-faithful'}"] += 1

    return {
        "failure_breakdown": {model: dict(counts) for model, counts in failure.items()},
        "by_tier": {
            model: {
                str(tier): Rate(sum(values), len(values)).to_json()
                for tier, values in sorted(tiers.items())
            }
            for model, tiers in by_tier.items()
        },
        "by_trap": {
            model: {
                trap: Rate(sum(values), len(values)).to_json()
                for trap, values in sorted(traps.items())
            }
            for model, traps in by_trap.items()
        },
        "layer_agreement": {model: dict(counts) for model, counts in agreement.items()},
    }


def attempts(ledger_path: Path) -> dict[str, object]:
    """Every model's attempt at every case, in the shape the workbench reads.

    Nothing here is a new measurement. It is the ledger re-keyed by case, with each record's
    failure class derived exactly as the report derives it, so the workbench and the Benchmark
    cannot tell two different stories about the same call.
    """
    ledger = Ledger(ledger_path)
    by_case: dict[str, list[dict[str, object]]] = defaultdict(list)
    for record in ledger:
        by_case[record.key.case_id].append(
            {
                "model": model_key(record),
                "model_id": record.key.model_id,
                "provider": record.key.provider,
                "repeat": record.key.repeat,
                "failure_class": classify(record),
                "verdicts": [
                    {"layer": v["layer"], "outcome": v["outcome"], "detail": v.get("detail", "")}
                    for v in record.verdicts
                ],
                "cost_usd": round(record.cost_usd, 6),
                "latency_ms": round(record.latency_ms, 1),
                "input_tokens": record.input_tokens,
                "output_tokens": record.output_tokens,
                "response_excerpt": record.response_excerpt,
                "model_version": record.model_version,
                "provider_fingerprint": record.provider_fingerprint,
            }
        )
    rank = {m["key"]: i for i, m in enumerate(model_order(ledger))}
    return {
        # 1.1: each attempt names its model as provider/model_id, and attempts are in the report's
        # model order, so the workbench lists models the way the Benchmark draws them.
        "schema": "enunciado-attempts/1.1",
        "cases": {
            case_id: sorted(rows, key=lambda r: (rank[r["model"]], r["repeat"]))
            for case_id, rows in sorted(by_case.items())
        },
    }


def model_order(ledger: Ledger) -> list[dict[str, object]]:
    """Every model once, in the one order the site draws them in, with what the page says about it.

    Hosted providers first, in PROVIDER_ORDER, then the local lane; inside a provider, by faithful
    rate and then by id, so a group reads from best to worst and ties never reorder between runs.
    """
    rows: dict[str, dict[str, object]] = {}
    for record in ledger:
        key = model_key(record)
        row = rows.setdefault(
            key,
            {
                "key": key,
                "provider": record.key.provider,
                "model_id": record.key.model_id,
                "lane": "local" if record.key.provider in LOCAL_PROVIDERS else "hosted",
                "calls": 0,
                "faithful": 0,
                "cost_usd": 0.0,
                "latencies": [],
                "outputs": [],
                "versions": set(),
                "fingerprints": set(),
                "dates": [],
            },
        )
        row["calls"] += 1
        row["faithful"] += int(_faithful(record))
        row["cost_usd"] += record.cost_usd
        row["latencies"].append(record.latency_ms)
        row["outputs"].append(record.output_tokens)
        row["versions"].add(record.model_version)
        row["fingerprints"].add(record.provider_fingerprint)
        row["dates"].append(record.recorded_at[:10])

    def median(values: list[float]) -> float:
        ordered = sorted(values)
        middle = len(ordered) // 2
        return ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) / 2

    def rank(row: dict[str, object]) -> tuple:
        provider = str(row["provider"])
        position = PROVIDER_ORDER.index(provider) if provider in PROVIDER_ORDER else len(PROVIDER_ORDER)
        return (position, -int(row["faithful"]) / int(row["calls"]), str(row["model_id"]))

    return [
        {
            "key": row["key"],
            "provider": row["provider"],
            "model_id": row["model_id"],
            "lane": row["lane"],
            "calls": row["calls"],
            "cost_usd": round(float(row["cost_usd"]), 4),
            "median_latency_s": round(median(row["latencies"]) / 1000, 1),
            "median_output_tokens": int(median(row["outputs"])),
            "at_cap": sum(1 for tokens in row["outputs"] if tokens >= PROTOCOL_CAP),
            "model_versions": sorted(row["versions"]),
            "fingerprints": sorted(row["fingerprints"]),
            "measured_from": min(row["dates"]),
            "measured_to": max(row["dates"]),
        }
        for row in sorted(rows.values(), key=rank)
    ]


#: The same protocol at another output cap, one ledger per cap, named for it. Kept apart from the
#: main ledger because the ledger key has no cap in it: a second cap in the same file would be
#: skipped as already done, or would silently change what a row measures.
SENSITIVITY_PATTERN = re.compile(r"^optimization-cap(?P<cap>\d+)\.jsonl$")
SENSITIVITY_OUT = REPO / "data" / "artifacts" / "cap-sensitivity.json"
SENSITIVITY_DEV = REPO / "frontend" / "public" / "data" / "cap-sensitivity.json"


def _sensitivity_ledgers() -> list[tuple[int, Path]]:
    found = []
    for path in sorted((REPO / "data" / "runs").glob("optimization-cap*.jsonl")):
        match = SENSITIVITY_PATTERN.match(path.name)
        if match:
            found.append((int(match.group("cap")), path))
    return found


def _at_cap(ledger: Ledger, cap: int) -> dict[str, dict[str, object]]:
    """Each model's rates at one cap, through copela's own rule, with what the cap cost it."""
    cells = {f"{c['provider']}/{c['model_id']}": c for c in build(ledger).to_json()["cells"]}
    records: dict[str, list] = defaultdict(list)
    for record in ledger:
        records[model_key(record)].append(record)
    out = {}
    for key, rows in records.items():
        cell = cells[key]
        outputs = sorted(r.output_tokens for r in rows)
        middle = len(outputs) // 2
        failures: dict[str, int] = defaultdict(int)
        for record in rows:
            failures[classify(record)] += 1
        out[key] = {
            "calls": len(rows),
            "ran": cell["ran"],
            "faithful": cell["faithful"],
            "gap": cell["gap"],
            "at_cap": sum(1 for tokens in outputs if tokens >= cap),
            # What the calls failed on at this cap: the reason the comparison exists is that a
            # binding cap hides the formalization errors behind truncations.
            "failure_breakdown": dict(sorted(failures.items())),
            "cost_usd": round(sum(r.cost_usd for r in rows), 4),
            "median_output_tokens": int(
                outputs[middle] if len(outputs) % 2 else (outputs[middle - 1] + outputs[middle]) / 2
            ),
        }
    return out


def cap_sensitivity(ledger_path: Path) -> dict[str, object] | None:
    """The models that ran at a second cap, side by side with their run at the protocol's cap."""
    extra = _sensitivity_ledgers()
    if not extra:
        return None
    main = _at_cap(Ledger(ledger_path), PROTOCOL_CAP)
    rows: dict[str, dict[str, object]] = {}
    for cap, path in extra:
        for key, summary in _at_cap(Ledger(path), cap).items():
            provider, _, model_id = key.partition("/")
            row = rows.setdefault(
                key, {"model": key, "provider": provider, "model_id": model_id, "by_cap": {}}
            )
            if key in main:
                row["by_cap"][str(PROTOCOL_CAP)] = main[key]
            row["by_cap"][str(cap)] = summary
    order = {m["key"]: i for i, m in enumerate(model_order(Ledger(ledger_path)))}
    return {
        "schema": "enunciado-cap-sensitivity/1.0",
        "caps": sorted({PROTOCOL_CAP, *(cap for cap, _ in extra)}),
        "rows": sorted(rows.values(), key=lambda r: (order.get(r["model"], len(order)), r["model"])),
    }


def assemble(ledger_path: Path) -> dict[str, object]:
    ledger = Ledger(ledger_path)
    records = ledger.records()
    if not records:
        raise SystemExit(f"{ledger_path} holds no records; nothing to report")

    report = build(ledger).to_json()
    report.update(breakdowns(ledger))
    models = model_order(ledger)
    rank = {m["key"]: i for i, m in enumerate(models)}
    for cell in report["cells"]:
        cell["model"] = f"{cell['provider']}/{cell['model_id']}"
    report["cells"].sort(key=lambda cell: rank[cell["model"]])

    report["schema"] = "enunciado-gap-report/2.0"
    report["models"] = models
    report["measured_from"] = min(record.recorded_at for record in records)[:10]
    report["measured_to"] = max(record.recorded_at for record in records)[:10]
    report["corpus"] = {
        "family": "optimization",
        "cases": len({r.key.case_id for r in records}),
        "tiers": len({int(case.tier) for case in corpus_cases()}),
        "repeats": max(r.key.repeat for r in records) + 1,
    }
    report["cost_usd"] = round(ledger.total_cost_usd, 4)
    report["protocol_cap"] = PROTOCOL_CAP
    report["call_count"] = len(records)
    report["caveats"] = caveats(records, models, report["failure_breakdown"])
    report["note_es"] = NOTE_ES
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument(
        "--check",
        action="store_true",
        help="compare against the committed file instead of writing it",
    )
    args = parser.parse_args()

    report = assemble(args.ledger)
    sensitivity = cap_sensitivity(args.ledger)

    def render(value: object) -> str:
        return json.dumps(value, indent=1, sort_keys=True) + "\n"

    outputs = [
        (args.out, DEV_COPY, render(report)),
        (ATTEMPTS_OUT, ATTEMPTS_DEV, render(attempts(args.ledger))),
        # None when no second-cap ledger exists: then the file must not exist either, or the site
        # would publish a comparison whose ledger is gone.
        (SENSITIVITY_OUT, SENSITIVITY_DEV, render(sensitivity) if sensitivity else None),
    ]

    if args.check:
        drift = []
        for path, _dev, text in outputs:
            if text is None:
                if path.exists():
                    drift.append(f"{path} exists and no ledger produces it")
            elif not path.exists():
                drift.append(f"{path} does not exist")
            elif path.read_text(encoding="utf-8") != text:
                drift.append(f"{path} does not match what the ledgers produce")
        if drift:
            for line in drift:
                print(line, file=sys.stderr)
            print("Re-run without --check and commit the result.", file=sys.stderr)
            return 1
        names = ", ".join(path.name for path, _dev, text in outputs if text is not None)
        print(f"{names} match the ledgers ({report['call_count']} calls in the main one)")
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    for path, dev, text in outputs:
        if text is None:
            continue
        # The main report's path may be overridden; its companions are written only for the default.
        if path is not args.out and args.out != DEFAULT_OUT:
            continue
        path.write_text(text, encoding="utf-8")
        # Keep the dev server's copies in step, so a local run and the published site show the
        # same numbers. Only for the canonical files; a custom --out is the caller's.
        if args.out == DEFAULT_OUT and dev.parent.exists():
            dev.write_text(text, encoding="utf-8")
        print(f"wrote {path.name}")
    print(f"from {report['call_count']} record(s) in {args.ledger.name}")
    for cell in report["cells"]:
        gap = f"{cell['gap']:+.3f}" if cell["gap_is_defined"] else "UNDEFINED"
        print(
            f"  {cell['model']:<34} ran {cell['ran']['value']:.3f}  "
            f"faithful {cell['faithful']['value']:.3f}  gap {gap}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
