import { Link } from "@remix-run/react";

export const meta = () => {
  return [{ title: "Welcome to QuizCraft (Beta)" }];
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-800 dark:text-white flex flex-col justify-between">
      <main className="flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-700 dark:text-indigo-400 mb-4">
          Welcome to QuizCraft
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6">
          A powerful, secure, and modern platform for hosting online quizzes and competitions.
        </p>

        <div className="grid gap-6 text-sm text-left bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-full">
          <ul className="list-disc pl-5 space-y-2">
            <li>🧠 Create and manage quizzes with ease</li>
            <li>👥 Team & individual participation support</li>
            <li>🔒 Real-time anti-cheat detection & logging</li>
            <li>📊 Live leaderboard and scoring system</li>
            <li>🛠️ Role-based access for Admins & Coordinators</li>
            <li>📥 Registration links for public participation</li>
          </ul>
        </div>

        <div className="mt-10">
          <span className="text-sm text-gray-500 dark:text-gray-400">🚧 This is a <strong>Beta version</strong> — v1.0.0</span>
        </div>

        <div className="mt-8 space-x-4">
          <Link
            to="/dashboard"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded shadow text-sm font-medium transition"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/auth/login"
            className="inline-block border border-indigo-600 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900 px-5 py-2 rounded shadow text-sm font-medium transition"
          >
            Login
          </Link>
        </div>
      </main>

      <footer className="text-center text-sm text-gray-500 dark:text-gray-400 py-6 border-t border-gray-200 dark:border-gray-700">
        <p className="mb-2">
          Developed with ❤️ by <strong>Menuka Risith</strong>. Need help? Reach out or follow me:
        </p>

        <div className="flex justify-center gap-4 text-sm mb-2">
          <a
            href="https://www.linkedin.com/in/menukarisith"
            className="hover:underline hover:text-indigo-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <a
            href="https://www.facebook.com/menukar.dev"
            className="hover:underline hover:text-blue-600"
            target="_blank"
            rel="noopener noreferrer"
          >
            Facebook
          </a>
          <a
            href="https://www.instagram.com/menuka_risith"
            className="hover:underline hover:text-pink-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
          <a
            href="https://github.com/menukarisith"
            className="hover:underline hover:text-gray-800 dark:hover:text-gray-200"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>

        <p className="text-xs mt-2">
          © {new Date().getFullYear()} QuizCraft — All rights reserved.
        </p>
      </footer>
    </div>
  );
}
