import { useEffect } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import { API_BASE_URL } from "./config/api";

// CSS Imports
import "./tailwind.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if setup is completed by calling the setup API status
    fetch(`${API_BASE_URL}/setup/status`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.initialized) {
          // Redirect to setup if not initialized
          navigate("/setup");
        }
      })
      .catch((err) => {
        console.error("Error checking setup status:", err);
        // In case of error, redirect to setup
        navigate("/setup");
      });
  }, [navigate]);

  return <Outlet />;
}
