// src/app/(supervisor)/supervisor/coming-soon/page.tsx
export default function ComingSoonPage() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Çok Yakında</h1>
        <p style={{ fontSize: 16, opacity: 0.8, marginBottom: 20 }}>
          Bu sayfa yakında hizmetinizde olacaktır.
        </p>

        <a
          href="/supervisor"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,.15)",
            textDecoration: "none",
          }}
        >
          Supervisor ana sayfaya dön
        </a>
      </div>
    </main>
  );
}
