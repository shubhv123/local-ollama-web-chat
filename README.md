# Local Ollama Chat

A private, minimalist, Notion-inspired black and white chat application that runs completely locally, communicating with your local Ollama models (such as `gemma3:1b`). Features Neo-Brutalist 3D interaction components, physical active button press styles, and a rotating CSS 3D cube.

---

## Features
- **Minimalist Aesthetics**: Designed with a Notion-style color palette (paper whites, deep grays, black borders, and clean monospaced code blocks).
- **Physical 3D Interaction**: Tactile button active states, floating elevation effects, and custom CSS 3D rotating cube animations.
- **Local Message History**: Persists chat history across page reloads using browser `localStorage` (100% private).
- **Live Output Streaming**: Streams responses chunk-by-chunk using Server-Sent Events (SSE) from the FastAPI backend.
- **Rich Formatting**: Parsed Markdown formatting (lists, bold text, italics) with Prism.js syntax highlighting for code segments.
- **Local Run**: 100% offline; requires no external API keys.

---

## Folder Structure
```
Chat Model/
├── app.py                  # FastAPI Backend & Server
├── requirements.txt        # Python library dependencies
├── README.md               # Project documentation
├── .gitignore              # Ignored local files
└── static/                 # Web assets
    ├── index.html          # Structure & Markdown integrations
    ├── css/
    │   └── style.css       # Custom Neo-Brutalist & 3D styling rules
    └── js/
        └── app.js          # App lifecycle, history, and streaming client
```

---

## Prerequisites
1. [Ollama](https://ollama.com/) must be installed and running on your local machine.
2. The `gemma3:1b` model (or your preferred local model) must be pulled:
   ```bash
   ollama pull gemma3:1b
   ```

---

## Setup & Running the Workspace

1. **Activate the Virtual Environment**:
   ```bash
   source .venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the FastAPI Server**:
   ```bash
   python app.py
   ```

4. **Access the Chat Client**:
   Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your web browser.
