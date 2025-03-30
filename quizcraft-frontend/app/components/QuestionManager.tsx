import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api"; 

interface Question {
  id: number;
  question: string;
  options: string[];
  correct_option_index: number;
}

export default function QuestionManager({ quizId }: { quizId: number }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correct_option: 0,
  });
  const [message, setMessage] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("quizcraft_token");
      const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions);
      }
    } catch (err) {
      console.error("Error fetching questions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...form.options];
    updated[index] = value;
    setForm({ ...form, options: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const token = localStorage.getItem("quizcraft_token");

    const res = await fetch(`${API_BASE_URL}/quizzes/${quizId}/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (data.success) {
      setMessage("Question added successfully!");
      setForm({
        question: "",
        options: ["", "", "", ""],
        correct_option: 0,
      });
      fetchQuestions();
    } else {
      setMessage(data.error || "Failed to add question.");
    }
  };

  return (
    <div className="mt-4 space-y-6">
      <h3 className="text-lg font-semibold">Add Question</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Question"
          value={form.question}
          onChange={(e) => setForm({ ...form, question: e.target.value })}
          className="input h-24"
          required
        />

        {form.options.map((opt, index) => (
          <input
            key={index}
            placeholder={`Option ${index + 1}`}
            value={opt}
            onChange={(e) => handleOptionChange(index, e.target.value)}
            className="input"
            required
          />
        ))}

        <select
          value={form.correct_option}
          onChange={(e) =>
            setForm({ ...form, correct_option: parseInt(e.target.value) })
          }
          className="input"
        >
          {[0, 1, 2, 3].map((index) => (
            <option key={index} value={index}>
              Correct Answer: Option {index + 1}
            </option>
          ))}
        </select>

        {message && <p className="text-sm text-green-600">{message}</p>}

        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">
          Add Question
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-md font-semibold">Existing Questions</h3>
        {loading ? (
          <p>Loading...</p>
        ) : questions.length === 0 ? (
          <p className="text-sm text-gray-500">No questions added yet.</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {questions.map((q, i) => (
              <li key={q.id}>
                <strong>Q{i + 1}:</strong> {q.question}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
