# QuizCraft

## Introduction

QuizCraft is a powerful, secure, and interactive quiz platform designed for organizing and managing online quizzes. It allows admins to create quizzes, manage participants, and monitor live activity during quizzes. It also provides features for generating encrypted tokens and integrates seamlessly with a web front-end and API backend.

This platform is in its **beta version** and is actively being developed. Your feedback and suggestions are welcome!

## Features

- **Admin Dashboard**: Manage quizzes, view leaderboard, and assign coordinators.
- **Quiz Management**: Create, publish, and manage quizzes with various settings such as team participation and time limits.
- **Team Participation**: Allow teams to register and participate in quizzes.
- **Real-Time Monitoring**: Track user activity and submissions in real-time.
- **Encrypted Tokens**: Secure access to quizzes with tokens, using AES-256 encryption.
- **User Roles**: Admin, Coordinator, and Participant roles with customizable permissions.
- **Responsive Front-End**: Built with RemixJS for a modern, fast user experience.
- **Database Integration**: MySQL for data storage and management.

## Developer Info

QuizCraft was developed by **Menuka Risith**. I am a passionate developer focusing on creating scalable and interactive platforms. If you need help or encounter any issues, feel free to contact me or follow me on social media for updates and support.

- LinkedIn: [Menuka Risith](https://www.linkedin.com/in/menuka-risith)
- Facebook: [Menuka Risith](https://www.facebook.com/menuka.risith)
- Instagram: [menukar](https://www.instagram.com/menukar/)
- Twitter (X): [@menuka_risith](https://twitter.com/menuka_risith)

## Setup Instructions

Follow these steps to set up **QuizCraft** on your server. You can run the entire setup process using the provided shell script.

### Prerequisites

- Ubuntu 20.04 (or later)
- Node.js (v16 or later)
- Apache2 Web Server
- MySQL Server (Optional, but required for production)

### 1. Clone the Repository

Clone the repository to your server:

```markdown
```bash
git clone https://github.com/yourusername/quizcraft.git
cd quizcraft

### 2. Run the Setup Script

Run the provided shell script to set up the environment and install all dependencies:

```markdown
```bash
chmod +x setup.sh
./setup.sh


This script will:

- Update and install necessary system dependencies.
- Install Node.js, PM2, Apache2, and MySQL (optional).
- Install backend and frontend dependencies.
- Set up your Apache2 virtual host to proxy requests between the backend and frontend.
- Generate a random encryption key and store it in the `.env` file.
- Set up the MySQL database for QuizCraft (optional).
- Start both the frontend and backend using PM2 for continuous operation.
- Make sure PM2 restarts on boot.

### 3. Domain and DNS Configuration

Once the setup is complete, update your DNS settings to point to the server's IP address for your domain. The platform will be accessible at:

```markdown

http://<your_domain> or http://<server_ip>

For the DNS to work properly, you need to ensure the following:

- Update the A record for your domain to point to the server's IP.
- Make sure the port 80 is open on your server for HTTP traffic.

## 4. Contact & Help

If you encounter any bugs or need help with the setup, feel free to reach out to me directly via:

- Email: menuka.contact@gmail.com
- LinkedIn: [Menuka Risith](https://www.linkedin.com/in/menukarisith)
- Facebook: [Menuka Risith](https://www.facebook.com/menukar_dev)
- Instagram: [menuka_risith](https://www.instagram.com/menuka_risith/)
- Twitter (X): [@menuka_risith](https://twitter.com/menukarisith)

I will be happy to assist you with any issues you face.

## 5. Follow for Updates

Stay updated with the latest releases and features of QuizCraft by following me on the following social media platforms:

- LinkedIn: [Menuka Risith](https://www.linkedin.com/in/menukarisith)
- Facebook: [Menuka Risith](https://www.facebook.com/menukar_dev)
- Instagram: [menuka_risith](https://www.instagram.com/menuka_risith/)
- Twitter (X): [@menuka_risith](https://twitter.com/menukarisith)