import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@remix-run/react";
import io, { Socket } from "socket.io-client";
import DashboardLayout from "../components/DashboardLayout";
import { API_BASE_URL, SOCKET_BASE_URL } from "../config/api"; 

export const meta = () => {
    return [{ title: "Monitor | QuizCraft" }];
};

interface Team {
  id: number;
  team_name: string;
  lastSeen: string;
}

interface LogEntry {
  event_type: string;
  event_data: Record<string, unknown> | string;
  timestamp: string;
}

interface LockInfo {
  reason: string;
  time: string;
}

export default function MonitorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [violationCounts, setViolationCounts] = useState<Record<number, number>>({});
  const [socket, setSocket] = useState<Socket | null>(null);
  const [typingTeamId, setTypingTeamId] = useState<number | null>(null);
  const [lockedTeams, setLockedTeams] = useState<Record<number, LockInfo>>({});
  const [popup, setPopup] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

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

  const fetchLiveTeams = async () => {
    if (!token || !quizId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quiz/${quizId}/live-teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTeams(data.teams);
    } catch {
      console.error("❌ Failed to fetch live teams.");
    }
  };

  const fetchLockedTeams = async () => {
    if (!token || !quizId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/quiz/${quizId}/locked-teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const lockMap: Record<number, LockInfo> = {};
        for (const team of data.teams) {
          lockMap[team.id] = {
            reason: team.reason || "Unknown",
            time: team.time || new Date().toISOString(),
          };
        }
        setLockedTeams(lockMap);
      }
    } catch {
      console.error("❌ Failed to fetch locked teams.");
    }
  };

  const fetchAllViolations = async () => {
    if (!token || !quizId) return;
    const counts: Record<number, number> = {};
    await Promise.all(
      teams.map(async (team) => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/admin/quiz/${quizId}/team/${team.id}/logs`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          if (data.success) {
            const count = data.logs.filter((log: LogEntry) => log.event_type === "cheating-detected")
              .length;
            counts[team.id] = count;
          }
        } catch (err) {
          console.error(`❌ Failed to fetch logs for team ${team.id}:`, err);
        }
      })
    );
    setViolationCounts(counts);
  };

  useEffect(() => {
    fetchLiveTeams();
    fetchLockedTeams();
    const interval = setInterval(() => {
      fetchLiveTeams();
      fetchLockedTeams();
    }, 5000);
    return () => clearInterval(interval);
  }, [token, quizId]);

  useEffect(() => {
    fetchAllViolations();
  }, [teams]);

  useEffect(() => {
    if (!selectedTeamId || !quizId || !token) return;
    const fetchLogs = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/admin/quiz/${quizId}/team/${selectedTeamId}/logs`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.success) setLogs(data.logs);
      } catch {
        console.error("❌ Failed to fetch logs.");
      }
    };
    fetchLogs();
  }, [selectedTeamId, quizId, token]);

  useEffect(() => {
    if (!quizId) return;
    const newSocket = io(SOCKET_BASE_URL);
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [quizId]);

  useEffect(() => {
    if (!socket || !quizId) return;
    const refresh = () => {
      fetchLiveTeams();
      fetchLockedTeams();
      fetchAllViolations();
    };
    socket.on(`live-teams:${quizId}`, refresh);
    return () => {
      socket.off(`live-teams:${quizId}`, refresh);
    };
  }, [socket, quizId]);

  useEffect(() => {
    if (!socket || !quizId) return;

    const handleLock = ({
      team_id,
      reason,
      time,
    }: {
      team_id: number;
      reason: string;
      time: string;
    }) => {
      setLockedTeams((prev) => ({
        ...prev,
        [team_id]: { reason, time },
      }));
      const teamName = teams.find((t) => t.id === team_id)?.team_name || `Team ${team_id}`;
      setPopup(`⛔ ${teamName} has been locked: ${reason}`);
      setTimeout(() => setPopup(null), 5000);
      fetchAllViolations();
    };

    socket.on(`team-locked:${quizId}`, handleLock);
    return () => {
      socket.off(`team-locked:${quizId}`, handleLock);
    };
  }, [socket, quizId, teams]);

  useEffect(() => {
    if (!socket || !selectedTeamId || !quizId) return;
    const logChannel = `team-log:${quizId}:${selectedTeamId}`;

    const handleLiveLog = (log: LogEntry) => {
      setLogs((prev) => [log, ...prev]);
      if (log.event_type === "cheating-detected") {
        setViolationCounts((prev) => ({
          ...prev,
          [selectedTeamId]: (prev[selectedTeamId] || 0) + 1,
        }));
      }
    };

    const handleTyping = ({ team_id }: { team_id: number }) =>
      team_id === selectedTeamId && setTypingTeamId(team_id);
    const handleStopTyping = ({ team_id }: { team_id: number }) =>
      team_id === selectedTeamId && setTypingTeamId(null);

    socket.on(logChannel, handleLiveLog);
    socket.on("typing", handleTyping);
    socket.on("stop-typing", handleStopTyping);

    return () => {
      socket.off(logChannel, handleLiveLog);
      socket.off("typing", handleTyping);
      socket.off("stop-typing", handleStopTyping);
    };
  }, [socket, selectedTeamId, quizId]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [logs]);

  const handleLockTeam = async (teamId: number) => {
    const reason = prompt("Enter lock reason:");
    if (!reason) return;

    try {
      await fetch(`http://localhost:5000/api/admin/quiz/${quizId}/team/${teamId}/lock`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      await fetchLockedTeams();
    } catch {
      alert("Failed to lock team.");
    }
  };

  const handleUnlockTeam = async (teamId: number) => {
    const confirmed = confirm("Are you sure you want to unlock this team?");
    if (!confirmed) return;

    try {
      await fetch(`http://localhost:5000/api/admin/quiz/${quizId}/unlock-team/${teamId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = { ...lockedTeams };
      delete updated[teamId];
      setLockedTeams(updated);
    } catch {
      alert("Failed to unlock team.");
    }
  };

  return (
    <DashboardLayout>
      <div className="pb-20 space-y-6 relative">
        <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">👀 Live Monitoring</h1>

        {popup && (
          <div className="fixed top-6 right-6 z-50 bg-red-600 text-white px-4 py-2 rounded shadow-lg animate-pulse">
            {popup}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">🟢 Live Participating Teams</h2>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
              {teams.length === 0 ? (
                <p className="text-sm text-gray-500">No teams are currently live.</p>
              ) : (
                teams.map((team) => {
                  const isLocked = lockedTeams[team.id];
                  const violationCount = violationCounts[team.id] || 0;
                  return (
                    <div key={team.id} className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedTeamId(team.id)}
                        disabled={!!isLocked}
                        className={`text-left text-sm px-3 py-2 rounded w-full mr-2 transition ${
                          isLocked
                            ? "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 line-through"
                            : selectedTeamId === team.id
                            ? "bg-indigo-200 dark:bg-indigo-700 text-indigo-900 dark:text-white"
                            : "text-gray-800 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-800"
                        }`}
                      >
                        {isLocked ? "🚫 " : "🧑‍💻 "}
                        {team.team_name}
                        <span className="float-right text-xs text-gray-500 dark:text-gray-400">
                          {violationCount > 0 && `🚨 ${violationCount}`}{" "}
                          {new Date(team.lastSeen).toLocaleTimeString()}
                        </span>
                      </button>
                      {!isLocked && (
                        <button
                          onClick={() => handleLockTeam(team.id)}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                        >
                          🔒 Lock
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {Object.keys(lockedTeams).length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-2">🔐 Locked Teams</h2>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-400 dark:border-red-700 space-y-3">
                  {Object.entries(lockedTeams).map(([id, info]) => {
                    const team = teams.find((t) => t.id === Number(id));
                    return (
                      <div key={id} className="flex justify-between items-start">
                        <div className="text-sm">
                          <p className="font-semibold text-red-600">{team?.team_name || `Team ${id}`}</p>
                          <p className="text-xs text-gray-500">Reason: {info.reason}</p>
                          <p className="text-xs text-gray-400">Time: {new Date(info.time).toLocaleTimeString()}</p>
                        </div>
                        <button
                          onClick={() => handleUnlockTeam(Number(id))}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                        >
                          🔓 Unlock
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">
              🧾 {selectedTeamId ? "Live Console" : "Select a Team"}
            </h2>
            <div
              ref={logRef}
              className="bg-black text-green-400 font-mono text-sm p-4 rounded-lg h-[400px] overflow-y-auto border border-gray-600"
            >
              {typingTeamId === selectedTeamId && (
                <div className="text-blue-400 italic mb-2">✍️ Team is currently answering...</div>
              )}
              {logs.length === 0 ? (
                <p className="text-gray-500">No logs yet.</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="mb-2">
                    <span className="text-yellow-300">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>{" "}
                    <strong className="uppercase text-red-400">{log.event_type}</strong> –{" "}
                    {typeof log.event_data === "object"
                      ? JSON.stringify(log.event_data)
                      : log.event_data}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
