import { useState } from "react";
import { API_BASE_URL } from "../config/api"; 

export default function QuizCreateForm() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    allow_team_participation: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      setForm({ ...form, [name]: e.target.checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("quizcraft_token");

      const res = await fetch(`${API_BASE_URL}/quizzes/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Quiz created successfully!" });
        setForm({
          title: "",
          description: "",
          start_time: "",
          end_time: "",
          allow_team_participation: false,
        });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to create quiz." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <input
        name="title"
        placeholder="Quiz Title"
        value={form.title}
        onChange={handleChange}
        className="input"
        required
      />

      <textarea
        name="description"
        placeholder="Description (optional)"
        value={form.description}
        onChange={handleChange}
        className="input h-24"
      />

      <div className="flex gap-4">
        <div className="flex-1">
          <label
            htmlFor="start_time"
            className="text-sm font-medium text-gray-800 dark:text-gray-200 block mb-1"
          >
            Start Time
          </label>
          <input
            type="datetime-local"
            name="start_time"
            id="start_time"
            value={form.start_time}
            onChange={handleChange}
            className="input"
            required
          />
        </div>

        <div className="flex-1">
          <label
            htmlFor="end_time"
            className="text-sm font-medium text-gray-800 dark:text-gray-200 block mb-1"
          >
            End Time
          </label>
          <input
            type="datetime-local"
            name="end_time"
            id="end_time"
            value={form.end_time}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
      </div>

      <label className="inline-flex items-center mt-2 gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
        <input
          type="checkbox"
          name="allow_team_participation"
          checked={form.allow_team_participation}
          onChange={handleChange}
        />
        Allow team participation?
      </label>

      {message && (
        <p
          className={`text-sm font-medium ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Quiz"}
      </button>
    </form>
  );
}
