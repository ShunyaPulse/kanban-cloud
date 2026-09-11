# ☁️ Kanban Cloud

A production-grade, highly resilient full-stack Kanban board powered by a **Zero-Cost Serverless Architecture**. 

![Kanban UI](https://img.shields.io/badge/UI-Next.js-black?logo=next.js)
![Cloud Run](https://img.shields.io/badge/Compute-Google_Cloud_Run-4285F4?logo=googlecloud)
![Neon](https://img.shields.io/badge/Database-Neon_Serverless_Postgres-00E599?logo=postgresql)
![Redis](https://img.shields.io/badge/Cache-Oracle_VM_+_Redis-DC382D?logo=redis)
![CI/CD](https://img.shields.io/badge/Deployment-GitHub_Actions-2088FF?logo=githubactions)

## 🚀 Live Demo
**[Play with the Live App here!](https://kanban-cloud-685823552970.asia-south1.run.app)**

## 🏗 Architecture Overview

Unlike standard client-side Vercel deployments, this project uses enterprise-level GitOps and cloud-native infrastructure—all while keeping monthly costs at **$0.00**.

1. **Frontend & Backend Unified**: Built with Next.js App Router. The UI is beautifully crafted with TailwindCSS, while the API logic lives directly in standard Node.js routes (`/api/board`).
2. **Containerized Compute**: The app is containerized using a highly optimized, multi-stage Alpine Docker image and deployed to **Google Cloud Run**. It aggressively scales to zero when idle to conserve resources.
3. **Serverless Database**: Data is stored securely in **Neon Serverless Postgres**, which connects over connection-pooled SSL.
4. **Resilient Caching**: Powered by a free-tier **Oracle Cloud VM running Redis**. The codebase implements *graceful degradation*—meaning if the Redis cache is unreachable, the app seamlessly falls back to Postgres without crashing.
5. **GitOps Automation**: Fully automated CI/CD pipeline. Pushing to `main` triggers GitHub Actions to build the Docker image, publish to GitHub Container Registry (GHCR), and automatically roll out a new revision to Google Cloud.

## 🛠 Tech Stack
- **Framework:** React / Next.js (Standalone Mode)
- **Styling:** Tailwind CSS + Glassmorphism UI
- **State Management:** Zustand (Optimistic UI updates)
- **Database Driver:** `pg` (PostgreSQL)
- **Cache Client:** `ioredis`

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
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require
   REDIS_URL=redis://:password@your-redis-ip:6379
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 📦 Deployment
This app uses a GitOps workflow. Simply push your code to the `main` branch, and GitHub Actions will automatically handle the build and Google Cloud Run deployment!

## 📄 License
This project is open-source and available under the MIT License.
