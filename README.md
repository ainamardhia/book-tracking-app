# 📚 Book Tracker - AI-Powered Reading Journal

A full-stack SaaS application that helps you track your reading journey with AI-powered book recommendations!

![Book Tracker](https://img.shields.io/badge/React-18.x-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange) ![Gemini AI](https://img.shields.io/badge/Gemini-AI-purple)

## ✨ Features

### Core Features

- 🔐 **User Authentication** - Secure signup/login with Supabase Auth
- 📖 **Book Management** - Add, edit, delete, and organize your books
- 📊 **Reading Statistics** - Track your reading progress with beautiful stats dashboard
- 🏷️ **Status Tracking** - Organize books by "Want to Read", "Reading", and "Completed"
- ⭐ **Book Ratings** - Rate books from 1-5 stars
- 📝 **Personal Notes** - Add notes and thoughts about each book
- 📈 **Progress Tracking** - Track pages read with visual progress bars

### 🤖 AI-Powered Recommendations (Bonus Feature!)

- Get personalized book recommendations based on your reading history
- Powered by **Google Gemini AI** (completely FREE!)
- Smart suggestions with reasons why you'd enjoy each book
- Analyzes your completed books, current reads, and wishlist

## 🛠️ Tech Stack

### Frontend

- **React** - Modern UI library
- **Lucide React** - Beautiful icons
- **CSS3** - Custom styling with gradients and animations

### Backend

- **FastAPI** - High-performance Python web framework
- **Supabase** - PostgreSQL database + authentication
- **Google Gemini AI** - AI-powered recommendations
- **JWT** - Secure token-based authentication
- **Pydantic** - Data validation

### Database

- **PostgreSQL** (via Supabase)
- Row Level Security (RLS) for data protection
- Automatic timestamps and triggers

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Supabase account (free)
- Google AI Studio account (free)

### 1. Clone the Repository

```bash
git clone https://github.com/ainamardhia/book-tracking-app.git
cd book-tracking-app
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
cd backend
python -m venv ienv

# Windows
ienv\Scripts\activate

# Mac/Linux
source ienv/bin/activate
```

#### Install Dependencies

```bash
pip install fastapi uvicorn supabase python-dotenv google-generativeai pydantic[email]
```

#### Create `.env` File

Create a `.env` file in the `backend` folder:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

#### Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon/public** key

#### Get Gemini API Key (FREE!)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **"Create API Key"**
3. Copy the API key

#### Setup Database

1. In Supabase Dashboard, go to **SQL Editor**
2. Run the SQL schema (see `schema.sql` below)

#### Start Backend Server

```bash
python main.py
```

Backend will run on `http://localhost:8000`

### 3. Frontend Setup

#### Install Dependencies

```bash
cd ../frontend
npm install
npm install lucide-react
```

#### Start Development Server

```bash
npm start
```

Frontend will run on `http://localhost:3000`

### 4. Create Database Schema

In Supabase SQL Editor, run:

```sql
-- Create books table
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('want_to_read', 'reading', 'completed')),
  pages INTEGER,
  current_page INTEGER DEFAULT 0,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view their own books"
  ON books FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own books"
  ON books FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books"
  ON books FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books"
  ON books FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX books_user_id_idx ON books(user_id);
CREATE INDEX books_status_idx ON books(status);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 📁 Project Structure

```
book-tracking-app/
├── README.md                    ← Copy from artifact
├── .gitignore                   ← Copy from artifact
│
├── backend/
│   ├── main.py                  ← Your FastAPI code
│   ├── requirements.txt         ← Copy from artifact
│   ├── .env                     ← Your credentials (already created)
│   └── ienv/
│
└── frontend/
    ├── src/
    │   ├── App.js               ← Your React code
    │   ├── App.css              ← Your CSS
    │   └── index.js
    ├── package.json
    └── README.md (optional - React's default)
```

## 📖 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Books

- `POST /api/books` - Create a book
- `GET /api/books` - Get all books (with optional status filter)
- `GET /api/books/{book_id}` - Get single book
- `PUT /api/books/{book_id}` - Update book
- `DELETE /api/books/{book_id}` - Delete book

### Statistics & AI

- `GET /api/stats` - Get reading statistics
- `GET /api/recommendations` - Get AI book recommendations

## 🎨 Screenshots
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/55603e3b-7951-4424-aa17-ff226e98851c" />
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/cca3e492-5659-4640-839b-60c0843005ef" />
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/5c13fa4d-c824-4f14-8c59-71622481d959" />


### Login Page

Beautiful gradient authentication page with form validation.

### Dashboard

- Statistics cards showing total books, completed, reading, want to read, pages read, and average rating
- Filter buttons to view books by status
- AI Recommendations button with purple gradient
- Add Book button

### Book Cards

- Book title and author
- Status badge (color-coded)
- Progress bar (for books with page tracking)
- Star ratings
- Personal notes
- Edit and delete actions

### AI Recommendations Modal

- Personalized book suggestions
- Numbered recommendations (1-5)
- Reasons why you'd enjoy each book
- Beautiful card design with hover effects

## 🔒 Security Features

- ✅ JWT token-based authentication
- ✅ Row Level Security (RLS) in database
- ✅ Password hashing with bcrypt (handled by Supabase)
- ✅ Environment variables for sensitive data
- ✅ CORS configuration
- ✅ User data isolation (can only see own books)

## 🚀 Deployment

### Backend (Railway/Render/Heroku)

1. Push code to GitHub
2. Connect to deployment platform
3. Add environment variables
4. Deploy!

### Frontend (Vercel/Netlify)

1. Push code to GitHub
2. Connect to Vercel/Netlify
3. Update `API_URL` in `App.js` to production backend URL
4. Deploy!

### Database

Already hosted on Supabase - no additional deployment needed!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Amazing Python web framework
- [React](https://react.dev/) - UI library
- [Supabase](https://supabase.com/) - Backend as a Service
- [Google Gemini AI](https://ai.google.dev/) - AI recommendations
- [Lucide Icons](https://lucide.dev/) - Beautiful icons

## 📧 Contact

Aina Abdul Hadi - ainaabdulhadi@gmail.com

Project Link: [https://github.com/ainamardhia/book-tracking-app](https://github.com/ainamardhia/book-tracking-app)

---

Made with ❤️ and lots of ☕

⭐ Star this repo if you found it helpful!
