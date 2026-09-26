# Manuscripts

| Manuscript | Source | Numbers |
|---|---|---|
| The formalization gap on authored optimization problems | [`narrative-to-optimization/tex/main.tex`](narrative-to-optimization/tex/main.tex) | [`make_numbers.py`](narrative-to-optimization/make_numbers.py) |

The text types no measured number. `make_numbers.py` transcribes every one from `data/artifacts/`
(the report, the cap comparison, the per-call attempts and the bake), which CI checks against the
per-call records, into `tex/numbers.tex`, the three table bodies and the figure data. Build:

```bash
python manuscripts/narrative-to-optimization/make_numbers.py
cd manuscripts/narrative-to-optimization/tex
pdflatex main && bibtex main && pdflatex main && pdflatex main
```

The page-1 header follows the programme's manuscript header standard; the four document macros
(`\docversion`, `\docdate`, `\versiondoi`, `\conceptdoi`) are set when the version DOI is reserved.
