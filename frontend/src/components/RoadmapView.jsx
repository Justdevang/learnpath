import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Play, ExternalLink, Share2, Save, Copy } from 'lucide-react';
import { D3Graph } from './D3Graph';
import { saveRoadmapToFirebase } from '../firebase/api';

export const RoadmapView = ({ roadmapData, originalParams }) => {
  const navigate = useNavigate();
  const roadmapKey = originalParams?.targetRole ? `roadmaptic_progress_${originalParams.targetRole.replace(/\s+/g, '_')}` : 'roadmaptic_progress_default';
  
  const [completedTopics, setCompletedTopics] = useState(() => {
    try {
      const saved = localStorage.getItem(roadmapKey);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [shareLink, setShareLink] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  
  useEffect(() => {
    if (completedTopics.length > 0) {
      localStorage.setItem(roadmapKey, JSON.stringify(completedTopics));
    }
  }, [completedTopics, roadmapKey]);
  
  if (!roadmapData) return null;

  // Calculate progress
  const totalTopics = roadmapData.reduce((acc, week) => acc + week.topics.length, 0);
  const progressPercent = totalTopics === 0 ? 0 : Math.round((completedTopics.length / totalTopics) * 100);

  const toggleTopic = (topicId) => {
    if (completedTopics.includes(topicId)) {
      setCompletedTopics(completedTopics.filter(id => id !== topicId));
      // Update local storage explicitly on removal to ensure sync
      const updated = completedTopics.filter(id => id !== topicId);
      localStorage.setItem(roadmapKey, JSON.stringify(updated));
    } else {
      setCompletedTopics([...completedTopics, topicId]);
    }
  };

  const handleLearnClick = (topicId) => {
    if (!completedTopics.includes(topicId)) {
      setCompletedTopics(prev => {
        const updated = [...prev, topicId];
        localStorage.setItem(roadmapKey, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      // Ensure we don't save progress, only the template
      const id = await saveRoadmapToFirebase(roadmapData, originalParams || { targetRole: 'Custom Roadmap', currentSkills: '', hoursPerWeek: 10 });
      const link = `${window.location.origin}/shared/${id}`;
      setShareLink(link);
      setShareError('');
    } catch (err) {
      setShareError("Failed to share roadmap. Please check your connection.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ paddingBottom: '60px' }}
    >

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', marginBottom: '4px', fontWeight: '800' }}>Your Learning <span className="text-gradient">Roadmap</span></h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Follow this structured path to achieve your goals.</p>
        </div>
        <div className="action-buttons-wrap" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {shareLink ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', border: '1px solid var(--accent-primary)', borderRadius: 'var(--border-radius)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{shareLink}</span>
              <button onClick={() => navigator.clipboard.writeText(shareLink)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', display: 'flex' }}>
                <Copy size={16} />
              </button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={handleShare} disabled={isSharing} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isSharing ? <span className="spinner" style={{ width: '16px', height: '16px' }} /> : <Share2 size={16} />} 
              Share Publicly
            </button>
          )}
          {shareError && (
            <div style={{ color: '#ef4444', fontSize: '12px', background: 'rgba(239,68,68,0.1)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.2)' }}>
              {shareError}
            </div>
          )}
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={(e) => {
              localStorage.setItem('roadmaptic_active_roadmap', JSON.stringify(roadmapData));
              localStorage.setItem('roadmaptic_active_params', JSON.stringify(originalParams));
              const btn = e.currentTarget;
              const origText = btn.innerHTML;
              btn.innerHTML = '✓ Saved!';
              btn.style.background = 'var(--accent-tertiary)';
              setTimeout(() => { btn.innerHTML = origText; btn.style.background = ''; }, 2000);
            }}
          >
            <Save size={16} /> Save to Browser
          </button>
        </div>
      </div>

      {/* D3 Graph Visualization */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Path Overview</h3>
        
        {/* Mobile-only panning instruction */}
        <div className="mobile-only-instruction" style={{ 
          display: 'none', 
          background: 'rgba(59, 130, 246, 0.08)', 
          padding: '10px 14px', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)',
          fontSize: '13px',
          color: 'var(--accent-primary)',
          marginBottom: '16px',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>💡</span> 
          <span><strong>Tip:</strong> Use two fingers to zoom and drag to pan the roadmap below.</span>
        </div>
        
        <style>{`
          @media (max-width: 768px) {
            .mobile-only-instruction { display: flex !important; }
          }
        `}</style>

        <D3Graph data={roadmapData} />
      </div>

      {/* Progress Bar */}
      <div className="glass" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Overall Progress</span>
          <span className="text-gradient" style={{ fontWeight: '800', fontSize: '1rem' }}>{progressPercent}%</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))' }}
          />
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {roadmapData.map((weekData, weekIndex) => (
          <motion.div 
            key={weekIndex}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: weekIndex * 0.08 }}
            className="glass"
            style={{ padding: '20px', borderLeft: '3px solid var(--accent-primary)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', border: '1px solid var(--border-color)', color: 'var(--accent-secondary)', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Week {weekData.week}
              </div>
              <h3 style={{ fontSize: '18px', margin: 0 }}>{weekData.focus}</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weekData.topics.map((topic, topicIndex) => {
                const topicId = `week-${weekData.week}-topic-${topicIndex}`;
                const isCompleted = completedTopics.includes(topicId);
                
                return (
                  <div 
                    key={topicId}
                    className="topic-card"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--border-radius)',
                      border: isCompleted ? '1px solid var(--accent-tertiary)' : '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div className="topic-card-text" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        onClick={() => toggleTopic(topicId)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      >
                        {isCompleted ? (
                          <CheckCircle size={18} color="var(--accent-tertiary)" />
                        ) : (
                          <Circle size={18} color="var(--text-secondary)" />
                        )}
                      </button>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {topic.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Play size={10} color="var(--accent-primary)" />
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{topic.resourceName}</span>
                        </div>
                      </div>
                    </div>
                    
                    <a 
                      href={topic.resourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-secondary topic-card-action"
                      style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      onClick={() => handleLearnClick(topicId)}
                    >
                      Learn <ExternalLink size={12} />
                    </a>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
