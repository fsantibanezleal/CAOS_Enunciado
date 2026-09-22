/**
 * The citation set.
 *
 * Every entry carries a real link. A bare author-year with nothing to follow reads as fabricated,
 * and in a product whose whole subject is unverified claims that would be an embarrassment.
 *
 * Each one was read at its primary page, not through a summary. Where only a secondary source was
 * available, the entry says so.
 */

import type { Citation } from "@fasl-work/caos-app-shell";

export const CITATIONS: Citation[] = [
  {
    id: "survey2025",
    label: "Xiao et al. 2025",
    citation:
      "Xiao, Z., Xie, J., Xu, L., Guan, S., Zhu, J., Han, X., Fu, X., Yu, W., Wu, H., Shi, W., Kang, Q., Duan, J., Zhong, T., Yuan, M., Zeng, J., Wang, Y., Chen, G., Zhang, D. A Survey of Optimization Modeling Meets LLMs: Progress and Future Directions. arXiv:2508.10047, 2025.",
    url: "https://arxiv.org/abs/2508.10047",
  },
  {
    id: "lean2026",
    label: "Zhang et al. 2026",
    citation:
      "Zhang, K., Gallardo Candela, P., Murthy, S., Xie, Y., Wang, Z., Raissi, M. Beyond Compilation: Evaluating Faithful Natural-Language-to-Lean Statement Formalization. arXiv:2606.31002, 2026.",
    url: "https://arxiv.org/abs/2606.31002",
  },
  {
    id: "scope2026",
    label: "Liu et al. 2026",
    citation:
      "Liu, Z., Wu, J., Peng, R., Ji, Y., Li, D., Jiang, R., Zhang, Y. Can LLM design high-quality experiments? A Comprehensive and Systematic Benchmark on Autonomous Experimental Design. arXiv:2608.03501, 2026.",
    url: "https://arxiv.org/abs/2608.03501",
  },
  {
    id: "beams2026",
    label: "Metcalf and Schoenberg 2026",
    citation:
      "Metcalf, S., Schoenberg, W. BEAMS: Benchmarking and Evaluating AI for Modeling and Simulation. arXiv:2605.28994, 2026.",
    url: "https://arxiv.org/abs/2605.28994",
  },
  {
    id: "common2025",
    label: "Mensfelt et al. 2025",
    citation:
      "Mensfelt, A., Tena Cucala, D., Franco, S., Koutsoukou-Argyraki, A., Trencsenyi, V., Stathis, K. Towards a Common Framework for Autoformalization. arXiv:2509.09810, 2025. To appear, AAAI 2026.",
    url: "https://arxiv.org/abs/2509.09810",
  },
  {
    id: "orgeval2025",
    label: "Wang et al. 2025",
    citation:
      "Wang, Z., Zhu, Z., Li, Z., et al. ORGEval: Graph-Theoretic Evaluation of LLMs in Optimization Modeling. arXiv:2510.27610, 2025.",
    url: "https://arxiv.org/abs/2510.27610",
  },
  {
    id: "ears2009",
    label: "Mavin et al. 2009",
    citation:
      "Mavin, A., Wilkinson, P., Harwood, A., Novak, M. Easy Approach to Requirements Syntax (EARS). 17th IEEE International Requirements Engineering Conference (RE'09), pp. 317-322, 2009.",
    doi: "10.1109/RE.2009.9",
  },
  {
    id: "highs",
    label: "HiGHS",
    citation:
      "Huangfu, Q., Hall, J. A. J. Parallelizing the dual revised simplex method. Mathematical Programming Computation 10(1), 119-142, 2018. HiGHS is distributed under the MIT license.",
    doi: "10.1007/s12532-017-0130-5",
  },
  {
    id: "pyomo",
    label: "Pyomo",
    citation:
      "Bynum, M. L., Hackebeil, G. A., Hart, W. E., Laird, C. D., Nicholson, B. L., Siirola, J. D., Watson, J.-P., Woodruff, D. L. Pyomo, Optimization Modeling in Python. Third edition, Springer, 2021.",
    doi: "10.1007/978-3-030-68928-5",
  },
];
