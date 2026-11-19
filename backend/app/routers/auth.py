from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import Token, LoginRequest, UserResponse
from ..auth import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, log_audit, ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == login_req.username).first()
    if not user or not verify_password(login_req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact administrator."
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "id": user.id},
        expires_delta=access_token_expires
    )

    log_audit(
        db=db,
        user=user,
        action="LOGIN",
        module="AUTH",
        record_id=user.id,
        remarks=f"User {user.username} logged in successfully"
    )
    db.commit()

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "permissions": user.permissions or {}
        }
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Both old and new passwords are required")

    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = get_password_hash(new_password)
    log_audit(
        db=db,
        user=current_user,
        action="UPDATE",
        module="AUTH",
        record_id=current_user.id,
        remarks="Password changed"
    )
    db.commit()
    return {"message": "Password changed successfully"}
