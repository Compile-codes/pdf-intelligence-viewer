import { Activity, Clock, Gauge } from "lucide-react";
import { useMemo } from "react";
import { useAnnotationStore } from "../../stores/annotationStore";
import { useViewerStore } from "../../stores/viewerStore";
import type { LoadedPDF } from "../../types/pdf";

export function InsightsPanel({ loaded }: { loaded: LoadedPDF }) {
  const metrics = useViewerStore((s) => s.metrics);
  const extractionProgress = useViewerStore((s) => s.extractionProgress);
  const annotations = useAnnotationStore((s) => s.annotations);

  const averageRender = useMemo(() => {
    if (metrics.length === 0) return 0;
    return Math.round(metrics.reduce((sum, metric) => sum + metric.renderMs, 0) / metrics.length);
  }, [metrics]);

  return (
    <div className="insightsPanel">
      <Metric icon={<Gauge size={18} />} label="Average render" value={averageRender ? `${averageRender}ms` : "Pending"} />
      <Metric icon={<Activity size={18} />} label="Pages rendered" value={`${metrics.length} / ${loaded.pdf.numPages}`} />
      <Metric icon={<Clock size={18} />} label="Search extraction" value={`${extractionProgress}%`} />
      <Metric icon={<Activity size={18} />} label="Annotations" value={String(annotations.length)} />

      <section className="insightCard">
        <h3>Engineering notes</h3>
        <p>
          Pages and thumbnails are lazy-rendered with IntersectionObserver. Search text is extracted from PDF.js and queried inside a Web Worker.
        </p>
      </section>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}
