<div align="center">

# GameGuard QA

**Catch game-breaking regressions before players do.**

A Python QA framework that protects player saves, checks update compatibility, and blocks builds that fail quality checks.

[**▶ Try the Interactive QA Lab**](https://the-victor-marino.github.io/gameguard-qa/) · [View the tests](tests/) · [Explore the code](gameguard/)

[![QA tests](https://github.com/the-victor-marino/gameguard-qa/actions/workflows/gameguard-ci.yml/badge.svg)](https://github.com/the-victor-marino/gameguard-qa/actions/workflows/gameguard-ci.yml)
[![Interactive demo](https://github.com/the-victor-marino/gameguard-qa/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/the-victor-marino/gameguard-qa/actions/workflows/deploy-web.yml)
![Python 3.11/3.12](https://img.shields.io/badge/Python-3.11%20%7C%203.12-3776AB?logo=python&logoColor=white)

</div>

---

### What does it do?

| | QA check | Why it matters |
| :-- | :-- | :-- |
| 🛡️ | **Save integrity** | Detects corrupted player data and invalid game states. |
| 🔄 | **Save compatibility** | Verifies that v1 → v2 updates preserve player progression. |
| 📉 | **Performance regression** | Flags load time, frame time, and memory budget violations. |
| 🚦 | **Release quality gate** | Combines save and performance results into **PASS / FAIL**. |

**30 automated test cases** · Unit · Integration · Destructive · Regression · Performance

### See it in action

**Healthy build** → checks pass → **Release approved** ✅

**Corrupted save or slow build** → checks fail → **Release blocked** ❌

**[Open the interactive demo →](https://the-victor-marino.github.io/gameguard-qa/)**

### Run the tests

```bash
git clone https://github.com/the-victor-marino/gameguard-qa.git
cd gameguard-qa
python -m pip install -r requirements.txt
pytest
```

<details>
<summary><strong>More: CLI commands & technical documentation</strong></summary>

```bash
python -m gameguard.save_guard.cli test_data/saves/corrupted_save.json
python -m gameguard.quality_gate.gate
python -m gameguard.reporting.report
```

[Architecture](docs/ARCHITECTURE.md) · [Test strategy](docs/TEST_STRATEGY.md) · [Save Guardian](docs/SAVE_GUARDIAN.md) · [Bug reports](docs/BUG_REPORTS.md)

</details>

---

<sub>**Built with:** Python · pytest · GitHub Actions · React · TypeScript · Pyodide. Uses a simulated RPG and fixture-based performance metrics; not a production game-engine integration.</sub>
