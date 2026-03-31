import { useState } from 'react'

export default function InvitePopup({ trip, onClose }) {
  const [copied, setCopied] = useState(false)
  const base = window.location.origin + window.location.pathname.replace(/\/$/, '')
  const link = `${base}/#/join/${trip.inviteCode}`

  const copyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:300, padding:16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'#0d1520', border:'1px solid rgba(255,255,255,0.12)',
        borderRadius:16, padding:28, width:'100%', maxWidth:380,
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <span style={{ color:'#fff', fontWeight:700, fontSize:15 }}>✉️ Invite to {trip.name}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#a8c8e8', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>

        <div style={{
          background:'rgba(255,255,255,0.06)', borderRadius:8,
          padding:'9px 12px', fontSize:11, color:'#a8c8e8',
          wordBreak:'break-all', marginBottom:10,
        }}>
          {link}
        </div>

        <button onClick={copyLink} style={{
          width:'100%', background: copied ? '#34A853' : '#4285F4',
          border:'none', borderRadius:9, padding:'10px 0',
          color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
          marginBottom:14, transition:'background 0.2s',
        }}>
          {copied ? '✓ Copied!' : 'Copy Invite Link'}
        </button>

        <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11, textAlign:'center' }}>
          or share code: <strong style={{ color:'#a8c8e8', letterSpacing:2 }}>{trip.inviteCode}</strong>
        </div>
      </div>
    </div>
  )
}
