import { useEffect, useRef } from 'react';
import { CreateRoadmap } from './CreateRoadmap';
import { RoadmapView } from './RoadmapView';

export const RoadmapPage = ({ roadmapData, setRoadmapData, originalParams }) => {
  const viewRef = useRef(null);

  useEffect(() => {
    if (roadmapData && viewRef.current) {
      setTimeout(() => {
        viewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100); // Slight delay to ensure render is complete
    }
  }, [roadmapData]);

  return (
    <div>
      <CreateRoadmap setRoadmapData={setRoadmapData} />
      {roadmapData && (
        <div ref={viewRef} style={{ marginTop: '60px', paddingTop: '20px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '60px' }} />
          <RoadmapView roadmapData={roadmapData} originalParams={originalParams} />
        </div>
      )}
    </div>
  );
};
