import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from backend.app.core.config import Settings
from backend.app.services.runtime_models import CapturedImage

CAMERA_LOCATIONS = {
    "camera-01": "growth-chamber-a",
    "camera-02": "growth-chamber-b",
}


class CameraSource(Protocol):
    def capture(self) -> list[CapturedImage]:
        ...


class DummyCameraSource:
    def __init__(self, settings: Settings):
        self.settings = settings

    def capture(self) -> list[CapturedImage]:
        now = datetime.now(UTC)
        captures: list[CapturedImage] = []

        color_pairs = [
            ("#d1fae5", "#065f46"),
            ("#dbeafe", "#1e3a8a"),
        ]

        for index, camera_id in enumerate(self.settings.camera_ids):
            background, foreground = color_pairs[index % len(color_pairs)]
            filename = f"{camera_id}-{now.strftime('%Y%m%d%H%M%S')}.svg"
            destination = self.settings.resolved_image_storage_path / filename
            self._write_placeholder_svg(
                destination=destination,
                title=camera_id,
                background=background,
                foreground=foreground,
                captured_at=now,
            )
            captures.append(
                CapturedImage(
                    timestamp=now,
                    camera_id=camera_id,
                    location=CAMERA_LOCATIONS.get(camera_id, camera_id),
                    file_path=str(Path("storage/images") / filename),
                    note="Dummy runtime image capture",
                )
            )

        return captures

    def _write_placeholder_svg(
        self,
        destination: Path,
        title: str,
        background: str,
        foreground: str,
        captured_at: datetime,
    ) -> None:
        destination.write_text(
            "\n".join(
                [
                    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">',
                    f'<rect width="1280" height="720" fill="{background}" />',
                    '<rect x="0" y="0" width="1280" height="720" fill="#111827" opacity="0.12" />',
                    '<circle cx="220" cy="160" r="72" fill="#fde68a" opacity="0.92" />',
                    '<rect x="120" y="410" width="1040" height="180" rx="28" fill="#111827" opacity="0.2" />',
                    '<rect x="150" y="360" width="180" height="180" rx="24" fill="#16a34a" opacity="0.78" />',
                    '<rect x="385" y="310" width="180" height="230" rx="24" fill="#22c55e" opacity="0.78" />',
                    '<rect x="620" y="390" width="180" height="150" rx="24" fill="#15803d" opacity="0.78" />',
                    '<rect x="855" y="330" width="180" height="210" rx="24" fill="#4ade80" opacity="0.78" />',
                    f'<text x="70" y="88" font-size="42" font-family="Arial, sans-serif" fill="{foreground}">{title}</text>',
                    f'<text x="70" y="128" font-size="22" font-family="Arial, sans-serif" fill="{foreground}">Local runtime dummy camera feed</text>',
                    f'<text x="70" y="664" font-size="20" font-family="Arial, sans-serif" fill="{foreground}">{captured_at.isoformat()}</text>',
                    "</svg>",
                ]
            ),
            encoding="utf-8",
        )


class DirectoryCameraSource:
    def __init__(self, settings: Settings):
        self.settings = settings

    def capture(self) -> list[CapturedImage]:
        now = datetime.now(UTC)
        captures: list[CapturedImage] = []

        for camera_id in self.settings.camera_ids:
            source_path = self._resolve_source_image(camera_id)
            if source_path is None:
                continue

            target_name = f"{camera_id}-{now.strftime('%Y%m%d%H%M%S')}{source_path.suffix.lower()}"
            target_path = self.settings.resolved_image_storage_path / target_name
            shutil.copy2(source_path, target_path)

            captures.append(
                CapturedImage(
                    timestamp=now,
                    camera_id=camera_id,
                    location=CAMERA_LOCATIONS.get(camera_id, camera_id),
                    file_path=str(Path("storage/images") / target_name),
                    note=f"Ingested from {source_path.relative_to(self.settings.project_root) if source_path.is_relative_to(self.settings.project_root) else source_path}",
                )
            )

        return captures

    def _resolve_source_image(self, camera_id: str) -> Path | None:
        camera_directory = self.settings.resolved_incoming_image_path / camera_id
        candidates: list[Path] = []

        if camera_directory.exists():
            candidates.extend([path for path in camera_directory.iterdir() if path.is_file()])

        candidates.extend(
            [
                path
                for path in self.settings.resolved_incoming_image_path.glob(f"{camera_id}*")
                if path.is_file()
            ]
        )

        if not candidates:
            return None

        return max(candidates, key=lambda path: path.stat().st_mtime)


def build_camera_source(settings: Settings, source_type: str | None = None) -> CameraSource:
    selected_source = (source_type or settings.camera_source_type).lower()

    if selected_source == "dummy":
        return DummyCameraSource(settings)
    if selected_source == "directory":
        return DirectoryCameraSource(settings)

    raise ValueError(f"Unsupported camera source type: {selected_source}")

