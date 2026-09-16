import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Kanban Cloud - An enterprise-grade, open-source task management platform built with Next.js, Google Cloud Run, Neon Postgres, and Redis.",
};

export default function About() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block">← Back to Board</Link>
        <h1 className="text-3xl font-bold text-slate-100 mb-8">About Kanban Cloud</h1>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">What is Kanban Cloud?</h2>
            <p>
              Kanban Cloud is a modern, full-stack, open-source task management platform designed to help
              engineers, teams, and individuals streamline workflows with agility and clarity.
              Combining intuitive drag-and-drop mechanics with enterprise-grade cloud persistence,
              Kanban Cloud delivers high availability, real-time metrics, and instant responsive interactions.
            </p>
            <p>
              Unlike traditional static Kanban templates that lose your work when you switch devices or clear
              browser caches, Kanban Cloud is backed by an automated serverless cloud architecture with
              database persistence and multi-tier memory caching.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">Key Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">🖱️ Fluid Drag & Drop</h3>
                <p className="text-sm">Seamlessly reorder and transfer cards between columns with accessible, high-performance interactions powered by dnd-kit.</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">📊 Agile Metrics & Analytics</h3>
                <p className="text-sm">Monitor throughput, lead times, work-in-progress alerts, and column distribution charts in real time.</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">🎯 WIP Limits</h3>
                <p className="text-sm">Prevent bottlenecks and maintain productive sprint flow by setting maximum Work-In-Progress constraints per column.</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">↩️ Instant Undo / Redo</h3>
                <p className="text-sm">Comprehensive in-memory history tracking lets you quickly revert accidental edits or restore moves with one click.</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">☁️ Cloud Synchronization</h3>
                <p className="text-sm">Automated synchronization with serverless PostgreSQL and Redis ensures your data is safely retained and accessible.</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">📱 Progressive Web App (PWA)</h3>
                <p className="text-sm">Install directly to your macOS, Windows, iOS, or Android homescreen for a lightweight native application experience.</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">📤 Import & Export</h3>
                <p className="text-sm">Export complete board snapshots in standard JSON format for offline backups, auditing, or migration.</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-2">🎨 Glassmorphism UI</h3>
                <p className="text-sm">Crafted with modern Tailwind CSS blurred glass styling for an immersive, distraction-free aesthetic.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">Cloud Architecture & Tech Stack</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-slate-100">Frontend & API Engine:</strong> Next.js App Router with TypeScript & standalone Node.js runtime</li>
              <li><strong className="text-slate-100">Styling & Design System:</strong> Tailwind CSS dark theme with responsive glassmorphism</li>
              <li><strong className="text-slate-100">State Management:</strong> Zustand store with optimistic updates and background API synchronization</li>
              <li><strong className="text-slate-100">Cloud Compute:</strong> Google Cloud Run containerized deployment with dynamic auto-scaling and high availability</li>
              <li><strong className="text-slate-100">Database:</strong> Neon Serverless PostgreSQL with SSL connection pooling</li>
              <li><strong className="text-slate-100">Caching Layer:</strong> In-memory Redis cache hosted with automatic fallback and graceful degradation</li>
              <li><strong className="text-slate-100">CI/CD Pipeline:</strong> Automated GitHub Actions workflow pushing to GitHub Container Registry (GHCR)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">Open Source</h2>
            <p>
              Kanban Cloud is open source and actively maintained by ShunyaPulse on{" "}
              <a href="https://github.com/ShunyaPulse/kanban-cloud" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                GitHub
              </a>.
              Contributions, issues, and feature proposals are welcome under the MIT License.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">How to Get Started</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong className="text-slate-100">Add Cards:</strong> Click &quot;+ Add card&quot; at the base of any column to create tasks with custom titles, descriptions, and priorities.</li>
              <li><strong className="text-slate-100">Manage Pipeline:</strong> Drag cards across columns (To Do → In Progress → Review → Done) as tasks progress.</li>
              <li><strong className="text-slate-100">Add Subtasks:</strong> Click any card to open the inspection modal, edit details, and track nested subtask completion.</li>
              <li><strong className="text-slate-100">Review Analytics:</strong> Toggle the &quot;📊 Metrics&quot; view to evaluate team lead times and throughput trends.</li>
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
