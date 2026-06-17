import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
const API_URL = rawApiUrl === '/api'
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/$/, '')}${rawApiUrl.replace(/\/$/, '').endsWith('/api') ? '' : '/api'}`;
const emptyPost = {
  title: '',
  excerpt: '',
  content: '',
  coverImage: '',
  tags: '',
  status: 'published'
};

function storedSession() {
  try {
    return JSON.parse(localStorage.getItem('blogSession')) || { token: '', user: null };
  } catch {
    return { token: '', user: null };
  }
}

async function request(path, options = {}, token = '') {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error('Backend API is not reachable. Check Vercel VITE_API_URL and Render CLIENT_ORIGIN settings.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const details = Array.isArray(data.errors)
      ? data.errors.map((error) => `${error.field}: ${error.message}`).join(' ')
      : '';
    throw new Error(details || data.message || 'Request failed');
  }

  return data;
}

function App() {
  const [{ token, user }, setSession] = useState(storedSession);
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [page, setPage] = useState(1);
  const [showMine, setShowMine] = useState(false);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [postForm, setPostForm] = useState(emptyPost);
  const [editingId, setEditingId] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isAuthor = selected && user && selected.author?._id === user.id;

  const stats = useMemo(() => {
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    const drafts = posts.filter((post) => post.status === 'draft').length;
    return { totalLikes, drafts };
  }, [posts]);

  useEffect(() => {
    localStorage.setItem('blogSession', JSON.stringify({ token, user }));
  }, [token, user]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [page, activeTag, showMine, token]);

  async function loadPosts(nextPage = page) {
    setLoading(true);
    setNotice('');

    try {
      const params = new URLSearchParams({
        page: nextPage,
        limit: 6,
        search: query,
        tag: activeTag,
        ...(showMine ? { mine: 'true' } : {})
      });
      const data = await request(`/posts?${params}`, {}, token);
      setPosts(data.posts);
      setTags(data.tags);
      setPagination(data.pagination);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setLoading(true);
    setNotice('');
    const payload = authMode === 'register' ? authForm : { email: authForm.email, password: authForm.password };

    try {
      const data = await request(`/auth/${authMode}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setSession({ token: data.token, user: data.user });
      setSelected(null);
      setShowMine(false);
      setPage(1);
      setNotice(`Welcome, ${data.user.name}.`);
      setAuthForm({ name: '', email: '', password: '' });
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setSession({ token: '', user: null });
    setSelected(null);
    setShowMine(false);
    setNotice('Signed out.');
  }

  async function openPost(slug) {
    try {
      const data = await request(`/posts/${slug}`, {}, token);
      setSelected(data.post);
      setComments(data.comments);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setNotice(error.message);
    }
  }

  function editPost(post) {
    setEditingId(post._id);
    setPostForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.coverImage || '',
      tags: post.tags?.join(', ') || '',
      status: post.status
    });
  }

  async function savePost(event) {
    event.preventDefault();

    if (!token) {
      setNotice('Please sign in to write posts.');
      return;
    }

    const payload = {
      ...postForm,
      tags: postForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    };

    if (payload.title.trim().length < 3) {
      setNotice('Title must be at least 3 characters.');
      return;
    }

    if (payload.excerpt.trim().length < 10) {
      setNotice('Short excerpt must be at least 10 characters.');
      return;
    }

    if (payload.content.trim().length < 20) {
      setNotice('Article content must be at least 20 characters.');
      return;
    }

    try {
      const data = await request(
        editingId ? `/posts/${editingId}` : '/posts',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(payload)
        },
        token
      );
      setSelected(data.post);
      setPostForm(emptyPost);
      setEditingId('');
      setNotice(editingId ? 'Post updated.' : 'Post published.');
      await loadPosts(1);
      setPage(1);
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function deletePost(postId) {
    try {
      await request(`/posts/${postId}`, { method: 'DELETE' }, token);
      setSelected(null);
      setNotice('Post deleted.');
      await loadPosts();
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function toggleLike(postId) {
    try {
      const data = await request(`/posts/${postId}/like`, { method: 'POST' }, token);
      setSelected((post) => (post?._id === postId ? { ...post, likes: data.likes } : post));
      setPosts((items) => items.map((post) => (post._id === postId ? { ...post, likes: data.likes } : post)));
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function bookmark(postId) {
    try {
      const data = await request(`/posts/${postId}/bookmark`, { method: 'POST' }, token);
      setNotice(data.bookmarked ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function addComment(event) {
    event.preventDefault();

    if (!selected) {
      return;
    }

    try {
      const data = await request(
        `/posts/${selected._id}/comments`,
        { method: 'POST', body: JSON.stringify({ body: commentBody }) },
        token
      );
      setComments((items) => [data.comment, ...items]);
      setCommentBody('');
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function removeComment(commentId) {
    try {
      await request(`/posts/comments/${commentId}`, { method: 'DELETE' }, token);
      setComments((items) => items.filter((comment) => comment._id !== commentId));
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className={isScrolled ? 'page is-scrolled' : 'page'}>
      <header className={isScrolled ? 'topbar is-scrolled' : 'topbar'}>
        <button className="brand" type="button" onClick={() => setSelected(null)}>
          <img src="/inkline-brand-logo.png" alt="Inkline" />
        </button>
        <nav>
          <button type="button" onClick={() => setShowMine(false)}>Explore</button>
          <button type="button" onClick={() => setShowMine(true)} disabled={!token}>My Posts</button>
        </nav>
        {user ? (
          <div className="user-menu">
            <span className="user-avatar" aria-hidden="true">{user.name?.charAt(0) || 'U'}</span>
            <span>{user.name}</span>
            <button type="button" onClick={logout}>Sign out</button>
          </div>
        ) : null}
      </header>

      {!user ? (
        <section className="hero">
          <div>
            <p className="eyebrow">Full-stack blogging platform</p>
            <h1>Write, search, discuss, and manage stories in one focused workspace.</h1>
            <p>
              A responsive CRUD blog with protected author tools, comments, pagination,
              search, tags, likes, bookmarks, drafts, and reading-time essentials.
            </p>
          </div>
          <form className="auth-panel" onSubmit={handleAuth}>
            <div className="switcher">
              <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>
                Login
              </button>
              <button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>
                Register
              </button>
            </div>
            {authMode === 'register' ? (
              <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} placeholder="Name" />
            ) : null}
            <input value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="Email" type="email" />
            <input value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="Password" type="password" />
            <button type="submit" disabled={loading}>{loading ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
        </section>
      ) : null}

      {notice ? <p className="notice">{notice}</p> : null}

      <section className="workspace">
        <div className="filters">
          <form onSubmit={(event) => { event.preventDefault(); setPage(1); loadPosts(1); }}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, content, or tags" />
            <button type="submit">Search</button>
          </form>
          <div className="tag-row">
            <button type="button" className={!activeTag ? 'active' : ''} onClick={() => { setActiveTag(''); setPage(1); }}>All</button>
            {tags.map((tag) => (
              <button key={tag} type="button" className={activeTag === tag ? 'active' : ''} onClick={() => { setActiveTag(tag); setPage(1); }}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        <aside className="composer">
          <div className="panel-heading">
            <span>Author Desk</span>
            <strong>{editingId ? 'Edit post' : 'New post'}</strong>
          </div>
          <form onSubmit={savePost}>
            <input value={postForm.title} onChange={(event) => setPostForm({ ...postForm, title: event.target.value })} placeholder="Title" />
            <textarea rows="3" value={postForm.excerpt} onChange={(event) => setPostForm({ ...postForm, excerpt: event.target.value })} placeholder="Short excerpt" />
            <textarea rows="8" value={postForm.content} onChange={(event) => setPostForm({ ...postForm, content: event.target.value })} placeholder="Write the article..." />
            <input value={postForm.coverImage} onChange={(event) => setPostForm({ ...postForm, coverImage: event.target.value })} placeholder="Cover image URL" />
            <input value={postForm.tags} onChange={(event) => setPostForm({ ...postForm, tags: event.target.value })} placeholder="Tags, comma separated" />
            <select value={postForm.status} onChange={(event) => setPostForm({ ...postForm, status: event.target.value })}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <div className="form-actions">
              <button type="submit" disabled={!token}>{editingId ? 'Save changes' : 'Publish'}</button>
              {editingId ? <button type="button" onClick={() => { setEditingId(''); setPostForm(emptyPost); }}>Cancel</button> : null}
            </div>
          </form>
          <div className="mini-stats">
            <span><strong>{pagination.total}</strong> posts</span>
            <span><strong>{stats.totalLikes}</strong> likes</span>
            <span><strong>{stats.drafts}</strong> drafts</span>
          </div>
        </aside>

        <section className="feed">
          {selected ? (
            <article className="detail">
              {selected.coverImage ? <img src={selected.coverImage} alt="" /> : null}
              <p className="eyebrow">{selected.status} / {selected.readTime} min read</p>
              <h2>{selected.title}</h2>
              <p className="excerpt">{selected.excerpt}</p>
              <p className="content">{selected.content}</p>
              <div className="post-actions">
                <button type="button" onClick={() => toggleLike(selected._id)}>Like ({selected.likes?.length || 0})</button>
                <button type="button" onClick={() => bookmark(selected._id)}>Bookmark</button>
                {isAuthor ? <button type="button" onClick={() => editPost(selected)}>Edit</button> : null}
                {isAuthor ? <button type="button" className="danger" onClick={() => deletePost(selected._id)}>Delete</button> : null}
              </div>
              <section className="comments">
                <h3>Comments</h3>
                <form onSubmit={addComment}>
                  <input value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder="Add a thoughtful comment" />
                  <button type="submit" disabled={!token}>Comment</button>
                </form>
                {comments.map((comment) => (
                  <div className="comment" key={comment._id}>
                    <p>{comment.body}</p>
                    <span>by {comment.author?.name || 'Reader'}</span>
                    {(comment.author?._id === user?.id || isAuthor) ? (
                      <button type="button" onClick={() => removeComment(comment._id)}>Remove</button>
                    ) : null}
                  </div>
                ))}
              </section>
            </article>
          ) : (
            <>
              <div className="grid">
                {posts.map((post) => (
                  <article className="card" key={post._id}>
                    {post.coverImage ? <img src={post.coverImage} alt="" /> : <div className="cover-fallback" />}
                    <p className="eyebrow">{post.status} / {post.readTime} min read</p>
                    <h2>{post.title}</h2>
                    <p>{post.excerpt}</p>
                    <div className="card-footer">
                      <span>{post.author?.name || 'Author'}</span>
                      <button type="button" onClick={() => openPost(post.slug)}>Read</button>
                    </div>
                  </article>
                ))}
              </div>
              {loading ? <p className="notice">Loading posts...</p> : null}
              <div className="pager">
                <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('app')).render(<App />);
