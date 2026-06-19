import { useState, useEffect } from 'react';
import type { ExtensionMessage } from './core/types';

// ── Popup Styles ────────────────────────────────────────────
const styles = {
  container: {
    width: 280,
    padding: '24px 20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
    color: '#e2e8f0',
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    fontSize: 28,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '1.5px',
    marginTop: -8,
  },
  statusDot: (active: boolean) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: active ? '#4ade80' : '#64748b',
    boxShadow: active ? '0 0 8px #4ade80' : 'none',
    display: 'inline-block',
  }),
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#cbd5e1',
  },
  button: (active: boolean) => ({
    width: '100%',
    padding: '12px 20px',
    borderRadius: 12,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: active
      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
      : 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff',
    boxShadow: active
      ? '0 4px 14px rgba(239, 68, 68, 0.4)'
      : '0 4px 14px rgba(59, 130, 246, 0.4)',
    letterSpacing: '0.3px',
  }),
  meetingInfo: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center' as const,
    padding: '8px 0',
    borderTop: '1px solid rgba(148, 163, 184, 0.1)',
    width: '100%',
  },
};

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Query current state on mount
  useEffect(() => {
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_STATE_QUERY' } as ExtensionMessage,
      (response) => {
        if (response) {
          setIsEnabled(response.captureEnabled || false);
          setMeetingId(response.meetingId || null);
        }
        setIsLoading(false);
      }
    );
  }, []);

  const handleToggle = async () => {
    const newState = !isEnabled;

    if (newState) {
      try {
        console.log('[Popup] Checking microphone permission status...');
        const permission = await navigator.permissions.query({ name: 'microphone' as any });
        
        if (permission.state !== 'granted') {
          console.log('[Popup] Microphone permission not granted, opening options page...');
          chrome.runtime.openOptionsPage();
          return;
        }
      } catch (err) {
        console.warn('[Popup] Permissions query failed, calling options page fallback:', err);
        chrome.runtime.openOptionsPage();
        return;
      }
    }

    setIsEnabled(newState);

    chrome.runtime.sendMessage(
      {
        type: newState ? 'ENABLE_CAPTURE' : 'DISABLE_CAPTURE',
      } as ExtensionMessage,
      (response) => {
        if (!response?.success) {
          setIsEnabled(!newState); // Revert on failure
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.logo}>MeetScraper</div>
        <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.logo}>MeetScraper</div>
      <div style={styles.subtitle}>Meeting Intelligence</div>

      <div style={styles.statusRow}>
        <span style={styles.statusDot(isEnabled)} />
        <span>{isEnabled ? 'Capturing' : 'Inactive'}</span>
      </div>

      <button style={styles.button(isEnabled)} onClick={handleToggle}>
        {isEnabled ? '⏹ Disable Capture' : '▶ Enable Capture'}
      </button>

      {meetingId && (
        <div style={styles.meetingInfo}>
          Active Meeting: {meetingId}
        </div>
      )}

      <div style={{ fontSize: 10, color: '#475569', textAlign: 'center' }}>
        Auto-captures meeting data when enabled.
        <br />
        Works on Google Meet & Zoho Meeting.
      </div>
    </div>
  );
}

export default IndexPopup;
