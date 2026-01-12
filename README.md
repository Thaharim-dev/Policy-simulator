# Policy Deep Agent Simulator (5-Stage VAPS)
An advanced policy analysis tool that utilizes a **Generate-Critique-Synthesize** Deep Agent pattern to rigorously evaluate policy ideas.

##  Overview
This simulator processes initial policy ideas through five distinct stages of the policy cycle. Each stage is governed by a specific dimension—**Ability (A)**, **Integrity (I)**, or **Benevolence (B)**—to ensure the final output is robust, ethical, and feasible.

##  The Deep Agent Architecture
Instead of a single-step generation, every stage employs a three-phase self-correction loop:
1. **Generation Agent**: Creates the initial plan or report based on the policy context.
2. **Critique Agent**: Rigorously challenges the output for flaws in Ability, Integrity, or Benevolence.
3. **Synthesis Agent**: Merges the original idea with the critique to produce a refined, final report.

##  The 5-Stage Framework
| Stage | Dimension | Focus |
| :--- | :--- | :--- |
| **1. Agenda Setting** | **Benevolence (B)** | Identifies and addresses arguments from the most vulnerable stakeholders. |
| **2. Formulation** | **Ability (A)** | Uses data-grounded research to create measurable problem statements. |
| **3. Selection** | **Integrity/Ability (I/A)** | Evaluates institutional constraints and identifies hidden costs or conflicts of interest. |
| **4. Implementation** | **Ability (A)** | Employs a Red Team to find logistical bottlenecks and coordination failures. |
| **5. Evaluation** | **Integrity (I)** | Acts as an auditor to challenge data quality and attribution bias. |

##  Technical Setup
***Frontend**: Built with TailwindCSS for a responsive, modern UI.
* **Intelligence**: Powered by the Gemini 2.5 Flash model for high-speed, iterative reasoning.
* **Persistence**: Integrates with Firebase/Firestore to save and load simulation histories.

## 📝 How to Use
1. Clone the repository.
2. Add your `API_KEY` to the `script.js` file.
3. Open `index.html` in your browser.
4. Enter a policy idea (e.g., "Implement a 4-day work week") and follow the guided stages.
