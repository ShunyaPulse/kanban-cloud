import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Kanban Cloud - Learn how we handle your data, cloud synchronization, and protect your privacy.",
};

export default function PrivacyPolicy() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block">← Back to Board</Link>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Privacy Policy</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated: September 11, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">1. Introduction</h2>
            <p>
              Welcome to Kanban Cloud (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), an open-source productivity project by ShunyaPulse.
              We respect your privacy and are committed to transparency regarding how data is managed across our client
              and serverless cloud infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">2. Information We Handle</h2>
            <p>
              <strong className="text-slate-100">Board Content:</strong> Your task cards, columns, descriptions, and subtasks
              are synchronized to our secure serverless PostgreSQL database (hosted via Neon) and cached in memory (Redis)
              to ensure multi-device continuity. All data in transit is encrypted using industry-standard SSL/TLS protocols.
              We do not inspect, monetize, or sell your board contents.
            </p>
            <p>
              <strong className="text-slate-100">Local Browser Cache:</strong> In addition to cloud persistence, your browser may
              retain client-side state in local storage to support offline responsiveness and instantaneous rendering.
            </p>
            <p>
              <strong className="text-slate-100">Technical Logs & Analytics:</strong> Standard server access logs (including request timestamps,
              HTTP status codes, and user-agent strings) are processed by Google Cloud Run solely for operational monitoring, security,
              and performance diagnostics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">3. How We Use Information</h2>
            <p>We use collected data solely to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Persist, retrieve, and display your Kanban workflow across sessions</li>
              <li>Provide real-time sprint performance analytics and WIP metrics</li>
              <li>Ensure application stability, uptime monitoring, and fast latency</li>
              <li>Maintain the security and integrity of our cloud services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">4. Data Security & Storage</h2>
            <p>
              Your data is stored in tier-1 cloud facilities protected by modern security controls, managed access policies,
              and network-level firewalls. You also retain the ability at any time to export a complete copy of your board
              as a JSON file for your own independent preservation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">5. Third-Party Infrastructure</h2>
            <p>
              Our open-source deployment leverages Google Cloud Run, Neon Serverless Postgres, and Redis.
              Each infrastructure provider complies with rigorous security standards. We do not integrate data brokers
              or sell personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">6. Cookies & Tracking</h2>
            <p>
              Kanban Cloud uses only essential storage tokens and session parameters necessary to maintain board state
              and app preferences. We do not use third-party behavioral profiling trackers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">7. Open Source Transparency</h2>
            <p>
              Because Kanban Cloud is open source, our entire implementation, database schema handling, and API routes are
              publicly auditable on{" "}
              <a href="https://github.com/ShunyaPulse/kanban-cloud" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                GitHub
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions or requests regarding your data, please visit our{" "}
              <Link href="/contact" className="text-blue-400 hover:text-blue-300 underline">Contact page</Link> or open an issue on GitHub.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
