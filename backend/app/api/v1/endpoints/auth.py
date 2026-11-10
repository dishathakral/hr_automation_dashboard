from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.api.deps import get_db, get_current_user
from app.models.entities import User
from app.schemas import Token, LoginRequest, DemoLoginRequest, UserResponse
from app.core.security import verify_password, create_access_token

router = APIRouter()

@router.post("/token", response_model=Token)
def login_for_access_token(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == login_data.email.strip().lower()).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")
    
    access_token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email
    )

@router.post("/demo-login", response_model=Token)
def demo_role_login(
    req: DemoLoginRequest,
    db: Session = Depends(get_db)
):
    target_role = "HR_ADMIN" if req.role.upper() == "HR_ADMIN" else "HIRING_MANAGER"
    user = db.query(User).filter(User.role == target_role, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail=f"No active demo account found for role {target_role}")
    
    access_token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email
    )

@router.get("/me", response_model=UserResponse)
def read_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user

