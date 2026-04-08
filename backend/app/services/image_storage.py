from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile


async def save_upload_file(
    upload_file: UploadFile,
    destination_directory: Path,
    prefix: str,
) -> Path:
    suffix = Path(upload_file.filename or "").suffix.lower() or ".bin"
    filename = f"{prefix}-{uuid4().hex[:12]}{suffix}"
    destination_path = destination_directory / filename

    with destination_path.open("wb") as file_handle:
        while True:
            chunk = await upload_file.read(1024 * 1024)
            if not chunk:
                break
            file_handle.write(chunk)

    await upload_file.close()
    return destination_path
