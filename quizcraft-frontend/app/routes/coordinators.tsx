import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import DashboardLayout from "../components/DashboardLayout";
import { API_BASE_URL } from "../config/api"; 

export const meta = () => {
    return [{ title: "Assign Coordinators | QuizCraft" }];
};  

interface User {
  id: number;
  email: string;
}

interface Quiz {
  id: number;
  title: string;
}

export default function CoordinatorsPage() {
  const navigate = useNavigate();
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Record<number, number[]>>({});
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("quizcraft_user");
    const storedToken = localStorage.getItem("quizcraft_token");
    setToken(storedToken);

    if (!userStr || !storedToken) return navigate("/unauthorized");

    try {
      const user = JSON.parse(userStr);
      if (user.role !== "admin") return navigate("/unauthorized");
    } catch {
      navigate("/unauthorized");
    }
  }, [navigate]);

  const fetchCoordinators = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/coordinators`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCoordinators(data.coordinators);
    } catch {
      alert("❌ Failed to fetch coordinators");
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setQuizzes(data.quizzes);
    } catch {
      alert("❌ Failed to fetch quizzes");
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/quiz-coordinator-assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch {
      alert("❌ Failed to fetch current assignments");
    }
  };

  const handleCheckbox = (quizId: number, userId: number) => {
    setAssignments((prev) => {
      const current = prev[quizId] || [];
      const updated = current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId];
      return { ...prev, [quizId]: updated };
    });
  };

  const handleSaveAssignments = async (quizId: number) => {
    const selectedCoordinators = assignments[quizId] || [];
    try {
      const res = await fetch(`${API_BASE_URL}/assign-coordinator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({ quiz_id: quizId, coordinator_ids: selectedCoordinators }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Coordinators assigned successfully!");
      } else {
        alert("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("❌ Server error during assignment");
    }
  };

  useEffect(() => {
    if (token) {
      fetchCoordinators();
      fetchQuizzes();
      fetchAssignments();
    }
  }, [token]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">Assign Coordinators to Quizzes</h1>

        {quizzes.map((quiz) => {
          const hasAssignments = (assignments[quiz.id]?.length || 0) > 0;

          return (
            <div
              key={quiz.id}
              className={`p-4 rounded border space-y-3 ${
                hasAssignments
                  ? "bg-green-50 border-green-400 dark:bg-green-900 dark:border-green-700"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              }`}
            >
              <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                🧠 {quiz.title}
              </div>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {coordinators.map((user) => (
                  <label key={user.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={assignments[quiz.id]?.includes(user.id) || false}
                      onChange={() => handleCheckbox(quiz.id, user.id)}
                      className="form-checkbox text-indigo-600"
                    />
                    {user.email}
                  </label>
                ))}
              </div>

              <button
                onClick={() => handleSaveAssignments(quiz.id)}
                className="mt-2 px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                💾 Save Assignments
              </button>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
