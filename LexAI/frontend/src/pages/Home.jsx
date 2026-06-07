import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.page}>
      {/* HEADER NAVIGATION */}
      <header style={styles.header}>
        <div style={styles.logoGroup}>
          <span style={styles.logoIcon}>⚖️</span>
          <span style={styles.logoText}>LexAI</span>
        </div>
        <div style={styles.navLinks}>
          <button style={styles.textBtn} onClick={() => navigate("/login")}>Login</button>
          <button style={styles.primaryBtn} onClick={() => navigate("/signup")}>Sign Up</button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={styles.heroSection}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>🔒 Advanced Document Safety</div>
          <h1 style={styles.heroTitle}>
            Understand Your Legal Documents in Seconds
          </h1>
          <p style={styles.heroSubtitle}>
            LexAI is an AI-powered assistant designed to analyze files, classify document types, generate safety precautions, and highlight exact answers directly on your PDF layout.
          </p>
          <div style={styles.heroActions}>
            <button style={styles.ctaBtn} onClick={() => navigate("/login")}>
              Launch Workspace
            </button>
            <button style={styles.secondaryBtn} onClick={() => navigate("/signup")}>
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section style={styles.featuresSection}>
        <h2 style={styles.sectionTitle}>Key Intelligence Features</h2>
        <div style={styles.featuresGrid}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📄</div>
            <h3 style={styles.featureTitle}>Auto-Highlighting PDF Viewer</h3>
            <p style={styles.featureText}>
              Receive answers to your legal queries, and watch the exact quote highlight itself automatically on the document layout without manual searching.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>⚠️</div>
            <h3 style={styles.featureTitle}>Precaution & Risk Analysis</h3>
            <p style={styles.featureText}>
              Detect sensitive documents (e.g. Aadhaar Cards, PAN Cards, NDAs) on upload. View custom precautions, dos, and don'ts to secure your identity.
            </p>
          </div>

          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>📊</div>
            <h3 style={styles.featureTitle}>Usage & History Analytics</h3>
            <p style={styles.featureText}>
              Keep track of previously uploaded files. Reopen document workspaces instantly from history and view visual statistics of queries.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p>© 2026 LexAI. Secure legal AI analysis framework. All rights reserved.</p>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    fontFamily: "Inter, system-ui, sans-serif",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column"
  },
  header: {
    height: "80px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 60px",
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 10
  },
  logoGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  logoIcon: {
    fontSize: "26px"
  },
  logoText: {
    fontSize: "22px",
    fontWeight: 800,
    background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  navLinks: {
    display: "flex",
    gap: "16px"
  },
  textBtn: {
    background: "transparent",
    border: "none",
    color: "#475569",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    padding: "8px 16px"
  },
  primaryBtn: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "8px 20px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  heroSection: {
    padding: "100px 20px",
    display: "flex",
    justifyContent: "center",
    textAlign: "center"
  },
  heroContent: {
    maxWidth: "800px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  badge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "bold",
    marginBottom: "20px"
  },
  heroTitle: {
    fontSize: "46px",
    fontWeight: 800,
    lineHeight: "1.15",
    color: "#1e3a8a",
    margin: "0 0 20px 0"
  },
  heroSubtitle: {
    fontSize: "18px",
    color: "#475569",
    lineHeight: "1.6",
    margin: "0 0 40px 0",
    maxWidth: "700px"
  },
  heroActions: {
    display: "flex",
    gap: "16px"
  },
  ctaBtn: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "white",
    border: "none",
    padding: "14px 32px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)"
  },
  secondaryBtn: {
    background: "#fff",
    color: "#2563eb",
    border: "1px solid #cbd5e1",
    padding: "14px 32px",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer"
  },
  featuresSection: {
    padding: "80px 60px",
    background: "#fff",
    borderTop: "1px solid #e2e8f0"
  },
  sectionTitle: {
    fontSize: "28px",
    fontWeight: 800,
    textAlign: "center",
    color: "#1e3a8a",
    marginBottom: "50px"
  },
  featuresGrid: {
    display: "flex",
    gap: "30px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  featureCard: {
    flex: 1,
    padding: "30px",
    background: "#f8fafc",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    textAlign: "center"
  },
  featureIcon: {
    fontSize: "36px",
    marginBottom: "20px"
  },
  featureTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: "12px"
  },
  featureText: {
    fontSize: "14px",
    color: "#475569",
    lineHeight: "1.6"
  },
  footer: {
    marginTop: "auto",
    padding: "30px",
    textAlign: "center",
    fontSize: "14px",
    color: "#64748b",
    borderTop: "1px solid #e2e8f0",
    background: "#f8fafc"
  }
};
