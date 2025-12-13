// borrow.js - ACity Digital Library Borrow History Management

document.addEventListener('DOMContentLoaded', function () {
    console.log('Borrow page loaded');
    
    // Check if user is logged in
    const token = auth.getToken();
    if (!token) {
        alert('Please login to view your borrow history');
        window.location.href = 'index.html';
        return;
    }

    // Update welcome message with user email
    const user = auth.getUser();
    if (user && user.email) {
        document.getElementById('userWelcome').textContent = `Welcome back, ${user.email}`;
    }

    // Load user's borrow history
    loadBorrowHistory();

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            auth.logout();
            window.location.href = 'index.html';
        });
    }
});

async function loadBorrowHistory() {
    console.log('Loading borrow history...');
    const token = auth.getToken();

    // Show loading states
    const currentLoading = document.getElementById('currentLoading');
    const historyLoading = document.getElementById('historyLoading');
    
    if (currentLoading) currentLoading.style.display = 'block';
    if (historyLoading) historyLoading.style.display = 'block';

    // Hide no-content messages initially
    const noCurrentBorrows = document.getElementById('noCurrentBorrows');
    const noHistory = document.getElementById('noHistory');
    
    if (noCurrentBorrows) noCurrentBorrows.style.display = 'none';
    if (noHistory) noHistory.style.display = 'none';

    try {
        console.log('Fetching from:', `${BACKEND_URL}/my-borrows`);
        
        const response = await fetch(`${BACKEND_URL}/my-borrows`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            throw new Error(`Failed to load borrow history: ${response.status} ${response.statusText}`);
        }

        const borrows = await response.json();
        console.log('Received borrows data:', borrows);
        
        displayBorrowHistory(borrows);
    } catch (error) {
        console.error('Error loading borrow history:', error);
        
        // Show error messages
        const currentBorrows = document.getElementById('currentBorrows');
        const borrowHistory = document.getElementById('borrowHistory');
        
        if (currentBorrows) {
            currentBorrows.innerHTML = '<div class="error message">Error loading current borrows. Please try again.</div>';
        }
        
        if (borrowHistory) {
            borrowHistory.innerHTML = '<div class="error message">Error loading borrow history. Please try again.</div>';
        }
        
        // Reset stat cards on error
        document.getElementById('currentBorrowsCount').textContent = '0';
        document.getElementById('dueSoonCount').textContent = '0';
        document.getElementById('returnedCount').textContent = '0';
    } finally {
        // Hide loading states
        if (currentLoading) currentLoading.style.display = 'none';
        if (historyLoading) historyLoading.style.display = 'none';
    }
}

function displayBorrowHistory(borrows) {
    console.log('Displaying borrow history:', borrows);
    
    const currentBorrowsContainer = document.getElementById('currentBorrows');
    const borrowHistoryContainer = document.getElementById('borrowHistory');

    if (!borrows || !Array.isArray(borrows)) {
        console.error('Invalid borrows data:', borrows);
        showNoDataMessages();
        return;
    }

    // Separate current borrows from returned books
    const currentBorrows = borrows.filter(b => b.status === 'borrowed' || b.status === 'active');
    const returnedBooks = borrows.filter(b => b.status === 'returned');
    
    // Calculate due soon books (within next 3 days)
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const dueSoonBorrows = currentBorrows.filter(borrow => {
        try {
            const dueDate = new Date(borrow.due_date);
            return dueDate >= today && dueDate <= threeDaysFromNow;
        } catch (e) {
            console.error('Error parsing date:', borrow.due_date);
            return false;
        }
    });

    console.log('Current borrows:', currentBorrows.length);
    console.log('Due soon:', dueSoonBorrows.length);
    console.log('Returned:', returnedBooks.length);

    // Update stat cards
    updateStatCards(currentBorrows.length, dueSoonBorrows.length, returnedBooks.length);

    // Display current borrows
    displayCurrentBorrows(currentBorrows, currentBorrowsContainer);

    // Display borrow history
    displayBorrowHistoryList(returnedBooks, borrowHistoryContainer);
}

function updateStatCards(currentCount, dueSoonCount, returnedCount) {
    document.getElementById('currentBorrowsCount').textContent = currentCount;
    document.getElementById('dueSoonCount').textContent = dueSoonCount;
    document.getElementById('returnedCount').textContent = returnedCount;
}

