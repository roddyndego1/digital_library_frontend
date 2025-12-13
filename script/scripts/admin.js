document.addEventListener('DOMContentLoaded', function() {
    if (!auth.isAdmin()) {
        alert('Access denied. Admins only.');
        window.location.href = 'index.html';
        return;
    }

    setupTabs();
    
    loadAdminStats();
    loadRecentActivity();
    
    loadAdminBooks();
    
    const addBookForm = document.getElementById('addBookForm');
    if (addBookForm) {
        addBookForm.addEventListener('submit', handleAddBook);
    }
    
    const searchBtn = document.getElementById('adminSearchBtn');
    const searchInput = document.getElementById('adminSearch');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            loadAdminBooks(searchInput.value);
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadAdminBooks(searchInput.value);
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            auth.logout();
            window.location.href = 'index.html';
        });
    }
});

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            if (targetTab === 'borrowed') {
                loadAllBorrowedBooks();
            } else if (targetTab === 'returned') {
                loadAllReturnedBooks();
            }
        });
    });
}

async function loadAdminStats() {
    try {
        const token = auth.getToken();
        
        const booksResponse = await fetch(`${BACKEND_URL}/books`);
        const books = await booksResponse.json();
        
        const totalBooks = books.length;
        const borrowedBooks = books.reduce((total, book) => {
            return total + (book.total_copies - book.available_copies);
        }, 0);
        const availableBooks = books.reduce((total, book) => {
            return total + book.available_copies;
        }, 0);
        
        let overdueBooks = 0;
        try {
            const borrowsResponse = await fetch(`${BACKEND_URL}/admin/all-borrows`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (borrowsResponse.ok) {
                const borrows = await borrowsResponse.json();
                const today = new Date();
                overdueBooks = borrows.filter(borrow => {
                    if (borrow.status === 'borrowed' || borrow.status === 'active') {
                        const dueDate = new Date(borrow.due_date);
                        return dueDate < today;
                    }
                    return false;
                }).length;
            }
        } catch (error) {
            console.error('Error loading borrows for overdue count:', error);
        }
        
        let totalUsers = 0;
        try {
            const usersResponse = await fetch(`${BACKEND_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (usersResponse.ok) {
                const users = await usersResponse.json();
                totalUsers = Array.isArray(users) ? users.length : 0;
            }
        } catch (error) {
            console.error('Error loading users count:', error);
            totalUsers = 0;
        }
        
        const totalBooksEl = document.getElementById('totalBooks');
        const totalUsersEl = document.getElementById('totalUsers');
        const borrowedBooksEl = document.getElementById('borrowedBooks');
        const overdueBooksEl = document.getElementById('overdueBooks');
        const availableBooksEl = document.getElementById('availableBooks');
        
        if (totalBooksEl) totalBooksEl.textContent = totalBooks.toLocaleString();
        if (totalUsersEl) totalUsersEl.textContent = totalUsers.toLocaleString();
        if (borrowedBooksEl) borrowedBooksEl.textContent = borrowedBooks.toLocaleString();
        if (overdueBooksEl) overdueBooksEl.textContent = overdueBooks.toLocaleString();
        if (availableBooksEl) availableBooksEl.textContent = availableBooks.toLocaleString();
        
    } catch (error) {
        console.error('Error loading admin stats:', error);
    }
}

async function loadRecentActivity() {
    const token = auth.getToken();
    const recentBorrowingsContainer = document.getElementById('recentBorrowings');
    const recentlyReturnedContainer = document.getElementById('recentlyReturned');
    
    try {
        const response = await fetch(`${BACKEND_URL}/admin/all-borrows`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (recentBorrowingsContainer) {
                recentBorrowingsContainer.innerHTML = '<p class="no-books">Admin borrows endpoint not available</p>';
            }
            if (recentlyReturnedContainer) {
                recentlyReturnedContainer.innerHTML = '<p class="no-books">Admin borrows endpoint not available</p>';
            }
            return;
        }
        
        const allBorrows = await response.json();
        
        const activeBorrows = allBorrows.filter(b => b.status === 'borrowed' || b.status === 'active');
        const returnedBorrows = allBorrows.filter(b => b.status === 'returned');
        
        activeBorrows.sort((a, b) => new Date(b.borrow_date || b.created_at) - new Date(a.borrow_date || a.created_at));
        returnedBorrows.sort((a, b) => new Date(b.return_date || b.updated_at) - new Date(a.return_date || a.updated_at));
        
        const recentActive = activeBorrows.slice(0, 4);
        const recentReturned = returnedBorrows.slice(0, 4);
        
        if (recentBorrowingsContainer) {
            if (recentActive.length === 0) {
                recentBorrowingsContainer.innerHTML = '<p class="no-books">No recent borrowings</p>';
            } else {
                recentBorrowingsContainer.innerHTML = recentActive.map(borrow => {
                    const userName = borrow.user_name || borrow.user_email || 'Unknown User';
                    const bookTitle = borrow.book_title || `Book ID: ${borrow.book_id}`;
                    const isOverdue = borrow.due_date ? new Date(borrow.due_date) < new Date() : false;
                    
                    return `
                        <div class="activity-item ${isOverdue ? 'overdue' : ''}">
                            <div class="activity-item-header">
                                <span class="activity-item-name">${userName}</span>
                                <span class="activity-item-status ${isOverdue ? 'status-overdue' : 'status-active'}">
                                    ${isOverdue ? 'Overdue' : 'Active'}
                                </span>
                            </div>
                            <div class="activity-item-book">${bookTitle}</div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        if (recentlyReturnedContainer) {
            if (recentReturned.length === 0) {
                recentlyReturnedContainer.innerHTML = '<p class="no-books">No recent returns</p>';
            } else {
                recentlyReturnedContainer.innerHTML = recentReturned.map(borrow => {
                    const userName = borrow.user_name || borrow.user_email || 'Unknown User';
                    const bookTitle = borrow.book_title || `Book ID: ${borrow.book_id}`;
                    const returnDate = borrow.return_date || borrow.updated_at;
                    const formattedDate = returnDate ? new Date(returnDate).toISOString().split('T')[0] : 'N/A';
                    
                    return `
                        <div class="activity-item">
                            <div class="activity-item-header">
                                <span class="activity-item-name">${userName}</span>
                            </div>
                            <div class="activity-item-book">${bookTitle}</div>
                            <div class="activity-item-date">Returned: ${formattedDate}</div>
                        </div>
                    `;
                }).join('');
            }
        }
        
    } catch (error) {
        console.error('Error loading recent activity:', error);
        if (recentBorrowingsContainer) {
            recentBorrowingsContainer.innerHTML = '<p class="error">Error loading recent borrowings</p>';
        }
        if (recentlyReturnedContainer) {
            recentlyReturnedContainer.innerHTML = '<p class="error">Error loading recent returns</p>';
        }
    }
}

async function loadAllBorrowedBooks() {
    const token = auth.getToken();
    const container = document.getElementById('allBorrowedBooks');
    
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading borrowed books...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/admin/all-borrows`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            container.innerHTML = '<p class="no-books">Admin borrows endpoint not available</p>';
            return;
        }
        
        const allBorrows = await response.json();
        const activeBorrows = allBorrows.filter(b => b.status === 'borrowed' || b.status === 'active');
        
        if (activeBorrows.length === 0) {
            container.innerHTML = '<p class="no-books">No borrowed books at the moment</p>';
        } else {
            container.innerHTML = activeBorrows.map(borrow => {
                const userName = borrow.user_name || borrow.user_email || 'Unknown User';
                const bookTitle = borrow.book_title || `Book ID: ${borrow.book_id}`;
                const borrowDate = borrow.borrow_date || borrow.created_at;
                const dueDate = borrow.due_date;
                const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;
                const formattedBorrowDate = borrowDate ? new Date(borrowDate).toISOString().split('T')[0] : 'N/A';
                const formattedDueDate = dueDate ? new Date(dueDate).toISOString().split('T')[0] : 'N/A';
                
                return `
                    <div class="activity-item ${isOverdue ? 'overdue' : ''}">
                        <div class="activity-item-header">
                            <span class="activity-item-name">${userName}</span>
                            <span class="activity-item-status ${isOverdue ? 'status-overdue' : 'status-active'}">
                                ${isOverdue ? 'Overdue' : 'Active'}
                            </span>
                        </div>
                        <div class="activity-item-book">${bookTitle}</div>
                        <div class="activity-item-date">Borrowed: ${formattedBorrowDate} | Due: ${formattedDueDate}</div>
                    </div>
                `;
            }).join('');
        }
        
    } catch (error) {
        console.error('Error loading all borrowed books:', error);
        container.innerHTML = '<p class="error">Error loading borrowed books</p>';
    }
}

async function loadAllReturnedBooks() {
    const token = auth.getToken();
    const container = document.getElementById('allReturnedBooks');
    
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading returned books...</div>';
    
    try {
        const response = await fetch(`${BACKEND_URL}/admin/all-borrows`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            container.innerHTML = '<p class="no-books">Admin borrows endpoint not available</p>';
            return;
        }
        
        const allBorrows = await response.json();
        const returnedBorrows = allBorrows.filter(b => b.status === 'returned');
        
        returnedBorrows.sort((a, b) => {
            const dateA = new Date(a.return_date || a.updated_at);
            const dateB = new Date(b.return_date || b.updated_at);
            return dateB - dateA;
        });
        
        if (returnedBorrows.length === 0) {
            container.innerHTML = '<p class="no-books">No returned books yet</p>';
        } else {
            container.innerHTML = returnedBorrows.map(borrow => {
                const userName = borrow.user_name || borrow.user_email || 'Unknown User';
                const bookTitle = borrow.book_title || `Book ID: ${borrow.book_id}`;
                const returnDate = borrow.return_date || borrow.updated_at;
                const formattedDate = returnDate ? new Date(returnDate).toISOString().split('T')[0] : 'N/A';
                
                return `
                    <div class="activity-item">
                        <div class="activity-item-header">
                            <span class="activity-item-name">${userName}</span>
                        </div>
                        <div class="activity-item-book">${bookTitle}</div>
                        <div class="activity-item-date">Returned: ${formattedDate}</div>
                    </div>
                `;
            }).join('');
        }
        
    } catch (error) {
        console.error('Error loading all returned books:', error);
        container.innerHTML = '<p class="error">Error loading returned books</p>';
    }
}

async function loadAdminBooks(searchTerm = '') {
    const booksContainer = document.getElementById('adminBooksContainer');
    const loadingElement = document.getElementById('adminLoading');
    const noBooksElement = document.getElementById('adminNoBooks');
    
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
                (book.category && book.category.toLowerCase().includes(term)) ||
                book.isbn.toLowerCase().includes(term)
            );
        }
        
        if (filteredBooks.length === 0) {
            if (noBooksElement) noBooksElement.style.display = 'block';
        } else {
            displayAdminBooks(filteredBooks);
        }
        
        loadAdminStats();
        
    } catch (error) {
        console.error('Error loading books:', error);
        if (loadingElement) loadingElement.style.display = 'none';
        if (booksContainer) {
            booksContainer.innerHTML = '<div class="error">Error loading books. Please try again.</div>';
        }
    }
}

function displayAdminBooks(books) {
    const booksContainer = document.getElementById('adminBooksContainer');
    
    booksContainer.innerHTML = books.map(book => {
        const coverImage = getBookCover(book);
        
        return `
        <div class="book-card" data-book-id="${book.id}">
            <div class="book-cover-container">
                <div class="book-cover">
                    <img src="${coverImage}" alt="${book.title}" class="book-cover-img" 
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
                    <p class="book-description">${book.description.substring(0, 100)}...</p>
                </div>
                ` : ''}
                
                <div class="admin-actions">
                    <button class="edit-btn" onclick="editBook(${book.id})" title="Edit this book">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="deleteBook(${book.id})" title="Delete this book">
                        <i class="fas fa-trash"></i> Delete
                    </button>
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

async function handleAddBook(e) {
    e.preventDefault();
    
    const token = auth.getToken();
    const messageElement = document.getElementById('addBookMessage');
    
    const bookData = {
        title: document.getElementById('bookTitle').value.trim(),
        author: document.getElementById('bookAuthor').value.trim(),
        isbn: document.getElementById('bookISBN').value.trim(),
        category: document.getElementById('bookCategory').value,
        description: document.getElementById('bookDescription').value.trim(),
        total_copies: parseInt(document.getElementById('bookTotalCopies').value),
        available_copies: parseInt(document.getElementById('bookAvailableCopies').value)
    };
    
    if (!bookData.title || !bookData.author || !bookData.isbn) {
        showMessage(messageElement, 'Please fill in all required fields', 'error');
        return;
    }
    
    if (bookData.available_copies > bookData.total_copies) {
        showMessage(messageElement, 'Available copies cannot exceed total copies', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_URL}/books`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(messageElement, 'Book added successfully!', 'success');
            document.getElementById('addBookForm').reset();
            
            setTimeout(() => {
                loadAdminBooks();
                loadAdminStats();
            }, 1000);
            
        } else {
            showMessage(messageElement, `${data.message || 'Error adding book'}`, 'error');
        }
    } catch (error) {
        console.error('Error adding book:', error);
        showMessage(messageElement, 'Error connecting to server', 'error');
    }
}

function showMessage(element, text, type) {
    if (!element) return;
    
    element.textContent = text;
    element.className = 'message';
    element.classList.add(type);
    element.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

async function editBook(bookId) {
    try {
        const response = await fetch(`${BACKEND_URL}/books/${bookId}`);
        if (!response.ok) {
            alert('Error fetching book details');
            return;
        }
        
        const book = await response.json();
        
        const editModal = document.createElement('div');
        editModal.className = 'modal';
        editModal.style.display = 'block';
        editModal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <h2><i class="fas fa-edit"></i> Edit Book</h2>
                <form id="editBookForm" class="book-form">
                    <div class="form-group">
                        <label for="editTitle">Title</label>
                        <input type="text" id="editTitle" value="${book.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="editAuthor">Author</label>
                        <input type="text" id="editAuthor" value="${book.author}" required>
                    </div>
                    <div class="form-group">
                        <label for="editISBN">ISBN</label>
                        <input type="text" id="editISBN" value="${book.isbn}" required>
                    </div>
                    <div class="form-group">
                        <label for="editCategory">Category</label>
                        <select id="editCategory" required>
                            <option value="Fiction" ${book.category === 'Fiction' ? 'selected' : ''}>Fiction</option>
                            <option value="African Literature" ${book.category === 'African Literature' ? 'selected' : ''}>African Literature</option>
                            <option value="Science Fiction" ${book.category === 'Science Fiction' ? 'selected' : ''}>Science Fiction</option>
                            <option value="Biography" ${book.category === 'Biography' ? 'selected' : ''}>Biography</option>
                            <option value="Mystery" ${book.category === 'Mystery' ? 'selected' : ''}>Mystery</option>
                            <option value="Thriller" ${book.category === 'Thriller' ? 'selected' : ''}>Thriller</option>
                            <option value="Romance" ${book.category === 'Romance' ? 'selected' : ''}>Romance</option>
                            <option value="Self-Help" ${book.category === 'Self-Help' ? 'selected' : ''}>Self-Help</option>
                            <option value="Business" ${book.category === 'Business' ? 'selected' : ''}>Business</option>
                            <option value="History" ${book.category === 'History' ? 'selected' : ''}>History</option>
                            <option value="Science" ${book.category === 'Science' ? 'selected' : ''}>Science</option>
                            <option value="Poetry" ${book.category === 'Poetry' ? 'selected' : ''}>Poetry</option>
                            <option value="Drama" ${book.category === 'Drama' ? 'selected' : ''}>Drama</option>
                            <option value="Computer Science" ${book.category === 'Computer Science' ? 'selected' : ''}>Computer Science</option>
                            <option value="Mathematics" ${book.category === 'Mathematics' ? 'selected' : ''}>Mathematics</option>
                            <option value="Chemistry" ${book.category === 'Chemistry' ? 'selected' : ''}>Chemistry</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="editDescription">Description</label>
                        <textarea id="editDescription" rows="4">${book.description || ''}</textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editTotalCopies">Total Copies</label>
                            <input type="number" id="editTotalCopies" value="${book.total_copies}" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="editAvailableCopies">Available Copies</label>
                            <input type="number" id="editAvailableCopies" value="${book.available_copies}" min="0" required>
                        </div>
                    </div>
                    <button type="submit" class="submit-btn">
                        <i class="fas fa-save"></i> Update Book
                    </button>
                </form>
                <p id="editMessage" class="message"></p>
            </div>
        `;
        
        document.body.appendChild(editModal);
        
        const editForm = document.getElementById('editBookForm');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const token = auth.getToken();
            const editMessage = document.getElementById('editMessage');
            
            const updatedData = {
                title: document.getElementById('editTitle').value.trim(),
                author: document.getElementById('editAuthor').value.trim(),
                isbn: document.getElementById('editISBN').value.trim(),
                category: document.getElementById('editCategory').value,
                description: document.getElementById('editDescription').value.trim(),
                total_copies: parseInt(document.getElementById('editTotalCopies').value),
                available_copies: parseInt(document.getElementById('editAvailableCopies').value)
            };
            
            if (updatedData.available_copies > updatedData.total_copies) {
                showMessage(editMessage, 'Available copies cannot exceed total copies', 'error');
                return;
            }
            
            try {
                const response = await fetch(`${BACKEND_URL}/books/${bookId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showMessage(editMessage, 'Book updated successfully!', 'success');
                    
                    setTimeout(() => {
                        editModal.remove();
                        loadAdminBooks();
                        loadAdminStats();
                    }, 1500);
                    
                } else {
                    showMessage(editMessage, `${data.message || 'Error updating book'}`, 'error');
                }
            } catch (error) {
                console.error('Error updating book:', error);
                showMessage(editMessage, 'Error connecting to server', 'error');
            }
        });
        
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                editModal.remove();
            }
        });
        
    } catch (error) {
        console.error('Error editing book:', error);
        alert('Error loading book details');
    }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book?\nThis action cannot be undone.')) {
        return;
    }
    
    const token = auth.getToken();
    
    try {
        const response = await fetch(`${BACKEND_URL}/books/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('Book deleted successfully!');
            loadAdminBooks();
            loadAdminStats();
        } else {
            const data = await response.json();
            alert(`${data.message || 'Error deleting book'}`);
        }
    } catch (error) {
        console.error('Error deleting book:', error);
        alert('Error connecting to server');
    }
}

window.editBook = editBook;
window.deleteBook = deleteBook;
window.loadAdminBooks = loadAdminBooks;
