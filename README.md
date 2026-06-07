# LexAI — Legal Document AI Assistant

LexAI is a modern legal tech web application that enables users to upload, analyze, and query legal documents using state-of-the-art AI. The application uses a robust split architecture: a FastAPI backend powered by Groq (LLM API) and LangChain (document parsing, embeddings, and vector store) coupled with a responsive React + Vite frontend.

---

## 🏗️ System Architecture

- **Frontend**: React, Vite, React Router, CSS Variables (Custom Design System).
- **Backend**: FastAPI (Python 3.11+), Uvicorn.
- **Database**: MongoDB (User management and authentication).
- **Vector DB**: ChromaDB (Semantic index for local legal document context).
- **AI/LLM**: Groq API (`llama-3.3-70b-versatile` model) & Hugging Face Embeddings (`all-MiniLM-L6-v2`).

---

## 🚀 Getting Started

Follow these steps to set up and run the frontend and backend applications locally.

### 📋 Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18 or higher)
- **Python** (v3.11 or higher)
- **MongoDB Community Server** (running locally on port `27017`)

---

### 1. Database Setup
Ensure that your local MongoDB service is active and listening on port `27017`.
- **Windows (Service)**: Start it via the Services app (`Services.msc` -> start `MongoDB Server`) or via PowerShell as Administrator:
  ```powershell
  Start-Service MongoDB
  ```

---

### 2. Backend Setup & Execution

1. Navigate to the backend directory:
   ```bash
   cd LexAI/LexAI/backend
   ```

2. Create a virtual environment and activate it (recommended):
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. Configure your Environment Variables:
   Create a `.env` file in the `backend/` directory with the following contents:
   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=lexai_db
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. Run the backend server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   *The backend will be live at: `http://127.0.0.1:8000`*

---

### 3. Frontend Setup & Execution

1. Navigate to the frontend directory:
   ```bash
   cd LexAI/LexAI/frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   *The frontend will be live at: `http://localhost:5174` (or another port printed in your terminal).*

---

## 🛠️ Troubleshooting

### 1. `[Errno 10048] address already in use (127.0.0.1:8000)`
This occurs when the FastAPI server was terminated but its child processes (spawned by LangChain/TensorFlow/ChromaDB multiprocessing) are still running in the background and holding the socket handles.

**To resolve this on Windows:**
1. Open PowerShell and run this command to identify any lingering Python processes holding the port:
   ```powershell
   Get-CimInstance Win32_Process | Where-Object {$_.Name -eq 'python3.11.exe'} | Select-Object ProcessId, CommandLine | Format-List
   ```
2. Force-kill the parent and any multiprocessing-fork child PIDs (e.g., if PID is `23960`):
   ```powershell
   taskkill /f /pid 23960
   ```
3. Restart the uvicorn server.

### 2. Browser displays CORS Error on Signup/Login
If you see a CORS warning in your browser console:
`Access to fetch at 'http://127.0.0.1:8000/signup' blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present...`

- **Why it happens**: When FastAPI hits an unhandled 500 exception (like MongoDB being offline), it bypasses the CORS middleware, omitting the CORS headers in the error response. The browser flags this as a CORS error instead of showing the real database connection issue.
- **Resolution**:
  - We have added **global exception handlers** in `main.py` to intercept database and general exceptions, return a proper structured JSON error response, and route them through `CORSMiddleware`.
  - Ensure that your MongoDB server is active (`mongodb://localhost:27017`) and reachable. You can test it by querying:
    ```bash
    curl http://127.0.0.1:8000/db-test
    ```
