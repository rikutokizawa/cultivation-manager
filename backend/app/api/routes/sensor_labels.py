from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.sensor_label import SensorLabel
from backend.app.schemas.sensor_label import SensorLabelCreate, SensorLabelRead, SensorLabelUpdate
from backend.app.services.sensor_labels import label_to_read, thresholds_to_json

router = APIRouter()


@router.get("", response_model=list[SensorLabelRead])
def list_sensor_labels(db: Session = Depends(get_db)) -> list[SensorLabelRead]:
    labels = db.scalars(
        select(SensorLabel).order_by(SensorLabel.display_order.asc(), SensorLabel.name.asc())
    ).all()
    return [label_to_read(label) for label in labels]


@router.post("", response_model=SensorLabelRead, status_code=201)
def create_sensor_label(
    payload: SensorLabelCreate,
    db: Session = Depends(get_db),
) -> SensorLabelRead:
    label = SensorLabel(
        name=payload.name,
        color=payload.color,
        display_order=payload.display_order,
        thresholds_json=thresholds_to_json(payload.thresholds),
    )
    db.add(label)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Label name already exists.") from exc

    db.refresh(label)
    return label_to_read(label)


@router.put("/{label_id}", response_model=SensorLabelRead)
def update_sensor_label(
    label_id: int,
    payload: SensorLabelUpdate,
    db: Session = Depends(get_db),
) -> SensorLabelRead:
    label = db.get(SensorLabel, label_id)
    if label is None:
        raise HTTPException(status_code=404, detail="Label was not found.")

    label.name = payload.name
    label.color = payload.color
    label.display_order = payload.display_order
    label.thresholds_json = thresholds_to_json(payload.thresholds)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Label name already exists.") from exc

    db.refresh(label)
    return label_to_read(label)


@router.delete("/{label_id}", status_code=204)
def delete_sensor_label(
    label_id: int,
    db: Session = Depends(get_db),
) -> None:
    label = db.get(SensorLabel, label_id)
    if label is None:
        raise HTTPException(status_code=404, detail="Label was not found.")

    db.delete(label)
    db.commit()
