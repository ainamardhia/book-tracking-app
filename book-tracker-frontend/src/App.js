import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit2, LogOut, X, Sparkles } from 'lucide-react';
import './App.css';

const API_URL = 'https://book-tracking-app-1byo.onrender.com';

function BookTracker() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState('login');
  const [filter, setFilter] = useState('all');
  const [showAddBook, setShowAddBook] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    status: 'want_to_read',
    pages: '',
    current_page: '',
    rating: '',
    notes: ''
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchBooks();
      fetchStats();
    }
  }, [token, filter]);

  const api = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Request failed');
    }

    if (res.status === 204) return null;
    return res.json();
  };

  const handleAuth = async (isSignup) => {
    try {
      setError('');
      setLoading(true);
      const endpoint = isSignup ? '/auth/signup' : '/auth/login';
      const data = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm)
      });

      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setView('dashboard');
      setAuthForm({ email: '', password: '', name: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setBooks([]);
    setStats(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setView('login');
  };

  const fetchBooks = async () => {
    try {
      const filterParam = filter !== 'all' ? `?status=${filter}` : '';
      const data = await api(`/books${filterParam}`);
      setBooks(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api('/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
      setError('');
      const data = await api('/recommendations');
      setRecommendations(data.recommendations || []);
      setShowRecommendations(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const payload = {
        ...bookForm,
        pages: bookForm.pages ? parseInt(bookForm.pages) : null,
        current_page: bookForm.current_page ? parseInt(bookForm.current_page) : 0,
        rating: bookForm.rating ? parseInt(bookForm.rating) : null
      };

      if (editingBook) {
        await api(`/books/${editingBook.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setEditingBook(null);
      } else {
        await api('/books', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      setBookForm({
        title: '',
        author: '',
        status: 'want_to_read',
        pages: '',
        current_page: '',
        rating: '',
        notes: ''
      });
      setShowAddBook(false);
      fetchBooks();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    
    try {
      await api(`/books/${bookId}`, { method: 'DELETE' });
      fetchBooks();
      fetchStats();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditBook = (book) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      status: book.status,
      pages: book.pages || '',
      current_page: book.current_page || '',
      rating: book.rating || '',
      notes: book.notes || ''
    });
    setShowAddBook(true);
  };

  const getStatusClass = (status) => {
    const classes = {
      want_to_read: 'status-want',
      reading: 'status-reading',
      completed: 'status-completed'
    };
    return classes[status] || classes.want_to_read;
  };

  const getStatusLabel = (status) => {
    const labels = {
      want_to_read: 'Want to Read',
      reading: 'Reading',
      completed: 'Completed'
    };
    return labels[status] || status;
  };

  if (view === 'login' || view === 'signup') {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-icon">
            <BookOpen />
          </div>
          <h1 className="auth-title">Book Tracker</h1>
          <p className="auth-subtitle">Track your reading journey</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={(e) => { e.preventDefault(); handleAuth(view === 'signup'); }}>
            {view === 'signup' && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Please wait...' : view === 'signup' ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="auth-switch">
            <button onClick={() => setView(view === 'login' ? 'signup' : 'login')}>
              {view === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <div className="header-icon">
              <BookOpen />
            </div>
            <div>
              <h1 className="header-title">Book Tracker</h1>
              <p className="header-subtitle">Welcome, {user?.name}!</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut />
            Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value stat-indigo">{stats.total_books}</div>
              <div className="stat-label">Total Books</div>
            </div>
            <div className="stat-card">
              <div className="stat-value stat-purple">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value stat-green">{stats.reading}</div>
              <div className="stat-label">Reading</div>
            </div>
            <div className="stat-card">
              <div className="stat-value stat-blue">{stats.want_to_read}</div>
              <div className="stat-label">Want to Read</div>
            </div>
            <div className="stat-card">
              <div className="stat-value stat-orange">{stats.total_pages_read}</div>
              <div className="stat-label">Pages Read</div>
            </div>
            <div className="stat-card">
              <div className="stat-value stat-yellow">{stats.average_rating}</div>
              <div className="stat-label">Avg Rating</div>
            </div>
          </div>
        )}

        <div className="controls">
          <div className="filter-buttons">
            {['all', 'want_to_read', 'reading', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn-filter ${filter === f ? 'active' : ''}`}
              >
                {f === 'all' ? 'All' : getStatusLabel(f)}
              </button>
            ))}
          </div>
          <div className="action-buttons">
            <button
              onClick={fetchRecommendations}
              disabled={loadingRecommendations}
              className="btn-ai"
            >
              <Sparkles className="icon-small" />
              {loadingRecommendations ? 'Loading...' : 'AI Recommendations'}
            </button>
            <button
              onClick={() => {
                setShowAddBook(true);
                setEditingBook(null);
                setBookForm({
                  title: '',
                  author: '',
                  status: 'want_to_read',
                  pages: '',
                  current_page: '',
                  rating: '',
                  notes: ''
                });
              }}
              className="btn-add"
            >
              <Plus className="icon-small" />
              Add Book
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {books.length === 0 ? (
          <div className="empty-state">
            <BookOpen />
            <h3>No books yet</h3>
            <p>Start tracking your reading journey!</p>
            <button onClick={() => setShowAddBook(true)} className="btn-primary" style={{width: 'auto', padding: '0.5rem 1.5rem'}}>
              Add Your First Book
            </button>
          </div>
        ) : (
          <div className="books-grid">
            {books.map((book) => (
              <div key={book.id} className="book-card">
                <div className="book-header">
                  <span className={`book-status ${getStatusClass(book.status)}`}>
                    {getStatusLabel(book.status)}
                  </span>
                  <div className="book-actions">
                    <button onClick={() => startEditBook(book)} className="btn-icon btn-edit">
                      <Edit2 />
                    </button>
                    <button onClick={() => handleDeleteBook(book.id)} className="btn-icon btn-delete">
                      <Trash2 />
                    </button>
                  </div>
                </div>
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">by {book.author}</p>
                {book.pages && (
                  <div className="book-progress">
                    <div className="progress-text">
                      <span>Progress</span>
                      <span>{book.current_page || 0} / {book.pages} pages</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min(((book.current_page || 0) / book.pages) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {book.rating && (
                  <div className="book-rating">
                    {'★'.repeat(book.rating)}{'☆'.repeat(5 - book.rating)}
                  </div>
                )}
                {book.notes && <p className="book-notes">{book.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddBook && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-inner">
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingBook ? 'Edit Book' : 'Add New Book'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddBook(false);
                    setEditingBook(null);
                  }}
                  className="btn-close"
                >
                  <X />
                </button>
              </div>

              <form onSubmit={handleAddBook}>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Author *</label>
                  <input
                    type="text"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    value={bookForm.status}
                    onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="want_to_read">Want to Read</option>
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Total Pages</label>
                    <input
                      type="number"
                      value={bookForm.pages}
                      onChange={(e) => setBookForm({ ...bookForm, pages: e.target.value })}
                      className="form-input"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Page</label>
                    <input
                      type="number"
                      value={bookForm.current_page}
                      onChange={(e) => setBookForm({ ...bookForm, current_page: e.target.value })}
                      className="form-input"
                      min="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Rating (1-5)</label>
                  <input
                    type="number"
                    value={bookForm.rating}
                    onChange={(e) => setBookForm({ ...bookForm, rating: e.target.value })}
                    className="form-input"
                    min="1"
                    max="5"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    value={bookForm.notes}
                    onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                    className="form-textarea"
                    rows="3"
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddBook(false);
                      setEditingBook(null);
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    {editingBook ? 'Update' : 'Add'} Book
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showRecommendations && (
        <div className="modal-overlay">
          <div className="modal-content modal-recommendations">
            <div className="modal-inner">
              <div className="modal-header">
                <h2 className="modal-title">
                  <Sparkles className="icon-inline" /> AI Book Recommendations
                </h2>
                <button
                  onClick={() => setShowRecommendations(false)}
                  className="btn-close"
                >
                  <X />
                </button>
              </div>

              <div className="recommendations-container">
                {recommendations.length === 0 ? (
                  <p className="recommendations-empty">
                    Add some books to get personalized recommendations!
                  </p>
                ) : (
                  <div className="recommendations-list">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="recommendation-card">
                        <div className="recommendation-number">{index + 1}</div>
                        <div className="recommendation-content">
                          <h3 className="recommendation-title">{rec.title}</h3>
                          <p className="recommendation-author">by {rec.author}</p>
                          {rec.reason && (
                            <p className="recommendation-reason">
                              <span className="reason-icon">💡</span>
                              {rec.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  onClick={() => setShowRecommendations(false)}
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0.75rem 2rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookTracker;