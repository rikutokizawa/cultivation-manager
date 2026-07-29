import { formatJapanDateTime } from "@/lib/datetime";
import type { ImageRecord } from "@/types/api";

type LatestImagesProps = {
  images: ImageRecord[];
};

export function LatestImages({ images }: LatestImagesProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1].map((index) => {
        const image = images[index];
        return (
          <article
            key={image?.id ?? `camera-${index + 1}`}
            className="dashboard-card overflow-hidden rounded-[8px]"
          >
            {image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.public_url}
                  alt={`${image.camera_id}の最新画像`}
                  className="h-64 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <h3 className="font-semibold text-white">{image.camera_id}</h3>
                  <span className="text-xs text-[#9cadbf]">
                    {formatJapanDateTime(image.timestamp, { seconds: true })}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex h-[308px] items-center justify-center text-sm text-[#9cadbf]">
                カメラ{index + 1}の画像はまだありません
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
