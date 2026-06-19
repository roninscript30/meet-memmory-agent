import { useState, useEffect } from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: 'linear-gradient(135deg, #09090e 0%, #111126 50%, #09090e 100%)',
    color: '#f8fafc',
    padding: '20px',
  },
  card: {
    background: 'rgba(30, 30, 60, 0.4)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  logo: {
    fontSize: '36px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    marginBottom: '32px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#cbd5e1',
  },
  description: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6',
    marginBottom: '32px',
  },
  button: (status: 'idle' | 'loading' | 'granted' | 'denied') => ({
    width: '100%',
    padding: '16px 24px',
    borderRadius: '16px',
    border: 'none',
    fontSize: '15px',
    fontWeight: 700,
    cursor: status === 'granted' || status === 'loading' ? 'default' : 'pointer',
    transition: 'all 0.3s ease',
    background: status === 'granted'
      ? 'linear-gradient(135deg, #10b981, #059669)'
      : status === 'denied'
      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
      : 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    boxShadow: status === 'granted'
      ? '0 8px 20px rgba(16, 185, 129, 0.3)'
      : status === 'denied'
      ? '0 8px 20px rgba(239, 68, 68, 0.3)'
      : '0 8px 20px rgba(99, 102, 241, 0.3)',
  }),
  statusText: (status: 'idle' | 'loading' | 'granted' | 'denied') => ({
    marginTop: '16px',
    fontSize: '13px',
    fontWeight: 500,
    color: status === 'granted'
      ? '#34d399'
      : status === 'denied'
      ? '#f87171'
      : '#94a3b8',
  }),
};

function OptionsIndex() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  // Check initial permission status
  useEffect(() => {
    navigator.permissions.query({ name: 'microphone' as any })
      .then((permission) => {
        if (permission.state === 'granted') {
          setStatus('granted');
          setStatusMsg('Microphone access is already granted.');
        }
      })
      .catch((err) => {
        console.warn('Permissions query failed:', err);
      });
  }, []);

  const requestPermission = async () => {
    setStatus('loading');
    setStatusMsg('Awaiting your approval...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately
      stream.getTracks().forEach((track) => track.stop());

      setStatus('granted');
      setStatusMsg('Microphone access granted successfully!');

      // Close the tab after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setStatus('denied');
      setStatusMsg(err.message || 'Microphone access was denied.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>MeetScraper</div>
        <div style={styles.subtitle}>Microphone Authorization</div>

        <h1 style={styles.title}>Enable Microphone Access</h1>
        <p style={styles.description}>
          MeetScraper requires microphone access so that it can record your voice during meetings and combine it with the tab audio. This is necessary to generate complete meeting transcriptions.
        </p>

        <button
          style={styles.button(status)}
          onClick={status === 'idle' || status === 'denied' ? requestPermission : undefined}
          disabled={status === 'loading' || status === 'granted'}
        >
          {status === 'granted'
            ? '✓ Microphone Allowed'
            : status === 'loading'
            ? 'Requesting...'
            : status === 'denied'
            ? '⚠ Permission Denied (Retry)'
            : 'Allow Microphone Access'}
        </button>

        {statusMsg && <div style={styles.statusText(status)}>{statusMsg}</div>}
      </div>
    </div>
  );
}

export default OptionsIndex;
