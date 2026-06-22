import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { seekerAPI } from '../../lib/api';
import { Bell, CheckCheck, BriefcaseBusiness, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header, Footer } from '../../components/user/site-chrome';

const TYPE_ICONS = {
  application_received: { icon: BriefcaseBusiness, color: '#2563eb', bg: '#eff6ff' },
  status_updated:       { icon: CheckCheck, color: '#22c55e', bg: '#f0fdf4' },
  new_match:            { icon: Sparkles,   color: '#8b5cf6', bg: '#f5f3ff' },
  general:              { icon: Bell,        color: '#f59e0b', bg: '#fffbeb' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const data = await seekerAPI.getNotifications();
      setNotifs(data.notifications || []);
      setUnread(data.unread_count || 0);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await seekerAPI.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
      toast.success('All notifications marked as read');
    } catch { }
  };

  const markOne = async (id) => {
    try {
      await seekerAPI.markRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch { }
  };

  return (
    <div className="min-h-screen bg-background text-[#2A2A2A] font-sans flex flex-col">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 py-8 flex justify-center">
        <div style={styles.page}>
          <div style={styles.header}>
            <div>
              <h1 style={styles.title}>Notifications</h1>
              <p style={styles.subtitle}>{unread > 0 ? `${unread} unread` : 'All caught up!'}</p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={styles.markAllBtn}>
                <CheckCheck size={15} /> Mark all as read
              </button>
            )}
          </div>

      {loading ? (
        <div style={styles.empty}><p style={{ color: '#9ca3af' }}>Loading…</p></div>
      ) : notifs.length === 0 ? (
        <div style={styles.empty}>
          <Bell size={40} color="#d1d5db" />
          <p style={{ color: '#9ca3af' }}>No notifications yet</p>
        </div>
      ) : (
        <div style={styles.list}>
          {notifs.map(n => {
            const cfg = TYPE_ICONS[n.type] || TYPE_ICONS.general;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                style={{ ...styles.card, ...(n.is_read ? {} : styles.cardUnread) }}
                onClick={async () => {
                  if (!n.is_read) await markOne(n.id);
                  if (n.link) navigate(n.link);
                }}
              >
                <div style={{ ...styles.iconBox, background: cfg.bg }}>
                  <Icon size={18} color={cfg.color} />
                </div>
                <div style={styles.content}>
                  <div style={styles.notifTitle}>{n.title}</div>
                  <div style={styles.notifMsg}>{n.message}</div>
                  <div style={styles.notifTime}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && <div style={styles.unreadDot} />}
              </div>
            );
          })}
        </div>
      )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const styles = {
  page: { maxWidth: '720px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 4px' },
  subtitle: { fontSize: '14px', color: '#6b7280', margin: 0 },
  markAllBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
    background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '9px',
    cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151',
  },
  empty: { textAlign: 'center', padding: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
    padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px',
    cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
  },
  cardUnread: { background: '#f8faff', borderColor: '#bfdbfe' },
  iconBox: { width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content: { flex: 1 },
  notifTitle: { fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '3px' },
  notifMsg: { fontSize: '13px', color: '#6b7280', lineHeight: 1.5, marginBottom: '5px' },
  notifTime: { fontSize: '11px', color: '#9ca3af' },
  unreadDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', flexShrink: 0, marginTop: '4px' },
};
