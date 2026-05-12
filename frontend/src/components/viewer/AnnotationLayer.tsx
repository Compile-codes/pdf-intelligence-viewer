import { Trash2 } from "lucide-react";
import { useAnnotationStore } from "../../stores/annotationStore";

type Props = {
  documentId: string;
  pageNumber: number;
  scale: number;
};

export function AnnotationLayer({ documentId, pageNumber, scale }: Props) {
  const annotations = useAnnotationStore((s) => s.annotations);
  const remove = useAnnotationStore((s) => s.remove);

  const pageAnnotations = annotations.filter(
    (annotation) => annotation.documentId === documentId && annotation.pageNumber === pageNumber
  );

  return (
    <div className="annotationLayer">
      {pageAnnotations.map((annotation) => (
        <div
          key={annotation.id}
          className="highlightAnnotation"
          title={annotation.text}
          style={{
            left: annotation.x * scale,
            top: annotation.y * scale,
            width: annotation.width * scale,
            height: annotation.height * scale,
            background: annotation.color
          }}
        >
          <button className="deleteAnnotation" onClick={() => remove(annotation.id)} title="Delete annotation">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
