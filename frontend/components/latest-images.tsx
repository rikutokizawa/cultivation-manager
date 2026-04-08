import type { ImageRecord } from "@/types/api";

type LatestImagesProps = {
  images: ImageRecord[];
  compact?: boolean;
};

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function LatestImages({ images, compact = false }: LatestImagesProps) {
  return (
    <div className={`grid gap-4 ${compact ? "grid-cols-1" : "lg:grid-cols-2"}`}>
      {images.map((image) => (
        <article
          key={image.id}
          className="dashboard-card overflow-hidden rounded-[8px]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.public_url}
            alt={`${image.camera_id} at ${image.location}`}
            className={`${compact ? "h-56" : "h-64"} w-full object-cover`}
          />
          <div className="space-y-2 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">{image.camera_id}</h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-[#9cadbf]">
                {formatTimestamp(image.timestamp)}
              </span>
            </div>
            <p className="text-sm text-[#d7e1eb]">{image.location}</p>
            {image.note ? <p className="text-sm text-[#9cadbf]">{image.note}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
