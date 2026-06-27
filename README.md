# Ghar ka Zaiqa

Welcome to the **Ghar ka Zaiqa** application! This is a full-stack project with a React frontend and a FastAPI backend.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Python 3.8+**
- **Node.js** (v14 or higher) and **npm**

## Setup Instructions

Follow these step-by-step instructions to get the application running on your local machine.

### 1. Clone the Repository

First, clone the repository to your local machine and navigate into the project directory:

```bash
git clone <repository-url>
cd Ghar_ka_zaiqa
```

### 2. Setup the Backend

The backend is built with FastAPI and requires Python. We will set up a virtual environment and install the required dependencies.

Open your terminal and run the following commands from the root directory (`Ghar_ka_zaiqa`):

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment named .venv
python3 -m venv .venv

# Activate the virtual environment
# On Linux/macOS:
source .venv/bin/activate
# On Windows (Command Prompt):
# .venv\Scripts\activate
# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1

# Install the required Python packages
pip install -r requirements.txt

# Go back to the root directory
cd ..
```

### 3. Setup the Frontend

The frontend is a React application.

Open your terminal and run the following commands from the root directory (`Ghar_ka_zaiqa`):

```bash
# Navigate to the frontend directory
cd frontend

# Install the Node dependencies (using --legacy-peer-deps to avoid dependency conflicts)
npm install --legacy-peer-deps

# Go back to the root directory
cd ..
```

## Running the Application

There are two ways to run the application: using the provided startup script (recommended) or running the servers manually.

### Option A: Using the `run.sh` Script (Recommended for Linux/macOS)

From the root directory of the project, simply run:

```bash
bash run.sh
```

This script will automatically start both the backend FastAPI server and the frontend React server concurrently. 
- The frontend will be available at: http://localhost:3000
- The backend API will be available at: http://localhost:8000

To stop both servers, press `Ctrl+C` in the terminal.

### Option B: Running Manually in Separate Terminals

If you prefer, or if you are on Windows, you can start the backend and frontend in separate terminal windows.

**Terminal 1 (Backend):**
```bash
cd backend
source .venv/bin/activate  # Or the appropriate activation command for Windows
uvicorn server:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

## Deployment Instructions

If you are pushing this code to GitHub and pulling it on a server or deploying via platforms like Vercel/Render, follow these steps to ensure everything connects properly.

### 1. Environment Variables

Because `.env` files are ignored by git (for security reasons), they will not be included when you pull the repository. You must manually set them up in your production environment!

**Backend (`backend/`)**
Copy the `backend/.env.example` file to create a new `.env` file, or set these variables directly in your hosting provider's dashboard:
```bash
MONGO_URL=mongodb+srv://<user>:<db_password>@<cluster>.mongodb.net/?appName=GhrKaZaiqa
DB_NAME=gharkazaiqa
JWT_SECRET=super_secret_jwt_key
```
*(Note: If you don't provide a `MONGO_URL`, the backend will safely fallback to an in-memory database, which is great for testing but won't save data permanently!)*

**Frontend (`frontend/`)**
If you host the frontend separately from the backend (e.g., on Vercel), the frontend won't know where the backend is located. You must provide the `REACT_APP_BACKEND_URL` environment variable during the frontend build step:
```bash
REACT_APP_BACKEND_URL=https://your-deployed-backend-url.com
```
