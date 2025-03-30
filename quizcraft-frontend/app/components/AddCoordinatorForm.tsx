import { useState } from "react";
import { API_BASE_URL } from "../config/api"; 

export default function AddCoordinatorForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("quizcraft_token");

      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, role: "coordinator" }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Coordinator added successfully." });
        setForm({ name: "", email: "", password: "" });
      } else {
        setMessage({ type: "error", text: data.error || "Failed to add coordinator." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <input
        name="name"
        type="text"
        placeholder="Coordinator Name"
        value={form.name}
        onChange={handleChange}
        className="input"
        required
      />
      <input
        name="email"
        type="email"
        placeholder="Coordinator Email"
        value={form.email}
        onChange={handleChange}
        className="input"
        required
      />
      <input
        name="password"
        type="password"
        placeholder="Temporary Password"
        value={form.password}
        onChange={handleChange}
        className="input"
        required
      />

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
        {loading ? "Adding..." : "Add Coordinator"}
      </button>
    </form>
  );
}
