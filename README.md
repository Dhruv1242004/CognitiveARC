# CognitiveARC

CognitiveARC is a modular AI agent platform that combines retrieval, planning, tool orchestration, and memory to generate grounded responses from uploaded knowledge sources.

## Overview

CognitiveARC provides an interactive full-stack experience for:
- Uploading and indexing documents
- Running contextual Q&A over indexed content
- Inspecting agent reasoning, retrieved context, and tool activity
- Maintaining lightweight session memory across interactions

The system is designed for clarity, extensibility, and practical experimentation with agent pipelines.

## Core Features

- End-to-end agent pipeline (planning -> retrieval -> tools -> response)
- Retrieval-augmented generation (RAG) with vector search
- Session memory support for follow-up queries
- Multi-format upload support:
  - Documents: `.pdf`, `.docx`, `.pptx`, `.xlsx`
  - Text/code: `.txt`, `.md`, `.csv`, `.json`, `.py`, `.js`, `.ts`, `.tsx`, `.jsx`
  - Images (OCR): `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tiff`
- Tool activity visibility in UI
- Scroll-animated architecture section and polished landing experience
- Groq-powered LLM integration

## Tech Stack

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- FastAPI
- Python
- ChromaDB (vector storage)
- Groq API (LLM)
- PyPDF / python-docx / python-pptx / openpyxl
- Pillow + pytesseract (image OCR)

## Project Structure

```text
.
├── src/
│   ├── app/                 # Next.js app router
│   └── components/          # UI sections/components
├── backend/
│   ├── main.py              # FastAPI app and endpoints
│   ├── agent/               # planner, retriever, tools, pipeline, memory
│   ├── services/            # llm client, vector db integration
│   └── utils/               # chunking, document extraction
├── public/                  # static assets / branding
└── README.md

```

## Architecture Flow
```
1.User submits query (optionally with uploaded document context)
2.Planner classifies intent and prepares execution plan
3.Retriever fetches relevant chunks from vector store (if applicable)
4.Memory manager loads session history
5.Tool router executes selected tools
6.LLM generates grounded response
7.Result is returned with:
    reasoning steps
    retrieved context
    tool activity
    final response
