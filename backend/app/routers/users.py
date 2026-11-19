from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserUpdate, UserResponse
from ..auth import require_super_admin, get_password_hash, log_audit

router = APIRouter(prefix="/api/users", tags=["User Management"])

@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        permissions=user_in.permissions,
        password_hash=get_password_hash(user_in.password),
        is_active=True
    )
    db.add(new_user)
    db.flush()

    log_audit(
        db=db,
        user=admin,
        action="CREATE",
        module="USERS",
        record_id=new_user.id,
        new_value={"username": new_user.username, "role": new_user.role},
        remarks=f"Created user {new_user.username}"
    )
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_up: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prev = {"full_name": user.full_name, "role": user.role, "permissions": user.permissions, "is_active": user.is_active}

    if user_up.full_name is not None:
        user.full_name = user_up.full_name
    if user_up.email is not None:
        user.email = user_up.email
    if user_up.role is not None:
        user.role = user_up.role
    if user_up.permissions is not None:
        user.permissions = user_up.permissions
    if user_up.is_active is not None:
        user.is_active = user_up.is_active
    if user_up.password:
        user.password_hash = get_password_hash(user_up.password)

    log_audit(
        db=db,
        user=admin,
        action="UPDATE",
        module="USERS",
        record_id=user.id,
        previous_value=prev,
        new_value={"full_name": user.full_name, "role": user.role, "is_active": user.is_active},
        remarks=f"Updated user {user.username}"
    )
    db.commit()
    db.refresh(user)
    return user
