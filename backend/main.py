from dotenv import load_dotenv
import os

load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
from supabase import create_client, Client
import google.generativeai as genai # type: ignore

app = FastAPI(title="Book Tracker API with Supabase & AI")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Gemini AI configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-2.5-flash')
else:
    gemini_model = None

security = HTTPBearer()

# Models
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class BookCreate(BaseModel):
    title: str
    author: str
    status: str = "want_to_read"
    pages: Optional[int] = None
    current_page: Optional[int] = 0
    rating: Optional[int] = None
    notes: Optional[str] = None

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None
    pages: Optional[int] = None
    current_page: Optional[int] = None
    rating: Optional[int] = None
    notes: Optional[str] = None

class Book(BaseModel):
    id: str
    user_id: str
    title: str
    author: str
    status: str
    pages: Optional[int]
    current_page: Optional[int]
    rating: Optional[int]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

class User(BaseModel):
    id: str
    email: str
    name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

# Helper functions
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

# Auth endpoints
@app.post("/api/auth/signup", response_model=TokenResponse)
def signup(user_data: UserSignup):
    try:
        print(f"🔵 Attempting signup for: {user_data.email}")
        
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "name": user_data.name
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        if not auth_response.session:
            raise HTTPException(
                status_code=400, 
                detail="Please check your email to confirm your account before logging in"
            )
        
        return TokenResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            user=User(
                id=auth_response.user.id,
                email=auth_response.user.email,
                name=user_data.name
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Signup error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Signup failed: {str(e)}")

@app.post("/api/auth/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    try:
        print(f"🔵 Attempting login for: {credentials.email}")
        
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Email not confirmed. Please check your email.")
        
        user_name = auth_response.user.user_metadata.get("name", credentials.email)
        
        return TokenResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            user=User(
                id=auth_response.user.id,
                email=auth_response.user.email,
                name=user_name
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")

@app.get("/api/auth/me", response_model=User)
def get_me(current_user: dict = Depends(get_current_user)):
    user_name = current_user.user_metadata.get("name", current_user.email)
    return User(
        id=current_user.id,
        email=current_user.email,
        name=user_name
    )

# Book endpoints
@app.post("/api/books", response_model=Book, status_code=status.HTTP_201_CREATED)
def create_book(book_data: BookCreate, current_user: dict = Depends(get_current_user)):
    try:
        book = {
            "user_id": current_user.id,
            "title": book_data.title,
            "author": book_data.author,
            "status": book_data.status,
            "pages": book_data.pages,
            "current_page": book_data.current_page or 0,
            "rating": book_data.rating,
            "notes": book_data.notes
        }
        
        response = supabase.table("books").insert(book).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create book")
        
        return Book(**response.data[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/books", response_model=List[Book])
def get_books(
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    try:
        query = supabase.table("books").select("*").eq("user_id", current_user.id)
        
        if status_filter:
            query = query.eq("status", status_filter)
        
        response = query.order("created_at", desc=True).execute()
        
        return [Book(**book) for book in response.data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/books/{book_id}", response_model=Book)
def get_book(book_id: str, current_user: dict = Depends(get_current_user)):
    try:
        response = supabase.table("books").select("*").eq("id", book_id).eq("user_id", current_user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Book not found")
        
        return Book(**response.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/books/{book_id}", response_model=Book)
def update_book(
    book_id: str,
    book_data: BookUpdate,
    current_user: dict = Depends(get_current_user)
):
    try:
        check = supabase.table("books").select("id").eq("id", book_id).eq("user_id", current_user.id).execute()
        
        if not check.data:
            raise HTTPException(status_code=404, detail="Book not found")
        
        update_data = book_data.dict(exclude_unset=True)
        response = supabase.table("books").update(update_data).eq("id", book_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to update book")
        
        return Book(**response.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: str, current_user: dict = Depends(get_current_user)):
    try:
        check = supabase.table("books").select("id").eq("id", book_id).eq("user_id", current_user.id).execute()
        
        if not check.data:
            raise HTTPException(status_code=404, detail="Book not found")
        
        supabase.table("books").delete().eq("id", book_id).execute()
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Reading Statistics
@app.get("/api/stats")
def get_reading_stats(current_user: dict = Depends(get_current_user)):
    try:
        response = supabase.table("books").select("*").eq("user_id", current_user.id).execute()
        books = response.data
        
        total_books = len(books)
        completed = len([b for b in books if b["status"] == "completed"])
        reading = len([b for b in books if b["status"] == "reading"])
        want_to_read = len([b for b in books if b["status"] == "want_to_read"])
        
        total_pages = sum(b.get("current_page", 0) or 0 for b in books)
        
        rated_books = [b for b in books if b.get("rating")]
        avg_rating = sum(b["rating"] for b in rated_books) / len(rated_books) if rated_books else 0
        
        return {
            "total_books": total_books,
            "completed": completed,
            "reading": reading,
            "want_to_read": want_to_read,
            "total_pages_read": total_pages,
            "average_rating": round(avg_rating, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# AI Book Recommendation Endpoint with Gemini
@app.get("/api/recommendations")
def get_book_recommendations(current_user: dict = Depends(get_current_user)):
    try:
        if not gemini_model:
            raise HTTPException(status_code=503, detail="AI service not configured. Please add GEMINI_API_KEY to .env")
        
        # Get user's books
        response = supabase.table("books").select("*").eq("user_id", current_user.id).execute()
        books = response.data
        
        if not books:
            return {
                "recommendations": [
                    {
                        "title": "Start by adding some books!",
                        "author": "",
                        "reason": "Add books you've read or are reading to get personalized AI recommendations based on your taste."
                    }
                ]
            }
        
        # Prepare book list for AI
        completed_books = [f"{b['title']} by {b['author']}" for b in books if b['status'] == 'completed']
        reading_books = [f"{b['title']} by {b['author']}" for b in books if b['status'] == 'reading']
        want_books = [f"{b['title']} by {b['author']}" for b in books if b['status'] == 'want_to_read']
        
        # Create prompt for Gemini
        prompt = f"""You are an expert book curator. Based on a user's reading history, recommend 5 diverse books they might enjoy.

User's completed books:
{', '.join(completed_books) if completed_books else 'None yet'}

Currently reading:
{', '.join(reading_books) if reading_books else 'None yet'}

Want to read:
{', '.join(want_books) if want_books else 'None yet'}

Provide exactly 5 book recommendations with variety in genres. For each recommendation, use this EXACT format:

Title: [Book Title]
Author: [Author Name]
Reason: [One sentence explaining why they'd enjoy this based on their reading history]
---

Make sure to separate each recommendation with exactly three dashes (---) on a new line."""

        print(f"🤖 Generating Gemini AI recommendations for user: {current_user.email}")
        
        # Call Gemini API
        gemini_response = gemini_model.generate_content(prompt)
        ai_response = gemini_response.text
        
        print(f"✅ Gemini AI Response received")
        
        # Parse the response into structured format
        recommendations = []
        entries = ai_response.split('---')
        
        for entry in entries:
            if 'Title:' in entry and 'Author:' in entry:
                lines = entry.strip().split('\n')
                title = ""
                author = ""
                reason = ""
                
                for line in lines:
                    line = line.strip()
                    if line.startswith('Title:'):
                        title = line.replace('Title:', '').strip()
                    elif line.startswith('Author:'):
                        author = line.replace('Author:', '').strip()
                    elif line.startswith('Reason:'):
                        reason = line.replace('Reason:', '').strip()
                
                if title and author:
                    recommendations.append({
                        "title": title,
                        "author": author,
                        "reason": reason
                    })
        
        # Ensure we have at least some recommendations
        if not recommendations:
            recommendations = [{
                "title": "Unable to parse recommendations",
                "author": "",
                "reason": "Please try again or add more books to improve recommendations."
            }]
        
        return {
            "recommendations": recommendations[:5],  # Limit to 5
            "based_on": {
                "completed_books": len(completed_books),
                "reading_books": len(reading_books),
                "want_to_read_books": len(want_books)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")

@app.get("/")
def root():
    return {
        "message": "Book Tracker API with Supabase & Gemini AI", 
        "version": "2.0.0",
        "ai_enabled": gemini_model is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)