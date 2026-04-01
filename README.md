# 📄 Multi-Agent AI System for GED

An AI-powered **multi-agent system** designed to enhance a **Gestion Électronique de Documents (GED)** platform by providing intelligent, context-aware document processing and assistance.

This project is developed as part of an internship (PFE) and focuses on building a **modular AI architecture** using multiple specialized agents that collaborate to process and understand documents.

---

## 📌 Project Overview

The objective of this project is to design and implement a **multi-agent AI system** capable of:

- Automating document processing and analysis  
- Adapting to different business domains (HR, legal, etc.)  
- Leveraging contextual information (document types, workflows, terminology)  
- Providing intelligent assistance within a GED platform  

The system is inspired by **MCP (Model Context Protocol)** principles to structure communication between agents, while remaining practical and implementable using real technologies.

---

## 🧠 Architecture

The system follows a **hybrid full-stack + AI microservices architecture**:

- **Frontend (React)** → User interface for document upload and results visualization  
- **Backend (Node.js + Express)** → Orchestrator (central controller)  
- **AI Agents (Python + FastAPI)** → Specialized processing services  
- **Database (MongoDB)** → Storage for documents and extracted data  

### 🔁 Global Workflow
User → React UI → Node.js Orchestrator → AI Agents (Python) → MongoDB

---

## 🤖 Multi-Agent System

The platform is composed of:

### 🧠 Orchestrator (Node.js)
- Handles incoming requests  
- Coordinates agent execution  
- Manages workflow and data flow  
- Communicates with all AI agents  

### 🤖 Specialized AI Agents (Python)
Each agent performs a dedicated task:
- Document classification  
- Information extraction  
- Summarization  
- Context-aware processing  

This modular design allows easy extension by adding new agents.

---

## 🚀 Proof of Concept (POC): HR Contract Pipeline

To validate the architecture, a **Proof of Concept (POC)** is implemented using a real-world HR scenario.

### 🎯 Use Case
Automated processing of HR contracts (PDF or image files).

### 🔄 Processing Pipeline

1. 📤 Upload HR contract  
2. 🔍 Extract text using OCR  
3. 🏷️ Classify document type (CDI, CDD, internship, etc.)  
4. 📊 Extract key information:
   - Employee name  
   - Position  
   - Salary  
   - Contract dates  
5. 📝 Generate a concise summary  
6. ✅ Handle validation / signature step  
7. 💾 Store processed data in MongoDB  

---

## 🤖 Agents (POC Implementation)

| Agent | Port | Responsibility |
|------|------|----------------|
| OCR Agent | 8001 | Extract text from PDF/image |
| Classification Agent | 8002 | Identify document type |
| Extraction Agent | 8003 | Extract structured data (name, salary, dates) |
| Summarization Agent | 8004 | Generate contract summary |

---

## 🛠️ Tech Stack

### 🌐 Frontend
- React.js

### ⚙️ Backend
- Node.js
- Express.js

### 🧠 AI & Microservices
- Python
- FastAPI

### 🗄️ Database
- MongoDB

### 📄 OCR
- Tesseract OCR

### 🤖 AI Models
- Ollama (local models such as LLaMA, Mistral)

---

## ⚙️ Key Features

- Multi-agent AI architecture  
- Modular and scalable system design  
- Real document processing pipeline  
- Context-aware AI processing  
- REST API communication between services  
- Fully based on free and local tools  

---

## 📁 Project Structure (planned)

root/
│
├── client/ # React frontend
├── server/ # Node.js orchestrator
│
├── agents/
│ ├── ocr-agent/
│ ├── classification-agent/
│ ├── extraction-agent/
│ └── summarization-agent/
│
├── database/
└── README.md

---

## ▶️ How to Run

Instructions will be added progressively as the project is developed.

---

## 📌 Future Improvements

- Extend to other domains (legal, finance, etc.)  
- Improve context-aware reasoning  
- Implement advanced agent communication (closer to MCP)  
- Add more specialized agents  
- Integrate real digital signature systems  

---

## 🎯 Learning Objectives

This project demonstrates:

- Full-stack development (MERN)  
- Python-based AI microservices  
- Multi-agent system design  
- Real-world document processing  
- Scalable architecture design  

---

## 👨‍💻 Author

Basmalah ENNETTA – PFE  