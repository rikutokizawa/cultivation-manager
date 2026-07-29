from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.trz_import import TrzFileImportResult, TrzImportResponse
from backend.app.services.ondotori_trz_importer import import_ondotori_trz_file

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024
READ_CHUNK_SIZE = 1024 * 1024


@router.post("", response_model=TrzImportResponse)
async def import_trz_files(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
) -> TrzImportResponse:
    if not files:
        raise HTTPException(status_code=400, detail="Select at least one TRZ file.")

    imported_files: list[TrzFileImportResult] = []
    for upload in files:
        filename = Path(upload.filename or "").name
        if Path(filename).suffix.lower() != ".trz":
            raise HTTPException(status_code=400, detail=f"{filename or 'Unnamed file'} is not a .trz file.")

        temporary_path: Path | None = None
        try:
            with NamedTemporaryFile(suffix=".trz", delete=False) as temporary_file:
                temporary_path = Path(temporary_file.name)
                total_size = 0
                while chunk := await upload.read(READ_CHUNK_SIZE):
                    total_size += len(chunk)
                    if total_size > MAX_FILE_SIZE:
                        raise HTTPException(status_code=413, detail=f"{filename} exceeds the 50 MB limit.")
                    temporary_file.write(chunk)

            result = import_ondotori_trz_file(
                db,
                temporary_path,
                delete_after_success=False,
            )
        except HTTPException:
            raise
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"{filename}: {exc}") from exc
        finally:
            await upload.close()
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)

        imported_files.append(
            TrzFileImportResult(
                filename=filename,
                parsed_count=result.parsed_count,
                inserted_count=result.inserted_count,
                skipped_duplicate_count=result.skipped_duplicate_count,
                skipped_invalid_count=result.skipped_invalid_count,
                devices=list(result.devices),
                started_at=result.started_at,
                ended_at=result.ended_at,
            )
        )

    return TrzImportResponse(
        files=imported_files,
        inserted_count=sum(item.inserted_count for item in imported_files),
        skipped_duplicate_count=sum(item.skipped_duplicate_count for item in imported_files),
        skipped_invalid_count=sum(item.skipped_invalid_count for item in imported_files),
    )
