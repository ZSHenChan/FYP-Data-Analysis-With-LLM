# Synthesizing Objectivity: A Multi-Agent Code-Generation Framework for Bias Simulation

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Architecture](https://img.shields.io/badge/Architecture-Graph%20Theory%20%7C%20Agentic-purple)
![Focus](https://img.shields.io/badge/Focus-Bias%20Mitigation-green)

> **Final Year Project (FYP)** > **Institution:** Nanyang Technological University (NTU)  
> **Topic:** Automated Data Scientist & Neutral Interpretation Workflow

---

## 📖 Abstract

Human interpretation of data is inherently susceptible to cognitive biases. While Large Language Models (LLMs) act as automated data analysts, they often mirror user biases or training artifacts. This project introduces a **"Bias-Contrastive" Agentic Framework** that goes beyond simple text analysis.

The system utilizes a **Hierarchical TaskGraph Architecture** where a `MasterAgent` orchestrates specialized `CodeAgents` to generate executable Python code for data processing and visualization. The research novelty lies in the **Analysis Layer**, where distinct "Persona Agents" (Optimist, Pessimist, Skeptic) interpret the generated visualizations to force divergent viewpoints. These viewpoints are then mathematically aggregated by a `Synthesizer` to produce a bias-minimized, objective report.

---

## ⚙️ System Architecture

The workflow combines **Self-Correcting Code Generation** with **Multi-Perspective Analysis**.

```mermaid
graph TD
    User(["User Query"]) --> A["MasterAgent (Planner)"]

    subgraph Execution ["Execution Layer (TaskGraph)"]
        A --> B["TaskNode 1: Data Cleaning"]
        A --> C["TaskNode 2: Modeling"]
        A --> D["TaskNode 3: Visualization"]
    end

    subgraph Correction ["Self-Correcting Code Loop"]
        D --> E{"ActionGraph"}
        E -- "Generate Code" --> F["CodeExecutor"]
        F -- "Error (stderr)" --> E
        F -- "Success (stdout)" --> G["Generated Artifacts (Plots/Tables)"]
    end

    subgraph Research ["Research Layer: Bias Injection"]
        G --> H["AnalysisAgent: The Bull"]
        G --> I["AnalysisAgent: The Bear"]
        G --> J["AnalysisAgent: The Skeptic"]

        H --> K("The Neutral Synthesizer")
        I --> K
        J --> K
    end

    K -- "Final Insight" --> A
    A -- "Response" --> User
```
