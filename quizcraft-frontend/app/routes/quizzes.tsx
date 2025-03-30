import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import DashboardLayout from "../components/DashboardLayout";
import { API_BASE_URL } from "../config/api"; 

export const meta = () => {
  return [{ title: "Manage Quizzes | QuizCraft" }];
};

interface Quiz {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  allow_team_participation: boolean;
  is_published?: boolean;
  is_active?: boolean;
  registration_url?: string;
}

interface Question {
  id: number;
  text: string;
  options: string[];
  correct_option_index: number;
}

interface RawQuestion {
  id: number;
  text?: string;
  question?: string;
  options?: string[];
  correct_option_index: number;
}


export default function QuizListPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expandedQuizId, setExpandedQuizId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Record<number, Question[]>>({});
  const [teamSizeInput, setTeamSizeInput] = useState(2);
  const [registrationDeadline, setRegistrationDeadline] = useState("");

  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(0);

  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem("quizcraft_token");
    setToken(storedToken);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("quizcraft_token");
    const storedUser = localStorage.getItem("quizcraft_user");

    if (!storedToken || !storedUser) {
      navigate("/unauthorized");
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      if (user.role !== "admin" && user.role !== "coordinator") {
        navigate("/unauthorized");
        return;
      }
      setToken(storedToken);
    } catch {
      navigate("/unauthorized");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/quizzes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setQuizzes(data.quizzes);
        } else {
          setError(data.error || "Failed to fetch quizzes.");
        }
      } catch {
        setError("Failed to fetch quizzes.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [token]);

  const handleFetchQuestions = async (quizId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const formatted = data.questions.map((q: RawQuestion) => ({
          id: q.id,
          text: q.text || q.question || "Untitled",
          options: q.options || [],
          correct_option_index: q.correct_option_index,
        }));
        setQuestions((prev) => ({ ...prev, [quizId]: formatted }));
        setExpandedQuizId((prev) => (prev === quizId ? null : quizId));
      }
    } catch {
      alert("❌ Failed to load questions.");
    }
  };

  const handleOpenRegistration = async (quizId: number) => {
    if (!registrationDeadline) return alert("Please set a registration deadline.");
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/open-registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          max_team_members: teamSizeInput,
          registration_deadline: new Date(registrationDeadline).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("🚀 Registration opened.");
        setQuizzes((prev) =>
          prev.map((q) =>
            q.id === quizId ? { ...q, is_published: true, registration_url: data.registration_url } : q
          )
        );
      }
    } catch {
      alert("❌ Failed to open registration.");
    }
  };

  const handleStartStopQuiz = async (quizId: number, shouldActivate: boolean) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quiz/${quizId}/${shouldActivate ? "start" : "stop"}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQuizzes((prev) =>
          prev.map((q) => (q.id === quizId ? { ...q, is_active: shouldActivate } : q))
        );
        alert(shouldActivate ? "✅ Quiz started." : "⛔ Quiz stopped.");
      }
    } catch {
      alert("❌ Failed to update quiz status.");
    }
  };

  const handleAddQuestion = async (quizId: number) => {
    if (!newQuestion.trim() || newOptions.some((opt) => !opt.trim())) {
      return alert("Please fill in all question fields.");
    }
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: newQuestion,
          options: newOptions,
          correct_option: correctOption,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Question added");
        setNewQuestion("");
        setNewOptions(["", "", "", ""]);
        setCorrectOption(0);
        handleFetchQuestions(quizId);
      } else {
        alert(data.error || "❌ Failed to add question.");
      }
    } catch {
      alert("❌ Server error while adding question.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">All Quizzes</h1>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow border border-gray-200 dark:border-gray-700 space-y-3"
              >
                <h2 className="text-lg font-semibold">{quiz.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">{quiz.description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>📅 Start: {new Date(quiz.start_time).toLocaleString()}</p>
                  <p>⏰ End: {new Date(quiz.end_time).toLocaleString()}</p>
                  <p>👥 Mode: {quiz.allow_team_participation ? "Team" : "Individual"}</p>
                </div>

                {!quiz.is_published ? (
                  <>
                    <input
                      type="datetime-local"
                      className="w-full px-2 py-1 text-white text-sm border rounded mt-2"
                      value={registrationDeadline}
                      onChange={(e) => setRegistrationDeadline(e.target.value)}
                    />
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={teamSizeInput}
                        onChange={(e) => setTeamSizeInput(Number(e.target.value))}
                        className="w-24 px-2 py-1 text-white text-sm border rounded"
                      />
                      <button
                        onClick={() => handleOpenRegistration(quiz.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded text-sm"
                      >
                        🚀 Open Registration
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-green-600 break-all mt-2">
                    🔓 Registration is open!
                    <br />
                    <a
                      href={quiz.registration_url}
                      className="text-blue-500 underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {quiz.registration_url}
                    </a>
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    className={`w-full text-sm py-1 rounded ${
                      quiz.is_active
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                    onClick={() => handleStartStopQuiz(quiz.id, !quiz.is_active)}
                  >
                    {quiz.is_active ? "⛔ Stop Quiz" : "▶️ Start Quiz"}
                  </button>

                  <button
                    className="text-sm text-blue-600 hover:underline"
                    onClick={() => navigate(`/monitor/${quiz.id}`)}
                  >
                    👀 Monitor Quiz
                  </button>

                  <button
                    className="text-sm text-indigo-600 hover:underline"
                    onClick={() => handleFetchQuestions(quiz.id)}
                  >
                    {expandedQuizId === quiz.id ? "🔽 Hide Questions" : "📋 View Questions"}
                  </button>
                </div>

                {expandedQuizId === quiz.id && (
                  <div className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-3 rounded space-y-3">
                    <h4 className="font-medium text-sm">Questions:</h4>
                    {questions[quiz.id]?.length ? (
                      questions[quiz.id].map((q) => (
                        <div key={q.id} className="border border-gray-300 dark:border-gray-600 rounded p-2 mb-2">
                          <p className="font-semibold text-sm mb-1">• {q.text}</p>
                          <ul className="space-y-1">
                            {q.options.map((opt, idx) => (
                              <li
                                key={idx}
                                className={`px-2 py-1 rounded ${
                                  idx === q.correct_option_index
                                    ? "bg-green-200 dark:bg-green-700 font-bold"
                                    : "bg-gray-200 dark:bg-gray-600"
                                }`}
                              >
                                {opt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No questions added yet.</p>
                    )}

                    {/* Add Question Form */}
                    <div className="pt-2 mt-3 border-t text-white border-gray-300 space-y-2">
                      <input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Enter question..."
                        className="w-full px-2 py-1 text-sm border rounded"
                      />
                      {newOptions.map((opt, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...newOptions];
                            updated[idx] = e.target.value;
                            setNewOptions(updated);
                          }}
                          placeholder={`Option ${idx + 1}`}
                          className="w-full px-2 py-1 text-white text-sm border rounded"
                        />
                      ))}
                      <select
                        className="w-full px-2 py-1 text-white text-sm border rounded"
                        value={correctOption}
                        onChange={(e) => setCorrectOption(Number(e.target.value))}
                      >
                        {newOptions.map((_, idx) => (
                          <option key={idx} value={idx}>
                            Correct: Option {idx + 1}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAddQuestion(quiz.id)}
                        className="w-full py-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded"
                      >
                        ➕ Add Question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
