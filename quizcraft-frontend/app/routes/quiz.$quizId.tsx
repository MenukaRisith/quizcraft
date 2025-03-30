import { useState, useEffect, useRef } from "react";
import { useParams } from "@remix-run/react";
import io from "socket.io-client";
import { API_BASE_URL, SOCKET_BASE_URL } from "../config/api"; 

export const meta = () => {
  return [{ title: "Quiz | QuizCraft" }];
};

interface Question {
  id: number;
  question: string;
  options: string[];
}

interface Quiz {
  id: number;
  title: string;
  is_active: boolean;
}

interface AnswerResult {
  question_id: number;
  is_correct: boolean;
  selected_option: number;
  correct_option: number;
}

const socket = io(SOCKET_BASE_URL);
const CHEAT_THRESHOLD = 3;

export default function QuizPlayPage() {
  const { quizId } = useParams();
  const [quizDetails, setQuizDetails] = useState<Quiz | null>(null);
  const [token, setToken] = useState("");
  const [teamId, setTeamId] = useState<number | null>(null);
  const [verified, setVerified] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizFinished, setQuizFinished] = useState(false);
  const [message, setMessage] = useState("");
  const [score, setScore] = useState(0);
  const [outOf, setOutOf] = useState(0);
  const [resultAnswers, setResultAnswers] = useState<AnswerResult[]>([]);
  const [countdown, setCountdown] = useState(30);
  const [cheatCount, setCheatCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!quizId) return;
    fetch(`${API_BASE_URL}/quizzes/${quizId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setQuizDetails(data.quiz);
        else setMessage("❌ Quiz not found or inaccessible.");
      })
      .catch(() => setMessage("❌ Failed to load quiz details."));
  }, [quizId]);

  const emitActivity = (type: string, data: Record<string, unknown>) => {
    if (!teamId || !quizId) return;

    socket.emit("log-activity", {
      quiz_id: quizId,
      team_id: teamId,
      event_type: type,
      event_data: data,
    });

    fetch(`${API_BASE_URL}/admin/quiz/log-activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: quizId,
        team_id: teamId,
        event_type: type,
        event_data: data,
      }),
    }).catch(() => console.error("❌ Failed to log activity"));
  };

  const registerCheat = (reason: string) => {
    emitActivity("cheating-detected", { reason });

    setCheatCount(prev => {
      const updated = prev + 1;
      if (updated >= CHEAT_THRESHOLD) {
        setIsLocked(true);
        socket.emit("quiz-lock", {
          quiz_id: quizId,
          team_id: teamId,
          reason,
        });
      }
      return updated;
    });

    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 4000);
  };

  const emitTyping = () => {
    if (!teamId || !quizId) return;
    socket.emit("typing", { quiz_id: quizId, team_id: teamId });
    if (typingRef.current) clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => {
      socket.emit("stop-typing", { quiz_id: quizId, team_id: teamId });
    }, 3000);
  };

  const verifyToken = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, quiz_id: quizId }),
      });
      const data = await res.json();
      if (data.success) {
        setTeamId(data.team_id);
        setVerified(true);
        socket.emit("join-quiz", { quiz_id: quizId, team_id: data.team_id });
        fetchQuestion(0);
      } else {
        setMessage(data.error || "❌ Invalid token or quiz not started.");
      }
    } catch {
      setMessage("❌ Server error during verification.");
    }
  };

  const fetchQuestion = async (index: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/question/${index}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.question) {
        setCurrentQuestion(data.question);
        setSelectedOption(null);
        setQuestionIndex(index);
        setCountdown(30);
      } else {
        setCurrentQuestion(null);
        setQuizFinished(true);
        fetchScore(); // Fetch results here
      }
    } catch {
      setMessage("❌ Failed to fetch question.");
    }
  };

  const submitAnswer = async (auto = false) => {
    if (!currentQuestion || (!auto && selectedOption === null)) {
      alert("Please select an option.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/submit-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          selected_option: selectedOption ?? -1,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchQuestion(questionIndex + 1);
      } else {
        setMessage("❌ Failed to submit answer.");
      }
    } catch {
      setMessage("❌ Error submitting answer.");
    }
  };

  const fetchScore = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/team/${teamId}/results`);
      const data = await res.json();
      if (data.success) {
        setScore(data.score);
        setOutOf(data.outOf);
        setResultAnswers(data.answers);
      }
    } catch {
      console.error("❌ Failed to fetch results.");
    }
  };

  useEffect(() => {
    if (!verified || quizFinished || isLocked) return;
    if (countdown === 0) {
      submitAnswer(true);
      return;
    }

    timerRef.current = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown, verified, quizFinished, isLocked]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) registerCheat("User switched tabs.");
    };

    const handleFullscreen = () => {
      if (!document.fullscreenElement) registerCheat("User exited fullscreen.");
    };

    const handleKeystroke = (e: KeyboardEvent) => {
      emitActivity("keystroke", { key: e.key });
    };

    const handleUnload = () => {
      socket.emit("left-quiz", { quiz_id: quizId, team_id: teamId });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreen);
    document.addEventListener("keydown", handleKeystroke);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      document.removeEventListener("keydown", handleKeystroke);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [quizId, teamId]);

  useEffect(() => {
    if (!quizId || !teamId) return;

    const unlockListener = (payload: { team_id: number }) => {
      if (payload.team_id === teamId) {
        setIsLocked(false);
        setCheatCount(0);
        setMessage("");
      }
    };

    socket.on(`team-unlocked:${quizId}`, unlockListener);
    return () => {
      socket.off(`team-unlocked:${quizId}`, unlockListener);
    };
  }, [quizId, teamId]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-12 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 space-y-6 transition-all">
        {!verified ? (
          <div className="space-y-6 text-center">
            <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">🔐 Enter Access Token</h1>
            {quizDetails?.is_active === false ? (
              <p className="text-red-500 text-sm">⚠️ Quiz is not active. Please wait.</p>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Your quiz token..."
                  className="w-full border rounded-md px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button
                  onClick={verifyToken}
                  disabled={!quizDetails?.is_active}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-md"
                >
                  ✅ Verify & Start
                </button>
              </>
            )}
            {message && <p className="text-sm text-red-500">{message}</p>}
          </div>
        ) : quizFinished ? (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-green-600">🎉 Quiz Completed!</h2>
            <p className="text-gray-700 dark:text-gray-300">
              You scored <strong>{score}</strong> out of <strong>{outOf}</strong> points.
            </p>
            <div className="text-left mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              {resultAnswers.map((ans, i) => (
                <div key={i}>
                </div>
              ))}
            </div>
          </div>
        ) : isLocked ? (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-red-600">⛔ Quiz Locked</h2>
            <p className="text-gray-700 dark:text-gray-300">
              You were disqualified due to multiple violations of the quiz rules.
            </p>
            <p className="text-sm text-gray-500">Please contact your event coordinator.</p>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6">
            {showWarning && (
              <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded shadow mb-4 text-sm font-medium">
                ⚠️ Warning: Cheating behavior detected! ({cheatCount}/{CHEAT_THRESHOLD})
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Q{questionIndex + 1}: {currentQuestion.question}
            </h2>
            <p className="text-sm text-right text-gray-500 dark:text-gray-400">⏳ Time left: {countdown}s</p>
            <div className="space-y-3">
              {currentQuestion.options.map((opt, idx) => (
                <label
                  key={idx}
                  className={`block border px-4 py-3 rounded-md cursor-pointer transition ${
                    selectedOption === idx
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    className="hidden"
                    name="option"
                    checked={selectedOption === idx}
                    onChange={() => {
                      setSelectedOption(idx);
                      emitTyping();
                    }}
                  />
                  {opt}
                </label>
              ))}
            </div>
            <button
              onClick={() => submitAnswer(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md transition"
            >
              ➡️ Submit & Next
            </button>
            {message && <p className="text-sm text-red-500">{message}</p>}
          </div>
        ) : (
          <p className="text-center text-gray-500">Loading question...</p>
        )}
        <footer className="pt-8 text-xs text-center text-gray-400 border-t border-gray-300 dark:border-gray-700">
          QuizCraft © {new Date().getFullYear()} • Built by Menuka Risith
        </footer>
      </div>
    </div>
  );
}
