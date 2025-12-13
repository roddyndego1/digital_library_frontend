document.addEventListener('DOMContentLoaded', function () {
    loadBooks();

    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            loadBooks(searchInput.value, categoryFilter.value);
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadBooks(searchInput.value, categoryFilter.value);
            }
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            loadBooks(searchInput.value, categoryFilter.value);
        });
    }

    checkBackendStatus();
});

async function loadBooks(searchTerm = '', category = '') {
    const loadingElement = document.getElementById('loading');
    const noBooksElement = document.getElementById('noBooks');
    const booksContainer = document.getElementById('booksContainer');

    if (loadingElement) loadingElement.style.display = 'block';
    if (noBooksElement) noBooksElement.style.display = 'none';
    if (booksContainer) booksContainer.innerHTML = '';

    try {
        const response = await fetch(`${BACKEND_URL}/books`);
        const books = await response.json();

        if (loadingElement) loadingElement.style.display = 'none';

        let filteredBooks = books;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filteredBooks = filteredBooks.filter(book =>
                book.title.toLowerCase().includes(term) ||
                book.author.toLowerCase().includes(term) ||
                (book.category && book.category.toLowerCase().includes(term))
            );
        }

        if (category) {
            filteredBooks = filteredBooks.filter(book =>
                book.category === category
            );
        }

        if (filteredBooks.length === 0) {
            if (noBooksElement) noBooksElement.style.display = 'block';
        } else {
            displayBooks(filteredBooks);
        }
    } catch (error) {
        console.error('Error loading books:', error);
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

function displayBooks(books) {
    const booksContainer = document.getElementById('booksContainer');
    const user = auth.getUser();

    booksContainer.innerHTML = books.map(book => {
        const coverImage = getBookCover(book);

        return `
        <div class="book-card">
            <div class="book-cover-container">
                <div class="book-cover">
                    <img src="${coverImage}" alt="${book.title}" class="book-cover-img" 
                         loading="lazy"
                         onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=500&fit=fill&crop=faces';">
                </div>
                <div class="book-cover-overlay">
                    <span class="book-category-badge">${book.category || 'General'}</span>
                </div>
            </div>
            <div class="book-info">
                <h3 class="book-title" title="${book.title}">${book.title}</h3>
                <p class="book-author" title="${book.author}">
                    <i class="fas fa-user-edit"></i> ${book.author}
                </p>
                <p class="book-isbn">
                    <i class="fas fa-barcode"></i> ${book.isbn}
                </p>
                <div class="book-meta">
                    <span class="book-copies">
                        <i class="fas fa-copy"></i> ${book.available_copies}/${book.total_copies} available
                    </span>
                    <span class="book-status ${book.available_copies > 0 ? 'status-available' : 'status-unavailable'}">
                        ${book.available_copies > 0 ? 'Available' : 'Out of Stock'}
                    </span>
                </div>
                ${book.description ? `
                <div class="book-description-container">
                    <p class="book-description">${book.description.substring(0, 120)}...</p>
                </div>
                ` : ''}
                
                <div class="book-actions">
                    ${user && book.available_copies > 0 ? `
                        <button class="borrow-btn" onclick="borrowBook(${book.id})" title="Borrow this book">
                            <i class="fas fa-bookmark"></i> Borrow Now
                        </button>
                    ` : `
                        <button class="borrow-btn" disabled title="${user ? 'No copies available' : 'Login to borrow'}">
                            <i class="fas ${user ? 'fa-times-circle' : 'fa-lock'}"></i>
                            ${user ? 'Not Available' : 'Login to Borrow'}
                        </button>
                    `}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function getBookCover(book) {
    const bookCovers = {
        '978-0385474542': 'https://covers.openlibrary.org/b/isbn/9780385474542-L.jpg',
        '978-1594631931': 'https://covers.openlibrary.org/b/isbn/9781594631931-L.jpg',
        '978-0307474278': 'https://covers.openlibrary.org/b/isbn/9780307474278-L.jpg',
        '978-0307588371': 'https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg',
        '978-0007200283': 'https://covers.openlibrary.org/b/isbn/9780007200283-L.jpg',
        '978-0954702335': 'https://covers.openlibrary.org/b/isbn/9780954702335-L.jpg',
        '978-1524763138': 'https://covers.openlibrary.org/b/isbn/9781524763138-L.jpg',
        '978-0441013593': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=500&fit=fill&crop=faces',
        '978-0439023481': 'https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg',
        '978-0141439518': 'https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg',
        '978-1982137274': 'https://covers.openlibrary.org/b/isbn/9781982137274-L.jpg',
        '978-1612680194': 'https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg',
        '978-0062316097': 'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg',
        '978-0553380163': 'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg',
        '978-1449474256': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=500&fit=fill&crop=faces',
        '978-0140481341': 'https://covers.openlibrary.org/b/isbn/9780140481341-L.jpg',
        '978-0262043793': 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=500&fit=fill&crop=faces',
        '978-1285741550': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=500&fit=fill&crop=faces',
        '978-0134042282': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=500&fit=fill&crop=faces',
    };

    if (book.isbn && bookCovers[book.isbn]) {
        return bookCovers[book.isbn];
    }

    const categoryImages = {
        'Fiction': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=500&fit=fill&crop=faces',
        'African Literature': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=500&fit=fill&crop=faces',
        'Science Fiction': 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=500&fit=fill&crop=faces',
        'Biography': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces',
        'Mystery': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces',
        'Thriller': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=500&fit=fill&crop=faces',
        'Romance': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=500&fit=fill&crop=faces',
        'Self-Help': 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=500&fit=fill&crop=faces',
        'Business': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=500&fit=fill&crop=faces',
        'History': 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=400&h=500&fit=fill&crop=faces',
        'Science': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=500&fit=fill&crop=faces',
        'Poetry': 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=500&fit=fill&crop=faces',
        'Drama': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=fill&crop=faces',
        'Computer Science': 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=500&fit=fill&crop=faces',
        'Mathematics': 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=500&fit=fill&crop=faces',
        'Chemistry': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=500&fit=fill&crop=faces'
    };

    return categoryImages[book.category] || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=500&fit=fill&crop=faces';
}

async function borrowBook(bookId) {
    const token = auth.getToken();

    if (!token) {
        alert('Please login to borrow books');
        showLoginModal();
        return;
    }

    if (!confirm('Are you sure you want to borrow this book?')) {
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/borrow/${bookId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert('Book borrowed successfully!\nDue date: ' +
                new Date(data.due_date).toLocaleDateString());
            loadBooks();
        } else {
            alert(data.message || 'Error borrowing book');
        }
    } catch (error) {
        console.error('Error borrowing book:', error);
        alert('Error borrowing book. Please try again.');
    }
}

async function checkBackendStatus() {
    const backendStatus = document.getElementById('backendStatus');

    if (!backendStatus) return;

    try {
        const response = await fetch(`${BACKEND_URL}/test-db`);
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
