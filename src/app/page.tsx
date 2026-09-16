"use client";

import React, { useEffect } from "react";
import Board from "@/components/Board";
import MetricsPanel from "@/components/MetricsPanel";
import CardModal from "@/components/CardModal";
import UndoRedoControls from "@/components/UndoRedoControls";
import ImportExport from "@/components/ImportExport";
import InstallPwaButton from "@/components/InstallPwaButton";
import { TwoFactorModal } from "@/components/two-factor-modal";
import { useBoardStore } from "@/store/board-store";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [show2FAModal, setShow2FAModal] = React.useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user && (session.user as any).needs2FA) {
      router.push('/login?2fa=required');
    }
  }, [status, session, router]);
  const toggleMetrics = useBoardStore((s) => s.toggleMetrics);
  const fetchBoard = useBoardStore((s) => s.fetchBoard);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return (
    <main className="flex-1 flex flex-col font-sans overflow-hidden bg-transparent">
      <header className="glass-header px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 z-10 shrink-0 sticky top-0">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-xl font-bold text-slate-100 tracking-tight mr-4 sm:mr-6">
            Kanban Cloud
          </h1>
          <UndoRedoControls />
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end overflow-x-auto pb-1 sm:pb-0">
          <InstallPwaButton />
          <button
            onClick={toggleMetrics}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-800/80 border border-slate-700/60 rounded-xl hover:bg-slate-700 transition-all shadow-sm backdrop-blur-sm"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Metrics</span>
          </button>
          <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>
          <ImportExport />
          {session?.user && (
            <>
              <div className="w-px h-6 bg-slate-700/50 mx-1 hidden sm:block"></div>
              <button
                onClick={() => setShow2FAModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-700/60 rounded-xl hover:bg-emerald-900/60 transition-all shadow-sm backdrop-blur-sm"
                title="Manage 2FA Two-Factor Authentication"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="hidden md:inline">2FA Security</span>
              </button>
              <div className="flex items-center gap-3 pl-2">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-sm font-medium text-slate-200">{session.user.name}</span>
                  <button onClick={() => signOut()} className="text-xs text-slate-400 hover:text-red-400 transition-colors">Logout</button>
                </div>
                {session.user.image ? (
                  <img src={session.user.image} alt="Profile" className="w-8 h-8 rounded-full border border-slate-600" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold text-sm">
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <button onClick={() => signOut()} className="sm:hidden text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded">Logout</button>
              </div>
            </>
          )}
          <a
            href="https://github.com/ShunyaPulse/kanban-cloud"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl border border-transparent hover:border-slate-700/60 transition-all backdrop-blur-sm"
            title="View on GitHub"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
        </div>
      </header>

      <Board />
      <MetricsPanel />
      <CardModal />
      <TwoFactorModal isOpen={show2FAModal} onClose={() => setShow2FAModal(false)} />
    </main>
  );
}
