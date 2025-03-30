import { Link } from "@remix-run/react";

export const meta = () => {
    return [{ title: "unauthorized access | QuizCraft" }];
  };

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-center px-4">
      <h1 className="text-4xl font-bold text-red-600 mb-4">🚫 Access Denied</h1>
      <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
        You are not authorized to view this page.
      </p>
      <Link
        to="/"
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow"
      >
        Go Back Home
      </Link>
    </div>
  );
}
