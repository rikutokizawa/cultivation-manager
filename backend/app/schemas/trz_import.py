from datetime import datetime

from pydantic import BaseModel


class TrzFileImportResult(BaseModel):
    filename: str
    parsed_count: int
    inserted_count: int
    skipped_duplicate_count: int
    skipped_invalid_count: int
    devices: list[str]
    started_at: datetime | None
    ended_at: datetime | None


class TrzImportResponse(BaseModel):
    files: list[TrzFileImportResult]
    inserted_count: int
    skipped_duplicate_count: int
    skipped_invalid_count: int
