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
          className="overflow-hidden rounded-[22px] border border-ink/10 bg-white/75"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.public_url}
            alt={`${image.camera_id} at ${image.location}`}
            className={`${compact ? "h-44" : "h-56"} w-full object-cover`}
          />
          <div className="space-y-2 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{image.camera_id}</h3>
              <span className="rounded-full bg-moss/10 px-3 py-1 text-xs font-medium text-moss">
                {formatTimestamp(image.timestamp)}
              </span>
            </div>
            <p className="text-sm text-ink/70">{image.location}</p>
            {image.note ? <p className="text-sm text-ink/55">{image.note}</p> : null}
          </div>
        </article>
      ))}
    </div>
  );
}
