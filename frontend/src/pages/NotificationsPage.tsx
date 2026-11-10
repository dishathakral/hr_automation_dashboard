import React from 'react';
import { Bell, Mail, MessageSquare, CheckCircle2, Clock } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsPageProps {
  notifications: Notification[];
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ notifications }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Notification Dispatch Center</h2>
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">Email & SMS</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Simulated delivery logs for candidate interview invitations, appointment acknowledgments, and reminders.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notifications.map((notif) => (
          <div key={notif.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {notif.channel === 'EMAIL' ? (
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{notif.notification_type.replace(/_/g, ' ')}</h4>
                  <p className="text-[11px] text-slate-500">To: <span className="font-mono text-slate-700">{notif.recipient_target}</span></p>
                </div>
              </div>

              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{notif.delivery_status}</span>
              </span>
            </div>

            {notif.subject && (
              <p className="text-xs font-semibold text-slate-800">Subject: {notif.subject}</p>
            )}

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
              {notif.body_text}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(notif.sent_at).toLocaleString()}</span>
              </span>
              <span className="font-semibold text-slate-500">Channel: {notif.channel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

