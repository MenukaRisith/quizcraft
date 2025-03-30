import { ReactNode, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link, useLocation } from "@remix-run/react";
import { LogOut, Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: "Dashboard", path: "/dashboard", icon: "🏠" },
    { label: "Quizzes", path: "/quizzes", icon: "🧠" },
  ];

  if (user?.role === "admin") {
    navLinks.push({ label: "Coordinators", path: "/coordinators", icon: "🧭" });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-black text-gray-900 dark:text-white">
      {/* Sidebar */}
      <aside
        className={`fixed z-40 inset-y-0 left-0 w-64 bg-white dark:bg-gray-900/90 backdrop-blur-sm shadow-xl p-6 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:block h-full`}
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-8 tracking-tight">
              QuizCraft
            </h1>

            <nav className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`block px-3 py-2 rounded text-sm font-medium transition hover:bg-indigo-50 dark:hover:bg-indigo-800 ${
                    location.pathname === link.path
                      ? "bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-white"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {link.icon} {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-6 text-sm">
            <div className="text-gray-500 dark:text-gray-400 mb-3 truncate">{user?.email}</div>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:hover:text-red-400 font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-64 overflow-y-auto w-full max-w-full px-4 md:px-6 py-6">
        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">QuizCraft</h2>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {children}

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-10">
          QuizCraft © {new Date().getFullYear()} — Built by Menuka Risith
        </p>
      </main>
    </div>
  );
}
