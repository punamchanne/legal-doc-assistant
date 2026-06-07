import PDFViewer from "../components/PDFViewer";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import UploadCard from "../components/UploadCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const { user, logout } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState("dashboard");

  // Core Q&A / Upload states
  const [status, setStatus] = useState("");
  const [filename, setFilename] = useState("");
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [searchWord, setSearchWord] = useState("");

  // Document analysis metadata
  const [docAnalysis, setDocAnalysis] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("precautions");

  // History & Analytics states
  const [historyList, setHistoryList] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chat]);

  // Load history and analytics dynamically
  useEffect(() => {
    if (activeTab === "history" && user?.id) {
      fetchHistory();
    } else if (activeTab === "analytics" && user?.id) {
      fetchAnalytics();
    }
  }, [activeTab, user?.id]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/history?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/analytics?user_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // ================= FILE UPLOAD =================
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setStatus("Uploading document...");
      setDocAnalysis(null);

      // UPLOAD FILE
      const uploadRes = await fetch(
        "http://127.0.0.1:8000/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error();

      setFilename(uploadData.filename);
      setStatus("Indexing & analyzing document...");

      // INDEX AND CLASSIFY DOCUMENT
      const indexRes = await fetch(
        "http://127.0.0.1:8000/upload-and-index",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: uploadData.filename,
            user_id: user.id,
          }),
        }
      );

      if (!indexRes.ok) throw new Error();
      const indexData = await indexRes.json();

      if (indexData.analysis) {
        setDocAnalysis(indexData.analysis);
      }
      setStatus("Document ready for questions");
    } catch {
      setStatus("Upload or indexing failed");
    }
  };

  // ================= ASK QUESTION =================
  const askQuestion = async () => {
    if (!question.trim()) return;

    setChat((prev) => [
      ...prev,
      {
        role: "user",
        text: question,
      },
    ]);

    const currentQuestion = question;
    setQuestion("");

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/ask",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: currentQuestion,
            user_id: user.id,
            filename: filename,
          }),
        }
      );

      const data = await res.json();
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: data.answer || "I don't know",
        },
      ]);

      const highlightTerm = data.quote || data.answer;
      if (highlightTerm && highlightTerm !== "I don't know") {
        setSearchWord(highlightTerm);
      }
    } catch {
      setChat((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Error answering question",
        },
      ]);
    }
  };

  // Load a document from the History view
  const handleLoadHistoryFile = async (doc) => {
    setStatus("Loading file...");
    setFilename(doc.filename);
    setDocAnalysis(doc.analysis);
    setChat([]);
    setSearchWord("");
    setActiveTab("dashboard");

    try {
      setStatus("Syncing index...");
      const indexRes = await fetch(
        "http://127.0.0.1:8000/upload-and-index",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filename: doc.filename,
            user_id: user.id,
          }),
        }
      );
      if (indexRes.ok) {
        setStatus("Document ready for questions");
      } else {
        setStatus("Sync completed");
      }
    } catch {
      setStatus("Sync completed");
    }
  };

  // Format Date
  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.appContainer}>
        {/* PERSISTENT SIDEBAR */}
        <div style={styles.sidebar}>
          <div>
            <h2 style={styles.sidebarLogo}>LexAI</h2>
            <div style={styles.sidebarNav}>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeTab === "dashboard" ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveTab("dashboard")}
              >
                🖥️ Dashboard
              </button>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeTab === "history" ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveTab("history")}
              >
                ⏳ Upload History
              </button>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeTab === "analytics" ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveTab("analytics")}
              >
                📈 Analytics
              </button>
              <button
                style={{
                  ...styles.sidebarBtn,
                  ...(activeTab === "profile" ? styles.sidebarBtnActive : {})
                }}
                onClick={() => setActiveTab("profile")}
              >
                👤 User Profile
              </button>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.sidebarLogout}>
            Logout
          </button>
        </div>

        {/* MAIN BODY AREA */}
        <div style={styles.mainContent}>
          {/* HEADER TOPBAR */}
          <div style={styles.topbar}>
            <div>
              <h1 style={styles.topbarTitle}>
                {activeTab === "dashboard" && "Legal Dashboard"}
                {activeTab === "history" && "Document Upload History"}
                {activeTab === "analytics" && "Usage & Compliance Analytics"}
                {activeTab === "profile" && "User Profile"}
              </h1>
              <p style={styles.topbarSubtitle}>
                {activeTab === "dashboard" && "Upload, analyze, and query your legal documents instantly."}
                {activeTab === "history" && "Access previously parsed documents and index files."}
                {activeTab === "analytics" && "Review document types, usage statistics, and activity."}
                {activeTab === "profile" && "Manage your login details and active LexAI configurations."}
              </p>
            </div>
            <div style={styles.topbarUser}>
              <span style={styles.avatar}>👤</span>
              <span style={styles.userName}>{user?.name || "User"}</span>
            </div>
          </div>

          {/* TAB CONTENT: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div style={styles.tabContent}>
              {!filename ? (
                <div style={styles.uploadCardContainer}>
                  <div style={styles.welcomeBanner}>
                    <h2>Welcome back, {user?.name}!</h2>
                    <p>Get started by uploading a legal document or reference ID card.</p>
                  </div>
                  <UploadCard onUpload={handleUpload} status={status} />
                </div>
              ) : (
                <div style={styles.workspaceLayout}>
                  {/* LEFT PANE: PDF VIEWER */}
                  <div style={styles.pdfPane}>
                    <div style={styles.paneHeader}>
                      <h3>📄 Document Viewer</h3>
                      <button
                        style={styles.closeFileBtn}
                        onClick={() => {
                          setFilename("");
                          setDocAnalysis(null);
                          setChat([]);
                          setStatus("");
                        }}
                      >
                        Change File
                      </button>
                    </div>
                    <div style={styles.pdfViewerWrapper}>
                      <PDFViewer
                        pdfUrl={`http://127.0.0.1:8000/uploads/${filename}`}
                        searchText={searchWord}
                      />
                    </div>
                  </div>

                  {/* RIGHT PANE: ANALYSIS & CHAT */}
                  <div style={styles.rightPane}>
                    {/* DOC CLASSIFICATION & RULES CARD */}
                    {docAnalysis && (
                      <div style={styles.analysisCard}>
                        <div style={styles.analysisHeader}>
                          <span style={styles.docTypeBadge}>
                            🔒 {docAnalysis.document_type || "Generic Document"}
                          </span>
                          <span style={styles.docStatusLabel}>Analyzed</span>
                        </div>

                        {/* SUB-TABS SELECTOR */}
                        <div style={styles.subTabContainer}>
                          <button
                            style={{
                              ...styles.subTabBtn,
                              ...(activeSubTab === "precautions" ? styles.subTabActivePrecautions : {})
                            }}
                            onClick={() => setActiveSubTab("precautions")}
                          >
                            ⚠️ Precautions
                          </button>
                          <button
                            style={{
                              ...styles.subTabBtn,
                              ...(activeSubTab === "dos" ? styles.subTabActiveDos : {})
                            }}
                            onClick={() => setActiveSubTab("dos")}
                          >
                            ✅ Dos
                          </button>
                          <button
                            style={{
                              ...styles.subTabBtn,
                              ...(activeSubTab === "donts" ? styles.subTabActiveDonts : {})
                            }}
                            onClick={() => setActiveSubTab("donts")}
                          >
                            ❌ Don'ts
                          </button>
                        </div>

                        {/* SUB-TABS LIST */}
                        <div style={styles.subTabContent}>
                          {activeSubTab === "precautions" && (
                            <ul style={styles.analysisList}>
                              {docAnalysis.precautions?.map((item, idx) => (
                                <li key={idx} style={styles.precautionItem}>⚠️ {item}</li>
                              ))}
                              {(!docAnalysis.precautions || docAnalysis.precautions.length === 0) && (
                                <p style={styles.emptyText}>No critical precautions identified.</p>
                              )}
                            </ul>
                          )}
                          {activeSubTab === "dos" && (
                            <ul style={styles.analysisList}>
                              {docAnalysis.dos?.map((item, idx) => (
                                <li key={idx} style={styles.doItem}>✅ {item}</li>
                              ))}
                              {(!docAnalysis.dos || docAnalysis.dos.length === 0) && (
                                <p style={styles.emptyText}>No specific guidelines listed.</p>
                              )}
                            </ul>
                          )}
                          {activeSubTab === "donts" && (
                            <ul style={styles.analysisList}>
                              {docAnalysis.donts?.map((item, idx) => (
                                <li key={idx} style={styles.dontItem}>❌ {item}</li>
                              ))}
                              {(!docAnalysis.donts || docAnalysis.donts.length === 0) && (
                                <p style={styles.emptyText}>No restrictions identified.</p>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Q&A CHAT */}
                    <div style={styles.chatPane}>
                      <div style={styles.chatHeader}>
                        <h3>💬 AI Legal Consultant</h3>
                      </div>
                      <div style={styles.chatBox}>
                        {chat.map((msg, i) => (
                          <div
                            key={i}
                            style={{
                              ...styles.message,
                              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                              background: msg.role === "user" ? "#ef4444" : "#f1f5f9",
                              color: msg.role === "user" ? "#fff" : "#1e293b",
                            }}
                          >
                            {msg.text}
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>

                      {/* ASK BAR */}
                      <div style={styles.askBar}>
                        <input
                          style={styles.input}
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                          placeholder="Ask AI a question about this document..."
                        />
                        <button style={styles.askBtn} onClick={askQuestion}>
                          Ask
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: HISTORY */}
          {activeTab === "history" && (
            <div style={styles.tabContent}>
              {loadingHistory ? (
                <p style={styles.loadingText}>Fetching history list...</p>
              ) : historyList.length === 0 ? (
                <div style={styles.emptyContainer}>
                  <span style={styles.emptyIcon}>📂</span>
                  <h3>No uploads yet</h3>
                  <p>You haven't uploaded any documents. Go to the Dashboard tab to begin.</p>
                  <button onClick={() => setActiveTab("dashboard")} style={styles.primaryBtn}>
                    Upload Now
                  </button>
                </div>
              ) : (
                <div style={styles.historyCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Filename</th>
                        <th style={styles.th}>Detected Type</th>
                        <th style={styles.th}>Uploaded At</th>
                        <th style={styles.th}>Questions</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((doc) => (
                        <tr key={doc.id} style={styles.tr}>
                          <td style={styles.tdFilename}>📄 {doc.filename}</td>
                          <td style={styles.td}>
                            <span style={styles.tableBadge}>
                              {doc.document_type || "Generic Document"}
                            </span>
                          </td>
                          <td style={styles.tdDate}>{formatDate(doc.uploaded_at)}</td>
                          <td style={styles.tdCount}>{doc.qna_count || 0} asks</td>
                          <td style={styles.td}>
                            <button
                              style={styles.tableBtn}
                              onClick={() => handleLoadHistoryFile(doc)}
                            >
                              Open & Query
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: ANALYTICS */}
          {activeTab === "analytics" && (
            <div style={styles.tabContent}>
              {loadingAnalytics ? (
                <p style={styles.loadingText}>Compiling database insights...</p>
              ) : !analyticsData ? (
                <div style={styles.emptyContainer}>
                  <h3>No analytics available</h3>
                  <p>Data will show here after uploading documents.</p>
                </div>
              ) : (
                <div style={styles.analyticsLayout}>
                  {/* METRIC GRIDS */}
                  <div style={styles.metricsGrid}>
                    <div style={styles.metricCard}>
                      <span style={styles.metricIcon}>📁</span>
                      <div>
                        <div style={styles.metricVal}>{analyticsData.total_documents || 0}</div>
                        <div style={styles.metricLbl}>Documents Indexed</div>
                      </div>
                    </div>
                    <div style={styles.metricCard}>
                      <span style={styles.metricIcon}>💬</span>
                      <div>
                        <div style={styles.metricVal}>{analyticsData.total_questions || 0}</div>
                        <div style={styles.metricLbl}>Questions Asked</div>
                      </div>
                    </div>
                  </div>

                  {/* SECONDARY PANELS */}
                  <div style={styles.chartsGrid}>
                    {/* DOCUMENT TYPES BAR CHART */}
                    <div style={styles.chartCard}>
                      <h3>📊 Document Type Distribution</h3>
                      <div style={styles.distributionContainer}>
                        {Object.entries(analyticsData.type_distribution || {}).map(([type, count]) => {
                          const percentage = Math.round((count / (analyticsData.total_documents || 1)) * 100);
                          return (
                            <div key={type} style={styles.barItem}>
                              <div style={styles.barHeader}>
                                <span>{type}</span>
                                <strong>{count} ({percentage}%)</strong>
                              </div>
                              <div style={styles.progressBarBg}>
                                <div style={{ ...styles.progressBarFill, width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(analyticsData.type_distribution || {}).length === 0 && (
                          <p style={styles.emptyText}>No distribution data available.</p>
                        )}
                      </div>
                    </div>

                    {/* RECENT ACTIVITY LOG */}
                    <div style={styles.chartCard}>
                      <h3>⏳ Recent Upload Timeline</h3>
                      <div style={styles.timelineList}>
                        {analyticsData.recent_activity?.map((activity, index) => (
                          <div key={index} style={styles.timelineItem}>
                            <div style={styles.timelineDot} />
                            <div style={styles.timelineContent}>
                              <strong>{activity.filename}</strong>
                              <span style={styles.timelineMeta}>
                                Classified: {activity.document_type} | {formatDate(activity.uploaded_at)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {(!analyticsData.recent_activity || analyticsData.recent_activity.length === 0) && (
                          <p style={styles.emptyText}>No recent upload logs.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: PROFILE */}
          {activeTab === "profile" && (
            <div style={styles.tabContent}>
              <div style={styles.profileLayout}>
                <div style={styles.profileCard}>
                  <div style={styles.profileHeader}>
                    <div style={styles.profileAvatar}>👤</div>
                    <div>
                      <h2>{user?.name}</h2>
                      <p style={styles.profileEmail}>{user?.email}</p>
                    </div>
                  </div>

                  <hr style={styles.divider} />

                  <div style={styles.profileDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>User Identifier:</span>
                      <span style={styles.detailValue}>{user?.id}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Account Status:</span>
                      <span style={{ ...styles.detailValue, color: "#10b981", fontWeight: "bold" }}>Active</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Database Engine:</span>
                      <span style={styles.detailValue}>MongoDB Compass</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Active Host Port:</span>
                      <span style={styles.detailValue}>FastAPI Localhost (8000)</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Compliance Model:</span>
                      <span style={styles.detailValue}>Groq Cloud Llama-3.3-70b-versatile</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "Inter, system-ui, sans-serif"
  },
  appContainer: {
    display: "flex",
    height: "100vh",
    overflow: "hidden"
  },
  sidebar: {
    width: "260px",
    background: "#0f172a",
    color: "#fff",
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRight: "1px solid #1e293b",
    flexShrink: 0
  },
  sidebarLogo: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#ef4444",
    marginBottom: "40px",
    textAlign: "center"
  },
  sidebarNav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  sidebarBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    textAlign: "left",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s ease"
  },
  sidebarBtnActive: {
    background: "#1e293b",
    color: "#fff",
    fontWeight: "bold",
    borderLeft: "4px solid #ef4444"
  },
  sidebarLogout: {
    background: "#ef4444",
    border: "none",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden"
  },
  topbar: {
    height: "90px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 40px",
    flexShrink: 0
  },
  topbarTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0
  },
  topbarSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    margin: "4px 0 0 0"
  },
  topbarUser: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f1f5f9",
    padding: "8px 16px",
    borderRadius: "20px"
  },
  avatar: {
    fontSize: "16px"
  },
  userName: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#334155"
  },
  tabContent: {
    flex: 1,
    padding: "30px 40px",
    overflowY: "auto",
    height: "100%"
  },
  uploadCardContainer: {
    maxWidth: "800px",
    margin: "0 auto",
    marginTop: "20px"
  },
  welcomeBanner: {
    background: "#e0f2fe",
    borderLeft: "6px solid #0284c7",
    color: "#0369a1",
    padding: "20px",
    borderRadius: "8px",
    marginBottom: "30px"
  },
  workspaceLayout: {
    display: "flex",
    gap: "24px",
    height: "calc(100vh - 160px)",
    alignItems: "stretch"
  },
  pdfPane: {
    flex: 1.3,
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column"
  },
  paneHeader: {
    padding: "16px 20px",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8fafc",
    flexShrink: 0
  },
  closeFileBtn: {
    background: "#1e293b",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer"
  },
  pdfViewerWrapper: {
    flex: 1,
    overflow: "hidden"
  },
  rightPane: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    height: "100%"
  },
  analysisCard: {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    padding: "20px",
    flexShrink: 0,
    maxHeight: "260px",
    display: "flex",
    flexDirection: "column"
  },
  analysisHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px"
  },
  docTypeBadge: {
    background: "#fee2e2",
    color: "#ef4444",
    padding: "6px 14px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold"
  },
  docStatusLabel: {
    fontSize: "12px",
    color: "#10b981",
    fontWeight: "bold",
    textTransform: "uppercase"
  },
  subTabContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "10px",
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: "8px",
    flexShrink: 0
  },
  subTabBtn: {
    flex: 1,
    padding: "6px",
    fontSize: "12px",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  subTabActivePrecautions: {
    background: "#fef3c7",
    color: "#d97706",
    borderColor: "#fde68a",
    fontWeight: "bold"
  },
  subTabActiveDos: {
    background: "#d1fae5",
    color: "#059669",
    borderColor: "#a7f3d0",
    fontWeight: "bold"
  },
  subTabActiveDonts: {
    background: "#fee2e2",
    color: "#dc2626",
    borderColor: "#fecaca",
    fontWeight: "bold"
  },
  subTabContent: {
    flex: 1,
    overflowY: "auto"
  },
  analysisList: {
    margin: 0,
    padding: "0 0 0 10px",
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  precautionItem: {
    fontSize: "13px",
    color: "#b45309",
    listStyleType: "none",
    lineHeight: "1.4"
  },
  doItem: {
    fontSize: "13px",
    color: "#047857",
    listStyleType: "none",
    lineHeight: "1.4"
  },
  dontItem: {
    fontSize: "13px",
    color: "#b91c1c",
    listStyleType: "none",
    lineHeight: "1.4"
  },
  chatPane: {
    flex: 1,
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  chatHeader: {
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "12px",
    marginBottom: "12px",
    flexShrink: 0
  },
  chatBox: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingRight: "6px"
  },
  message: {
    padding: "12px 16px",
    borderRadius: "12px",
    maxWidth: "80%",
    fontSize: "14px",
    lineHeight: "1.4"
  },
  askBar: {
    display: "flex",
    gap: "10px",
    marginTop: "12px",
    flexShrink: 0
  },
  input: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px"
  },
  askBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "0 22px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background 0.2s"
  },
  historyCard: {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    padding: "20px",
    overflow: "hidden"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    textAlign: "left",
    padding: "12px 16px",
    borderBottom: "2px solid #e2e8f0",
    color: "#475569",
    fontSize: "14px",
    fontWeight: "bold"
  },
  tr: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background 0.15s"
  },
  td: {
    padding: "16px",
    fontSize: "14px",
    color: "#334155"
  },
  tdFilename: {
    padding: "16px",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#0f172a"
  },
  tdDate: {
    padding: "16px",
    fontSize: "13px",
    color: "#64748b"
  },
  tdCount: {
    padding: "16px",
    fontSize: "13px",
    color: "#475569",
    fontWeight: "500"
  },
  tableBadge: {
    background: "#e2e8f0",
    color: "#334155",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  tableBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "6px 14px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  loadingText: {
    textAlign: "center",
    padding: "40px",
    color: "#64748b",
    fontSize: "16px"
  },
  emptyContainer: {
    textAlign: "center",
    padding: "60px 40px",
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    maxWidth: "600px",
    margin: "0 auto",
    marginTop: "40px"
  },
  emptyIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px"
  },
  primaryBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "10px 24px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "16px"
  },
  analyticsLayout: {
    display: "flex",
    flexDirection: "column",
    gap: "30px"
  },
  metricsGrid: {
    display: "flex",
    gap: "24px"
  },
  metricCard: {
    flex: 1,
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: "20px"
  },
  metricIcon: {
    fontSize: "36px",
    background: "#fee2e2",
    color: "#ef4444",
    padding: "12px",
    borderRadius: "12px"
  },
  metricVal: {
    fontSize: "28px",
    fontWeight: 700,
    color: "#0f172a"
  },
  metricLbl: {
    fontSize: "13px",
    color: "#64748b",
    marginTop: "2px"
  },
  chartsGrid: {
    display: "flex",
    gap: "24px"
  },
  chartCard: {
    flex: 1,
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    padding: "24px"
  },
  distributionContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "20px"
  },
  barItem: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  barHeader: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "13px",
    color: "#475569"
  },
  progressBarBg: {
    height: "10px",
    background: "#f1f5f9",
    borderRadius: "5px",
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    background: "#ef4444",
    borderRadius: "5px"
  },
  timelineList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    marginTop: "20px"
  },
  timelineItem: {
    display: "flex",
    gap: "14px",
    position: "relative"
  },
  timelineDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#ef4444",
    marginTop: "4px",
    zIndex: 1
  },
  timelineContent: {
    display: "flex",
    flexDirection: "column",
    gap: "2px"
  },
  timelineMeta: {
    fontSize: "12px",
    color: "#64748b"
  },
  profileLayout: {
    maxWidth: "700px",
    margin: "0 auto",
    marginTop: "20px"
  },
  profileCard: {
    background: "#fff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
    padding: "40px"
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "24px"
  },
  profileAvatar: {
    fontSize: "48px",
    background: "#f1f5f9",
    padding: "16px",
    borderRadius: "50%"
  },
  profileEmail: {
    color: "#64748b",
    fontSize: "14px",
    margin: "4px 0 0 0"
  },
  divider: {
    border: "none",
    borderTop: "1px solid #e2e8f0",
    margin: "30px 0"
  },
  profileDetails: {
    display: "flex",
    flexDirection: "column",
    gap: "18px"
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px"
  },
  detailLabel: {
    color: "#64748b",
    fontWeight: "500"
  },
  detailValue: {
    color: "#0f172a",
    fontWeight: "bold"
  },
  emptyText: {
    fontSize: "13px",
    color: "#94a3b8"
  }
};