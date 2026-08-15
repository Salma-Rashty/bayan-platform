"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/ping")
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => setMessage(data.message))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center py-32 px-16">
        <p className="text-lg text-black dark:text-zinc-50">
          {error ? "Could not connect to API" : message ?? "Loading..."}
        </p>
      </main>
    </div>
  );
}
