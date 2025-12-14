
document.addEventListener('DOMContentLoaded', function () {
    loadBooks();
    setupEventListeners();
    checkBackendStatus();
});

function setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchBtn && searchInput && categoryFilter) {
        searchBtn.addEventListener('click', () => {
            loadBooks(searchInput.value, categoryFilter.value);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadBooks(searchInput.value, categoryFilter.value);
            }
        });

        categoryFilter.addEventListener('change', () => {
            loadBooks(searchInput.value, categoryFilter.value);
        });
    }
}

async function loadBooks(searchTerm = '', category = '') {
    const loadingElement = document.getElementById('loading');
    const noBooksElement = document.getElementById('noBooks');
    const booksContainer = document.getElementById('booksContainer');

    if (loadingElement) loadingElement.style.display = 'block';
    if (noBooksElement) noBooksElement.style.display = 'none';
    if (booksContainer) booksContainer.innerHTML = '';

    try {
        const response = await fetch(`${window.BACKEND_URL}/books`);
        
        if (!response.ok) {
            throw new Error(`Failed to load books: ${response.status}`);
        }
        
        const books = await response.json();

        if (loadingElement) loadingElement.style.display = 'none';

        let filteredBooks = filterBooks(books, searchTerm, category);

        if (filteredBooks.length === 0) {
            if (noBooksElement) noBooksElement.style.display = 'block';
        } else {
            displayBooks(filteredBooks);
        }
    } catch (error) {
        if (loadingElement) loadingElement.style.display = 'none';
        if (booksContainer) {
            booksContainer.innerHTML = `
                <div class="error message">
                    Error loading books. Please try again later.
                </div>
            `;
        }
    }
}

function filterBooks(books, searchTerm, category) {
    let filtered = books;

    if (searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        filtered = filtered.filter(book =>
            book.title.toLowerCase().includes(term) ||
            book.author.toLowerCase().includes(term) ||
            (book.category && book.category.toLowerCase().includes(term))
        );
    }

    if (category) {
        filtered = filtered.filter(book => book.category === category);
    }

    return filtered;
}

function displayBooks(books) {
    const booksContainer = document.getElementById('booksContainer');
    if (!booksContainer) return;

    const user = auth.getUser();
    booksContainer.innerHTML = books.map(book => createBookCard(book, user)).join('');
}

function createBookCard(book, user) {
    const coverImage = getBookCover(book);
    const canBorrow = user && book.available_copies > 0;
    const borrowButton = canBorrow
        ? `<button class="borrow-btn" onclick="borrowBook(${book.id})" title="Borrow this book">
            <i class="fas fa-bookmark"></i> Borrow Now
        </button>`
        : `<button class="borrow-btn" disabled title="${user ? 'No copies available' : 'Login to borrow'}">
            <i class="fas ${user ? 'fa-times-circle' : 'fa-lock'}"></i>
            ${user ? 'Not Available' : 'Login to Borrow'}
        </button>`;

    const description = book.description 
        ? `<div class="book-description-container">
            <p class="book-description">${escapeHtml(book.description.substring(0, 120))}...</p>
        </div>`
        : '';

    return `
        <div class="book-card">
            <div class="book-cover-container">
                <div class="book-cover">
                    <img src="${coverImage}" alt="${escapeHtml(book.title)}" class="book-cover-img" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=500&fit=fill&crop=faces';">
                </div>
                <div class="book-cover-overlay">
                    <span class="book-category-badge">${escapeHtml(book.category || 'General')}</span>
                </div>
            </div>
            <div class="book-info">
                <h3 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h3>
                <p class="book-author" title="${escapeHtml(book.author)}">
                    <i class="fas fa-user-edit"></i> ${escapeHtml(book.author)}
                </p>
                <p class="book-isbn">
                    <i class="fas fa-barcode"></i> ${escapeHtml(book.isbn)}</p>
                <div class="book-meta">
                    <span class="book-copies">
                        <i class="fas fa-copy"></i> ${book.available_copies}/${book.total_copies} available
                    </span>
                    <span class="book-status ${book.available_copies > 0 ? 'status-available' : 'status-unavailable'}">
                        ${book.available_copies > 0 ? 'Available' : 'Out of Stock'}
                    </span>
                </div>
                ${description}
                <div class="book-actions">
                    ${borrowButton}
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getBookCover(book) {
    const randomBookCovers = [
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1518373714866-3f1478910cc0?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=500&fit=fill&crop=faces',
        'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&h=500&fit=fill&crop=faces',
    ];

    if (book.id) {
        const index = book.id % randomBookCovers.length;
        return randomBookCovers[index];
    }

    const categoryImages = {
        'Fiction': 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=500&fit=fill&crop=faces',
        'African Literature': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=500&fit=fill&crop=faces',
        'Science Fiction': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces',
        'Biography': 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=500&fit=fill&crop=faces',
        'Mystery': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=500&fit=fill&crop=faces',
        'Thriller': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=500&fit=fill&crop=faces',
        'Romance': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=500&fit=fill&crop=faces',
        'Self-Help': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=500&fit=fill&crop=faces',
        'Business': 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=500&fit=fill&crop=faces',
        'History': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces',
        'Science': 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=500&fit=fill&crop=faces',
        'Poetry': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=500&fit=fill&crop=faces',
        'Drama': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=500&fit=fill&crop=faces',
        'Computer Science': 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=500&fit=fill&crop=faces',
        'Mathematics': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=500&fit=fill&crop=faces',
        'Chemistry': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces'
    };

    return categoryImages[book.category] || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=500&fit=fill&crop=faces';
}

async function borrowBook(bookId) {
    if (!bookId) return;

    const token = auth.getToken();
    if (!token) {
        alert('Please login to borrow books');
        if (window.showAuthModal) {
            window.showAuthModal('login');
        }
        return;
    }

    if (!confirm('Are you sure you want to borrow this book?')) {
        return;
    }

    try {
        const response = await fetch(`${window.BACKEND_URL}/borrow/${bookId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            const text = await response.text();
            alert(`Server error: ${response.status} ${response.statusText}. ${text || 'Please try again.'}`);
            console.error('Borrow response parse error:', jsonError, text);
            return;
        }

        if (response.ok) {
            const record = data.borrowRecord || data;
            const dueDateRaw = record.due_date || record.dueDate || record.due;
            const dueDate = dueDateRaw ? new Date(dueDateRaw).toLocaleDateString() : 'N/A';
            alert(`Book borrowed successfully!\nDue date: ${dueDate}`);
            loadBooks();
        } else {
            alert(data.message || 'Error borrowing book');
        }
    } catch (error) {
        alert('Error borrowing book. Please try again.');
    }
}

async function checkBackendStatus() {
    const backendStatus = document.getElementById('backendStatus');
    if (!backendStatus) return;

    try {
        const response = await fetch(`${window.BACKEND_URL}/test-db`);
        const data = await response.json();

        if (data.success) {
            backendStatus.textContent = 'Connected';
            backendStatus.style.color = '#27ae60';
        } else {
            backendStatus.textContent = 'Error';
            backendStatus.style.color = '#e74c3c';
        }
    } catch (error) {
        backendStatus.textContent = 'Offline';
        backendStatus.style.color = '#7f8c8d';
    }
}

window.loadBooks = loadBooks;
window.borrowBook = borrowBook;
