import { useState, useEffect } from "react";
import { useNavigate } from "@remix-run/react";
import { API_BASE_URL } from "../config/api";

export const meta = () => {
  return [{ title: "Setup | QuizCraft" }];
};

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState({
    dbHost: "localhost",
    dbUser: "root",
    dbPassword: "",
    dbName: "quizcraft",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    jwtSecret:
      crypto.randomUUID().replace(/-/g, "") +
      crypto.randomUUID().replace(/-/g, ""),
  });

  // 🔐 Check setup status on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/setup/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data.initialized) navigate("/auth/login");
      })
      .catch((err) => {
        console.error("Setup status check failed:", err);
      });
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleStepOneNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.dbHost || !form.dbUser || !form.dbName) {
      setError("Please fill out all required database fields.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate("/auth/login"), 2000);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to connect. Check backend status and credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg p-6 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">QuizCraft Setup</h1>

        {success ? (
          <div className="text-green-600 font-medium text-center">
            ✅ Setup complete! Redirecting to login...
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleStepOneNext} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Step 1: Database</h2>
            <input
              name="dbHost"
              placeholder="Database Host"
              value={form.dbHost}
              onChange={handleChange}
              className="input"
              required
            />
            <input
              name="dbUser"
              placeholder="Database User"
              value={form.dbUser}
              onChange={handleChange}
              className="input"
              required
            />
            <input
              type="password"
              name="dbPassword"
              placeholder="Database Password"
              value={form.dbPassword}
              onChange={handleChange}
              className="input"
            />
            <input
              name="dbName"
              placeholder="Database Name"
              value={form.dbName}
              onChange={handleChange}
              className="input"
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Next →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Step 2: Admin Account</h2>
            <input
              name="adminName"
              placeholder="Admin Name"
              value={form.adminName}
              onChange={handleChange}
              className="input"
              required
            />
            <input
              name="adminEmail"
              placeholder="Admin Email"
              value={form.adminEmail}
              onChange={handleChange}
              type="email"
              className="input"
              required
            />
            <input
              name="adminPassword"
              placeholder="Admin Password"
              type="password"
              value={form.adminPassword}
              onChange={handleChange}
              className="input"
              required
            />
            <h2 className="text-lg font-semibold text-gray-700 mt-4">JWT Secret</h2>
            <input
              name="jwtSecret"
              value={form.jwtSecret}
              onChange={handleChange}
              className="input font-mono text-xs"
              required
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                className="w-1/2 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400"
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-1/2 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                {loading ? "Setting up..." : "Finish Setup"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
