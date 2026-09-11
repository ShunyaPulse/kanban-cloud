import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact the Kanban Cloud team. Get support, report issues, or provide feedback about our open-source task management platform.",
};

export default function Contact() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block">← Back to Board</Link>
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Contact & Support</h1>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300 leading-relaxed">
          <p>
            Have a question, encountered a bug, or want to propose a new feature for Kanban Cloud?
            We welcome direct community involvement and feedback through the following channels:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <a
              href="https://github.com/ShunyaPulse/kanban-cloud/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 hover:border-blue-500/50 transition-all group no-underline"
            >
              <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-blue-400 transition-colors">🐛 Report a Bug</h3>
              <p className="text-sm text-slate-400">Found an issue or unexpected behavior? Open an issue on our GitHub repository with reproduction steps.</p>
            </a>
            <a
              href="https://github.com/ShunyaPulse/kanban-cloud/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 hover:border-green-500/50 transition-all group no-underline"
            >
              <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-green-400 transition-colors">💡 Feature Requests</h3>
              <p className="text-sm text-slate-400">Have suggestions to improve workflow agility, metrics, or UI? We actively review community ideas.</p>
            </a>
            <a
              href="https://github.com/ShunyaPulse/kanban-cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 hover:border-purple-500/50 transition-all group no-underline"
            >
              <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-purple-400 transition-colors">🤝 Contribute</h3>
              <p className="text-sm text-slate-400">Kanban Cloud is fully open source under the MIT License. Fork the repository, submit PRs, or improve documentation.</p>
            </a>
            <a
              href="mailto:techanics6174@gmail.com"
              className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 hover:border-amber-500/50 transition-all group no-underline"
            >
              <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-amber-400 transition-colors">📧 Direct Email</h3>
              <p className="text-sm text-slate-400">For collaboration, inquiries, or security disclosures, reach out directly via email.</p>
            </a>
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-3">Frequently Asked Questions</h2>

            <div className="space-y-4 mt-4">
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-1">Is Kanban Cloud open source?</h3>
                <p className="text-sm text-slate-400">Yes, Kanban Cloud is an open-source productivity platform licensed under the MIT License. You can inspect the source code, contribute, or self-host your own instance.</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-1">How is my board data preserved?</h3>
                <p className="text-sm text-slate-400">Your board is synchronized to our serverless PostgreSQL cloud database and Redis cache, with local storage fallback for rapid offline loading.</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-1">Can I install it as a standalone app?</h3>
                <p className="text-sm text-slate-400">Yes! Kanban Cloud is a Progressive Web App (PWA). Click the &quot;Install App&quot; prompt in your browser or navigation bar to run it as a desktop or mobile application.</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <h3 className="font-semibold text-slate-100 mb-1">How do I create offline backups?</h3>
                <p className="text-sm text-slate-400">Click the &quot;Export&quot; button at the top of the board to download your full board structure as a portable JSON file. You can re-import it anytime via the &quot;Import&quot; button.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