function displayCurrentBorrows(borrows, container) {
    const noCurrentBorrows = document.getElementById('noCurrentBorrows');
    
    if (!borrows || borrows.length === 0) {
        container.innerHTML = '';
        if (noCurrentBorrows) noCurrentBorrows.style.display = 'block';
        return;
    }

    if (noCurrentBorrows) noCurrentBorrows.style.display = 'none';

    container.innerHTML = borrows.map(borrow => {
        try {
            const borrowDate = new Date(borrow.borrow_date || borrow.created_at);
            const dueDate = new Date(borrow.due_date);
            const today = new Date();
            
            const isOverdue = dueDate < today;
            const isDueSoon = !isOverdue && (dueDate - today) / (1000 * 60 * 60 * 24) <= 3;
            
            // Format dates nicely
            const borrowDateStr = borrowDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const dueDateStr = dueDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });

            // Calculate days until due
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="borrow-item ${isOverdue ? 'overdue' : (isDueSoon ? 'due-soon' : '')}">
                    <div class="borrow-info">
                        <h4>${borrow.book_title || `Book ID: ${borrow.book_id}`}</h4>
                        ${borrow.book_author ? `<p class="book-author">${borrow.book_author}</p>` : ''}
                        <div class="borrow-dates">
                            <p><strong><i class="fas fa-calendar-plus"></i> Borrowed:</strong> ${borrowDateStr}</p>
                            <p><strong><i class="fas fa-calendar-times"></i> Due:</strong> ${dueDateStr}</p>
                            ${isOverdue ? 
                                `<p class="status-overdue"><i class="fas fa-exclamation-triangle"></i> OVERDUE by ${Math.abs(daysUntilDue)} days</p>` : 
                                isDueSoon ? 
                                `<p class="status-due-soon"><i class="fas fa-clock"></i> Due in ${daysUntilDue} days</p>` :
                                `<p class="status-ok"><i class="fas fa-check-circle"></i> Due in ${daysUntilDue} days</p>`
                            }
                        </div>
                    </div>
                    <button class="return-btn" onclick="returnBook(${borrow.id})" 
                            title="Return this book">
                        <i class="fas fa-undo"></i> Return
                    </button>
                </div>
            `;
        } catch (error) {
            console.error('Error formatting borrow item:', borrow, error);
            return `
                <div class="borrow-item error">
                    <div class="borrow-info">
                        <h4>Error displaying book</h4>
                        <p>Book ID: ${borrow.book_id || 'Unknown'}</p>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function displayBorrowHistoryList(borrows, container) {
    const noHistory = document.getElementById('noHistory');
    
    if (!borrows || borrows.length === 0) {
        container.innerHTML = '';
        if (noHistory) noHistory.style.display = 'block';
        return;
    }

    if (noHistory) noHistory.style.display = 'none';

    container.innerHTML = borrows.map(borrow => {
        try {
            const borrowDate = new Date(borrow.borrow_date || borrow.created_at);
            const dueDate = new Date(borrow.due_date);
            const returnDate = borrow.return_date ? new Date(borrow.return_date) : null;
            const wasOverdue = returnDate && (returnDate > dueDate);
            
            // Format dates
            const borrowDateStr = borrowDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const dueDateStr = dueDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            const returnDateStr = returnDate ? returnDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'Not returned';

            return `
                <div class="history-item ${wasOverdue ? 'overdue' : ''}">
                    <div class="borrow-info">
                        <h4>${borrow.book_title || `Book ID: ${borrow.book_id}`}</h4>
                        ${borrow.book_author ? `<p class="book-author">${borrow.book_author}</p>` : ''}
                        <div class="borrow-dates">
                            <div class="date-row">
                                <span><i class="fas fa-calendar-plus"></i> <strong>Borrowed:</strong> ${borrowDateStr}</span>
                                <span><i class="fas fa-calendar-times"></i> <strong>Due:</strong> ${dueDateStr}</span>
                            </div>
                            <div class="date-row">
                                <span><i class="fas fa-calendar-check"></i> <strong>Returned:</strong> ${returnDateStr}</span>
                                ${wasOverdue ? 
                                    '<span class="status-overdue"><i class="fas fa-exclamation-triangle"></i> Returned Late</span>' : 
                                    '<span class="status-returned"><i class="fas fa-check-circle"></i> Returned On Time</span>'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error formatting history item:', borrow, error);
            return `
                <div class="history-item error">
                    <div class="borrow-info">
                        <h4>Error displaying book</h4>
                        <p>Book ID: ${borrow.book_id || 'Unknown'}</p>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function showNoDataMessages() {
    document.getElementById('currentBorrows').innerHTML = '';
    document.getElementById('borrowHistory').innerHTML = '';
    
    document.getElementById('noCurrentBorrows').style.display = 'block';
    document.getElementById('noHistory').style.display = 'block';
    
    updateStatCards(0, 0, 0);
}

async function returnBook(borrowId) {
    console.log('Attempting to return book with borrow ID:', borrowId);
    
    if (!confirm('Are you sure you want to return this book?')) {
        return;
    }

    const token = auth.getToken();

    try {
        const response = await fetch(`${BACKEND_URL}/return/${borrowId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Return response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            alert('Book returned successfully!');
            console.log('Return successful:', data);
            
            // Reload the borrow history
            loadBorrowHistory();
            
        } else {
            const errorText = await response.text();
            console.error('Return error:', errorText);
            
            try {
                const errorData = JSON.parse(errorText);
                alert(errorData.message || 'Error returning book');
            } catch {
                alert(`Error returning book: ${response.status} ${response.statusText}`);
            }
        }
    } catch (error) {
        console.error('Error returning book:', error);
        alert('Error returning book. Please check your connection and try again.');
    }
}

// Make functions available globally
window.returnBook = returnBook;
window.loadBorrowHistory = loadBorrowHistory;
