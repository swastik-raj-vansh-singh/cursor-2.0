# 📄 Product Requirements Document (PRD): Code Iterator AI Tool for Aicade

## 🎯 Objective
Build an AI-powered code iterator tool (like Cursor) tailored for game developers. This tool will suggest, explain, and integrate code improvements in a real-time collaborative editor environment to boost productivity.

---

## 📊 Requirements Table

| Requirement ID | Description                                                                 | User Story                                                                 | Expected Behaviour / Outcome                                                                 | How to Do It                                                                                                                  |
|----------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| RQ-001         | Code Snippet Selection                                                     | As a developer, I want to select a portion of my code to pass as input     | User selects code, and it's highlighted and passed to the AI for processing                 | Implement a code editor (e.g., Monaco Editor) with selection detection and tokenization                                        |
| RQ-002         | Prompt Input                                                               | As a developer, I want to enter what I want the AI to do with the code     | Prompt is taken and shown alongside the selected code, ready to be sent to the AI           | Add a text input box for prompt entry, validate input, and send with code selection to backend                                 |
| RQ-003         | Generate Code Suggestions                                                  | As a developer, I want the AI to give improved code suggestions            | Modified code block appears alongside original with explanation of changes                   | Use OpenAI GPT-4 Turbo API (or local LLM like DeepSeek) with a code editing prompt template                                      |
| RQ-004         | Explanation of Changes                                                     | As a developer, I want to understand why a code suggestion was made        | Explanation shown in a clearly formatted diff or markdown area                              | Append explanations under or beside each suggested change, using tooltips or collapsible sections                              |
| RQ-005         | Integrate Suggested Code                                                   | As a developer, I want to directly apply the AI's suggestion               | Clicking "Integrate Code" updates the editor with suggested code                            | Implement a patching mechanism to insert suggested lines at the correct location, preserving structure                         |
| RQ-006         | Display Integrated Output                                                  | As a developer, I want to see my editor updated with integrated changes    | Final output reflects original + suggested changes                                           | Reload the code editor with new text and scroll to the change                                                                  |
| RQ-007         | Support for Specific Language (e.g., JavaScript or C# for game dev)       | As a developer, I want accurate suggestions for my language of choice      | AI provides valid and context-aware changes specific to that language                        | Fine-tune prompt templates per language and use syntax-aware code diffing/parsing libraries (e.g., tree-sitter)               |
| RQ-008         | Highlight Changes                                                          | As a developer, I want to easily see what was changed                      | Changes are highlighted inline or as a side-by-side diff view                               | Use visual diff libraries (e.g., diff2html) and integrate with the code editor                                                  |
| RQ-009         | Undo Applied Changes                                                       | As a developer, I want to revert AI changes if I don't like them           | An "Undo" option reverts back to previous state                                             | Maintain a snapshot history of the editor state before changes                                                                  |
| RQ-010         | Track Version History                                                      | As a developer, I want to track changes made by AI                         | Each applied change is stored and timestamped                                               | Use a versioning system with timestamp, user prompt, and generated code stored in localStorage or backend DB                   |
| RQ-011         | Responsive UI and Minimal Design                                           | As a developer, I want a clean, distraction-free interface                  | Responsive layout across mobile, tablet, and desktop                                        | Use TailwindCSS, implement dark/light themes, responsive grid and container design                                               |

---

## 🛠️ Tech Stack

- **Frontend:** React + Vite, Monaco Editor, TailwindCSS
- **Backend:** Node.js + Express / Flask
- **AI Model:** OpenAI GPT-4 Turbo or DeepSeek LLM (local inference option)
- **API Interaction:** REST + WebSockets for real-time suggestions
- **Diff Tool:** diff2html, tree-sitter (optional)
- **Storage:** LocalStorage (MVP), PostgreSQL (for history if needed)
- **Deployment:** Vercel / Render (Frontend), Railway / Docker (Backend)

---

## 🔌 API Usage

- **OpenAI GPT-4 Turbo API**
  - Endpoint: `https://api.openai.com/v1/chat/completions`
  - Model: `gpt-4-turbo`
  - Prompt Template:
    ```
    You are an expert game developer assistant. Take the following code and the developer's prompt to suggest a clear, optimized, and secure alternative. Also explain the changes in simple language.

    Code:
    <user_code>

    Prompt:
    <user_instruction>
    ```
- **Tree-Sitter (optional)**
  - Language parsing for AST-based modification and syntax validation

---

## 📦 Deliverables

- MVP Web App with:
  - Code Editor + Prompt Input + AI Suggestions
  - Explanation Panel + Apply Button + Undo Option
  - Clean UI & Mobile Responsive
- README.md with tool usage and setup instructions
- Demo video or live demo URL

---

## 📧 Submission Format

- Subject Line: `[Your Name] | AI Engineer Task`
- Attach:
  - Your Full Name
  - Phone Number
  - Demo Video / Live Link
  - Brief Description
