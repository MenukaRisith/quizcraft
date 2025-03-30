import { useEffect, useState } from "react";
import { useParams } from "@remix-run/react";
import { API_BASE_URL } from "../config/api"; 

export const meta = () => {
  return [{ title: "Team Registration | QuizCraft" }];
};

interface Quiz {
  id: number;
  title: string;
  max_team_members: number;
  description?: string;
  allow_team_participation: boolean;
  start_time: string;
  end_time: string;
}

export default function TeamRegistrationPage() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [organization, setOrganization] = useState("");
  const [leaderPhone, setLeaderPhone] = useState("");
  const [members, setMembers] = useState<{ name: string; email: string }[]>([]);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}`);
        const data = await res.json();
        if (data.success && data.quiz?.is_published) {
          setQuiz(data.quiz);
          setMembers(Array(data.quiz.max_team_members).fill({ name: "", email: "" }));
        } else {
          setMessage("⚠️ Quiz not found or not published.");
        }
      } catch {
        setMessage("❌ Failed to load quiz info.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);
  
  const handleChangeMember = (index: number, field: "name" | "email", value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setToken("");

    try {
      const res = await fetch(`${API_BASE_URL}/teams/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quizId,
          team_name: teamName,
          school_organization: organization,
          leader_phone: leaderPhone,
          members,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        setMessage("✅ Team registered successfully. Copy the token below to access the quiz.");
      } else {
        setMessage(`❌ ${data.error || "Failed to register"}`);
      }
    } catch {
      setMessage("❌ Server error while registering team.");
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    alert("🔑 Token copied to clipboard!");
  };

  if (loading) return <p className="p-6 text-center text-gray-600">Loading quiz info...</p>;
  if (!quiz) return <p className="p-6 text-center text-red-500">{message}</p>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-between">
      <main className="max-w-3xl mx-auto px-6 py-12 bg-white dark:bg-gray-900 rounded-2xl shadow-lg space-y-10">
        <div>
          <h1 className="text-4xl font-bold text-indigo-700 dark:text-indigo-400">{quiz.title}</h1>
          <p className="text-md text-gray-600 dark:text-gray-300 mt-1">{quiz.description}</p>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 space-y-1">
            <p>🕒 Start: {new Date(quiz.start_time).toLocaleString()}</p>
            <p>🛑 End: {new Date(quiz.end_time).toLocaleString()}</p>
            <p>👥 Mode: {quiz.allow_team_participation ? "Team" : "Individual"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            required
            placeholder="Team Name"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
          <input
            type="text"
            placeholder="School / Organization"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
          <input
            type="tel"
            required
            placeholder="Team Leader's Phone Number"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            value={leaderPhone}
            onChange={(e) => setLeaderPhone(e.target.value)}
          />

          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Team Members</h2>
          {members.map((m, i) => (
            <div
              key={i}
              className="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-md p-4 space-y-2"
            >
              <input
                type="text"
                required
                placeholder={`Member ${i + 1} Full Name`}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2"
                value={m.name}
                onChange={(e) => handleChangeMember(i, "name", e.target.value)}
              />
              <input
                type="email"
                required
                placeholder={`Member ${i + 1} Email`}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2"
                value={m.email}
                onChange={(e) => handleChangeMember(i, "email", e.target.value)}
              />
            </div>
          ))}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold text-lg transition"
          >
            🚀 Register Team
          </button>
        </form>

        {message && (
          <p
            className={`text-center font-medium ${
              message.startsWith("✅")
                ? "text-green-600"
                : message.startsWith("❌")
                ? "text-red-500"
                : "text-yellow-600"
            }`}
          >
            {message}
          </p>
        )}

        {token && (
          <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-gray-800 dark:to-gray-900 border border-indigo-300 dark:border-indigo-500 p-5 mt-6 rounded-lg space-y-3 text-center">
            <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
              🎉 Your team access token is below. <br />
              <strong className="text-indigo-700 dark:text-indigo-400">
                Copy and save it securely.
              </strong>
            </p>
            <div className="bg-white dark:bg-gray-950 p-3 rounded text-center font-mono text-indigo-700 dark:text-indigo-400 break-all border border-indigo-400">
              {token}
            </div>
            <button
              onClick={copyToken}
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-5 rounded transition font-medium"
            >
              📋 Copy Token
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        QuizCraft © {new Date().getFullYear()} — Built by Menuka Risith
      </footer>
    </div>
  );
}
