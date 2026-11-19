from typing import List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import CompanySetting, MaterialRate, User
from ..auth import require_super_admin, log_audit

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
def get_all_settings(db: Session = Depends(get_db)):
    settings_records = db.query(CompanySetting).all()
    material_rates = db.query(MaterialRate).all()
    return {
        "company_settings": {s.key: s.value for s in settings_records},
        "material_rates": [{
            "id": m.id,
            "material_type": m.material_type,
            "base_rate_per_gram": m.base_rate_per_gram,
            "post_processing_rate_per_gram": m.post_processing_rate_per_gram,
            "default_wastage_pct": m.default_wastage_pct,
            "notes": m.notes
        } for m in material_rates]
    }

@router.post("/company")
def update_company_settings(
    settings_in: Dict[str, str],
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    for k, v in settings_in.items():
        record = db.query(CompanySetting).filter(CompanySetting.key == k).first()
        if record:
            record.value = str(v)
        else:
            db.add(CompanySetting(key=k, value=str(v)))

    log_audit(
        db=db,
        user=admin,
        action="UPDATE",
        module="SETTINGS",
        new_value=settings_in,
        remarks="Updated company settings"
    )
    db.commit()
    return {"message": "Company settings updated successfully"}

@router.put("/material-rates/{rate_id}")
def update_material_rate(
    rate_id: str,
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    rate = db.query(MaterialRate).filter(MaterialRate.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=404, detail="Material rate not found")

    prev = {
        "base": str(rate.base_rate_per_gram),
        "post": str(rate.post_processing_rate_per_gram),
        "wastage": str(rate.default_wastage_pct)
    }

    if "base_rate_per_gram" in data:
        rate.base_rate_per_gram = Decimal(str(data["base_rate_per_gram"]))
    if "post_processing_rate_per_gram" in data:
        rate.post_processing_rate_per_gram = Decimal(str(data["post_processing_rate_per_gram"]))
    if "default_wastage_pct" in data:
        rate.default_wastage_pct = Decimal(str(data["default_wastage_pct"]))
    if "notes" in data:
        rate.notes = data["notes"]

    log_audit(
        db=db,
        user=admin,
        action="UPDATE",
        module="SETTINGS",
        record_id=rate.id,
        previous_value=prev,
        new_value={"base": str(rate.base_rate_per_gram), "post": str(rate.post_processing_rate_per_gram)},
        remarks=f"Updated rates for {rate.material_type}"
    )
    db.commit()
    db.refresh(rate)
    return rate
