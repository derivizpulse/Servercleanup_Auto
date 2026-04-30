import { useState } from "react";
import CfTopBar from "./components/careflow/CfTopBar";
import {
  CfSidebar,
  CF_SIDEBAR_PL_CLASS,
  type SuiteModuleId,
} from "./components/careflow/CfSidebar";
import { ToastContainer } from "./components/Toast";
import { Overview } from "./pages/Overview";
import { ServerHealth } from "./pages/ServerHealth";

type AppNavTab = "Overview" | "Server Health";
const TABS: AppNavTab[] = ["Server Health", "Overview"];

const SUITE_TITLES: Record<SuiteModuleId, string> = {
  "prac-list":   "Prac List",
  "deals-hub":   "Deals Hub",
  "scheduler":   "Scheduler",
  "proj-mgmt":   "Project Management",
  "img-mgmt":    "Imaging Management",
  "work-bench":  "Work Bench",
  "srv-clean":   "Server cleanup",
  "bot-status":  "Bot status",
  "iss-tracker": "Issue tracker",
  "doc-mig":     "Document migration",
};

function SuitePlaceholder({ moduleId }: { moduleId: SuiteModuleId }) {
  if (moduleId === "srv-clean") return null;
  const t = SUITE_TITLES[moduleId];
  return (
    <div
      className="flex min-h-[calc(100svh-6rem)] flex-col items-center justify-center px-6 text-center"
      style={{ color: "#5D6F7E" }}
    >
      <h1 className="text-[16px] font-semibold" style={{ color: "#1E2228" }}>
        {t}
      </h1>
      <p className="mt-2 max-w-md text-[12px] leading-relaxed">
        This area is a separate part of the suite. Use <strong>SRV Clean</strong> in the
        left rail to open the database cleanup experience (this prototype).
      </p>
    </div>
  );
}

export default function App() {
  const [activeModule, setActiveModule] = useState<SuiteModuleId>("srv-clean");
  const [activeTab, setActiveTab] = useState<AppNavTab>("Server Health");
  const [overviewServerFilterRequest, setOverviewServerFilterRequest] = useState<{
    server: string;
    token: number;
  } | null>(null);

  const showDeriviz = activeModule === "srv-clean";

  function handleServerHealthCleanUp(server: string) {
    setActiveTab("Overview");
    setOverviewServerFilterRequest({ server, token: Date.now() });
  }

  return (
    <div className="min-h-screen w-full min-w-0" style={{ fontFamily: "Roboto, sans-serif" }}>
      <CfTopBar />
      <CfSidebar activeModule={activeModule} onSelectModule={setActiveModule} />

      <div
        className={`min-h-screen w-full min-w-0 text-cf-text ${
          showDeriviz ? "bg-cf-canvas" : "bg-white"
        } ${CF_SIDEBAR_PL_CLASS}`}
        style={{ paddingTop: "30px" }}
      >
        {showDeriviz ? (
          <>
            <div
              className="sticky top-[30px] z-[150] w-full min-w-0 bg-white"
              style={{
                borderBottom: "1px solid #ECEFF2",
                boxShadow: "0 1px 0 0 rgba(13,22,29,0.06)",
              }}
            >
              <div className="w-full min-w-0 px-3 sm:px-4 md:px-5 lg:px-6">
                <nav className="flex" aria-label="Page tabs">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className="relative px-4 py-2.5 text-[12px] font-medium transition-colors focus:outline-none"
                        style={{
                          color: isActive ? "#007A8F" : "#5D6F7E",
                          borderBottom: isActive
                            ? "2px solid #007A8F"
                            : "2px solid transparent",
                          marginBottom: "-1px",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            (e.currentTarget as HTMLButtonElement).style.color = "#354756";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            (e.currentTarget as HTMLButtonElement).style.color = "#5D6F7E";
                        }}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            <div className="w-full min-w-0 p-3 sm:p-4 md:p-5 lg:p-6">
              {activeTab === "Overview"     && (
                <Overview
                  requestedServerFilter={overviewServerFilterRequest}
                  onServerFilterApplied={() => setOverviewServerFilterRequest(null)}
                />
              )}
              {activeTab === "Server Health" && (
                <ServerHealth onCleanUpServer={handleServerHealthCleanUp} />
              )}
            </div>
          </>
        ) : (
          <SuitePlaceholder moduleId={activeModule} />
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
