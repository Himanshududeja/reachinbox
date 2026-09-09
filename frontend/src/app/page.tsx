"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Email = {
  id: number;
  recipient: string;
  subject: string;
  preview: string;
  time: string;
};

type User = {
  userId: number;
  email: string;
};

function Login({
  onLogin
}: {
  onLogin: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <h1>Login</h1>

        <button
          className="google-button"
          onClick={() => {
            window.location.href =
              `${API_URL}/api/auth/google`;
          }}
        >
          Continue with Google
        </button>

        <div className="divider">
          <span />
          <p>or sign up through email</p>
          <span />
        </div>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="login-button">
            Login
          </button>
        </form>
      </div>
    </main>
  );
}

function Dashboard({
  onCompose,
  onLogout,
  user
}: {
  onCompose: () => void;
  onLogout: () => void;
  user: User | null;
}) {
  const [activeTab, setActiveTab] = useState<"scheduled" | "sent">(
    "scheduled"
  );
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmails = async () => {
      setLoading(true);

      try {
        const endpoint =
          activeTab === "scheduled"
            ? `${API_URL}/api/campaigns/scheduled`
            : `${API_URL}/api/campaigns/sent`;

        const response = await fetch(endpoint, {
          credentials: "include"
        });

        const data = await response.json();

        const formatted = (data.emails || []).map((email: any) => ({
          id: email.id,
          recipient: email.recipient,
          subject: email.subject,
          preview: email.body,
          time:
            activeTab === "scheduled"
              ? new Date(email.scheduled_at).toLocaleString()
              : new Date(email.sent_at).toLocaleString()
        }));

        setEmails(formatted);
      } catch (error) {
        console.error("Failed to load emails:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEmails();
  }, [activeTab]);

  const handleSearch = async () => {
    if (!search.trim()) {
      const endpoint =
        activeTab === "scheduled"
          ? `${API_URL}/api/campaigns/scheduled`
          : `${API_URL}/api/campaigns/sent`;

      try {
        const response = await fetch(endpoint, {
          credentials: "include"
        });

        const data = await response.json();

        setEmails(
          (data.emails || []).map((email: any) => ({
            id: email.id,
            recipient: email.recipient,
            subject: email.subject,
            preview: email.body,
            time:
              activeTab === "scheduled"
                ? new Date(email.scheduled_at).toLocaleString()
                : new Date(email.sent_at).toLocaleString()
          }))
        );
      } catch (error) {
        console.error("Failed to load emails:", error);
      }

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/emails/search?q=${encodeURIComponent(search)}`,
        {
          credentials: "include"
        }
      );

      const data = await response.json();

      const results = data.results || [];

      const filtered = results.filter((email: any) => {
        if (activeTab === "scheduled") {
          return email.status === "pending";
        }

        return email.status === "sent";
      });

      setEmails(
        filtered.map((email: any) => ({
          id: email.id,
          recipient: email.recipient,
          subject: email.subject,
          preview: email.body,
          time:
            activeTab === "scheduled"
              ? new Date(email.scheduled_at).toLocaleString()
              : new Date(email.sent_at).toLocaleString()
        }))
      );
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [search, activeTab]);

  return (
    <div className="dashboard-page">
      <aside className="sidebar">
        <div className="logo">ReachInbox</div>

        <button className="compose-button" onClick={onCompose}>
          + Compose
        </button>

        <nav className="sidebar-nav">
          <button
            className={activeTab === "scheduled" ? "active" : ""}
            onClick={() => setActiveTab("scheduled")}
          >
            <span>◷</span>
            Scheduled
          </button>

          <button
            className={activeTab === "sent" ? "active" : ""}
            onClick={() => setActiveTab("sent")}
          >
            <span>✓</span>
            Sent
          </button>
        </nav>

        <button className="logout-button" onClick={onLogout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>{activeTab === "scheduled" ? "Scheduled" : "Sent"}</h1>

            <p>
              {activeTab === "scheduled"
                ? "Your scheduled emails"
                : "Your sent emails"}
            </p>
          </div>

          <div className="profile">
            <div className="profile-avatar">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>

            <div>
              <strong>
                {user?.email?.split("@")[0] || "User"}
              </strong>

              <span>{user?.email || ""}</span>
            </div>
          </div>

          <button
            onClick={() => {
              window.location.href =
                `${API_URL}/api/slack/oauth/start`;
            }}
          >
            Connect Slack
          </button>
        </div>

        <div className="search-box">
          <span>⌕</span>

          <input
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
        </div>

        <div className="email-list">
          {loading ? (
            <div className="empty-state">Loading...</div>
          ) : emails.length === 0 ? (
            <div className="empty-state">
              {search
                ? "No matching emails found"
                : `No ${activeTab} emails`}
            </div>
          ) : (
            emails.map(email => (
              <div className="email-row" key={email.id}>
                <div className="email-main">
                  <strong>{email.recipient}</strong>

                  <div className="email-subject">
                    {email.subject}
                  </div>

                  <div className="email-preview">
                    {email.preview}
                  </div>
                </div>

                <div className="email-time">
                  {email.time}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function Compose({
  onBack
}: {
  onBack: () => void;
}) {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delay, setDelay] = useState("5");
  const [hourlyLimit, setHourlyLimit] = useState("2");
  const [senderId, setSenderId] = useState("1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const addRecipient = () => {
    const email = recipientInput.trim();

    if (!email || recipients.includes(email)) {
      return;
    }

    setRecipients([...recipients, email]);
    setRecipientInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(
      recipients.filter(item => item !== email)
    );
  };

  const handleRecipientKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleSchedule = async (
    scheduleTime?: string
  ) => {
    if (!recipients.length) {
      setMessage("Add at least one recipient");
      return;
    }

    if (!subject.trim()) {
      setMessage("Enter a subject");
      return;
    }

    if (!body.trim()) {
      setMessage("Write your email");
      return;
    }

    const finalScheduledAt =
      scheduleTime || scheduledAt;

    if (!finalScheduledAt) {
      setMessage("Select a schedule time");
      return;
    }

    const date = new Date(finalScheduledAt);

    if (date.getTime() <= Date.now()) {
      setMessage("Schedule time must be in the future");
      return;
    }

    const delaySeconds = Number(delay);
    const limit = Number(hourlyLimit);

    if (!Number.isFinite(delaySeconds) || delaySeconds < 0) {
      setMessage("Invalid delay");
      return;
    }

    if (!Number.isFinite(limit) || limit < 1) {
      setMessage("Invalid hourly limit");
      return;
    }

    try {
      setSending(true);
      setMessage("");

      const campaignResponse = await fetch(
        `${API_URL}/api/campaigns`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: subject.trim(),
            delaySeconds,
            hourlyLimit: limit
          })
        }
      );

      const campaignData =
        await campaignResponse.json();

      if (!campaignResponse.ok) {
        throw new Error(
          campaignData.message ||
          "Failed to create campaign"
        );
      }

      const campaignId =
        campaignData.campaignId;

      for (const recipient of recipients) {
        const response = await fetch(
          `${API_URL}/api/campaigns/${campaignId}/emails`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": crypto.randomUUID()
            },
            body: JSON.stringify({
              senderId: Number(senderId),
              recipient,
              subject,
              body,
              scheduledAt: date.toISOString()
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Failed to schedule email"
          );
        }
      }

      setMessage("Email scheduled successfully");

      setRecipients([]);
      setRecipientInput("");
      setSubject("");
      setBody("");
      setScheduledAt("");
    } catch (error: any) {
      console.error(error);

      setMessage(
        error.message ||
        "Failed to schedule email"
      );
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    await handleSchedule();
  };

  return (
    <main className="compose-page">
      <header className="compose-header">
        <div className="compose-header-left">
          <button
            className="back-button"
            onClick={onBack}
          >
            ←
          </button>

          <div>
            <h1>Compose Email</h1>
            <p>Create and schedule your email</p>
          </div>
        </div>

        <button
          className="close-button"
          onClick={onBack}
        >
          ×
        </button>
      </header>

      <div className="compose-content">
        <section className="compose-card">
          <div className="field-row">
            <label>From</label>

            <div className="select-wrapper">
              <select
                value={senderId}
                onChange={e =>
                  setSenderId(e.target.value)
                }
              >
                <option value="1">
                  Himanshu &lt;colton.denesik@ethereal.email&gt;
                </option>

                <option value="2">
                  ReachInbox &lt;colton.denesik@ethereal.email&gt;
                </option>
              </select>

              <span>⌄</span>
            </div>
          </div>

          <div className="field-row">
            <label>To</label>

            <div className="recipient-area">
              <div className="recipient-list">
                {recipients.map(email => (
                  <div
                    className="recipient-chip"
                    key={email}
                  >
                    <span>{email}</span>

                    <button
                      type="button"
                      onClick={() =>
                        removeRecipient(email)
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}

                <input
                  value={recipientInput}
                  onChange={e =>
                    setRecipientInput(e.target.value)
                  }
                  onKeyDown={handleRecipientKeyDown}
                  onBlur={addRecipient}
                  placeholder={
                    recipients.length
                      ? "Add another recipient"
                      : "Enter email address"
                  }
                />
              </div>

              <button
                type="button"
                className="upload-button"
              >
                <span>↑</span>
                Upload List
              </button>
            </div>
          </div>

          <div className="field-row">
            <label>Subject</label>

            <input
              className="subject-input"
              value={subject}
              onChange={e =>
                setSubject(e.target.value)
              }
              placeholder="Enter email subject"
            />
          </div>

          <div className="settings-row">
            <div className="setting-item">
              <label>Delay between emails</label>

              <div className="setting-control">
                <input
                  type="number"
                  min="0"
                  value={delay}
                  onChange={e =>
                    setDelay(e.target.value)
                  }
                />

                <span>seconds</span>
              </div>
            </div>

            <div className="setting-item">
              <label>Hourly send limit</label>

              <div className="setting-control">
                <input
                  type="number"
                  min="1"
                  value={hourlyLimit}
                  onChange={e =>
                    setHourlyLimit(e.target.value)
                  }
                />

                <span>emails/hour</span>
              </div>
            </div>
          </div>

          <div className="schedule-field">
            <label>Schedule time</label>

            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e =>
                setScheduledAt(e.target.value)
              }
            />
          </div>

          <div className="editor">
            <div className="editor-toolbar">
              <button type="button">B</button>
              <button type="button">I</button>
              <button type="button">U</button>

              <span className="toolbar-divider" />

              <button type="button">•</button>
              <button type="button">1.</button>

              <span className="toolbar-divider" />

              <button type="button">↗</button>
              <button type="button">⌁</button>
            </div>

            <textarea
              value={body}
              onChange={e =>
                setBody(e.target.value)
              }
              placeholder="Write your email..."
            />
          </div>

          {message && (
            <div className="compose-message">
              {message}
            </div>
          )}

          <div className="compose-footer">
            <button
              type="button"
              className="discard-button"
              onClick={onBack}
            >
              Discard
            </button>

            <div className="send-actions">
              <button
                type="button"
                className="send-later-button"
                onClick={() => handleSchedule()}
                disabled={sending}
              >
                {sending
                  ? "Scheduling..."
                  : "Send Later"}

                <span>⌄</span>
              </button>

              <button
                type="button"
                className="send-button"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>

        <aside className="compose-side">
          <div className="info-card">
            <div className="info-icon">i</div>

            <div>
              <h3>Sending limits</h3>

              <p>
                Emails will be automatically delayed
                when the hourly sending limit is reached.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">✓</div>

            <div>
              <h3>Smart scheduling</h3>

              <p>
                Your emails will survive server restarts
                and continue sending automatically.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function Page() {
  const [
    screen,
    setScreen
  ] = useState<"login" | "dashboard" | "compose">(
    "login"
  );

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const auth = params.get("auth");

    if (auth === "success") {
      setScreen("dashboard");

      window.history.replaceState(
        {},
        "",
        "/"
      );
    }
  }, []);

  useEffect(() => {
    if (screen !== "dashboard") {
      return;
    }

    fetch(
      `${API_URL}/api/auth/me`,
      {
        credentials: "include"
      }
    )
      .then(response => {
        if (!response.ok) {
          throw new Error("Not authenticated");
        }

        return response.json();
      })
      .then(data => {
        console.log("AUTH USER:", data);
        setUser(data.user);
      })
      .catch(error => {
        console.error("AUTH ERROR:", error);
        setUser(null);
      });
  }, [screen]);

  if (screen === "login") {
    return (
      <Login
        onLogin={() =>
          setScreen("dashboard")
        }
      />
    );
  }

  if (screen === "compose") {
    return (
      <Compose
        onBack={() =>
          setScreen("dashboard")
        }
      />
    );
  }

  return (
    <Dashboard
      onCompose={() =>
        setScreen("compose")
      }
      onLogout={() => {
        setUser(null);
        setScreen("login");
      }}
      user={user}
    />
  );
}
