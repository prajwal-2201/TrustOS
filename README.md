<div align="center">
  <h1>🛡️ Trust OS 🛡️</h1>
  <p><strong>Next-Gen Cybersecurity & AI Truth Detector</strong></p>

  [![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)
  [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](#)
  [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](#)
</div>

<br />

## 📖 Overview
**Trust OS** is an advanced AI-powered cybersecurity application designed to detect deepfakes, manipulated screenshots, phishing attempts, and AI-generated content. In an era of digital deception, Trust OS provides a unified scanning interface to instantly assess the risk score and authenticity of any image or document.

## 🚀 Key Features
- **AI-Generation Detection**: Identifies GAN artifacts and unnatural pixel patterns in faces and images.
- **Financial Fraud Scanner**: Analyzes UPI and payment screenshots for manipulation, inconsistent fonts, and forged timestamps.
- **Phishing & Malware Protection**: Scans QR codes and shortened URLs in images to detect high-risk domains.
- **Risk Score Analysis**: Every scan returns a calculated confidence percentage and a comprehensive risk score.
- **Scan History Tracking**: Automatically securely logs all past scans in a local SQLite database for future review.

## 🛠️ Technology Stack
- **Backend**: Python 3, FastAPI, SQLAlchemy
- **Database**: SQLite (Local database `trustos.db`)
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (Sleek, modern glassmorphism UI)
- **Machine Learning Integrations**: Simulated models via `analyzer.py` for text extraction, metadata forensics, and Error Level Analysis (ELA).

## 📂 Project Structure
```text
📦 Trust OS
 ┣ 📂 backend          # FastAPI server & AI logic
 ┃ ┣ 📂 ml             # Machine learning assets
 ┃ ┣ 📜 analyzer.py    # Image & threat analysis engine
 ┃ ┣ 📜 database.py    # SQLite connection setup
 ┃ ┣ 📜 main.py        # API endpoints and server entry
 ┃ ┣ 📜 models.py      # SQLAlchemy DB schemas
 ┃ ┗ 📜 requirements.txt # Python dependencies
 ┣ 📂 web              # Frontend User Interface
 ┃ ┣ 📜 index.html     # Main dashboard
 ┃ ┣ 📜 style.css      # Custom UI styling
 ┃ ┗ 📜 script.js      # Frontend logic & API calls
```

## ⚙️ Installation & Setup

### Prerequisites
- [Python 3.8+](https://www.python.org/)

### 1. Clone the repository
```bash
git clone https://github.com/prajwal-2201/trustos-ai-detector.git
cd trustos-ai-detector
```

### 2. Install Dependencies
Open a terminal and navigate to the backend folder:
```bash
cd backend
pip install -r requirements.txt
```

### 3. Start the Server
Run the FastAPI application (this will also serve the web frontend):
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*The application will instantly be available at `http://localhost:8000`.*

## 📡 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/upload` | Upload an image for deep AI and threat analysis |
| `GET`  | `/demo` | Run a simulated demo scenario (e.g., Payment Scam) |
| `GET`  | `/history` | Retrieve all past scans and risk scores |
| `DELETE`| `/history/{item_id}` | Remove a specific scan from the database |

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/prajwal-2201/trustos-ai-detector/issues).

## 📝 License
This project is licensed under the MIT License.
