# ☁️ Kanban Cloud

A production-grade, highly resilient full-stack Kanban platform powered by modern Cloud-Native Architecture. 

![Kanban UI](https://img.shields.io/badge/UI-Next.js-black?logo=next.js)
![Cloud Run](https://img.shields.io/badge/Compute-Google_Cloud_Run-4285F4?logo=googlecloud)
![Neon](https://img.shields.io/badge/Database-Neon_Serverless_Postgres-00E599?logo=postgresql)
![Redis](https://img.shields.io/badge/Cache-Distributed_Redis-DC382D?logo=redis)

## 🚀 Live Demo
**[Play with the Live App here!](https://kanban-cloud-685823552970.asia-south1.run.app)**

---

## ✨ Key Features

This isn't just a basic to-do list; it's a fully featured Agile project management tool:

- **🖱️ Smooth Drag & Drop:** Move cards and subtasks effortlessly across columns.
- **🚧 WIP Limits:** Set Work-In-Progress limits on columns to prevent bottlenecks and enforce Agile best practices.
- **📊 Real-time Metrics Dashboard:** Automatically tracks average Lead Time, completed cards, and daily throughput with visual charts.
- **⏪ Undo / Redo:** Made a mistake? Instantly roll back or step forward through your entire board's history.
- **📱 PWA Ready:** Install it directly to your desktop or mobile home screen for a native app experience.
- **📂 Import & Export:** Backup your entire board state to a JSON file or import existing boards instantly.
- **✨ Glassmorphism UI:** A beautiful, modern, blurred-glass design built with Tailwind CSS.

---

## 🏗 Architecture Overview

Built with an enterprise-grade, cloud-native stack designed for high availability, low latency, and automated scalability:

1. **Frontend & Backend Unified**: Built with Next.js App Router. The UI logic is client-side, while the API logic lives securely in Node.js routes (`/api/board`).
2. **Containerized Compute**: Deployed to **Google Cloud Run** using a highly optimized, multi-stage Docker image with dynamic auto-scaling.
3. **Serverless Database**: Data is persisted securely in **Neon Serverless Postgres** with connection pooling.
4. **Resilient Caching Layer**: Powered by a dedicated **Redis cache**. The codebase implements *graceful degradation*—meaning if the Redis cache is unreachable, the app seamlessly falls back to Postgres without crashing.
5. **GitOps Automation**: Fully automated CI/CD pipeline. Pushing to `main` triggers GitHub Actions to build the container, push to GHCR, and deploy to Google Cloud automatically.

---

## 💻 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ShunyaPulse/kanban-cloud.git
   cd kanban-cloud
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your own database links:
   ```env
   # Example placeholders (replace with your actual database links)
   DATABASE_URL=postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require
   REDIS_URL=redis://:password@your-redis-ip:6379
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📄 License
This project is open-source and available under the MIT License.
