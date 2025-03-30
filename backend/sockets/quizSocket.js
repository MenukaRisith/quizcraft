const setupQuizSocket = (io) => {
    io.on("connection", (socket) => {
      console.log("🟢 User connected");
  
      socket.on("joinRoom", ({ quizId, teamId }) => {
        const room = `quiz-${quizId}-team-${teamId}`;
        socket.join(room);
        console.log(`Team ${teamId} joined room: ${room}`);
      });
  
      socket.on("activity", ({ quizId, teamId, eventType, data }) => {
        const room = `quiz-${quizId}-team-${teamId}`;
        io.to(room).emit("activity-log", {
          teamId,
          eventType,
          timestamp: new Date().toISOString(),
          data,
        });
      });
  
      socket.on("disconnect", () => {
        console.log("🔴 User disconnected");
      });
    });
  };
  
  module.exports = setupQuizSocket;
  