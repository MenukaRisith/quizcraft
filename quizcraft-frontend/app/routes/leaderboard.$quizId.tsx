import { useEffect, useState } from "react";
import { useParams } from "@remix-run/react";
import DashboardLayout from "../components/DashboardLayout";
import { API_BASE_URL } from "../config/api";

export const meta = () => {
    return [{ title: "Leaderboard | QuizCraft" }];
};

interface LeaderboardEntry {
  team_id: number;
  team_name: string;
  score: number;
  out_of: number;
  rank: number;
}

export default function LeaderboardPage() {
  const { quizId } = useParams();
  const [token, setToken] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("quizcraft_token");
    setToken(stored);
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!quizId || !token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/quiz/${quizId}/leaderboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setLeaderboard(data.leaderboard);
        } else {
          setError("Failed to load leaderboard");
        }
      } catch (err) {
        console.error("❌ Error fetching leaderboard:", err);
        setError("Server error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [quizId, token]);

  return (
    <DashboardLayout>
      <div className="pb-20 space-y-6">
        <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">🏆 Leaderboard</h1>

        {loading ? (
          <p className="text-sm text-gray-500">Loading leaderboard...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : leaderboard.length === 0 ? (
          <p className="text-sm text-gray-500">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm text-left table-auto">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                <tr>
                  <th className="px-4 py-2">🏅 Rank</th>
                  <th className="px-4 py-2">Team Name</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right">Out Of</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leaderboard.map((entry) => (
                  <tr key={entry.team_id}>
                    <td className="px-4 py-2">{entry.rank}</td>
                    <td className="px-4 py-2 font-medium">{entry.team_name}</td>
                    <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-semibold">
                      {entry.score}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-300">{entry.out_of}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
