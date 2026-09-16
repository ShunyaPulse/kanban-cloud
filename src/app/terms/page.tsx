import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for Kanban Cloud - Guidelines and conditions for using our open-source task management platform.",
};

export default function Terms() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mb-6 inline-block">← Back to Board</Link>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Terms of Service</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated: September 11, 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Kanban Cloud (&quot;the Service&quot;), created by ShunyaPulse, you agree to comply with and
              be bound by these Terms of Service. If you disagree with any portion of these terms, please discontinue use
              of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">2. Description of Service</h2>
            <p>
              Kanban Cloud provides a web-based, cloud-synchronized Agile task management system. Features include
              customizable Kanban columns, task cards with priority tags and descriptions, subtask checklists,
              WIP limit alerts, real-time lead-time/throughput calculations, JSON import/export, and offline PWA capability.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">3. Cloud Persistence & User Responsibility</h2>
            <p>
              Data is automatically stored across our serverless PostgreSQL and memory caching infrastructure.
              While we implement high-availability serverless architecture and automated database resilience, we strongly
              encourage users to periodically utilize the built-in <strong>Export</strong> feature to download personal JSON backups
              of mission-critical project boards.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">4. Acceptable Use</h2>
            <p>You agree to use the Service strictly for lawful productivity purposes and will not:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Attempt to overload, abuse, or initiate denial-of-service attacks against the API or cloud infrastructure</li>
              <li>Inject malicious payloads, exploits, or harmful scripts into task data fields</li>
              <li>Reverse engineer or misuse API routes in violation of applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">5. Intellectual Property & License</h2>
            <p>
              Kanban Cloud is an open-source software project licensed under the <strong>MIT License</strong>.
              You are free to inspect, fork, modify, and host your own instance of the project in accordance with MIT licensing terms.
              Source code and development instructions are available on{" "}
              <a href="https://github.com/ShunyaPulse/kanban-cloud" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                GitHub
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">6. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied.
              We do not guarantee that the service will remain uninterrupted, error-free, or compatible with every legacy browser environment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">7. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, ShunyaPulse shall not be liable for any indirect, incidental, or consequential damages
              or loss of data arising from use or inability to use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">8. Changes to Terms</h2>
            <p>
              We reserve the right to revise these Terms of Service periodically. Any updates will be posted here with a revised date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-100 mt-8 mb-3">9. Contact</h2>
            <p>
              For legal questions or inquiries regarding these Terms, please reach out via our{" "}
              <Link href="/contact" className="text-blue-400 hover:text-blue-300 underline">Contact page</Link>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
