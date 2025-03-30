import { useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { useAuth } from "../hooks/useAuth";
import AddCoordinatorForm from "../components/AddCoordinatorForm";
import QuizCreateForm from "../components/QuizCreateForm";
import DashboardLayout from "../components/DashboardLayout";

export const meta = () => {
  return [{ title: "Dashboard | QuizCraft" }];
};

export default function DashboardPage() {
  const { user, isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate("/auth/login");
    }
  }, [loading, isLoggedIn, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold">Welcome back, {user?.email}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            You are logged in as{" "}
            <span className="inline-block px-2 py-1 bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white rounded text-xs font-semibold uppercase">
              {user?.role}
            </span>
          </p>
        </div>

        <div className="border-t border-gray-300 dark:border-gray-700 pt-4">
          <p className="text-gray-700 dark:text-gray-300 text-sm">
            This is your QuizCraft dashboard. From here, you’ll be able to:
          </p>
          <ul className="list-disc list-inside mt-2 text-gray-600 dark:text-gray-400 text-sm space-y-1">
            <li>Create or manage quiz competitions</li>
            <li>Add coordinators (if you&apos;re an admin)</li>
            <li>View registered teams & submissions</li>
            <li>Monitor leaderboards</li>
          </ul>
        </div>

        {user?.role === "admin" && (
          <div className="pt-6 border-t border-gray-300 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Add New Coordinator</h2>
            <AddCoordinatorForm />
          </div>
        )}

        {["admin", "coordinator"].includes(user?.role || "") && (
          <div className="pt-6 border-t border-gray-300 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">Create New Quiz</h2>
            <QuizCreateForm />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
