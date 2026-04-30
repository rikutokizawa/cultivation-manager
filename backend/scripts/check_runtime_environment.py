import json
from pathlib import Path
from shutil import which

from backend.app.core.config import get_settings


def main() -> None:
    settings = get_settings()
    settings.ensure_directories()

    report = {
        "sensor_source_type": settings.sensor_source_type,
        "camera_source_type": settings.camera_source_type,
        "camera_command": settings.camera_command or which("rpicam-still") or which("libcamera-still"),
        "sensor_command": settings.sensor_command or None,
        "camera_ids": settings.camera_ids,
        "storage": {
            "images": str(settings.resolved_image_storage_path),
            "incoming": str(settings.resolved_incoming_image_path),
            "runtime_json": str(settings.resolved_sensor_input_json_path),
        },
        "checks": {
            "rpicam_still_found": which("rpicam-still") is not None,
            "libcamera_still_found": which("libcamera-still") is not None,
            "onewire_paths_found": [str(path) for path in Path("/").glob(settings.ds18b20_device_glob.lstrip("/"))],
            "incoming_directory_exists": settings.resolved_incoming_image_path.exists(),
            "sensor_json_exists": settings.resolved_sensor_input_json_path.exists(),
        },
    }

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
